"""
BULK UPLOAD WITH IMAGE EXTRACTION
Automatically extracts images from PDFs/Word docs and links them to questions

SETUP:
pip install PyPDF2 python-docx Pillow PyMuPDF --break-system-packages
(No tesseract needed - Gemini Vision is used as fallback)
"""

import re
import json
import io
import base64
from django.core.files.base import ContentFile
from django.db import transaction
from .models import Question, Topic, Subject
from .ai_service import _get_gemini, GEMINI_MODEL, parse_ai_json
from google.genai import types


class BulkExamUploader:
    """
    Extracts questions AND images from uploaded files.
    Uses Gemini Vision as fallback when PDF/image extraction fails.
    """
    
    def __init__(self):
        self.extracted_images = []
    
    def process_upload(self, file, subject_id, grade, topic_id=None, created_by=None):
        """Main entry point - processes any file type"""
        
        self.extracted_images = []
        
        text = self._extract_text_from_file(file)
        print(f"=== EXTRACTED TEXT (first 500 chars): {text[:500] if text else 'EMPTY'}")
        print(f"=== EXTRACTED {len(self.extracted_images)} IMAGES")
        
        if not text:
            return {
                'success': False,
                'error': 'Could not extract text from file',
                'questions_created': 0
            }
        
        parsed_questions = self._parse_questions_with_ai(text, subject_id, grade)
        
        if not parsed_questions:
            return {
                'success': False,
                'error': 'Could not parse any questions from text',
                'questions_created': 0,
                'raw_text_preview': text[:500]
            }
        
        result = self._create_questions_in_db(
            parsed_questions, 
            subject_id, 
            grade, 
            topic_id, 
            created_by
        )
        
        return result
    
    def _extract_text_from_file(self, file):
        """Extract text AND images from PDF, Word, or Image"""
        
        filename = file.name.lower()
        
        if filename.endswith('.pdf'):
            return self._extract_from_pdf(file)
        
        elif filename.endswith(('.doc', '.docx')):
            return self._extract_from_word(file)
        
        elif filename.endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
            return self._extract_from_image(file)
        
        elif filename.endswith('.txt'):
            return file.read().decode('utf-8', errors='ignore')
        
        else:
            return None
    
    def _extract_from_pdf(self, file):
        """Extract text AND images from PDF using PyMuPDF, fallback to Gemini Vision"""
        try:
            import fitz  # PyMuPDF
            
            pdf_bytes = file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            text = ""
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                page_text = page.get_text()
                text += page_text + f"\n[PAGE {page_num + 1}]\n"
                
                image_list = page.get_images()
                for img_index, img in enumerate(image_list):
                    try:
                        xref = img[0]
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        
                        self.extracted_images.append({
                            'bytes': image_bytes,
                            'page': page_num + 1,
                            'index': img_index,
                            'ext': base_image["ext"]
                        })
                        
                        text += f"\n[IMAGE_{len(self.extracted_images)-1}]\n"
                    
                    except Exception as e:
                        print(f"Failed to extract image {img_index} from page {page_num}: {e}")
            
            doc.close()
            
            clean_text = text.replace('CamScanner', '').replace('[PAGE', '').replace('[IMAGE_', '').strip()
            
            if len(clean_text) < 50:
                print("PDF has no text, trying Gemini Vision...")
                file.seek(0)
                return self._extract_with_gemini_vision(file)
            
            return text
        
        except Exception as e:
            print(f"PDF extraction error: {e}")
            file.seek(0)
            return self._extract_with_gemini_vision(file)
    
    def _extract_from_word(self, file):
        """Extract text AND images from Word document"""
        try:
            import docx
            
            doc = docx.Document(file)
            text = ""
            
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            for rel in doc.part.rels.values():
                if "image" in rel.target_ref:
                    try:
                        image_bytes = rel.target_part.blob
                        
                        self.extracted_images.append({
                            'bytes': image_bytes,
                            'index': len(self.extracted_images),
                            'ext': rel.target_ref.split('.')[-1]
                        })
                        
                        text += f"\n[IMAGE_{len(self.extracted_images)-1}]\n"
                    
                    except Exception as e:
                        print(f"Failed to extract image from Word: {e}")
            
            return text
        
        except Exception as e:
            print(f"Word extraction error: {e}")
            return None
    
    def _extract_from_image(self, file):
        """Extract text from image - uses Gemini Vision directly (no tesseract needed)"""
        try:
            from PIL import Image
            
            image_bytes = file.read()
            
            # Use Gemini Vision to extract text
            print("Using Gemini Vision to extract text from image...")
            file.seek(0)
            text = self._extract_with_gemini_vision(file)
            if text:
                text += f"\n[IMAGE_0]\n"
            return text
        
        except Exception as e:
            print(f"Image extraction error: {e}")
            file.seek(0)
            return self._extract_with_gemini_vision(file)
    
    def _extract_with_gemini_vision(self, file):
        """
        Use Gemini Vision to extract text from any image or PDF.
        This is the main fallback when fitz/tesseract are unavailable.
        """
        try:
            print("Extracting text via Gemini Vision...")
            
            file_bytes = file.read()
            
            ext = file.name.split('.')[-1].lower()
            media_type_map = {
                'pdf':  'application/pdf',
                'png':  'image/png',
                'jpg':  'image/jpeg',
                'jpeg': 'image/jpeg',
                'bmp':  'image/png',
                'tiff': 'image/png',
            }
            mime_type = media_type_map.get(ext, 'image/png')

            response = _get_gemini().models.generate_content(
                model=GEMINI_MODEL,
                contents=[
                    types.Content(role="user", parts=[
                        types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                        types.Part.from_text(
                            "Extract ALL text from this exam paper exactly as it appears. "
                            "Preserve question numbers, options (A, B, C, D), and all content. "
                            "If there are diagrams or images, write [IMAGE] where they appear."
                        ),
                    ]),
                ],
            )
            
            extracted = response.text
            print(f"Gemini Vision extracted {len(extracted)} characters")
            return extracted
        
        except Exception as e:
            print(f"Gemini Vision extraction error: {e}")
            return None
    
    def _parse_questions_with_ai(self, text, subject_id, grade):
        """Use Gemini API to parse questions from raw text"""
        
        try:
            subject = Subject.objects.get(id=subject_id)
            subject_name = subject.name
        except Subject.DoesNotExist:
            subject_name = "General"
        
        prompt = f"""You are parsing questions from an exam paper for Kenyan CBC curriculum.

Subject: {subject_name}
Grade: {grade}

EXTRACTED TEXT:
{text}

🚨 CRITICAL EXPONENT RULES:
- 32^1/5 means $32^{{\\frac{{1}}{{5}}}}$ NOT "32 and 1/5"
- 2^4 means $2^4$ NOT "2 to the 4"
- x^2/3 means $x^{{\\frac{{2}}{{3}}}}$ NOT "x squared divided by 3"
- ALWAYS preserve exponent notation with curly braces

🔴 MATH FORMATTING RULES:
1. Fractions: $\\frac{{1}}{{3}}$ NOT 1/3
2. Exponents: $x^{{2}}$ or $32^{{\\frac{{1}}{{5}}}}$
3. Square roots: $\\sqrt{{x}}$
4. Greek: $\\theta$, $\\pi$
5. Division of powers: $\\frac{{2^4}}{{32^{{\\frac{{1}}{{5}}}}}}$

EXAMPLE - CORRECT:
Question: "Evaluate 2^4 / 32^1/5"
Output: "Evaluate $\\frac{{2^4}}{{32^{{\\frac{{1}}{{5}}}}}}$"

EXAMPLE - WRONG (NEVER):
"Evaluate $\\frac{{2^4}}{{32\\frac{{1}}{{5}}}}$"  ← This is WRONG

INSTRUCTIONS:
1. Identify ALL questions in the text
2. If a question has an [IMAGE_X] or [IMAGE] marker near it, note the image index (use 0 if just [IMAGE])
3. Determine question type:
   - mcq: ONLY if has clear A, B, C, D options
   - math: Calculations, equations, solving for x
   - structured: Multi-part questions requiring explanation
   - fill_blank: Fill in the blank
   - essay: Long-form written responses

4. FOR MCQ QUESTIONS:
   - Extract the FULL TEXT of each option (A, B, C, D)
   - Set correct_answer to the LETTER only (A, B, C, or D)

5. FOR QUESTIONS WITH IMAGES:
   - Set "image_index" to the number in [IMAGE_X], or 0 for [IMAGE]

CRITICAL: Return ONLY valid JSON. No explanations.

FORMAT:
{{
  "questions": [
    {{
      "question_number": "1",
      "question_type": "mcq",
      "question_text": "Question here",
      "image_index": 0,
      "option_a": "Option A text",
      "option_b": "Option B text",
      "option_c": "Option C text",
      "option_d": "Option D text",
      "correct_answer": "A",
      "explanation": "Why A is correct",
      "difficulty": "medium",
      "max_marks": 1
    }},
    {{
      "question_number": "2",
      "question_type": "math",
      "question_text": "Solve: 2x + 5 = 13",
      "correct_answer": "x = 4",
      "explanation": "Subtract 5, divide by 2",
      "difficulty": "medium",
      "max_marks": 2
    }}
  ]
}}

REMEMBER: 
- MCQs MUST have option_a through option_d
- Only include image_index if the question actually refers to an image
- Preserve all mathematical notation
"""
        
        try:
            response = _get_gemini().models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
            )
            
            raw_text = response.text
            print(f"=== AI Response (first 500 chars): {raw_text[:500]}")
            
            cleaned = re.sub(r'```json\s*', '', raw_text)
            cleaned = re.sub(r'```\s*', '', cleaned)
            
            start = cleaned.find('{')
            if start == -1:
                print("No JSON found in response")
                return []
            
            brace_count = 0
            end = start
            for i in range(start, len(cleaned)):
                if cleaned[i] == '{':
                    brace_count += 1
                elif cleaned[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end = i + 1
                        break
            
            json_str = cleaned[start:end]
            result = json.loads(json_str)
            questions = result.get('questions', [])
            
            print(f"=== Parsed {len(questions)} questions")
            return questions
        
        except json.JSONDecodeError as e:
            print(f"JSON error: {e}")
            return []
        except Exception as e:
            print(f"AI error: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    @transaction.atomic
    def _create_questions_in_db(self, questions_data, subject_id, grade, topic_id, created_by):
        """Create questions in database with images"""
        
        created_questions = []
        errors = []
        
        if not topic_id:
            subject = Subject.objects.get(id=subject_id)
            topic, _ = Topic.objects.get_or_create(
                subject=subject,
                grade=grade,
                name=f"Imported Questions - Grade {grade}",
                defaults={'slug': f'imported-grade-{grade}'}
            )
        else:
            topic = Topic.objects.get(id=topic_id)
        
        for q_data in questions_data:
            try:
                question = Question.objects.create(
                    topic=topic,
                    question_type=q_data.get('question_type', 'mcq'),
                    question_text=q_data.get('question_text', ''),
                    option_a=q_data.get('option_a', ''),
                    option_b=q_data.get('option_b', ''),
                    option_c=q_data.get('option_c', ''),
                    option_d=q_data.get('option_d', ''),
                    correct_answer=q_data.get('correct_answer', ''),
                    explanation=q_data.get('explanation', ''),
                    difficulty=q_data.get('difficulty', 'medium'),
                    max_marks=q_data.get('max_marks', 1),
                    marking_scheme=q_data.get('marking_scheme'),
                    created_by=created_by
                )
                
                # Attach image if question has one
                image_index = q_data.get('image_index')
                if image_index is not None and image_index < len(self.extracted_images):
                    img_data = self.extracted_images[image_index]
                    question.question_image.save(
                        f'question_{question.id}.{img_data["ext"]}',
                        ContentFile(img_data['bytes']),
                        save=True
                    )
                    print(f"Attached image to question {question.id}")
                
                created_questions.append(question)
                print(f"Created Q{question.id}: {question.question_text[:60]}")
            
            except Exception as e:
                print(f"Failed to create question: {e}")
                errors.append({
                    'question_number': q_data.get('question_number'),
                    'question_text': q_data.get('question_text', '')[:100],
                    'error': str(e)
                })
        
        return {
            'success': True,
            'questions_created': len(created_questions),
            'images_extracted': len(self.extracted_images),
            'questions': [
                {
                    'id': q.id,
                    'question_text': q.question_text[:100] + ('...' if len(q.question_text) > 100 else ''),
                    'type': q.question_type,
                    'has_options': bool(q.option_a and q.option_b),
                    'has_image': bool(q.question_image)
                }
                for q in created_questions
            ],
            'errors': errors
        }


# Django View
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .permissions import IsAdminOrTeacher


class BulkUploadView(APIView):
    permission_classes = [IsAdminOrTeacher]
    
    def post(self, request):
        file = request.FILES.get('file')
        subject_id = request.data.get('subject')
        grade = request.data.get('grade')
        topic_id = request.data.get('topic')
        
        if not file or not subject_id or not grade:
            return Response(
                {'error': 'Missing required fields: file, subject, grade'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploader = BulkExamUploader()
        result = uploader.process_upload(
            file, 
            subject_id, 
            grade, 
            topic_id, 
            request.user
        )
        
        if result['success']:
            return Response(result, status=status.HTTP_201_CREATED)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)