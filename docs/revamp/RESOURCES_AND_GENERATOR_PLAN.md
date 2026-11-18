# Resources, facilitator tools and Assessment Generator — implementation plan

Source brief: "STADISPACE — FINAL STUDENT RESOURCES, FACILITATOR TOOLS, SUBSCRIPTIONS
AND ASSESSMENT GENERATOR WORKFLOW" (18 Nov 2026). This file records the audit and
the plan; the brief is the authority on product decisions.

## Audit (what exists today)

| Area | State | Where |
|---|---|---|
| Curriculum | Subject (learning area) → Topic (strand, carries grade) → Substrand, with KICD outcomes | `questions/models.py` |
| Question bank | ~3,800 vetted questions; type, difficulty, max_marks, marking_scheme, topic, substrand | `Question` |
| Subscriptions | Plans, M-Pesa (IntaSend) payments, `Subscription.is_valid`; free tier = 1 quiz/day | `questions/models.py`, `views.py` |
| Facilitator portal | Assessment Generator (AI-written from KICD design) + My Library. Lesson plans, schemes, records of work: tool names reserved in `GeneratedOutput.TOOLS`, not built | `facilitator_views.py`, `assessments.py` |
| Facilitator permission | `IsFacilitator` (role teacher, active account) | `questions/permissions.py` |
| PDF / book / video libraries | **None** | — |
| PDF tooling | PyMuPDF installed (stamping + text extraction); Cloudinary storage | `requirements.txt` |

Entitlement checks are currently repeated in five views (`credits_status`,
`SubscriptionStatusView`, `check_quiz_access`, quiz submit, tutor). Phase 1
adds one `has_student_premium()` that new code uses; old call sites are moved
over as they are touched.

## Design

One `library.Resource` table for PDFs, books and videos (kind + category), so
Revision Notes are one record shown in two portals — never a duplicate copy.

Independent settings per resource (brief §6F):
- `status` — draft / published / archived (student visibility)
- `access` — unset / free / premium. **Publishing is refused while unset.**
- `allow_download`
- `extraction_eligible` — Assessment Generator may read it; grants nobody access

Access rules live in `library/entitlements.py` and are enforced only on the
backend:

| | Free student | Premium student | Facilitator | Admin |
|---|---|---|---|---|
| List PDFs/books/videos | all published (Premium shown locked) | all | — | all incl. drafts |
| Open Free item | ✓ | ✓ | — | ✓ |
| Open Premium item | 402 upgrade | ✓ | — | ✓ |
| Revision Notes (any access) | as above | ✓ | ✓ (own portal) | ✓ |
| Other categories, books, videos | | | 403 | ✓ |

Files are never linked directly: `/open/` checks the rule, then streams the PDF
with the StadiSpace footer stamped on every page.

## Phases

1. **Permissions + classification** — Resource model, entitlements, student
   library API, facilitator Revision Notes API, tests for every role ×
   subscription × access combination.
2. **Admin content management** — upload/edit/publish/archive in the existing
   admin portal; audit log of admin actions; student pages (PDF Library, Books,
   Videos) with upgrade screen; facilitator Revision Notes page.
2b. **AI curriculum mapping of PDFs** (done) — every uploaded PDF is read
   (`library/extraction.py`): questions are separated from worked examples,
   explanations and answer keys; each question is checked against the text of
   its page; each is mapped on its own to a sub-strand chosen only from the
   curriculum tables (any other ID is discarded); grade and strand come from
   the database, never the model; confidence + flags (low confidence,
   ambiguous, no mapping, invented entry, no answer, needs figure, text not on
   page, grade differs). Everything starts "proposed"; admin approves,
   corrects (curriculum picker only), rejects or edits (original kept) at
   Admin → Library → Questions. `approved_question_pool()` = approved + from
   a generator-source PDF. Re-analysis keeps admin decisions.
   No page limit: every page is read in overlapping windows (progress saved,
   a run killed by a restart can be re-run). Scanned pages and pages with
   diagrams/tables/maths are sent to the model as images (OCR via the
   configured AI provider); scan-read questions are marked for wording
   checks. Figures are cut from the page (model's box, else the drawings
   between this question and the next) and stored with the question.
3. **Generator retrieval** — question-bank retrieval by grade/area/strand/
   substrand/type/difficulty/marks; PDF extraction (questions vs worked
   examples vs answer keys) from eligible resources only, into a reviewed
   `ExtractedQuestion` table; source tracking per generated question;
   duplicate detection.
4. **AI enhancement + validation** — rephrase/context changes that keep the
   answer; maths answers recomputed programmatically; question-level edit /
   lock / replace / regenerate; originals never modified.
5. **Facilitator tools** — Lesson Plans, Schemes of Work, Records of Work.
6. **Testing + deploy.**
