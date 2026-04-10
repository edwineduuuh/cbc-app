"""
ai_grader.py
CBC Kenya Learning Platform — AI Grading Engine
Uses Claude Haiku (with Sonnet fallback for Kiswahili structured/essay)
to mark student answers across all question types.
"""

import json
import random
import re
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError, as_completed

import requests
from django.conf import settings
from sympy import N, simplify, sympify
from sympy.parsing.latex import parse_latex


# ─────────────────────────────────────────────────────────────────────────────
#  CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

MODEL_HAIKU  = "claude-haiku-4-5-20251001"
MODEL_SONNET = "claude-sonnet-4-6"
CLAUDE_URL   = "https://api.anthropic.com/v1/messages"
MAX_RETRIES  = 4

MAX_TOKENS_MCQ        = 400
MAX_TOKENS_STRUCTURED = 800
MAX_TOKENS_ESSAY      = 1000
MAX_TOKENS_DEFAULT    = 600

SYMPY_TIMEOUT_SECONDS = 3


# ─────────────────────────────────────────────────────────────────────────────
#  RESPONSE STRINGS
# ─────────────────────────────────────────────────────────────────────────────

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
    "Vizuri sana — endelea hivyo!",
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
#  LANGUAGE DETECTION
# ─────────────────────────────────────────────────────────────────────────────

def _is_kiswahili(question) -> bool:
    """Return True only when the question belongs to the Kiswahili subject."""
    try:
        return question.topic.subject.name.lower() == "kiswahili"
    except AttributeError:
        return False


# ─────────────────────────────────────────────────────────────────────────────
#  SMALL HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _praise(sw: bool) -> str:
    return random.choice(PRAISE_SW if sw else PRAISE_EN)


def _encourage(sw: bool) -> str:
    return random.choice(ENCOURAGE_SW if sw else ENCOURAGE_EN)


def _near_miss(sw: bool) -> str:
    return random.choice(NEAR_MISS_SW if sw else NEAR_MISS_EN)


def _empty_result(max_marks: int, feedback: str, message: str) -> dict:
    return {
        "marks_awarded":        0,
        "max_marks":            max_marks,
        "feedback":             feedback,
        "is_correct":           False,
        "personalized_message": message,
        "study_tip":            "",
        "points_earned":        [],
        "points_missed":        [],
    }


def _correct_result(max_marks: int, feedback: str, message: str,
                    study_tip: str = "", points_earned: list = None) -> dict:
    return {
        "marks_awarded":        max_marks,
        "max_marks":            max_marks,
        "feedback":             feedback,
        "is_correct":           True,
        "personalized_message": message,
        "study_tip":            study_tip,
        "points_earned":        points_earned or [],
        "points_missed":        [],
    }


def _to_list(val) -> list:
    """Normalise Claude's points_earned / points_missed to a list always."""
    if isinstance(val, list):
        return val
    if isinstance(val, str) and val.strip():
        return [val.strip()]
    return []


def _safe_int_marks(raw, max_marks: int) -> int:
    """
    Convert Claude's marks_awarded to a safe integer.
    Handles strings like "2", "2 marks", floats like 2.5, and None.
    Always clamps to [0, max_marks].
    """
    try:
        numeric_str = re.search(r"-?\d+\.?\d*", str(raw))
        val = int(float(numeric_str.group())) if numeric_str else 0
    except (TypeError, ValueError):
        val = 0
    return max(0, min(val, max_marks))


def _normalise(s: str) -> str:
    """Lowercase, collapse whitespace, strip trailing punctuation."""
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    s = s.rstrip(".,;:!?")
    return s


def _clean_num(s: str) -> str:
    """Extract the first numeric token from a string."""
    match = re.search(r"-?\d+\.?\d*", str(s))
    return match.group() if match else ""


def _extract_mcq_letter(text: str) -> str:
    """Extract the MCQ letter from a correct answer string like 'A - foo'."""
    if not text:
        return ""
    candidate = str(text).strip().upper()
    match = re.match(r"^([ABCD])\b", candidate)
    if match:
        return match.group(1)
    match = re.search(r"\b([ABCD])\b", candidate)
    return match.group(1) if match else ""


def _safe_opt(val) -> str:
    """Return option text or a placeholder — prevents None leaking into prompts."""
    return str(val).strip() if val and str(val).strip() else "(not provided)"


# ─────────────────────────────────────────────────────────────────────────────
#  MATHS HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _parse_math_expr(s: str):
    """
    Parse a mathematical expression string.
    Tries plain sympy first, falls back to LaTeX parser.
    Returns None on failure — never raises.
    """
    s = str(s).strip().strip("$")
    try:
        return sympify(s, evaluate=False)
    except Exception:
        pass
    try:
        return parse_latex(s)
    except Exception:
        return None


