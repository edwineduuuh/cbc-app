"use client";

/**
 * One multiple-choice option, the same everywhere.
 *
 * Colour only ever means one thing:
 *   - before answering, all options look identical (nothing looks favoured);
 *   - teal = "my choice" (brand colour, not a verdict);
 *   - green / coral only after marking, always with ✓ / ✗ as well, so it
 *     works for colour-blind learners too.
 */
const TEAL = "#20B8A6";
const GREEN = "#3CCB8B";
const CORAL = "#F07178";

export default function AnswerOption({ letter, html, imageUrl, selected, mark = null, onClick, disabled }) {
  const accent = mark === "correct" ? GREEN : mark === "wrong" ? CORAL : selected ? TEAL : null;
  const tint =
    mark === "correct" ? "rgba(60,203,139,0.12)"
    : mark === "wrong" ? "rgba(240,113,120,0.12)"
    : selected ? "rgba(32,184,166,0.12)"
    : "var(--bg-secondary)";
  const badgeText = mark === "correct" ? "✓" : mark === "wrong" ? "✗" : letter;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={!!selected}
      aria-label={`Option ${letter}${mark === "correct" ? ", correct answer" : mark === "wrong" ? ", your answer, wrong" : selected ? ", selected" : ""}`}
      className="ss-answer-option"
      style={{
        background: tint,
        border: `2px solid ${accent || "rgba(255,255,255,0.10)"}`,
        borderRadius: 16,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        cursor: disabled ? "default" : "pointer",
        transition: "border-color 0.15s ease, background 0.15s ease, opacity 0.15s ease",
        opacity: mark === "dim" ? 0.5 : 1,
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: accent || "rgba(255,255,255,0.08)",
          color: accent ? "#fff" : "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: mark === "correct" || mark === "wrong" ? 17 : 14,
          flexShrink: 0,
        }}
      >
        {badgeText}
      </div>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={`Option ${letter}`}
             style={{ flex: 1, maxHeight: 120, objectFit: "contain", borderRadius: 8 }} />
      ) : (
        <span
          style={{ fontSize: 16, fontWeight: selected ? 600 : 500, color: "var(--text)", lineHeight: 1.5, flex: 1 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {mark === "correct" && !selected ? (
        <span style={{ fontSize: 12, fontWeight: 700, color: GREEN, flexShrink: 0 }}>Correct answer</span>
      ) : null}
    </button>
  );
}

/** Option text with full-size fractions: 9½ reads as 9½, not a speck. */
export function optionTex(text) {
  return String(text || "").replace(/\\frac(?=\s*\{)/g, "\\dfrac");
}

/** Letter of the correct option from the marker's "B: 9 1/2" / "Option B: …". */
export function correctLetterOf(correctAnswer) {
  const m = String(correctAnswer || "").trim().match(/^(?:Option\s*)?([A-F])\b/i);
  return m ? m[1].toUpperCase() : null;
}
