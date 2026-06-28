# -*- coding: utf-8 -*-
"""Writes ChemTextBar.js and PhysicsFormulaBar.js with correct Unicode."""

# ── Unicode helpers ──────────────────────────────────────────────────────────
sup = {0:'⁰',1:'¹',2:'²',3:'³',4:'⁴',5:'⁵',6:'⁶',7:'⁷',8:'⁸',9:'⁹'}
sub = {0:'₀',1:'₁',2:'₂',3:'₃',4:'₄',5:'₅',6:'₆',7:'₇',8:'₈',9:'₉'}
plus='⁺'; minus='⁻'

def s(*digits): return ''.join(sup[d] for d in digits)
def b(*digits): return ''.join(sub[d] for d in digits)

arrow='→'; equil='⇌'; up='↑'; dn='↓'
Delta='Δ'; deg='°'; pm='±'; neq='≠'; leq='≤'; geq='≥'
times='×'; div='÷'; sqrt='√'; half='½'; quarter='¼'
alpha='α'; beta='β'; gamma='γ'; lam='λ'; mu='μ'; pi='π'; theta='θ'; omega='ω'
inf='∞'; propto='∝'; sigma='Σ'

# ── ChemTextBar ──────────────────────────────────────────────────────────────

def row(l, v, title=None):
    if title:
        return f'    {{ l: "{l}", v: "{v}", title: "{title}" }},'
    return f'    {{ l: "{l}", v: "{v}" }},'

ec_rows = [
    row(f'1s{s(1)}', f'1s{s(1)}'), row(f'1s{s(2)}', f'1s{s(2)}'),
    row(f'2s{s(1)}', f'2s{s(1)}'), row(f'2s{s(2)}', f'2s{s(2)}'),
    row(f'2p{s(1)}', f'2p{s(1)}'), row(f'2p{s(2)}', f'2p{s(2)}'), row(f'2p{s(3)}', f'2p{s(3)}'),
    row(f'2p{s(4)}', f'2p{s(4)}'), row(f'2p{s(5)}', f'2p{s(5)}'), row(f'2p{s(6)}', f'2p{s(6)}'),
    row(f'3s{s(1)}', f'3s{s(1)}'), row(f'3s{s(2)}', f'3s{s(2)}'),
    row(f'3p{s(1)}', f'3p{s(1)}'), row(f'3p{s(2)}', f'3p{s(2)}'), row(f'3p{s(3)}', f'3p{s(3)}'),
    row(f'3p{s(4)}', f'3p{s(4)}'), row(f'3p{s(5)}', f'3p{s(5)}'), row(f'3p{s(6)}', f'3p{s(6)}'),
    row(f'3d{s(1)}', f'3d{s(1)}'), row(f'3d{s(5)}', f'3d{s(5)}'), row(f'3d{s(1,0)}', f'3d{s(1,0)}'),
    row(f'4s{s(1)}', f'4s{s(1)}'), row(f'4s{s(2)}', f'4s{s(2)}'), row(f'4p{s(6)}', f'4p{s(6)}'),
    row(f'4d{s(1,0)}', f'4d{s(1,0)}'), row(f'4f{s(7)}', f'4f{s(7)}'), row(f'4f{s(1,4)}', f'4f{s(1,4)}'),
    row(f'5s{s(2)}', f'5s{s(2)}'), row(f'5p{s(6)}', f'5p{s(6)}'), row(f'5d{s(1,0)}', f'5d{s(1,0)}'), row(f'6s{s(2)}', f'6s{s(2)}'),
]

