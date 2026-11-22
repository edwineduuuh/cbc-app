import katex from "katex";

/**
 * One math renderer for the whole app.
 *
 * The old renderers ran four regex passes one after another ($$…$$, then
 * $…$, then \[…\], then \(…\)). The HTML produced by an early pass was then
 * re-scanned by the later ones, so a single stray or unbalanced "$" made
 * KaTeX parse its own HTML output and print it in red - learners saw what
 * looked like broken code. This makes ONE pass: every math fragment is found
 * once and rendered once, and its output is never looked at again.
 *
 * A fragment that will not parse is shown as readable text (3/4, √, ×),
 * never as a red KaTeX error.
 */

const MATH_RE =
  // Inline $…$ must hug its content ("$x$", not "$ x $") and the closing $
  // may not be followed by a digit - the usual rule that keeps broken or
  // unbalanced dollars from swallowing ordinary sentences.
  /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$(?!\s)([^$\n]*?[^\s$])\$(?!\d)/g;

function patchSvg(html) {
  return html.replace(/<svg([^>]*)>/g, (_, attrs) =>
    attrs.includes('style="')
      ? "<svg" + attrs.replace('style="', 'style="display:inline;') + ">"
      : '<svg style="display:inline;"' + attrs + ">",
  );
}

/** LaTeX as plain readable text, for fragments KaTeX can't render. */
export function latexToText(s) {
  return String(s)
    .replace(/\\times/g, " × ")
    .replace(/\\div/g, " ÷ ")
    .replace(/\\cdot/g, " · ")
    .replace(/\\pm/g, " ± ")
    .replace(/\\le(q)?\b/g, " ≤ ")
    .replace(/\\ge(q)?\b/g, " ≥ ")
    .replace(/\\neq\b/g, " ≠ ")
    .replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2")
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)")
    .replace(/\\(?:text|mathrm|mathbf|mathit|operatorname|boxed)\s*\{([^{}]*)\}/g, "$1")
    .replace(/\^\s*\{([^{}]*)\}/g, "^$1")
    .replace(/_\s*\{([^{}]*)\}/g, "_$1")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}$]/g, "")
    .replace(/&#x9;|\t/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Render one TeX fragment to HTML; null if it does not parse. */
export function texToHtml(tex, display) {
  let clean = String(tex || "").trim();
  // A forgotten closing brace ("5\frac{1}{3") would fail and print as "513".
  const missing = (clean.match(/\{/g) || []).length - (clean.match(/\}/g) || []).length;
  if (missing > 0) clean += "}".repeat(missing);
  if (!clean) return null;
  try {
    return patchSvg(
      katex.renderToString(clean, {
        displayMode: display,
        throwOnError: true,
        strict: false,
        output: "html",
      }),
    );
  } catch {
    return null;
  }
}

/**
 * Feedback text laid out for reading, before it is rendered:
 *  - every "Step N:" starts its own paragraph;
 *  - sentences glued together ("terms.The") get their space back.
 * Text inside math delimiters is never touched.
 */
export function tidyFeedback(text, { hasWorkedSolution = false } = {}) {
  if (!text) return "";
  let s = String(text).replace(/\\r\\n|\\n/g, "\n").replace(/\r\n/g, "\n");
  // Older servers paste the teacher's raw notes under the feedback
  // ("…\n\nExplanation: …"). When a worked solution is on the page - in the
  // feedback itself or shown separately - the pasted copy only repeats it
  // (often by another method), so drop it. With no worked solution anywhere
  // it IS the explanation, so it stays.
  const cut = s.search(/\n\s*\n\s*(?:\*\*)?(?:Explanation|Maelezo)(?:\*\*)?\s*:/);
  if (cut > 0 && (hasWorkedSolution || /\b(?:Step|Hatua(?: ya)?) 1\b|\[\[\s*ladder/i.test(s.slice(0, cut))))
    s = s.slice(0, cut);
  s = redrawOldLadders(s);
  // A key saved with its own label ("Correct Answer: 10 words") reads
  // "The correct answer is Correct Answer: 10 words" - drop the label.
  s = s.replace(/(correct answer is\s*\$?\s*)(?:Correct\s+answer|Answer)\s*[:\-]\s*/gi, "$1");
  const re = new RegExp(MATH_RE.source, "g");
  let out = "", last = 0, m;
  const prose = (t) =>
    t
      .replace(/([a-z)])\.([A-Z])/g, "$1. $2")
      .replace(/[ \t]*\n?[ \t]*(?=\b(?:Step|Hatua(?: ya)?) \d+\s*[:.)])/g, (hit, off) => (off === 0 ? "" : "\n\n"));
  while ((m = re.exec(s)) !== null) {
    // A maths block written over several lines (\[ … \], $$ … $$) stays one
    // block: later steps split text into paragraphs on line breaks.
    out += prose(s.slice(last, m.index)) + m[0].replace(/\s*\n\s*/g, " ");
    last = m.index + m[0].length;
  }
  out += prose(s.slice(last));
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

// ── Ladder (L-) method for LCM and GCD/HCF ──────────────────────────────────
// The AI never draws a ladder: it gets the divisions wrong ("2 | 15 45 27").
// It writes [[ladder:lcm:30,45,54]] and the ladder is worked out here, so the
// arithmetic is always right and it looks the way it is taught in class.
const LADDER_RE = /\[\[\s*ladder\s*:\s*(lcm|gcd|hcf|gcf)\s*:\s*([\d\s,]+?)\s*\]\]/gi;

function smallestPrimeFactor(n) {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return p;
  return n;
}

export function ladderSteps(kind, nums) {
  const lcm = kind.toLowerCase() === "lcm";
  let row = nums.slice();
  const steps = [];
  for (let guard = 0; guard < 60; guard++) {
    let p = null;
    if (lcm) {
      const cands = row.filter((n) => n > 1).map(smallestPrimeFactor);
      if (!cands.length) break;
      p = Math.min(...cands);
    } else {
      for (let q = 2; q <= Math.min(...row); q++) {
        if (smallestPrimeFactor(q) === q && row.every((n) => n % q === 0)) { p = q; break; }
      }
      if (p == null) break;
    }
    steps.push({ divisor: p, row });
    row = row.map((n) => (n % p === 0 ? n / p : n));
  }
  const divisors = steps.map((s) => s.divisor);
  const value = divisors.reduce((a, b) => a * b, 1);
  return { steps, last: row, divisors, value };
}

function ladderHtml(kind, raw) {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums.length < 2 || nums.length > 6 || nums.some((n) => !Number.isInteger(n) || n < 1 || n > 1e7)) return null;
  const { steps, last, divisors, value } = ladderSteps(kind, nums);
  if (!steps.length) return null;
  const k = kind.toUpperCase() === "LCM" ? "LCM" : kind.toUpperCase() === "GCD" ? "GCD" : kind.toUpperCase();
  const cell = "padding:4px 14px;text-align:center;font-variant-numeric:tabular-nums";
  const body = steps
    .map(
      (s) =>
        `<tr><td style="${cell};font-weight:800;color:#E8B65B;border-right:2px solid var(--text, #e8eef5)">${s.divisor}</td>` +
        s.row.map((n) => `<td style="${cell};border-bottom:1.5px solid currentColor">${n}</td>`).join("") +
        `</tr>`,
    )
    .join("");
  const end = `<tr><td style="${cell}"></td>` + last.map((n) => `<td style="${cell}">${n}</td>`).join("") + `</tr>`;
  const total =
    texToHtml(`\\text{${k}} = ${divisors.join(" \\times ")} = ${value}`, true) ??
    `${k} = ${divisors.join(" × ")} = ${value}`;
  return (
    `<div style="margin:10px 0;overflow-x:auto"><table style="border-collapse:collapse;font-size:15px;margin:0 auto">` +
    `<tbody>${body}${end}</tbody></table>${total}</div>`
  );
}

/**
 * Ladders the AI drew itself as a markdown table (older answers, still in the
 * cache) put every divisor one row too low and sometimes divide wrongly.
 * Recognise them - blank top-left cell, whole numbers across the top, a
 * divisor column - and replace them with the computed ladder. The product
 * line the AI wrote under it ("LCM = 2 x 3 ... = 270") is dropped because the
 * computed ladder prints its own.
 */
function redrawOldLadders(s) {
  // A cell is a whole number, bare or written as maths: 30, $30$, \(30\), **30**.
  const N = String.raw`[ \t]*(?:\$|\\\(|\*\*)?[ \t]*\d+[ \t]*(?:\$|\\\)|\*\*)?[ \t]*`;
  const E = String.raw`[ \t]*(?:\$|\\\(|\*\*)?[ \t]*(?:\d+|÷)?[ \t]*(?:\$|\\\)|\*\*)?[ \t]*`;
  const TABLE = new RegExp(
    String.raw`(^|\n)[ \t]*\|${E}\|((?:${N}\|)+)[ \t]*\n[ \t]*\|[-| :]+\|[ \t]*((?:\n[ \t]*\|${E}\|(?:${N}\|)+[ \t]*)+)(\n[ \t]*\n?[^\n]*(?:LCM|GCD|HCF|GCF)[^\n]*=[^\n]*)?`,
    "gi",
  );
  const cells = (line) => line.split("|").map((c) => c.replace(/[^\d]/g, "")).filter(Boolean).map(Number);
  return s.replace(TABLE, (whole, lead, head, rows, productLine) => {
    const nums = cells(head);
    const last = cells(rows.trim().split("\n").pop()).slice(1);
    const kindHint = (productLine || "").match(/LCM|GCD|HCF|GCF/i)?.[0];
    const kind = kindHint ? kindHint.toLowerCase() : last.every((n) => n === 1) ? "lcm" : "gcd";
    if (nums.length < 2) return whole;
    return `${lead}[[ladder:${kind}:${nums.join(",")}]]`;
  });
}

/** A correct answer for display: bare LaTeX ("5\frac{1}{3}") becomes maths. */
export function answerHtml(answer) {
  const s = String(answer ?? "").trim();
  if (!s) return "";
  const bareTex = /\\[a-zA-Z]+|\^|_\{/.test(s) && !/\$|\\\(|\\\[/.test(s);
  return renderMathHtml(bareTex ? `$${s}$` : s);
}

/** Text with $…$, $$…$$, \(…\), \[…\] math -> HTML string, in one pass. */
export function renderMathHtml(text) {
  if (!text) return "";
  const s = String(text);
  // Already rendered (a caller rendered it once and passed it on): leave it.
  if (s.includes('class="katex') || s.includes("class='katex")) return s;
  return s
    .replace(MATH_RE, (whole, dd, br, pa, d) => {
      const display = dd != null || br != null;
      const tex = dd ?? br ?? pa ?? d;
      // Words wrapped as maths ("$Correct Answer: 10 words (Accept 10)$") would
      // render as squashed italic letters. Plain words with no LaTeX
      // commands are a sentence: show them as text.
      if (!/\\[a-zA-Z]/.test(tex) && /[A-Za-z]{3,}[\s(),.:;]+[A-Za-z]{3,}/.test(tex)) {
        return tex.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
      }
      return texToHtml(tex, display) ?? latexToText(tex);
    })
    .replace(LADDER_RE, (whole, kind, nums) => ladderHtml(kind, nums) ?? "");
}
