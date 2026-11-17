"""The shape of a real KNEC paper, read off real KNEC papers.

Taken from KJSEA 2026 (Grade 9) and KPSEA 2026 (Grade 6) papers and from the
Signal Sparks prediction sets that follow the same format. Before this, a
generated paper was a flat list of ten questions with no sections, no mark
weighting and no performance bands, which is not what a Kenyan paper looks
like however good the individual questions are.

What the real papers do that we did not:

* Two sections at Grade 7-9. Section A is multiple-choice at one mark each;
  Section B is structured and carries most of the marks. Grade 4-6 is a
  single multiple-choice paper.
* A strand allocation table on the cover saying which questions test which
  strand and what each is worth - "Numbers, questions 1-7, 7 marks".
* The CBC performance bands printed with the paper: Exceeds, Meets,
  Approaches and Below Expectations, each split in two with its points.
* Marks in brackets at the right of every question and every part.
* A working space column.

The style notes are the ones that actually differ from what we produced,
checked question by question against the real papers.
"""
from __future__ import annotations

# ── paper blueprints ──────────────────────────────────────────────────────
# (section name, question type, count, marks each) built from the real
# papers; scaled when a facilitator asks for fewer questions than a national
# paper carries.
JUNIOR_SCHOOL = {           # Grades 7-9, KJSEA shape
    "sections": [
        {"name": "SECTION A", "type": "mcq", "count": 20, "marks": 1,
         "instruction": "Answer ALL the questions in this section. For each "
                        "question, four answers are given. Choose the correct "
                        "answer."},
        {"name": "SECTION B", "type": "structured", "count": 20, "marks": 4,
         "instruction": "Answer ALL the questions in this section in the "
                        "spaces provided."},
    ],
}

# Grade 10, read off the real KNEC School Based Assessment papers of October
# 2026 - CRE, Biology, Physics, Chemistry, Computer Studies, Business
# Studies, History and Citizenship, Agriculture, Home Science, Geography,
# Essential Mathematics, Music and Dance, HRE.
#
# Senior School is assessed by SBA, not by KCSE. Every one of those papers
# opens with a multiple-choice Section A - 30 items in Biology, 20 in CRE and
# most others, 10 in Physics and Chemistry - then a structured Section B, and
# several add an essay Section C. An earlier version of this file claimed
# Senior School has no multiple-choice at all, which was borrowed from KCSE,
# a different system's examination, and was simply wrong.
SENIOR_SCHOOL = {
    "sections": [
        {"name": "SECTION A", "type": "mcq", "count": 20, "marks": 1,
         "instruction": "Answer ALL the questions in this section."},
        {"name": "SECTION B", "type": "structured", "count": 10, "marks": 5,
         "instruction": "Answer ALL the questions in this section in the "
                        "spaces provided."},
    ],
}

SENIOR_STYLE = """THIS IS A GRADE 10 SCHOOL BASED ASSESSMENT. It is written \
differently from Junior School, and the short-stem rule above does NOT apply \
to Section A here.

- A SECTION A STEM IS A SCENARIO, AND IT ADDRESSES THE LEARNER DIRECTLY. \
Real examples: "Your class prefect reported you to the teacher that he saw \
you with a mobile phone so as to cover up for his best friend who was the \
owner of the phone. This made your teacher to punish you for the entire \
week. Select the commandment that the prefect failed to observe." / "A \
learner compares two plots shown in a photo: one is gently sloping with deep \
soil, while the other is steep, rocky, and shallow. Which factor should the \
learner consider when selecting a suitable plot?" / "Engineer's club plans to \
use a waterproof camera to record videos at the bottom of a deep-water tank. \
Before lowering the camera, the learners decided to strengthen its outer \
casing. Why do you think this is necessary?" Two or three sentences of real \
situation, then the question.

- THE STEMS ASK FOR A JUDGEMENT, not a fact: "Select the most suitable \
method", "Choose the statement that best summarises", "Which action would \
give the strongest evidence", "Which of the following best explains", "Which \
management practice would most likely increase yield", "What is the most \
appropriate conclusion". The controlling word - best, most, strongest, \
correct, except - is bold.

- OPTIONS MAY BE A SET OF ROMAN-NUMERALLED STATEMENTS the learner must \
choose between: the stem lists (i) to (iv), and the options are "i, ii and \
iv only" / "ii and iii only". They may also be four named learners each \
making a statement, a two-column table to match, or a sequence to put in \
order.

- SECTION B IS "N POINTS FOR N MARKS", often five: "Suggest five possible \
measures that learners in your school can adopt to promote the daily reading \
of the Bible. (5 Marks)" / "Analyse five reasons why the learners are \
abusing those drugs. (5 Marks)". In the sciences it is instead parts (a), \
(b), (c) built on one stimulus - a figure, a data table, a described \
investigation - each part carrying its own marks.

- MARKING IS WRITTEN AS "Any 3 x 2 = 6 marks" or "Any 4 x 1 = 4 marks": the \
scheme lists more acceptable points than the learner needs, and says how \
many are required and what each is worth. In Mathematics it is M1 for the \
method, A1 for the accurate answer, B1 for an independent correct statement.

- The command verbs carry their weight: State, Name, Identify, Give, List \
and Highlight are 1 mark a point; Describe, Explain, Outline, Analyse, \
Assess and Justify are 2 marks a point; Discuss and Evaluate carry a longer \
answer."""

