"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const SYMBOL_LIBRARY = {
  Math: [
    { label: "a/b",            value: "\\frac{a}{b}" },
    { label: "x²",             value: "x^{2}" },
    { label: "x³",             value: "x^{3}" },
    { label: "xⁿ",             value: "x^{n}" },
    { label: "x⁻¹",            value: "x^{-1}" },
    { label: "√x",             value: "\\sqrt{x}" },
    { label: "∛x",             value: "\\sqrt[3]{x}" },
    { label: "ⁿ√x",            value: "\\sqrt[n]{x}" },
    { label: "|x|",            value: "\\left|x\\right|" },
    { label: "(a+b)²",         value: "(a+b)^{2}" },
    { label: "Quadratic",      value: "x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}" },
    { label: "log(x)",         value: "\\log(x)" },
    { label: "logₐx",         value: "\\log_{a}(x)" },
    { label: "ln(x)",          value: "\\ln(x)" },
    { label: "sin θ",          value: "\\sin\\theta" },
    { label: "cos θ",          value: "\\cos\\theta" },
    { label: "tan θ",          value: "\\tan\\theta" },
    { label: "sin⁻¹",         value: "\\sin^{-1}" },
    { label: "cos⁻¹",         value: "\\cos^{-1}" },
    { label: "tan⁻¹",         value: "\\tan^{-1}" },
    { label: "sin²+cos²=1",    value: "\\sin^{2}\\theta+\\cos^{2}\\theta=1" },
    { label: "dy/dx",          value: "\\frac{dy}{dx}" },
    { label: "d²y/dx²",        value: "\\frac{d^{2}y}{dx^{2}}" },
    { label: "∂f/∂x",          value: "\\frac{\\partial f}{\\partial x}" },
    { label: "∫ dx",           value: "\\int f(x)\\,dx" },
    { label: "∫ₐᵇ dx",         value: "\\int_{a}^{b} f(x)\\,dx" },
    { label: "∑",              value: "\\sum_{i=1}^{n}" },
    { label: "∏",              value: "\\prod_{i=1}^{n}" },
    { label: "lim",            value: "\\lim_{x\\to\\infty}" },
    { label: "v⃗",             value: "\\vec{v}" },
    { label: "a⃗·b⃗",           value: "\\vec{a}\\cdot\\vec{b}" },
    { label: "a⃗×b⃗",           value: "\\vec{a}\\times\\vec{b}" },
    { label: "2×2 matrix",     value: "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}" },
    { label: "x̄ mean",         value: "\\bar{x}" },
    { label: "σ",              value: "\\sigma" },
    { label: "P(A|B)",         value: "P(A|B)" },
    { label: "nCr",            value: "\\binom{n}{r}" },
    { label: "A=πr²",          value: "A=\\pi r^{2}" },
    { label: "C=2πr",          value: "C=2\\pi r" },
    { label: "a²+b²=c²",       value: "a^{2}+b^{2}=c^{2}" },
    { label: "V=πr²h",         value: "V=\\pi r^{2}h" },
    { label: "V sphere",       value: "V=\\frac{4}{3}\\pi r^{3}" },
    { label: "a≡b (mod n)",    value: "a\\equiv b\\pmod{n}" },
    { label: "a+bi",           value: "a+bi" },
    { label: "e^(iπ)+1=0",     value: "e^{i\\pi}+1=0" },
  ],
  Chemistry: [
    { label: "H₂O",        value: "H_2O" },
    { label: "CO₂",        value: "CO_2" },
    { label: "O₂",         value: "O_2" },
    { label: "H₂",         value: "H_2" },
    { label: "N₂",         value: "N_2" },
    { label: "Cl₂",        value: "Cl_2" },
    { label: "NH₃",        value: "NH_3" },
    { label: "CH₄",        value: "CH_4" },
    { label: "C₂H₆",       value: "C_2H_6" },
    { label: "C₂H₄",       value: "C_2H_4" },
    { label: "C₂H₂",       value: "C_2H_2" },
    { label: "C₆H₆",       value: "C_6H_6" },
    { label: "C₆H₁₂O₆",   value: "C_6H_{12}O_6" },
    { label: "HCl",        value: "HCl" },
    { label: "H₂SO₄",      value: "H_2SO_4" },
    { label: "HNO₃",       value: "HNO_3" },
    { label: "H₃PO₄",      value: "H_3PO_4" },
    { label: "NaOH",       value: "NaOH" },
    { label: "KOH",        value: "KOH" },
    { label: "Ca(OH)₂",    value: "Ca(OH)_2" },
    { label: "CaCO₃",      value: "CaCO_3" },
    { label: "Na₂CO₃",     value: "Na_2CO_3" },
    { label: "NaHCO₃",     value: "NaHCO_3" },
    { label: "CuSO₄",      value: "CuSO_4" },
    { label: "FeSO₄",      value: "FeSO_4" },
    { label: "Fe₂O₃",      value: "Fe_2O_3" },
    { label: "Al₂O₃",      value: "Al_2O_3" },
    { label: "SO₂",        value: "SO_2" },
    { label: "NO₂",        value: "NO_2" },
    { label: "H⁺",         value: "H^+" },
    { label: "OH⁻",        value: "OH^-" },
    { label: "Na⁺",        value: "Na^+" },
    { label: "Ca²⁺",       value: "Ca^{2+}" },
    { label: "Fe²⁺",       value: "Fe^{2+}" },
    { label: "Fe³⁺",       value: "Fe^{3+}" },
    { label: "Cu²⁺",       value: "Cu^{2+}" },
    { label: "SO₄²⁻",      value: "SO_4^{2-}" },
    { label: "NO₃⁻",       value: "NO_3^-" },
    { label: "CO₃²⁻",      value: "CO_3^{2-}" },
    { label: "NH₄⁺",       value: "NH_4^+" },
    { label: "e⁻",         value: "e^-" },
    { label: "→",           value: "\\rightarrow" },
    { label: "⇌",           value: "\\rightleftharpoons" },
    { label: "↑ gas",       value: "\\uparrow" },
    { label: "↓ ppt",       value: "\\downarrow" },
    { label: "(aq)",        value: "_{(aq)}" },
    { label: "(l)",         value: "_{(l)}" },
    { label: "(g)",         value: "_{(g)}" },
    { label: "(s)",         value: "_{(s)}" },
    { label: "Δ heat",      value: "\\Delta" },
    { label: "Kₑq",         value: "K_{eq}" },
    { label: "Ka",          value: "K_a" },
    { label: "Kb",          value: "K_b" },
    { label: "Ksp",         value: "K_{sp}" },
    { label: "pH=-log[H⁺]", value: "pH=-\\log[H^+]" },
    { label: "-CH₃",        value: "-CH_3" },
    { label: "-COOH",       value: "-COOH" },
    { label: "-OH",         value: "-OH" },
    { label: "-NH₂",        value: "-NH_2" },
    { label: "C=O",         value: "C=O" },
    { label: "C≡C",         value: "C\\equiv C" },
  ],
  Symbols: [
    { label: "α",  value: "\\alpha" },
    { label: "β",  value: "\\beta" },
    { label: "γ",  value: "\\gamma" },
    { label: "Γ",  value: "\\Gamma" },
    { label: "δ",  value: "\\delta" },
    { label: "Δ",  value: "\\Delta" },
    { label: "ε",  value: "\\epsilon" },
    { label: "θ",  value: "\\theta" },
    { label: "Θ",  value: "\\Theta" },
    { label: "λ",  value: "\\lambda" },
    { label: "Λ",  value: "\\Lambda" },
    { label: "μ",  value: "\\mu" },
    { label: "ν",  value: "\\nu" },
    { label: "π",  value: "\\pi" },
    { label: "Π",  value: "\\Pi" },
    { label: "ρ",  value: "\\rho" },
    { label: "σ",  value: "\\sigma" },
    { label: "Σ",  value: "\\Sigma" },
    { label: "τ",  value: "\\tau" },
    { label: "φ",  value: "\\phi" },
    { label: "Φ",  value: "\\Phi" },
    { label: "ω",  value: "\\omega" },
    { label: "Ω",  value: "\\Omega" },
    { label: "ψ",  value: "\\psi" },
    { label: "≠",  value: "\\neq" },
    { label: "≈",  value: "\\approx" },
    { label: "≡",  value: "\\equiv" },
    { label: "≤",  value: "\\leq" },
    { label: "≥",  value: "\\geq" },
    { label: "∝",  value: "\\propto" },
    { label: "±",  value: "\\pm" },
    { label: "∓",  value: "\\mp" },
    { label: "×",  value: "\\times" },
    { label: "÷",  value: "\\div" },
    { label: "·",  value: "\\cdot" },
    { label: "∞",  value: "\\infty" },
    { label: "°",  value: "^{\\circ}" },
    { label: "∧",  value: "\\wedge" },
    { label: "∨",  value: "\\vee" },
    { label: "¬",  value: "\\neg" },
    { label: "⟹",  value: "\\Rightarrow" },
    { label: "⟺",  value: "\\Leftrightarrow" },
    { label: "∴",  value: "\\therefore" },
    { label: "∵",  value: "\\because" },
    { label: "∀",  value: "\\forall" },
    { label: "∃",  value: "\\exists" },
    { label: "∈",  value: "\\in" },
    { label: "∉",  value: "\\notin" },
    { label: "⊂",  value: "\\subset" },
    { label: "∪",  value: "\\cup" },
    { label: "∩",  value: "\\cap" },
    { label: "∅",  value: "\\emptyset" },
    { label: "ℕ",  value: "\\mathbb{N}" },
    { label: "ℤ",  value: "\\mathbb{Z}" },
    { label: "ℝ",  value: "\\mathbb{R}" },
    { label: "ℂ",  value: "\\mathbb{C}" },
    { label: "→",  value: "\\rightarrow" },
    { label: "←",  value: "\\leftarrow" },
    { label: "↔",  value: "\\leftrightarrow" },
    { label: "⇒",  value: "\\Rightarrow" },
    { label: "⇐",  value: "\\Leftarrow" },
    { label: "↑",  value: "\\uparrow" },
    { label: "↓",  value: "\\downarrow" },
    { label: "ℏ",  value: "\\hbar" },
    { label: "∇",  value: "\\nabla" },
    { label: "∂",  value: "\\partial" },
    { label: "⊥",  value: "\\perp" },
    { label: "∥",  value: "\\parallel" },
    { label: "∠",  value: "\\angle" },
    { label: "△",  value: "\\triangle" },
    { label: "≅",  value: "\\cong" },
    { label: "∼",  value: "\\sim" },
    { label: "∘",  value: "\\circ" },
  ],
};

