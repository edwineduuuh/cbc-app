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


# ─────────────────────────────────────────────────────────────────────────────
#  CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

CLAUDE_MODEL = "claude-haiku-4-5-20251001"
CLAUDE_URL   = "https://api.anthropic.com/v1/messages"
MAX_TOKENS   = 2000
MAX_RETRIES  = 4

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
    """Strip markdown fences and parse JSON."""
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)


# ─────────────────────────────────────────────────────────────────────────────
#  CLAUDE API CLIENT
# ─────────────────────────────────────────────────────────────────────────────
# Per question type token limits
MAX_TOKENS_MCQ        = 400
MAX_TOKENS_STRUCTURED = 800
MAX_TOKENS_ESSAY      = 1000
MAX_TOKENS_DEFAULT    = 600
def _call_claude(prompt: str, working_image: str | None = None, max_tokens: int = 600) -> dict:
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


def _claude_text(prompt: str, working_image: str | None = None, max_tokens: int = 600) -> str:
    return _call_claude(prompt, working_image, max_tokens)["content"][0]["text"]


# ─────────────────────────────────────────────────────────────────────────────
#  PROMPT BUILDERS
# ─────────────────────────────────────────────────────────────────────────────

def _language_rules(sw: bool, grade: int) -> str:
    """
    Strict language enforcement block injected into every marking prompt.
    Written in the target language so the model internalises it naturally.
    """
    if sw:
        return f"""
========================================================
SHERIA YA LUGHA — SOMA HII KWANZA KABLA YA KUFANYA CHOCHOTE
========================================================
Swali hili liko katika KISWAHILI.

SHERIA KUU: Andika maoni yako YOTE kwa Kiswahili.
Hata neno moja kwa Kiingereza HAIRUHUSIWI — katika sehemu yoyote ya JSON.

Sehemu zote lazima ziwe Kiswahili:
  feedback              -> Kiswahili
  personalized_message  -> Kiswahili
  study_tip             -> Kiswahili
  points_earned         -> Kiswahili
  points_missed         -> Kiswahili

MANENO YA SIFA SAHIHI:
  Tumia: "Hongera!", "Vizuri sana!", "Nzuri!", "Sahihi kabisa!", "Umefanya kazi nzuri!"
  USITUMIE: "Pole sana!" kwa sifa — kwa Kiswahili cha Kenya "pole" inamaanisha "sorry"

MTINDO WA MWALIMU WA KENYA:
  - Lugha rahisi ya Darasa {grade} — si tafsiri kutoka Kiingereza
  - Sentensi fupi na wazi
  - Zungumza moja kwa moja na mwanafunzi: "wewe", "jibu lako", "umefanya"
  - Tumia Kiswahili sanifu — si utohozi wa maneno ya Kiingereza
========================================================
"""
    else:
        return f"""
LANGUAGE RULE — CRITICAL:
This question is in English. Every JSON field must be in English only.
Do NOT write even one word in another language.

LANGUAGE RULES:
- Simple English that a Grade {grade} Kenyan student understands
- Use words found in Kenyan CBC textbooks
- Short sentences — maximum 3 per section
- Talk directly to the student: "you", "your"
- Kind, encouraging Kenyan teacher tone
- Never use: demonstrate, indicate, facilitate, enumerate, elaborate,
  subsequently, primarily, comprise, constitute, moreover, furthermore, utilize
"""


