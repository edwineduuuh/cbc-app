"""
ai_service.py
All Anthropic API calls go through this file.
Set ANTHROPIC_API_KEY in your .env / Django settings.
"""
import json
import anthropic
from django.conf import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
MODEL  = "claude-opus-4-6"   # swap to claude-haiku-4-5-20251001 for cheaper/faster


# ─────────────────────────────────────────────────────────────
#  LESSON PLAN GENERATION
# ─────────────────────────────────────────────────────────────

LESSON_SYSTEM = """You are an expert Kenyan CBC curriculum specialist and experienced teacher trainer.
You write lesson plans that fully comply with TSC (Teachers Service Commission) requirements.
Always respond with valid JSON only — no markdown fences, no commentary outside the JSON."""

def generate_lesson_plan(data: dict) -> dict:
    """
    data keys: grade, subject, term, week, lesson_number, topic, subtopic,
               duration, learner_level, prior_knowledge, resources,
               is_practical, practical_area
    Returns the full lesson plan as a dict.
    """
    prompt = f"""Generate a complete, detailed CBC Kenya lesson plan for:

Grade: {data['grade']}
Subject: {data['subject']}
Term: {data['term']}  |  Week: {data['week']}  |  Lesson: {data['lesson_number']}
Topic: {data['topic']}
Sub-topic: {data.get('subtopic') or 'General'}
Duration: {data['duration']}
Learner Level: {data['learner_level']}
Prior Knowledge: {data.get('prior_knowledge') or 'Basic concepts'}
Available Resources: {data.get('resources') or 'Textbook, chalkboard, charts'}
Practical Lesson: {data.get('is_practical', False)}
Practical/Project Area: {data.get('practical_area') or 'N/A'}

Return ONLY a JSON object with EXACTLY these keys:

{{
  "strand": "string",
  "substrand": "string",
  "specific_learning_outcomes": ["SLO 1...", "SLO 2...", "SLO 3..."],
  "key_inquiry_questions": ["Question 1?", "Question 2?"],
  "core_competencies": ["Communication", "Critical Thinking", ...],
  "values": ["Respect", "Responsibility", ...],
  "pertinent_issues": ["Health", "Environmental awareness", ...],
  "learning_resources": ["Textbook pg X", "Chart on ...", "Specimen of ..."],
  "introduction": {{
    "duration": "5 minutes",
    "teacher_activity": "Detailed description of what teacher does",
    "learner_activity": "Detailed description of what learners do",
    "activities": ["Activity 1", "Activity 2"]
  }},
  "lesson_development": [
    {{
      "step": 1,
      "title": "Step title",
      "duration": "10 minutes",
      "teacher_activity": "Detailed teacher actions",
      "learner_activity": "Detailed learner actions",
      "assessment": "How to assess at this step"
    }}
  ],
  "conclusion": {{
    "duration": "5 minutes",
    "activities": ["Summary activity", "Recap questions"],
    "home_activity": "Homework or home-based activity"
  }},
  "assessment": {{
    "formative": "Description of ongoing assessment",
    "questions": ["Q1?", "Q2?", "Q3?"]
  }},
  "extended_activity": "Challenge activity for gifted/fast learners",
  "support_activity": "Remedial activity for learners who need support",
  "practical_project": {"string describing the practical project with materials, steps, expected outcome" if data.get('is_practical') else "null"},
  "teacher_notes": "Important pedagogical notes, common misconceptions to address",
  "scheme_entry": {{
    "wk": "{data['week']}",
    "lsn": "{data['lesson_number']}",
    "strand": "string",
    "substrand": "string",
    "specific_outcomes": "Condensed SLOs as one sentence",
    "key_questions": "Condensed inquiry questions",
    "learning_experiences": "Summary of main activities",
    "learning_resources": "Comma-separated resources",
    "assessment": "Formative assessment method",
    "reflection": ""
  }},
  "youtube_links": [
    {{
      "title": "Descriptive video title relevant to topic",
      "url": "https://www.youtube.com/watch?v=REAL_VIDEO_ID",
      "description": "Why this video is useful for this lesson"
    }}
  ],
  "diagrams": [
    {{
      "title": "Diagram title",
      "type": "labeled_diagram | flowchart | table | cycle | bar_chart",
      "description": "Detailed description of what to draw — include labels, arrows, components",
      "caption": "Caption to write under diagram in student notes"
    }}
  ],
  "student_notes": {{
    "heading": "Topic heading for student notes",
    "body": "Full student notes content with key facts, definitions, examples. Write 3-5 paragraphs.",
    "key_terms": [{{"term":"word","definition":"meaning"}}],
    "summary_points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"]
  }}
}}"""

    message = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=LESSON_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    # Strip markdown fences if model adds them anyway
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    return json.loads(raw)


# ─────────────────────────────────────────────────────────────
#  AI MARKING — OPEN-ENDED ANSWERS
# ─────────────────────────────────────────────────────────────

MARKING_SYSTEM = """You are a fair and encouraging Kenyan CBC teacher marking student answers.
Be strict about correctness but warm and constructive in feedback.
Always respond with valid JSON only."""

def mark_open_answer(question_text: str, student_answer: str, subject: str,
                     grade: str, max_points: int, student_name: str) -> dict:
    """
    Returns: { "score": int, "is_correct": bool, "feedback": str, "model_answer": str }
    """
    prompt = f"""You are marking a {grade} {subject} answer.

Question: {question_text}
Maximum Points: {max_points}
Student Name: {student_name}
Student's Answer: {student_answer}

Evaluate the answer and return JSON:
{{
  "score": <integer 0 to {max_points}>,
  "is_correct": <true if score >= 60% of max_points, else false>,
  "feedback": "<personalized, encouraging feedback addressing {student_name} by name. Point out what was correct, what was missing, and give a specific tip to improve. 2-4 sentences.>",
  "model_answer": "<ideal answer a top student would give>"
}}"""

    message = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=MARKING_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    return json.loads(raw)


# ─────────────────────────────────────────────────────────────
#  INDIVIDUALIZED STUDENT REPORT SUMMARY
# ─────────────────────────────────────────────────────────────

REPORT_SYSTEM = """You are an experienced Kenyan CBC teacher writing end-of-quiz report summaries.
Write with warmth, specificity, and actionable advice. JSON only."""

def generate_student_report(student_name: str, subject: str, grade: str,
                             score: int, total: int, wrong_questions: list) -> dict:
    """
    Returns: { "summary": str, "strengths": [str], "areas_for_improvement": [str], "recommendation": str }
    """
    pct = round((score / total) * 100) if total > 0 else 0
    wrong_text = "\n".join(f"- {q}" for q in wrong_questions) if wrong_questions else "None"

    prompt = f"""Write a report summary for a {grade} {subject} quiz.

Student: {student_name}
Score: {score}/{total} ({pct}%)
Questions answered incorrectly:
{wrong_text}

Return JSON:
{{
  "summary": "<2-3 sentence overall performance summary, addressing {student_name} by name>",
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "areas_for_improvement": ["<specific weakness 1>", "<specific weakness 2>"],
  "recommendation": "<one specific, actionable recommendation for the teacher or parent>"
}}"""

    message = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=REPORT_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    return json.loads(raw)