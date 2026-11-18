# StadiSpace: Audit and Overhaul Plan (v2)

**Updated:** 18 Nov 2026 · **Audited commit:** `ba2d9b90` · **Status:** Phase 0 is built and tested locally (not committed or pushed). Phases 1+ are waiting for your approval of this revised plan.

**What changed in v2:** your eight decisions, the two-content-systems rule, the resource-library and freemium requirements, the app-store payment research, and the Phase 0 results.

**Correction:** production runs on **Railway**. The local `.env` still pointed at an old Render Postgres; all Render references have now been replaced with Railway (Nov 2026). Production checks run on Railway (`railway run python manage.py <command>`).

---

## 0. Ground rules

### Two content systems that must never be mixed

| | **A. Student Question Bank** | **B. Facilitator Assessment Generator** |
|---|---|---|
| What it is | Questions **set by teachers**, organised by the Kenyan curriculum | AI tool that drafts assessment papers for a facilitator |
| Who creates it | Teachers working for StadiSpace, through the **admin portal** | The facilitator's own AI request; the facilitator reviews and edits it |
| Who sees it | Students (practice, quizzes) | Only the facilitator who generated it (their private library) |
| AI involvement | **None in the questions.** AI is used only to *mark* structured answers against the teacher's scheme | AI writes the draft; the teacher approves |
| Database | `Question`, `QuestionPart`, `Quiz`, `Passage` | `GeneratedOutput` (+ `Diagram`, `ApiCall`) |
| Can one become the other? | **No.** Generated questions are never written into the bank, and nothing in the plan moves them across | — |

AI study aids (Tutor, Flash Cards) stay as they are, labelled **"AI study aid"** in the interface so students never confuse them with the teacher-set bank.

### Central administration rule
All central content (question bank, PDFs, videos, curriculum, publishing) is managed **only in the admin portal**. Students and facilitators are customers; they **never** get content-management rights. There's no upload feature for facilitators or students anywhere in the plan.

### B2C
StadiSpace serves individual students and educators. There is no school-management product. `school_admin` stays in the database only so old migrations keep working, and **grants nothing** as of Phase 0.

---

## 1. Your decisions, and what I found

| # | Decision | Finding / action |
|---|---|---|
| 1 | Start Phase 0 now, no redesign | Done locally (§2) |
| 2 | Content-editor role, only if question writers use teacher accounts | **"Facilitator" = `teacher`:** the sign-up option "Facilitator" is stored as `role="teacher"` (`register/page.js:228`); no `facilitator` role value exists in code, migrations or the local data. `audit_accounts` also flags any hand-typed `facilitator` (or other unknown) role in production and counts questions it authored. **Local snapshot (data to April 2026):** all 639 attributed questions were written by **superadmin** accounts; 428 have no author; **no teacher account authored any question**. That snapshot is old, so it doesn't settle the question for production. I added a read-only command (`python manage.py audit_accounts`, prints counts only, no names) for you to run on Railway. Phase 0 already **recognises** a `content_editor` role in permission checks, but **no account has it** and no role was added to the database. If production shows teacher accounts maintaining the bank, the follow-up is: add the role choice (harmless migration) and move those named accounts to it, with your approval per account |
| 2b | **Production result (Railway, read-only, 18 Nov 2026)** | Users: 166 students, 3 superadmins, 2 teachers, 1 admin. Questions: 3,359 by 2 superadmin accounts + 444 with no author; **0 by teacher accounts**. Quizzes: all 233 by superadmins. No unknown roles (no hand-typed `facilitator`). 629 of 3,803 questions linked to a sub-strand. **Conclusion: no content-editor role needed; Phase 0 locks out no content maintainer** |
| 3 | No school admin product | **Production: 0 `school_admin` accounts.** Phase 0 removes all admin rights from that role |
| 4 | Benchmark the **generator** with teacher feedback | Process in §8. Doesn't touch the question bank |
| 5 | You alone upload PDFs/videos; watermark PDFs | Admin-only library design in §6; watermarking in §6.3 |
| 6 | Wordmark proposal before any rebrand | Delivered at the **start of Phase 1** for your approval; nothing replaced until you approve |
| 7 | Research app-store payments for Kenya | Done (§9). Recommendation: Android sign-in only; iOS adds Apple in-app purchase. One central entitlement system |
| 8 | ~~Dark default, keep saved preferences~~ → **Superseded: dark only** | One theme. `<html class="dark">` rendered server-side; light palette, theme init script and Settings → Appearance removed; saved "light" choices are ignored |

