"""
AI Grading Engine for CBC Learning Platform
Uses Claude API to mark open-ended questions
"""

import json
import re
import random
from django.conf import settings

# For symbolic math comparison
from sympy import sympify, simplify, SympifyError, N


class AIGrader:
    """Handles AI-powered grading for different question types"""

    def mark_question(self, question, student_answer):
        """Main grading function"""
        # Route MCQ to the same AI engine as structured/essay
        if question.question_type in ['mcq', 'structured', 'essay']:
            return self.mark_with_ai(question, student_answer)
        elif question.question_type == 'fill_blank':
            return self.mark_fill_blank(question, student_answer)
        elif question.question_type == 'math':
            return self.mark_math(question, student_answer)
        else:
            return {
                'marks_awarded': 0,
                'max_marks': question.max_marks,
                'feedback': 'Unsupported question type',
                'is_correct': False
            }

#     # ====================== SIMPLE TYPES ======================
#     def mark_mcq(self, question, student_answer):
#         print("=== MARK MCQ CALLED ===")
#         try:
#             from .premium_mcq_grading import premium_grade_mcq
#             print("✓ Premium module imported successfully")
#             result = premium_grade_mcq(question, student_answer)
#             print("✓ Premium grading returned:", result.get('feedback', '')[:50])
#             return result
#         except ImportError as e:
#             print(f"✗ ImportError: {e} – using basic fallback")
#             return self._basic_mcq_grading(question, student_answer)
#         except Exception as e:
#             print(f"✗ Exception in premium grading: {e} – using basic fallback")
#             return self._basic_mcq_grading(question, student_answer)

#     def _basic_mcq_grading(self, question, student_answer):
#         """Original basic MCQ grading as fallback"""
#         student_choice = str(student_answer).strip().upper()
#         correct_choice = str(question.correct_answer).strip().upper()
#         is_correct = student_choice == correct_choice

#         base_explanation = question.explanation or ""

#         if is_correct:
#             feedback = base_explanation or f"Correct! Option {correct_choice} is the right choice."
#             personalized = random.choice([
#                 "Well done — you nailed it!",
#                 "Great job!",
#                 "Excellent — keep it up!",
#                 "Fantastic!",
#                 "Superb work!"
#             ])
#             study_tip = base_explanation[:100] + "..." if base_explanation else "Keep practising similar questions."
#         else:
#             fallback = (
#                 base_explanation
#                 or f"Incorrect. The correct answer is {correct_choice}. "
#                 f"You chose {student_choice} — review why that doesn't fit."
#             )

#             if not base_explanation.strip():
#                 try:
#                     feedback = self._generate_mcq_explanation(question, student_choice, correct_choice)
#                 except:
#                     feedback = fallback
#             else:
#                 feedback = fallback

#             personalized = random.choice([
#                 "Not quite — but you're learning!",
#                 "Good try — let's fix this.",
#                 "Almost there!",
#                 "Close! Review the explanation.",
#                 "Let's improve this together."
#             ])
#             study_tip = "Try again after reading the explanation."

#         return {
#             'marks_awarded': question.max_marks if is_correct else 0,
#             'max_marks': question.max_marks,
#             'feedback': feedback,
#             'is_correct': is_correct,
#             'personalized_message': personalized,
#             'study_tip': study_tip,
#             'points_earned': [correct_choice] if is_correct else [],
#             'points_missed': [] if is_correct else [correct_choice]
#         }
#     def _generate_mcq_explanation(self, question, student_choice, correct_choice):
#         prompt = f"""You are a kind, experienced Kenyan CBC teacher explaining to a Grade 7–9 student.

# Question: {question.question_text}
# Student chose: {student_choice}
# Correct answer: {correct_choice}

# Write ONLY 2–3 short sentences:
# 1. Explain in simple words why {correct_choice} is correct.
# 2. Explain why {student_choice} might seem right but is actually wrong (common mistake).
# 3. One warm encouraging sentence.