def _safe_simplify(expr):
    """
    Run sympy simplify with a hard timeout using a thread-based future.
    Returns the simplified expression or None if it times out or errors.
    Thread-safe — unlike signal.SIGALRM, this works inside ThreadPoolExecutor.
    """
    with ThreadPoolExecutor(max_workers=1) as ex:
        future = ex.submit(simplify, expr)
        try:
            return future.result(timeout=SYMPY_TIMEOUT_SECONDS)
        except (FuturesTimeoutError, Exception):
            return None


# ─────────────────────────────────────────────────────────────────────────────
#  JSON PARSING
# ─────────────────────────────────────────────────────────────────────────────

def _parse_json_response(raw: str) -> dict:
    """
    Parse Claude's JSON response robustly.

    Strategy:
      1. Strip markdown fences and try direct parse.
      2. Find the first JSON object that starts with "marks_awarded" —
         this avoids false matches on braces inside feedback text.
      3. Fix trailing comma issues and retry.

    Raises json.JSONDecodeError if all strategies fail.
    """
    cleaned = raw.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Targeted extraction — anchors to "marks_awarded" so inner braces
    # in feedback text (e.g. {umuhimu wa elimu}) don't cause false matches.
    match = re.search(r'\{\s*"marks_awarded"[\s\S]*\}', cleaned)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Fix trailing commas and retry
    fixed = re.sub(r',\s*}', '}', re.sub(r',\s*]', ']', cleaned))
    return json.loads(fixed)


# ─────────────────────────────────────────────────────────────────────────────
#  CLAUDE API CLIENT
# ─────────────────────────────────────────────────────────────────────────────

def _call_claude(
    prompt: str,
    working_image: str | None = None,
    max_tokens: int = MAX_TOKENS_DEFAULT,
    model: str = MODEL_HAIKU,
) -> dict:
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
                    "type":       "base64",
                    "media_type": "image/png",
                    "data":       working_image,
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
        "model":      model,
        "max_tokens": max_tokens,
        "messages":   [{"role": "user", "content": content}],
    }
    headers = {
        "Content-Type":      "application/json",
        "x-api-key":         settings.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(CLAUDE_URL, headers=headers, json=payload, timeout=30)

            if resp.status_code == 429:
                wait = 2 ** attempt
                print(f"⚠ Rate limited — retrying in {wait}s "
                      f"(attempt {attempt + 1}/{MAX_RETRIES})")
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
                    f"Claude API HTTP {e.response.status_code}: "
                    f"{e.response.text[:200]}"
                )

    raise Exception("Claude API failed after all retries — rate limit persists.")


def _claude_text(
    prompt: str,
    working_image: str | None = None,
    max_tokens: int = MAX_TOKENS_DEFAULT,
    model: str = MODEL_HAIKU,
) -> str:
    return _call_claude(prompt, working_image, max_tokens, model)["content"][0]["text"]


# ─────────────────────────────────────────────────────────────────────────────
#  PROMPT BUILDERS
# ─────────────────────────────────────────────────────────────────────────────

