"""
Load kicd_parsed/*.json into the database, mapping official KICD strands and
sub-strands onto the Topic/Substrand rows that already exist.

    python manage.py load_kicd --dry-run     # report only, write nothing
    python manage.py load_kicd               # apply
    python manage.py load_kicd --report-only-ambiguous
    python manage.py load_kicd --fuzzy 0.86  # auto-link threshold

WHY THE MATCH REPORT EXISTS
The 99 Topic rows were typed by hand ("Whole Numbers", "Living Things") and do
not exactly equal the KICD strand names ("Numbers", "Living Things and Their
Environment"). Auto-merging on a loose similarity score would silently attach
existing questions to the wrong strand, which is worse than leaving a strand
unmatched. So:

  >= --fuzzy (default 0.88)   linked automatically
  0.60 .. --fuzzy            reported as AMBIGUOUS, never auto-linked
  < 0.60                     a new Topic is created

Re-runnable: matching and loading are idempotent, so fixing one mapping and
running again does not duplicate anything.
"""
import json
import re
from difflib import SequenceMatcher
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

PARSED_DIR = Path(settings.BASE_DIR) / "kicd_parsed"

# Display names for learning areas the designs cover but the app has never had
# a Subject row for. Only used when a design needs one.
SUBJECT_NAMES = {
    "agriculture-nutrition": "Agriculture & Nutrition",
    "arabic": "Arabic",
    "aviation-technology": "Aviation Technology",
    "biology": "Biology",
    "building-and-construction": "Building and Construction",
    "business-studies": "Business Studies",
    "chemistry": "Chemistry",
    "christian-religious-education": "Christian Religious Education",
    "computer-science": "Computer Science",
    "core-mathematics": "Core Mathematics",
    "creative-arts-and-sports": "Creative Arts and Sports",
    "csl": "Community Service Learning",
    "electrical-technology": "Electrical Technology",
    "english": "English",
    "fasihi-ya-kiswahili": "Fasihi ya Kiswahili",
    "fine-arts": "Fine Arts",
    "french": "French",
    "general-science": "General Science",
    "geography": "Geography",
    "german": "German",
    "hindu-religious-education": "Hindu Religious Education",
    "history-and-citizenship": "History and Citizenship",
    "home-science": "Home Science",
    "ict": "ICT",
    "indigenous-language": "Indigenous Language",
    "integrated-science": "Integrated Science",
    "islamic-religious-education": "Islamic Religious Education",
    "kiswahili": "Kiswahili",
    "kiswahili-lugha": "Kiswahili Lugha",
    "literature-in-english": "Literature in English",
    "mandarin": "Mandarin",
    "mathematics": "Mathematics",
    "metal-technology": "Metal Technology",
    "music-dance": "Music and Dance",
    "physical-education": "Physical Education",
    "physics": "Physics",
    "power-mechanics": "Power Mechanics",
    "pre-technical-studies": "Pre-Technical Studies",
    "science-and-technology": "Science and Technology",
    "social-studies": "Social Studies",
    "sports-recreation": "Sports and Recreation",
    "theatre-film": "Theatre and Film",
    "wood-technology": "Wood Technology",
}

# Misspellings printed in the official designs themselves. Outcomes stay
# verbatim - they are the thing marking keys quote - but a strand or
# sub-strand NAME is a heading a teacher prints and hands to a class, so a
# typo from the source becomes a typo with your logo on it. Corrected here,
# deliberately, as a short and auditable list rather than a spell-checker.
SOURCE_TYPOS = {
    "Entreprenuership": "Entrepreneurship",
    "Enterpreneurship": "Entrepreneurship",
    "Measurment": "Measurement",
    "Enviroment": "Environment",
    "Comunication": "Communication",
    "Managment": "Management",
    "Priciples": "Principles",
    "Independance": "Independence",
    "Seperate": "Separate",
    "Occurence": "Occurrence",
}