export default function SimpleMathInput({ value, onChange }) {
  const mfRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState("Math");
  const [open, setOpen] = useState(false);

  // Init MathLive and enable space key
  useEffect(() => {
    import("mathlive").then((ML) => {
      try {
        if (ML.default)
          ML.default.fontsDirectory = "https://unpkg.com/mathlive@0.109.0/dist/fonts/";
        if (window.MathfieldElement)
          window.MathfieldElement.fontsDirectory = "https://unpkg.com/mathlive@0.109.0/dist/fonts/";
        setIsReady(true);
      } catch (err) {
        console.error("MathLive init failed:", err);
      }
    });
  }, []);

  // Enable space key + set value once ready
  useEffect(() => {
    const el = mfRef.current;
    if (!el || !isReady) return;
    try {
      // Space inserts a LaTeX thin space so students can separate terms
      el.mathModeSpace = "\\,";
      if (value !== undefined && el.value !== value) el.value = value;
    } catch (e) {
      console.warn("MathLive config failed:", e);
    }
  }, [isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes
  useEffect(() => {
    const el = mfRef.current;
    if (!el || !isReady || value === undefined) return;
    try {
      if (el.value !== value) el.value = value;
    } catch (e) {}
  }, [value, isReady]);

  const handleFieldChange = useCallback(() => {
    const el = mfRef.current;
    if (!el) return;
    try {
      const v = el.value?.trim() || "";
      if (v && v !== "\\placeholder{}") onChange(v);
    } catch (e) {}
  }, [onChange]);

  useEffect(() => {
    const el = mfRef.current;
    if (!el) return;
    const events = ["input", "change", "blur"];
    events.forEach((ev) => el.addEventListener(ev, handleFieldChange));
    return () => events.forEach((ev) => el.removeEventListener(ev, handleFieldChange));
  }, [handleFieldChange]);

  const insertTemplate = useCallback((template) => {
    const el = mfRef.current;
    if (!el || !isReady) return;
    try {
      el.value = (el.value || "") + template;
      setTimeout(() => { handleFieldChange(); el.focus(); }, 0);
    } catch (e) {}
  }, [isReady, handleFieldChange]);

  return (
    <div className="w-full">
      {/* MathLive field */}
      <div className="mb-2 border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
        <math-field
          ref={mfRef}
          style={{
            width: "100%",
            padding: "14px 16px",
            fontSize: "16px",
            display: "block",
            minHeight: "60px",
            fontFamily: "'Lato', sans-serif",
            boxSizing: "border-box",
            background: "#ffffff",
            color: "#111827",
            "--selection-background-color": "#dbeafe",
            "--contains-highlight-background-color": "transparent",
          }}
          virtual-keyboard-mode="onfocus"
          fonts-directory="https://unpkg.com/mathlive@0.109.0/dist/fonts/"
        />
      </div>

      {isReady && (
        <>
          {/* Toggle */}
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
            {open ? "Hide symbols" : "± Symbols / Chemistry"}
          </button>

          {/* Collapsible panel */}
          {open && (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "10px 12px",
                background: "#fafafa",
              }}
            >
              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10, borderBottom: "1px solid #e5e7eb", paddingBottom: 6 }}>
                {Object.keys(SYMBOL_LIBRARY).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "4px 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      background: activeTab === tab ? "#1a6fc4" : "transparent",
                      color: activeTab === tab ? "#fff" : "#6b7280",
                      transition: "all 0.15s",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Symbol grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
                  gap: 5,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {SYMBOL_LIBRARY[activeTab].map((sym) => (
                  <button
                    key={sym.value}
                    type="button"
                    onClick={() => insertTemplate(sym.value)}
                    title={sym.label}
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
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  >
                    {sym.label}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                ✓ Click to insert at cursor · or type directly in the field above
              </p>
            </div>
          )}
        </>
      )}

      {!isReady && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-sm text-gray-500">Loading math editor…</p>
        </div>
      )}
    </div>
  );
}