def _build_marking_prompt(question, student_answer: str, sw: bool) -> str:
    """
    Build the full marking prompt for MCQ, structured, and essay questions.
    Single source of truth — no duplicated content blocks.
    """
    grade       = getattr(getattr(question, "topic", None), "grade", 7)
    has_passage = hasattr(question, "passage") and question.passage is not None
    is_cloze    = has_passage and getattr(question.passage, "passage_type", "") == "cloze"
    max_marks   = question.max_marks

    # ── Role + language rules ─────────────────────────────────────────────────
    if sw:
        prompt = f"Wewe ni mwalimu wa CBC Kenya anayerekebisha jibu la mwanafunzi wa Darasa {grade}.\n"
        prompt += """
========================================================
SHERIA KUU — KISWAHILI SANIFU CHA CBC KENYA
========================================================
Andika maoni yako YOTE kwa Kiswahili Sanifu safi.
Hata neno moja kwa Kiingereza HAIRUHUSIWI katika sehemu yoyote ya JSON.

MTINDO SAHIHI — sentensi fupi, za moja kwa moja:
  "Umepata jibu sahihi — [sehemu sahihi]. Jibu kamili lilikuwa: [jibu kamili]."
  "Ulikosea hapa: [kosa]. Jibu sahihi ni: [jibu sahihi]."
  "Soma [aya/ubeti/mstari] tena kwa makini."

MANENO YALIYOKATAZWA — USITUMIE KAMWE:
  - "ambayo ni zaidi ya..." / "inayoonesha umuhimu wa..." / "kama chombo cha..."
  - "Jibu sahihi linapaswa kuwa:" / "kwa muhtasari" / "Kwa hiyo"
  - Maneno yoyote ya Kiingereza — hata "answer", "correct", "marks"
  - Sentensi ndefu za zaidi ya maneno 20

MANENO SAHIHI YA SIFA:
  Tumia: "Hongera!", "Vizuri sana!", "Nzuri!", "Sahihi kabisa!", "Umefanya kazi nzuri!"
  USITUMIE: "Pole sana!" — inamaanisha "sorry" kwa Kiswahili cha Kenya

SHERIA ZA MWALIMU:
  - Kosa la tahajia ni sawa isipokuwa libadilishe maana
  - Sheng au lugha ya mtaani = KOSA, hata kama maana ni wazi
  - Pointi sahihi ambayo haipo kwenye mpango wa alama — TOA ALAMA
  - LAZIMA ufuate majibu ya mwalimu — usitumie maarifa yako mwenyewe
  - Rudisha JSON tu — USIANDIKE CHOCHOTE KABLA YA { au BAADA YA }
========================================================
"""
    else:
        prompt = f"You are a Kenyan CBC teacher marking a Grade {grade} student's answer.\n"
        prompt += """
LANGUAGE: English only in every JSON field. Zero words in any other language.
TONE: Kind, direct, like a Kenyan primary school teacher.
FORBIDDEN WORDS: demonstrate, indicate, facilitate, enumerate, elaborate,
  subsequently, primarily, comprise, constitute, moreover, furthermore, utilize.
RULES:
  - Spelling mistakes are fine unless they change the meaning
  - Sheng or slang = WRONG, even if meaning is clear
  - Correct point not in marking scheme — AWARD THE MARKS
  - Follow the teacher's answer exactly — do not override with your own knowledge
  - Return JSON only — no text before or after
  - {"No working image provided — do NOT penalise for missing working and do NOT add it to points_missed." if not has_image else "Student has provided a photo of their working — use it when marking."}
MATH FORMATTING — NON-NEGOTIABLE:
  - Every number, variable, exponent, fraction MUST use LaTeX syntax
  - Inline math: $2^3$, $\\frac{1}{8}$, $(-2)^{-1}$, $x = 4$, $\\times$
  - Display math (own line): $$2^{x-3} \\times 8^{x+2} = 128$$
  - NEVER write bare maths outside dollar signs in any field
  - WRONG: "divide by 3^4 to get -1"
  - RIGHT: "divide by $3^4$ to get $-1$"
  - WRONG: "2 times 8 = 16"
  - RIGHT: "$2 \\times 8 = 16$"
"""

    # ── Marking rules ─────────────────────────────────────────────────────────
    if sw:
        prompt += """
SHERIA ZA KUREKEBISHA:
1. Toa alama kwa ufahamu wa kweli — maneno sahihi kabisa si lazima
2. Alama zote tu wakati mawazo yote muhimu yako wazi
3. Alama za sehemu — nambari kamili tu, si desimali
4. Usizidi alama za juu za swali
5. Taarifa zisizo sahihi zinapunguza alama
6. Kama unasema jibu ni sahihi, LAZIMA utoe alama zote — si 0
"""
    else:
        prompt += """
MARKING RULES:
1. Award marks for real understanding — exact wording not required
2. Full marks only when all key ideas are clearly present
3. Partial marks for partial answers — integers only, no decimals
4. Never exceed the question's maximum marks
5. Wrong or irrelevant information reduces marks
6. CRITICAL: If you say the answer is correct you MUST award full marks — never 0
"""

    # ── MCQ-specific rules ────────────────────────────────────────────────────
    if question.question_type == "mcq":
        if sw:
            prompt += """
SHERIA ZA MCQ:
- Chaguo sahihi -> alama zote
- Chaguo baya -> alama 0 — hakuna alama za sehemu
MAONI: Anza na "Hongera!" au "Jibu si sahihi. Jibu sahihi ni ..."
Eleza kwa nini kwa sentensi 1-2. Malizia na "Kumbuka:".
"""
        else:
            prompt += """
MCQ RULES:
- Correct option -> full marks. Wrong option -> 0. No partial marks.
FEEDBACK FORMAT:
  Correct: "Correct! ..." then 1-2 sentences why. End with one "Remember:" tip.
  Wrong: "Not quite. The right answer is: ..." For calculation questions show
  step-by-step working with $$...$$ on its own line. End with "Remember:" tip.
  Maximum 6 sentences total.
"""

    # ── Passage rules ─────────────────────────────────────────────────────────
    if has_passage and is_cloze:
        if sw:
            prompt += f"""
CLOZE — jaza nafasi kutoka muktadha wa kifungu tu. Usifafanue maneno.
--- KIFUNGU ---
{question.passage.content}
--- MWISHO ---
"""
        else:
            prompt += f"""
CLOZE — fill blank from passage context only. Do NOT explain word meanings.
--- PASSAGE ---
{question.passage.content}
--- END ---
"""
    elif has_passage and not is_cloze:
        if sw:
            prompt += f"""
UFAHAMU — jibu kutoka kifungu tu. Sema wapi kifungu kinasema jibu: "Kifungu kinasema..."
Maoni: sentensi 2 TU — si zaidi.
--- KIFUNGU ---
{question.passage.content}
--- MWISHO ---
"""
        else:
            prompt += f"""
COMPREHENSION — answer from passage only.
Cite exactly where: "The passage states..." or "In paragraph..."
Feedback: maximum 2 sentences only.
--- PASSAGE ---
{question.passage.content}
--- END PASSAGE ---
"""

    # ── Question text ─────────────────────────────────────────────────────────
    q_text = question.question_text
    if question.question_type == "mcq":
        q_text += (
            f"\n\nOPTIONS:\n"
            f"A: {_safe_opt(question.option_a)}\n"
            f"B: {_safe_opt(question.option_b)}\n"
            f"C: {_safe_opt(question.option_c)}\n"
            f"D: {_safe_opt(question.option_d)}"
        )
    prompt += f"\n\nQUESTION:\n{q_text}"

    # ── Student answer ────────────────────────────────────────────────────────
    s_ans = str(student_answer).strip()
    if question.question_type == "mcq":
        options_map = {
            "A": _safe_opt(question.option_a),
            "B": _safe_opt(question.option_b),
            "C": _safe_opt(question.option_c),
            "D": _safe_opt(question.option_d),
        }
        letter = s_ans.upper()
        if letter in options_map:
            s_ans = f"Option {letter}: {options_map[letter]}"
    prompt += f"\n\nSTUDENT ANSWER:\n{s_ans}"

    # ── Correct answer / marking scheme (single block — no duplicates) ────────
    if question.question_type == "mcq":
        correct_letter = str(question.correct_answer).strip().upper()
        if correct_letter not in ("A", "B", "C", "D"):
            print(f"⚠ Q{getattr(question, 'id', '?')}: "
                  f"correct_answer '{question.correct_answer}' is not A/B/C/D — defaulting to A")
            correct_letter = "A"
        options_map = {
            "A": _safe_opt(question.option_a),
            "B": _safe_opt(question.option_b),
            "C": _safe_opt(question.option_c),
            "D": _safe_opt(question.option_d),
        }
        prompt += f"\n\nCORRECT ANSWER:\nOption {correct_letter}: {options_map[correct_letter]}"
        if getattr(question, "explanation", None):
            prompt += (
                f"\nEXPLANATION (use to confirm only — do NOT expand or add to it): "
                f"{question.explanation}"
            )
    else:
        if getattr(question, "marking_scheme", None):
            points_text = "\n".join(
                f"- {p['description']} ({p['marks']} marks)"
                for p in question.marking_scheme.get("points", [])
            )
            prompt += (
                f"\n\nMARKING SCHEME (follow exactly — do NOT use your own judgment):\n"
                f"{points_text}"
            )
        else:
            prompt += (
                f"\n\nEXPECTED ANSWER (follow exactly — do NOT use your own judgment):\n"
                f"{question.correct_answer}"
            )
        if getattr(question, "explanation", None):
            prompt += (
                f"\nEXPLANATION (use to confirm only — do NOT expand or add to it): "
                f"{question.explanation}"
            )

    # ── JSON output template ──────────────────────────────────────────────────
    if sw:
        study_tip_instruction = (
            "Taja aya au mstari maalum wa kifungu ambapo jibu linapatikana. USIRUDIE maoni."
            if (has_passage and not is_cloze) else
            "Kidokezo kimoja kipya cha kukumbuka — mbinu rahisi au kidokezo cha mtihani. "
            "Ikiwa huna uhakika, acha tupu."
        )
        prompt += f"""

ALAMA ZA JUU: {max_marks}

{{
  "marks_awarded": <nambari kamili kati ya 0 na {max_marks}>,
  "feedback": "<Sentensi 4-6 KWA KISWAHILI SANIFU: nini kilisahihika, nini kilikosekana, jibu kamili sahihi. Sentensi fupi. Moja kwa moja.>",
  "personalized_message": "<sentensi moja fupi ya kuhamasisha KWA KISWAHILI SANIFU>",
  "study_tip": "<{study_tip_instruction}>",
  "points_earned": ["<pointi sahihi kwa Kiswahili Sanifu>"],
  "points_missed": ["<pointi zilizokosekana kwa Kiswahili Sanifu>"]
}}"""

    else:
        study_tip_instruction = (
            "Point to the specific paragraph or line where the answer is found. "
            "Do NOT repeat the feedback."
            if (has_passage and not is_cloze) else
            "One NEW helpful tip not already in the feedback — a memory trick or exam tip. "
            "Leave empty string if not sure."
        )
        prompt += f"""

MAX MARKS: {max_marks}

{{
  "marks_awarded": <integer between 0 and {max_marks}>,
  "is_correct": <true if marks_awarded == {max_marks}, else false>,
  "feedback": "<Start with 'Correct!' if is_correct is true, or 'Not quite.' if false. Then 4-6 sentences separated by \\n covering what was right, what was wrong, and the full correct answer. Use LaTeX for ALL maths.>",
  "study_tip": "<{study_tip_instruction}>",
  "points_earned": ["<what student got right in simple words>"],
  "points_missed": ["<what student missed in simple words>"]
}}"""

    return prompt


