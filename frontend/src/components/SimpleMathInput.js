"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const SYMBOL_LIBRARY = {
  Math: [
    { label: "a/b", value: "\\frac{a}{b}" },
    { label: "x²", value: "x^{2}" },
    { label: "x³", value: "x^{3}" },
    { label: "xⁿ", value: "x^{n}" },
    { label: "x⁻¹", value: "x^{-1}" },
    { label: "√x", value: "\\sqrt{x}" },
    { label: "∛x", value: "\\sqrt[3]{x}" },
    { label: "ⁿ√x", value: "\\sqrt[n]{x}" },
    { label: "|x|", value: "\\left|x\\right|" },
    { label: "(a+b)²", value: "(a+b)^{2}" },
    { label: "Quadratic", value: "x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}" },
    { label: "log(x)", value: "\\log(x)" },
    { label: "logₐx", value: "\\log_{a}(x)" },
    { label: "ln(x)", value: "\\ln(x)" },
    { label: "sin θ", value: "\\sin\\theta" },
    { label: "cos θ", value: "\\cos\\theta" },
    { label: "tan θ", value: "\\tan\\theta" },
    { label: "sin⁻¹", value: "\\sin^{-1}" },
    { label: "cos⁻¹", value: "\\cos^{-1}" },
    { label: "tan⁻¹", value: "\\tan^{-1}" },
    { label: "sin²+cos²=1", value: "\\sin^{2}\\theta+\\cos^{2}\\theta=1" },
    { label: "dy/dx", value: "\\frac{dy}{dx}" },
    { label: "d²y/dx²", value: "\\frac{d^{2}y}{dx^{2}}" },
    { label: "∂f/∂x", value: "\\frac{\\partial f}{\\partial x}" },
    { label: "∫ dx", value: "\\int f(x)\\,dx" },
    { label: "∫ₐᵇ dx", value: "\\int_{a}^{b} f(x)\\,dx" },
    { label: "∑", value: "\\sum_{i=1}^{n}" },
    { label: "∏", value: "\\prod_{i=1}^{n}" },
    { label: "lim", value: "\\lim_{x\\to\\infty}" },
    { label: "v⃗", value: "\\vec{v}" },
    { label: "a⃗·b⃗", value: "\\vec{a}\\cdot\\vec{b}" },
    { label: "a⃗×b⃗", value: "\\vec{a}\\times\\vec{b}" },
    { label: "2×2 matrix", value: "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}" },
    { label: "x̄ mean", value: "\\bar{x}" },
    { label: "σ", value: "\\sigma" },
    { label: "P(A|B)", value: "P(A|B)" },
    { label: "nCr", value: "\\binom{n}{r}" },
    { label: "A=πr²", value: "A=\\pi r^{2}" },
    { label: "C=2πr", value: "C=2\\pi r" },
    { label: "a²+b²=c²", value: "a^{2}+b^{2}=c^{2}" },
    { label: "V=πr²h", value: "V=\\pi r^{2}h" },
    { label: "V sphere", value: "V=\\frac{4}{3}\\pi r^{3}" },
    { label: "a≡b (mod n)", value: "a\\equiv b\\pmod{n}" },
    { label: "a+bi", value: "a+bi" },
    { label: "e^(iπ)+1=0", value: "e^{i\\pi}+1=0" },
  ],
  Chemistry: [
    { label: "H₂O", value: "H_2O" },
    { label: "CO₂", value: "CO_2" },
    { label: "O₂", value: "O_2" },
    { label: "H₂", value: "H_2" },
    { label: "N₂", value: "N_2" },
    { label: "Cl₂", value: "Cl_2" },
    { label: "NH₃", value: "NH_3" },
    { label: "CH₄", value: "CH_4" },
    { label: "C₂H₆", value: "C_2H_6" },
    { label: "C₂H₄", value: "C_2H_4" },
    { label: "C₂H₂", value: "C_2H_2" },
    { label: "C₆H₆", value: "C_6H_6" },
    { label: "C₆H₁₂O₆", value: "C_6H_{12}O_6" },
    { label: "HCl", value: "HCl" },
    { label: "H₂SO₄", value: "H_2SO_4" },
    { label: "HNO₃", value: "HNO_3" },
    { label: "H₃PO₄", value: "H_3PO_4" },
    { label: "NaOH", value: "NaOH" },
    { label: "KOH", value: "KOH" },
    { label: "Ca(OH)₂", value: "Ca(OH)_2" },
    { label: "CaCO₃", value: "CaCO_3" },
    { label: "Na₂CO₃", value: "Na_2CO_3" },
    { label: "NaHCO₃", value: "NaHCO_3" },
    { label: "CuSO₄", value: "CuSO_4" },
    { label: "FeSO₄", value: "FeSO_4" },
    { label: "Fe₂O₃", value: "Fe_2O_3" },
    { label: "Al₂O₃", value: "Al_2O_3" },
    { label: "SO₂", value: "SO_2" },
    { label: "NO₂", value: "NO_2" },
    { label: "H⁺", value: "H^+" },
    { label: "OH⁻", value: "OH^-" },
    { label: "Na⁺", value: "Na^+" },
    { label: "Ca²⁺", value: "Ca^{2+}" },
    { label: "Fe²⁺", value: "Fe^{2+}" },
    { label: "Fe³⁺", value: "Fe^{3+}" },
    { label: "Cu²⁺", value: "Cu^{2+}" },
    { label: "SO₄²⁻", value: "SO_4^{2-}" },
    { label: "NO₃⁻", value: "NO_3^-" },
    { label: "CO₃²⁻", value: "CO_3^{2-}" },
    { label: "NH₄⁺", value: "NH_4^+" },
    { label: "e⁻", value: "e^-" },
    { label: "→", value: "\\rightarrow" },
    { label: "⇌", value: "\\rightleftharpoons" },
    { label: "↑ gas", value: "\\uparrow" },
    { label: "↓ ppt", value: "\\downarrow" },
    { label: "(aq)", value: "_{(aq)}" },
    { label: "(l)", value: "_{(l)}" },
    { label: "(g)", value: "_{(g)}" },
    { label: "(s)", value: "_{(s)}" },
    { label: "Δ heat", value: "\\Delta" },
    { label: "Kₑq", value: "K_{eq}" },
    { label: "Ka", value: "K_a" },
    { label: "Kb", value: "K_b" },
    { label: "Ksp", value: "K_{sp}" },
    { label: "pH=-log[H⁺]", value: "pH=-\\log[H^+]" },
    { label: "-CH₃", value: "-CH_3" },
    { label: "-COOH", value: "-COOH" },
    { label: "-OH", value: "-OH" },
    { label: "-NH₂", value: "-NH_2" },
    { label: "C=O", value: "C=O" },
    { label: "C≡C", value: "C\\equiv C" },
    { label: "KMnO₄", value: "KMnO_4" },
    { label: "K₂Cr₂O₇", value: "K_2Cr_2O_7" },
    { label: "MnO₄⁻", value: "MnO_4^-" },
    { label: "Cr₂O₇²⁻", value: "Cr_2O_7^{2-}" },
    { label: "Cl⁻", value: "Cl^-" },
    { label: "K⁺", value: "K^+" },
    { label: "Mg²⁺", value: "Mg^{2+}" },
    { label: "Al³⁺", value: "Al^{3+}" },
    { label: "Zn²⁺", value: "Zn^{2+}" },
    { label: "Ag⁺", value: "Ag^+" },
    { label: "Pb²⁺", value: "Pb^{2+}" },
    { label: "Mn²⁺", value: "Mn^{2+}" },
    { label: "Cr³⁺", value: "Cr^{3+}" },
    { label: "F⁻", value: "F^-" },
    { label: "Br⁻", value: "Br^-" },
    { label: "I⁻", value: "I^-" },
    { label: "O²⁻", value: "O^{2-}" },
    { label: "S²⁻", value: "S^{2-}" },
    { label: "HCO₃⁻", value: "HCO_3^-" },
    { label: "PO₄³⁻", value: "PO_4^{3-}" },
    { label: "1s²", value: "1s^{2}" },
    { label: "2s²", value: "2s^{2}" },
    { label: "2p¹", value: "2p^{1}" },
    { label: "2p³", value: "2p^{3}" },
    { label: "2p⁶", value: "2p^{6}" },
    { label: "3s¹", value: "3s^{1}" },
    { label: "3s²", value: "3s^{2}" },
    { label: "3p³", value: "3p^{3}" },
    { label: "3p⁶", value: "3p^{6}" },
    { label: "3d⁵", value: "3d^{5}" },
    { label: "3d¹⁰", value: "3d^{10}" },
    { label: "4s¹", value: "4s^{1}" },
    { label: "4s²", value: "4s^{2}" },
    { label: "4p⁶", value: "4p^{6}" },
    { label: "4d¹⁰", value: "4d^{10}" },
    { label: "4f¹⁴", value: "4f^{14}" },
    { label: "5s²", value: "5s^{2}" },
    { label: "ᴬᴢX", value: "{}^{A}_{Z}X" },
    { label: "¹²C", value: "{}^{12}_{6}C" },
    { label: "¹⁴C", value: "{}^{14}_{6}C" },
    { label: "²³⁸U", value: "{}^{238}_{92}U" },
    { label: "+I ox.", value: "\\overset{+1}{}" },
    { label: "+II ox.", value: "\\overset{+2}{}" },
    { label: "+III ox.", value: "\\overset{+3}{}" },
    { label: "ΔH°", value: "\\Delta H^{\\circ}" },
    { label: "ΔG°", value: "\\Delta G^{\\circ}" },
    { label: "ΔS°", value: "\\Delta S^{\\circ}" },
  ],
  Symbols: [
    { label: "α", value: "\\alpha" },
    { label: "β", value: "\\beta" },
    { label: "γ", value: "\\gamma" },
    { label: "Γ", value: "\\Gamma" },
    { label: "δ", value: "\\delta" },
    { label: "Δ", value: "\\Delta" },
    { label: "ε", value: "\\epsilon" },
    { label: "θ", value: "\\theta" },
    { label: "Θ", value: "\\Theta" },
    { label: "λ", value: "\\lambda" },
    { label: "Λ", value: "\\Lambda" },
    { label: "μ", value: "\\mu" },
    { label: "ν", value: "\\nu" },
    { label: "π", value: "\\pi" },
    { label: "Π", value: "\\Pi" },
    { label: "ρ", value: "\\rho" },
    { label: "σ", value: "\\sigma" },
    { label: "Σ", value: "\\Sigma" },
    { label: "τ", value: "\\tau" },
    { label: "φ", value: "\\phi" },
    { label: "Φ", value: "\\Phi" },
    { label: "ω", value: "\\omega" },
    { label: "Ω", value: "\\Omega" },
    { label: "ψ", value: "\\psi" },
    { label: "≠", value: "\\neq" },
    { label: "≈", value: "\\approx" },
    { label: "≡", value: "\\equiv" },
    { label: "≤", value: "\\leq" },
    { label: "≥", value: "\\geq" },
    { label: "∝", value: "\\propto" },
    { label: "±", value: "\\pm" },
    { label: "∓", value: "\\mp" },
    { label: "×", value: "\\times" },
    { label: "÷", value: "\\div" },
    { label: "·", value: "\\cdot" },
    { label: "∞", value: "\\infty" },
    { label: "°", value: "^{\\circ}" },
    { label: "∧", value: "\\wedge" },
    { label: "∨", value: "\\vee" },
    { label: "¬", value: "\\neg" },
    { label: "⟹", value: "\\Rightarrow" },
    { label: "⟺", value: "\\Leftrightarrow" },
    { label: "∴", value: "\\therefore" },
    { label: "∵", value: "\\because" },
    { label: "∀", value: "\\forall" },
    { label: "∃", value: "\\exists" },
    { label: "∈", value: "\\in" },
    { label: "∉", value: "\\notin" },
    { label: "⊂", value: "\\subset" },
    { label: "∪", value: "\\cup" },
    { label: "∩", value: "\\cap" },
    { label: "∅", value: "\\emptyset" },
    { label: "ℕ", value: "\\mathbb{N}" },
    { label: "ℤ", value: "\\mathbb{Z}" },
    { label: "ℝ", value: "\\mathbb{R}" },
    { label: "ℂ", value: "\\mathbb{C}" },
    { label: "→", value: "\\rightarrow" },
    { label: "←", value: "\\leftarrow" },
    { label: "↔", value: "\\leftrightarrow" },
    { label: "⇒", value: "\\Rightarrow" },
    { label: "⇐", value: "\\Leftarrow" },
    { label: "↑", value: "\\uparrow" },
    { label: "↓", value: "\\downarrow" },
    { label: "ℏ", value: "\\hbar" },
    { label: "∇", value: "\\nabla" },
    { label: "∂", value: "\\partial" },
    { label: "⊥", value: "\\perp" },
    { label: "∥", value: "\\parallel" },
    { label: "∠", value: "\\angle" },
    { label: "△", value: "\\triangle" },
    { label: "≅", value: "\\cong" },
    { label: "∼", value: "\\sim" },
    { label: "∘", value: "\\circ" },
  ],
  Physics: [
    { label: "v = u + at",                                     value: "v=u+at" },
    { label: "s = ut + \u00BDat\u00B2",                        value: "s=ut+\\frac{1}{2}at^{2}" },
    { label: "v\u00B2 = u\u00B2 + 2as",                       value: "v^{2}=u^{2}+2as" },
    { label: "s = \u00BD(u+v)t",                               value: "s=\\frac{1}{2}(u+v)t" },
    { label: "F = ma",                                         value: "F=ma" },
    { label: "W = mg",                                         value: "W=mg" },
    { label: "p = mv",                                         value: "p=mv" },
    { label: "Ft = \u0394p",                                   value: "Ft=\\Delta p" },
    { label: "KE = \u00BDmv\u00B2",                            value: "KE=\\frac{1}{2}mv^{2}" },
    { label: "GPE = mgh",                                      value: "GPE=mgh" },
    { label: "W = Fd cos\u03B8",                               value: "W=Fd\\cos\\theta" },
    { label: "P = W/t",                                        value: "P=\\frac{W}{t}" },
    { label: "P = Fv",                                         value: "P=Fv" },
    { label: "\u03B7 = P\u2092\u1D64\u209C/P\u1D62\u2099",    value: "\\eta=\\frac{P_{out}}{P_{in}}\\times100\\%" },
    { label: "Q = mc\u0394T",                                  value: "Q=mc\\Delta T" },
    { label: "Q = mL\u1DA0",                                   value: "Q=mL_{f}" },
    { label: "Q = mL\u1D65",                                   value: "Q=mL_{v}" },
    { label: "Pt = mL\u1DA0",                                  value: "Pt=mL_{f}" },
    { label: "PV = nRT",                                       value: "PV=nRT" },
    { label: "P\u2081V\u2081 = P\u2082V\u2082",               value: "P_{1}V_{1}=P_{2}V_{2}" },
    { label: "V\u2081/T\u2081 = V\u2082/T\u2082",             value: "\\frac{V_{1}}{T_{1}}=\\frac{V_{2}}{T_{2}}" },
    { label: "P\u2081/T\u2081 = P\u2082/T\u2082",             value: "\\frac{P_{1}}{T_{1}}=\\frac{P_{2}}{T_{2}}" },
    { label: "F = kq\u2081q\u2082/r\u00B2",                   value: "F=\\frac{kq_{1}q_{2}}{r^{2}}" },
    { label: "E = F/q",                                        value: "E=\\frac{F}{q}" },
    { label: "V = kQ/r",                                       value: "V=\\frac{kQ}{r}" },
    { label: "C = Q/V",                                        value: "C=\\frac{Q}{V}" },
    { label: "E = \u00BDCV\u00B2",                             value: "E=\\frac{1}{2}CV^{2}" },
    { label: "V = IR",                                         value: "V=IR" },
    { label: "P = IV",                                         value: "P=IV" },
    { label: "P = I\u00B2R",                                   value: "P=I^{2}R" },
    { label: "Q = It",                                         value: "Q=It" },
    { label: "R\u209B = R\u2081+R\u2082+\u2026",              value: "R_{s}=R_{1}+R_{2}+\\cdots" },
    { label: "1/R\u209A = 1/R\u2081+1/R\u2082",               value: "\\frac{1}{R_{p}}=\\frac{1}{R_{1}}+\\frac{1}{R_{2}}" },
    { label: "\u03B5 = V + Ir",                                value: "\\varepsilon=V+Ir" },
    { label: "v = f\u03BB",                                    value: "v=f\\lambda" },
    { label: "T = 1/f",                                        value: "T=\\frac{1}{f}" },
    { label: "n = c/v",                                        value: "n=\\frac{c}{v}" },
    { label: "n\u2081sin\u03B8\u2081 = n\u2082sin\u03B8\u2082", value: "n_{1}\\sin\\theta_{1}=n_{2}\\sin\\theta_{2}" },
    { label: "sin C = 1/n",                                    value: "\\sin C=\\frac{1}{n}" },
    { label: "1/f = 1/u + 1/v",                                value: "\\frac{1}{f}=\\frac{1}{u}+\\frac{1}{v}" },
    { label: "m = v/u",                                        value: "m=\\frac{v}{u}" },
    { label: "F = mv\u00B2/r",                                 value: "F=\\frac{mv^{2}}{r}" },
    { label: "a = v\u00B2/r",                                  value: "a=\\frac{v^{2}}{r}" },
    { label: "F = Gm\u2081m\u2082/r\u00B2",                   value: "F=\\frac{Gm_{1}m_{2}}{r^{2}}" },
    { label: "g = GM/r\u00B2",                                 value: "g=\\frac{GM}{r^{2}}" },
    { label: "E = mc\u00B2",                                   value: "E=mc^{2}" },
    { label: "E = hf",                                         value: "E=hf" },
    { label: "t\u00BD = ln2/\u03BB",                           value: "t_{\\frac{1}{2}}=\\frac{\\ln 2}{\\lambda}" },
    { label: "N = N\u2080e\u207B\u03BBt",                     value: "N=N_{0}e^{-\\lambda t}" },
    { label: "A = \u03BBN",                                    value: "A=\\lambda N" },
  ],
};
    { label: "s=ut+½at²", value: "s=ut+\\frac{1}{2}at^{2}" },
    { label: "v²=u²+2as", value: "v^{2}=u^{2}+2as" },
    { label: "s=½(u+v)t", value: "s=\\frac{1}{2}(u+v)t" },
    { label: "F=ma", value: "F=ma" },
    { label: "W=mg", value: "W=mg" },
    { label: "p=mv", value: "p=mv" },
    { label: "Ft=Δp", value: "Ft=\\Delta p" },
    { label: "KE=½mv²", value: "KE=\\frac{1}{2}mv^{2}" },
    { label: "GPE=mgh", value: "GPE=mgh" },
    { label: "W=Fd cosθ", value: "W=Fd\\cos\\theta" },
    { label: "P=W/t", value: "P=\\frac{W}{t}" },
    { label: "P=Fv", value: "P=Fv" },
    { label: "eff=%", value: "\\eta=\\frac{P_{out}}{P_{in}}\\times100\\%" },
    { label: "Q=mcΔT", value: "Q=mc\\Delta T" },
    { label: "Q=mLf", value: "Q=mL_{f}" },
    { label: "Q=mLv", value: "Q=mL_{v}" },
    { label: "Pt=mLf", value: "Pt=mL_{f}" },
    { label: "PV=nRT", value: "PV=nRT" },
    { label: "P₁V₁=P₂V₂", value: "P_{1}V_{1}=P_{2}V_{2}" },
    {
      label: "V₁/T₁=V₂/T₂",
      value: "\\frac{V_{1}}{T_{1}}=\\frac{V_{2}}{T_{2}}",
    },
    {
      label: "P₁/T₁=P₂/T₂",
      value: "\\frac{P_{1}}{T_{1}}=\\frac{P_{2}}{T_{2}}",
    },
    { label: "F=kq₁q₂/r²", value: "F=\\frac{kq_{1}q_{2}}{r^{2}}" },
    { label: "E=F/q", value: "E=\\frac{F}{q}" },
    { label: "V=kQ/r", value: "V=\\frac{kQ}{r}" },
    { label: "C=Q/V", value: "C=\\frac{Q}{V}" },
    { label: "E=½CV²", value: "E=\\frac{1}{2}CV^{2}" },
    { label: "V=IR", value: "V=IR" },
    { label: "P=IV", value: "P=IV" },
    { label: "P=I²R", value: "P=I^{2}R" },
    { label: "Q=It", value: "Q=It" },
    { label: "Rs=R₁+R₂", value: "R_{s}=R_{1}+R_{2}+\\cdots" },
    {
      label: "1/Rp",
      value: "\\frac{1}{R_{p}}=\\frac{1}{R_{1}}+\\frac{1}{R_{2}}",
    },
    { label: "EMF=V+Ir", value: "\\varepsilon=V+Ir" },
    { label: "v=fλ", value: "v=f\\lambda" },
    { label: "T=1/f", value: "T=\\frac{1}{f}" },
    { label: "n=c/v", value: "n=\\frac{c}{v}" },
    { label: "Snell's", value: "n_{1}\\sin\\theta_{1}=n_{2}\\sin\\theta_{2}" },
    { label: "sinC=1/n", value: "\\sin C=\\frac{1}{n}" },
    { label: "1/f=1/u+1/v", value: "\\frac{1}{f}=\\frac{1}{u}+\\frac{1}{v}" },
    { label: "m=v/u", value: "m=\\frac{v}{u}" },
    { label: "F=mv²/r", value: "F=\\frac{mv^{2}}{r}" },
    { label: "a=v²/r", value: "a=\\frac{v^{2}}{r}" },
    { label: "F=Gm₁m₂/r²", value: "F=\\frac{Gm_{1}m_{2}}{r^{2}}" },
    { label: "g=GM/r²", value: "g=\\frac{GM}{r^{2}}" },
    { label: "E=mc²", value: "E=mc^{2}" },
    { label: "E=hf", value: "E=hf" },
    { label: "t½=ln2/λ", value: "t_{\\frac{1}{2}}=\\frac{\\ln 2}{\\lambda}" },
    { label: "N=N₀e⁻λt", value: "N=N_{0}e^{-\\lambda t}" },
    { label: "A=λN", value: "A=\\lambda N" },
  ],
};