def fix_typos(name: str) -> str:
    """Correct known source misspellings in a heading, preserving case style."""
    out = name or ""
    for bad, good in SOURCE_TYPOS.items():
        out = re.sub(re.escape(bad), good, out, flags=re.I)
    return out


# Words that carry no distinguishing meaning when comparing a hand-typed topic
# name against a KICD strand name.
STOP = {"and", "the", "of", "in", "to", "a", "their", "its", "for", "with",
        "na", "ya", "wa", "za", "la", "kwa"}


def norm(s):
    s = re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower())
    return " ".join(w for w in s.split() if w not in STOP)


def similarity(a, b):
    na, nb = norm(a), norm(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    ratio = SequenceMatcher(None, na, nb).ratio()
    # Reward one name containing the other ("Numbers" vs "Whole Numbers").
    wa, wb = set(na.split()), set(nb.split())
    if wa and wb:
        overlap = len(wa & wb) / min(len(wa), len(wb))
        if wa <= wb or wb <= wa:
            ratio = max(ratio, 0.90)
        ratio = max(ratio, overlap * 0.95)
    return ratio


class Command(BaseCommand):
    help = "Map kicd_parsed/*.json onto Subject/Topic/Substrand rows."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Report the mapping; write nothing.")
        parser.add_argument("--fuzzy", type=float, default=0.88,
                            help="Similarity at/above which a topic is auto-linked.")
        parser.add_argument("--accept-ambiguous", action="store_true",
                            help="Also link the 0.60..fuzzy band (review the report first).")
        parser.add_argument("--only-subject", default=None,
                            help="Limit to one subject slug, e.g. mathematics")
        parser.add_argument("--grades", default=None,
                            help="Limit to grades, e.g. 4,5,6")
        parser.add_argument("--if-needed", action="store_true",
                            help="Exit immediately if the curriculum is already "
                                 "loaded. For deploy scripts: the first deploy "
                                 "loads it, later ones cost one COUNT query.")
        parser.add_argument("--no-new-subjects", action="store_true",
                            help="Skip designs for learning areas that have no "
                                 "Subject row yet. Use this on production: "
                                 "creating them puts new subjects in front of "
                                 "learners (the designs cover 42 learning "
                                 "areas).")

    def handle(self, *args, **opts):
        from questions.models import Subject, Topic, Substrand

        files = sorted(p for p in PARSED_DIR.glob("*.json")
                       if not p.name.startswith("_"))
        if not files:
            if opts["if_needed"]:
                self.stdout.write("No parsed designs on disk; nothing to load.")
                return
            raise SystemExit(f"No parsed JSON in {PARSED_DIR}. Run ingest_kicd first.")

        if opts["if_needed"]:
            # Deploy guard: has the curriculum ever been loaded here?
            #
            # Deliberately not "are all designs loaded" - with
            # --no-new-subjects, and with uncertain strand matches held back
            # for review, the number in the database is legitimately lower
            # than the number on disk, so that comparison would reload
            # everything on every deploy.
            #
            # Consequence worth knowing: adding new designs needs one manual
            # run without this flag. That is the right trade - a deploy should
            # not silently rewrite 1,300 rows each time it runs.
            loaded = (Substrand.objects
                      .exclude(learning_outcomes=[])
                      .exclude(learning_outcomes=None).count())
            if loaded > 0:
                self.stdout.write(
                    f"Curriculum already loaded ({loaded} sub-strands with "
                    f"outcomes). Skipping - run without --if-needed to refresh.")
                return
            self.stdout.write("No curriculum loaded yet - loading.")

        grades = None
        if opts["grades"]:
            grades = {int(g) for g in opts["grades"].split(",")}

        # ── flatten the per-design files into subject/grade/strand groups ──
        # ingest_kicd writes one file per source design, with strands nested
        # and general_outcomes stored once at the top rather than repeated.
        tree, rubrics, strand_codes = {}, {}, {}
        for f in files:
            d = json.loads(f.read_text(encoding="utf-8"))
            if opts["only_subject"] and d["subject"] != opts["only_subject"]:
                continue
            if grades and d["grade"] not in grades:
                continue
            for strand in d.get("strands", []):
                key = (d["subject"], d["grade"],
                   fix_typos(strand["strand"]) or "General")
                bucket = tree.setdefault(key, [])
                if strand.get("assessment_rubric"):
                    rubrics[key] = strand["assessment_rubric"]
                if strand.get("strand_code"):
                    strand_codes[key] = strand["strand_code"]
                for sub in strand.get("substrands", []):
                    bucket.append({**sub,
                                   "grade": d["grade"],
                                   "subject": d["subject"],
                                   "strand": strand["strand"],
                                   "general_outcomes": d.get("general_outcomes") or []})

        self.stdout.write(
            f"{len(files)} design files -> {len(tree)} strands, "
            f"{sum(len(v) for v in tree.values())} sub-strands, "
            f"across {len({(s, g) for s, g, _ in tree})} subject/grade pairs\n")

        dry = opts["dry_run"]
        stats = {"subjects_created": 0, "subjects_skipped": 0, "topics_linked": 0,
                 "topics_created": 0, "substrands_created": 0,
                 "substrands_updated": 0, "ambiguous": 0}
        ambiguous_rows, linked_rows, created_rows = [], [], []
        skipped_subjects, would_create_subjects = set(), set()

        existing_subjects = {s.slug: s for s in Subject.objects.all()}

        for (subj_slug, grade, strand), subs in sorted(tree.items()):
            # ── Subject ──────────────────────────────────────────────────
            subject = existing_subjects.get(subj_slug)
            if subject is None and opts["no_new_subjects"]:
                stats["subjects_skipped"] += 1
                skipped_subjects.add(subj_slug)
                continue
            if subject is None:
                name = SUBJECT_NAMES.get(subj_slug, subj_slug.replace("-", " ").title())
                if dry:
                    subject = None
                else:
                    subject, made = Subject.objects.get_or_create(
                        slug=subj_slug, defaults={"name": name})
                    existing_subjects[subj_slug] = subject
                    if made:
                        stats["subjects_created"] += 1
                        self.stdout.write(self.style.WARNING(
                            f"  + new Subject: {name} ({subj_slug})"))
                if dry and subj_slug not in would_create_subjects:
                    # Count each learning area once, not once per strand.
                    would_create_subjects.add(subj_slug)
                    stats["subjects_created"] += 1
                    created_rows.append(("SUBJECT", subj_slug, name, ""))

            # ── Topic (= KICD strand) ────────────────────────────────────
            candidates = []
            if subject is not None:
                candidates = list(Topic.objects.filter(subject=subject, grade=grade))
            scored = sorted(((similarity(strand, t.name), t) for t in candidates),
                            key=lambda x: x[0], reverse=True)
            best_score, best = (scored[0] if scored else (0.0, None))
            strand_code = strand_codes.get((subj_slug, grade, strand), "")

            topic = None
            if best is not None and best_score >= opts["fuzzy"]:
                topic = best
                stats["topics_linked"] += 1
                linked_rows.append((f"G{grade} {subj_slug}", strand, best.name,
                                    f"{best_score:.2f}"))
            elif best is not None and best_score >= 0.60:
                stats["ambiguous"] += 1
                ambiguous_rows.append((f"G{grade} {subj_slug}", strand, best.name,
                                       f"{best_score:.2f}"))
                if opts["accept_ambiguous"]:
                    topic = best
                    stats["topics_linked"] += 1

            if topic is None and not opts["accept_ambiguous"] and best_score >= 0.60:
                # Reported above; skip until a human decides.
                continue

            if topic is None:
                stats["topics_created"] += 1
                created_rows.append((f"G{grade} {subj_slug}", "TOPIC", strand, ""))
                if not dry:
                    topic = Topic.objects.create(
                        subject=subject, grade=grade, name=strand,
                        slug=slugify(strand)[:150] or "strand",
                        kicd_code=strand_code,
                    )

            if topic is None:
                continue  # dry run, nothing to attach to

            # ── strand-level data: code + assessment rubric ──────────────
            rubric = rubrics.get((subj_slug, grade, strand))
            if not dry:
                changed = []
                if strand_code and topic.kicd_code != strand_code:
                    topic.kicd_code = strand_code
                    changed.append("kicd_code")
                if rubric and topic.assessment_rubric != rubric:
                    topic.assessment_rubric = rubric
                    changed.append("assessment_rubric")
                if changed:
                    topic.save(update_fields=changed)

            # ── Sub-strands ──────────────────────────────────────────────
            for order, s in enumerate(sorted(subs, key=lambda x: x.get("kicd_code", ""))):
                if dry:
                    stats["substrands_created"] += 1
                    continue
                obj, made = Substrand.objects.get_or_create(
                    topic=topic, name=fix_typos(s["name"])[:150],
                    defaults={"slug": slugify(s["name"])[:150]},
                )
                obj.kicd_code = s.get("kicd_code", "") or ""
                obj.order = order
                obj.rationale = s.get("rationale", "") or ""
                obj.general_outcomes = s.get("general_outcomes") or []
                obj.learning_outcomes = s.get("learning_outcomes") or []
                obj.learning_experiences = s.get("learning_experiences") or []
                obj.inquiry_questions = s.get("inquiry_questions") or []
                obj.core_competencies = s.get("core_competencies") or []
                obj.values = s.get("values") or []
                obj.pertinent_issues = s.get("pertinent_issues") or []
                obj.links_to_other_areas = s.get("links_to_other_areas") or []
                obj.suggested_duration = s.get("suggested_duration", "") or ""
                obj.resources = s.get("resources") or []
                obj.kicd_source = s.get("kicd_source", "") or ""
                obj.save()
                stats["substrands_created" if made else "substrands_updated"] += 1

        # ── report ───────────────────────────────────────────────────────
        def table(title, rows, header):
            if not rows:
                return
            self.stdout.write(f"\n{title} ({len(rows)})")
            self.stdout.write("  " + " | ".join(
                h.ljust(w) for h, w in zip(header, (22, 40, 40, 6))))
            for r in rows[:60]:
                self.stdout.write("  " + " | ".join(
                    str(c)[:w].ljust(w) for c, w in zip(r, (22, 40, 40, 6))))
            if len(rows) > 60:
                self.stdout.write(f"  ... and {len(rows) - 60} more")

        table("LINKED to an existing topic", linked_rows,
              ["subject/grade", "KICD strand", "existing topic", "score"])
        table(self.style.WARNING("AMBIGUOUS - needs your decision"), ambiguous_rows,
              ["subject/grade", "KICD strand", "closest topic", "score"])
        table("CREATED (no close match)", created_rows,
              ["subject/grade", "kind", "name", ""])

        if skipped_subjects:
            self.stdout.write(self.style.WARNING(
                f"\nSKIPPED {len(skipped_subjects)} learning areas with no Subject "
                f"row (--no-new-subjects):"))
            self.stdout.write("  " + ", ".join(sorted(skipped_subjects)))

        self.stdout.write("\n" + ("DRY RUN - nothing written\n" if dry else ""))
        for k, v in stats.items():
            self.stdout.write(f"  {k:22} {v}")

        if ambiguous_rows and not opts["accept_ambiguous"]:
            self.stdout.write(self.style.WARNING(
                f"\n{len(ambiguous_rows)} strands were NOT loaded because their best "
                f"match is uncertain. Review the AMBIGUOUS table above, then either "
                f"rename the topic in admin so it matches, or re-run with "
                f"--accept-ambiguous once you agree with the pairings."))