def _build_fill_blank_ai_prompt(
    question, student_answer: str, correct_answer: str, sw: bool
) -> str:
    """
    Ask Claude to semantically verify a fill-blank answer.
    Returns KWELI/UONGO (Kiswahili) or TRUE/FALSE (English).
    """
    if sw:
        return f"""Wewe ni mwalimu wa CBC Kenya ukiangalia jibu la kujaza nafasi.

SWALI: {question.question_text}
JIBU SAHIHI: {correct_answer}
JIBU LA MWANAFUNZI: {student_answer}

Je, jibu la mwanafunzi ni sahihi?
Mifano:
- "maelfu" dhidi ya "Maelfu" -> KWELI
- "mahali pa maelfu" dhidi ya "nafasi ya maelfu" -> KWELI
- Jibu tofauti kabisa -> UONGO

Jibu kwa neno KWELI au UONGO peke yake. Hakuna kingine."""

    return f"""You are a Kenyan CBC teacher checking a fill-in-the-blank answer.

QUESTION: {question.question_text}
CORRECT ANSWER: {correct_answer}
STUDENT ANSWER: {student_answer}

Is the student's answer correct?
Examples:
- "thousands" vs "Thousands" -> TRUE
- "ten thousand" vs "ten thousands place" -> TRUE
- Clearly wrong answer -> FALSE

Reply with ONLY the word TRUE or FALSE. Nothing else."""


