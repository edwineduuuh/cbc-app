"use client";
import { useState } from "react";

// All formulas insert LaTeX strings rendered by MathJax ($...$  or $$...$$)
const PHYSICS_FORMULAS = {
  Kinematics: [
    { l: "v=u+at", v: "$v = u + at$", title: "1st equation of motion" },
    {
      l: "s=ut+Â½atÂ²",
      v: "$s = ut + \\frac{1}{2}at^2$",
      title: "2nd equation of motion",
    },
    { l: "vÂ²=uÂ²+2as", v: "$v^2 = u^2 + 2as$", title: "3rd equation of motion" },
    {
      l: "s=Â½(u+v)t",
      v: "$s = \\frac{1}{2}(u+v)t$",
      title: "Average displacement",
    },
    { l: "a=(v-u)/t", v: "$a = \\frac{v - u}{t}$", title: "Acceleration" },
    { l: "v=s/t", v: "$v = \\frac{s}{t}$", title: "Speed" },
  ],
  "Forces & Momentum": [
    { l: "F=ma", v: "$F = ma$", title: "Newton's 2nd Law" },
    { l: "W=mg", v: "$W = mg$", title: "Weight" },
    { l: "p=mv", v: "$p = mv$", title: "Momentum" },
    {
      l: "F=Î”p/Î”t",
      v: "$F = \\frac{\\Delta p}{\\Delta t}$",
      title: "Force = rate of change of momentum",
    },
    {
      l: "Ft=Î”p",
      v: "$Ft = \\Delta p$",
      title: "Impulse = change in momentum",
    },
    { l: "F=Î¼N", v: "$F = \\mu N$", title: "Friction force" },
  ],
  "Energy & Power": [
    { l: "KE=Â½mvÂ²", v: "$KE = \\frac{1}{2}mv^2$", title: "Kinetic Energy" },
    { l: "GPE=mgh", v: "$GPE = mgh$", title: "Gravitational Potential Energy" },
    { l: "W=Fd", v: "$W = Fd\\cos\\theta$", title: "Work done" },
    { l: "P=W/t", v: "$P = \\frac{W}{t}$", title: "Power" },
    { l: "P=Fv", v: "$P = Fv$", title: "Power (force Ã— velocity)" },
    {
      l: "eff=%",
      v: "$\\eta = \\frac{P_{out}}{P_{in}} \\times 100\\%$",
      title: "Efficiency",
    },
    {
      l: "E=mgh+Â½mvÂ²",
      v: "$E = mgh + \\frac{1}{2}mv^2$",
      title: "Total mechanical energy",
    },
  ],
  "Thermal Physics": [
    {
      l: "Q=mcÎ”T",
      v: "$Q = mc\\Delta T$",
      title: "Heat capacity (no change of state)",
    },
    { l: "Q=mLf", v: "$Q = mL_f$", title: "Latent heat of fusion" },
    { l: "Q=mLv", v: "$Q = mL_v$", title: "Latent heat of vaporisation" },
    { l: "Pt=mLf", v: "$Pt = mL_f$", title: "Electrical heating to melt" },
    {
      l: "Pt=mcÎ”T",
      v: "$Pt = mc\\Delta T$",
      title: "Electrical heating (no change of state)",
    },
    { l: "PV=nRT", v: "$PV = nRT$", title: "Ideal Gas Law" },
    {
      l: "Pâ‚Vâ‚=Pâ‚‚Vâ‚‚",
      v: "$P_1V_1 = P_2V_2$",
      title: "Boyle's Law (constant T)",
    },
    {
      l: "V/T=const",
      v: "$\\frac{V_1}{T_1} = \\frac{V_2}{T_2}$",
      title: "Charles' Law (constant P)",
    },
    {
      l: "P/T=const",
      v: "$\\frac{P_1}{T_1} = \\frac{P_2}{T_2}$",
      title: "Pressure Law (constant V)",
    },
    {
      l: "Pâ‚Vâ‚/Tâ‚=Pâ‚‚Vâ‚‚/Tâ‚‚",
      v: "$\\frac{P_1V_1}{T_1} = \\frac{P_2V_2}{T_2}$",
      title: "Combined Gas Law",
    },
    {
      l: "T(K)=T(Â°C)+273",
      v: "$T(K) = T(^\\circ C) + 273$",
      title: "Kelvin-Celsius conversion",
    },
  ],
  Electrostatics: [
    {
      l: "F=kqâ‚qâ‚‚/rÂ²",
      v: "$F = \\frac{kq_1q_2}{r^2}$",
      title: "Coulomb's Law",
    },
    { l: "E=F/q", v: "$E = \\frac{F}{q}$", title: "Electric field strength" },
    {
      l: "E=kQ/rÂ²",
      v: "$E = \\frac{kQ}{r^2}$",
      title: "Electric field (point charge)",
    },
    {
      l: "V=kQ/r",
      v: "$V = \\frac{kQ}{r}$",
      title: "Electric potential (point charge)",
    },
    { l: "W=qV", v: "$W = qV$", title: "Work done moving charge" },
    {
      l: "E=V/d",
      v: "$E = \\frac{V}{d}$",
      title: "Uniform field between plates",
    },
    { l: "C=Q/V", v: "$C = \\frac{Q}{V}$", title: "Capacitance" },
    {
      l: "E=Â½CVÂ²",
      v: "$E = \\frac{1}{2}CV^2$",
      title: "Energy stored in capacitor",
    },
    {
      l: "E=QÂ²/2C",
      v: "$E = \\frac{Q^2}{2C}$",
      title: "Energy stored in capacitor (alt)",
    },
  ],
  "Current Electricity": [
    { l: "V=IR", v: "$V = IR$", title: "Ohm's Law" },
    { l: "P=IV", v: "$P = IV$", title: "Electrical Power" },
    { l: "P=IÂ²R", v: "$P = I^2R$", title: "Power (in terms of R)" },
    { l: "P=VÂ²/R", v: "$P = \\frac{V^2}{R}$", title: "Power (in terms of V)" },
    { l: "Q=It", v: "$Q = It$", title: "Electric charge" },
    { l: "E=Pt=VIt", v: "$E = Pt = VIt$", title: "Electrical Energy" },
    {
      l: "Rs=Râ‚+Râ‚‚+â€¦",
      v: "$R_s = R_1 + R_2 + \\cdots$",
      title: "Resistors in series",
    },
    {
      l: "1/Rp=1/Râ‚+â€¦",
      v: "$\\frac{1}{R_p} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\cdots$",
      title: "Resistors in parallel",
    },
    {
      l: "EMF=V+Ir",
      v: "$\\varepsilon = V + Ir$",
      title: "EMF with internal resistance",
    },
    {
      l: "R=Ïl/A",
      v: "$R = \\frac{\\rho l}{A}$",
      title: "Resistance (resistivity)",
    },
  ],
  Waves: [
    { l: "v=fÎ»", v: "$v = f\\lambda$", title: "Wave speed" },
    { l: "T=1/f", v: "$T = \\frac{1}{f}$", title: "Period" },
    { l: "n=c/v", v: "$n = \\frac{c}{v}$", title: "Refractive index" },
    {
      l: "nâ‚sinÎ¸â‚=nâ‚‚sinÎ¸â‚‚",
      v: "$n_1\\sin\\theta_1 = n_2\\sin\\theta_2$",
      title: "Snell's Law",
    },
    { l: "sinC=1/n", v: "$\\sin C = \\frac{1}{n}$", title: "Critical angle" },
    {
      l: "1/f=1/u+1/v",
      v: "$\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}$",
      title: "Lens/mirror formula",
    },
    {
      l: "m=v/u=hi/ho",
      v: "$m = \\frac{v}{u} = \\frac{h_i}{h_o}$",
      title: "Magnification",
    },
    { l: "f=R/2", v: "$f = \\frac{R}{2}$", title: "Focal length of mirror" },
  ],
  "Circular & Gravitation": [
    { l: "v=rÏ‰", v: "$v = r\\omega$", title: "Linear velocity" },
    {
      l: "a=vÂ²/r",
      v: "$a = \\frac{v^2}{r}$",
      title: "Centripetal acceleration",
    },
    { l: "F=mvÂ²/r", v: "$F = \\frac{mv^2}{r}$", title: "Centripetal force" },
    {
      l: "T=2Ï€/Ï‰",
      v: "$T = \\frac{2\\pi}{\\omega}$",
      title: "Period of rotation",
    },
    {
      l: "F=Gmâ‚mâ‚‚/rÂ²",
      v: "$F = \\frac{Gm_1m_2}{r^2}$",
      title: "Newton's Law of Gravitation",
    },
    {
      l: "g=GM/rÂ²",
      v: "$g = \\frac{GM}{r^2}$",
      title: "Gravitational field strength",
    },
    {
      l: "GPE=-GMm/r",
      v: "$GPE = -\\frac{GMm}{r}$",
      title: "Gravitational PE",
    },
    {
      l: "v_esc=âˆš(2GM/r)",
      v: "$v_{esc} = \\sqrt{\\frac{2GM}{r}}$",
      title: "Escape velocity",
    },
  ],
  "Nuclear / Atomic": [
    { l: "E=mcÂ²", v: "$E = mc^2$", title: "Mass-energy equivalence" },
    { l: "E=hf", v: "$E = hf$", title: "Photon energy" },
    { l: "E=hf-Ï†", v: "$E_k = hf - \\phi$", title: "Photoelectric effect" },
    {
      l: "N=Nâ‚€e^-Î»t",
      v: "$N = N_0 e^{-\\lambda t}$",
      title: "Radioactive decay law",
    },
    {
      l: "tÂ½=ln2/Î»",
      v: "$t_{\\frac{1}{2}} = \\frac{\\ln 2}{\\lambda}$",
      title: "Half-life",
    },
    { l: "A=Î»N", v: "$A = \\lambda N$", title: "Activity" },
    {
      l: "Î”E=Î”mcÂ²",
      v: "$\\Delta E = \\Delta m c^2$",
      title: "Binding energy / Q-value",
    },
  ],
  Maths: [
    { l: "a/b", v: "$\\frac{a}{b}$", title: "Fraction" },
    { l: "âˆšx", v: "$\\sqrt{x}$", title: "Square root" },
    { l: "xâ¿", v: "$x^{n}$", title: "Power" },
    { l: "log", v: "$\\log_{10}(x)$", title: "Common logarithm" },
    { l: "ln", v: "$\\ln(x)$", title: "Natural logarithm" },
    {
      l: "sin/cos/tan",
      v: "$\\sin\\theta, \\cos\\theta, \\tan\\theta$",
      title: "Trig functions",
    },
    { l: "Î”", v: "$\\Delta$", title: "Delta (change in)" },
    { l: "âˆ‘", v: "$\\sum_{i=1}^{n}$", title: "Summation" },
    { l: "âˆ", v: "$\\propto$", title: "Proportional to" },
    { l: "â‰ˆ", v: "$\\approx$", title: "Approximately equal" },
    { l: "Â±", v: "$\\pm$", title: "Plus or minus" },
    { l: "Ã—10â¿", v: "$\\times 10^{n}$", title: "Scientific notation" },
  ],
};