---

## 2. Phase 0 (security). Built and tested locally

| Fix | What changed | Files |
|---|---|---|
| **Answer keys no longer public** | Quiz data sent to guests, students and facilitators no longer includes `correct_answer`, `worked_solution`, part answers/marking schemes/explanations, or table-cell answers. Matching tables send the chips as a shuffled `chip_pool` with the row pairing removed, and the quiz page reads that pool. Answers still appear **after submission** in the learner's own attempt review, and always for content staff | `questions/serializers.py`, `frontend/src/app/quizzes/[id]/page.js` |
| **Central content is staff-only** | Question create/list/edit/delete/bulk import, bulk upload, passages, quizzes (create/edit/publish/delete/export), question sets, question analytics, motivational content → content staff only. Curriculum (strands/sub-strands): content staff may read; only admins may change | `questions/permissions.py`, `authoring_*.py`, `bulk_upload.py`, `views.py` |
| Why "teacher" can't mean "trusted" | Anyone can self-register as a teacher (`SELF_SERVICE_ROLES`), so the old "admin **or teacher**" checks were open to the public. That included **publishing/unpublishing or deleting any quiz** and **exporting any quiz with full answers** | — |
| `school_admin` grants nothing | Removed from every admin check | `permissions.py` |
| **Secure default** | DRF now requires login unless a view explicitly says public. The five account-free live-session endpoints are now marked public explicitly | `backend/settings.py`, `views.py` |
| **Payment callbacks verified** | The webhook no longer believes the request body. It asks IntaSend's API for the real state, amount and reference (same call the status poll already makes). Without an API token it accepts only a matching `INTASEND_CHALLENGE` secret. With neither, the payment stays pending for the poll or an admin. Live-lesson bookings get the same protection | `views.py` |
| **No password in the repo** | `railway.json` now runs `ensure_superadmin`, which creates the account only from `DJANGO_SUPERADMIN_PASSWORD` and never resets an existing one | `railway.json`, `users/management/commands/ensure_superadmin.py` |
| Email diagnostic | Admin login required (the hard-coded header key is gone) | `users/views.py` |
| Legacy AI endpoint | `lessons/generate-questions/` (abandoned `ai_service`) had **no permission at all**, so anyone could spend your API credit. Now admin-only until removed | `views.py` |
| Grading status | Only the attempt's owner (or an admin) can poll it | `views.py` |
| Unreachable duplicate route | Removed `attempts/<id>/` duplicate (no behaviour change) | `questions/urls.py` |
| Health check | `/api/health/` now reports **yes/no** whether the IntaSend token and challenge are set (never the values) | `questions/urls.py` |
| **Tests** | 18 automated tests (answer keys, permissions per role, payment forgery, underpayment, challenge fallback). All pass. A GitHub Actions workflow runs them on every push | `questions/tests.py`, `.github/workflows/tests.yml` |
| Account audit | `audit_accounts` read-only command | `questions/management/commands/audit_accounts.py` |

**How it was verified:** every API route was requested as guest, student, self-registered teacher and admin, before and after. The **only** differences are students/teachers now getting 403 on admin/content endpoints, and login now being required for grading status and the email diagnostic. **Admin results are identical; public endpoints are unchanged.** `manage.py check` clean, no migrations needed, quiz page lint unchanged (0 errors).

**Pre-existing bugs found. Parked at your request (not in any phase until you say so):**
- Live session **join** and **leaderboard** crash on master (`NameError: Classroom`). The model was renamed `LiveSession` but these views weren't updated. So joining a Kahoot-style live session doesn't work today.
- Classroom **search** with text crashes (`models.Q` without importing `models`), `users/views.py:340`.