def _build_math_study_tip_prompt(question, correct_answer, grade: int) -> str:
    return f"""You are a Kenyan CBC Grade {grade} maths teacher.
A student just got this question RIGHT.

QUESTION: {question.question_text}
CORRECT ANSWER: {correct_answer}

Write ONE short sentence (max 12 words) as a helpful tip for this type of problem.
Use simple words a Grade {grade} student understands.
Write ONLY the tip. No extra text."""


def _build_math_solution_prompt(
    question, student_answer: str, correct_answer: str, grade: int
) -> str:
    return f"""You are a Kenyan CBC Grade {grade} maths teacher helping a student who got a question WRONG.

QUESTION: {question.question_text}
STUDENT ANSWER: {student_answer}
CORRECT ANSWER: {correct_answer}

Write a step-by-step solution in simple words a Grade {grade} student can follow.
- Number each step: Step 1, Step 2, etc.
- Show ALL calculations using LaTeX display math on their own line: $$...$$
- Example: $$6^2 + (6)(8) + 8^2 = 36 + 48 + 64 = 148$$
- Use inline LaTeX for numbers and variables in sentences: $x = 4$, $\\frac{{1}}{{8}}$, $\\times$
- NEVER write bare maths outside dollar signs
- At the end, in one short sentence say what mistake the student likely made
- Keep it under 150 words total
- Write like you are talking to a child who is struggling with Maths
- NO markdown, NO code blocks, NO headings, NO asterisks
"""


# ─────────────────────────────────────────────────────────────────────────────
#  GRADERS
# ─────────────────────────────────────────────────────────────────────────────

def _grade_fill_blank(question, student_answer: str) -> dict:
    """
    Fill-in-the-blank grader.

    Check order:
      1. Exact normalised string match (case / punctuation insensitive)
      2. Numeric equivalence
      3. AI semantic verification (fallback)

    Falls back to full AI grader if the question has no correct answer set.
    """
    if not question.correct_answer or not str(question.correct_answer).strip():
        return _grade_with_ai(question, student_answer)

    sw          = _is_kiswahili(question)
    student_raw = str(student_answer).strip()

    if not student_raw:
        msg = "Hujaandika jibu." if sw else "You did not write an answer."
        return _empty_result(question.max_marks, msg, _near_miss(sw))

    student_norm = _normalise(student_raw)
    raw_correct  = str(question.correct_answer).strip()
    accepted     = [_normalise(a) for a in re.split(r"[|;]", raw_correct) if a.strip()]
    is_correct   = student_norm in accepted

    # Numeric equivalence
    if not is_correct:
        s_clean = _clean_num(student_norm)
        if s_clean:
            try:
                s_num = float(s_clean)
                for a in accepted:
                    a_clean = _clean_num(a)
                    if a_clean:
                        try:
                            if abs(s_num - float(a_clean)) < 0.01:
                                is_correct = True
                                break
                        except ValueError:
                            pass
            except ValueError:
                pass

    # AI semantic fallback
    if not is_correct:
        try:
            verdict   = _claude_text(
                _build_fill_blank_ai_prompt(question, student_raw, raw_correct, sw)
            ).strip().upper()
            is_correct = verdict in ("TRUE", "KWELI")
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
        f"Jibu sahihi ni: {raw_correct}." if sw
        else f"The correct answer is: {raw_correct}."
    )

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
        "points_missed":        [
            f"Jibu sahihi: {raw_correct}" if sw else f"Correct answer: {raw_correct}"
        ],
    }


