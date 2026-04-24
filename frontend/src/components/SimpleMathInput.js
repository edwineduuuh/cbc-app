"use client";

import { useRef, useState } from "react";

// Unicode symbols — insert directly into textarea at cursor
const SYMBOL_LIBRARY = {
  Math: [
    // Powers & roots
    { label: "x²",   insert: "²" },
    { label: "x³",   insert: "³" },
    { label: "xⁿ",   insert: "ⁿ" },
    { label: "x⁻¹",  insert: "⁻¹" },
    { label: "x⁴",   insert: "⁴" },
    { label: "x⁵",   insert: "⁵" },
    { label: "¹⁰",   insert: "¹⁰" },
    { label: "√",    insert: "√" },
    { label: "∛",    insert: "∛" },
    { label: "∜",    insert: "∜" },
    // Fractions / division
    { label: "½",    insert: "½" },
    { label: "⅓",    insert: "⅓" },
    { label: "¼",    insert: "¼" },
    { label: "¾",    insert: "¾" },
    { label: "⅔",    insert: "⅔" },
    { label: "÷",    insert: "÷" },
    { label: "×",    insert: "×" },
    // Superscripts
    { label: "⁰",    insert: "⁰" },
    { label: "¹",    insert: "¹" },
    { label: "²",    insert: "²" },
    { label: "³",    insert: "³" },
    { label: "⁴",    insert: "⁴" },
    { label: "⁵",    insert: "⁵" },
    { label: "⁶",    insert: "⁶" },
    { label: "⁷",    insert: "⁷" },
    { label: "⁸",    insert: "⁸" },
    { label: "⁹",    insert: "⁹" },
    { label: "⁺",    insert: "⁺" },
    { label: "⁻",    insert: "⁻" },
    // Subscripts
    { label: "₀",    insert: "₀" },
    { label: "₁",    insert: "₁" },
    { label: "₂",    insert: "₂" },
    { label: "₃",    insert: "₃" },
    { label: "₄",    insert: "₄" },
    { label: "₅",    insert: "₅" },
    { label: "₆",    insert: "₆" },
    { label: "₇",    insert: "₇" },
    { label: "₈",    insert: "₈" },
    { label: "₉",    insert: "₉" },
    { label: "₊",    insert: "₊" },
    { label: "₋",    insert: "₋" },
    // Trig & logs
    { label: "sin",  insert: "sin " },
    { label: "cos",  insert: "cos " },
    { label: "tan",  insert: "tan " },
    { label: "sin⁻¹", insert: "sin⁻¹" },
    { label: "cos⁻¹", insert: "cos⁻¹" },
    { label: "tan⁻¹", insert: "tan⁻¹" },
    { label: "log",  insert: "log " },
    { label: "ln",   insert: "ln " },
    // Calculus
    { label: "∫",    insert: "∫" },
    { label: "∂",    insert: "∂" },
    { label: "∑",    insert: "∑" },
    { label: "∏",    insert: "∏" },
    { label: "lim",  insert: "lim " },
    { label: "Δ",    insert: "Δ" },
    { label: "δ",    insert: "δ" },
    { label: "d/dx", insert: "d/dx" },
    // Geometry
    { label: "π",    insert: "π" },
    { label: "°",    insert: "°" },
    { label: "∠",    insert: "∠" },
    { label: "△",    insert: "△" },
    { label: "⊥",    insert: "⊥" },
    { label: "∥",    insert: "∥" },
    { label: "≅",    insert: "≅" },
    { label: "∼",    insert: "∼" },
  ],

  Chemistry: [
    // Subscripts for formulas
    { label: "₂",    insert: "₂" },
    { label: "₃",    insert: "₃" },
    { label: "₄",    insert: "₄" },
    { label: "₅",    insert: "₅" },
    { label: "₆",    insert: "₆" },
    { label: "₁₂",   insert: "₁₂" },
    // Superscripts for charges
    { label: "⁺",    insert: "⁺" },
    { label: "⁻",    insert: "⁻" },
    { label: "²⁺",   insert: "²⁺" },
    { label: "³⁺",   insert: "³⁺" },
    { label: "²⁻",   insert: "²⁻" },
    // Common compounds (click to insert full formula)
    { label: "H₂O",       insert: "H₂O" },
    { label: "CO₂",       insert: "CO₂" },
    { label: "O₂",        insert: "O₂" },
    { label: "H₂",        insert: "H₂" },
    { label: "N₂",        insert: "N₂" },
    { label: "Cl₂",       insert: "Cl₂" },
    { label: "NH₃",       insert: "NH₃" },
    { label: "CH₄",       insert: "CH₄" },
    { label: "C₂H₆",      insert: "C₂H₆" },
    { label: "C₂H₄",      insert: "C₂H₄" },
    { label: "C₂H₂",      insert: "C₂H₂" },
    { label: "C₆H₆",      insert: "C₆H₆" },
    { label: "C₆H₁₂O₆",  insert: "C₆H₁₂O₆" },
    { label: "HCl",       insert: "HCl" },
    { label: "H₂SO₄",     insert: "H₂SO₄" },
    { label: "HNO₃",      insert: "HNO₃" },
    { label: "H₃PO₄",     insert: "H₃PO₄" },
    { label: "NaOH",      insert: "NaOH" },
    { label: "KOH",       insert: "KOH" },
    { label: "Ca(OH)₂",   insert: "Ca(OH)₂" },
    { label: "CaCO₃",     insert: "CaCO₃" },
    { label: "Na₂CO₃",    insert: "Na₂CO₃" },
    { label: "NaHCO₃",    insert: "NaHCO₃" },
    { label: "CuSO₄",     insert: "CuSO₄" },
    { label: "FeSO₄",     insert: "FeSO₄" },
    { label: "Fe₂O₃",     insert: "Fe₂O₃" },
    { label: "Al₂O₃",     insert: "Al₂O₃" },
    { label: "SO₂",       insert: "SO₂" },
    { label: "SO₃",       insert: "SO₃" },
    { label: "NO₂",       insert: "NO₂" },
    // Ions
    { label: "H⁺",    insert: "H⁺" },
    { label: "OH⁻",   insert: "OH⁻" },
    { label: "Na⁺",   insert: "Na⁺" },
    { label: "Ca²⁺",  insert: "Ca²⁺" },
    { label: "Fe²⁺",  insert: "Fe²⁺" },
    { label: "Fe³⁺",  insert: "Fe³⁺" },
    { label: "Cu²⁺",  insert: "Cu²⁺" },
    { label: "SO₄²⁻", insert: "SO₄²⁻" },
    { label: "NO₃⁻",  insert: "NO₃⁻" },
    { label: "CO₃²⁻", insert: "CO₃²⁻" },
    { label: "NH₄⁺",  insert: "NH₄⁺" },
    { label: "e⁻",    insert: "e⁻" },
    // Reaction symbols
    { label: "→",     insert: " → " },
    { label: "⇌",     insert: " ⇌ " },
    { label: "↑ gas", insert: "↑" },
    { label: "↓ ppt", insert: "↓" },
    { label: "(aq)",  insert: "(aq)" },
    { label: "(l)",   insert: "(l)" },
    { label: "(g)",   insert: "(g)" },
    { label: "(s)",   insert: "(s)" },
    { label: "Δ heat", insert: "Δ" },
    // Organic groups
    { label: "-CH₃",  insert: "-CH₃" },
    { label: "-COOH", insert: "-COOH" },
    { label: "-OH",   insert: "-OH" },
    { label: "-NH₂",  insert: "-NH₂" },
    { label: "-CHO",  insert: "-CHO" },
    { label: "C=O",   insert: "C=O" },
    { label: "C≡C",   insert: "C≡C" },
    { label: "C=C",   insert: "C=C" },
  ],

  Symbols: [
    // Greek (lower)
    { label: "α",  insert: "α" },
    { label: "β",  insert: "β" },
    { label: "γ",  insert: "γ" },
    { label: "δ",  insert: "δ" },
    { label: "ε",  insert: "ε" },
    { label: "ζ",  insert: "ζ" },
    { label: "η",  insert: "η" },
    { label: "θ",  insert: "θ" },
    { label: "ι",  insert: "ι" },
    { label: "κ",  insert: "κ" },
    { label: "λ",  insert: "λ" },
    { label: "μ",  insert: "μ" },
    { label: "ν",  insert: "ν" },
    { label: "ξ",  insert: "ξ" },
    { label: "π",  insert: "π" },
    { label: "ρ",  insert: "ρ" },
    { label: "σ",  insert: "σ" },
    { label: "τ",  insert: "τ" },
    { label: "φ",  insert: "φ" },
    { label: "χ",  insert: "χ" },
    { label: "ψ",  insert: "ψ" },
    { label: "ω",  insert: "ω" },
    // Greek (upper)
    { label: "Γ",  insert: "Γ" },
    { label: "Δ",  insert: "Δ" },
    { label: "Θ",  insert: "Θ" },
    { label: "Λ",  insert: "Λ" },
    { label: "Π",  insert: "Π" },
    { label: "Σ",  insert: "Σ" },
    { label: "Φ",  insert: "Φ" },
    { label: "Ψ",  insert: "Ψ" },
    { label: "Ω",  insert: "Ω" },
    // Comparison
    { label: "≠",  insert: "≠" },
    { label: "≈",  insert: "≈" },
    { label: "≡",  insert: "≡" },
    { label: "≤",  insert: "≤" },
    { label: "≥",  insert: "≥" },
    { label: "≪",  insert: "≪" },
    { label: "≫",  insert: "≫" },
    { label: "∝",  insert: "∝" },
    // Logic & sets
    { label: "∧",  insert: "∧" },
    { label: "∨",  insert: "∨" },
    { label: "¬",  insert: "¬" },
    { label: "⟹",  insert: "⟹" },
    { label: "⟺",  insert: "⟺" },
    { label: "∴",  insert: "∴" },
    { label: "∵",  insert: "∵" },
    { label: "∀",  insert: "∀" },
    { label: "∃",  insert: "∃" },
    { label: "∈",  insert: "∈" },
    { label: "∉",  insert: "∉" },
    { label: "⊂",  insert: "⊂" },
    { label: "⊆",  insert: "⊆" },
    { label: "∪",  insert: "∪" },
    { label: "∩",  insert: "∩" },
    { label: "∅",  insert: "∅" },
    { label: "ℕ",  insert: "ℕ" },
    { label: "ℤ",  insert: "ℤ" },
    { label: "ℚ",  insert: "ℚ" },
    { label: "ℝ",  insert: "ℝ" },
    { label: "ℂ",  insert: "ℂ" },
    // Arithmetic
    { label: "±",  insert: "±" },
    { label: "∓",  insert: "∓" },
    { label: "·",  insert: "·" },
    { label: "∞",  insert: "∞" },
    { label: "‰",  insert: "‰" },
    // Arrows
    { label: "→",  insert: "→" },
    { label: "←",  insert: "←" },
    { label: "↔",  insert: "↔" },
    { label: "⇒",  insert: "⇒" },
    { label: "⇐",  insert: "⇐" },
    { label: "⇔",  insert: "⇔" },
    { label: "↑",  insert: "↑" },
    { label: "↓",  insert: "↓" },
    // Physics
    { label: "ℏ",  insert: "ℏ" },
    { label: "∇",  insert: "∇" },
    { label: "⊗",  insert: "⊗" },
    { label: "⊕",  insert: "⊕" },
    { label: "⊥",  insert: "⊥" },
    { label: "∥",  insert: "∥" },
    { label: "∘",  insert: "∘" },
    { label: "★",  insert: "★" },
  ],
};

