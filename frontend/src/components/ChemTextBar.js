"use client";
import { useState } from "react";

const CHEM_TEXT = {
  "eâ» Config": [
    { l: "1sÂ¹", v: "1sÂ¹" },
    { l: "1sÂ²", v: "1sÂ²" },
    { l: "2sÂ¹", v: "2sÂ¹" },
    { l: "2sÂ²", v: "2sÂ²" },
    { l: "2pÂ¹", v: "2pÂ¹" },
    { l: "2pÂ²", v: "2pÂ²" },
    { l: "2pÂ³", v: "2pÂ³" },
    { l: "2pâ´", v: "2pâ´" },
    { l: "2pâµ", v: "2pâµ" },
    { l: "2pâ¶", v: "2pâ¶" },
    { l: "3sÂ¹", v: "3sÂ¹" },
    { l: "3sÂ²", v: "3sÂ²" },
    { l: "3pÂ¹", v: "3pÂ¹" },
    { l: "3pÂ²", v: "3pÂ²" },
    { l: "3pÂ³", v: "3pÂ³" },
    { l: "3pâ´", v: "3pâ´" },
    { l: "3pâµ", v: "3pâµ" },
    { l: "3pâ¶", v: "3pâ¶" },
    { l: "3dÂ¹", v: "3dÂ¹" },
    { l: "3dâµ", v: "3dâµ" },
    { l: "3dÂ¹â°", v: "3dÂ¹â°" },
    { l: "4sÂ¹", v: "4sÂ¹" },
    { l: "4sÂ²", v: "4sÂ²" },
    { l: "4pâ¶", v: "4pâ¶" },
    { l: "4dÂ¹â°", v: "4dÂ¹â°" },
    { l: "4fâ·", v: "4fâ·" },
    { l: "4fÂ¹â´", v: "4fÂ¹â´" },
    { l: "5sÂ²", v: "5sÂ²" },
    { l: "5pâ¶", v: "5pâ¶" },
    { l: "5dÂ¹â°", v: "5dÂ¹â°" },
    { l: "6sÂ²", v: "6sÂ²" },
  ],
  Ions: [
    { l: "Hâº", v: "Hâº" },
    { l: "OHâ»", v: "OHâ»" },
    { l: "Naâº", v: "Naâº" },
    { l: "Kâº", v: "Kâº" },
    { l: "CaÂ²âº", v: "CaÂ²âº" },
    { l: "MgÂ²âº", v: "MgÂ²âº" },
    { l: "FeÂ²âº", v: "FeÂ²âº" },
    { l: "FeÂ³âº", v: "FeÂ³âº" },
    { l: "CuÂ²âº", v: "CuÂ²âº" },
    { l: "Cuâº", v: "Cuâº" },
    { l: "AlÂ³âº", v: "AlÂ³âº" },
    { l: "ZnÂ²âº", v: "ZnÂ²âº" },
    { l: "Agâº", v: "Agâº" },
    { l: "PbÂ²âº", v: "PbÂ²âº" },
    { l: "MnÂ²âº", v: "MnÂ²âº" },
    { l: "CrÂ³âº", v: "CrÂ³âº" },
    { l: "NHâ‚„âº", v: "NHâ‚„âº" },
    { l: "Clâ»", v: "Clâ»" },
    { l: "Fâ»", v: "Fâ»" },
    { l: "Brâ»", v: "Brâ»" },
    { l: "Iâ»", v: "Iâ»" },
    { l: "OÂ²â»", v: "OÂ²â»" },
    { l: "SÂ²â»", v: "SÂ²â»" },
    { l: "SOâ‚„Â²â»", v: "SOâ‚„Â²â»" },
    { l: "NOâ‚ƒâ»", v: "NOâ‚ƒâ»" },
    { l: "COâ‚ƒÂ²â»", v: "COâ‚ƒÂ²â»" },
    { l: "HCOâ‚ƒâ»", v: "HCOâ‚ƒâ»" },
    { l: "POâ‚„Â³â»", v: "POâ‚„Â³â»" },
    { l: "MnOâ‚„â»", v: "MnOâ‚„â»" },
    { l: "Crâ‚‚Oâ‚‡Â²â»", v: "Crâ‚‚Oâ‚‡Â²â»" },
    { l: "eâ»", v: "eâ»" },
  ],
  Formulas: [
    { l: "Hâ‚‚O", v: "Hâ‚‚O" },
    { l: "COâ‚‚", v: "COâ‚‚" },
    { l: "Oâ‚‚", v: "Oâ‚‚" },
    { l: "Hâ‚‚", v: "Hâ‚‚" },
    { l: "Nâ‚‚", v: "Nâ‚‚" },
    { l: "Clâ‚‚", v: "Clâ‚‚" },
    { l: "NHâ‚ƒ", v: "NHâ‚ƒ" },
    { l: "CHâ‚„", v: "CHâ‚„" },
    { l: "Câ‚‚Hâ‚†", v: "Câ‚‚Hâ‚†" },
    { l: "Câ‚‚Hâ‚„", v: "Câ‚‚Hâ‚„" },
    { l: "Câ‚‚Hâ‚‚", v: "Câ‚‚Hâ‚‚" },
    { l: "Câ‚†Hâ‚†", v: "Câ‚†Hâ‚†" },
    { l: "Câ‚†Hâ‚â‚‚Oâ‚†", v: "Câ‚†Hâ‚â‚‚Oâ‚†" },
    { l: "HCl", v: "HCl" },
    { l: "Hâ‚‚SOâ‚„", v: "Hâ‚‚SOâ‚„" },
    { l: "HNOâ‚ƒ", v: "HNOâ‚ƒ" },
    { l: "Hâ‚ƒPOâ‚„", v: "Hâ‚ƒPOâ‚„" },
    { l: "NaOH", v: "NaOH" },
    { l: "KOH", v: "KOH" },
    { l: "Ca(OH)â‚‚", v: "Ca(OH)â‚‚" },
    { l: "CaCOâ‚ƒ", v: "CaCOâ‚ƒ" },
    { l: "Naâ‚‚COâ‚ƒ", v: "Naâ‚‚COâ‚ƒ" },
    { l: "NaHCOâ‚ƒ", v: "NaHCOâ‚ƒ" },
    { l: "CuSOâ‚„", v: "CuSOâ‚„" },
    { l: "FeSOâ‚„", v: "FeSOâ‚„" },
    { l: "Feâ‚‚Oâ‚ƒ", v: "Feâ‚‚Oâ‚ƒ" },
    { l: "Alâ‚‚Oâ‚ƒ", v: "Alâ‚‚Oâ‚ƒ" },
    { l: "MgO", v: "MgO" },
    { l: "CaO", v: "CaO" },
    { l: "SOâ‚‚", v: "SOâ‚‚" },
    { l: "NOâ‚‚", v: "NOâ‚‚" },
    { l: "KMnOâ‚„", v: "KMnOâ‚„" },
    { l: "Kâ‚‚Crâ‚‚Oâ‚‡", v: "Kâ‚‚Crâ‚‚Oâ‚‡" },
  ],
  Symbols: [
    { l: "â†’", v: "â†’" },
    { l: "â‡Œ", v: "â‡Œ" },
    { l: "â†‘", v: "â†‘" },
    { l: "â†“", v: "â†“" },
    { l: "(aq)", v: "(aq)" },
    { l: "(l)", v: "(l)" },
    { l: "(g)", v: "(g)" },
    { l: "(s)", v: "(s)" },
    { l: "Î”", v: "Î”" },
    { l: "Â°C", v: "Â°C" },
    { l: "Â±", v: "Â±" },
    { l: "â‰ˆ", v: "â‰ˆ" },
    { l: "Î±", v: "Î±" },
    { l: "Î²", v: "Î²" },
    { l: "Î³", v: "Î³" },
    { l: "â°", v: "â°" },
    { l: "Â¹", v: "Â¹" },
    { l: "Â²", v: "Â²" },
    { l: "Â³", v: "Â³" },
    { l: "â´", v: "â´" },
    { l: "âµ", v: "âµ" },
    { l: "â¶", v: "â¶" },
    { l: "â·", v: "â·" },
    { l: "â¸", v: "â¸" },
    { l: "â¹", v: "â¹" },
    { l: "âº", v: "âº" },
    { l: "â»", v: "â»" },
    { l: "â‚€", v: "â‚€" },
    { l: "â‚", v: "â‚" },
    { l: "â‚‚", v: "â‚‚" },
    { l: "â‚ƒ", v: "â‚ƒ" },
    { l: "â‚„", v: "â‚„" },
    { l: "â‚…", v: "â‚…" },
    { l: "â‚†", v: "â‚†" },
    { l: "â‚‡", v: "â‚‡" },
    { l: "â‚ˆ", v: "â‚ˆ" },
    { l: "â‚‰", v: "â‚‰" },
    { l: "â‚‹", v: "â‚‹" },
    { l: "â‚Š", v: "â‚Š" },
  ],
  Nuclear: [
    { l: "â´â‚‚Î±", v: "â´â‚‚Î±", title: "Alpha particle (â´He)" },
    { l: "â°â‚‹â‚Î²â»", v: "â°â‚‹â‚Î²â»", title: "Beta-minus particle" },
    { l: "â°â‚Šâ‚Î²âº", v: "â°â‚Šâ‚Î²âº", title: "Beta-plus / positron" },
    { l: "Î³", v: "Î³", title: "Gamma ray" },
    { l: "Â¹â‚€n", v: "Â¹â‚€n", title: "Neutron" },
    { l: "Â¹â‚p", v: "Â¹â‚p", title: "Proton" },
    { l: "Â¹â‚H", v: "Â¹â‚H", title: "Protium (H-1)" },
    { l: "Â²â‚H", v: "Â²â‚H", title: "Deuterium (H-2)" },
    { l: "Â³â‚H", v: "Â³â‚H", title: "Tritium (H-3)" },
    { l: "Â³â‚‚He", v: "Â³â‚‚He", title: "Helium-3" },
    { l: "â´â‚‚He", v: "â´â‚‚He", title: "Helium-4 / Alpha" },
    { l: "Â¹Â²â‚†C", v: "Â¹Â²â‚†C", title: "Carbon-12" },
    { l: "Â¹â´â‚†C", v: "Â¹â´â‚†C", title: "Carbon-14" },
    { l: "Â¹â´â‚‡N", v: "Â¹â´â‚‡N", title: "Nitrogen-14" },
    { l: "Â¹â¶â‚ˆO", v: "Â¹â¶â‚ˆO", title: "Oxygen-16" },
    { l: "Â²Â³â‚â‚Na", v: "Â²Â³â‚â‚Na", title: "Sodium-23" },
    { l: "Â²â·â‚â‚ƒAl", v: "Â²â·â‚â‚ƒAl", title: "Aluminium-27" },
    { l: "Â³Â¹â‚â‚…P", v: "Â³Â¹â‚â‚…P", title: "Phosphorus-31" },
    { l: "â´â°â‚â‚‰K", v: "â´â°â‚â‚‰K", title: "Potassium-40" },
    { l: "â´â°â‚‚â‚€Ca", v: "â´â°â‚‚â‚€Ca", title: "Calcium-40" },
    { l: "âµâ¶â‚‚â‚†Fe", v: "âµâ¶â‚‚â‚†Fe", title: "Iron-56" },
    { l: "â¶â°â‚‚â‚‡Co", v: "â¶â°â‚‚â‚‡Co", title: "Cobalt-60" },
    { l: "Â¹Â³Â¹â‚…â‚ƒI", v: "Â¹Â³Â¹â‚…â‚ƒI", title: "Iodine-131" },
    { l: "Â²Â²â¶â‚ˆâ‚ˆRa", v: "Â²Â²â¶â‚ˆâ‚ˆRa", title: "Radium-226" },
    { l: "Â²Â²Â²â‚ˆâ‚†Rn", v: "Â²Â²Â²â‚ˆâ‚†Rn", title: "Radon-222" },
    { l: "Â²Â¹â¸â‚ˆâ‚„Po", v: "Â²Â¹â¸â‚ˆâ‚„Po", title: "Polonium-218" },
    { l: "Â²Â¹â°â‚ˆâ‚‚Pb", v: "Â²Â¹â°â‚ˆâ‚‚Pb", title: "Lead-210" },
    { l: "Â²Â³Â²â‚‰â‚€Th", v: "Â²Â³Â²â‚‰â‚€Th", title: "Thorium-232" },
    { l: "Â²Â³â´â‚‰â‚€Th", v: "Â²Â³â´â‚‰â‚€Th", title: "Thorium-234" },
    { l: "Â²Â³â´â‚‰â‚‚U", v: "Â²Â³â´â‚‰â‚‚U", title: "Uranium-234" },
    { l: "Â²Â³âµâ‚‰â‚‚U", v: "Â²Â³âµâ‚‰â‚‚U", title: "Uranium-235" },
    { l: "Â²Â³â¸â‚‰â‚‚U", v: "Â²Â³â¸â‚‰â‚‚U", title: "Uranium-238" },
  ],
};

