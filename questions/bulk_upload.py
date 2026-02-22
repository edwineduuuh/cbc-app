"""
BULK UPLOAD WITH IMAGE EXTRACTION
Automatically extracts images from PDFs/Word docs and links them to questions

SETUP:
pip install PyPDF2 python-docx Pillow pytesseract pdf2image PyMuPDF --break-system-packages
"""

import re
import json
import io
import base64
from django.core.files.base import ContentFile
from django.db import transaction
from .models import Question, Topic, Subject
import anthropic
from django.conf import settings
import os
os.environ['PATH'] += r';C:\Program Files\Tesseract-OCR'

class BulkExamUploader:
    """
    Extracts questions AND images from uploaded files
    """
    
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.extracted_images = []  # Store extracted images
    
    def process_upload(self, file, subject_id, grade, topic_id=None, created_by=None):
        """
        Main entry point - processes any file type
        """
        
        # Reset images for this upload
        self.extracted_images = []
        
        # Extract text AND images from file
        text = self._extract_text_from_file(file)
        print(f"=== EXTRACTED TEXT (first 500 chars): {text[:500] if text else 'EMPTY'}")
        print(f"=== EXTRACTED {len(self.extracted_images)} IMAGES")
        
        if not text:
            return {
                'success': False,
                'error': 'Could not extract text from file',
                'questions_created': 0
            }
        
        # Parse questions using Claude API (with image info)
        parsed_questions = self._parse_questions_with_ai(text, subject_id, grade)
        
        if not parsed_questions:
            return {
                'success': False,
                'error': 'Could not parse any questions from text',
                'questions_created': 0,
                'raw_text_preview': text[:500]
            }
        
        # Create questions in database (with images)
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
        """Extract text AND images from PDF using PyMuPDF"""
        try:
            import fitz  # PyMuPDF
            
            # Read PDF
            pdf_bytes = file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            text = ""
            
            # Extract text and images from each page
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Extract text
                page_text = page.get_text()
                text += page_text + f"\n[PAGE {page_num + 1}]\n"
                
                # Extract images
                image_list = page.get_images()
                
                for img_index, img in enumerate(image_list):
                    try:
                        xref = img[0]
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        
                        # Store image
                        self.extracted_images.append({
                            'bytes': image_bytes,
                            'page': page_num + 1,
                            'index': img_index,
                            'ext': base_image["ext"]  # png, jpg, etc
                        })
                        
                        # Add marker in text
                        text += f"\n[IMAGE_{len(self.extracted_images)-1}]\n"
                    
                    except Exception as e:
                        print(f"Failed to extract image {img_index} from page {page_num}: {e}")
            
            doc.close()
            
            # If text is too short, use OCR
            clean_text = text.replace('CamScanner', '').replace('[PAGE', '').replace('[IMAGE_', '').strip()
            
            if len(clean_text) < 50:
                print("⚠️ PDF has no text, trying OCR...")
                file.seek(0)
                return self._ocr_pdf(file)
            
            return text
        
        except Exception as e:
            print(f"PDF extraction error: {e}")
            # Fallback to OCR
            file.seek(0)
            return self._ocr_pdf(file)
    
    def _extract_from_word(self, file):
        """Extract text AND images from Word document"""
        try:
            import docx
            from docx.oxml import parse_xml
            
            doc = docx.Document(file)
            text = ""
            
            # Extract paragraphs
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            # Extract images from document relationships
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
        """Extract text from image using OCR and store the image"""
        try:
            import pytesseract
            from PIL import Image
            
            # Read image
            image_bytes = file.read()
            image = Image.open(io.BytesIO(image_bytes))
            
            # Store image
            self.extracted_images.append({
                'bytes': image_bytes,
                'index': 0,
                'ext': file.name.split('.')[-1]
            })
            
            # OCR text
            text = pytesseract.image_to_string(image)
            text += f"\n[IMAGE_0]\n"
            
            return text
        
        except Exception as e:
            print(f"Image OCR error: {e}")
            return None
    
    def _ocr_pdf(self, file):
        """OCR a PDF if text extraction fails"""
        try:
            from pdf2image import convert_from_bytes
            import pytesseract
            
            # Convert PDF pages to images
            images = convert_from_bytes(file.read())
            
            text = ""
            for page_num, image in enumerate(images):
                # Store image
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format='PNG')
                image_bytes = img_byte_arr.getvalue()
                
                self.extracted_images.append({
                    'bytes': image_bytes,
                    'page': page_num + 1,
                    'index': page_num,
                    'ext': 'png'
                })
                
                # OCR
                page_text = pytesseract.image_to_string(image)
                text += page_text + f"\n[PAGE {page_num + 1}]\n[IMAGE_{len(self.extracted_images)-1}]\n"
            
            return text
        
        except Exception as e:
            print(f"PDF OCR error: {e}")
            return None
    
    def _parse_questions_with_ai(self, text, subject_id, grade):
        """Use Claude API to parse questions from raw text with image markers"""
        
        try:
            subject = Subject.objects.get(id=subject_id)
            subject_name = subject.name
        except Subject.DoesNotExist:
            subject_name = "General"
        
        has_images = len(self.extracted_images) > 0
        
        prompt = f"""You are parsing questions from an exam paper for Kenyan CBC curriculum.

Subject: {subject_name}
Grade: {grade}
Images found: {len(self.extracted_images)}

EXTRACTED TEXT (with image markers):
{text}

NOTE: Text contains [IMAGE_0], [IMAGE_1] markers where images appear in the document.

INSTRUCTIONS:
1. Identify ALL questions in the text
2. If a question has an [IMAGE_X] marker near it, note the image index
3. Determine question type:
   - **mcq**: ONLY if has clear A, B, C, D options
   - **math**: Calculations, equations, solving for x, algebra, geometry
   - **structured**: Multi-part questions requiring explanation
   - **fill_blank**: Fill in the blank questions
   - **essay**: Long-form written responses

4. **FOR MCQ QUESTIONS - CRITICAL**:
   - Extract the FULL TEXT of each option (A, B, C, D)
   - Set correct_answer to the LETTER only (A, B, C, or D)

5. **FOR QUESTIONS WITH IMAGES**:
   - If you see [IMAGE_2] near a question, set "image_index": 2
   - Example: "Refer to the diagram below [IMAGE_0]" → set "image_index": 0

CRITICAL: Return ONLY JSON. No explanations before or after.

EXAMPLE WITH IMAGE:
{{
  "questions": [
    {{
      "question_number": "1",
      "question_type": "mcq",
      "question_text": "In the diagram, what part is labeled X?",
      "image_index": 0,
      "option_a": "Nucleus",
      "option_b": "Mitochondria",
      "option_c": "Cell wall",
      "option_d": "Cytoplasm",
      "correct_answer": "A",
      "explanation": "Part X points to the nucleus",
      "difficulty": "medium",
      "max_marks": 1
    }}
  ]
}}

EXAMPLE WITHOUT IMAGE:
{{
  "questions": [
    {{
      "question_number": "2",
      "question_type": "math",
      "question_text": "Solve: 2x + 5 = 13",
      "correct_answer": "x = 4",
      "explanation": "Subtract 5, then divide by 2",
      "difficulty": "medium",
      "max_marks": 2
    }}
  ]
}}

REMEMBER: 
- MCQs MUST have option_a, option_b, option_c, option_d
- Include "image_index" ONLY if the question refers to an image
- Preserve mathematical notation
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            raw_text = response.content[0].text
            print(f"=== AI Response (first 500 chars): {raw_text[:500]}")
            
            # Extract JSON
            cleaned = re.sub(r'```json\s*', '', raw_text)
            cleaned = re.sub(r'```\s*', '', cleaned)
            
            start = cleaned.find('{')
            if start == -1:
                print("❌ No JSON found")
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
            for i, q in enumerate(questions[:3]):
                print(f"Q{i+1}: {q.get('question_text', '')[:80]}")
                if 'image_index' in q:
                    print(f"  → Has image #{q['image_index']}")
            
            return questions
        
        except json.JSONDecodeError as e:
            print(f"❌ JSON error: {e}")
            return []
        except Exception as e:
            print(f"❌ AI error: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    @transaction.atomic
    def _create_questions_in_db(self, questions_data, subject_id, grade, topic_id, created_by):
        """Create questions in database with images"""
        
        created_questions = []
        errors = []
        
        # Get or create default topic
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
                
                # ✅ ATTACH IMAGE IF QUESTION HAS ONE
                image_index = q_data.get('image_index')
                if image_index is not None and image_index < len(self.extracted_images):
                    img_data = self.extracted_images[image_index]
                    
                    question.question_image.save(
                        f'question_{question.id}.{img_data["ext"]}',
                        ContentFile(img_data['bytes']),
                        save=True
                    )
                    
                    print(f"  ✅ Attached image to question {question.id}")
                
                created_questions.append(question)
                print(f"✅ Created Q{question.id}: {question.question_text[:60]}")
            
            except Exception as e:
                print(f"❌ Failed to create question: {e}")
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
        """
        Upload exam file and extract questions + images
        
        Body:
            - file: PDF/Word/Image file
            - subject: Subject ID
            - grade: Grade level
            - topic: (optional) Topic ID
        """
        
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