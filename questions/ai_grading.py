"""
ai_grader.py
CBC Kenya Learning Platform — AI Grading Engine
Uses Claude Haiku to mark student answers across all question types.
"""

import json
import random
import re
import time

import requests
from django.conf import settings
from sympy import N, simplify, sympify
from sympy.parsing.latex import parse_latex
from sympy.core.sympify import SympifyError


# ─────────────────────────────────────────────────────────────────────────────
#  CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

CLAUDE_MODEL   = "claude-haiku-4-5-20251001"
CLAUDE_URL     = "https://api.anthropic.com/v1/messages"
MAX_TOKENS     = 2000
MAX_RETRIES    = 4

KISWAHILI_KEYWORDS = {
    "je", "na", "ya", "wa", "la", "kwa", "katika", "yako",
    "chagua", "andika", "tambua", "kamilisha", "sentensi",
    "neno", "silabi", "wingi", "kanusha", "aya", "wimbo",
    "mwalimu", "mwanafunzi", "darasa", "shule", "jibu",
    "sahihi", "maana", "kitenzi", "nomino", "kielezi",
    "hii", "hizi", "hilo", "sisi", "wewe", "yeye",
}

PRAISE_EN = [
    "Spot on! Well done.",
    "Perfect — great work!",
    "Correct! You got it.",
    "Excellent answer!",
    "Yes! That is exactly right.",
]

PRAISE_SW = [
    "Hongera! Umefanya vizuri sana.",
    "Vizuri kabisa! Jibu sahihi.",
    "Nzuri sana! Umepata jibu sahihi.",
    "Umefanya kazi nzuri!",
    "Sahihi kabisa! Endelea hivyo.",
]

ENCOURAGE_EN = [
    "You are really getting the hang of this!",
    "Keep up the great work!",
    "Fantastic — keep going!",
    "Well done — so proud of you!",
    "Superb! On to the next one.",
]

ENCOURAGE_SW = [
    "Unajifunza vizuri sana — endelea!",
    "Hongera — kazi yako ni nzuri!",
    "Vizuri sana — jaribu tena!",
    "Unaendelea vizuri — usikate tamaa!",
    "Nzuri sana — hii ni maendeleo mazuri!",
]

NEAR_MISS_EN = [
    "Not quite — but you are learning!",
    "Good try — have another look.",
    "Almost there — check the correct answer.",
    "Close! Review the steps and try again.",
    "Let us work through this together.",
]

NEAR_MISS_SW = [
    "Karibu sana — angalia jibu sahihi tena.",
    "Jaribu tena — uko karibu!",
    "Jibu lako halikuwa sahihi, lakini endelea kujifunza.",
    "Karibu — soma jibu sahihi kisha jaribu tena.",
    "Usikate tamaa — tutafanya hii pamoja.",
]


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _is_kiswahili(text: str) -> bool:
    """Detect Kiswahili by counting keyword matches (requires ≥ 2)."""
    words = set(text.lower().split())
    return sum(1 for w in KISWAHILI_KEYWORDS if w in words) >= 2


def _praise(sw: bool) -> str:
    return random.choice(PRAISE_SW if sw else PRAISE_EN)


def _encourage(sw: bool) -> str:
    return random.choice(ENCOURAGE_SW if sw else ENCOURAGE_EN)


def _near_miss(sw: bool) -> str:
    return random.choice(NEAR_MISS_SW if sw else NEAR_MISS_EN)


def _empty_result(max_marks: int, feedback: str, message: str) -> dict:
    return {
        "marks_awarded":      0,
        "max_marks":          max_marks,
        "feedback":           feedback,
        "is_correct":         False,
        "personalized_message": message,
        "study_tip":          "",
        "points_earned":      [],
        "points_missed":      [],
    }


def _correct_result(max_marks: int, feedback: str, message: str,
                    study_tip: str = "", points_earned: list = None) -> dict:
    return {
        "marks_awarded":      max_marks,
        "max_marks":          max_marks,
        "feedback":           feedback,
        "is_correct":         True,
        "personalized_message": message,
        "study_tip":          study_tip,
        "points_earned":      points_earned or [],
        "points_missed":      [],
    }