**Before you push Phase 0. Do these on Railway (I can't see it):**
1. Run `python manage.py audit_accounts`. If any teacher accounts author questions, tell me before pushing, because they'd lose access.
2. Check `/api/health/` after deploy → `payments`. At least one of `intasend_api_token` / `intasend_challenge` should be `true`, ideally the token, or callbacks will wait for the status poll.
3. Change the superadmin password (the old one is in git history). Optionally set `DJANGO_SUPERADMIN_PASSWORD` for fresh environments.

---

## 3. Existing functionality inventory (summary, unchanged from v1 unless noted)

✅ works · 🟡 partial · 🔴 broken · ⚪ missing

| Area | Status |
|---|---|
| Accounts: JWT, Google/Microsoft login, email verification, reset | ✅ |
| Curriculum Grade → Learning area → Strand → Sub-strand with verbatim KICD outcomes | ✅ (local: 13 areas, 287 strands, 1,330 sub-strands, Grades 4–10) |
| Question bank: 8 types, passages, admin editor, bulk upload, quiz + exam builder | ✅, now admin-only (Phase 0) |
| Question ↔ sub-strand links | 🟡 0 of 1,067 linked in the local snapshot. Check production |
| Question review/publish workflow, provenance | ⚪ |
| Quiz taking, instant marking (MCQ exact; structured by Claude against the teacher's scheme), review, progress, streaks | ✅ |
| Topic-level recommendations | 🟡 weak subjects only |
| Free tier: 1 quiz/day, guests 2 | ✅. **10-question cap for free quizzes ⚪** |
| Plan entitlement flags (`can_download_pdf`, …) | 🟡 exist, not enforced |
| Tutor, Flash Cards (AI study aids), Life Skills, Live Lessons, Motivational | ✅ kept |
| Live Kahoot-style sessions | 🔴 join/leaderboard crash (pre-existing) |
| Facilitator generator: KNEC blueprint, KICD outcomes, blind review + repair, code-drawn graphs, image diagrams, background jobs, library, inline edit, print | ✅ |
| Generator: blueprint approval, per-question regenerate/lock, dedup, diagram verification, geometry/technical diagrams, PDF/DOCX export, benchmark | ⚪ |
| Schemes of Work, Lesson Plans, Lesson Notes, Records of Work | ⚪ "Soon" placeholders |
| IntaSend STK + webhook + poll; manual M-Pesa code | ✅ (webhook hardened in Phase 0) |
| Video library, PDF library | ⚪ |
| Parent link + consent | ⚪ (email report to parent exists) |
| Automated tests | ✅ 18 (Phase 0); previously 0 |
| Brand | Navy `#0F1F3D` + teal `#0E7490`, Cormorant Garamond + DM Sans on landing; green app icon (off-brand); 10 font families; `og-image.png` missing |

Legacy/dead code (kept until you approve removal): `ai_service.py`, `mpesa_api.py` (Daraja, unused), `CanAccessQuestion`, `IsAdminOrTeacher` (no longer used for content), `UserProfile.free_quizzes_remaining`, root `data*.json`, old `*_FIXES.md`. (`render.yaml` removed.)

---

## 4. Architecture

```
                ┌──────────── ONE Django backend on Railway ─────────────┐
                │ Accounts & roles · Curriculum                          │
                │ A. Question bank (teacher-set)  B. Generator (AI)      │
                │ Resource libraries (PDF, video) · Entitlements         │
                │ Payments: IntaSend M-Pesa (web) + Apple IAP (iOS)      │
                │ /api/v1/… JWT · Postgres (Railway) · Cloudinary        │
                └──────▲──────────────────▲────────────────▲─────────────┘
                 Next.js website     Expo Android       Expo iOS
                 public, student,    student-first,     same codebase
                 educator, ADMIN     educator (view)    + Apple IAP
```

- One account, one database, one entitlement answer (`GET /me/entitlements/`) for all three apps.
- **The backend decides** access to every premium question, PDF and video. The interface only reflects it.
- Admin exists **only on the website**. The mobile apps ship no admin code.
- Shared `packages/shared/` for design tokens, API client and validation rules. No extra tooling.
- No new infrastructure unless a phase proves the need.

---

## 5. Roles and permissions

Roles in use: `student`, `teacher` (facilitator), `admin`, `superadmin`; `parent` added in Phase 6; `content_editor` only if the production audit shows it's needed. `school_admin`: legacy, no rights.

| Capability | Guest | Free student | Premium student | Facilitator | Parent* | Content editor* | Admin |
|---|---|---|---|---|---|---|---|
| Public site, plans | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Quizzes from the question bank | 2 total | 1/day, ≤10 questions | Unlimited (fair-use) | Preview | – | ✔ | ✔ |
| Answer keys | – | Own submitted attempts | Own submitted attempts | – | – | ✔ | ✔ |
| Free PDFs/videos | Browse | ✔ | ✔ | ✔ | – | ✔ | ✔ |
| Premium PDFs/videos | Browse titles | Browse titles, locked | ✔ | Per plan (D-new) | – | ✔ | ✔ |
| PDF download | – | Free items marked downloadable | Items marked downloadable | Per plan | – | ✔ | ✔ |
| Progress | – | Basic | Detailed + history + recommendations | Own classes | Linked learner (consented) | – | ✔ |
| Assessment Generator & Studio tools | – | – | – | ✔ (own outputs only) | – | – | ✔ |
| Edit question bank | – | – | – | – | – | ✔ (draft/submit) | ✔ |
| Upload / publish PDFs & videos, curriculum, users, payments | – | – | – | – | – | – | ✔ |

\* future roles. Every cell is enforced on the backend.

---

## 6. Resource libraries (admin-managed)

### 6.1 Admin workflow (you)
**Create the PDF or video → log into the admin portal → upload → assign grade, learning area, strand, sub-strand, category → set Free/Premium and download permission → preview → publish.**
Later actions without re-uploading: edit details, re-categorise, switch Free ↔ Premium, toggle download, unpublish, replace the file, delete (with confirmation; deleting removes the file from storage).

### 6.2 Data model (new tables, additive)

**`Resource`**: one table for both kinds, so the library, search, entitlement and analytics code exists once:

| Field | Notes |
|---|---|
| `kind` | `pdf` / `video` |
| `category` | PDF: revision_notes, exams_practice, worksheets, marking_schemes, study_guides, practical_guides · Video: topic_lesson, worked_example, practical_demo, exam_prep, topic_revision |
| `title`, `slug`, `description` | |
| `grade`, `subject` (learning area), `topic` (strand), `substrand` | Same curriculum tables as everything else; sub-strand optional when a resource spans a strand |
| `thumbnail` | Uploaded cover, or generated: page 1 of the PDF / provider's video poster |
| `file` (PDF) | Cloudinary **authenticated** delivery (no public URL) |
| `video_provider`, `video_id` (video) | See §6.4 |
| `duration_seconds`, `page_count` | Filled automatically where possible |
| `access` | `free` / `premium`. Switchable at any time |
| `allow_download` | PDFs; default on for free, your choice per item |
| `status` | `draft` / `published` / `unpublished` |
| `published_at`, `created_at`, `updated_at`, `created_by` | |
| `pairs_with` | Optional link, e.g. an exam paper ↔ its marking scheme |

**`ResourceProgress`**: user, resource, `position_seconds` (video resume) or `last_page` (PDF), `completed`, `updated_at`.

### 6.3 PDF delivery and watermarking
- Students never get the storage URL. The app asks `GET /library/resources/<id>/open/`. The backend checks published + entitlement, then streams the file or returns a link valid for a few minutes. Guessing a URL or calling the API as a free user returns **403**. This is tested like Phase 0.
- **Watermark** applied by the backend with **PyMuPDF (already installed)**: a small footer on every page reading **"StadiSpace · stadispace.co.ke · 0704 699683 / 0717 946 924"** (symbol + domain + both phone numbers, as approved; 0717 946 924 is also the WhatsApp number used in the app) and a faint centred symbol at about 6% opacity, placed as an overlay so the original text and layout stay untouched and selectable. The branded copy is generated once per upload and cached. The original stays private.
- Optional (decision D-new2): also stamp "Downloaded by <student name>" on download copies to discourage sharing.
- On phones: in-app viewer (web: PDF.js-based page viewer sized to screen width with pinch zoom; app: native PDF view), page memory via `ResourceProgress`, download button only when allowed.

### 6.4 Video hosting (evaluation)
| Option | Fit | Notes |
|---|---|---|
| **Cloudinary video** (already integrated) | Good start | Upload from admin, adaptive streaming, posters automatic, signed delivery. Bandwidth billing can rise with heavy viewing |
| **Bunny Stream** | Best value at scale | Cheap storage/bandwidth, signed URLs, simple player. One new account and API key |
| **Mux** | Excellent quality and analytics | Higher cost; more than needed now |
| YouTube unlisted | Free videos only | Can't protect premium content; YouTube branding and suggestions |
| Self-hosting | No | Exactly the streaming infrastructure we're avoiding |

**Recommendation:** start on **Cloudinary** (no new vendor), with the `video_provider` field so a move to Bunny Stream later is a data change, not a rebuild. I'll confirm current prices for both before Phase 4 and show you the monthly estimate for your expected viewing.

Player: provider HLS stream in a minimal player (play/pause, seek, speed, captions when present, fullscreen), resume from `ResourceProgress`, no autoplay, saves position every ~10 s.

### 6.5 Student library experience (mobile-first)
Library tab → filter chips (Grade · Learning area · Strand · Category; Free/Premium) → list of resource rows (thumbnail, title, category, duration/pages, a small **Free** or lock badge). Premium items stay visible with a quiet lock and one line ("Included with Premium"), no banners or pop-ups. Opening a resource shows a clean detail page: viewer or player, then related items from the same sub-strand. The sub-strand hub (Learn tab) shows the same resources in context.

---

## 7. Freemium entitlements

One function decides access everywhere: `entitlements(user)`. It returns `free_starter` or `premium` from the existing `Subscription` (`is_active` and `end_date > now`). An **expired subscription falls back to Free Starter automatically**, because it's computed at request time, not stored. Existing subscriptions and payments are untouched.

| Rule | Free Starter | Premium | Enforced where |
|---|---|---|---|
| Quizzes | 1 per day (exists) | Unlimited, fair-use limit (e.g. 60/day, adjustable) against scripted abuse | Quiz start + submit |
| Questions per quiz | **Max 10** (new): a 10-question selection from the chosen quiz, fixed for that attempt | Full quiz | Quiz detail for free users; grading only accepts those questions |
| PDFs / videos | Items marked `free` | All | `open` endpoint |
| Downloads | Free items with `allow_download` | Items with `allow_download` | `open?download=1` |
| Progress | Basic summary | Detailed history + topic recommendations | Progress API trims for free users |

Admin controls: per-resource Free/Premium switch; plan prices/durations as today.

---

## 8. Assessment Generator (system B only)

Improvements (from v1, unchanged): teacher-approved **blueprint** before generation; per-question **replace / regenerate / lock**, reorder, edit marks and scheme, version history; deterministic checks (numeric answers recomputed with `sympy`, marks add up, distractors distinct); **near-duplicate detection**; **code-drawn geometry and technical diagrams**; **verification of AI-drawn science illustrations** (fail → description shown + "needs diagram", never a wrong picture); **PDF and Word (.docx) export** in KNEC layout with a separate marking scheme.

### Benchmarking process (prepared now, run when teachers are available)
1. **Test set:** about 30 blueprints across Grades 4–10 and core learning areas, covering MCQ-heavy, structured-heavy, maths with graphs, science with diagrams, and one Kiswahili set.
2. **Candidates:** the current production model plus 2–3 alternatives across providers already wired in `generation.py`. Same blueprint, same prompts.
3. **Run:** `manage.py bench_generation` generates every blueprint on every model; cost and time logged via `ApiCall`; papers stored as `GeneratedOutput` rows tagged `benchmark`.
4. **Blind review:** an admin "Benchmark review" screen shows papers with model names hidden and order shuffled. Each teacher scores 1–5 on: curriculum accuracy, question quality, marking-scheme accuracy, mathematical correctness, diagrams, overall suitability ("would you give this to a class with minor edits?"), plus free-text comments. Two teachers per paper where possible.
5. **Decision:** pick the model with the best quality per shilling; separate choices are allowed for writing vs reviewing. Results and the decision go in `docs/revamp/benchmark.md`, so the choice is evidence-based and repeatable when new models arrive.
Teacher time: about 2–3 hours each. The question bank is not involved.

---

## 9. Android and iOS: payments research (Kenya)

What I found (third-party guides plus Google/Apple developer pages; I'll re-check the official policy pages right before store submission because they change often):

- **Alternative-billing programmes don't cover Kenya.** Google's user-choice/alternative billing and external links are live in the **US, UK, EEA** (with Japan/Australia mentioned), and Apple's external purchase links apply on the **US storefront** (with entitlements in a few other regions). Kenya isn't among them, so the default rules apply.
- **Google Play allows "consumption-only" apps.** An app that sells nothing can let users **sign in and use a subscription bought elsewhere** (our website M-Pesa). The app must not link or steer users to the web payment page. Telling users about offers **outside** the app (SMS, email, WhatsApp) is allowed.
- **Apple is stricter.** Guideline 3.1.3(b) (multiplatform) lets users access purchases made elsewhere *provided those items are also available as in-app purchases*, and reviewers read the "also" strictly. The 3.1.3(f) free companion-app exemption lists examples (VoIP, cloud storage, email, web hosting), and it's disputed whether an education subscription qualifies. A login-only premium iOS app therefore carries **real rejection risk**.

**Recommended architecture:**

| Platform | How premium is bought | How it's verified |
|---|---|---|
| Website | **IntaSend M-Pesa, unchanged** | IntaSend API (hardened in Phase 0) |
| Android | Not sold in the app. Users subscribe on the website; the app signs in and shows premium. No in-app links to the payment page | Same backend entitlement |
| iOS | **Apple in-app purchase** (same Premium plan, priced in Apple's tiers) *and* sign-in for web subscribers | Backend verifies every receipt with Apple's App Store Server API and listens to Apple's server notifications for renewals, refunds and cancellations. The app's own "success" message never grants access |

All three write to the **same `Subscription`**, with a `source` field (`intasend`, `manual`, `app_store`) and an external reference. One entitlement system, no per-resource payments. Apple's commission applies to iOS purchases (15% under the Small Business Program for small developers; to be confirmed at enrolment). Free Starter works without any purchase on all platforms.

Sources: [Google Play Payments policy, consumption-only and steering](https://support.google.com/googleplay/android-developer/answer/10281818) · [Google Play commerce FAQ](https://android-developers.googleblog.com/2020/09/commerce-update-faqs.html) · [Google Play Q2 2026 update](https://google.play/the-latest/2026-q2/) · [RevenueCat: Play billing choice](https://www.revenuecat.com/blog/engineering/play-billing-choice) · [kapps: alternative billing regions/fees](https://kapps.store/faq/alternative-billing-and-user-choice-billing-programs-on-google-play-user-choice-.html) · [Apple App Review Guidelines (PDF)](https://developer.apple.com/support/downloads/terms/app-review-guidelines/App-Review-Guidelines-English-UK.pdf) · [iClarified: Apple US external links](https://www.iclarified.com/97192/apple-updates-app-store-rules-to-allow-external-purchase-links-in-us) · [Apple forum: 3.1.3(b) "also available as IAP"](https://developer.apple.com/forums/thread/825551) · [Apple forum: 3.1.3(f) scope](https://developer.apple.com/forums/thread/781935) · [Newly: external link storefronts](https://newly.app/how-to/app-store-external-purchase-link)

Other mobile requirements (from v1): Expo + EAS; tokens in secure storage; **Sign in with Apple** required on iOS because Google login is offered; deep links; offline queue for quiz answers; only opened items cached (never the whole bank); Google Play's closed-testing period for new personal developer accounts; privacy/data-safety declarations covering minors.

---

## 10. Database changes (all additive)

| Change | Phase | Existing data |
|---|---|---|
| `Question.status` (draft/in_review/published/retired), `source` (teacher_set/imported), `reviewed_by/at`, `review_notes` | 2 | All existing → `published`, `teacher_set`. Students see the same as today |
| `Quiz.status` + correct `owner_type` | 2 | Backfilled from `created_by.role`; `is_active` kept in sync |
| `Resource`, `ResourceProgress` | 4 | New |
| `Subscription.source`, `external_ref`; `PaymentEvent` audit log | 4/8 | Existing rows → `intasend` or `manual` |
| `QuizAttempt` question selection for the free 10-question cap (`Attempt.question_ids` JSON) | 4 | Null for old attempts = whole quiz |
| `parent` role + `ParentLink` (consent) | 6 | New |
| `content_editor` role choice | Only if the audit requires it | Choices-only migration |
| SimpleJWT token blacklist | 7 | Built-in tables |
| Generator: per-question `id`/`locked`/`history` inside `GeneratedOutput.payload` | 5 | JSON only; old papers still open |

Rules: never edit an applied migration; `makemigrations --check` in CI; test on a copy of production before deploy.

---

## 11. API changes (new, beyond Phase 0)

- Content workflow: `/admin/questions/<id>/submit-review|approve|publish|retire/`, review queue.
- Libraries: `GET /library/resources/?kind=&grade=&subject=&topic=&substrand=&category=&access=`, `GET /library/resources/<id>/`, `GET /library/resources/<id>/open/[?download=1]`, `PUT /library/resources/<id>/progress/`; admin CRUD + upload under `/admin/library/resources/`.
- Entitlements: `GET /me/entitlements/`. Recommendations: `GET /me/recommendations/`.
- Sub-strand hub: `GET /learn/substrands/<id>/` (practice, resources, notes in one call).
- Studio: blueprint preview, per-question regenerate/lock, `export.pdf`, `export.docx`, then schemes/plans/notes/records.
- Apple: `POST /payments/apple/verify/`, `POST /payments/apple/notifications/`.
- `/api/v1/` alias before the apps ship.

---

## 12. Design system (unchanged from v1, summarised)

- **Brand evolution, not replacement:** navy base, teal signature, warm white, editorial serif on the public site only.
- **Dark only (owner decision, Nov 2026): no light theme, no toggle.** **Tokens:** `bg #080F1D · surface #14243A · surface-2 #1B2C43 · text #F5F7FA · muted #A9B9CC · teal #20B8A6 · blue #4D8DDA · amber #E8B65B`. The original teal `#0E7490` stays for solid buttons with white text (5.4:1).
- **Measured contrast:** white text on `#20B8A6` is 2.5:1 (fails), so teal buttons use navy text (7.7:1). `#20B8A6` on white is 2.5:1 (fails), so light mode uses `#0E7490` (5.4:1).
- **Type:** DM Sans for the interface, Cormorant Garamond for public headlines ≥ 32px, Kalam kept only for the marking style. Down from 10 families.
- One component set; tables collapse to rows on phones; 44px tap targets; 8/12px radius; motion only for state changes.
- Tested at 360, 375, 390, 430, 768 and 1280px, light and dark, before any page is called done.
- **Wordmark:** SVG proposal shown to you at the start of Phase 1; icon, `og-image` and app icons follow only after approval. Photography: properly licensed stock of Kenyan learners, sources recorded.

---

## 12b. Play: educational games (added Nov 2026, your proposal)

**What it is:** a first-class student section, next to Learn. **Learn** is serious curriculum practice (the teacher-set bank, resources, progress). **Play** is trivia, puzzles and challenges that are fun on their own. They're bridged both ways: a fractions game ends with "Practise fractions in Learn"; a science trivia round links to the matching sub-strand. Positioned as "challenge your mind", not "more quizzes".

**Content:** created and managed only by you in the admin portal, like everything central. No facilitator or student uploads. Each game item can be tagged to grade / learning area / sub-strand so the Learn bridge works. Play content is its **own content system (C)**: it doesn't touch the question bank (A) or the generator (B).

**Stages**

| Stage | Games | Plus |
|---|---|---|
| **1. Launch** | Daily Trivia (5 questions/day, mixed subjects), True or False (fast rounds, misconceptions), Match It (pairs), Brain Battles (patterns, sequences, missing numbers) | XP, badges, streaks, personal bests |
| **2. Expand** | Word games (anagrams/unscramble, spelling, word search; English and Kiswahili), Picture Quiz, Mystery Challenge (clues revealed one by one), Spot the Mistake, Sort It Out (timelines, life cycles, processes), Odd One Out, Who Am I? | Levels |
| **3. Advanced** | Adaptive difficulty, richer puzzles, timed tournaments, optional **anonymous** competitions | Topic mastery rewards |

**Rewards:** XP, badges, streaks (separate from the quiz streak, or merged: decide at build), personal bests, levels. **No public leaderboards with children's real names.** Personal progress first; any later competition is anonymous and opt-in. Badges get designed icons in the brand style, not emoji.

**Free vs Premium** (configurable in admin, not hard-coded):

| | Free | Premium |
|---|---|---|
| Daily Trivia | 1 round/day | Unlimited |
| Brain Games | 2/day | Unlimited |
| Word, Mystery, Match, Sort | Selected games | Full library |
| XP, badges, streaks | Yes | Yes |
| Progress | Basic | Detailed |

Games have **their own limits**: they never count against the free daily quiz or Premium's quiz fair-use limit.

**Data (additive):** `GameItem` (game type, prompt/payload JSON per type, answer, explanation, grade/subject/topic/substrand tags, difficulty, access free/premium, status), `DailyTrivia` (date → 5 items), `GamePlay` (user, game, score, time, xp), `Badge` + `UserBadge`, XP and level fields on the profile. Answers are checked **server-side**, never shipped to the browser (same rule as Phase 0).

**Navigation:** the student bottom nav becomes **Home · Learn · Play · Library · Me**, with Progress reached from Home and Me (five tabs is the comfortable maximum on a phone).

---

## 13. Implementation phases

| Phase | Scope | Push recommendation |
|---|---|---|
| **0. Security** | Done locally (§2) | **Push soon, after you test locally and run the Railway checks in §2.** Live exposure |
| **1. Foundations** | Wordmark proposal → (after approval) tokens, fonts, dark default with saved-preference respect, core components, icon/og-image; `/api/v1`; `packages/shared` | After visual check |
| **2. Question bank workflow (A)** | Status/provenance, review queue, publish, quiz ownership, sub-strand linking tool (admin confirms), admin nav merge | After admin check |
| **3. Website + student web** | Public pages (incl. privacy/terms), student shell with bottom nav, sub-strand hub, quiz player, results, recommendations, redirects | Per slice |
| **4. Libraries + freemium** | `Resource` model, admin upload/manage screens, watermarking, video hosting, student library + viewer/player with resume, entitlements function, 10-question cap, fair-use limit | Per slice |
| **4b. Play, Stage 1** (§12b) | Admin game-content screens; Daily Trivia, True or False, Match It, Brain Battles; XP, badges, streaks, personal bests; free/premium game limits; Learn ↔ Play links. Stages 2–3 follow once Stage 1 is in use | Per game |
| **5. Educator Studio (B)** | Merge `/teacher` + `/facilitator`; blueprint, regenerate/lock, dedup, diagrams, PDF/DOCX; `bench_generation` + blind review screen; then Schemes → Plans → Notes → Records | Per tool |
| **6. Parent architecture** | Role, link + consent, summary API | Yes |
| **7. Mobile foundation** | Expo app: auth, nav, theme, Home/Learn/Library/quiz/progress, offline queue, deep links | EAS builds |
| **8. Payments sync** | `Subscription.source`, `PaymentEvent`, Apple IAP + server verification; final policy re-check | Yes |
| **9. Test pass** | 6 widths, real Android + iPhones, sandbox purchases, accessibility | — |
| **10. Store submission** | Listings, privacy forms, closed testing, review | — |

Not done without asking: deleting code/data, dropping/renaming columns, editing applied migrations, changing grading prompts, changing payment logic beyond verification.

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Production has teacher accounts maintaining the bank | Run `audit_accounts` before pushing Phase 0 |
| Neither IntaSend token nor challenge set on Railway | Payments still complete via the status poll; set the token (health check shows it) |
| Apple rejects the iOS app | IAP included from the start; Sign in with Apple; conservative privacy declarations |
| Video bandwidth costs | Provider field allows switching; cost estimate before Phase 4 |
| Watermark harms readability | Overlay at low opacity, footer outside the text area, previewed before publish |
| Migration fails on Railway → old build keeps serving | Additive migrations, CI check, verify `/api/health/` commit after deploy |
| Solo-builder load | Phases ship independently; website first, apps after |

---

## 15. Acceptance criteria (additions in bold)

- Automated tests in CI cover permissions, answer-key privacy, payments, **resource entitlements (free user gets 403 on a premium PDF/video by direct API call or guessed URL), Free ↔ Premium switch takes effect immediately, expired subscription returns to Free Starter, 10-question cap**.
- Every changed page screenshotted at six widths in light and dark; no horizontal scroll; 44px targets; text contrast ≥ 4.5:1.
- **Watermark visible on every downloaded page and text still selectable/readable.**
- **Video resumes from the last position on web and app.**
- Website, Android and iOS share one account, progress and entitlements; apps tested on real devices; called "published" only after passing store review.

---

## 16. Open questions for you

- **Q1.** Run `python manage.py audit_accounts` on Railway and paste the output (counts only, no personal data). That settles the content-editor and school-admin questions for production.
- **Q2.** Should facilitators get premium resources (PDFs/videos) as part of a facilitator plan, or only free items? (Affects the "Facilitator" column in §5.)
- **Q3.** Personalised "Downloaded by <name>" stamp on PDFs, in addition to the StadiSpace watermark: yes or no?
- **Q4.** Premium fair-use limit: is 60 quizzes per day reasonable?
