"use client";
import { useState } from "react";

// All special characters as \uXXXX escapes - ASCII-safe, no encoding corruption.

// Superscripts
var S0="\u2070",S1="\u00B9",S2="\u00B2",S3="\u00B3",S4="\u2074",S5="\u2075",
    S6="\u2076",S7="\u2077",S8="\u2078",S9="\u2079",SP="\u207A",SM="\u207B";
// Subscripts
var B0="\u2080",B1="\u2081",B2="\u2082",B3="\u2083",B4="\u2084",B5="\u2085",
    B6="\u2086",B7="\u2087",B8="\u2088",B9="\u2089",BP="\u208A",BM="\u208B";
// Greek / misc
var AL="\u03B1",BE="\u03B2",GA="\u03B3",DE="\u0394";
var AR="\u2192",EQ="\u21CC",UP="\u2191",DN="\u2193",DG="\u00B0";

const CHEM_TEXT = {
  "e- Config": [
    { l:"1s"+S1,  v:"1s"+S1 },
    { l:"1s"+S2,  v:"1s"+S2 },
    { l:"2s"+S1,  v:"2s"+S1 },
    { l:"2s"+S2,  v:"2s"+S2 },
    { l:"2p"+S1,  v:"2p"+S1 },
    { l:"2p"+S2,  v:"2p"+S2 },
    { l:"2p"+S3,  v:"2p"+S3 },
    { l:"2p"+S4,  v:"2p"+S4 },
    { l:"2p"+S5,  v:"2p"+S5 },
    { l:"2p"+S6,  v:"2p"+S6 },
    { l:"3s"+S1,  v:"3s"+S1 },
    { l:"3s"+S2,  v:"3s"+S2 },
    { l:"3p"+S1,  v:"3p"+S1 },
    { l:"3p"+S2,  v:"3p"+S2 },
    { l:"3p"+S3,  v:"3p"+S3 },
    { l:"3p"+S4,  v:"3p"+S4 },
    { l:"3p"+S5,  v:"3p"+S5 },
    { l:"3p"+S6,  v:"3p"+S6 },
    { l:"3d"+S1,  v:"3d"+S1 },
    { l:"3d"+S5,  v:"3d"+S5 },
    { l:"3d"+S1+S0, v:"3d"+S1+S0 },
    { l:"4s"+S1,  v:"4s"+S1 },
    { l:"4s"+S2,  v:"4s"+S2 },
    { l:"4p"+S6,  v:"4p"+S6 },
    { l:"4d"+S1+S0, v:"4d"+S1+S0 },
    { l:"4f"+S7,  v:"4f"+S7 },
    { l:"4f"+S1+S4, v:"4f"+S1+S4 },
    { l:"5s"+S2,  v:"5s"+S2 },
    { l:"5p"+S6,  v:"5p"+S6 },
    { l:"5d"+S1+S0, v:"5d"+S1+S0 },
    { l:"6s"+S2,  v:"6s"+S2 },
  ],
  "Ions": [
    { l:"H"+SP,            v:"H"+SP },
    { l:"OH"+SM,           v:"OH"+SM },
    { l:"Na"+SP,           v:"Na"+SP },
    { l:"K"+SP,            v:"K"+SP },
    { l:"Ca"+S2+SP,        v:"Ca"+S2+SP },
    { l:"Mg"+S2+SP,        v:"Mg"+S2+SP },
    { l:"Fe"+S2+SP,        v:"Fe"+S2+SP },
    { l:"Fe"+S3+SP,        v:"Fe"+S3+SP },
    { l:"Cu"+S2+SP,        v:"Cu"+S2+SP },
    { l:"Cu"+SP,           v:"Cu"+SP },
    { l:"Al"+S3+SP,        v:"Al"+S3+SP },
    { l:"Zn"+S2+SP,        v:"Zn"+S2+SP },
    { l:"Ag"+SP,           v:"Ag"+SP },
    { l:"Pb"+S2+SP,        v:"Pb"+S2+SP },
    { l:"Mn"+S2+SP,        v:"Mn"+S2+SP },
    { l:"Cr"+S3+SP,        v:"Cr"+S3+SP },
    { l:"NH"+B4+SP,        v:"NH"+B4+SP },
    { l:"Cl"+SM,           v:"Cl"+SM },
    { l:"F"+SM,            v:"F"+SM },
    { l:"Br"+SM,           v:"Br"+SM },
    { l:"I"+SM,            v:"I"+SM },
    { l:"O"+S2+SM,         v:"O"+S2+SM },
    { l:"S"+S2+SM,         v:"S"+S2+SM },
    { l:"SO"+B4+S2+SM,     v:"SO"+B4+S2+SM },
    { l:"NO"+B3+SM,        v:"NO"+B3+SM },
    { l:"CO"+B3+S2+SM,     v:"CO"+B3+S2+SM },
    { l:"HCO"+B3+SM,       v:"HCO"+B3+SM },
    { l:"PO"+B4+S3+SM,     v:"PO"+B4+S3+SM },
    { l:"MnO"+B4+SM,       v:"MnO"+B4+SM },
    { l:"Cr"+B2+"O"+B7+S2+SM, v:"Cr"+B2+"O"+B7+S2+SM },
    { l:"e"+SM,            v:"e"+SM },
  ],
  "Formulas": [
    { l:"H"+B2+"O",        v:"H"+B2+"O" },
    { l:"CO"+B2,           v:"CO"+B2 },
    { l:"O"+B2,            v:"O"+B2 },
    { l:"H"+B2,            v:"H"+B2 },
    { l:"N"+B2,            v:"N"+B2 },
    { l:"Cl"+B2,           v:"Cl"+B2 },
    { l:"NH"+B3,           v:"NH"+B3 },
    { l:"CH"+B4,           v:"CH"+B4 },
    { l:"C"+B2+"H"+B6,     v:"C"+B2+"H"+B6 },
    { l:"C"+B2+"H"+B4,     v:"C"+B2+"H"+B4 },
    { l:"C"+B2+"H"+B2,     v:"C"+B2+"H"+B2 },
    { l:"C"+B6+"H"+B6,     v:"C"+B6+"H"+B6 },
    { l:"C"+B6+"H"+B1+B2+"O"+B6, v:"C"+B6+"H"+B1+B2+"O"+B6 },
    { l:"HCl",             v:"HCl" },
    { l:"H"+B2+"SO"+B4,    v:"H"+B2+"SO"+B4 },
    { l:"HNO"+B3,          v:"HNO"+B3 },
    { l:"H"+B3+"PO"+B4,    v:"H"+B3+"PO"+B4 },
    { l:"NaOH",            v:"NaOH" },
    { l:"KOH",             v:"KOH" },
    { l:"Ca(OH)"+B2,       v:"Ca(OH)"+B2 },
    { l:"CaCO"+B3,         v:"CaCO"+B3 },
    { l:"Na"+B2+"CO"+B3,   v:"Na"+B2+"CO"+B3 },
    { l:"NaHCO"+B3,        v:"NaHCO"+B3 },
    { l:"CuSO"+B4,         v:"CuSO"+B4 },
    { l:"FeSO"+B4,         v:"FeSO"+B4 },
    { l:"Fe"+B2+"O"+B3,    v:"Fe"+B2+"O"+B3 },
    { l:"Al"+B2+"O"+B3,    v:"Al"+B2+"O"+B3 },
    { l:"MgO",             v:"MgO" },
    { l:"CaO",             v:"CaO" },
    { l:"SO"+B2,           v:"SO"+B2 },
    { l:"NO"+B2,           v:"NO"+B2 },
    { l:"KMnO"+B4,         v:"KMnO"+B4 },
    { l:"K"+B2+"Cr"+B2+"O"+B7, v:"K"+B2+"Cr"+B2+"O"+B7 },
  ],
  "Symbols": [
    { l:AR,      v:AR },
    { l:EQ,      v:EQ },
    { l:UP,      v:UP },
    { l:DN,      v:DN },
    { l:"(aq)",  v:"(aq)" },
    { l:"(l)",   v:"(l)" },
    { l:"(g)",   v:"(g)" },
    { l:"(s)",   v:"(s)" },
    { l:DE,      v:DE },
    { l:DG+"C",  v:DG+"C" },
    { l:"\u00B1",v:"\u00B1" },
    { l:"\u2248",v:"\u2248" },
    { l:AL,      v:AL },
    { l:BE,      v:BE },
    { l:GA,      v:GA },
    { l:S0,      v:S0 },
    { l:S1,      v:S1 },
    { l:S2,      v:S2 },
    { l:S3,      v:S3 },
    { l:S4,      v:S4 },
    { l:S5,      v:S5 },
    { l:S6,      v:S6 },
    { l:S7,      v:S7 },
    { l:S8,      v:S8 },
    { l:S9,      v:S9 },
    { l:SP,      v:SP },
    { l:SM,      v:SM },
    { l:B0,      v:B0 },
    { l:B1,      v:B1 },
    { l:B2,      v:B2 },
    { l:B3,      v:B3 },
    { l:B4,      v:B4 },
    { l:B5,      v:B5 },
    { l:B6,      v:B6 },
    { l:B7,      v:B7 },
    { l:B8,      v:B8 },
    { l:B9,      v:B9 },
    { l:BM,      v:BM },
    { l:BP,      v:BP },
  ],
  "Nuclear": [
    { l:S4+B2+AL,            v:S4+B2+AL,            title:"Alpha particle" },
    { l:S0+BM+B1+BE+SM,      v:S0+BM+B1+BE+SM,      title:"Beta-minus" },
    { l:S0+BP+B1+BE+SP,      v:S0+BP+B1+BE+SP,      title:"Beta-plus" },
    { l:GA,                   v:GA,                   title:"Gamma ray" },
    { l:S1+B0+"n",            v:S1+B0+"n",            title:"Neutron" },
    { l:S1+B1+"p",            v:S1+B1+"p",            title:"Proton" },
    { l:S1+B1+"H",            v:S1+B1+"H",            title:"Protium H-1" },
    { l:S2+B1+"H",            v:S2+B1+"H",            title:"Deuterium H-2" },
    { l:S3+B1+"H",            v:S3+B1+"H",            title:"Tritium H-3" },
    { l:S4+B2+"He",           v:S4+B2+"He",           title:"Helium-4 / Alpha" },
    { l:S1+S2+B6+"C",         v:S1+S2+B6+"C",         title:"Carbon-12" },
    { l:S1+S4+B6+"C",         v:S1+S4+B6+"C",         title:"Carbon-14" },
    { l:S1+S4+B7+"N",         v:S1+S4+B7+"N",         title:"Nitrogen-14" },
    { l:S1+S6+B8+"O",         v:S1+S6+B8+"O",         title:"Oxygen-16" },
    { l:S2+S3+B1+B1+"Na",     v:S2+S3+B1+B1+"Na",     title:"Sodium-23" },
    { l:S4+S0+B1+B9+"K",      v:S4+S0+B1+B9+"K",      title:"Potassium-40" },
    { l:S6+S0+B2+S7+"Co",     v:S6+S0+B2+S7+"Co",     title:"Cobalt-60" },
    { l:S1+S3+S1+B5+S3+"I",   v:S1+S3+S1+B5+S3+"I",   title:"Iodine-131" },
    { l:S2+S2+S6+B8+S8+"Ra",  v:S2+S2+S6+B8+S8+"Ra",  title:"Radium-226" },
    { l:S2+S2+S2+B8+S6+"Rn",  v:S2+S2+S2+B8+S6+"Rn",  title:"Radon-222" },
    { l:S2+S1+S8+B8+S4+"Po",  v:S2+S1+S8+B8+S4+"Po",  title:"Polonium-218" },
    { l:S2+S3+S2+B9+S0+"Th",  v:S2+S3+S2+B9+S0+"Th",  title:"Thorium-232" },
    { l:S2+S3+S5+B9+S2+"U",   v:S2+S3+S5+B9+S2+"U",   title:"Uranium-235" },
    { l:S2+S3+S8+B9+S2+"U",   v:S2+S3+S8+B9+S2+"U",   title:"Uranium-238" },
  ],
};