ion_rows = [
    row(f'H{plus}', f'H{plus}'), row(f'OH{minus}', f'OH{minus}'),
    row(f'Na{plus}', f'Na{plus}'), row(f'K{plus}', f'K{plus}'),
    row(f'Ca{s(2)}{plus}', f'Ca{s(2)}{plus}'), row(f'Mg{s(2)}{plus}', f'Mg{s(2)}{plus}'),
    row(f'Fe{s(2)}{plus}', f'Fe{s(2)}{plus}'), row(f'Fe{s(3)}{plus}', f'Fe{s(3)}{plus}'),
    row(f'Cu{s(2)}{plus}', f'Cu{s(2)}{plus}'), row(f'Cu{plus}', f'Cu{plus}'),
    row(f'Al{s(3)}{plus}', f'Al{s(3)}{plus}'), row(f'Zn{s(2)}{plus}', f'Zn{s(2)}{plus}'),
    row(f'Ag{plus}', f'Ag{plus}'), row(f'Pb{s(2)}{plus}', f'Pb{s(2)}{plus}'),
    row(f'Mn{s(2)}{plus}', f'Mn{s(2)}{plus}'), row(f'Cr{s(3)}{plus}', f'Cr{s(3)}{plus}'),
    row(f'NH{b(4)}{plus}', f'NH{b(4)}{plus}'),
    row(f'Cl{minus}', f'Cl{minus}'), row(f'F{minus}', f'F{minus}'),
    row(f'Br{minus}', f'Br{minus}'), row(f'I{minus}', f'I{minus}'),
    row(f'O{s(2)}{minus}', f'O{s(2)}{minus}'), row(f'S{s(2)}{minus}', f'S{s(2)}{minus}'),
    row(f'SO{b(4)}{s(2)}{minus}', f'SO{b(4)}{s(2)}{minus}'), row(f'NO{b(3)}{minus}', f'NO{b(3)}{minus}'),
    row(f'CO{b(3)}{s(2)}{minus}', f'CO{b(3)}{s(2)}{minus}'), row(f'HCO{b(3)}{minus}', f'HCO{b(3)}{minus}'),
    row(f'PO{b(4)}{s(3)}{minus}', f'PO{b(4)}{s(3)}{minus}'), row(f'MnO{b(4)}{minus}', f'MnO{b(4)}{minus}'),
    row(f'Cr{b(2)}O{b(7)}{s(2)}{minus}', f'Cr{b(2)}O{b(7)}{s(2)}{minus}'), row(f'e{minus}', f'e{minus}'),
]

formula_rows = [
    row(f'H{b(2)}O', f'H{b(2)}O'), row(f'CO{b(2)}', f'CO{b(2)}'),
    row(f'O{b(2)}', f'O{b(2)}'), row(f'H{b(2)}', f'H{b(2)}'),
    row(f'N{b(2)}', f'N{b(2)}'), row(f'Cl{b(2)}', f'Cl{b(2)}'),
    row(f'NH{b(3)}', f'NH{b(3)}'), row(f'CH{b(4)}', f'CH{b(4)}'),
    row(f'C{b(2)}H{b(2)}', f'C{b(2)}H{b(2)}'), row(f'C{b(2)}H{b(4)}', f'C{b(2)}H{b(4)}'),
    row(f'C{b(2)}H{b(6)}', f'C{b(2)}H{b(6)}'), row(f'C{b(3)}H{b(8)}', f'C{b(3)}H{b(8)}'),
    row(f'C{b(6)}H{b(1,2)}O{b(6)}', f'C{b(6)}H{b(1,2)}O{b(6)}'),
    row('HCl', 'HCl'), row(f'H{b(2)}SO{b(4)}', f'H{b(2)}SO{b(4)}'),
    row(f'HNO{b(3)}', f'HNO{b(3)}'), row(f'H{b(3)}PO{b(4)}', f'H{b(3)}PO{b(4)}'),
    row('NaOH', 'NaOH'), row('KOH', 'KOH'),
    row(f'Ca(OH){b(2)}', f'Ca(OH){b(2)}'), row(f'CaCO{b(3)}', f'CaCO{b(3)}'),
    row(f'Na{b(2)}CO{b(3)}', f'Na{b(2)}CO{b(3)}'), row(f'NaHCO{b(3)}', f'NaHCO{b(3)}'),
    row(f'CuSO{b(4)}', f'CuSO{b(4)}'), row(f'FeSO{b(4)}', f'FeSO{b(4)}'),
    row(f'Fe{b(2)}O{b(3)}', f'Fe{b(2)}O{b(3)}'), row(f'Al{b(2)}O{b(3)}', f'Al{b(2)}O{b(3)}'),
    row('MgO', 'MgO'), row('CaO', 'CaO'),
    row(f'SO{b(2)}', f'SO{b(2)}'), row(f'NO{b(2)}', f'NO{b(2)}'),
    row(f'KMnO{b(4)}', f'KMnO{b(4)}'), row(f'K{b(2)}Cr{b(2)}O{b(7)}', f'K{b(2)}Cr{b(2)}O{b(7)}'),
]

