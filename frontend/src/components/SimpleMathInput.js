"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const TEMPLATE_LIBRARY = {
  Math: [
    // ── Fractions & Powers ──
    { label: "a/b", value: "\\frac{a}{b}" },
    { label: "x²", value: "x^{2}" },
    { label: "x³", value: "x^{3}" },
    { label: "xⁿ", value: "x^{n}" },
    { label: "xₙ", value: "x_{n}" },
    { label: "√x", value: "\\sqrt{x}" },
    { label: "∛x", value: "\\sqrt[3]{x}" },
    { label: "ⁿ√x", value: "\\sqrt[n]{x}" },
    { label: "x⁻¹", value: "x^{-1}" },
    { label: "aᵐ/aⁿ", value: "\\frac{a^{m}}{a^{n}}" },
    // ── Algebra ──
    { label: "|x|", value: "\\left|x\\right|" },
    { label: "(a+b)²", value: "(a+b)^{2}" },
    { label: "(a-b)²", value: "(a-b)^{2}" },
    { label: "a²−b²", value: "a^{2}-b^{2}" },
    { label: "ax²+bx+c", value: "ax^{2}+bx+c" },
    { label: "Quadratic formula", value: "x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}" },
    { label: "log(x)", value: "\\log(x)" },
    { label: "log_a(x)", value: "\\log_{a}(x)" },
    { label: "ln(x)", value: "\\ln(x)" },
    { label: "logₐb=c", value: "\\log_{a}b=c" },
    // ── Trigonometry ──
    { label: "sin θ", value: "\\sin\\theta" },
    { label: "cos θ", value: "\\cos\\theta" },
    { label: "tan θ", value: "\\tan\\theta" },
    { label: "sin²+cos²=1", value: "\\sin^{2}\\theta+\\cos^{2}\\theta=1" },
    { label: "sin⁻¹", value: "\\sin^{-1}" },
    { label: "cos⁻¹", value: "\\cos^{-1}" },
    { label: "tan⁻¹", value: "\\tan^{-1}" },
    { label: "cosec θ", value: "\\csc\\theta" },
    { label: "sec θ", value: "\\sec\\theta" },
    { label: "cot θ", value: "\\cot\\theta" },
    // ── Calculus ──
    { label: "dy/dx", value: "\\frac{dy}{dx}" },
    { label: "d²y/dx²", value: "\\frac{d^{2}y}{dx^{2}}" },
    { label: "∂f/∂x", value: "\\frac{\\partial f}{\\partial x}" },
    { label: "∫ dx", value: "\\int f(x)\\,dx" },
    { label: "∫ₐᵇ dx", value: "\\int_{a}^{b} f(x)\\,dx" },
    { label: "∑", value: "\\sum_{i=1}^{n}" },
    { label: "∏", value: "\\prod_{i=1}^{n}" },
    { label: "lim", value: "\\lim_{x\\to\\infty}" },
    { label: "lim x→0", value: "\\lim_{x\\to 0}" },
    // ── Vectors & Matrices ──
    { label: "⃗v (vector)", value: "\\vec{v}" },
    { label: "|v⃗|", value: "\\left|\\vec{v}\\right|" },
    { label: "a⃗·b⃗ (dot)", value: "\\vec{a}\\cdot\\vec{b}" },
    { label: "a⃗×b⃗ (cross)", value: "\\vec{a}\\times\\vec{b}" },
    { label: "2×2 matrix", value: "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}" },
    { label: "det(A)", value: "\\det(A)" },
    // ── Statistics & Probability ──
    { label: "x̄ (mean)", value: "\\bar{x}" },
    { label: "σ (std dev)", value: "\\sigma" },
    { label: "σ²", value: "\\sigma^{2}" },
    { label: "P(A)", value: "P(A)" },
    { label: "P(A|B)", value: "P(A|B)" },
    { label: "P(A∪B)", value: "P(A\\cup B)" },
    { label: "P(A∩B)", value: "P(A\\cap B)" },
    { label: "nCr", value: "\\binom{n}{r}" },
    { label: "nPr", value: "P(n,r)" },
    { label: "n!", value: "n!" },
    // ── Geometry ──
    { label: "Area circle", value: "A=\\pi r^{2}" },
    { label: "Circumference", value: "C=2\\pi r" },
    { label: "Pythagoras", value: "a^{2}+b^{2}=c^{2}" },
    { label: "Area triangle", value: "A=\\frac{1}{2}bh" },
    { label: "Volume sphere", value: "V=\\frac{4}{3}\\pi r^{3}" },
    { label: "Surface sphere", value: "SA=4\\pi r^{2}" },
    { label: "Volume cone", value: "V=\\frac{1}{3}\\pi r^{2}h" },
    { label: "Volume cylinder", value: "V=\\pi r^{2}h" },
    // ── Number Theory ──
    { label: "a≡b (mod n)", value: "a\\equiv b\\pmod{n}" },
    { label: "gcd(a,b)", value: "\\gcd(a,b)" },
    { label: "lcm(a,b)", value: "\\text{lcm}(a,b)" },
    // ── Complex Numbers ──
    { label: "a+bi", value: "a+bi" },
    { label: "e^(iθ)", value: "e^{i\\theta}" },
    { label: "Euler: e^(iπ)+1=0", value: "e^{i\\pi}+1=0" },
    { label: "|z|", value: "\\left|z\\right|" },
    { label: "z̄ (conjugate)", value: "\\bar{z}" },
  ],

  Chemistry: [
    // ── Common Compounds ──
    { label: "H₂O", value: "H_2O" },
    { label: "CO₂", value: "CO_2" },
    { label: "CO", value: "CO" },
    { label: "H₂", value: "H_2" },
    { label: "O₂", value: "O_2" },
    { label: "N₂", value: "N_2" },
    { label: "Cl₂", value: "Cl_2" },
    { label: "F₂", value: "F_2" },
    { label: "Br₂", value: "Br_2" },
    { label: "I₂", value: "I_2" },
    { label: "HCl", value: "HCl" },
    { label: "HBr", value: "HBr" },
    { label: "HF", value: "HF" },
    { label: "HI", value: "HI" },
    { label: "NaCl", value: "NaCl" },
    { label: "KCl", value: "KCl" },
    { label: "NH₃", value: "NH_3" },
    { label: "CH₄", value: "CH_4" },
    { label: "C₂H₆", value: "C_2H_6" },
    { label: "C₂H₄", value: "C_2H_4" },
    { label: "C₂H₂", value: "C_2H_2" },
    { label: "C₆H₆ (benzene)", value: "C_6H_6" },
    { label: "C₆H₁₂O₆ (glucose)", value: "C_6H_{12}O_6" },
    { label: "C₁₂H₂₂O₁₁ (sucrose)", value: "C_{12}H_{22}O_{11}" },
    // ── Acids & Bases ──
    { label: "H₂SO₄", value: "H_2SO_4" },
    { label: "HNO₃", value: "HNO_3" },
    { label: "H₃PO₄", value: "H_3PO_4" },
    { label: "H₂CO₃", value: "H_2CO_3" },
    { label: "HClO₄", value: "HClO_4" },
    { label: "NaOH", value: "NaOH" },
    { label: "KOH", value: "KOH" },
    { label: "Ca(OH)₂", value: "Ca(OH)_2" },
    { label: "Mg(OH)₂", value: "Mg(OH)_2" },
    { label: "Al(OH)₃", value: "Al(OH)_3" },
    // ── Salts & Oxides ──
    { label: "CaCO₃", value: "CaCO_3" },
    { label: "Na₂CO₃", value: "Na_2CO_3" },
    { label: "NaHCO₃", value: "NaHCO_3" },
    { label: "CaSO₄", value: "CaSO_4" },
    { label: "MgSO₄", value: "MgSO_4" },
    { label: "CuSO₄", value: "CuSO_4" },
    { label: "FeSO₄", value: "FeSO_4" },
    { label: "Fe₂O₃", value: "Fe_2O_3" },
    { label: "Fe₃O₄", value: "Fe_3O_4" },
    { label: "CaO", value: "CaO" },
    { label: "Na₂O", value: "Na_2O" },
    { label: "MgO", value: "MgO" },
    { label: "Al₂O₃", value: "Al_2O_3" },
    { label: "SO₂", value: "SO_2" },
    { label: "SO₃", value: "SO_3" },
    { label: "NO₂", value: "NO_2" },
    { label: "NO", value: "NO" },
    { label: "P₂O₅", value: "P_2O_5" },
    // ── Ions ──
    { label: "H⁺", value: "H^+" },
    { label: "OH⁻", value: "OH^-" },
    { label: "Na⁺", value: "Na^+" },
    { label: "K⁺", value: "K^+" },
    { label: "Ca²⁺", value: "Ca^{2+}" },
    { label: "Mg²⁺", value: "Mg^{2+}" },
    { label: "Fe²⁺", value: "Fe^{2+}" },
    { label: "Fe³⁺", value: "Fe^{3+}" },
    { label: "Cu²⁺", value: "Cu^{2+}" },
    { label: "Zn²⁺", value: "Zn^{2+}" },
    { label: "Al³⁺", value: "Al^{3+}" },
    { label: "Cl⁻", value: "Cl^-" },
    { label: "SO₄²⁻", value: "SO_4^{2-}" },
    { label: "NO₃⁻", value: "NO_3^-" },
    { label: "CO₃²⁻", value: "CO_3^{2-}" },
    { label: "HCO₃⁻", value: "HCO_3^-" },
    { label: "PO₄³⁻", value: "PO_4^{3-}" },
    { label: "NH₄⁺", value: "NH_4^+" },
    { label: "O²⁻", value: "O^{2-}" },
    { label: "e⁻ (electron)", value: "e^-" },
    // ── Reaction Arrows & Notation ──
    { label: "→ (reaction)", value: "\\rightarrow" },
    { label: "⇌ (equilibrium)", value: "\\rightleftharpoons" },
    { label: "↑ (gas)", value: "\\uparrow" },
    { label: "↓ (precipitate)", value: "\\downarrow" },
    { label: "Δ (heat)", value: "\\Delta" },
    { label: "[aq]", value: "_{(aq)}" },
    { label: "[l]", value: "_{(l)}" },
    { label: "[g]", value: "_{(g)}" },
    { label: "[s]", value: "_{(s)}" },
    // ── Electrochemistry ──
    { label: "E°cell", value: "E^{\\circ}_{cell}" },
    { label: "ΔG°", value: "\\Delta G^{\\circ}" },
    { label: "ΔH°", value: "\\Delta H^{\\circ}" },
    { label: "ΔS°", value: "\\Delta S^{\\circ}" },
    { label: "Kₑq", value: "K_{eq}" },
    { label: "Ka", value: "K_a" },
    { label: "Kb", value: "K_b" },
    { label: "Kw", value: "K_w" },
    { label: "Ksp", value: "K_{sp}" },
    { label: "pH = -log[H⁺]", value: "pH=-\\log[H^+]" },
    // ── Organic ──
    { label: "–CH₃", value: "-CH_3" },
    { label: "–CH₂–", value: "-CH_2-" },
    { label: "–COOH", value: "-COOH" },
    { label: "–OH", value: "-OH" },
    { label: "–NH₂", value: "-NH_2" },
    { label: "–CHO", value: "-CHO" },
    { label: "–C=O", value: "-C=O" },
    { label: "–C≡N", value: "-C\\equiv N" },
  ],

  Symbols: [
    // ── Greek Letters ──
    { label: "α alpha", value: "\\alpha" },
    { label: "β beta", value: "\\beta" },
    { label: "γ gamma", value: "\\gamma" },
    { label: "Γ Gamma", value: "\\Gamma" },
    { label: "δ delta", value: "\\delta" },
    { label: "Δ Delta", value: "\\Delta" },
    { label: "ε epsilon", value: "\\epsilon" },
    { label: "ζ zeta", value: "\\zeta" },
    { label: "η eta", value: "\\eta" },
    { label: "θ theta", value: "\\theta" },
    { label: "Θ Theta", value: "\\Theta" },
    { label: "ι iota", value: "\\iota" },
    { label: "κ kappa", value: "\\kappa" },
    { label: "λ lambda", value: "\\lambda" },
    { label: "Λ Lambda", value: "\\Lambda" },
    { label: "μ mu", value: "\\mu" },
    { label: "ν nu", value: "\\nu" },
    { label: "ξ xi", value: "\\xi" },
    { label: "π pi", value: "\\pi" },
    { label: "Π Pi", value: "\\Pi" },
    { label: "ρ rho", value: "\\rho" },
    { label: "σ sigma", value: "\\sigma" },
    { label: "Σ Sigma", value: "\\Sigma" },
    { label: "τ tau", value: "\\tau" },
    { label: "υ upsilon", value: "\\upsilon" },
    { label: "φ phi", value: "\\phi" },
    { label: "Φ Phi", value: "\\Phi" },
    { label: "χ chi", value: "\\chi" },
    { label: "ψ psi", value: "\\psi" },
    { label: "Ψ Psi", value: "\\Psi" },
    { label: "ω omega", value: "\\omega" },
    { label: "Ω Omega", value: "\\Omega" },
    // ── Comparison & Logic ──
    { label: "≠", value: "\\neq" },
    { label: "≈", value: "\\approx" },
    { label: "≡", value: "\\equiv" },
    { label: "≤", value: "\\leq" },
    { label: "≥", value: "\\geq" },
    { label: "≪", value: "\\ll" },
    { label: "≫", value: "\\gg" },
    { label: "∝", value: "\\propto" },
    { label: "∧ (and)", value: "\\wedge" },
    { label: "∨ (or)", value: "\\vee" },
    { label: "¬ (not)", value: "\\neg" },
    { label: "⟹", value: "\\Rightarrow" },
    { label: "⟺", value: "\\Leftrightarrow" },
    { label: "∴ therefore", value: "\\therefore" },
    { label: "∵ because", value: "\\because" },
    { label: "∀ for all", value: "\\forall" },
    { label: "∃ exists", value: "\\exists" },
    // ── Set Theory ──
    { label: "∈", value: "\\in" },
    { label: "∉", value: "\\notin" },
    { label: "⊂", value: "\\subset" },
    { label: "⊆", value: "\\subseteq" },
    { label: "⊃", value: "\\supset" },
    { label: "∪ union", value: "\\cup" },
    { label: "∩ intersect", value: "\\cap" },
    { label: "∅ empty set", value: "\\emptyset" },
    { label: "ℕ naturals", value: "\\mathbb{N}" },
    { label: "ℤ integers", value: "\\mathbb{Z}" },
    { label: "ℚ rationals", value: "\\mathbb{Q}" },
    { label: "ℝ reals", value: "\\mathbb{R}" },
    { label: "ℂ complex", value: "\\mathbb{C}" },
    // ── Arithmetic & Misc ──
    { label: "±", value: "\\pm" },
    { label: "∓", value: "\\mp" },
    { label: "×", value: "\\times" },
    { label: "÷", value: "\\div" },
    { label: "·", value: "\\cdot" },
    { label: "∞", value: "\\infty" },
    { label: "°", value: "^{\\circ}" },
    { label: "′ (prime)", value: "'" },
    { label: "″ (double prime)", value: "''" },
    { label: "‰ permille", value: "\\permille" },
    // ── Arrows ──
    { label: "→", value: "\\rightarrow" },
    { label: "←", value: "\\leftarrow" },
    { label: "↔", value: "\\leftrightarrow" },
    { label: "⇒", value: "\\Rightarrow" },
    { label: "⇐", value: "\\Leftarrow" },
    { label: "⇔", value: "\\Leftrightarrow" },
    { label: "↑", value: "\\uparrow" },
    { label: "↓", value: "\\downarrow" },
    { label: "↗", value: "\\nearrow" },
    { label: "↘", value: "\\searrow" },
    // ── Physics / Units ──
    { label: "ℏ (h-bar)", value: "\\hbar" },
    { label: "∇ nabla", value: "\\nabla" },
    { label: "∂ partial", value: "\\partial" },
    { label: "⊗ tensor", value: "\\otimes" },
    { label: "⊕ direct sum", value: "\\oplus" },
    { label: "〈ψ| bra", value: "\\langle\\psi|" },
    { label: "|ψ〉 ket", value: "|\\psi\\rangle" },
    { label: "★ star", value: "\\star" },
    { label: "∘ compose", value: "\\circ" },
    { label: "≅ congruent", value: "\\cong" },
    { label: "∼ similar", value: "\\sim" },
    { label: "⊥ perp", value: "\\perp" },
    { label: "∥ parallel", value: "\\parallel" },
    { label: "∠ angle", value: "\\angle" },
    { label: "△ triangle", value: "\\triangle" },
    { label: "□ square", value: "\\square" },
  ],
};

