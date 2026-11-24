"""Draw mathematical figures exactly, from a specification, as SVG.

An image model cannot put a point at (3, 7). Asked for a coordinate grid it
produces a picture OF a grid - a blank one with arrows labelled "unit
intervals" and "origin" - because it is drawing what grids look like, not
plotting anything. For a question that says "use the diagram above", that is
useless, and no prompt fixes it.

So anything where position carries meaning - a number line, a straight line,
a shaded inequality region, a plotted point - is rendered here from numbers
instead. The model supplies a spec; this module does the geometry.

That makes maths figures exact, free (no image API call), instant instead of
forty seconds, and identical every time the same spec comes up. The image
model is kept for pictures of real things - a leaf section, an apparatus
set-up - where being approximate is fine.

No new dependency: SVG is text, prints sharply at any size, and an <img> tag
renders it like any other picture.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re

logger = logging.getLogger("generation")


class PlotError(ValueError):
    """The spec could not be drawn. The caller falls back or drops it."""


# ── parsing a linear equation or inequality ───────────────────────────────
# Model text is never executed. It is matched against this and nothing else.
_TERM = re.compile(r"\s*([+-]?)\s*(\d+(?:\.\d+)?)?\s*\*?\s*([xy])?\s*")
_OPS = ["<=", ">=", "=<", "=>", "<", ">", "=", "≤", "≥"]
_NORMAL_OP = {"=<": "<=", "=>": ">=", "≤": "<=", "≥": ">=", "==": "="}


def _parse_side(text: str):
    """'2x + 3' -> (a, b, c) meaning a*x + b*y + c."""
    a = b = c = 0.0
    pos, seen = 0, False
    s = (text or "").replace("−", "-").strip()
    if not s:
        raise PlotError("empty side")
    while pos < len(s):
        m = _TERM.match(s, pos)
        if not m or m.end() == pos:
            raise PlotError(f"cannot read {text!r} at {s[pos:pos + 10]!r}")
        sign, num, var = m.group(1), m.group(2), m.group(3)
        if num is None and var is None:
            raise PlotError(f"cannot read {text!r}")
        k = float(num) if num is not None else 1.0
        if sign == "-":
            k = -k
        if var == "x":
            a += k
        elif var == "y":
            b += k
        else:
            c += k
        seen = True
        pos = m.end()
    if not seen:
        raise PlotError(f"cannot read {text!r}")
    return a, b, c


def parse_relation(text: str):
    """'y <= 2x + 1' -> (a, b, c, op) meaning a*x + b*y OP c."""
    s = (text or "").replace("−", "-").strip()
    for op in _OPS:
        i = s.find(op)
        if i == -1:
            continue
        left, right = s[:i], s[i + len(op):]
        la, lb, lc = _parse_side(left)
        ra, rb, rc = _parse_side(right)
        a, b, c = la - ra, lb - rb, rc - lc
        if a == 0 and b == 0:
            raise PlotError(f"{text!r} is not a line")
        return a, b, c, _NORMAL_OP.get(op, op)
    raise PlotError(f"no relation in {text!r}")


# ── SVG helpers ───────────────────────────────────────────────────────────
def _fmt(v: float) -> str:
    return f"{v:.2f}".rstrip("0").rstrip(".")


def _num(v: float) -> str:
    """Tick labels: integers stay integers."""
    return str(int(round(v))) if abs(v - round(v)) < 1e-9 else f"{v:g}"


def _nice_step(span: float) -> float:
    """A step a learner would rule on squared paper.

    Aim for 4 to 12 divisions and prefer whole numbers: a y-axis running 0 to
    4 should be ruled every 1, not every 0.5. Fractions are only used when
    the range is genuinely small.
    """
    if span <= 0:
        return 1.0
    for step in (1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000,
                 2000, 5000):
        if 3 <= span / step <= 12:
            return float(step)
    if span < 3:
        for step in (0.1, 0.2, 0.25, 0.5):
            if 3 <= span / step <= 12:
                return float(step)
    return float(max(span / 10.0, 1e-9))


def _frange(lo, hi, step):
    out, k = [], 0
    start = step * (int(lo / step) - 1)
    while True:
        v = start + k * step
        k += 1
        if v > hi + 1e-9:
            break
        if v >= lo - 1e-9:
            out.append(round(v, 10))
        if k > 500:
            break
    return out


# ── half-plane clipping, so a shaded region is exactly right ──────────────
def _clip(poly, a, b, c):
    """Sutherland-Hodgman: keep the part of poly where a*x + b*y <= c."""
    if not poly:
        return []
    out = []
    n = len(poly)
    for i in range(n):
        cur, nxt = poly[i], poly[(i + 1) % n]
        dc = a * cur[0] + b * cur[1] - c
        dn = a * nxt[0] + b * nxt[1] - c
        cur_in, nxt_in = dc <= 1e-9, dn <= 1e-9
        if cur_in:
            out.append(cur)
        if cur_in != nxt_in and abs(dc - dn) > 1e-12:
            t = dc / (dc - dn)
            out.append((cur[0] + t * (nxt[0] - cur[0]),
                        cur[1] + t * (nxt[1] - cur[1])))
    return out


# ── cartesian ─────────────────────────────────────────────────────────────
PAD = 46
CELL = 44          # pixels per unit step, before fitting


def _cartesian(spec: dict) -> tuple[str, str]:
    xr = spec.get("x_range") or [-5, 5]
    yr = spec.get("y_range") or [-5, 5]
    try:
        x0, x1 = float(xr[0]), float(xr[1])
        y0, y1 = float(yr[0]), float(yr[1])
    except (TypeError, ValueError, IndexError):
        raise PlotError("bad range")
    if x1 <= x0 or y1 <= y0:
        raise PlotError("empty range")

    xs = float(spec.get("x_step") or _nice_step(x1 - x0))
    ys = float(spec.get("y_step") or _nice_step(y1 - y0))
    if xs <= 0 or ys <= 0:
        raise PlotError("bad step")

    nx, ny = (x1 - x0) / xs, (y1 - y0) / ys
    if nx > 60 or ny > 60:
        raise PlotError("too many grid lines")

    # Axis titles: a real-world graph is read by its quantities ("Time
    # (hours)", "Distance (km)"), and an unlabelled one is not a graph a
    # learner can read. Pure x-y algebra leaves them out and keeps x and y.
    x_label = str(spec.get("x_label") or "").strip()[:40]
    y_label = str(spec.get("y_label") or "").strip()[:40]

    # Size the squares to the figure rather than fixing them: a 4x6 grid at a
    # fixed 44px prints too small for a learner to draw a line on, and a 20x20
    # one would run off the page. When the two axes step differently they
    # measure different things (hours against km), so the cells need not be
    # square - forcing them square made a 6-by-12 graph a tall thin strip.
    if abs(xs - ys) < 1e-9:
        cx = cy = max(26.0, min(74.0, 560.0 / max(nx, ny, 1)))
    else:
        cx = max(26.0, min(74.0, 520.0 / max(nx, 1)))
        cy = max(20.0, min(74.0, 380.0 / max(ny, 1)))
    pad_l = PAD + (26 if y_label else 0)
    pad_b = PAD + (22 if x_label else 0)
    pad_r, pad_t = PAD, PAD
    w, h = pad_l + pad_r + cx * nx, pad_t + pad_b + cy * ny

    def px(x):
        return pad_l + (x - x0) / (x1 - x0) * (w - pad_l - pad_r)

    def py(y):
        return h - pad_b - (y - y0) / (y1 - y0) * (h - pad_t - pad_b)

    parts = [
        f'<rect width="{_fmt(w)}" height="{_fmt(h)}" fill="#ffffff"/>',
        '<defs><pattern id="hatch" width="7" height="7" '
        'patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
        '<line x1="0" y1="0" x2="0" y2="7" stroke="#333" stroke-width="1.1"/>'
        '</pattern></defs>',
    ]

    # grid
    g = []
    for x in _frange(x0, x1, xs):
        g.append(f'M{_fmt(px(x))},{_fmt(py(y0))}V{_fmt(py(y1))}')
    for y in _frange(y0, y1, ys):
        g.append(f'M{_fmt(px(x0))},{_fmt(py(y))}H{_fmt(px(x1))}')
    parts.append(f'<path d="{"".join(g)}" stroke="#c9d2dd" stroke-width="1" '
                 f'fill="none"/>')

    rect = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]

    # shaded regions, clipped exactly to each inequality
    shades = spec.get("shade") or []
    if isinstance(shades, (str, dict)):
        shades = [shades]
    for sh in shades:
        expr = sh.get("inequality") if isinstance(sh, dict) else sh
        try:
            a, b, c, op = parse_relation(str(expr))
        except PlotError as e:
            logger.info("skipping unshadeable region %r: %s", expr, e)
            continue
        if op in (">", ">="):
            a, b, c = -a, -b, -c
        poly = _clip(rect, a, b, c)
        if len(poly) >= 3:
            pts = " ".join(f"{_fmt(px(p[0]))},{_fmt(py(p[1]))}" for p in poly)
            parts.append(f'<polygon points="{pts}" fill="url(#hatch)" '
                         f'fill-opacity="0.55"/>')

    # axes with arrowheads
    ax_y = py(0) if y0 <= 0 <= y1 else py(y0)
    ax_x = px(0) if x0 <= 0 <= x1 else px(x0)
    parts.append(
        f'<path d="M{_fmt(px(x0))},{_fmt(ax_y)}H{_fmt(px(x1) + 10)}" '
        f'stroke="#111" stroke-width="1.6" fill="none"/>'
        f'<path d="M{_fmt(px(x1) + 10)},{_fmt(ax_y)}l-7,-3.6v7.2z" fill="#111"/>'
        f'<path d="M{_fmt(ax_x)},{_fmt(py(y0))}V{_fmt(py(y1) - 10)}" '
        f'stroke="#111" stroke-width="1.6" fill="none"/>'
        f'<path d="M{_fmt(ax_x)},{_fmt(py(y1) - 10)}l-3.6,7h7.2z" fill="#111"/>')
    if x_label:
        parts.append(
            f'<text x="{_fmt((px(x0) + px(x1)) / 2)}" y="{_fmt(h - 10)}" '
            f'font-size="14" font-weight="600" text-anchor="middle" '
            f'fill="#111">{_esc(x_label)}</text>')
    else:
        parts.append(
            f'<text x="{_fmt(px(x1) + 14)}" y="{_fmt(ax_y + 4)}" font-size="13" '
            f'font-style="italic" fill="#111">x</text>')
    if y_label:
        cy_mid = (py(y0) + py(y1)) / 2
        parts.append(
            f'<text x="16" y="{_fmt(cy_mid)}" font-size="14" font-weight="600" '
            f'text-anchor="middle" fill="#111" '
            f'transform="rotate(-90 16 {_fmt(cy_mid)})">{_esc(y_label)}</text>')
    else:
        parts.append(
            f'<text x="{_fmt(ax_x + 7)}" y="{_fmt(py(y1) - 14)}" font-size="13" '
            f'font-style="italic" fill="#111">y</text>')

    # tick labels
    for x in _frange(x0, x1, xs):
        if abs(x) < 1e-9:
            continue
        parts.append(
            f'<path d="M{_fmt(px(x))},{_fmt(ax_y - 4)}v8" stroke="#111" '
            f'stroke-width="1.3"/>'
            f'<text x="{_fmt(px(x))}" y="{_fmt(ax_y + 18)}" font-size="12" '
            f'text-anchor="middle" fill="#111">{_num(x)}</text>')
    for y in _frange(y0, y1, ys):
        if abs(y) < 1e-9:
            continue
        parts.append(
            f'<path d="M{_fmt(ax_x - 4)},{_fmt(py(y))}h8" stroke="#111" '
            f'stroke-width="1.3"/>'
            f'<text x="{_fmt(ax_x - 8)}" y="{_fmt(py(y) + 4)}" font-size="12" '
            f'text-anchor="end" fill="#111">{_num(y)}</text>')
    if x0 <= 0 <= x1 and y0 <= 0 <= y1:
        parts.append(f'<text x="{_fmt(px(0) - 8)}" y="{_fmt(py(0) + 16)}" '
                     f'font-size="12" text-anchor="end" fill="#111">0</text>')

    # lines
    described = []
    lines = spec.get("lines") or []
    if isinstance(lines, (str, dict)):
        lines = [lines]
    for ln in lines:
        expr = ln.get("equation") if isinstance(ln, dict) else ln
        style = (ln.get("style") if isinstance(ln, dict) else "") or "solid"
        try:
            a, b, c, _ = parse_relation(str(expr))
        except PlotError as e:
            logger.info("skipping undrawable line %r: %s", expr, e)
            continue
        seg = _segment(a, b, c, x0, x1, y0, y1)
        if not seg:
            continue
        dash = ' stroke-dasharray="8 5"' if str(style).startswith("dash") else ""
        (ax_, ay_), (bx_, by_) = seg
        parts.append(
            f'<line x1="{_fmt(px(ax_))}" y1="{_fmt(py(ay_))}" '
            f'x2="{_fmt(px(bx_))}" y2="{_fmt(py(by_))}" stroke="#111" '
            f'stroke-width="2.2"{dash}/>')
        described.append(f"the {'dashed' if dash else 'solid'} line {expr}")

    # shade boundaries are dashed for strict inequalities, so add them too
    for sh in shades:
        if not isinstance(sh, dict):
            continue
        expr = sh.get("inequality")
        try:
            a, b, c, op = parse_relation(str(expr))
        except PlotError:
            continue
        seg = _segment(a, b, c, x0, x1, y0, y1)
        if not seg:
            continue
        dash = ' stroke-dasharray="8 5"' if op in ("<", ">") else ""
        (ax_, ay_), (bx_, by_) = seg
        parts.append(
            f'<line x1="{_fmt(px(ax_))}" y1="{_fmt(py(ay_))}" '
            f'x2="{_fmt(px(bx_))}" y2="{_fmt(py(by_))}" stroke="#111" '
            f'stroke-width="2.2"{dash}/>')
        described.append(
            f"the region {expr} shaded, with a "
            f"{'broken' if dash else 'solid'} boundary")

    # points
    for p in (spec.get("points") or []):
        try:
            x, y = float(p["x"]), float(p["y"])
        except (TypeError, ValueError, KeyError):
            continue
        if not (x0 <= x <= x1 and y0 <= y <= y1):
            continue
        parts.append(f'<circle cx="{_fmt(px(x))}" cy="{_fmt(py(y))}" r="4.2" '
                     f'fill="#111"/>')
        label = str(p.get("label") or "")
        if label:
            # Up and to the left, with a white halo, so a label never sits
            # on the line through its point.
            parts.append(
                f'<text x="{_fmt(px(x) - 9)}" y="{_fmt(py(y) - 9)}" '
                f'font-size="14" font-weight="700" text-anchor="end" fill="#111" '
                f'stroke="#fff" stroke-width="4" paint-order="stroke">{_esc(label)}</text>')
            described.append(f"the point {label} at ({_num(x)}, {_num(y)})")
        else:
            described.append(f"a point at ({_num(x)}, {_num(y)})")

    alt = (spec.get("alt") or "").strip() or (
        f"A coordinate grid from {_num(x0)} to {_num(x1)} on the x-axis and "
        f"{_num(y0)} to {_num(y1)} on the y-axis showing "
        + (", ".join(described) if described else "no plotted features") + ".")

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{_fmt(w)}" '
           f'height="{_fmt(h)}" viewBox="0 0 {_fmt(w)} {_fmt(h)}" '
           f'role="img" font-family="Arial, Helvetica, sans-serif" aria-label="{_esc(alt)}">' + "".join(parts) + "</svg>")
    return svg, alt


def _segment(a, b, c, x0, x1, y0, y1):
    """Where a*x + b*y = c crosses the plotting rectangle."""
    pts = []
    if b != 0:
        for x in (x0, x1):
            y = (c - a * x) / b
            if y0 - 1e-9 <= y <= y1 + 1e-9:
                pts.append((x, y))
    if a != 0:
        for y in (y0, y1):
            x = (c - b * y) / a
            if x0 - 1e-9 <= x <= x1 + 1e-9:
                pts.append((x, y))
    uniq = []
    for p in pts:
        if not any(abs(p[0] - q[0]) < 1e-9 and abs(p[1] - q[1]) < 1e-9
                   for q in uniq):
            uniq.append(p)
    return (uniq[0], uniq[1]) if len(uniq) >= 2 else None


# ── number line ───────────────────────────────────────────────────────────
def _number_line(spec: dict) -> tuple[str, str]:
    try:
        lo, hi = float(spec.get("min", 0)), float(spec.get("max", 10))
    except (TypeError, ValueError):
        raise PlotError("bad range")
    if hi <= lo:
        raise PlotError("empty range")
    step = float(spec.get("step") or _nice_step(hi - lo))
    if step <= 0 or (hi - lo) / step > 60:
        raise PlotError("bad step")

    w, h = 120 + 52 * ((hi - lo) / step), 110
    y = 62

    def px(v):
        return 60 + (v - lo) / (hi - lo) * (w - 120)

    parts = [f'<rect width="{_fmt(w)}" height="{h}" fill="#ffffff"/>']
    described = []

    # shaded span, drawn under the line
    for sh in (spec.get("shade") or []):
        if not isinstance(sh, dict):
            continue
        f = sh.get("from")
        t = sh.get("to")
        a = lo if f in (None, "-inf", "-infinity") else float(f)
        b = hi if t in (None, "inf", "infinity") else float(t)
        a, b = max(lo, min(a, b)), min(hi, max(a, b))
        parts.append(
            f'<line x1="{_fmt(px(a))}" y1="{y}" x2="{_fmt(px(b))}" y2="{y}" '
            f'stroke="#111" stroke-width="6" stroke-opacity="0.32"/>')
        described.append(f"the span from {_num(a)} to {_num(b)} marked")

    parts.append(
        f'<path d="M{_fmt(px(lo) - 22)},{y}H{_fmt(px(hi) + 22)}" stroke="#111" '
        f'stroke-width="1.8" fill="none"/>'
        f'<path d="M{_fmt(px(hi) + 22)},{y}l-8,-4v8z" fill="#111"/>'
        f'<path d="M{_fmt(px(lo) - 22)},{y}l8,-4v8z" fill="#111"/>')

    for v in _frange(lo, hi, step):
        parts.append(
            f'<path d="M{_fmt(px(v))},{y - 7}v14" stroke="#111" '
            f'stroke-width="1.4"/>'
            f'<text x="{_fmt(px(v))}" y="{y + 28}" font-size="13" '
            f'text-anchor="middle" fill="#111">{_num(v)}</text>')

    for m in (spec.get("mark") or []):
        if not isinstance(m, dict):
            continue
        try:
            at = float(m.get("at"))
        except (TypeError, ValueError):
            continue
        if not (lo <= at <= hi):
            continue
        closed = bool(m.get("closed", True))
        parts.append(
            f'<circle cx="{_fmt(px(at))}" cy="{y}" r="6.5" '
            f'fill="{"#111" if closed else "#fff"}" stroke="#111" '
            f'stroke-width="2"/>')
        described.append(
            f"{'a filled' if closed else 'an open'} circle at {_num(at)}")

    alt = (spec.get("alt") or "").strip() or (
        f"A number line from {_num(lo)} to {_num(hi)} in steps of "
        f"{_num(step)}"
        + (" with " + ", ".join(described) if described else "") + ".")

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{_fmt(w)}" '
           f'height="{h}" viewBox="0 0 {_fmt(w)} {h}" role="img" '
           f'aria-label="{_esc(alt)}">' + "".join(parts) + "</svg>")
    return svg, alt


def _esc(s: str) -> str:
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


# ── geometry ──────────────────────────────────────────────────────────────
def _anchor(dx: float) -> str:
    """Text grows away from what it labels: to the right of it, to the left,
    or centred when the label sits above or below."""
    return "start" if dx > 0.35 else "end" if dx < -0.35 else "middle"


def _geometry(spec: dict) -> tuple[str, str]:
    """A geometry figure drawn to measure: named points, sides, side lengths,
    angle arcs with their sizes, right-angle boxes and extended lines.

    The model gives coordinates; this draws them exactly. An image model asked
    for "a right-angled triangle with sides 5 m and 12 m" draws something
    triangle-shaped with the labels wherever it likes - not a figure a learner
    can trust.
    """
    import math

    raw = spec.get("points") or {}
    if isinstance(raw, list):           # [{"name": "A", "x": 0, "y": 0}, ...]
        raw = {str(p.get("name") or p.get("label")): [p.get("x"), p.get("y")]
               for p in raw if isinstance(p, dict)}
    pts = {}
    for name, xy in list(raw.items())[:16]:
        try:
            pts[str(name)] = (float(xy[0]), float(xy[1]))
        except (TypeError, ValueError, IndexError):
            raise PlotError(f"bad point {name!r}")
    if len(pts) < 2:
        raise PlotError("a geometry figure needs at least two points")

    def pair(v):
        if isinstance(v, dict):
            v = v.get("side") or v.get("between") or [v.get("from"), v.get("to")]
        if isinstance(v, str):
            v = [c for c in v if c in pts] if len(v) <= 3 else v.split("-")
        a, b = (str(v[0]), str(v[1])) if v and len(v) >= 2 else (None, None)
        if a not in pts or b not in pts:
            raise PlotError(f"unknown points in {v!r}")
        return a, b

    xs_ = [p[0] for p in pts.values()]
    ys_ = [p[1] for p in pts.values()]
    span_x = max(xs_) - min(xs_) or 1.0
    span_y = max(ys_) - min(ys_) or 1.0
    scale = min(460.0 / span_x, 300.0 / span_y)
    pad = 56
    w = span_x * scale + 2 * pad
    h = span_y * scale + 2 * pad

    def at(name):
        x, y = pts[name]
        return (pad + (x - min(xs_)) * scale, h - pad - (y - min(ys_)) * scale)

    cxs = [at(n)[0] for n in pts]
    cys = [at(n)[1] for n in pts]
    centre = (sum(cxs) / len(cxs), sum(cys) / len(cys))

    def unit(dx, dy):
        d = math.hypot(dx, dy)
        return (dx / d, dy / d) if d > 1e-9 else (0.0, -1.0)

    parts = [f'<rect width="{_fmt(w)}" height="{_fmt(h)}" fill="#ffffff"/>']

    fill = spec.get("fill") or spec.get("polygon_fill")
    if isinstance(fill, list) and len(fill) >= 3 and all(str(n) in pts for n in fill):
        poly = " ".join(f"{_fmt(at(str(n))[0])},{_fmt(at(str(n))[1])}" for n in fill)
        parts.append(f'<polygon points="{poly}" fill="#f2f2f2"/>')

    described = []
    for seg in (spec.get("segments") or [])[:24]:
        a, b = pair(seg)
        (ax_, ay_), (bx_, by_) = at(a), at(b)
        parts.append(f'<line x1="{_fmt(ax_)}" y1="{_fmt(ay_)}" x2="{_fmt(bx_)}" '
                     f'y2="{_fmt(by_)}" stroke="#111" stroke-width="2.2" '
                     f'stroke-linecap="round"/>')

    for ra in (spec.get("right_angles") or [])[:8]:
        v = str(ra.get("at")) if isinstance(ra, dict) else ""
        if v not in pts:
            continue
        p1, p2 = pair(ra.get("between") or ra.get("sides") or [])
        (vx, vy) = at(v)
        u1 = unit(at(p1)[0] - vx, at(p1)[1] - vy)
        u2 = unit(at(p2)[0] - vx, at(p2)[1] - vy)
        k = 14
        parts.append(
            f'<path d="M{_fmt(vx + k * u1[0])},{_fmt(vy + k * u1[1])} '
            f'L{_fmt(vx + k * u1[0] + k * u2[0])},{_fmt(vy + k * u1[1] + k * u2[1])} '
            f'L{_fmt(vx + k * u2[0])},{_fmt(vy + k * u2[1])}" fill="none" '
            f'stroke="#111" stroke-width="1.5"/>')
        described.append(f"a right angle at {v}")

    for an in (spec.get("angles") or [])[:10]:
        if not isinstance(an, dict) or str(an.get("at")) not in pts:
            continue
        v = str(an["at"])
        p1, p2 = pair(an.get("between") or an.get("sides") or [])
        (vx, vy) = at(v)
        u1 = unit(at(p1)[0] - vx, at(p1)[1] - vy)
        u2 = unit(at(p2)[0] - vx, at(p2)[1] - vy)
        a1, a2 = math.atan2(u1[1], u1[0]), math.atan2(u2[1], u2[0])
        delta = (a2 - a1 + math.pi) % (2 * math.pi) - math.pi
        r = 26
        sweep = 1 if delta > 0 else 0
        parts.append(
            f'<path d="M{_fmt(vx + r * u1[0])},{_fmt(vy + r * u1[1])} '
            f'A{r},{r} 0 0 {sweep} {_fmt(vx + r * u2[0])},{_fmt(vy + r * u2[1])}" '
            f'fill="none" stroke="#111" stroke-width="1.5"/>')
        text = str(an.get("text") or an.get("label") or "").strip()[:12]
        if text:
            bis = unit(u1[0] + u2[0], u1[1] + u2[1])
            if abs(u1[0] + u2[0]) < 1e-6 and abs(u1[1] + u2[1]) < 1e-6:
                bis = (-u1[1], u1[0])           # a straight angle: go sideways
            # A narrow angle needs its label further out to clear the arms.
            rl = r + 10 + max(0.0, (0.7 - abs(delta)) * 30)
            parts.append(
                f'<text x="{_fmt(vx + rl * bis[0])}" y="{_fmt(vy + rl * bis[1] + 5)}" '
                f'font-size="15" text-anchor="{_anchor(bis[0])}" fill="#111" '
                f'stroke="#fff" stroke-width="4" paint-order="stroke">{_esc(text)}</text>')
            described.append(f"angle {text} at {v}")

    for sl in (spec.get("side_labels") or [])[:12]:
        if not isinstance(sl, dict):
            continue
        a, b = pair(sl)
        text = str(sl.get("text") or sl.get("label") or "").strip()[:16]
        if not text:
            continue
        (ax_, ay_), (bx_, by_) = at(a), at(b)
        mx, my = (ax_ + bx_) / 2, (ay_ + by_) / 2
        n = unit(-(by_ - ay_), bx_ - ax_)
        # Put the label on the outside of the figure.
        if (mx + n[0] - centre[0]) ** 2 + (my + n[1] - centre[1]) ** 2 < \
                (mx - centre[0]) ** 2 + (my - centre[1]) ** 2:
            n = (-n[0], -n[1])
        italic = ' font-style="italic"' if len(text) <= 2 and text.isalpha() else ""
        parts.append(
            f'<text x="{_fmt(mx + 12 * n[0])}" y="{_fmt(my + 14 * n[1] + 5)}" '
            f'font-size="15" text-anchor="{_anchor(n[0])}"{italic} fill="#111" '
            f'stroke="#fff" stroke-width="4" paint-order="stroke">{_esc(text)}</text>')
        described.append(f"side {a}{b} marked {text}")

    dots = {str(d) for d in (spec.get("dots") or []) if str(d) in pts}
    hidden = {str(d) for d in (spec.get("hide_labels") or [])}
    # Every line leaving each point - including lines the point sits in the
    # middle of (P on AB and on EF) - so its label can go in the widest gap
    # between them instead of on top of one.
    drawn = []
    for seg in (spec.get("segments") or [])[:24]:
        try:
            drawn.append(pair(seg))
        except PlotError:
            pass

    def directions(name):
        x, y = at(name)
        out = []
        for a, b in drawn:
            (ax_, ay_), (bx_, by_) = at(a), at(b)
            for (ex, ey), other in (((ax_, ay_), (bx_, by_)), ((bx_, by_), (ax_, ay_))):
                if abs(ex - x) < 0.5 and abs(ey - y) < 0.5:
                    out.append(math.atan2(other[1] - y, other[0] - x))
            # the point lies inside this segment: both ways out
            seg_len = math.hypot(bx_ - ax_, by_ - ay_)
            if seg_len > 1:
                t = ((x - ax_) * (bx_ - ax_) + (y - ay_) * (by_ - ay_)) / seg_len ** 2
                dist = abs((bx_ - ax_) * (ay_ - y) - (ax_ - x) * (by_ - ay_)) / seg_len
                if 0.02 < t < 0.98 and dist < 1.0:
                    out.append(math.atan2(by_ - ay_, bx_ - ax_))
                    out.append(math.atan2(ay_ - by_, ax_ - bx_))
        # A marked angle or right angle at this point is taken space too.
        for mark in list(spec.get("angles") or []) + list(spec.get("right_angles") or []):
            if not isinstance(mark, dict) or str(mark.get("at")) != name:
                continue
            try:
                p1, p2 = pair(mark.get("between") or mark.get("sides") or [])
            except PlotError:
                continue
            u1 = unit(at(p1)[0] - x, at(p1)[1] - y)
            u2 = unit(at(p2)[0] - x, at(p2)[1] - y)
            out.append(math.atan2(u1[1] + u2[1], u1[0] + u2[0]))
        return out

    for name in pts:
        x, y = at(name)
        if name in dots:
            parts.append(f'<circle cx="{_fmt(x)}" cy="{_fmt(y)}" r="3.8" fill="#111"/>')
        if name in hidden:
            continue
        angs = sorted(directions(name))
        if angs:
            gaps = [((angs[(i + 1) % len(angs)] - angs[i]) % (2 * math.pi) or 2 * math.pi, angs[i])
                    for i in range(len(angs))]
            width, start = max(gaps)
            mid = start + width / 2
            u = (math.cos(mid), math.sin(mid))
        else:
            u = unit(x - centre[0], y - centre[1])
        parts.append(
            f'<text x="{_fmt(x + 17 * u[0])}" y="{_fmt(y + 17 * u[1] + 6)}" '
            f'font-size="16" font-weight="700" text-anchor="middle" '
            f'fill="#111" stroke="#fff" stroke-width="4" paint-order="stroke">{_esc(name)}</text>')

    alt = (spec.get("alt") or "").strip() or (
        "A geometry figure with points " + ", ".join(pts)
        + (" showing " + ", ".join(described) if described else "") + ".")
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{_fmt(w)}" '
           f'height="{_fmt(h)}" viewBox="0 0 {_fmt(w)} {_fmt(h)}" '
           f'role="img" font-family="Arial, Helvetica, sans-serif" aria-label="{_esc(alt)}">' + "".join(parts) + "</svg>")
    return svg, alt


_KINDS = {
    "geometry": _geometry,
    "shape": _geometry,
    "triangle": _geometry,
    "polygon": _geometry,
    "cartesian": _cartesian,
    "grid": _cartesian,
    "graph": _cartesian,
    "coordinate_grid": _cartesian,
    "number_line": _number_line,
    "numberline": _number_line,
}


def render_plot(spec: dict) -> tuple[bytes, str]:
    """(svg bytes, alt text). Raises PlotError if the spec cannot be drawn."""
    if not isinstance(spec, dict):
        raise PlotError("not a spec")
    kind = str(spec.get("type") or "").strip().lower().replace("-", "_")
    fn = _KINDS.get(kind)
    if not fn:
        raise PlotError(f"unknown plot type {kind!r}")
    svg, alt = fn(spec)
    return svg.encode("utf-8"), alt


def plot_key(spec: dict) -> str:
    """Same figure, same key - drawn once, reused for ever."""
    raw = json.dumps(spec, sort_keys=True, default=str).encode("utf-8")
    return "p" + hashlib.sha256(raw).hexdigest()[:31]
