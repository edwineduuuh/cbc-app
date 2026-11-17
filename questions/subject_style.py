"""What a good paper looks like, per learning area.

One prompt was writing every subject. The same instructions produced a
Kiswahili paper, a CRE paper, an Agriculture paper and a Mathematics paper,
so they all came out in the same shape - a context sentence, a command verb,
four options - whatever the subject actually assesses in a Kenyan classroom.
That is why papers read as generic across the board, not only in the ones
that got complained about.

This module says, for each learning area, what its questions are made of and
what a learner is actually asked to do. It is matched on the subject name, so
a learning area with no entry simply gets the general rules and is no worse
off than before.

Nothing here is model output. It is the shape of the paper, written down.
"""
from __future__ import annotations

import re

# ── per-family guidance ───────────────────────────────────────────────────
MATHS = """This is a Mathematics paper. MATHEMATICS IS WORKING OUT.

- EVERY question requires a learner to compute something. The command verbs \
are Solve, Find, Calculate, Determine, Evaluate, Simplify, Express, Factorise, \
Work out, Show that, and Hence. A learner answers with working and a result, \
not with sentences.
- DO NOT write questions that ask a learner to explain, describe, discuss, \
justify, comment on, state the importance of, or say what something "tells \
us" or "means in this situation". DO NOT show a learner's wrong working and \
ask them to find the mistake. Those belong in other subjects. A maths \
question that can be answered in prose without calculating is not a maths \
question.
- Marks are method marks. The marking scheme must award the steps - the \
equation formed, the substitution, the manipulation, the final answer - so a \
learner who slips in arithmetic still earns most of the marks. Write it the \
way a Kenyan marking scheme is written: M1 for the method, A1 for the \
accurate answer, B1 for an independent correct statement.
- Parts build on each other. Part (b) normally starts "Hence" and uses the \
result of part (a), which is how a Kenyan paper is set.
- State units in the answer wherever the quantity has them, and write money \
as KES.
- Where a figure carries the mathematics - a graph, a number line, a figure \
with measurements, a data table - give it as a "plot" so it is drawn \
exactly."""

SCIENCE = """This is a science paper.
- Assess scientific thinking, not vocabulary recall: predict what will \
happen and say why, explain an observation, identify the variable that must \
be kept constant, say what a result shows, suggest how to improve an \
investigation, read and interpret a table of results.
- Where a question gives an investigation, state the apparatus plainly and \
keep it to what a Kenyan school laboratory or classroom actually has.
- A marking scheme must accept the several correct wordings a learner may \
use for the same scientific idea.
- Use a "plot" for anything with values on it - a bar chart of results, a \
line graph, a data table. Use a "diagram" only for a picture of apparatus or \
a structure."""

LANGUAGE_EN = """This is an English paper.
- Assess language in use, not definitions. Use the forms a Kenyan English \
paper uses: a short passage followed by comprehension questions, a cloze \
passage, sentence transformation, correcting errors in a given sentence, \
punctuating a sentence, choosing the right register for a stated audience, \
and a guided composition prompt.
- Where a question needs a passage, write the passage into question_text, \
keep it to a length a learner of this grade reads comfortably, and set it in \
a Kenyan context.
- Grammar questions must put the grammar inside a real sentence, never ask \
for the name of a part of speech on its own.
- A composition or guided writing question is marked on stated criteria: \
content, language accuracy and presentation, with the marks shown."""

LANGUAGE_SW = """Hii ni karatasi ya Kiswahili. Andika kila kitu kwa \
Kiswahili - maswali, maelekezo, na mwongozo wa kusahihisha.
- Pima matumizi ya lugha, si ufafanuzi wa istilahi. Tumia maumbo ya karatasi \
ya Kiswahili: kifungu cha ufahamu na maswali yake, ufupisho, sarufi ndani ya \
sentensi kamili, matumizi ya lugha, methali na misemo katika muktadha, na \
kichocheo cha insha.
- Kifungu cha ufahamu kiandikwe ndani ya question_text, kiwe na urefu \
unaofaa darasa hili, na kiwe na muktadha wa Kikenya.
- Maswali ya sarufi yawe ndani ya sentensi halisi, si kutaja jina la aina ya \
neno peke yake.
- Mwongozo wa kusahihisha ukubali majibu mbadala yanayokubalika."""

RELIGIOUS = """This is a religious education paper.
- Where a teaching is assessed, anchor it: name the passage or source the \
teaching comes from, and ask what it teaches rather than who said it.
- Most marks go to application - what a learner should do in a named \
situation they would actually meet at school, at home or in their community, \
and why the teaching leads to that.
- A marking scheme must accept any answer that is faithful to the teaching, \
since learners will word values differently.
- Do not set questions that ask a learner to judge another faith."""

SOCIAL = """This is a Social Studies paper.
- Use the forms this subject is assessed in: reading a map or a sketch map, \
interpreting a simple source or statement, placing events in order on a \
timeline, comparing two places or two periods, and explaining a cause and \
its effect.
- Ask why and what followed, not only what and when. A date on its own is \
not an outcome.
- Use real Kenyan places, features and institutions, and keep them accurate.
- Use a "plot" for population or production figures; a "diagram" for a \
sketch map or a physical feature."""