PRIMARY = {                 # Grades 4-6, KPSEA shape
    "sections": [
        {"name": "", "type": "mcq", "count": 30, "marks": 1,
         "instruction": "Answer ALL the questions. For each question, four "
                        "choices are given. Choose the correct answer."},
    ],
}

# Printed on the cover of every KNEC CBC paper.
PERFORMANCE_BANDS = [
    ("Exceeds Expectations", "EE1", 90, 99, 8),
    ("Exceeds Expectations", "EE2", 75, 89, 7),
    ("Meets Expectations", "ME1", 58, 74, 6),
    ("Meets Expectations", "ME2", 41, 57, 5),
    ("Approaches Expectations", "AE1", 31, 40, 4),
    ("Approaches Expectations", "AE2", 21, 30, 3),
    ("Below Expectations", "BE1", 11, 20, 2),
    ("Below Expectations", "BE2", 1, 10, 1),
]


def blueprint(grade) -> dict:
    """Primary (KPSEA), Junior School (KJSEA) or Senior School (KCSE)."""
    try:
        g = int(grade)
    except (TypeError, ValueError):
        return JUNIOR_SCHOOL
    if g <= 6:
        return PRIMARY
    return JUNIOR_SCHOOL if g <= 9 else SENIOR_SCHOOL


def scaled_sections(grade, count: int) -> list[dict]:
    """The real paper's sections, scaled to the number of questions asked for.

    A national paper is 40 questions at Grade 9 and 30 at Grade 6. A
    facilitator setting a class test wants the same shape at a smaller size,
    not a different kind of document.
    """
    b = blueprint(grade)
    secs = b["sections"]
    if len(secs) == 1:
        return [dict(secs[0], count=max(1, count))]

    if b is SENIOR_SCHOOL:
        # The real SBA papers are mostly Section A by item count, and mostly
        # Section B by marks: CRE is 20 MCQ and 6 structured, Biology 30 and
        # 12, Agriculture 20 and 5.
        n_mcq = max(1, round(count * 0.55))
    else:
        n_mcq = max(1, round(count * 0.5))
    split = (n_mcq, count - n_mcq)

    out = []
    for sec, n in zip(secs, split):
        if n > 0:
            out.append(dict(sec, count=n))
    return out


def paper_shape(grade, count: int) -> str:
    """How to divide `count` questions the way a real paper divides them."""
    b = blueprint(grade)

    if b is SENIOR_SCHOOL:
        n_mcq = max(1, round(count * 0.55))
        return (
            f"PAPER SHAPE: this is a Grade 10 SCHOOL BASED ASSESSMENT. The "
            f"real papers run SECTION A of multiple-choice at one mark each, "
            f"then SECTION B of structured questions carrying most of the "
            f"marks. Unless the teacher asked for something else, set "
            f"{n_mcq} Section A questions and {count - n_mcq} Section B "
            f"questions, with Section B questions worth 4 to 6 marks each.\n\n"
            + SENIOR_STYLE)

    if len(b["sections"]) == 1:
        return (
            f"PAPER SHAPE: at this grade the national paper (KPSEA) is a "
            f"single section of multiple-choice questions, each worth 1 mark. "
            f"Unless the teacher asked otherwise, make every question "
            f"multiple-choice and worth 1 mark.")

    # Keep the national 20:80 mark split whatever the question count.
    n_mcq = max(1, round(count * 0.5))
    n_struct = count - n_mcq
    return (
        f"PAPER SHAPE: the national paper at this grade (KJSEA) has two "
        f"sections. SECTION A is multiple-choice, one mark each. SECTION B is "
        f"structured with parts (a), (b), (c), each part carrying its own "
        f"marks, and holds most of the paper's marks. Unless the teacher "
        f"asked for something else, set {n_mcq} Section A questions and "
        f"{n_struct} Section B questions, and give the Section B questions 3 "
        f"to 5 marks each so Section B carries roughly four times the marks "
        f"of Section A.")


