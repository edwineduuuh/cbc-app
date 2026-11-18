/**
 * StadiSpace brand: the path symbol and the serif wordmark (Option C,
 * approved Nov 2026). One component so the logo is drawn the same way
 * everywhere; the PNG/ICO/SVG files in app/ and public/brand/ are rendered
 * from the same geometry.
 *
 * The S is two equal arcs - a winding learning path - and the amber dot is
 * the goal ahead. Below 40px the stroke thickens and the dot grows, so both
 * stay visible down to favicon size.
 *
 * tone:
 *   "auto"    follows the site theme (CSS vars in globals.css)
 *   "onDark"  for navy/photo backgrounds whatever the theme
 *   "onLight" for white panels whatever the theme
 *   "mono"    all warm white, for teal or photo backgrounds
 */
const PATH = "M56.1 27A14 14 0 1 0 44 48A14 14 0 1 1 31.9 69";

const TONES = {
  auto:    { ink: "var(--brand-ink)", accent: "var(--brand-accent)", tile: "var(--brand-tile)" },
  onDark:  { ink: "#F5F7FA", accent: "#20B8A6", tile: "#14243A" },
  onLight: { ink: "#0F1F3D", accent: "#0E7490", tile: "#0F1F3D" },
  // On teal or photographic backgrounds the teal half of the wordmark
  // disappears, so the whole word goes warm white.
  mono:    { ink: "#F5F7FA", accent: "#F5F7FA", tile: "#0F1F3D" },
};

export function BrandSymbol({ size = 32, tone = "auto", title }) {
  const small = size < 40;
  const stroke = small ? 15 : 9;
  const [cx, cy, r] = small ? [76, 19, 12] : [72, 22, 8];
  const { tile } = TONES[tone] || TONES.auto;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect width="96" height="96" rx="22" fill={tile} />
      <path d={PATH} fill="none" stroke="var(--brand-path, #20B8A6)"
        strokeWidth={stroke} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="var(--brand-goal, #E8B65B)" />
    </svg>
  );
}

// Set on every span, not just the parent: some older pages carry a blanket
// `* { font-family: 'DM Sans' }`, which beats an inherited font.
const WORDMARK_FONT = {
  fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  fontWeight: 700,
};

export function Wordmark({ size = 24, tone = "auto" }) {
  const { ink, accent } = TONES[tone] || TONES.auto;
  return (
    <span
      style={{
        ...WORDMARK_FONT,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ ...WORDMARK_FONT, color: ink }}>Stadi</span>
      <span style={{ ...WORDMARK_FONT, color: accent }}>Space</span>
    </span>
  );
}

/** Symbol + wordmark. `size` is the wordmark's font size in px. */
export default function Logo({ size = 24, tone = "auto", symbol = true }) {
  return (
    <span
      aria-label="StadiSpace"
      role="img"
      style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.4) }}
    >
      {symbol && <BrandSymbol size={Math.round(size * 1.25)} tone={tone} />}
      <Wordmark size={size} tone={tone} />
    </span>
  );
}