export default function SimpleMathInput({ value, onChange }) {
  const taRef = useRef(null);
  const [activeTab, setActiveTab] = useState("Math");

  // Insert symbol at cursor position
  const insertSymbol = (sym) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = (value || "").slice(0, start) + sym + (value || "").slice(end);
    onChange(next);
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + sym.length, start + sym.length);
    });
  };

  return (
    <div className="w-full">
      {/* Plain textarea — type freely */}
      <textarea
        ref={taRef}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Type your answer here… use buttons below for symbols"
        style={{
          width: "100%",
          border: "2px solid #e8eaf0",
          borderRadius: 16,
          padding: "14px 18px",
          fontSize: 16,
          fontWeight: 500,
          color: "#0d0d1a",
          background: "#fff",
          fontFamily: "'Lato', sans-serif",
          lineHeight: 1.7,
          resize: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          marginBottom: 10,
          display: "block",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#1a6fc4")}
        onBlur={(e) => (e.target.style.borderColor = "#e8eaf0")}
      />

      {/* Symbol tabs */}
      <div>
        <div className="flex gap-2 mb-2 border-b border-gray-200">
          {Object.keys(SYMBOL_LIBRARY).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-1 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 max-h-44 overflow-y-auto pr-0.5">
          {SYMBOL_LIBRARY[activeTab].map((sym) => (
            <button
              key={sym.insert}
              type="button"
              onClick={() => insertSymbol(sym.insert)}
              title={sym.label}
              className="py-1.5 px-1 text-center bg-white border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-400 active:bg-blue-100 transition-all text-sm font-medium text-gray-700 leading-tight"
            >
              {sym.label}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs text-gray-400">
          ✓ Type freely · click a symbol to insert it at your cursor position
        </p>
      </div>
    </div>
  );
}
