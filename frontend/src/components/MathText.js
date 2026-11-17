"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Text that may contain mathematics, typeset properly.
 *
 * A generated paper used to print "3/4", "x^2" and "sqrt(16)" as typewriter
 * characters, which looks unfinished next to any real exam paper. The
 * generator now writes mathematics in LaTeX between single dollar signs and
 * this renders it, so a fraction is a fraction with a bar across it.
 *
 * Anything that is not between dollar signs is left exactly as written, so
 * this is harmless on a Kiswahili comprehension or a CRE question. If a
 * fragment will not parse, the original text is shown rather than an error -
 * a paper with a slightly odd expression still prints; a paper full of red
 * KaTeX errors does not.
 */
function render(tex, display) {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  } catch {
    return null;
  }
}

export default function MathText({ children, className = "" }) {
  const text = typeof children === "string" ? children : "";

  const parts = useMemo(() => {
    if (!text.includes("$")) return [{ type: "text", value: text }];
    // $$...$$ first, then $...$, so a display block is not torn in half.
    const out = [];
    const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
      const tex = (m[1] ?? m[2] ?? "").trim();
      const html = tex ? render(tex, m[1] != null) : null;
      out.push(html ? { type: "math", html, display: m[1] != null }
                    : { type: "text", value: m[0] });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ type: "text", value: text.slice(last) });
    return out;
  }, [text]);

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.type === "math" ? (
          <span
            key={i}
            className={p.display ? "block my-2" : "inline-block align-middle"}
            // KaTeX output, built here from the paper's own text.
            dangerouslySetInnerHTML={{ __html: p.html }}
          />
        ) : (
          <span key={i} className="whitespace-pre-wrap">{p.value}</span>
        )
      )}
    </span>
  );
}