# ── house style, taken off the real papers ────────────────────────────────
KNEC_STYLE = """HOW A KNEC PAPER IS WRITTEN. These are taken from the real \
KJSEA and KPSEA papers and override any habit to the contrary:

- STEMS ARE SHORT. One or two sentences, rarely more than 35 words. Real \
examples: "A welder cut a piece of iron sheet to make a circular lid. The \
radius of the lid was 0.9 m." / "Salima dipped a red litmus paper in a \
baking soda solution." / "A tailor used 3 1/2 m of cloth to make a dress and \
2 3/4 m to make a shirt." Do NOT build a paragraph of scene-setting. A \
question that opens "At a produce market in Nakuru, a trader who sells..." \
is already too long.

- THE CONTEXT IS A PERSON AND A SITUATION, NOT A PLACE NAME. Real papers use \
a first name - Salima, Wandere, Chebet, Juma, Kyeni, Amina, Fatuma, Mwangi, \
Otieno, Chimano, Mwongeli - or a plain role: a welder, a tailor, a bakery, a \
carpenter, a fruit vendor, a bus company. They do NOT name a county in every \
question. Name a town only when the question is about that place.

- MULTIPLE-CHOICE STEMS use "Which of the following...?", "What is...?", \
"How many...?", "Why is...?", or a sentence the options complete: "She \
observed that the litmus paper turned" followed by options ending in full \
stops. Do NOT open every question with "Identify".

- OPTIONS ARE SHORT - a number, a phrase, a few words. They are near misses \
a learner actually reaches: for a circumference with r = 0.9 the options \
were 2.545, 2.827, 5.089 and 5.655 (radius vs diameter, area vs \
circumference). Options may be expressions rather than numbers when the \
method is what is being tested.

- MONEY is written "sh 4 800", "Sh 15 000" or "Ksh 2 500 000". NUMBERS use a \
space as the thousands separator - 7 264 518, not 7,264,518.

- MARKS are shown in brackets at the right of each question and each part: \
(1 mark), (2 marks), (3 marks). A structured question is 1 to 5 marks and \
its parts carry 1 to 3 marks each.

- Questions say "learner", "Grade 9 class", "Junior School".

- A STRUCTURED QUESTION IN THE HUMANITIES IS USUALLY "N POINTS FOR N MARKS", \
not parts (a) and (b). Real examples: "Highlight three effects this \
behaviour might have on Joy. (3 marks)" / "Outline four reasons why they \
should do so. (4 marks)" / "Describe three teachings about human beings that \
you learnt from the two chapters. (6 marks)". The number wanted is stated in \
words and set in bold, and the marks follow from it. Use this shape wherever \
the subject calls for listed points, and write the marking scheme as the \
list of acceptable points with "any three".

- THE WORD THAT CONTROLS THE ANSWER IS BOLD: three, four, best, true, \
except, not. Real stems: "Which of the following is true according to the \
passage?" / "Who among the following learners gave the best way to do so?" / \
"The following are some of the causes that were highlighted except".

- OPTIONS MAY BE PAIRS OR SETS where that is what discriminates: "Floods and \
deforestation." / "Overgrazing and mining." They may also be four named \
learners each making a statement, with the stem asking which one is right.

- Where the question is about a value, a behaviour or a choice, set it in a \
situation a learner would meet: a learner isolated because of her accent, a \
cultural week at school, a learner deciding how to nurture a talent."""