def _normalise(s: str) -> str:
    """Lowercase, collapse whitespace, strip trailing punctuation."""
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    s = s.rstrip(".,;:!?")
    return s


def _clean_num(s: str) -> str:
    return re.sub(r"[^\d.-]", "", s)


def _parse_math_expr(s: str):
    """Try plain sympy first, fall back to LaTeX parser. Returns None on failure."""
    s = str(s).strip().strip("$")
    try:
        return sympify(s, evaluate=False)
    except Exception:
        try:
            return parse_latex(s)
        except Exception:
            return None


def _parse_json_response(raw: str) -> dict:
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)


# ─────────────────────────────────────────────────────────────────────────────
#  CLAUDE API CLIENT
# ─────────────────────────────────────────────────────────────────────────────

def _call_claude(prompt: str, working_image: str | None = None) -> dict:
    """
    POST to Claude API with exponential back-off on 429s.
    Returns the raw API response dict.
    Raises Exception on unrecoverable errors.
    """
    if working_image:
        content = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": working_image,
                },
            },
            {
                "type": "text",
                "text": prompt + "\n\nThe student has shared a photo of their working above.",
            },
        ]
    else:
        content = prompt

    payload = {
        "model":      CLAUDE_MODEL,
        "max_tokens": MAX_TOKENS,
        "messages":   [{"role": "user", "content": content}],
    }
    headers = {
        "Content-Type":     "application/json",
        "x-api-key":        settings.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(CLAUDE_URL, headers=headers, json=payload, timeout=30)

            if resp.status_code == 429:
                wait = 2 ** attempt
                print(f"⚠ Rate limited — retrying in {wait}s (attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(wait)
                continue

            resp.raise_for_status()
            return resp.json()

        except requests.Timeout:
            if attempt == MAX_RETRIES - 1:
                raise Exception("Claude API timed out after all retries.")
            time.sleep(2 ** attempt)

        except requests.HTTPError as e:
            if e.response.status_code != 429:
                raise Exception(
                    f"Claude API HTTP {e.response.status_code}: {e.response.text[:200]}"
                )

    raise Exception("Claude API failed after all retries — rate limit persists.")


def _claude_text(prompt: str, working_image: str | None = None) -> str:
    """Convenience wrapper — returns the text content from Claude's response."""
    response = _call_claude(prompt, working_image)
    return response["content"][0]["text"]


# ─────────────────────────────────────────────────────────────────────────────
#  PROMPT BUILDERS
# ─────────────────────────────────────────────────────────────────────────────

def _language_rules(language: str, grade: int) -> str:
    """Strict language enforcement block injected into every marking prompt."""
    if language == "Kiswahili":
        return f"""
⚠️ SHERIA YA LUGHA — MUHIMU SANA:
Swali hili liko katika Kiswahili. Jibu lako LOTE lazima liwe katika Kiswahili.
Hii inajumuisha: maoni (feedback), ujumbe wa kuhamasisha, kidokezo cha kusoma, pointi zilizofanikiwa, na pointi zilizokosekana.
USANDIKE hata sentensi moja kwa Kiingereza.

MANENO YA KISWAHILI YA SIFA:
- Sema "Hongera!" au "Vizuri sana!" — USISEME "Pole sana!" kwa sifa (pole = sorry/condolences)
- Tumia lugha rahisi ya Kiswahili inayotumika Kenya mashuleni
- Jibu lazima lisikike kama mwalimu wa kweli wa Kenya — si tafsiri ya Kiingereza

SHERIA ZA LUGHA:
- Andika kwa lugha rahisi ambayo mwanafunzi wa Darasa {grade} anaweza kuelewa
- Sentensi fupi — si zaidi ya sentensi 3 kwa kila sehemu
- Zungumza moja kwa moja na mwanafunzi ukitumia "wewe" na "yako"
"""
    else:
        return f"""
⚠️ LANGUAGE RULE — CRITICAL:
This question is in English. Write your ENTIRE response in English only.
This includes: feedback, personalized_message, study_tip, points_earned, points_missed.
Do NOT write even one sentence in another language.

LANGUAGE RULES:
- Write in simple English that a Grade {grade} Kenyan student can understand
- Use words found in Kenyan CBC textbooks
- Short sentences only — maximum 3 sentences per section
- Talk directly to the student using "you" and "your"
- Sound like a kind, encouraging Kenyan teacher
- Never use: demonstrate, indicate, facilitate, enumerate, elaborate,
  subsequently, primarily, comprise, constitute, moreover, furthermore, utilize
"""


def _build_marking_prompt(question, student_answer: str, language: str) -> str:
    """
    Builds a high-precision marking prompt for the NurtureUp AI engine.
    Focuses on CBC 'Explanation' standards and Point-Evidence-Context logic.
    """
    grade = getattr(getattr(question, "topic", None), "grade", 9)
    has_passage = hasattr(question, "passage") and question.passage is not None

    prompt = f"""You are an expert Kenyan CBC Teacher marking a Grade {grade} assessment.
{_language_rules(language, grade)}

--- CORE MARKING PHILOSOPHY (CBC STANDARDS) ---
1. STRUCTURE OVER KEYWORDS: Do not just look for keywords. Check if the student EXPLAINS the concept.
2. THE P-E-C RULE (Point-Evidence-Context):
   - For 'Explain' (Eleza/Fafanua) questions, a full point (1.0) requires:
     a) IDENTIFICATION: Naming the trait or theme (e.g., "Msaliti").
     b) EVIDENCE: Using a connector (e.g., "kwa sababu", "kwani").
     c) CONTEXT: Specific proof from the story (e.g., "alikataa kurudisha macho").
   - If a student ONLY identifies (e.g., writes "Msaliti" only), award ONLY 0.5 marks.
3. CATEGORY CHECK: Ensure 'Sifa za Hadithi' (Genre features) are not confused with 'Mbinu za Lugha' (Literary devices). 
   - Example: Calling "Personification/Uhuishi" a language technique is a common error. Correct it in feedback.
4. BE A TEACHER, NOT A BOT: Use "Warm-Strict" feedback. Praise the effort, but be very clear on why a mark was lost.

--- FEEDBACK STRUCTURE (MANDATORY) ---
Your feedback must follow this flow:
1. Affirmation: Start with what they did well.
2. Gap Analysis: For every mark lost, explain EXACTLY what was missing (e.g., "Umetaja sifa lakini hukutoa mfano kutoka kwa hadithi").
3. Model Answer: Provide the perfect version of the answer so the student learns for next time.
"""

    # MCQ Logic
    if question.question_type == "mcq":
        prompt += """
MCQ RULES:
- Correct Option = Full Marks. Wrong Option = 0.
- Feedback: Explain WHY the chosen option is correct/wrong using facts from the passage.
"""

    # Comprehension Logic
    if has_passage:
        prompt += f"""
COMPREHENSION CONTEXT:
Students MUST answer based on the text below. If they use general knowledge not in the text, award 0 marks.

--- PASSAGE ---
{question.passage.content}
--- END PASSAGE ---
"""

    # Question and Answer Injection
    q_text = question.question_text
    if question.question_type == "mcq":
        q_text += f"\nOPTIONS: A: {question.option_a}, B: {question.option_b}, C: {question.option_c}, D: {question.option_d}"
    
    prompt += f"\n\nQUESTION: {q_text}"
    prompt += f"\nSTUDENT ANSWER: {student_answer}"

    # Marking Scheme Injection
    if getattr(question, "marking_scheme", None):
        points = "\n".join([f"- {p['description']} ({p['marks']} marks)" for p in question.marking_scheme.get("points", [])])
        prompt += f"\n\nOFFICIAL MARKING SCHEME:\n{points}"
    else:
        prompt += f"\n\nEXPECTED ANSWER GUIDELINE:\n{question.correct_answer}"

    prompt += f"""
MAX MARKS: {question.max_marks}

Return ONLY valid JSON:
{{
  "marks_awarded": integer,
  "feedback": "Step-by-step educational feedback (4-6 sentences).",
  "personalized_message": "One warm, encouraging sentence.",
  "study_tip": "A specific tip on how to answer this TYPE of question next time (e.g., 'Always use "kwa sababu" to explain your points').",
  "points_earned": ["List of specific correct elements found"],
  "points_missed": ["List of specific missing elements or errors"]
}}"""

    return prompt


def _build_fill_blank_ai_prompt(question, student_answer: str, correct_answer: str) -> str:
    """Prompt asking Claude to semantically verify a fill-blank answer."""
    return f"""You are a Kenyan CBC teacher checking a fill-in-the-blank answer.

QUESTION: {question.question_text}
CORRECT ANSWER: {correct_answer}
STUDENT ANSWER: {student_answer}

Is the student's answer correct?
Examples:
- "thousands" vs "Thousands" → TRUE
- "ten thousand" vs "ten thousands place" → TRUE
- Clearly wrong answer → FALSE

Reply with ONLY the word TRUE or FALSE. Nothing else."""


def _build_math_study_tip_prompt(question, correct_answer, grade: int) -> str:
    return f"""You are a Kenyan CBC Grade {grade} maths teacher.
A student just got this question RIGHT.

QUESTION: {question.question_text}
CORRECT ANSWER: {correct_answer}

Write ONE short sentence (max 12 words) as a helpful tip for this type of problem.
Use simple words a Grade {grade} student understands.
Write ONLY the tip. No extra text."""


def _build_math_solution_prompt(question, student_answer: str,
                                correct_answer: str, grade: int) -> str:
    return f"""You are a Kenyan CBC Grade {grade} maths teacher helping a student who got a question WRONG.

QUESTION: {question.question_text}
STUDENT ANSWER: {student_answer}
CORRECT ANSWER: {correct_answer}

Write a step-by-step solution in simple words a Grade {grade} student can follow.
- Number each step: Step 1, Step 2, etc.
- Show the working clearly
- At the end, in one short sentence say what mistake the student likely made
- Keep it under 150 words total
- NO complicated words — write like you are talking to a child
- NO markdown, NO code blocks, NO # headings, NO asterisks
- Use LaTeX for ALL numbers and calculations:
  inline → $...$ | display → $$...$$
  Example: "Step 1: Subtract $7540 - 2465 = 5075$"
"""


# ─────────────────────────────────────────────────────────────────────────────
#  GRADERS
# ─────────────────────────────────────────────────────────────────────────────

def _grade_fill_blank(question, student_answer: str) -> dict:
    """
    Fill-in-the-blank grader.
    Order of checks:
      1. Exact string match (case/punctuation insensitive)
      2. Numeric equivalence
      3. AI semantic check (fallback)
    """
    # No correct answer set → fall back to AI
    if not question.correct_answer or not str(question.correct_answer).strip():
        return _grade_with_ai(question, student_answer)

    sw = _is_kiswahili(question.question_text)

    student_raw = str(student_answer).strip()
    if not student_raw:
        msg = "Hujaandika jibu." if sw else "You did not write an answer."
        tip = "Andika jibu lako wazi." if sw else "Always write your answer clearly."
        return _empty_result(question.max_marks, msg, _near_miss(sw))

    student_norm = _normalise(student_raw)
    raw_correct  = str(question.correct_answer).strip()
    accepted     = [_normalise(a) for a in re.split(r"[|;]", raw_correct) if a.strip()]

    is_correct = student_norm in accepted

    # Numeric equivalence check
    if not is_correct:
        try:
            s_num = float(_clean_num(student_norm))
            for a in accepted:
                try:
                    if abs(s_num - float(_clean_num(a))) < 0.01:
                        is_correct = True
                        break
                except ValueError:
                    pass
        except ValueError:
            pass

    # AI semantic fallback
    if not is_correct:
        try:
            prompt   = _build_fill_blank_ai_prompt(question, student_raw, raw_correct)
            verdict  = _claude_text(prompt).strip().upper()
            is_correct = verdict == "TRUE"
        except Exception as e:
            print(f"⚠ AI fill-blank fallback failed: {e}")

    if is_correct:
        return _correct_result(
            max_marks     = question.max_marks,
            feedback      = _praise(sw),
            message       = _encourage(sw),
            points_earned = [student_raw],
        )

    explanation = getattr(question, "explanation", None) or (
        f"Jibu sahihi ni: {raw_correct}." if sw else f"The correct answer is: {raw_correct}."
    )
    missed_msg = f"Jibu sahihi: {raw_correct}" if sw else f"Correct answer: {raw_correct}"

    return {
        "marks_awarded":        0,
        "max_marks":            question.max_marks,
        "feedback":             (
            f"Jibu sahihi ni {raw_correct}." if sw
            else f"Not quite. The correct answer is {raw_correct}."
        ),
        "is_correct":           False,
        "personalized_message": _near_miss(sw),
        "study_tip":            explanation,
        "points_earned":        [],
        "points_missed":        [missed_msg],
    }


def _grade_math(question, student_answer: str) -> dict:
    """
    Math grader.
    Order of checks:
      1. Fast numeric comparison (if correct answer is purely numeric)
      2. Symbolic comparison via sympy
      3. Numeric approximation via sympy
    Falls back to AI if no correct answer is set.
    """
    if not question.correct_answer or not str(question.correct_answer).strip():
        return _grade_with_ai(question, student_answer)

    sw          = _is_kiswahili(question.question_text)
    grade       = getattr(getattr(question, "topic", None), "grade", 7)
    student_str = str(student_answer).strip()
    correct_str = str(question.correct_answer).strip()

    if not student_str:
        msg = "Hujaandika jibu." if sw else "You did not write an answer."
        return _empty_result(question.max_marks, msg, _near_miss(sw))

    def _math_correct(display_value):
        try:
            tip = _claude_text(
                _build_math_study_tip_prompt(question, display_value, grade)
            )
        except Exception:
            tip = (
                "Endelea kufanya mazoezi ya matatizo kama haya!"
                if sw else
                "Keep practising similar problems to get even faster!"
            )
        return _correct_result(
            max_marks     = question.max_marks,
            feedback      = f"{_praise(sw)} {tip}",
            message       = _encourage(sw),
            study_tip     = tip,
            points_earned = [str(display_value)],
        )

    # Fast numeric check (only for purely numeric correct answers)
    if not re.search(r"[a-zA-Z]", correct_str):
        try:
            if abs(float(_clean_num(student_str)) - float(_clean_num(correct_str))) < 0.01:
                return _math_correct(float(_clean_num(student_str)))
        except ValueError:
            pass

    # Symbolic / approximate check
    try:
        s_expr = _parse_math_expr(student_str)
        c_expr = _parse_math_expr(correct_str)
        if s_expr is not None and c_expr is not None:
            if simplify(s_expr - c_expr) == 0:
                return _math_correct(str(s_expr))
            if abs(N(s_expr) - N(c_expr)) < 0.01:
                return _math_correct(f"≈ {N(s_expr):g}")
    except Exception:
        pass

    # Incorrect — generate step-by-step solution via Claude
    try:
        solution = _claude_text(
            _build_math_solution_prompt(question, student_str, correct_str, grade)
        ).strip().replace("```", "").replace("**", "")
    except Exception:
        solution = (
            f"Jibu sahihi ni {correct_str}. Angalia hatua zako na ujaribu tena."
            if sw else
            f"The correct answer is {correct_str}. Check your steps and try again."
        )

    missed_msg = (
        f"Jibu sahihi: {correct_str}" if sw else f"Correct answer: {correct_str}"
    )

    return {
        "marks_awarded":        0,
        "max_marks":            question.max_marks,
        "feedback":             (
            f"Jibu sahihi ni {correct_str}." if sw
            else f"Not quite. The correct answer is {correct_str}."
        ),
        "is_correct":           False,
        "personalized_message": _near_miss(sw),
        "study_tip":            solution,
        "points_earned":        [],
        "points_missed":        [missed_msg],
    }


def _grade_with_ai(question, student_answer: str,
                   working_image: str | None = None) -> dict:
    """
    AI grader for MCQ, structured, and essay questions.
    Also used as fallback for fill_blank and math when no correct answer is set.
    """
    if not getattr(settings, "ANTHROPIC_API_KEY", None):
        return _empty_result(
            question.max_marks,
            "AI grading is not set up.",
            "Please contact your teacher.",
        )

    sw = _is_kiswahili(question.question_text)
    language = "Kiswahili" if sw else "English"

    try:
        prompt      = _build_marking_prompt(question, student_answer, language)
        raw_text    = _claude_text(prompt, working_image)
        result      = _parse_json_response(raw_text)

        marks       = min(int(result.get("marks_awarded", 0)), question.max_marks)
        return {
            "marks_awarded":        marks,
            "max_marks":            question.max_marks,
            "feedback":             result.get("feedback", ""),
            "is_correct":           marks == question.max_marks,
            "personalized_message": result.get("personalized_message", ""),
            "study_tip":            result.get("study_tip", ""),
            "points_earned":        result.get("points_earned", []),
            "points_missed":        result.get("points_missed", []),
        }

    except Exception as e:
        print(f"❌ AI Grading Error (Q{getattr(question, 'id', '?')}): {e}")
        msg = (
            "Alama haikusomwa. Jibu lako limerekodi na mwalimu ataangalia."
            if sw else
            "Marking failed. Your answer was saved and a teacher will review it."
        )
        return _empty_result(question.max_marks, msg, _near_miss(sw))


# ─────────────────────────────────────────────────────────────────────────────
#  QUESTION ROUTER
# ─────────────────────────────────────────────────────────────────────────────

def _route(question, student_answer: str,
           working_image: str | None = None) -> dict:
    """Route a question to the correct grader based on question_type."""
    qt = question.question_type

    if qt in ("mcq", "structured", "essay"):
        return _grade_with_ai(question, student_answer, working_image)
    elif qt == "fill_blank":
        return _grade_fill_blank(question, student_answer)
    elif qt == "math":
        return _grade_math(question, student_answer)
    else:
        sw = _is_kiswahili(question.question_text)
        return _empty_result(
            question.max_marks,
            f"Unsupported question type: {qt}",
            _near_miss(sw),
        )


# ─────────────────────────────────────────────────────────────────────────────
#  MULTI-PART HELPER
# ─────────────────────────────────────────────────────────────────────────────

class _PartProxy:
    """Wraps a QuestionPart ORM object so graders can treat it like a Question."""

    def __init__(self, part):
        parent = part.parent_question
        self.id             = part.id
        self.question_text  = f"({part.part_label}) {part.question_text}"
        self.question_type  = part.question_type
        self.correct_answer = part.correct_answer
        self.max_marks      = part.max_marks
        self.marking_scheme = part.marking_scheme
        self.explanation    = part.explanation
        self.option_a       = part.option_a
        self.option_b       = part.option_b
        self.option_c       = part.option_c
        self.option_d       = part.option_d
        self.topic          = parent.topic
        self.passage        = None
        self.worked_solution = None


def _grade_multipart(question, student_answer, working_image: str | None = None) -> dict:
    """Grade a question that has sub-parts."""
    parts = list(question.parts.all())
    total_marks  = 0
    total_max    = 0
    all_feedback = []
    all_earned   = []
    all_missed   = []

    for part in parts:
        part_answer = (
            student_answer.get(str(part.id), "")
            if isinstance(student_answer, dict)
            else student_answer
        )

        result = _route(_PartProxy(part), str(part_answer), working_image)

        total_marks += result["marks_awarded"]
        total_max   += result["max_marks"]

        part_fb = result["feedback"]
        if result.get("study_tip"):
            part_fb += f"\n{result['study_tip']}"

        all_feedback.append(f"Part ({part.part_label}): {part_fb}")
        all_earned.extend(result.get("points_earned", []))
        all_missed.extend(result.get("points_missed", []))

    sw = _is_kiswahili(question.question_text)

    return {
        "marks_awarded":        total_marks,
        "max_marks":            total_max,
        "feedback":             "\n\n".join(all_feedback),
        "is_correct":           total_marks == total_max,
        "personalized_message": _encourage(sw) if total_marks == total_max else _near_miss(sw),
        "study_tip":            "",
        "points_earned":        all_earned,
        "points_missed":        all_missed,
    }


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def grade_answer(question, student_answer, working_image: str | None = None) -> dict:
    """
    Grade any question — handles single questions and multi-part questions.

    Args:
        question:       Django ORM Question instance
        student_answer: str | dict (dict for multi-part: {part_id: answer})
        working_image:  optional base64-encoded PNG of student's working

    Returns:
        dict with keys:
            marks_awarded, max_marks, feedback, is_correct,
            personalized_message, study_tip, points_earned, points_missed
    """
    parts = list(question.parts.all())
    if parts:
        return _grade_multipart(question, student_answer, working_image)
    return _route(question, str(student_answer), working_image)