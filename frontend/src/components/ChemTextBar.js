"use client";
import { useState } from "react";

const CHEM_TEXT = {
  "e⁻ Config": [
    { l: "1s¹",   v: "1s¹" },
    { l: "1s²",   v: "1s²" },
    { l: "2s¹",   v: "2s¹" },
    { l: "2s²",   v: "2s²" },
    { l: "2p¹",   v: "2p¹" },
    { l: "2p²",   v: "2p²" },
    { l: "2p³",   v: "2p³" },
    { l: "2p⁴",   v: "2p⁴" },
    { l: "2p⁵",   v: "2p⁵" },
    { l: "2p⁶",   v: "2p⁶" },
    { l: "3s¹",   v: "3s¹" },
    { l: "3s²",   v: "3s²" },
    { l: "3p¹",   v: "3p¹" },
    { l: "3p²",   v: "3p²" },
    { l: "3p³",   v: "3p³" },
    { l: "3p⁴",   v: "3p⁴" },
    { l: "3p⁵",   v: "3p⁵" },
    { l: "3p⁶",   v: "3p⁶" },
    { l: "3d¹",   v: "3d¹" },
    { l: "3d⁵",   v: "3d⁵" },
    { l: "3d¹⁰",  v: "3d¹⁰" },
    { l: "4s¹",   v: "4s¹" },
    { l: "4s²",   v: "4s²" },
    { l: "4p⁶",   v: "4p⁶" },
    { l: "4d¹⁰",  v: "4d¹⁰" },
    { l: "4f⁷",   v: "4f⁷" },
    { l: "4f¹⁴",  v: "4f¹⁴" },
    { l: "5s²",   v: "5s²" },
    { l: "5p⁶",   v: "5p⁶" },
    { l: "5d¹⁰",  v: "5d¹⁰" },
    { l: "6s²",   v: "6s²" },
  ],
  "Ions": [
    { l: "H⁺",     v: "H⁺" },
    { l: "OH⁻",    v: "OH⁻" },
    { l: "Na⁺",    v: "Na⁺" },
    { l: "K⁺",     v: "K⁺" },
    { l: "Ca²⁺",   v: "Ca²⁺" },
    { l: "Mg²⁺",   v: "Mg²⁺" },
    { l: "Fe²⁺",   v: "Fe²⁺" },
    { l: "Fe³⁺",   v: "Fe³⁺" },
    { l: "Cu²⁺",   v: "Cu²⁺" },
    { l: "Cu⁺",    v: "Cu⁺" },
    { l: "Al³⁺",   v: "Al³⁺" },
    { l: "Zn²⁺",   v: "Zn²⁺" },
    { l: "Ag⁺",    v: "Ag⁺" },
    { l: "Pb²⁺",   v: "Pb²⁺" },
    { l: "Mn²⁺",   v: "Mn²⁺" },
    { l: "Cr³⁺",   v: "Cr³⁺" },
    { l: "NH₄⁺",   v: "NH₄⁺" },
    { l: "Cl⁻",    v: "Cl⁻" },
    { l: "F⁻",     v: "F⁻" },
    { l: "Br⁻",    v: "Br⁻" },
    { l: "I⁻",     v: "I⁻" },
    { l: "O²⁻",    v: "O²⁻" },
    { l: "S²⁻",    v: "S²⁻" },
    { l: "SO₄²⁻",  v: "SO₄²⁻" },
    { l: "NO₃⁻",   v: "NO₃⁻" },
    { l: "CO₃²⁻",  v: "CO₃²⁻" },
    { l: "HCO₃⁻",  v: "HCO₃⁻" },
    { l: "PO₄³⁻",  v: "PO₄³⁻" },
    { l: "MnO₄⁻",  v: "MnO₄⁻" },
    { l: "Cr₂O₇²⁻",v: "Cr₂O₇²⁻" },
    { l: "e⁻",     v: "e⁻" },
  ],
  "Formulas": [
    { l: "H₂O",      v: "H₂O" },
    { l: "CO₂",      v: "CO₂" },
    { l: "O₂",       v: "O₂" },
    { l: "H₂",       v: "H₂" },
    { l: "N₂",       v: "N₂" },
    { l: "Cl₂",      v: "Cl₂" },
    { l: "NH₃",      v: "NH₃" },
    { l: "CH₄",      v: "CH₄" },
    { l: "C₂H₆",     v: "C₂H₆" },
    { l: "C₂H₄",     v: "C₂H₄" },
    { l: "C₂H₂",     v: "C₂H₂" },
    { l: "C₆H₆",     v: "C₆H₆" },
    { l: "C₆H₁₂O₆",  v: "C₆H₁₂O₆" },
    { l: "HCl",       v: "HCl" },
    { l: "H₂SO₄",    v: "H₂SO₄" },
    { l: "HNO₃",     v: "HNO₃" },
    { l: "H₃PO₄",    v: "H₃PO₄" },
    { l: "NaOH",      v: "NaOH" },
    { l: "KOH",       v: "KOH" },
    { l: "Ca(OH)₂",  v: "Ca(OH)₂" },
    { l: "CaCO₃",    v: "CaCO₃" },
    { l: "Na₂CO₃",   v: "Na₂CO₃" },
    { l: "NaHCO₃",   v: "NaHCO₃" },
    { l: "CuSO₄",    v: "CuSO₄" },
    { l: "FeSO₄",    v: "FeSO₄" },
    { l: "Fe₂O₃",    v: "Fe₂O₃" },
    { l: "Al₂O₃",    v: "Al₂O₃" },
    { l: "MgO",       v: "MgO" },
    { l: "CaO",       v: "CaO" },
    { l: "SO₂",      v: "SO₂" },
    { l: "NO₂",      v: "NO₂" },
    { l: "KMnO₄",    v: "KMnO₄" },
    { l: "K₂Cr₂O₇",  v: "K₂Cr₂O₇" },
  ],
  "Symbols": [
    { l: "→",   v: "→" },
    { l: "⇌",   v: "⇌" },
    { l: "↑",   v: "↑" },
    { l: "↓",   v: "↓" },
    { l: "(aq)", v: "(aq)" },
    { l: "(l)",  v: "(l)" },
    { l: "(g)",  v: "(g)" },
    { l: "(s)",  v: "(s)" },
    { l: "Δ",   v: "Δ" },
    { l: "°C",  v: "°C" },
    { l: "±",   v: "±" },
    { l: "≈",   v: "≈" },
    { l: "α",   v: "α" },
    { l: "β",   v: "β" },
    { l: "γ",   v: "γ" },
    { l: "⁰",   v: "⁰" },
    { l: "¹",   v: "¹" },
    { l: "²",   v: "²" },
    { l: "³",   v: "³" },
    { l: "⁴",   v: "⁴" },
    { l: "⁵",   v: "⁵" },
    { l: "⁶",   v: "⁶" },
    { l: "⁷",   v: "⁷" },
    { l: "⁸",   v: "⁸" },
    { l: "⁹",   v: "⁹" },
    { l: "⁺",   v: "⁺" },
    { l: "⁻",   v: "⁻" },
    { l: "₀",   v: "₀" },
    { l: "₁",   v: "₁" },
    { l: "₂",   v: "₂" },
    { l: "₃",   v: "₃" },
    { l: "₄",   v: "₄" },
    { l: "₅",   v: "₅" },
    { l: "₆",   v: "₆" },
    { l: "₇",   v: "₇" },
    { l: "₈",   v: "₈" },
    { l: "₉",   v: "₉" },
  ],
};

export default function ChemTextBar({ textareaRef, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("e⁻ Config");

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
        <span>{open ? "▲" : "▼"}</span>
        {open ? "Hide chemistry symbols" : "⚗ Chemistry symbols"}
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
                title={sym.l}
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
            ✓ Click to insert at cursor &middot; symbols appear in your typed answer
          </p>
        </div>
      )}
    </div>
  );
}
