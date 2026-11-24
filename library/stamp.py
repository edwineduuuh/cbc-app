"""Brand every page of a library PDF on its way out.

Each page gets the same branding as a generated paper:
  * a faint tiled watermark - the StadiSpace logo and name, on a slant;
  * a footer - logo, domain, what learners get, phone numbers, and a QR code
    to stadispace.co.ke.

The footer never covers the document: if the bottom of a page is already
used (text, drawings, a scanned image), the page is made a little taller and
the footer goes in the new strip.

The stored original is never modified; each download gets a branded copy.
"""
import functools
import math
from pathlib import Path

import fitz  # PyMuPDF

BRAND = Path(__file__).resolve().parent / "brand"

FOOTER = "StadiSpace · stadispace.co.ke · 0704 699683 / 0717 946 924"
FOOTER_PRODUCTS = ("For learners: CBE practice quizzes marked instantly · Interactive lessons · "
                   "Trivia & flash cards · Books & videos · Grades 4 - 11")

BAND = 40            # footer height, points
WM_OPACITY = 0.07    # watermark strength
INK = (0.35, 0.40, 0.48)
DARK = (0.08, 0.14, 0.23)
TEAL = (0.02, 0.47, 0.34)


def _png(svg_name: str, px: int, opacity: float = 1.0) -> bytes:
    """Render one of the brand SVGs to PNG, optionally faded."""
    svg = (BRAND / svg_name).read_bytes()
    src = fitz.open(stream=svg, filetype="svg")
    try:
        page = src[0]
        zoom = px / max(page.rect.width, page.rect.height)
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=True)
    finally:
        src.close()
    if opacity < 1.0:
        alpha = pix.samples[pix.n - 1::pix.n]
        pix.set_alpha(bytes(int(a * opacity) for a in alpha))
    return pix.tobytes("png")


@functools.lru_cache(maxsize=1)
def _assets():
    return {
        "logo": _png("symbol.svg", 96),
        "logo_faint": _png("symbol.svg", 160, WM_OPACITY),
        "qr": _png("qr-stadispace.svg", 240),
    }


@functools.lru_cache(maxsize=1)
def _watermark_tile() -> bytes:
    """One square page of logo + 'StadiSpace' rows, drawn flat. It is laid
    over each page rotated, so the rows run on a slant."""
    side = 1600
    doc = fitz.open()
    page = doc.new_page(width=side, height=side)
    logo = _assets()["logo_faint"]
    fontsize, logo_h = 30, 34
    word_w = fitz.get_text_length("StadiSpace", fontname="hebo", fontsize=fontsize)
    cell_w = logo_h + 10 + word_w + 110
    row_h = 150
    y, row = 40.0, 0
    while y < side:
        x = -cell_w / 2 if row % 2 else 0.0      # stagger alternate rows
        while x < side:
            page.insert_image(fitz.Rect(x, y, x + logo_h, y + logo_h), stream=logo)
            page.insert_text((x + logo_h + 10, y + logo_h * 0.78), "StadiSpace",
                             fontname="hebo", fontsize=fontsize, color=DARK,
                             fill_opacity=WM_OPACITY)
            x += cell_w
        y += row_h
        row += 1
    out = doc.tobytes(garbage=3, deflate=True)
    doc.close()
    return out


def _bottom_is_free(page, height: float) -> bool:
    """True when nothing is painted in the bottom `height` points."""
    band = fitz.Rect(page.rect.x0, page.rect.y1 - height, page.rect.x1, page.rect.y1)
    try:
        for _kind, bbox in page.get_bboxlog():
            r = fitz.Rect(bbox)
            if r.is_empty or r.width >= page.rect.width * 0.98 and r.height >= page.rect.height * 0.98 \
                    and _kind.startswith("fill-path"):
                continue                          # a plain page-sized background fill
            if r.intersects(band):
                return False
    except Exception:
        return False
    return True


def _make_room(page) -> None:
    """Add a BAND-high strip under the page for the footer."""
    mb = page.mediabox                            # PDF space: origin bottom-left
    page.set_mediabox(fitz.Rect(mb.x0, mb.y0 - BAND, mb.x1, mb.y1))


def _footer(page, assets) -> None:
    r = page.rect
    pad = max(18.0, r.width * 0.04)
    top = r.y1 - BAND + 4
    scale = min(1.0, r.width / 595)                 # keep it in proportion on small pages
    page.draw_line((r.x0 + pad, top), (r.x1 - pad, top), color=(0.8, 0.82, 0.86), width=0.6)
    s = 24 * scale
    page.insert_image(fitz.Rect(r.x0 + pad, top + 6, r.x0 + pad + s, top + 6 + s), stream=assets["logo"])
    q = BAND - 8
    page.insert_image(fitz.Rect(r.x1 - pad - q, top + 2, r.x1 - pad, top + 2 + q), stream=assets["qr"])
    x = r.x0 + pad + s + 8
    w = (r.x1 - pad - q - 8) - x
    page.insert_text((x, top + 15), FOOTER, fontsize=8 * scale, fontname="Helvetica-Bold", color=DARK)
    # Shrink the products line until it fits beside the QR code.
    fs = 6.8 * scale
    while fs > 4.5 and fitz.get_text_length(FOOTER_PRODUCTS, fontname="helv", fontsize=fs) > w:
        fs -= 0.2
    page.insert_text((x, top + 26), FOOTER_PRODUCTS, fontsize=fs, fontname="helv", color=INK)


def stamp_pdf(data: bytes, footer: str = FOOTER) -> bytes:
    assets = _assets()
    tile = fitz.open(stream=_watermark_tile(), filetype="pdf")
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        for page in doc:
            # Rotated pages: make the visible orientation the real one first,
            # so "bottom" means the bottom the reader sees.
            if page.rotation:
                try:
                    page.remove_rotation()
                except Exception:
                    pass
            if page.rotation == 0 and not _bottom_is_free(page, BAND):
                _make_room(page)
            r = page.rect
            # A square bigger than the page, so the slanted rows reach every corner.
            side = math.hypot(r.width, r.height) * 1.45
            cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
            page.show_pdf_page(fitz.Rect(cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2),
                               tile, 0, rotate=30, overlay=True, keep_proportion=True)
            _footer(page, assets)
        return doc.tobytes(garbage=3, deflate=True)
    finally:
        doc.close()
        tile.close()


def page_count(data: bytes):
    try:
        with fitz.open(stream=data, filetype="pdf") as doc:
            return doc.page_count
    except Exception:
        return None
