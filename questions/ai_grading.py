"""
AI Grading Engine for CBC Learning Platform
Uses Claude Haiku API to mark questions
"""

import json
import re
import random
from django.conf import settings
from sympy import sympify, simplify, SympifyError, N


class AIGrader:
    """Handles AI-powered grading for different question types"""

    def mark_question(self, question, student_answer):
        """Main grading function — routes to correct grader"""
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
                'feedback': 'Unsupported question type.',
                'is_correct': False,
                'personalized_message': '',
                'study_tip': '',
                'points_earned': [],
                'points_missed': []
            }

    # ====================== FILL BLANK ======================
    def mark_fill_blank(self, question, student_answer):
        """
        Fill-in-the-blank grader.
        Handles case differences, whitespace, punctuation, multiple accepted answers.
        Falls back to AI for near-misses.
        """
        if not question.correct_answer or str(question.correct_answer).strip() == '':
            return {
                'marks_awarded': 0,
                'max_marks': question.max_marks,
                'feedback': 'This question has no correct answer set.',
                'is_correct': False,
                'personalized_message': 'Please contact your teacher.',
                'study_tip': '',
                'points_earned': [],
                'points_missed': []
            }

        student_raw = str(student_answer).strip()
        if not student_raw:
            return {
                'marks_awarded': 0,
                'max_marks': question.max_marks,
                'feedback': 'You did not write an answer.',
                'is_correct': False,
                'personalized_message': 'Try again — you can do it!',
                'study_tip': 'Always write your answer clearly.',
                'points_earned': [],
                'points_missed': []
            }

        def normalise(s):
            s = s.lower().strip()
            s = re.sub(r'\s+', ' ', s)
            s = s.rstrip('.,;:!?')
            return s

        student_norm = normalise(student_raw)
        raw_correct = str(question.correct_answer).strip()
        accepted = [normalise(a) for a in re.split(r'[|;]', raw_correct) if a.strip()]
        is_correct = student_norm in accepted

        # Numeric equivalence check
        if not is_correct:
            try:
                student_num = float(re.sub(r'[^\d.-]', '', student_norm))
                for a in accepted:
                    try:
                        if abs(student_num - float(re.sub(r'[^\d.-]', '', a))) < 0.01:
                            is_correct = True
                            break
                    except ValueError:
                        pass
            except ValueError:
                pass

        # AI semantic check as last resort
        if not is_correct:
            try:
                is_correct = self._ai_fill_blank_check(question, student_raw, raw_correct)
            except Exception as e:
                print(f"⚠ AI fill-blank fallback failed: {e}")

        if is_correct:
            return {
                'marks_awarded': question.max_marks,
                'max_marks': question.max_marks,
                'feedback': random.choice([
                    "Spot on! Well done.",
                    "That's exactly right!",
                    "Correct! Great work.",
                    "Yes — you've got it!",
                    "Excellent answer!",
                ]),
                'is_correct': True,
                'personalized_message': random.choice([
                    "You are really getting the hang of this!",
                    "Keep up the great work!",
                    "Fantastic!",
                    "Well done — so proud of you!",
                    "Superb! On to the next one.",
                ]),
                'study_tip': '',
                'points_earned': [student_raw],
                'points_missed': [],
            }

        explanation = getattr(question, 'explanation', None) or f"The correct answer is: {raw_correct}."
        return {
            'marks_awarded': 0,
            'max_marks': question.max_marks,
            'feedback': f"Not quite. The correct answer is {raw_correct}.",
            'is_correct': False,
            'personalized_message': random.choice([
                "Not quite — but you are learning!",
                "Good try — have another look.",
                "Almost there — check the correct answer.",
                "Close! Try again.",
                "Let us improve this together.",
            ]),
            'study_tip': explanation,
            'points_earned': [],
            'points_missed': [raw_correct],
        }

    def _ai_fill_blank_check(self, question, student_answer, correct_answer):
        """Ask Claude if the fill-blank answer is correct. Returns True or False only."""
        prompt = f"""You are a Kenyan CBC teacher checking a fill-in-the-blank answer.

QUESTION: {question.question_text}
CORRECT ANSWER: {correct_answer}
STUDENT ANSWER: {student_answer}

Is the student's answer correct?
- "thousands" vs "Thousands" → TRUE
- "ten thousand" vs "ten thousands place" → TRUE
- Clearly wrong answer → FALSE

Reply with ONLY the word TRUE or FALSE. Nothing else."""
        try:
            response = self._call_claude_api(prompt)
            verdict = response['content'][0]['text'].strip().upper()
            return verdict == 'TRUE'
        except Exception:
            return False

    # ====================== MATH ======================
    def mark_math(self, question, student_answer):
        if not question.correct_answer or str(question.correct_answer).strip() == '':
            return {
                'marks_awarded': 0,
                'max_marks': question.max_marks,
                'feedback': 'This question has no correct answer set.',
                'is_correct': False,
                'personalized_message': 'Please contact your teacher.',
                'study_tip': '',
                'points_earned': [],
                'points_missed': []
            }


        student_answer = str(student_answer).strip()
        correct_str = str(question.correct_answer).strip()
        if not student_answer:
            print(f"GRADING: student={repr(student_answer)} correct={repr(correct_str)}")
            return {
                'marks_awarded': 0,
                'max_marks': question.max_marks,
                'feedback': 'You did not write an answer.',
                'is_correct': False,
                'personalized_message': 'Try again — you can do it!',
                'study_tip': 'Always write your final answer clearly.',
                'points_earned': [],
                'points_missed': []
            }

        

        def clean_num(s):
            return re.sub(r'[^\d.-]', '', s)

        # Fast numeric check — only run if correct answer is purely numeric
        if not re.search(r'[a-zA-Z]', correct_str):
            try:
                if abs(float(clean_num(student_answer)) - float(clean_num(correct_str))) < 0.01:
                    return self._correct_math_response(question, float(clean_num(student_answer)))
            except ValueError:
                pass

        # Symbolic comparison — handles plain text AND LaTeX from MathLive
        try:
            student_expr = self._parse_answer(student_answer)
            correct_expr = self._parse_answer(correct_str)
            if student_expr is not None and correct_expr is not None:
                if simplify(student_expr - correct_expr) == 0:
                    return self._correct_math_response(question, str(student_expr))
                if abs(N(student_expr) - N(correct_expr)) < 0.01:
                    return self._correct_math_response(question, f"≈ {N(student_expr):g}")
        except Exception:
            pass

        # Incorrect — generate step-by-step solution
        solution_text = self._generate_math_solution(question, student_answer, correct_str)
        return {
            'marks_awarded': 0,
            'max_marks': question.max_marks,
            'feedback': f'Not quite. The correct answer is {correct_str}.',
            'is_correct': False,
            'personalized_message': random.choice([
                "Close! Let us look at the steps together.",
                "Not quite — but you are learning fast!",
                "Almost there — check the working below.",
                "Good try — review the steps below.",
                "Let us fix this together — see the steps.",
            ]),
            'study_tip': solution_text,
            'points_earned': [],
            'points_missed': [correct_str]
        }
    
    def _parse_answer(self, s):
        """Try plain sympy first, fall back to LaTeX parser"""
        from sympy.parsing.latex import parse_latex
        s = str(s).strip().strip('$')
        try:
            return sympify(s, evaluate=False)
        except Exception:
            try:
                return parse_latex(s)
            except Exception:
                return None
            
    def _correct_math_response(self, question, display_value):
        grade = getattr(getattr(question, 'topic', None), 'grade', 7)
        try:
            study_tip = self._generate_math_study_tip(question, display_value, grade)
        except Exception:
            study_tip = "Keep practising similar problems to get even faster!"
        congrats = random.choice([
            "Spot on! Well done.",
            "Perfect — great calculation!",
            "Correct! You got it.",
            "Great work!",
            "Yes! That is exactly right.",
        ])
        return {
            'marks_awarded': question.max_marks,
            'max_marks': question.max_marks,
            'feedback': f"{congrats} {study_tip}",
            'is_correct': True,
            'personalized_message': random.choice([
                "You are really getting the hang of this!",
                "Excellent — keep up the great work!",
                "Fantastic calculation!",
                "Well done — so proud of you!",
                "Superb! On to the next one.",
            ]),
            'study_tip': study_tip,
            'points_earned': [str(display_value)],
            'points_missed': []
        }

    def _generate_math_study_tip(self, question, correct_answer, grade):
        prompt = f"""You are a Kenyan CBC Grade {grade} maths teacher.
A student just got this question RIGHT.

QUESTION: {question.question_text}
CORRECT ANSWER: {correct_answer}

Write ONE short sentence (max 12 words) as a helpful tip for this type of problem.
Use simple words a Grade {grade} student understands.
Write ONLY the tip. No extra text."""
        try:
            api_response = self._call_claude_api(prompt)
            return api_response['content'][0]['text'].strip()
        except Exception:
            return "Keep practising similar problems to get even faster!"

    def _generate_math_solution(self, question, student_answer, correct_answer):
        grade = getattr(getattr(question, 'topic', None), 'grade', 7)
        prompt = f"""You are a Kenyan CBC Grade {grade} maths teacher helping a student who got a question WRONG.

QUESTION: {question.question_text}
STUDENT ANSWER: {student_answer}
CORRECT ANSWER: {correct_answer}

Write a step-by-step solution in simple words a Grade {grade} student can follow.
- Use short, clear sentences
- Number each step (Step 1, Step 2, etc.)
- Show the working clearly. 
- At the end, say what mistake the student likely made in one short sentence. If working was shown, correct his working.
- Keep it under 150 words total
- NO complicated words — write like you are talking to a child
- NO markdown, NO code blocks, NO # headings, NO asterisks
- Use LaTeX for ALL numbers and calculations: inline use $...$ and display use $$...$$
- Example: "Step 1: Subtract $7540 - 2465 = 5075$"
"""
        try:
            api_response = self._call_claude_api(prompt)
            return api_response['content'][0]['text'].strip().replace('```', '').replace('**', '')
        except Exception:
            return f"The correct answer is {correct_answer}. Check your steps and try again."

    # ====================== MCQ / STRUCTURED / ESSAY ======================
    def mark_with_ai(self, question, student_answer):
        if not getattr(settings, 'ANTHROPIC_API_KEY', None):
            return {
                'marks_awarded': 0,
                'max_marks': question.max_marks,
                'feedback': 'AI grading is not set up.',
                'is_correct': False,
                'personalized_message': 'Please contact your teacher.',
                'study_tip': '',
                'points_earned': [],
                'points_missed': []
            }
        try:
            prompt = self._build_marking_prompt(question, student_answer)
            working_image = getattr(self, 'working_image', None)
            api_response = self._call_claude_api(prompt, working_image=working_image)
            return self._parse_ai_response(api_response, question.max_marks)
        except Exception as e:
            print(f"❌ AI Grading Error (Q{question.id}): {str(e)}")
            return {
                'marks_awarded': 0,
                'max_marks': question.max_marks,
                'feedback': 'Marking failed. Your answer was saved and a teacher will review it.',
                'is_correct': False,
                'personalized_message': 'Do not worry — your answer was recorded.',
                'study_tip': '',
                'points_earned': [],
                'points_missed': []
            }

    def _build_marking_prompt(self, question, student_answer):
        grade = getattr(getattr(question, 'topic', None), 'grade', 7)
        has_passage = hasattr(question, 'passage') and question.passage is not None

        base = f"""You are a Kenyan CBC teacher marking a Grade {grade} student's answer.

LANGUAGE RULES — FOLLOW THESE STRICTLY:
- Write in simple English that a Grade {grade} Kenyan student can understand
- Use the same simple words found in Kenyan CBC textbooks
- Never use difficult scientific or academic words the student has not seen in class
- If you must use a subject-specific term, explain it simply right after in brackets
  Good example: "egg-laying mammals (mammals that lay eggs)"
  Bad example: "monotremes" with no explanation - Do not use terms not in CBC Kenyan Curriculum please.
- Short sentences only — maximum 3 sentences for feedback
- Talk directly to the student using "you" and "your"
- Sound like a kind, encouraging teacher — not a textbook. Let there be a student - teacher connection
- Never use these words: demonstrate, indicate, facilitate, pertain, enumerate, elaborate, subsequently, primarily, comprise, constitute, thus, hence, moreover, furthermore, utilize

MARKING RULES:
1. Award marks for real understanding — exact wording is not required
2. Full marks only when all key ideas are clearly present
3. Partial or vague answers get partial marks — be fair but honest and marks cannot be fractional or decimals. Just integers
4. Accept any factually correct answer even if worded differently
5. When the question asks for N points, only mark the first N correct ones
6. The same idea said in different words counts as one point only
7. Spelling mistakes are fine unless they change the meaning — if spelling is wrong, gently correct it
8. Never go above the question's maximum marks
9. Wrong or irrelevant information reduces marks
10. If student writes jargon, notice it and obviously no marks. 

FEEDBACK INSTRUCTIONS:
- Write 4-6 sentences of real, specific feedback
- First: acknowledge exactly what the student got RIGHT and why it earned marks
- Then: for each wrong or missing point, give the ACTUAL correct answer — not "you need to explain more" but literally WHAT they should have written
- The student must walk away knowing exactly what the full correct answer looks like
- Warm teacher tone but direct and educational

Return ONLY valid JSON — no text before or after:
{{
  "marks_awarded": integer between 0 and {question.max_marks},
  "feedback": "your 4-6 sentence feedback here",
  "personalized_message": "one short encouraging sentence directed at the student",
  "study_tip": "{study_tip_instruction}",
  "points_earned": ["what the student got right — in simple words"],
  "points_missed": ["what the student missed — in simple words"]
}}
"""

        # MCQ specific rules
        if question.question_type == 'mcq':
            base += """
MCQ RULES:
- If the student chose the correct option: full marks
- If wrong: 0 marks — no partial marks for MCQs

FEEDBACK FORMAT FOR MCQ:
- Start with "✅ Correct! ..." or "❌ Not quite. The right answer is ..."
- In 1–2 sentences explain WHY that answer is correct using simple words
- Mention 1–2 related ideas from the CBC syllabus that connect to this topic
- End with one short "Remember:" tip to help them recall the concept
- Total: maximum 5 sentences, simple language, warm tone
"""

        # Comprehension/passage rules
        if has_passage:
            base += f"""
COMPREHENSION QUESTION RULES:
This student is answering based on a reading passage. Here is the passage:

--- PASSAGE ---
{question.passage.content}
--- END PASSAGE ---

Your feedback MUST:
- Point to where in the passage the answer is found — say "The passage says in paragraph..." or "Look at line..."
- NOT give general topic knowledge — only refer to the passage
- Keep feedback to 2 sentences maximum
"""

        # Build question text
        q_text = question.question_text
        if question.question_type == 'mcq':
            q_text += f"\n\nOPTIONS:\nA: {question.option_a}\nB: {question.option_b}\nC: {question.option_c}\nD: {question.option_d}"

        base += f"\n\nQUESTION:\n{q_text}"

        # Build student answer text
        s_ans = str(student_answer).strip()
        if question.question_type == 'mcq':
            s_ans_upper = s_ans.upper()
            options_map = {
                'A': question.option_a, 'B': question.option_b,
                'C': question.option_c, 'D': question.option_d
            }
            if s_ans_upper in options_map:
                s_ans = f"Option {s_ans_upper}: {options_map[s_ans_upper]}"

        base += f"\n\nSTUDENT ANSWER:\n{s_ans}"

        # Build expected answer text
        if question.question_type == 'mcq':
            correct_letter = str(question.correct_answer).strip().upper()
            options_map = {
                'A': question.option_a, 'B': question.option_b,
                'C': question.option_c, 'D': question.option_d
            }
            correct_text = options_map.get(correct_letter, '')
            base += f"\n\nCORRECT ANSWER:\nOption {correct_letter}: {correct_text}"
            if getattr(question, 'explanation', None):
                base += f"\nEXPLANATION: {question.explanation}"
        else:
            if getattr(question, 'marking_scheme', None):
                points_text = "\n".join([
                    f"- {p['description']} ({p['marks']} marks)"
                    for p in question.marking_scheme.get('points', [])
                ])
                base += f"\n\nMARKING SCHEME:\n{points_text}"
            else:
                base += f"\n\nEXPECTED ANSWER / KEY POINTS:\n{question.correct_answer}"

        # Study tip instruction
        if has_passage:
            study_tip_instruction = "Point to the specific line or paragraph in the passage where the answer is found. Do NOT repeat the feedback."
        else:
            study_tip_instruction = "One NEW helpful tip not already in the feedback — a simple memory trick, related idea, or exam tip. Only include if you are 100% sure it is factually correct. If not sure, leave empty."

        base += f"""

MAX MARKS: {question.max_marks}

Return ONLY valid JSON — no text before or after:
{{
  "marks_awarded": integer between 0 and {question.max_marks},
  "feedback": "Write 4-6 sentences. (1) Start by acknowledging specifically what the student got right and why. (2) For each wrong or missing point, explicitly state the CORRECT answer. (3) Give the full correct answer so the student walks away knowing exactly what they should have written. Warm teacher tone but be direct and educational.",
  "personalized_message": "one short encouraging sentence directed at the student",
  "study_tip": "{study_tip_instruction}",
  "points_earned": ["what the student got right — in simple words"],
  "points_missed": ["what the student missed — in simple words"]
}}"""

        return base

    def _call_claude_api(self, prompt, working_image=None):
        import requests
        import time

        if working_image:
            content = [
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": working_image}},
                {"type": "text", "text": prompt + "\n\nThe student has also shared a photo of their working above."}
            ]
        else:
            content = prompt

        payload = {
            'model': 'claude-haiku-4-5-20251001',
            'max_tokens': 2000,
            'messages': [{'role': 'user', 'content': content}]
        }
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': settings.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        }

        for attempt in range(4):  # try up to 4 times
            try:
                response = requests.post(
                    'https://api.anthropic.com/v1/messages',
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                if response.status_code == 429:
                    wait = 2 ** attempt  # 1s, 2s, 4s, 8s
                    print(f"⚠ Rate limited — waiting {wait}s before retry {attempt + 1}/4")
                    time.sleep(wait)
                    continue
                response.raise_for_status()
                return response.json()
            except requests.Timeout:
                if attempt == 3:
                    raise Exception("Claude API timed out after 4 attempts")
                time.sleep(2 ** attempt)
            except requests.HTTPError as e:
                if e.response.status_code != 429:
                    raise Exception(f"Claude API HTTP error: {e.response.status_code} - {e.response.text[:200]}")

        raise Exception("Claude API failed after 4 retries — rate limit persists")

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
        except Exception:
            return {
                'marks_awarded': 0,
                'max_marks': max_marks,
                'feedback': 'Could not read the marking result. Your answer was saved.',
                'is_correct': False,
                'personalized_message': '',
                'study_tip': '',
                'points_earned': [],
                'points_missed': []
            }


def grade_answer(question, student_answer, working_image=None):
    """Grade any question — handles multi-part questions too"""
    grader = AIGrader()
    grader.working_image = working_image

    parts = list(question.parts.all())
    if not parts:
        return grader.mark_question(question, student_answer)

    # Multi-part grading
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
                self.passage = None
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