export default function ChemTextBar({ textareaRef, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("e- Config");

  function insert(sym) {
    const ta = textareaRef?.current;
    const cur = value ?? "";
    if (!ta) { onChange(cur + sym); return; }
    const start = ta.selectionStart ?? cur.length;
    const end   = ta.selectionEnd   ?? start;
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
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12, fontWeight: 600,
          color: open ? "#1a6fc4" : "#6b7280",
          background: open ? "#eff6ff" : "#f3f4f6",
          border: "1px solid " + (open ? "#bfdbfe" : "#e5e7eb"),
          borderRadius: 8, padding: "5px 12px", cursor: "pointer",
          marginBottom: open ? 8 : 0, transition: "all 0.15s",
        }}
      >
        <span>{open ? "\u25B2" : "\u25BC"}</span>
        {open ? "Hide symbols" : "Chem & Nuclear symbols"}
      </button>

      {open && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", background: "#fafafa", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 10, borderBottom: "1px solid #e5e7eb", paddingBottom: 6, flexWrap: "wrap" }}>
            {Object.keys(CHEM_TEXT).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{
                  padding: "4px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                  border: "none", cursor: "pointer",
                  background: tab === t ? "#1a6fc4" : "transparent",
                  color: tab === t ? "#fff" : "#6b7280", transition: "all 0.15s",
                }}>{t}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 5, maxHeight: 160, overflowY: "auto" }}>
            {CHEM_TEXT[tab].map((sym) => (
              <button key={sym.v} type="button" onClick={() => insert(sym.v)}
                title={sym.title || sym.l}
                style={{
                  padding: "5px 4px", fontSize: 12, fontWeight: 500,
                  color: "#1e293b", background: "#fff", border: "1px solid #e2e8f0",
                  borderRadius: 7, cursor: "pointer", textAlign: "center",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  transition: "background 0.1s, border-color 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >{sym.l}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
            {"\u2713"} Click to insert at cursor &middot; Nuclear: superscript mass + subscript atomic + Symbol
          </p>
        </div>
      )}
    </div>
  );
}