PRACTICAL = """This is a practical learning area.
- Assess doing, judging and safety, not naming. Ask which tool or material \
fits a stated job and why, the correct order of steps in a procedure, what \
has gone wrong when a result is poor, how to work safely, how to cost a job \
at Kenyan prices, and how to care for tools or materials afterwards.
- Set every question in work a learner of this grade would really carry out \
with what a Kenyan school or home has.
- A marking scheme must accept any method that is safe and achieves the \
result."""

CREATIVE = """This is a creative arts paper.
- Assess making and judging, not terminology. Ask a learner to plan a piece \
for a stated purpose and audience, choose materials or instruments and \
justify the choice, describe how an effect is produced, improve a described \
piece, or judge a performance against stated criteria.
- Where a question is about a performance or a finished piece, give the \
criteria it is judged on, so the marking scheme can follow them."""

PE_HEALTH = """This is a physical and health education paper.
- Assess judgement in activity and health, not definitions. Ask what a \
learner should do in a described situation during play, how to warm up for a \
named activity and why, what a rule is for, how to respond to an injury, and \
how a habit affects health over time.
- Keep the situations to games, spaces and equipment a Kenyan school has."""

LIFE_SKILLS = """This is a life skills paper.
- Every question is a situation a learner of this grade would really face, \
and asks what they should do and why.
- A marking scheme must accept any answer that is safe, respectful and \
reasoned, since there is rarely one correct action."""

COMPUTING = """This is a computing paper.
- Assess what a learner does with the tool: what a given sequence of \
instructions produces, which step is missing, what to change to get a stated \
result, why a program behaves wrongly, how to test it, and how to organise \
or keep data safe.
- Never write a question that only requires arithmetic or recall with \
computing words placed around it. If removing the computing vocabulary \
leaves the same question, it is not a computing question.
- Keep to software and devices a Kenyan school actually has."""


# Order matters: the first pattern that matches the subject name wins.
_RULES = [
    (r"kiswahili|fasihi|lugha", LANGUAGE_SW),
    (r"\benglish\b|literature", LANGUAGE_EN),
    (r"indigenous\s+language|sign\s+language|arabic|french|german|mandarin",
     LANGUAGE_EN),
    (r"mathematic|maths", MATHS),
    (r"computer|computing|ict|coding", COMPUTING),
    (r"science|biology|chemistry|physics", SCIENCE),
    (r"religious|christian|islamic|hindu|\bcre\b|\bire\b|\bhre\b", RELIGIOUS),
    (r"social\s+studies|history|geography|citizenship", SOCIAL),
    (r"agricultur|home\s*science|pre-?\s*technical|pre-?\s*career|business|"
     r"technical|nutrition", PRACTICAL),
    (r"creative|art|music|performing|design", CREATIVE),
    (r"physical|health\s+education|sports", PE_HEALTH),
    (r"life\s+skills|psychosocial", LIFE_SKILLS),
]


def style_for(subject_name: str) -> str:
    """The paper guidance for this learning area, or '' if we have none."""
    name = (subject_name or "").strip().lower()
    if not name:
        return ""
    for pattern, text in _RULES:
        if re.search(pattern, name):
            return text
    return ""


# ── what "harder than recall" means, per subject ──────────────────────────
# A generic "go deeper than recall" rule turned Mathematics into prose:
# explain what the gradient tells you, spot the learner's error. In a Kenyan
# maths paper depth is a longer calculation, not a longer sentence.
_DEPTH_MATHS = (
    "must take more than one step of working: a result carried forward into "
    "the next part with \"Hence\", a quantity found by working backwards "
    "from a given answer, two conditions combined, a value substituted into "
    "a relationship the learner first had to form, or a \"Show that\" "
    "leading to a stated result. Depth here is a longer calculation, NEVER a "
    "written explanation.")

_DEPTH_GENERAL = (
    "must demand more than recall or one-step substitution: interpreting a "
    "result in its situation, applying an idea to a new case, comparing two "
    "options with a reason, working out what follows from given information, "
    "or judging whether a claim is reasonable.")


def depth_for(subject_name: str) -> str:
    style = style_for(subject_name)
    return _DEPTH_MATHS if style is MATHS else _DEPTH_GENERAL


# ── language pitched at the grade ─────────────────────────────────────────
_READING = {
    4: "Sentences of about 12 words. Everyday words only. One instruction "
       "per question.",
    5: "Sentences of about 14 words. Everyday words, with subject terms the "
       "design introduces.",
    6: "Sentences of about 16 words. Subject terms from the design are "
       "expected.",
    7: "Sentences of about 18 words. Subject terms used normally.",
    8: "Sentences of about 20 words. Subject terms used normally.",
    9: "Normal secondary-level phrasing, still plain.",
    10: "Normal secondary-level phrasing, still plain.",
}


def reading_level(grade) -> str:
    try:
        g = int(grade)
    except (TypeError, ValueError):
        return ""
    text = _READING.get(g)
    if not text:
        return ""
    return (f"LANGUAGE LEVEL FOR GRADE {g}: {text} A question a learner "
            f"cannot read is a reading test, not an assessment of this "
            f"design.")