export default function ChemTextBar({
  textareaRef,
  value,
  onChange,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState("eâ» Config");

  function insert(sym) {
    const ta = textareaRef?.current;
    const cur = value ?? "";
    if (!ta) {
      onChange(cur + sym);
      return;
    }
    const start = ta.selectionStart ?? cur.length;
    const end = ta.selectionEnd ?? start;
    const newVal = cur.slice(0, start) + sym + cur.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + sym.length, start + sym.length);
    });
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: open ? "#1a6fc4" : "#6b7280",
          background: open ? "#eff6ff" : "#f3f4f6",
          border: `1px solid ${open ? "#bfdbfe" : "#e5e7eb"}`,
          borderRadius: 8,
          padding: "5px 12px",
          cursor: "pointer",
          marginBottom: open ? 8 : 0,
          transition: "all 0.15s",
        }}
      >
        <span>{open ? "â–²" : "â–¼"}</span>
        {open ? "Hide symbols" : "âš— Chemistry & Nuclear symbols"}
      </button>

      {open && (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "10px 12px",
            background: "#fafafa",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 10,
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: 6,
              flexWrap: "wrap",
            }}
          >
            {Object.keys(CHEM_TEXT).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: tab === t ? "#1a6fc4" : "transparent",
                  color: tab === t ? "#fff" : "#6b7280",
                  transition: "all 0.15s",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
              gap: 5,
              maxHeight: 160,
              overflowY: "auto",
            }}
          >
            {CHEM_TEXT[tab].map((sym) => (
              <button
                key={sym.v}
                type="button"
                onClick={() => insert(sym.v)}
                title={sym.title || sym.l}
                style={{
                  padding: "5px 4px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#1e293b",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 7,
                  cursor: "pointer",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transition: "background 0.1s, border-color 0.1s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#eff6ff";
                  e.currentTarget.style.borderColor = "#93c5fd";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                {sym.l}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
            âœ“ Click to insert at cursor &middot; Nuclear tab: format is á´¬á´¢Symbol
            (mass then atomic number)
          </p>
        </div>
      )}
    </div>
  );
}
