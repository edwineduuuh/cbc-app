"use client";
import { useState } from "react";

// Labels are pure ASCII - LaTeX values are inserted into the math field.
const PHYSICS_FORMULAS = {
  Kinematics: [
    { l:"v=u+at",          v:"$v = u + at$",                                    title:"1st equation of motion" },
    { l:"s=ut+1/2at^2",    v:"$s = ut + \\frac{1}{2}at^2$",                    title:"2nd equation of motion" },
    { l:"v^2=u^2+2as",     v:"$v^2 = u^2 + 2as$",                              title:"3rd equation of motion" },
    { l:"s=1/2(u+v)t",     v:"$s = \\frac{1}{2}(u+v)t$",                       title:"Average displacement" },
    { l:"a=(v-u)/t",       v:"$a = \\frac{v - u}{t}$",                         title:"Acceleration" },
    { l:"v=s/t",           v:"$v = \\frac{s}{t}$",                             title:"Speed" },
  ],
  "Forces & Momentum": [
    { l:"F=ma",            v:"$F = ma$",                                        title:"Newton's 2nd Law" },
    { l:"W=mg",            v:"$W = mg$",                                        title:"Weight" },
    { l:"p=mv",            v:"$p = mv$",                                        title:"Momentum" },
    { l:"F=Dp/Dt",         v:"$F = \\frac{\\Delta p}{\\Delta t}$",              title:"Force = rate of change of momentum" },
    { l:"Ft=Dp",           v:"$Ft = \\Delta p$",                                title:"Impulse" },
    { l:"F=uN",            v:"$F = \\mu N$",                                    title:"Friction force" },
  ],
  "Energy & Power": [
    { l:"KE=1/2mv^2",      v:"$KE = \\frac{1}{2}mv^2$",                        title:"Kinetic Energy" },
    { l:"GPE=mgh",         v:"$GPE = mgh$",                                     title:"Gravitational Potential Energy" },
    { l:"W=Fd cos(th)",    v:"$W = Fd\\cos\\theta$",                            title:"Work done" },
    { l:"P=W/t",           v:"$P = \\frac{W}{t}$",                             title:"Power" },
    { l:"P=Fv",            v:"$P = Fv$",                                        title:"Power = force x velocity" },
    { l:"eff=Pout/Pin",    v:"$\\eta = \\frac{P_{out}}{P_{in}} \\times 100\\%$", title:"Efficiency" },
    { l:"E=mgh+1/2mv^2",   v:"$E = mgh + \\frac{1}{2}mv^2$",                   title:"Total mechanical energy" },
  ],
  "Thermal Physics": [
    { l:"Q=mcDT",          v:"$Q = mc\\Delta T$",                               title:"Heat (specific heat capacity)" },
    { l:"Q=mLf",           v:"$Q = mL_f$",                                      title:"Latent heat of fusion" },
    { l:"Q=mLv",           v:"$Q = mL_v$",                                      title:"Latent heat of vaporisation" },
    { l:"Pt=mLf",          v:"$Pt = mL_f$",                                     title:"Electrical heating to melt" },
    { l:"Pt=mcDT",         v:"$Pt = mc\\Delta T$",                              title:"Electrical heating (no change of state)" },
    { l:"PV=nRT",          v:"$PV = nRT$",                                      title:"Ideal Gas Law" },
    { l:"P1V1=P2V2",       v:"$P_1V_1 = P_2V_2$",                              title:"Boyle's Law" },
    { l:"V1/T1=V2/T2",     v:"$\\frac{V_1}{T_1} = \\frac{V_2}{T_2}$",         title:"Charles' Law" },
    { l:"P1/T1=P2/T2",     v:"$\\frac{P_1}{T_1} = \\frac{P_2}{T_2}$",         title:"Pressure Law" },
    { l:"P1V1/T1=P2V2/T2", v:"$\\frac{P_1V_1}{T_1} = \\frac{P_2V_2}{T_2}$",  title:"Combined Gas Law" },
    { l:"T(K)=T(C)+273",   v:"$T(K) = T(^\\circ C) + 273$",                   title:"Kelvin conversion" },
  ],
  Electrostatics: [
    { l:"F=kq1q2/r^2",     v:"$F = \\frac{kq_1q_2}{r^2}$",                    title:"Coulomb's Law" },
    { l:"E=F/q",           v:"$E = \\frac{F}{q}$",                             title:"Electric field strength" },
    { l:"E=kQ/r^2",        v:"$E = \\frac{kQ}{r^2}$",                          title:"Electric field (point charge)" },
    { l:"V=kQ/r",          v:"$V = \\frac{kQ}{r}$",                            title:"Electric potential" },
    { l:"W=qV",            v:"$W = qV$",                                        title:"Work moving charge" },
    { l:"E=V/d",           v:"$E = \\frac{V}{d}$",                             title:"Uniform field between plates" },
    { l:"C=Q/V",           v:"$C = \\frac{Q}{V}$",                             title:"Capacitance" },
    { l:"E=1/2CV^2",       v:"$E = \\frac{1}{2}CV^2$",                         title:"Energy in capacitor" },
    { l:"E=Q^2/2C",        v:"$E = \\frac{Q^2}{2C}$",                          title:"Energy in capacitor (alt)" },
  ],
  "Current Electricity": [
    { l:"V=IR",            v:"$V = IR$",                                        title:"Ohm's Law" },
    { l:"P=IV",            v:"$P = IV$",                                        title:"Electrical Power" },
    { l:"P=I^2R",          v:"$P = I^2R$",                                      title:"Power (resistance)" },
    { l:"P=V^2/R",         v:"$P = \\frac{V^2}{R}$",                           title:"Power (voltage)" },
    { l:"Q=It",            v:"$Q = It$",                                        title:"Electric charge" },
    { l:"E=Pt=VIt",        v:"$E = Pt = VIt$",                                 title:"Electrical Energy" },
    { l:"Rs=R1+R2+...",    v:"$R_s = R_1 + R_2 + \\cdots$",                   title:"Resistors in series" },
    { l:"1/Rp=1/R1+...",   v:"$\\frac{1}{R_p} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\cdots$", title:"Resistors in parallel" },
    { l:"EMF=V+Ir",        v:"$\\varepsilon = V + Ir$",                        title:"EMF with internal resistance" },
    { l:"R=pL/A",          v:"$R = \\frac{\\rho l}{A}$",                       title:"Resistivity" },
  ],
  Waves: [
    { l:"v=f*lam",         v:"$v = f\\lambda$",                                 title:"Wave speed" },
    { l:"T=1/f",           v:"$T = \\frac{1}{f}$",                             title:"Period" },
    { l:"n=c/v",           v:"$n = \\frac{c}{v}$",                             title:"Refractive index" },
    { l:"Snell's law",     v:"$n_1\\sin\\theta_1 = n_2\\sin\\theta_2$",        title:"Snell's Law" },
    { l:"sinC=1/n",        v:"$\\sin C = \\frac{1}{n}$",                       title:"Critical angle" },
    { l:"1/f=1/u+1/v",     v:"$\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}$", title:"Lens/mirror formula" },
    { l:"m=v/u",           v:"$m = \\frac{v}{u}$",                             title:"Magnification" },
  ],
  "Circular & Gravitation": [
    { l:"v=r*omega",       v:"$v = r\\omega$",                                  title:"Linear velocity" },
    { l:"a=v^2/r",         v:"$a = \\frac{v^2}{r}$",                           title:"Centripetal acceleration" },
    { l:"F=mv^2/r",        v:"$F = \\frac{mv^2}{r}$",                          title:"Centripetal force" },
    { l:"T=2pi/omega",     v:"$T = \\frac{2\\pi}{\\omega}$",                   title:"Period of rotation" },
    { l:"F=Gm1m2/r^2",     v:"$F = \\frac{Gm_1m_2}{r^2}$",                    title:"Newton's Law of Gravitation" },
    { l:"g=GM/r^2",        v:"$g = \\frac{GM}{r^2}$",                          title:"Gravitational field strength" },
    { l:"GPE=-GMm/r",      v:"$GPE = -\\frac{GMm}{r}$",                        title:"Gravitational PE" },
    { l:"v_esc=sqrt(2GM/r)",v:"$v_{esc} = \\sqrt{\\frac{2GM}{r}}$",            title:"Escape velocity" },
  ],
  "Nuclear / Atomic": [
    { l:"E=mc^2",          v:"$E = mc^2$",                                      title:"Mass-energy equivalence" },
    { l:"E=hf",            v:"$E = hf$",                                        title:"Photon energy" },
    { l:"Ek=hf-phi",       v:"$E_k = hf - \\phi$",                             title:"Photoelectric effect" },
    { l:"N=N0*e^(-lam*t)", v:"$N = N_0 e^{-\\lambda t}$",                     title:"Radioactive decay law" },
    { l:"t_half=ln2/lam",  v:"$t_{\\frac{1}{2}} = \\frac{\\ln 2}{\\lambda}$", title:"Half-life" },
    { l:"A=lam*N",         v:"$A = \\lambda N$",                               title:"Activity" },
    { l:"DE=Dm*c^2",       v:"$\\Delta E = \\Delta m c^2$",                    title:"Binding energy / Q-value" },
  ],
  Maths: [
    { l:"a/b",             v:"$\\frac{a}{b}$",                                  title:"Fraction" },
    { l:"sqrt(x)",         v:"$\\sqrt{x}$",                                     title:"Square root" },
    { l:"x^n",             v:"$x^{n}$",                                         title:"Power" },
    { l:"log10(x)",        v:"$\\log_{10}(x)$",                                 title:"Common logarithm" },
    { l:"ln(x)",           v:"$\\ln(x)$",                                       title:"Natural logarithm" },
    { l:"sin/cos/tan",     v:"$\\sin\\theta, \\cos\\theta, \\tan\\theta$",      title:"Trig functions" },
    { l:"Delta",           v:"$\\Delta$",                                        title:"Delta (change in)" },
    { l:"sum(i=1 to n)",   v:"$\\sum_{i=1}^{n}$",                              title:"Summation" },
    { l:"prop to",         v:"$\\propto$",                                      title:"Proportional to" },
    { l:"approx",          v:"$\\approx$",                                      title:"Approximately equal" },
    { l:"+/-",             v:"$\\pm$",                                          title:"Plus or minus" },
    { l:"x10^n",           v:"$\\times 10^{n}$",                               title:"Scientific notation" },
  ],
};