def _grade_mcq(question, student_answer: str) -> dict:
    """
    Deterministic MCQ grader using the stored A/B/C/D correct answer.

    This avoids unreliable AI grading for multiple choice questions,
    especially Kiswahili MCQs where the option letters are the only truth.
    """
    sw = _is_kiswahili(question)
    student_raw = str(student_answer or "").strip()

    if not student_raw:
        msg = "Hujajibu swali la MCQ." if sw else "You did not answer the MCQ question."
        return _empty_result(question.max_marks, msg, _near_miss(sw))

    correct_letter = _extract_mcq_letter(question.correct_answer)
    if correct_letter not in ("A", "B", "C", "D"):
        return _grade_with_ai(question, student_answer)

    options_map = {
        "A": _safe_opt(question.option_a),
        "B": _safe_opt(question.option_b),
        "C": _safe_opt(question.option_c),
        "D": _safe_opt(question.option_d),
    }

    selected_letter = None
    normalized = _normalise(student_raw)

    # Common letter-based responses
    match = re.search(r"\b([ABCD])\b", student_raw.upper())
    if match:
        selected_letter = match.group(1)
    else:
        # Try full option text matches
        for letter, option_text in options_map.items():
            if normalized == _normalise(option_text):
                selected_letter = letter
                break

    if selected_letter == correct_letter:
        feedback = (
            f"Hongera! Chaguo {correct_letter} ni sahihi." if sw
            else f"Correct! Option {correct_letter} is right."
        )
        return {
            "marks_awarded":        question.max_marks,
            "max_marks":            question.max_marks,
            "feedback":             feedback,
            "is_correct":           True,
            "personalized_message": _encourage(sw),
            "study_tip":            "",
            "points_earned":        [f"Option {correct_letter}: {options_map[correct_letter]}"],
            "points_missed":        [],
        }

    correct_text = options_map.get(correct_letter, "(unknown)")
    feedback = (
        f"Jibu si sahihi. Jibu sahihi ni {correct_letter}: {correct_text}." if sw
        else f"Not quite. The correct answer is Option {correct_letter}: {correct_text}."
    )
    return {
        "marks_awarded":        0,
        "max_marks":            question.max_marks,
        "feedback":             feedback,
        "is_correct":           False,
        "personalized_message": _near_miss(sw),
        "study_tip":            "",
        "points_earned":        [],
        "points_missed":        [
            f"Jibu sahihi: {correct_letter}: {correct_text}" if sw
            else f"Correct answer: Option {correct_letter}: {correct_text}"
        ],
    }


