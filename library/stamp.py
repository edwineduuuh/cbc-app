"""Stamp the StadiSpace contact line on every page of a PDF on its way out.

The stored original is never modified; each download gets a stamped copy.
"""
import fitz  # PyMuPDF

FOOTER = "StadiSpace · stadispace.co.ke · 0704 699683 / 0717 946 924"


def stamp_pdf(data: bytes, footer: str = FOOTER) -> bytes:
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        for page in doc:
            r = page.rect
            box = fitz.Rect(r.x0 + 24, r.y1 - 22, r.x1 - 24, r.y1 - 8)
            page.insert_textbox(box, footer, fontsize=7.5, fontname="helv",
                                color=(0.35, 0.40, 0.48), align=fitz.TEXT_ALIGN_CENTER)
        return doc.tobytes(garbage=3, deflate=True)
    finally:
        doc.close()


def page_count(data: bytes):
    try:
        with fitz.open(stream=data, filetype="pdf") as doc:
            return doc.page_count
    except Exception:
        return None
