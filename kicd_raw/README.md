# kicd_raw - paste the KICD curriculum design PDFs here

This folder is the input to `python manage.py ingest_kicd`.
PDFs here are **gitignored** (large, and KICD holds the copyright). Only this
README is committed.

## 1. Where to download

Designs are published one PDF per grade per learning area:

- Grade 4:  https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-four-designs/
- Grade 5:  https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-five-designs/
- Grade 6:  https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-six-designs/
- Grade 7:  https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-seven-designs/
- Grade 8:  https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-eight-designs/
- Grade 9:  https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-nine-designs/
- Grade 10: https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-ten-designs/

## 2. How to name the file

    grade{N}-{subject-slug}.pdf

The filename is how the parser knows the grade and learning area, so it does
not have to spend tokens reading cover pages. A file that does not match this
pattern stops the run instead of being guessed at.

`{subject-slug}` must be one of these, exactly as spelled (these are the
`subjects.slug` values already in the database):

| Subject in app               | slug to use in the filename     |
|------------------------------|---------------------------------|
| Agriculture & Nutrition      | `agriculture-nutrition`         |
| Building and Construction    | `building-and-construction`     |
| Christian Religious Education| `christian-religious-education` |
| Core Mathematics             | `core-mathematics`              |
| Creative Arts and Sports     | `creative-arts-and-sports`      |
| English                      | `english`                       |
| Integrated Science           | `integrated-science`            |
| Islamic Religious Education  | `islamic-religious-education`   |
| Kiswahili                    | `kiswahili`                     |
| Mathematics                  | `mathematics`                   |
| Pre-Technical Studies        | `pre-technical-studies`         |
| Science and Technology       | `science-and-technology`        |
| Social Studies               | `social-studies`                |

KICD's own download names vary ("JSS-Grade-8-Mathematics-Curriculum-Design.pdf"
and so on). Rename after downloading.

## 3. First batch - these 15 files

Start here, not with everything. These are the grades and subjects where the
1,067 existing questions already live, so ingesting them immediately improves
real marking keys:

    grade4-mathematics.pdf
    grade5-mathematics.pdf
    grade6-mathematics.pdf
    grade7-mathematics.pdf
    grade8-mathematics.pdf
    grade9-mathematics.pdf
    grade7-integrated-science.pdf
    grade8-integrated-science.pdf
    grade9-integrated-science.pdf
    grade4-science-and-technology.pdf
    grade5-science-and-technology.pdf
    grade6-science-and-technology.pdf
    grade8-pre-technical-studies.pdf
    grade9-pre-technical-studies.pdf
    grade9-social-studies.pdf

Partial batches are fine. The ingest command processes whatever is present and
can be re-run as you add more; already-parsed files are skipped unless you pass
`--force`.

## 4. Then run

    python manage.py ingest_kicd            # PDFs -> kicd_parsed/*.json
    python manage.py load_kicd --dry-run    # review the strand match report
    python manage.py load_kicd              # write to the database

`ingest_kicd` exits non-zero if any page could not be parsed into valid
substrand data, and lists the file and page number in
`kicd_parsed/_unresolved.json`. Nothing is loaded silently incomplete.