export default function PhysicsFormulaBar({
  value,
  onChange,
  textareaRef,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState("Kinematics");

  function insert(formula) {
    const ta = textareaRef?.current;
    const cur = value ?? "";
    if (!ta) {
      onChange(cur + formula);
      return;
    }
    const start = ta.selectionStart ?? cur.length;
    const end = ta.selectionEnd ?? start;
    const newVal = cur.slice(0, start) + formula + cur.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + formula.length, start + formula.length);
    });
  }

  return (
    <div style={{ marginBottom: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: open ? "#7c3aed" : "#6b7280",
          background: open ? "#f5f3ff" : "#f3f4f6",
          border: `1px solid ${open ? "#c4b5fd" : "#e5e7eb"}`,
          borderRadius: 8,
          padding: "5px 12px",
          cursor: "pointer",
          marginBottom: open ? 8 : 0,
          transition: "all 0.15s",
        }}
      >
        <span>{open ? "â–²" : "â–¼"}</span>
        {open ? "Hide physics formulas" : "âˆ« Physics formulas (LaTeX)"}
      </button>

      {open && (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "10px 12px",
            background: "#fafafa",
          }}
        >
          {/* Tab row */}
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
            {Object.keys(PHYSICS_FORMULAS).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: tab === t ? "#7c3aed" : "transparent",
                  color: tab === t ? "#fff" : "#6b7280",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Formula buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))",
              gap: 5,
              maxHeight: 180,
              overflowY: "auto",
            }}
          >
            {PHYSICS_FORMULAS[tab].map((f) => (
              <button
                key={f.v}
                type="button"
                onClick={() => insert(f.v)}
                title={f.title}
                style={{
                  padding: "5px 6px",
                  fontSize: 11,
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
                  e.currentTarget.style.background = "#f5f3ff";
                  e.currentTarget.style.borderColor = "#c4b5fd";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                {f.l}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
            âœ“ Inserts LaTeX at cursor &mdash; renders via MathJax &mdash; hover
            a button for the full formula name &mdash; write any formula
            manually with{" "}
            <code
              style={{
                background: "#f1f5f9",
                padding: "1px 4px",
                borderRadius: 3,
              }}
            >
              $...$
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
