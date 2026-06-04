"use client";
import { useState } from "react";

var S2="\u00B2",S3="\u00B3",Sh="\u00BD",Sn="\u207F",Sm="\u207B";
var B0="\u2080",B1="\u2081",B2="\u2082",Bk="\u2096",Bs="\u209B",Bp="\u209A";
var Dlt="\u0394",mu="\u03BC",th="\u03B8",lm="\u03BB",om="\u03C9",pi="\u03C0";
var phi="\u03C6",eps="\u03B5",eta="\u03B7",rho="\u03C1";
var sq="\u221A",pm="\u00B1",deg="\u00B0",tm="\u00D7",mi="\u2212";
var Sg="\u03A3",pr="\u221D",ap="\u2248";

const PHYSICS_FORMULAS = {
  Kinematics: [
    { l:"v = u + at",                              v:"v = u + at",                                   title:"1st equation of motion" },
    { l:"s = ut + "+Sh+"at"+S2,                    v:"s = ut + "+Sh+"at"+S2,                         title:"2nd equation of motion" },
    { l:"v"+S2+" = u"+S2+" + 2as",                 v:"v"+S2+" = u"+S2+" + 2as",                      title:"3rd equation of motion" },
    { l:"s = "+Sh+"(u+v)t",                        v:"s = "+Sh+"(u+v)t",                             title:"Average displacement" },
    { l:"a = (v"+mi+"u)/t",                        v:"a = (v"+mi+"u)/t",                             title:"Acceleration" },
    { l:"v = s/t",                                 v:"v = s/t",                                      title:"Speed" },
  ],
  "Forces & Momentum": [
    { l:"F = ma",                                  v:"F = ma",                                       title:"Newton's 2nd Law" },
    { l:"W = mg",                                  v:"W = mg",                                       title:"Weight" },
    { l:"p = mv",                                  v:"p = mv",                                       title:"Momentum" },
    { l:"F = "+Dlt+"p/"+Dlt+"t",                   v:"F = "+Dlt+"p/"+Dlt+"t",                        title:"Force = rate of change of momentum" },
    { l:"Ft = "+Dlt+"p",                           v:"Ft = "+Dlt+"p",                                title:"Impulse" },
    { l:"F = "+mu+"N",                             v:"F = "+mu+"N",                                  title:"Friction force" },
  ],
  "Energy & Power": [
    { l:"KE = "+Sh+"mv"+S2,                        v:"KE = "+Sh+"mv"+S2,                             title:"Kinetic Energy" },
    { l:"GPE = mgh",                               v:"GPE = mgh",                                    title:"Gravitational Potential Energy" },
    { l:"W = Fd cos"+th,                           v:"W = Fd cos"+th,                                title:"Work done" },
    { l:"P = W/t",                                 v:"P = W/t",                                      title:"Power" },
    { l:"P = Fv",                                  v:"P = Fv",                                       title:"Power = force x velocity" },
    { l:eta+" = P_out/P_in",                       v:eta+" = P_out/P_in "+tm+" 100%",                title:"Efficiency" },
    { l:"E = mgh + "+Sh+"mv"+S2,                   v:"E = mgh + "+Sh+"mv"+S2,                        title:"Total mechanical energy" },
  ],
  "Thermal Physics": [
    { l:"Q = mc"+Dlt+"T",                          v:"Q = mc"+Dlt+"T",                               title:"Heat (specific heat capacity)" },
    { l:"Q = mLf",                                 v:"Q = mLf",                                      title:"Latent heat of fusion" },
    { l:"Q = mLv",                                 v:"Q = mLv",                                      title:"Latent heat of vaporisation" },
    { l:"Pt = mLf",                                v:"Pt = mLf",                                     title:"Electrical heating to melt" },
    { l:"Pt = mc"+Dlt+"T",                         v:"Pt = mc"+Dlt+"T",                              title:"Electrical heating (no state change)" },
    { l:"PV = nRT",                                v:"PV = nRT",                                     title:"Ideal Gas Law" },
    { l:"P"+B1+"V"+B1+" = P"+B2+"V"+B2,           v:"P"+B1+"V"+B1+" = P"+B2+"V"+B2,                title:"Boyle's Law" },
    { l:"V"+B1+"/T"+B1+" = V"+B2+"/T"+B2,         v:"V"+B1+"/T"+B1+" = V"+B2+"/T"+B2,              title:"Charles' Law" },
    { l:"P"+B1+"/T"+B1+" = P"+B2+"/T"+B2,         v:"P"+B1+"/T"+B1+" = P"+B2+"/T"+B2,              title:"Pressure Law" },
    { l:"P"+B1+"V"+B1+"/T"+B1+" = P"+B2+"V"+B2+"/T"+B2, v:"P"+B1+"V"+B1+"/T"+B1+" = P"+B2+"V"+B2+"/T"+B2, title:"Combined Gas Law" },
    { l:"T(K) = T("+deg+"C) + 273",               v:"T(K) = T("+deg+"C) + 273",                     title:"Kelvin conversion" },
  ],
  Electrostatics: [
    { l:"F = kq"+B1+"q"+B2+"/r"+S2,               v:"F = kq"+B1+"q"+B2+"/r"+S2,                    title:"Coulomb's Law" },
    { l:"E = F/q",                                 v:"E = F/q",                                      title:"Electric field strength" },
    { l:"E = kQ/r"+S2,                             v:"E = kQ/r"+S2,                                  title:"Electric field (point charge)" },
    { l:"V = kQ/r",                                v:"V = kQ/r",                                     title:"Electric potential" },
    { l:"W = qV",                                  v:"W = qV",                                       title:"Work moving charge" },
    { l:"E = V/d",                                 v:"E = V/d",                                      title:"Uniform field between plates" },
    { l:"C = Q/V",                                 v:"C = Q/V",                                      title:"Capacitance" },
    { l:"E = "+Sh+"CV"+S2,                         v:"E = "+Sh+"CV"+S2,                              title:"Energy in capacitor" },
    { l:"E = Q"+S2+"/2C",                          v:"E = Q"+S2+"/2C",                               title:"Energy in capacitor (alt)" },
  ],
  "Current Electricity": [
    { l:"V = IR",                                  v:"V = IR",                                       title:"Ohm's Law" },
    { l:"P = IV",                                  v:"P = IV",                                       title:"Electrical Power" },
    { l:"P = I"+S2+"R",                            v:"P = I"+S2+"R",                                 title:"Power (resistance)" },
    { l:"P = V"+S2+"/R",                           v:"P = V"+S2+"/R",                                title:"Power (voltage)" },
    { l:"Q = It",                                  v:"Q = It",                                       title:"Electric charge" },
    { l:"E = Pt = VIt",                            v:"E = Pt = VIt",                                 title:"Electrical Energy" },
    { l:"R"+Bs+" = R"+B1+"+R"+B2+"+\u2026",       v:"R"+Bs+" = R"+B1+" + R"+B2+" + \u2026",         title:"Resistors in series" },
    { l:"1/R"+Bp+" = 1/R"+B1+"+\u2026",           v:"1/R"+Bp+" = 1/R"+B1+" + 1/R"+B2+" + \u2026",  title:"Resistors in parallel" },
    { l:eps+" = V + Ir",                           v:eps+" = V + Ir",                                title:"EMF with internal resistance" },
    { l:"R = "+rho+"l/A",                          v:"R = "+rho+"l/A",                               title:"Resistivity" },
  ],
  Waves: [
    { l:"v = f"+lm,                                v:"v = f"+lm,                                     title:"Wave speed" },
    { l:"T = 1/f",                                 v:"T = 1/f",                                      title:"Period" },
    { l:"n = c/v",                                 v:"n = c/v",                                      title:"Refractive index" },
    { l:"n"+B1+"sin"+th+B1+" = n"+B2+"sin"+th+B2, v:"n"+B1+"sin"+th+B1+" = n"+B2+"sin"+th+B2,      title:"Snell's Law" },
    { l:"sin C = 1/n",                             v:"sin C = 1/n",                                  title:"Critical angle" },
    { l:"1/f = 1/u + 1/v",                         v:"1/f = 1/u + 1/v",                              title:"Lens/mirror formula" },
    { l:"m = v/u",                                 v:"m = v/u",                                      title:"Magnification" },
  ],
  "Circular & Gravitation": [
    { l:"v = r"+om,                                v:"v = r"+om,                                     title:"Linear velocity" },
    { l:"a = v"+S2+"/r",                           v:"a = v"+S2+"/r",                                title:"Centripetal acceleration" },
    { l:"F = mv"+S2+"/r",                          v:"F = mv"+S2+"/r",                               title:"Centripetal force" },
    { l:"T = 2"+pi+"/"+om,                         v:"T = 2"+pi+"/"+om,                              title:"Period of rotation" },
    { l:"F = Gm"+B1+"m"+B2+"/r"+S2,               v:"F = Gm"+B1+"m"+B2+"/r"+S2,                    title:"Newton's Law of Gravitation" },
    { l:"g = GM/r"+S2,                             v:"g = GM/r"+S2,                                  title:"Gravitational field strength" },
    { l:"GPE = "+mi+"GMm/r",                       v:"GPE = "+mi+"GMm/r",                            title:"Gravitational PE" },
    { l:"v_esc = "+sq+"(2GM/r)",                   v:"v_esc = "+sq+"(2GM/r)",                        title:"Escape velocity" },
  ],
  "Nuclear / Atomic": [
    { l:"E = mc"+S2,                               v:"E = mc"+S2,                                    title:"Mass-energy equivalence" },
    { l:"E = hf",                                  v:"E = hf",                                       title:"Photon energy" },
    { l:"E"+Bk+" = hf "+mi+" "+phi,                v:"E"+Bk+" = hf "+mi+" "+phi,                     title:"Photoelectric effect" },
    { l:"N = N"+B0+" exp("+mi+lm+"t)",             v:"N = N"+B0+" exp("+mi+lm+"t)",                  title:"Radioactive decay law" },
    { l:"t"+Sh+" = ln2/"+lm,                       v:"t"+Sh+" = ln2/"+lm,                            title:"Half-life" },
    { l:"A = "+lm+"N",                             v:"A = "+lm+"N",                                  title:"Activity" },
    { l:Dlt+"E = "+Dlt+"mc"+S2,                    v:Dlt+"E = "+Dlt+"mc"+S2,                         title:"Binding energy / Q-value" },
  ],
  Maths: [
    { l:"a/b",                                     v:"a/b",                                          title:"Fraction" },
    { l:sq+"x",                                    v:sq+"x",                                         title:"Square root" },
    { l:"x"+Sn,                                    v:"x"+Sn,                                         title:"Power / index" },
    { l:"log"+B1+B0+"(x)",                         v:"log"+B1+B0+"(x)",                              title:"Common logarithm" },
    { l:"ln(x)",                                   v:"ln(x)",                                        title:"Natural logarithm" },
    { l:"sin"+th+", cos"+th+", tan"+th,            v:"sin"+th+", cos"+th+", tan"+th,                 title:"Trig functions" },
    { l:Dlt,                                       v:Dlt,                                            title:"Delta (change in)" },
    { l:Sg,                                        v:Sg,                                             title:"Summation" },
    { l:pr,                                        v:pr,                                             title:"Proportional to" },
    { l:ap,                                        v:ap,                                             title:"Approximately equal" },
    { l:pm,                                        v:pm,                                             title:"Plus or minus" },
    { l:tm+"10"+Sn,                                v:tm+"10"+Sn,                                     title:"Scientific notation" },
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
        {open ? "Hide physics formulas" : "Physics formulas"}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 5, maxHeight: 200, overflowY: "auto" }}>
            {PHYSICS_FORMULAS[tab].map((f, i) => (
              <button key={i} type="button" onClick={() => insert(f.v)} title={f.title}
                style={{
                  padding: "5px 8px", fontSize: 12, fontWeight: 500,
                  color: "#1e293b", background: "#fff", border: "1px solid #e2e8f0",
                  borderRadius: 7, cursor: "pointer", textAlign: "center",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  transition: "background 0.1s, border-color 0.1s", fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f3ff"; e.currentTarget.style.borderColor = "#c4b5fd"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >{f.l}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, marginBottom: 0 }}>
            {"\u2713"} Inserts plain text at cursor &mdash; hover for full name
          </p>
        </div>
      )}
    </div>
  );
}