def _build_marking_prompt(question, student_answer: str, sw: bool) -> str:
    """
    Builds the full marking prompt for MCQ, structured, and essay questions.
    Every section is written in the target language to prevent language drift.
    """
    grade       = getattr(getattr(question, "topic", None), "grade", 7)
    has_passage = hasattr(question, "passage") and question.passage is not None

    prompt = (
        f"Wewe ni mwalimu wa CBC Kenya anayerekebisha jibu la mwanafunzi wa Darasa {grade}.\n"
        if sw else
        f"You are a Kenyan CBC teacher marking a Grade {grade} student's answer.\n"
    )
    prompt += _language_rules(sw, grade)

    # ── Marking rules ────────────────────────────────────────────────────────
    if sw:
        prompt += """
SHERIA ZA KUREKEBISHA:
1. Toa alama kwa ufahamu wa kweli — maneno sahihi kabisa si lazima
2. Alama zote tu wakati mawazo yote muhimu yako wazi
3. Alama za sehemu kwa majibu ya sehemu — nambari kamili tu, si desimali
4. Kubali jibu lolote sahihi hata kama limeandikwa tofauti
5. Kosa la tahajia ni sawa isipokuwa libadilishe maana
6. Usizidi alama za juu za swali
7. Taarifa zisizo sahihi zinapunguza alama
8. MUHIMU: Kama unasema jibu la mwanafunzi ni sahihi, LAZIMA utoe alama zote
9. MUHIMU SANA: Majibu sahihi na mpango wa alama vimetolewa na MWALIMU.
   LAZIMA ufuate majibu ya mwalimu — usitumie maarifa yako mwenyewe kuyabatilisha.
   Kama mwalimu amesema jibu ni X, basi X ndiyo sahihi — bila shaka yoyote.
10. MARUFUKU: Usitoe maelezo ya ziada ambayo hayapo katika mpango wa alama.
    Usifafanue maana ya maneno au dhana ambazo mwalimu hakuuliza.
    Jibu tu swali lililoulizwa — si zaidi ya hapo.
    Mwanafunzi hajaulizwa kujua maana ya "vibonzo" au maneno mengine —
    kama mwalimu hakuweka maelezo, wewe pia usiyatoe.
11. MUHIMU SANA: Maelezo yaliyotolewa na mwalimu ni ya kuthibitisha jibu TU.
    USIYAPANUE. USIYAFAFANUE. USIYONGEZE CHOCHOTE.
    Andika tu kile mwalimu alichosema — neno kwa neno ikiwa lazima.
    Kuongeza maelezo yako mwenyewe ni KOSA KUBWA.

MAELEKEZO YA MAONI:
- Andika sentensi 4-6 za maoni maalum kwa Kiswahili
- Kwanza: taja hasa nini mwanafunzi alipata SAHIHI na kwa nini
- Kisha: kwa kila pointi iliyokosekana, toa JIBU SAHIHI halisi
- Mwanafunzi lazima aende akijua jibu zima sahihi lilikuwa nini
- Mtindo wa mwalimu mpole — wa moja kwa moja na wa kielimu
"""
    else:
        prompt += """
MARKING RULES:
1. Award marks for real understanding — exact wording is not required
2. Full marks only when all key ideas are clearly present
3. Partial marks for partial answers — integers only, no decimals
4. Accept any factually correct answer even if worded differently
5. Spelling mistakes are fine unless they change the meaning
6. Never go above the question's maximum marks
7. Wrong or irrelevant information reduces marks
8. CRITICAL: If you say the student's answer matches the correct answer,
   you MUST award full marks — never award 0 and say the answer was correct
9. CRITICAL: The correct answer and marking scheme are SET BY THE TEACHER.
   You MUST follow them exactly — do NOT use your own knowledge to override them.
   If the teacher says the answer is X, then X is correct — full stop.
10. FORBIDDEN: Do not add unsolicited explanations of words or concepts
    not in the marking scheme. Only address what the question asked.
    If the teacher did not provide an explanation, do not invent one.
11. CRITICAL: The explanation provided by the teacher is ONLY to confirm the answer.
    Do NOT expand it. Do NOT paraphrase it. Do NOT add to it.
    Use only what the teacher wrote — nothing more.


FEEDBACK INSTRUCTIONS:
- Write 4-6 sentences of specific, educational feedback
- First: acknowledge exactly what the student got RIGHT and why it earned marks
- Then: for each wrong or missing point, give the ACTUAL correct answer
- The student must walk away knowing exactly what the full correct answer looks like
- Warm teacher tone — direct and educational
"""

    # ── MCQ-specific rules ───────────────────────────────────────────────────
    if question.question_type == "mcq":
        if sw:
            prompt += """
SHERIA ZA MCQ:
- Chaguo sahihi -> alama zote
- Chaguo baya -> alama 0 (hakuna alama za sehemu kwa MCQ)

MUUNDO WA MAONI KWA MCQ:
- Anza na "Sawa kabisa! ..." au "Jibu si sahihi. Jibu sahihi ni ..."
- Kwa sentensi 1-2 eleza KWA NINI jibu hilo ni sahihi kwa maneno rahisi
- Malizia na kidokezo kimoja kifupi cha "Kumbuka:" kusaidia mwanafunzi kukumbuka dhana
- Jumla: sentensi 5 za juu
"""
        else:
            prompt += """
MCQ RULES:
- Correct option chosen -> full marks
- Wrong option -> 0 marks (no partial marks for MCQs)

FEEDBACK FORMAT FOR MCQ:
- Start with "Correct! ..." or "Not quite. The right answer is ..."
- In 1-2 sentences explain WHY that answer is correct using simple words
- End with one short "Remember:" tip to help them recall the concept
- Total: maximum 5 sentences
"""

    # ── Passage / comprehension rules ────────────────────────────────────────
    # ── Passage / comprehension rules ────────────────────────────────────────
    if has_passage:
        if sw:
            prompt += f"""
    SHERIA ZA UFAHAMU — MUHIMU SANA:
    Maswali haya yanatoka kwenye KIFUNGU kilichotolewa hapa chini.
    JIBU KUTOKA KWENYE KIFUNGU TU — usitumie maarifa yako ya nje kabisa.
    Hata kama unajua jibu kutoka elimu yako, USILITUMIE — jibu lazima litoke kwenye kifungu.

    Katika maoni yako:
    - Sema wapi kifungu kinasema jibu: "Kifungu kinasema..." au "Katika aya ya..."
    - USIANDIKE maarifa ya jumla ambayo hayamo kwenye kifungu
    - Maoni: sentensi 2 TU

    --- KIFUNGU ---
    {question.passage.content}
    --- MWISHO WA KIFUNGU ---
    """
        else:
            prompt += f"""
    COMPREHENSION RULES — CRITICAL:
    These questions are based on the passage provided below.
    You MUST answer using ONLY what is written in the passage.
    Do NOT use outside knowledge — even if you know the answer from general knowledge,
    your feedback must cite the passage, not your own knowledge.

    In your feedback:
    - Quote or reference the exact part of the passage that contains the answer
    - Say "The passage states..." or "According to the passage in paragraph..."  
    - Do NOT give general explanations about the topic
    - Feedback: maximum 2 sentences, both referencing the passage

    --- PASSAGE ---
    {question.passage.content}
    --- END PASSAGE ---
    """

    # ── Question text ─────────────────────────────────────────────────────────
    q_text = question.question_text
    if question.question_type == "mcq":
        q_text += (
            f"\n\nOPTIONS:\n"
            f"A: {question.option_a}\n"
            f"B: {question.option_b}\n"
            f"C: {question.option_c}\n"
            f"D: {question.option_d}"
        )
    prompt += f"\n\nQUESTION:\n{q_text}"

    # ── Student answer ────────────────────────────────────────────────────────
    s_ans = str(student_answer).strip()
    if question.question_type == "mcq":
        options_map = {
            "A": question.option_a, "B": question.option_b,
            "C": question.option_c, "D": question.option_d,
        }
        letter = s_ans.upper()
        if letter in options_map:
            s_ans = f"Option {letter}: {options_map[letter]}"
    prompt += f"\n\nSTUDENT ANSWER:\n{s_ans}"

    # ── Correct answer / marking scheme ──────────────────────────────────────
    if question.question_type == "mcq":
        correct_letter = str(question.correct_answer).strip().upper()
        options_map = {
            "A": question.option_a, "B": question.option_b,
            "C": question.option_c, "D": question.option_d,
        }
        correct_text = options_map.get(correct_letter, "")
        prompt += f"\n\nCORRECT ANSWER:\nOption {correct_letter}: {correct_text}"
        if getattr(question, "explanation", None):
            prompt += f"\nEXPLANATION (use this ONLY to confirm — do NOT expand or add to it): {question.explanation}"
    else:
        # Non-MCQ: always include marking scheme or expected answer
        if getattr(question, "marking_scheme", None):
            points_text = "\n".join(
                f"- {p['description']} ({p['marks']} marks)"
                for p in question.marking_scheme.get("points", [])
            )
            prompt += f"\n\nMARKING SCHEME (USE THIS ONLY — DO NOT USE YOUR OWN JUDGMENT):\n{points_text}"
        else:
            prompt += f"\n\nEXPECTED ANSWER / KEY POINTS (USE THIS ONLY — DO NOT USE YOUR OWN JUDGMENT):\n{question.correct_answer}"
        if getattr(question, "explanation", None):
            prompt += f"\nEXPLANATION (use this ONLY to confirm — do NOT expand or add to it): {question.explanation}"
    # ── JSON output template — written in target language ─────────────────────
    max_marks = question.max_marks

    if sw:
        if has_passage:
            study_tip_instruction = (
                "Elekeza aya maalum au mstari katika kifungu ambapo jibu linapatikana. "
                "USIRUDIE maoni."
            )
        else:
            study_tip_instruction = (
                "Andika kidokezo kimoja kipya ambacho hakiko katika maoni — "
                "mbinu rahisi ya kukumbuka au kidokezo cha mtihani kwa Kiswahili. "
                "Ikiwa huna uhakika, acha tupu."
            )

        prompt += f"""

ALAMA ZA JUU: {max_marks}

Rudisha JSON sahihi TU — hakuna maandishi kabla au baada yake:
{{
  "marks_awarded": <nambari kamili kati ya 0 na {max_marks}>,
  "feedback": "<Sentensi 4-6 KWA KISWAHILI: kwanza nini mwanafunzi alipata sahihi, kisha kwa kila pointi iliyokosekana toa jibu sahihi halisi, hatimaye jibu zima sahihi. Mtindo wa mwalimu mpole.>",
  "personalized_message": "<sentensi moja fupi ya kuhamasisha KWA KISWAHILI>",
  "study_tip": "<{study_tip_instruction}>",
  "points_earned": ["<pointi sahihi kwa Kiswahili>"],
  "points_missed": ["<pointi zilizokosekana kwa Kiswahili>"]
}}

UKAGUZI WA MWISHO — kabla ya kutuma, jibu maswali haya:
- Je, feedback iko katika Kiswahili?
- Je, personalized_message iko katika Kiswahili?
- Je, study_tip iko katika Kiswahili?
- Je, points_earned na points_missed viko katika Kiswahili?
Kama jibu lolote ni HAPANA — rejesha na uandike Kiswahili."""

    else:
        if has_passage:
            study_tip_instruction = (
                "Point to the specific paragraph or line in the passage where the answer is found. "
                "Do NOT repeat the feedback."
            )
        else:
            study_tip_instruction = (
                "One NEW helpful tip not already in the feedback — "
                "a memory trick, related idea, or exam tip. "
                "Only include if you are 100% sure it is factually correct. "
                "If not sure, leave as empty string."

            )

        prompt += f"""

MAX MARKS: {max_marks}

Return ONLY valid JSON — no text before or after:
{{
  "marks_awarded": <integer between 0 and {max_marks}>,
  "feedback": "<4-6 sentences: (1) what student got right and why, (2) for each missing point give the ACTUAL correct answer, (3) full correct answer so student knows what to write. Warm but direct.>",
  "personalized_message": "<one short encouraging sentence directed at the student>",
  "study_tip": "<{study_tip_instruction}>",
  "points_earned": ["<what student got right in simple words>"],
  "points_missed": ["<what student missed in simple words>"]
}}"""

    return prompt