export default function PhysicsFormulaBar({ value, onChange, textareaRef }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("Kinematics");

  function insert(formula) {
    const ta = textareaRef?.current;
    const cur = value ?? "";
    if (!ta) { onChange(cur + formula); return; }
    const start = ta.selectionStart ?? cur.length;
    const end   = ta.selectionEnd   ?? start;
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
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12, fontWeight: 600,
          color: open ? "#7c3aed" : "#6b7280",
          background: open ? "#f5f3ff" : "#f3f4f6",
          border: "1px solid " + (open ? "#c4b5fd" : "#e5e7eb"),
          borderRadius: 8, padding: "5px 12px", cursor: "pointer",
          marginBottom: open ? 8 : 0, transition: "all 0.15s",
        }}
      >
        <span>{open ? "\u25B2" : "\u25BC"}</span>
        {open ? "Hide physics formulas" : "Physics formulas (LaTeX)"}
      </button>

      {open && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", background: "#fafafa" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 10, borderBottom: "1px solid #e5e7eb", paddingBottom: 6, flexWrap: "wrap" }}>
            {Object.keys(PHYSICS_FORMULAS).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{
                  padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6,
                  border: "none", cursor: "pointer", whiteSpace: "nowrap",
                  background: tab === t ? "#7c3aed" : "transparent",
                  color: tab === t ? "#fff" : "#6b7280", transition: "all 0.15s",
                }}>{t}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))", gap: 5, maxHeight: 180, overflowY: "auto" }}>
            {PHYSICS_FORMULAS[tab].map((f) => (
              <button key={f.v} type="button" onClick={() => insert(f.v)} title={f.title}
                style={{
                  padding: "5px 6px", fontSize: 11, fontWeight: 500,
                  color: "#1e293b", background: "#fff", border: "1px solid #e2e8f0",
                  borderRadius: 7, cursor: "pointer", textAlign: "center",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  transition: "background 0.1s, border-color 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f3ff"; e.currentTarget.style.borderColor = "#c4b5fd"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >{f.l}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
            {"\u2713"} Inserts LaTeX at cursor &mdash; renders via MathJax &mdash; hover for full name &mdash; type any formula with <code style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: 3 }}>$...$</code>
          </p>
        </div>
      )}
    </div>
  );
}