export default function SimpleMathInput({ value, onChange }) {
  const mfRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState("Math");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const isEmpty = !value || value.trim() === "" || value === "\\placeholder{}";

  // When searching, flatten all categories; otherwise show active tab only
  const filteredSymbols = search.trim()
    ? Object.values(SYMBOL_LIBRARY)
        .flat()
        .filter((s) => s.label.toLowerCase().includes(search.toLowerCase()))
    : SYMBOL_LIBRARY[activeTab];

  // Init MathLive fonts
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

  // Enable space key + set initial value once ready
  useEffect(() => {
    const el = mfRef.current;
    if (!el || !isReady) return;
    try {
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
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    const events = ["input", "change", "blur"];
    events.forEach((ev) => el.addEventListener(ev, handleFieldChange));
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    return () => {
      events.forEach((ev) => el.removeEventListener(ev, handleFieldChange));
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
    };
  }, [handleFieldChange]);

  // Insert at cursor position using MathLive's insert() API
  const insertTemplate = useCallback(
    (template) => {
      const el = mfRef.current;
      if (!el || !isReady) return;
      try {
        el.focus();
        el.insert(template);
        setTimeout(() => handleFieldChange(), 0);
      } catch (e) {
        // fallback: append to end
        try {
          el.value = (el.value || "") + template;
          setTimeout(() => {
            handleFieldChange();
            el.focus();
          }, 0);
        } catch (e2) {}
      }
    },
    [isReady, handleFieldChange],
  );

  return (
    <div style={{ width: "100%" }}>
      {/* ── Symbol picker (same style as ChemTextBar / PhysicsFormulaBar) ── */}
      {isReady && (
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              setSearch("");
            }}
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
            {open ? "Hide symbols" : "± Maths symbols"}
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
              {/* Tabs */}
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
                {Object.keys(SYMBOL_LIBRARY).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setActiveTab(t);
                      setSearch("");
                    }}
                    style={{
                      padding: "4px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      background: activeTab === t ? "#1a6fc4" : "transparent",
                      color: activeTab === t ? "#fff" : "#6b7280",
                      transition: "all 0.15s",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div style={{ position: "relative", marginBottom: 8 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    fontSize: 13,
                    pointerEvents: "none",
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search symbols… e.g. sin, H₂O, alpha"
                  style={{
                    width: "100%",
                    paddingLeft: 30,
                    paddingRight: 10,
                    paddingTop: 6,
                    paddingBottom: 6,
                    fontSize: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 7,
                    background: "#fff",
                    color: "#1e293b",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {search.trim() && (
                <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
                  {filteredSymbols.length} result
                  {filteredSymbols.length !== 1 ? "s" : ""} across all
                  categories
                </p>
              )}

              {/* Symbol grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
                  gap: 5,
                  maxHeight: 180,
                  overflowY: "auto",
                }}
              >
                {filteredSymbols.length > 0 ? (
                  filteredSymbols.map((sym) => (
                    <button
                      key={sym.value + sym.label}
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
                        minHeight: 36,
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
                      {sym.label}
                    </button>
                  ))
                ) : (
                  <p
                    style={{
                      gridColumn: "1/-1",
                      fontSize: 12,
                      color: "#9ca3af",
                      textAlign: "center",
                      padding: "16px 0",
                    }}
                  >
                    No results for &ldquo;{search}&rdquo;
                  </p>
                )}
              </div>

              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                ✓ Click to insert at cursor · type LaTeX directly below
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Math input ── */}
      <div
        style={{
          position: "relative",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {/* Custom placeholder — avoids MathLive rendering plain text as math italic */}
        {isEmpty && !isFocused && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              paddingLeft: 16,
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <span
              style={{ color: "#9ca3af", fontSize: 15, userSelect: "none" }}
            >
              {isReady
                ? "Type math here, or select a symbol above…"
                : "Loading math editor…"}
            </span>
          </div>
        )}
        <math-field
          ref={mfRef}
          style={{
            width: "100%",
            padding: "14px 16px",
            fontSize: "16px",
            display: "block",
            minHeight: "64px",
            fontFamily: "'Lato', sans-serif",
            boxSizing: "border-box",
            background: "transparent",
            color: "#111827",
            "--selection-background-color": "#dbeafe",
            "--contains-highlight-background-color": "transparent",
          }}
          virtual-keyboard-mode="onfocus"
          fonts-directory="https://unpkg.com/mathlive@0.109.0/dist/fonts/"
        />
      </div>
    </div>
  );
}