def _build_fill_blank_ai_prompt(question, student_answer: str,
                                correct_answer: str, sw: bool) -> str:
    """
    Prompt asking Claude to semantically verify a fill-blank answer.
    Language-aware so the model is not confused by Kiswahili content.
    Returns TRUE/FALSE (English) or KWELI/UONGO (Kiswahili).
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
    else:
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


def _build_math_solution_prompt(question, student_answer: str,
                                correct_answer: str, grade: int) -> str:
    return f"""You are a Kenyan CBC Grade {grade} maths teacher helping a student who got a question WRONG.

QUESTION: {question.question_text}
STUDENT ANSWER: {student_answer}
CORRECT ANSWER: {correct_answer}

Write a step-by-step solution in simple words a Grade {grade} student can follow.
- Number each step: Step 1, Step 2, etc.
- Show the working clearly and arrange calculations vertically
- At the end, in one short sentence say what mistake the student likely made
- Keep it under 150 words total
- Write like you are talking to a child who is struggling with Maths
- NO markdown, NO code blocks, NO headings, NO asterisks
- Use LaTeX for ALL numbers and calculations:
  inline -> $...$ | display -> $$...$$
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
    Falls back to full AI grader if no correct answer is set.
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
            prompt     = _build_fill_blank_ai_prompt(question, student_raw, raw_correct, sw)
            verdict    = _claude_text(prompt).strip().upper()
            # Accept both English (TRUE) and Kiswahili (KWELI) verdicts
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

    # Fast numeric check (only when correct answer is purely numeric)
    if not re.search(r"[a-zA-Z]", correct_str):
        try:
            if abs(float(_clean_num(student_str)) - float(_clean_num(correct_str))) < 0.01:
                return _on_correct(float(_clean_num(student_str)))
        except ValueError:
            pass

    # Symbolic / approximate check
    try:
        s_expr = _parse_math_expr(student_str)
        c_expr = _parse_math_expr(correct_str)
        if s_expr is not None and c_expr is not None:
            if simplify(s_expr - c_expr) == 0:
                return _on_correct(str(s_expr))
            if abs(N(s_expr) - N(c_expr)) < 0.01:
                return _on_correct(f"approx {N(s_expr):g}")
    except Exception:
        pass
    try:
        sem_prompt = _build_fill_blank_ai_prompt(question, student_str, correct_str, sw)
        verdict = _claude_text(sem_prompt).strip().upper()
        if verdict in ("TRUE", "KWELI"):
            return _on_correct(student_str)
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
        "points_missed":        [
            f"Jibu sahihi: {correct_str}" if sw else f"Correct answer: {correct_str}"
        ],
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

    sw = _is_kiswahili(question)
    qt = question.question_type
    max_tokens = {"mcq": 400, "structured": 800, "essay": 1000}.get(qt, 600)

    try:
        prompt   = _build_marking_prompt(question, student_answer, sw)
        raw_text = _claude_text(prompt, working_image, max_tokens)
        result   = _parse_json_response(raw_text)
        marks    = min(int(result.get("marks_awarded", 0)), question.max_marks)

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
        print(f"AI Grading Error (Q{getattr(question, 'id', '?')}): {e}")
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
        sw = _is_kiswahili(question)
        return _empty_result(
            question.max_marks,
            f"Aina ya swali haijulikani: {qt}" if sw else f"Unsupported question type: {qt}",
            _near_miss(sw),
        )


# ─────────────────────────────────────────────────────────────────────────────
#  MULTI-PART HELPER
# ─────────────────────────────────────────────────────────────────────────────

class _PartProxy:
    """Wraps a QuestionPart ORM object so graders can treat it like a Question."""

    def __init__(self, part):
        parent = part.parent_question
        self.id              = part.id
        self.question_text   = f"({part.part_label}) {part.question_text}"
        self.question_type   = part.question_type
        self.correct_answer  = part.correct_answer
        self.max_marks       = part.max_marks
        self.marking_scheme  = part.marking_scheme
        self.explanation     = part.explanation
        self.option_a        = part.option_a
        self.option_b        = part.option_b
        self.option_c        = part.option_c
        self.option_d        = part.option_d
        self.topic           = parent.topic   # ← already there, subject comes through here
        self.passage         = parent.passage  # ← FIX: inherit passage from parent question
        self.worked_solution = None


def _grade_multipart(question, student_answer,
                     working_image: str | None = None) -> dict:
    """Grade a question that has sub-parts, aggregating all results."""
    parts        = list(question.parts.all())
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

    sw = _is_kiswahili(question)

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
    Grade any question — handles both single and multi-part questions.

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