export default function SimpleMathInput({ value, onChange }) {
  const mfRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState("Math");

  useEffect(() => {
    import("mathlive").then((ML) => {
      try {
        if (ML.default)
          ML.default.fontsDirectory =
            "https://unpkg.com/mathlive@0.109.0/dist/fonts/";
        if (window.MathfieldElement)
          window.MathfieldElement.fontsDirectory =
            "https://unpkg.com/mathlive@0.109.0/dist/fonts/";
        setIsReady(true);
      } catch (err) {
        console.error("MathLive init failed:", err);
      }
    });
  }, []);

  useEffect(() => {
    const el = mfRef.current;
    if (!el || value === undefined) return;
    try {
      if (el.value !== value) el.value = value;
    } catch (e) {
      console.warn("Could not set field value:", e);
    }
  }, [value]);

  const handleFieldChange = useCallback(() => {
    const el = mfRef.current;
    if (!el) return;
    try {
      const currentValue = el.value?.trim() || "";
      if (currentValue && currentValue !== "\\placeholder{}")
        onChange(currentValue);
    } catch (e) {
      console.warn("Could not read field value:", e);
    }
  }, [onChange]);

  useEffect(() => {
    const el = mfRef.current;
    if (!el) return;
    const events = ["input", "change", "blur"];
    events.forEach((ev) => el.addEventListener(ev, handleFieldChange));
    return () => events.forEach((ev) => el.removeEventListener(ev, handleFieldChange));
  }, [handleFieldChange]);

  const insertTemplate = useCallback(
    (template) => {
      const el = mfRef.current;
      if (!el || !isReady) return;
      try {
        el.value = (el.value || "") + template;
        setTimeout(() => { handleFieldChange(); el.focus(); }, 0);
      } catch (e) {
        console.error("Insert failed:", e);
      }
    },
    [isReady, handleFieldChange],
  );

  return (
    <div className="w-full">
      {/* Math input field */}
      <div className="mb-3 border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
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
        <div>
          {/* Tabs */}
          <div className="flex gap-2 mb-3 border-b border-gray-200">
            {Object.keys(TEMPLATE_LIBRARY).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Symbol grid — 4 cols on small, 6 on medium, 8 on large */}
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 max-h-52 overflow-y-auto pr-1">
            {TEMPLATE_LIBRARY[activeTab].map((template) => (
              <button
                key={template.value}
                onClick={() => insertTemplate(template.value)}
                className="p-2 text-center bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 active:bg-blue-100 transition-all"
                title={template.label}
              >
                <div className="text-xs font-medium text-gray-700 leading-tight truncate">
                  {template.label}
                </div>
              </button>
            ))}
          </div>

          <p className="mt-2 text-xs text-gray-400">
            ✓ Click any button to insert it | or type directly in the field above
          </p>
        </div>
      )}

      {!isReady && (
        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg text-center">
          <p className="text-sm text-gray-600">Loading math editor...</p>
        </div>
      )}
    </div>
  );
}