sym_rows = [
    row(arrow, arrow), row(equil, equil), row(up, up), row(dn, dn),
    row('(aq)', '(aq)'), row('(l)', '(l)'), row('(g)', '(g)'), row('(s)', '(s)'),
    row(Delta, Delta), row(f'{deg}C', f'{deg}C'),
    row(pm, pm), row(neq, neq), row(leq, leq), row(geq, geq),
    row(times, times), row(div, div), row(sqrt, sqrt), row(half, half),
    row(alpha, alpha), row(beta, beta), row(gamma, gamma), row(lam, lam),
    row(mu, mu), row(pi, pi), row(theta, theta), row(omega, omega),
    row(sigma, sigma), row(inf, inf), row(propto, propto), row(deg, deg),
]

nuclear_rows = [
    row(f'{s(4)}{b(2)}He', f'{s(4)}{b(2)}He', 'Alpha particle'),
    row(f'{s(0)}\u208b\u2081e', f'{s(0)}\u208b\u2081e', 'Beta-minus particle'),
    row(f'{s(0)}\u208a\u2081e', f'{s(0)}\u208a\u2081e', 'Positron (beta-plus)'),
    row(gamma, gamma, 'Gamma ray'),
    row(f'{s(1)}{b(0)}n', f'{s(1)}{b(0)}n', 'Neutron'),
    row(f'{s(1)}{b(1)}p', f'{s(1)}{b(1)}p', 'Proton'),
]

def section(name, rows):
    return f'  "{name}": [\n' + '\n'.join(rows) + '\n  ],'

chem_data = '\n'.join([
    section(f'e{minus} Config', ec_rows),
    section('Ions', ion_rows),
    section('Formulas', formula_rows),
    section('Symbols', sym_rows),
    section('Nuclear', nuclear_rows),
])

chem_js = '''"use client";
import { useState } from "react";

const CHEM_TEXT = {
''' + chem_data + '''
};

const TABS = Object.keys(CHEM_TEXT);

export default function ChemTextBar({ textareaRef, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(TABS[0]);

  const insert = (sym) => {
    const el = textareaRef?.current;
    if (el && typeof el.selectionStart === "number") {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = (value ?? "").slice(0, start) + sym + (value ?? "").slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + sym.length, start + sym.length);
      });
    } else {
      onChange((value ?? "") + sym);
    }
  };

  return (
    <div style={{ marginBottom: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          fontSize: 12, fontWeight: 600, padding: "4px 12px",
          background: open ? "#eff6ff" : "#f8fafc",
          border: "1.5px solid " + (open ? "#93c5fd" : "#e2e8f0"),
          borderRadius: 20, cursor: "pointer", color: open ? "#1d4ed8" : "#64748b",
          display: "flex", alignItems: "center", gap: 5,
        }}
      >
        \U0001f9ea {open ? "Hide symbols" : "Chem symbols"}
      </button>

      {open && (
        <div style={{
          marginTop: 6, border: "1.5px solid #e2e8f0", borderRadius: 12,
          padding: "10px 12px", background: "#fafbff",
        }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {TABS.map((t) => (
              <button
                key={t} type="button" onClick={() => setTab(t)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px",
                  background: tab === t ? "#1d4ed8" : "#fff",
                  color: tab === t ? "#fff" : "#374151",
                  border: "1px solid " + (tab === t ? "#1d4ed8" : "#d1d5db"),
                  borderRadius: 20, cursor: "pointer",
                }}
              >{t}</button>
            ))}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
            gap: 4,
            maxHeight: 180,
            overflowY: "auto",
          }}>
            {CHEM_TEXT[tab].map((s) => (
              <button
                key={s.v} type="button" onClick={() => insert(s.v)}
                title={s.title}
                style={{
                  padding: "5px 6px", fontSize: 12, fontWeight: 500,
                  color: "#1e293b", background: "#fff",
                  border: "1px solid #e2e8f0", borderRadius: 7,
                  cursor: "pointer", textAlign: "center",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  transition: "background 0.1s, border-color 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#dbeafe"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >{s.l}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
            \u2713 Click to insert at cursor
          </p>
        </div>
      )}
    </div>
  );
}
'''