# ── a few real questions, as examples of the register ─────────────────────
# Short excerpts only, used to show the model the house style. Not reproduced
# anywhere a user can read them as content.
EXEMPLARS = {
    "maths": """Examples of the register, from real papers at this level:

- "A football official measured the diameter of a ball and found it to be
  0.2218 m. What is the radius of the ball correct to 3 significant
  figures?"  A. 0.1110  B. 0.1109  C. 0.1100  D. 0.1101
- "A basketball is in the shape of a sphere. The surface area of the ball is
  1600 cm2. Which of the following calculations gives the radius of the
  ball?"  (the options are expressions, not numbers)
- "Silas borrowed Ksh 50 000 from a bank to start a business. The bank
  charged simple interest at the rate of 15% per annum. He paid the money
  after 2 years. How much money did he pay as interest?"
- Structured: "A supermarket recorded a total of 7 264 518 customers. The
  manager later noticed that the digits 6 and 5 had been interchanged.
  (a) Write the new number formed. (1 mark) (b) By how much did the value of
  the number change? (2 marks) (c) Round the new number to 3 significant
  figures. (1 mark)"
- Structured: "At a school canteen, Juma bought 3 exercise books and 2 pens
  for a total of sh 190. On the same day, Kyeni bought 5 exercise books and
  4 pens of the same type for a total of sh 330. Find the cost of one
  exercise book and one pen. (4 marks)\"""",

    "science": """Examples of the register, from real papers at this level:

- "Salima dipped a red litmus paper in a baking soda solution. She observed
  that the litmus paper turned"  A. colourless.  B. purple.  C. red.
  D. blue.
- "Why is burning of wood a chemical change?"  A. A new substance is formed.
  B. Heat is absorbed.  C. The colour changes.  D. The reaction can be
  reversed.
- "A fire started accidentally in a room. The room occupants quickly covered
  the fire with a blanket and the flame went off. The flame went off because
  the blanket"  A. increased the temperature of the room.  B. removed fuel
  from the fire.  C. cut off the supply of oxygen.  D. absorbed all the
  smoke.
- A list of steps labelled (i) to (iv), then "Which of the following mixtures
  can be separated using these steps?\"""",
}

EXEMPLARS["humanities"] = """Examples of the register, from real papers at \
this level:

- "Kapsabet town used to have a small population. As time went by, the
  population grew tremendously due to rural-urban migration. Which of the
  following pairs of problems faced by the town are likely to have been
  caused by the rural-urban migration?"  A. Poor health services and poor
  road network.  B. High enrolment in schools and poor road network.
  C. Inadequate housing and strained health facilities.  D. Poor road
  network and inadequate housing.
- "Learners researched on the causes of earth movement and presented their
  findings in class. The following are some of the causes that were
  highlighted except"  A. gravitational force  B. conventional currents
  C. centrifugal forces  D. magma movements
- Structured: "Joy, a Grade 7 learner, joined a new school but was isolated
  by other learners because of her background and accent. Highlight three
  effects that this behaviour might have on Joy. (3 marks)"
- Structured: "During a cultural week, learners from Ubora Junior School
  showcased aspects of cultural diversity in the local community. Identify
  three elements of cultural diversity they are likely to have presented.
  (3 marks)\""""

EXEMPLARS["religious"] = """Examples of the register, from real papers at \
this level:

- "During a CRE lesson, Grade 8 learners discussed the different ways to
  nurture their God given talents. Who among the following learners gave the
  best way to do so?"  A. Pendo - I associate with people who have the same
  talent.  B. Baraka - I tell people about the talent I have.  C. Neema - I
  read books about my talent.  D. Zuri - I keep practising my talent.
- Structured: "(a) You were tasked to read and analyse the accounts of
  creation in Genesis 1 and 2. Describe three teachings about human beings
  that you learnt from the two chapters. (6 marks)"
- Structured: "(b) Christians in Kenya are expected to take care of the
  environment. Outline four reasons why they should do so. (4 marks)"

Note the shape: a named passage or source, then a stated number of points,
with the marks following from the number - three points at 2 marks, four
points at 1 mark."""

EXEMPLARS["language"] = """Examples of the register, from real papers at \
this level:

- A passage of about 200 words on a practical everyday topic, followed by
  six questions on it. Real stems from one such set:
  "From paragraph one, we learn that" / "Why has the author used the words
  'first', 'next' and 'then' in the passage? To" / "Which of the following
  is true according to the passage?" / "What is likely to happen if you took
  your height measurements in the evening?" / "The word 'overall' as used in
  the passage means the same as" / "The best title for this passage would be"
- The options complete the stem, start lowercase and end with a full stop:
  "A. exact.  B. general.  C. usual.  D. special."
- The controlling word is bold: true, best, except.

Write the passage into question_text of the first question of the set, and
have the questions that follow refer to it."""

_FAMILY = [
    ("maths", ("mathematic", "maths")),
    ("science", ("science", "biology", "chemistry", "physics", "agricult",
                 "pre-technical", "pre technical", "home science")),
    ("religious", ("religious", "christian", "islamic", "hindu", "cre",
                   "ire", "hre")),
    ("humanities", ("social studies", "history", "geography", "citizenship",
                    "life skills")),
    ("language", ("english", "kiswahili", "literature", "fasihi", "lugha",
                  "language")),
]


def exemplars_for(subject_name: str) -> str:
    name = (subject_name or "").lower()
    for key, needles in _FAMILY:
        if any(n in name for n in needles):
            return EXEMPLARS[key]
    return ""