# Use very simple, supportive language. Max 70 words total."""
#         api_response = self._call_claude_api(prompt)
#         return api_response['content'][0]['text'].strip()

    # ====================== MATH ======================
    def mark_math(self, question, student_answer):
        if not question.correct_answer or str(question.correct_answer).strip() == '':
            return {
                'marks_awarded': 0,
                'max_marks': question.max_marks,
                'feedback': 'This question has no correct answer set.',
                'is_correct': False,
                'personalized_message': 'Contact your teacher.',
                'study_tip': '',
                'points_earned': [],
                'points_missed': []
            }

        student_answer = str(student_answer).strip()
        if not student_answer:
            return {
                'marks_awarded': 0,
                'max_marks': question.max_marks,
                'feedback': 'No answer provided.',
                'is_correct': False,
                'personalized_message': 'Try again – you can do it!',
                'study_tip': 'Always write your final answer clearly.',
                'points_earned': [],
                'points_missed': []
            }

        correct_str = str(question.correct_answer).strip()

        # Fast numeric check
        def clean_for_number(s):
            return re.sub(r'[^\d.-]', '', s)

        try:
            student_num = float(clean_for_number(student_answer))
            correct_num = float(clean_for_number(correct_str))
            if abs(student_num - correct_num) < 0.01:
                return self._correct_math_response(question,student_num)
        except ValueError:
            pass

        # Symbolic comparison
        try:
            student_expr = sympify(student_answer, evaluate=False)
            correct_expr = sympify(correct_str, evaluate=False)

            if simplify(student_expr - correct_expr) == 0:
                return self._correct_math_response(question, str(student_expr))
            if abs(N(student_expr) - N(correct_expr)) < 0.01:
                return self._correct_math_response(question,f"≈ {N(student_expr):g}")
        except (SympifyError, ValueError, TypeError):
            pass

        # Incorrect → AI steps
        solution_text = self._generate_math_solution(question, student_answer, correct_str)
        personalized = random.choice([
            "Close! Let's look at the steps.",
            "Not quite — but you're learning fast!",
            "Almost there — check the working.",
            "Good try — review the solution below.",
            "Let's fix this together — see the steps."
        ])

        return {
            'marks_awarded': 0,
            'max_marks': question.max_marks,
            'feedback': f'Incorrect. The correct answer is {correct_str}.',
            'is_correct': False,
            'personalized_message': personalized,
            'study_tip': solution_text,
            'points_earned': [],
            'points_missed': [correct_str]
        }

    def _correct_math_response(self, question, display_value):
        """Generate dynamic feedback for correct math answers using AI"""
        
        # Quick congratulations
        congrats = random.choice([
            "Spot on! Well done.",
            "Perfect — excellent calculation!",
            "Correct! You nailed it.",
            "Great work — spot on!",
            "Yes! That's exactly right."
        ])
        
        # Generate contextual study tip using AI
        try:
            study_tip = self._generate_math_study_tip(question, display_value)
        except:
            study_tip = "Keep practicing similar problems to build mastery!"
        
        personalized = random.choice([
            "You're really getting the hang of this!",
            "Excellent — keep up the strong work!",
            "Fantastic calculation!",
            "Well done — proud of you!",
            "Superb! On to the next one."
        ])
        
        return {
            'marks_awarded': question.max_marks,
            'max_marks': question.max_marks,
            'feedback': f"{congrats} {study_tip}",
            'is_correct': True,
            'personalized_message': personalized,
            'study_tip': study_tip,
            'points_earned': [str(display_value)],
            'points_missed': []
        }

    def _generate_math_study_tip(self, question, correct_answer):
        """Generate AI study tip for correct math answer"""
        prompt = f"""You are a Kenyan CBC math teacher giving a quick study tip to a student who just got this question RIGHT.

    QUESTION: {question.question_text}
    CORRECT ANSWER: {correct_answer}

    Write ONE sentence (max 15 words) with a helpful study tip related to this type of problem.

    Examples:
    - "Practice more substitution problems to build speed."
    - "Remember: BODMAS order matters in complex expressions."
    - "Tip: Always check your signs when working with negatives."

    Write ONLY the tip — no preamble, no JSON, no extra text."""
        
        try:
            api_response = self._call_claude_api(prompt)
            return api_response['content'][0]['text'].strip()
        except:
            return "Keep practicing similar problems to build mastery!"

    def _generate_math_solution(self, question, student_answer, correct_answer):
        """Generate professional step-by-step solution for incorrect math answers"""
        
        # Get grade level for appropriate language
        grade = getattr(question.topic, 'grade', 7)
        
        prompt = f"""You are a professional Kenyan CBC mathematics educator providing remedial feedback.

    STUDENT CONTEXT:
    - Grade Level: {grade}
    - Question Type: Mathematics
    - CBC Curriculum Aligned

    QUESTION:
    {question.question_text}

    STUDENT'S ANSWER:
    {student_answer}

    CORRECT ANSWER:
    {correct_answer}

    INSTRUCTIONS:
    Generate a clear, step-by-step solution that:

    1. SOLUTION STEPS:
    • Break down the problem into 4-7 numbered steps
    • Show ALL working clearly (formulas, substitutions, calculations)
    • Use mathematically correct notation
    • Adapt language complexity to Grade {grade} level

    2. COMMON ERROR ANALYSIS:
    • Identify the most likely mistake the student made
    • Explain why this mistake occurs (conceptual gap, calculation error, etc.)
    • One sentence only

    3. KEY CONCEPT REMINDER:
    • State the core mathematical principle/formula used
    • One sentence only

    4. ENCOURAGEMENT:
    • One brief, genuine encouraging sentence
    • Appropriate for Grade {grade} student

    FORMAT REQUIREMENTS:
    - Use clear headings: "SOLUTION:", "COMMON MISTAKE:", "KEY CONCEPT:", "NEXT STEPS:"
    - Number each solution step (1., 2., 3., etc.)
    - Use line breaks for readability
    - Keep total response under 200 words
    - Write in professional but accessible language
    - NO JSON, NO code blocks, NO unnecessary commentary

    TONE: Professional educator - clear, precise, supportive, curriculum-aligned."""

        try:
            api_response = self._call_claude_api(prompt)
            solution_text = api_response['content'][0]['text'].strip()
            
            # Clean up any markdown artifacts
            solution_text = solution_text.replace('```', '').replace('**', '')
            
            return solution_text
            
        except Exception as e:
            # Professional fallback
            return f"""SOLUTION:
    The correct answer is: {correct_answer}

    Please review your calculation steps carefully and check:
    1. Did you use the correct formula?
    2. Did you substitute values correctly?
    3. Did you follow the order of operations (BODMAS)?

    Your teacher will provide additional support if needed."""

    # ====================== STRUCTURED / ESSAY ======================
    def mark_with_ai(self, question, student_answer):
        if not getattr(settings, 'ANTHROPIC_API_KEY', None):
            return {
                'marks_awarded': 0,
                'max_marks': question.max_marks,
                'feedback': 'AI grading is not configured (missing ANTHROPIC_API_KEY)',
                'is_correct': False,
                'personalized_message': 'Contact administrator',
                'study_tip': '',
                'points_earned': [],
                'points_missed': []
            }

        try:
            prompt = self._build_marking_prompt(question, student_answer)
            api_response = self._call_claude_api(prompt)
            return self._parse_ai_response(api_response, question.max_marks)
        except Exception as e:
            print(f"❌ AI Grading Error (Q{question.id}): {str(e)}")
            return {
                'marks_awarded': 0,
                'max_marks': question.max_marks,
                'feedback': f'AI grading failed → {str(e)[:120]}',
                'is_correct': False,
                'personalized_message': 'Answer was recorded. A teacher will review it manually.',
                'study_tip': '',
                'points_earned': [],
                'points_missed': []
            }

    def _build_marking_prompt(self, question, student_answer):
        base = f"""You are an experienced, fair and professional Kenyan CBC examiner marking Grade 7–9 answers.
Your marking must feel realistic — similar to what a good school teacher or KCSE/CBC internal examiner would award.
Parents and students expect accurate, trustworthy assessment — never inflate marks.

Strict rules — follow in this exact priority order:

1. Award marks based on real understanding and correct use of core concepts.
2. Full marks (or close to full marks) only when all main required ideas are clearly present.
3. Be fair but not overly generous. Borderline, vague, incomplete, superficial, one-sided or only partially
   correct answers must receive partial or low marks, not full marks.
4. You must be scientifically and factually accurate.
   - Never mark correct answers as wrong because of model confusion or hallucination.
   - Examples: Algae are non-flowering plants; conifers are non-flowering plants; mosses are non-flowering plants.
   - Accept all scientifically correct answers, even if they are not word-for-word in the model answer.
5. When the question asks for a specific number of points/factors/reasons, only consider the first N correct points.
6. The same core idea explained in different words counts as one point only.
7. Minor spelling, grammar or phrasing variations should be ignored unless they change the scientific/technical meaning.
8. Extra correct and relevant detail can justify a slightly higher mark within the maximum, but never exceed the question's max marks.
9. Wrong, irrelevant or contradictory information should reduce marks appropriately.
10. Feedback must sound like a real Kenyan teacher: short (1–3 sentences), honest, professional, encouraging when deserved,
    and constructive when marks are lost. Use simple, clear language. Also, take this seriously:Only provide a study tip if you are completely certain it is factually correct. 
    If unsure, leave study_tip as an empty string.
11. To help the learner improve, you may suggest 1–2 additional correct points they did not mention (put them in the study_tip field).
12. When the student uses short bullet points/keywords for "state/list/name" questions, award marks if the points are correct
    but gently encourage writing in full sentences in the feedback.
"""
        # Add a specific rule for MCQs to prevent partial marks
        if question.question_type == 'mcq':
            base += """
13. This is a multiple choice question (MCQ).

    MARKING:
    - If the selected option matches the correct option, award full marks.
    - If it does not match, award 0 marks. Do not give partial marks for MCQs.

    FEEDBACK:
    Whether the student got it right or wrong, your feedback should:
    1. Briefly confirm or correct their answer in one sentence.
    2. Teach 1–3 closely related concepts that fit the Kenyan CBC syllabus for this topic.
       For example:
       - If the question is about earthing up, you can also mention mulching, weeding or pruning as related crop
         management practices.
       - If the question is about photosynthesis, you can also mention respiration and transpiration as related
         plant processes.
       - If the question is about the water cycle, you can also mention evaporation, condensation and precipitation.
    3. Give one memorable fact or tip that helps them remember the concept.

    Format:
    - Start with a short “✅ Correct …” or “❌ Not quite …” sentence about their answer.
    - Then briefly mention the related concepts (each with a short explanation).
    - Finish with one “Remember:” study tip or simple mnemonic.

    Keep the total feedback under about 6 sentences and sound like an engaging, knowledgeable Kenyan teacher
    who wants the student to genuinely understand the topic.
"""

        # Format Question Text with Options if MCQ
        q_text = question.question_text
        if question.question_type == 'mcq':
            q_text += f"\n\nOPTIONS:\nA: {question.option_a}\nB: {question.option_b}\nC: {question.option_c}\nD: {question.option_d}"
            
        base += f"\n\nQUESTION:\n{q_text}"

        # Format Student Answer
        s_ans = str(student_answer).strip()
        if question.question_type == 'mcq':
            s_ans_upper = s_ans.upper()
            options_map = {'A': question.option_a, 'B': question.option_b, 'C': question.option_c, 'D': question.option_d}
            if s_ans_upper in options_map:
                s_ans = f"Option {s_ans_upper}: {options_map[s_ans_upper]}"
                
        base += f"\n\nSTUDENT ANSWER:\n{s_ans}"

        # Format Expected Answer
        if question.question_type == 'mcq':
            correct_letter = str(question.correct_answer).strip().upper()
            options_map = {'A': question.option_a, 'B': question.option_b, 'C': question.option_c, 'D': question.option_d}
            correct_text = options_map.get(correct_letter, '')
            base += f"\n\nEXPECTED CORRECT ANSWER:\nOption {correct_letter}: {correct_text}"
            
            if getattr(question, 'explanation', None):
                base += f"\nEXPLANATION NOTE: {question.explanation}"
        else:
            if getattr(question, 'marking_scheme', None):
                points_text = "\n".join([f"- {p['description']} ({p['marks']} marks)" for p in question.marking_scheme.get('points', [])])
                base += f"\n\nMARKING SCHEME:\n{points_text}"
            else:
                base += f"\n\nEXPECTED UNDERSTANDING / KEY ACCEPTABLE POINTS:\n{question.correct_answer}"

        base += f"""

MAX MARKS: {question.max_marks}

Return ONLY valid JSON — nothing else before or after:
{{
  "marks_awarded": integer between 0 and {question.max_marks} inclusive,
  "feedback": "1–3 short sentences in realistic Kenyan teacher tone explaining the concept",
  "personalized_message": "short encouraging or motivating sentence",
  "study_tip": "brief next-step advice or memory trick for this concept",
  "points_earned": ["short description of awarded point 1", "short description of awarded point 2"],
  "points_missed": ["short description of missing/weak/incorrect point 1"]
}}"""


        return base

    def _call_claude_api(self, prompt):
        import requests
        try:
            response = requests.post(
                'https://api.anthropic.com/v1/messages',
                headers={
                    'Content-Type': 'application/json',
                    'x-api-key': settings.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                json={
                    'model': 'claude-sonnet-4-20250514',
                    'max_tokens': 1000,
                    'messages': [{'role': 'user', 'content': prompt}]
                },
                timeout=20  # ← ADD THIS — don't hang forever
            )
            response.raise_for_status()  # ← raises on 4xx/5xx
            return response.json()
        except requests.Timeout:
            raise Exception("Claude API timed out after 20s")
        except requests.HTTPError as e:
            raise Exception(f"Claude API HTTP error: {e.response.status_code} - {e.response.text[:200]}")
        except requests.RequestException as e:
            raise Exception(f"Claude API network error: {str(e)}")

    def _parse_ai_response(self, api_response, max_marks):
        try:
            content = api_response['content'][0]['text']
            content = content.replace('```json', '').replace('```', '').strip()
            result = json.loads(content)
            marks = min(result.get('marks_awarded', 0), max_marks)

            return {
                'marks_awarded': marks,
                'max_marks': max_marks,
                'feedback': result.get('feedback', ''),
                'personalized_message': result.get('personalized_message', ''),
                'study_tip': result.get('study_tip', ''),
                'is_correct': marks == max_marks,
                'points_earned': result.get('points_earned', []),
                'points_missed': result.get('points_missed', [])
            }
        except:
            return {
                'marks_awarded': 0,
                'max_marks': max_marks,
                'feedback': 'Error parsing feedback',
                'is_correct': False,
                'personalized_message': '',
                'study_tip': '',
                'points_earned': [],
                'points_missed': []
            }


def grade_answer(question, student_answer):
    """Grade any question type — handles multi-part questions"""
    grader = AIGrader()
    
    # Check if question has parts
    parts = list(question.parts.all())
    if not parts:
        return grader.mark_question(question, student_answer)
    
    # Grade each part separately
    total_marks = 0
    total_max = 0
    all_feedback = []
    all_points_earned = []
    all_points_missed = []
    
    for part in parts:
        part_answer = ""
        if isinstance(student_answer, dict):
            part_answer = student_answer.get(str(part.id), "")
        else:
            part_answer = student_answer
        
        # Create a temporary object to grade with
        class PartProxy:
            def __init__(self, part):
                self.id = part.id
                self.question_text = f"({part.part_label}) {part.question_text}"
                self.question_type = part.question_type
                self.correct_answer = part.correct_answer
                self.max_marks = part.max_marks
                self.marking_scheme = part.marking_scheme
                self.explanation = part.explanation
                self.option_a = part.option_a
                self.option_b = part.option_b
                self.option_c = part.option_c
                self.option_d = part.option_d
                self.topic = part.parent_question.topic
                self.worked_solution = None
        
        part_result = grader.mark_question(PartProxy(part), part_answer)
        total_marks += part_result['marks_awarded']
        total_max += part_result['max_marks']
        all_feedback.append(f"({part.part_label}) {part_result['feedback']}")
        all_points_earned.extend(part_result.get('points_earned', []))
        all_points_missed.extend(part_result.get('points_missed', []))
    
    return {
        'marks_awarded': total_marks,
        'max_marks': total_max,
        'feedback': '\n'.join(all_feedback),
        'is_correct': total_marks == total_max,
        'personalized_message': '',
        'study_tip': '',
        'points_earned': all_points_earned,
        'points_missed': all_points_missed,
    }