with open(r'C:\Users\LENOVO T14\Desktop\cbc-app\frontend\src\components\ChemTextBar.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(chem_js)
print('ChemTextBar.js written')

# ── PhysicsFormulaBar ────────────────────────────────────────────────────────

phys_data = {
    'Kinematics': [
        ('v=u+at', '$v = u + at$', '1st equation of motion'),
        (f's=ut+{half}at{s(2)}', r'$s = ut + \frac{1}{2}at^2$', '2nd equation of motion'),
        (f'v{s(2)}=u{s(2)}+2as', '$v^2 = u^2 + 2as$', '3rd equation of motion'),
        (f's={half}(u+v)t', r'$s = \frac{1}{2}(u+v)t$', 'Average displacement'),
        ('a=(v-u)/t', r'$a = \frac{v - u}{t}$', 'Acceleration'),
        ('v=s/t', r'$v = \frac{s}{t}$', 'Speed'),
    ],
    'Forces': [
        ('F=ma', '$F = ma$', "Newton's 2nd Law"),
        ('W=mg', '$W = mg$', 'Weight'),
        ('p=mv', '$p = mv$', 'Momentum'),
        (f'F={Delta}p/{Delta}t', r'$F = \frac{\Delta p}{\Delta t}$', 'Force = rate of change of momentum'),
        (f'Ft={Delta}p', r'$Ft = \Delta p$', 'Impulse'),
        (f'F={mu}N', r'$F = \mu N$', 'Friction'),
    ],
    'Energy': [
        (f'KE={half}mv{s(2)}', r'$KE = \frac{1}{2}mv^2$', 'Kinetic Energy'),
        ('GPE=mgh', '$GPE = mgh$', 'Gravitational PE'),
        ('W=Fd', r'$W = Fd\cos\theta$', 'Work done'),
        ('P=W/t', r'$P = \frac{W}{t}$', 'Power'),
        ('P=Fv', '$P = Fv$', 'Power (F×v)'),
        (f'{eta}%', r'$\eta = \frac{P_{out}}{P_{in}} \times 100\%$', 'Efficiency'),
    ],
    'Waves': [
        ('v=f{lam}', r'$v = f\lambda$', 'Wave speed'),
        ('T=1/f', r'$T = \frac{1}{f}$', 'Period'),
        ('n=sin i/sin r', r'$n = \frac{\sin i}{\sin r}$', "Snell's Law"),
        ('E=hf', '$E = hf$', 'Photon energy'),
        ('c=3x10{s(8)}', r'$c = 3 \times 10^8 \text{ m/s}$', 'Speed of light'),
    ],
    'Electricity': [
        ('V=IR', '$V = IR$', "Ohm's Law"),
        ('P=IV', '$P = IV$', 'Electrical Power'),
        (f'P=I{s(2)}R', '$P = I^2 R$', 'Power (I²R)'),
        (f'P=V{s(2)}/R', r'$P = \frac{V^2}{R}$', 'Power (V²/R)'),
        ('Q=It', '$Q = It$', 'Charge'),
        ('E=QV', '$E = QV$', 'Electrical Energy'),
        (f'F=kQ{sub[1]}Q{sub[2]}/r{s(2)}', r'$F = \frac{kQ_1Q_2}{r^2}$', "Coulomb's Law"),
    ],
    'Thermal': [
        ('Q=mc{Delta}T', r'$Q = mc\Delta T$', 'Heat energy'),
        ('Q=ml', '$Q = ml$', 'Latent heat'),
        (f'PV/T=k', r'$\frac{PV}{T} = k$', 'Combined gas law'),
        ('P{sub[1]}V{sub[1]}=P{sub[2]}V{sub[2]}', r'$P_1V_1 = P_2V_2$', "Boyle's Law"),
        (f'V{sub[1]}/T{sub[1]}=V{sub[2]}/T{sub[2]}', r'$\frac{V_1}{T_1} = \frac{V_2}{T_2}$', "Charles' Law"),
        (f'{rho}=m/V', r'$\rho = \frac{m}{V}$', 'Density'),
        ('P=F/A', r'$P = \frac{F}{A}$', 'Pressure'),
    ],
}

# fix missing symbols
eta = 'η'; rho = 'ρ'
phys_data['Energy'][5] = (f'{eta}%', r'$\eta = \frac{P_{out}}{P_{in}} \times 100\%$', 'Efficiency')
phys_data['Thermal'][5] = (f'{rho}=m/V', r'$\rho = \frac{m}{V}$', 'Density')
phys_data['Thermal'][4] = (f'V{sub[1]}/T{sub[1]}=V{sub[2]}/T{sub[2]}', r'$\frac{V_1}{T_1} = \frac{V_2}{T_2}$', "Charles' Law")
phys_data['Thermal'][3] = (f'P{sub[1]}V{sub[1]}=P{sub[2]}V{sub[2]}', r'$P_1V_1 = P_2V_2$', "Boyle's Law")
phys_data['Waves'][0] = (f'v=f{lam}', r'$v = f\lambda$', 'Wave speed')
phys_data['Waves'][4] = (f'c=3×10{s(8)}', r'$c = 3 \times 10^8 \text{ m/s}$', 'Speed of light')

def phys_rows(items):
    lines = []
    for item in items:
        l, v, title = item
        lines.append(f'    {{ l: "{l}", v: "{v}", title: "{title}" }},')
    return '\n'.join(lines)

phys_sections = []
for tab_name, items in phys_data.items():
    phys_sections.append(f'  "{tab_name}": [\n{phys_rows(items)}\n  ],')

phys_js = '''"use client";
import { useState } from "react";

const PHYSICS_FORMULAS = {
''' + '\n'.join(phys_sections) + '''
};

const TABS = Object.keys(PHYSICS_FORMULAS);

export default function PhysicsFormulaBar({ textareaRef, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(TABS[0]);

  const insert = (sym) => {
    const el = textareaRef?.current;
    if (el && typeof el.selectionStart === "number") {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = (value ?? "").slice(0, start) + sym + (value ?? "").slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + sym.length, start + sym.length);
      });
    } else {
      onChange((value ?? "") + sym);
    }
  };

  return (
    <div style={{ marginBottom: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          fontSize: 12, fontWeight: 600, padding: "4px 12px",
          background: open ? "#f5f3ff" : "#f8fafc",
          border: "1.5px solid " + (open ? "#c4b5fd" : "#e2e8f0"),
          borderRadius: 20, cursor: "pointer", color: open ? "#6d28d9" : "#64748b",
          display: "flex", alignItems: "center", gap: 5,
        }}
      >
        \U0001f9e0 {open ? "Hide formulas" : "Physics formulas"}
      </button>

      {open && (
        <div style={{
          marginTop: 6, border: "1.5px solid #e2e8f0", borderRadius: 12,
          padding: "10px 12px", background: "#fdfcff",
        }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {TABS.map((t) => (
              <button
                key={t} type="button" onClick={() => setTab(t)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px",
                  background: tab === t ? "#6d28d9" : "#fff",
                  color: tab === t ? "#fff" : "#374151",
                  border: "1px solid " + (tab === t ? "#6d28d9" : "#d1d5db"),
                  borderRadius: 20, cursor: "pointer",
                }}
              >{t}</button>
            ))}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))",
            gap: 5,
            maxHeight: 180,
            overflowY: "auto",
          }}>
            {PHYSICS_FORMULAS[tab].map((f) => (
              <button
                key={f.v} type="button" onClick={() => insert(f.v)}
                title={f.title}
                style={{
                  padding: "5px 6px", fontSize: 11, fontWeight: 500,
                  color: "#1e293b", background: "#fff",
                  border: "1px solid #e2e8f0", borderRadius: 7,
                  cursor: "pointer", textAlign: "center",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  transition: "background 0.1s, border-color 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f3ff"; e.currentTarget.style.borderColor = "#c4b5fd"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >{f.l}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
            \u2713 Inserts LaTeX at cursor \u2014 renders via MathJax \u2014 hover for formula name
          </p>
        </div>
      )}
    </div>
  );
}
'''

with open(r'C:\Users\LENOVO T14\Desktop\cbc-app\frontend\src\components\PhysicsFormulaBar.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(phys_js)
print('PhysicsFormulaBar.js written')

# Verify
import re
with open(r'C:\Users\LENOVO T14\Desktop\cbc-app\frontend\src\components\ChemTextBar.js', encoding='utf-8') as f:
    c = f.read()
print('Chem e- Config:', repr(c[c.find('"e'):c.find('"e')+20]))
print('Chem 1s sample:', repr(c[c.find('1s'):c.find('1s')+10]))
with open(r'C:\Users\LENOVO T14\Desktop\cbc-app\frontend\src\components\PhysicsFormulaBar.js', encoding='utf-8') as f:
    p = f.read()
print('Physics v=u+at:', repr(p[p.find('v=u+at'):p.find('v=u+at')+15]))
print('Physics half at2:', repr(p[p.find('s=ut'):p.find('s=ut')+20]))