def _grade_math(question, student_answer: str) -> dict:
    """
    Math grader.

    Check order:
      1. Fast numeric comparison (when correct answer is purely numeric)
      2. Symbolic equality via sympy (with thread-based timeout)
      3. Numeric approximation via sympy
      4. AI semantic verification
      5. Generate step-by-step solution for incorrect answers

    Falls back to full AI grader if the question has no correct answer set.
    Uses Sonnet for all AI calls — Haiku cannot reliably format LaTeX.
    """
    if not question.correct_answer or not str(question.correct_answer).strip():
        return _grade_with_ai(question, student_answer)

    sw          = _is_kiswahili(question)
    grade       = getattr(getattr(question, "topic", None), "grade", 7)
    student_str = str(student_answer).strip()
    correct_str = str(question.correct_answer).strip()

    if not student_str:
        msg = "Hujaandika jibu." if sw else "You did not write an answer."
        return _empty_result(question.max_marks, msg, _near_miss(sw))

    def _on_correct(display_value):
        try:
            tip = _claude_text(
                _build_math_study_tip_prompt(question, display_value, grade),
                model=MODEL_SONNET,
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

    # Fast numeric check (only when correct answer contains no letters)
    if not re.search(r"[a-zA-Z]", correct_str):
        s_clean = _clean_num(student_str)
        c_clean = _clean_num(correct_str)
        if s_clean and c_clean:
            try:
                if abs(float(s_clean) - float(c_clean)) < 0.01:
                    return _on_correct(float(s_clean))
            except ValueError:
                pass

    # Symbolic / approximate check with timeout
    try:
        s_expr = _parse_math_expr(student_str)
        c_expr = _parse_math_expr(correct_str)
        if s_expr is not None and c_expr is not None:
            diff   = _safe_simplify(s_expr - c_expr)
            if diff is not None and diff == 0:
                return _on_correct(str(s_expr))
            try:
                if abs(N(s_expr) - N(c_expr)) < 0.01:
                    return _on_correct(f"approx {N(s_expr):g}")
            except Exception:
                pass
    except Exception:
        pass

    # AI semantic check
    try:
        verdict = _claude_text(
            _build_fill_blank_ai_prompt(question, student_str, correct_str, sw),
            model=MODEL_SONNET,
        ).strip().upper()
        if verdict in ("TRUE", "KWELI"):
            return _on_correct(student_str)
    except Exception:
        pass

    # Incorrect — generate step-by-step solution using Sonnet
    try:
        solution = _claude_text(
            _build_math_solution_prompt(question, student_str, correct_str, grade),
            model=MODEL_SONNET,
            max_tokens=1200,
        ).strip().replace("```", "").replace("**", "")
    except Exception:
        solution = (
            f"Jibu sahihi ni {correct_str}. Angalia hatua zako na ujaribu tena."
            if sw else
            f"The correct answer is {correct_str}. Check your steps and try again."
        )

    return {
        "marks_awarded":        0,
        "max_marks":            question.max_marks,
        "feedback":             (
            f"Jibu sahihi ni {correct_str}." if sw
            else f"Not quite. The correct answer is ${correct_str}$."
        ),
        "is_correct":           False,
        "personalized_message": _near_miss(sw),
        "study_tip":            solution,
        "points_earned":        [],
        "points_missed":        [
            f"Jibu sahihi: {correct_str}" if sw else f"Correct answer: ${correct_str}$"
        ],
    }


def _grade_with_ai(
    question,
    student_answer: str,
    working_image: str | None = None,
) -> dict:
    """
    AI grader for MCQ, structured, and essay questions.
    Also used as fallback for fill_blank and math when no correct answer is set.

    Model selection:
      - Kiswahili structured/essay -> Sonnet (better non-English language quality)
      - Math (any type)            -> Sonnet (reliable LaTeX formatting)
      - Everything else            -> Haiku (faster, cheaper)
    """
    sw          = _is_kiswahili(question)
    student_raw = str(student_answer).strip()

    if not student_raw or student_raw in ("none", "\\placeholder{}"):
        msg = "Hujaandika jibu." if sw else "You did not write an answer."
        return _empty_result(question.max_marks, msg, _near_miss(sw))

    if not getattr(settings, "ANTHROPIC_API_KEY", None):
        return _empty_result(
            question.max_marks,
            "AI grading is not set up.",
            "Please contact your teacher.",
        )

    qt         = question.question_type
    max_tokens = {"mcq": MAX_TOKENS_MCQ,
                  "structured": MAX_TOKENS_STRUCTURED,
                  "essay": MAX_TOKENS_ESSAY}.get(qt, MAX_TOKENS_DEFAULT)

    # Sonnet for: Kiswahili structured/essay, and any maths question
    is_math = qt == "math" or getattr(question, "subject_name", "").lower() == "mathematics"
    model = MODEL_SONNET if (sw and qt in ("structured", "essay")) or is_math else MODEL_HAIKU

    try:
        prompt   = _build_marking_prompt(question, student_answer, sw)
        raw_text = _claude_text(prompt, working_image, max_tokens, model)
        result   = _parse_json_response(raw_text)
        marks    = _safe_int_marks(result.get("marks_awarded", 0), question.max_marks)

        # 🔒 Consistency guard — prevents verdict/marks drift
        claimed_correct = result.get("is_correct", None)
        if claimed_correct is True and marks < question.max_marks:
            marks = question.max_marks
        elif claimed_correct is False and marks == question.max_marks:
            pass  # marks win — student got it right, don't penalise

        feedback = result.get("feedback", "")
        if marks == question.max_marks and feedback.strip().lower().startswith("not"):
            feedback = "Correct! " + feedback
        elif marks < question.max_marks and feedback.strip().lower().startswith("correct"):
            feedback = "Not quite. " + feedback[8:]

        return {
            "marks_awarded":        marks,
            "max_marks":            question.max_marks,
            "feedback":             feedback,
            "is_correct":           marks == question.max_marks,
            "personalized_message": result.get("personalized_message", ""),
            "study_tip":            result.get("study_tip", ""),
            "points_earned":        _to_list(result.get("points_earned", [])),
            "points_missed":        _to_list(result.get("points_missed", [])),
        }

    except Exception as e:
        print(f"AI Grading Error (Q{getattr(question, 'id', '?')}): {e}")

        correct_answer = getattr(question, "correct_answer", None)
        explanation    = getattr(question, "explanation", None)

        if correct_answer or explanation:
            if sw:
                fallback_feedback = (
                    f"Jibu sahihi: {correct_answer}. {explanation}"
                    if correct_answer and explanation
                    else f"Jibu sahihi ni: {correct_answer}."
                    if correct_answer
                    else str(explanation)
                )
            else:
                fallback_feedback = (
                    f"The correct answer is: {correct_answer}. {explanation}"
                    if correct_answer and explanation
                    else f"The correct answer is: {correct_answer}."
                    if correct_answer
                    else str(explanation)
                )
            return {
                "marks_awarded":        0,
                "max_marks":            question.max_marks,
                "feedback":             fallback_feedback,
                "is_correct":           False,
                "personalized_message": _near_miss(sw),
                "study_tip":            explanation or "",
                "points_earned":        [],
                "points_missed":        (
                    [f"Jibu sahihi: {correct_answer}" if sw
                     else f"Correct answer: {correct_answer}"]
                    if correct_answer else []
                ),
            }

        msg = (
            "Alama haikusomwa. Jibu lako limerekodi na mwalimu ataangalia."
            if sw else
            "Marking failed. Your answer was saved and a teacher will review it."
        )
        return _empty_result(question.max_marks, msg, _near_miss(sw))


# ─────────────────────────────────────────────────────────────────────────────
#  QUESTION ROUTER
# ─────────────────────────────────────────────────────────────────────────────

def _route(
    question,
    student_answer: str,
    working_image: str | None = None,
) -> dict:
    """Route a question to the correct grader based on question_type."""
    qt = question.question_type
    if qt in ("mcq", "structured", "essay"):
        return _grade_with_ai(question, student_answer, working_image)
    if qt == "fill_blank":
        return _grade_fill_blank(question, student_answer)
    if qt == "math":
        return _grade_math(question, student_answer)

    sw = _is_kiswahili(question)
    return _empty_result(
        question.max_marks,
        f"Aina ya swali haijulikani: {qt}" if sw else f"Unsupported question type: {qt}",
        _near_miss(sw),
    )


# ─────────────────────────────────────────────────────────────────────────────
#  MULTI-PART PROXY
# ─────────────────────────────────────────────────────────────────────────────

class _PartProxy:
    """
    Wraps a QuestionPart ORM object so all graders can treat it as a
    full Question. The part label is NOT prepended to question_text here —
    _grade_multipart adds the label when assembling the combined feedback.
    """
    def __init__(self, part):
        parent               = part.parent_question
        self.id              = part.id
        self.question_text   = part.question_text
        self.question_type   = part.question_type
        self.correct_answer  = part.correct_answer
        self.max_marks       = part.max_marks
        self.marking_scheme  = part.marking_scheme or parent.marking_scheme
        self.explanation     = part.explanation or parent.explanation
        self.option_a        = part.option_a
        self.option_b        = part.option_b
        self.option_c        = part.option_c
        self.option_d        = part.option_d
        self.topic           = parent.topic
        self.passage         = parent.passage
        self.worked_solution = None


# ─────────────────────────────────────────────────────────────────────────────
#  MULTI-PART GRADER
# ─────────────────────────────────────────────────────────────────────────────

def _grade_multipart(question, student_answer, working_image=None) -> dict:
    """
    Grade a multi-part question concurrently.

    Each part is graded independently in a thread. Failures in individual
    parts are caught and replaced with a safe empty result — the rest of
    the question continues grading normally.

    student_answer can be:
      - dict with string keys   {"part_id": "answer"}
      - dict with integer keys  {part_id: "answer"}  (normalised internally)
      - plain string            (applied to every part — unusual but handled)
    """
    parts = list(question.parts.all())
    sw    = _is_kiswahili(question)

    # Normalise dict keys to strings so lookups are always consistent
    if isinstance(student_answer, dict):
        normalised_answers = {str(k): v for k, v in student_answer.items()}
    else:
        normalised_answers = {}

    def grade_part(part):
        if isinstance(student_answer, dict):
            part_answer = normalised_answers.get(str(part.id), "")
        else:
            part_answer = student_answer
        return (
            part.id,
            part.part_label,
            _route(_PartProxy(part), str(part_answer), working_image),
        )

    results = {}
    with ThreadPoolExecutor(max_workers=len(parts)) as executor:
        futures = {executor.submit(grade_part, part): part for part in parts}
        for future in as_completed(futures):
            part = futures[future]
            try:
                part_id, label, result = future.result()
                results[part_id] = (label, result)
            except Exception as e:
                print(f"⚠ Part ({part.part_label}) grading failed: {e}")
                results[part.id] = (
                    part.part_label,
                    _empty_result(part.max_marks, _near_miss(sw), _near_miss(sw)),
                )

    total_marks  = 0
    total_max    = 0
    all_feedback = []
    all_earned   = []
    all_missed   = []

    for part_id in sorted(results.keys()):
        label, result = results[part_id]
        total_marks += result["marks_awarded"]
        total_max   += result["max_marks"]

        # Label prefixed here — NOT inside _PartProxy — so the label appears
        # exactly once in the combined feedback string.
        all_feedback.append(f"({label}) {result['feedback']}")
        all_earned.extend(_to_list(result.get("points_earned", [])))
        all_missed.extend(_to_list(result.get("points_missed", [])))

    return {
        "marks_awarded":        total_marks,
        "max_marks":            total_max,
        "feedback":             "\n\n".join(all_feedback),
        "is_correct":           total_marks == total_max,
        "personalized_message": (
            _encourage(sw) if total_marks == total_max else _near_miss(sw)
        ),
        "study_tip":            "",
        "points_earned":        all_earned,
        "points_missed":        all_missed,
    }


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def grade_answer(
    question,
    student_answer,
    working_image: str | None = None,
) -> dict:
    """
    Grade any question — handles both single and multi-part questions.

    Args:
        question:       Django ORM Question instance
        student_answer: str | dict  (dict for multi-part: {part_id: answer})
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