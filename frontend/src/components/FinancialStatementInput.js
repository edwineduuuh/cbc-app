"use client";
/**
 * FinancialStatementInput — Student-facing quiz component.
 *
 * Reads the SAME schema that FinancialStatementEditor produces.
 * Teacher sets up the structure (row labels + correct amounts hidden from student).
 * Student fills in the amount for each row.
 *
 * Schema shapes (from editor):
 *
 * balance_sheet / trading_account:
 *   { subtype, title, currency,
 *     left:  { heading, sections: [{id, name, rows: [{id, label, amount}]}] },
 *     right: { heading, sections: [{id, name, rows: [{id, label, amount}]}] } }
 *
 * t_account:
 *   { subtype, title, currency, accountName,
 *     left:  { heading, rows: [{id, label, amount}] },
 *     right: { heading, rows: [{id, label, amount}] } }
 *
 * income_statement / cash_flow:
 *   { subtype, title, currency, openingBalance?,
 *     sections: [{id, name, subtotalLabel, rows: [{id, label, amount}]}],
 *     resultLabel? / closingBalanceLabel? }
 *
 * trial_balance:
 *   { subtype, title, currency, rows: [{id, account, debit, credit}] }
 */

import { useState, useEffect } from "react";

function numVal(v) {
  return parseFloat(String(v ?? "").replace(/,/g, "")) || 0;
}

function fmt(n) {
  if (!n && n !== 0) return "";
  const num = parseFloat(String(n).replace(/,/g, ""));
  return isNaN(num) ? "" : num.toLocaleString("en-KE");
}

const CELL = { padding: "5px 10px", border: "1px solid #e5e7eb", verticalAlign: "middle" };
const TH   = { ...CELL, background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: 12, textAlign: "center" };
const SUBTOTAL_ROW = { fontWeight: 700, background: "#f0f9ff", borderTop: "1px solid #bfdbfe" };
const TOTAL_ROW    = { fontWeight: 700, background: "#f3f4f6", borderTop: "2px solid #9ca3af" };

function AmountInput({ value, onChange, readonly }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      disabled={readonly}
      placeholder="0"
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", textAlign: "right", fontSize: 13, padding: "4px 8px",
        border: "1.5px solid #d1d5db", borderRadius: 8,
        background: readonly ? "#f9fafb" : "#fff", outline: "none", boxSizing: "border-box",
      }}
      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
      onBlur={(e)  => (e.target.style.borderColor = "#d1d5db")}
    />
  );
}

// Balance Sheet / Trading Account
function TwoColInput({ schema, answer, update, currency, readonly }) {
  const left  = schema.left  || {};
  const right = schema.right || {};
  const leftSections  = left.sections  || [];
  const rightSections = right.sections || [];
  const leftAns  = answer?.left  || {};
  const rightAns = answer?.right || {};
  const leftTotal  = leftSections.flatMap((s) => s.rows || []).reduce((s, r) => s + numVal(leftAns[r.id]),  0);
  const rightTotal = rightSections.flatMap((s) => s.rows || []).reduce((s, r) => s + numVal(rightAns[r.id]), 0);

  function buildRows(sections, sideAns, sideKey) {
    const out = [];
    sections.forEach((sec, si) => {
      if (sec.name) {
        out.push(
          <tr key={`h-${sideKey}-${si}`}>
            <td colSpan={2} style={{ ...CELL, fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", background: "#f9fafb" }}>
              {sec.name}
            </td>
          </tr>
        );
      }
      (sec.rows || []).forEach((row) => {
        out.push(
          <tr key={`r-${sideKey}-${row.id}`}>
            <td style={{ ...CELL, color: "#374151" }}>{row.label}</td>
            <td style={{ ...CELL, width: 120 }}>
              <AmountInput
                value={sideAns[row.id] ?? ""}
                onChange={(v) => update({ ...answer, [sideKey]: { ...sideAns, [row.id]: v } })}
                readonly={readonly}
              />
            </td>
          </tr>
        );
      });
    });
    return out;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, minWidth: 560 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>
            <th style={{ ...TH, textAlign: "left" }}>{left.heading || "Left"}</th>
            <th style={{ ...TH, width: 120 }}>{currency}</th>
          </tr></thead>
          <tbody>{buildRows(leftSections, leftAns, "left")}</tbody>
          <tfoot><tr style={TOTAL_ROW}>
            <td style={CELL}>Total</td>
            <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>{fmt(leftTotal)}</td>
          </tr></tfoot>
        </table>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>
            <th style={{ ...TH, textAlign: "left" }}>{right.heading || "Right"}</th>
            <th style={{ ...TH, width: 120 }}>{currency}</th>
          </tr></thead>
          <tbody>{buildRows(rightSections, rightAns, "right")}</tbody>
          <tfoot><tr style={TOTAL_ROW}>
            <td style={CELL}>Total</td>
            <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>{fmt(rightTotal)}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// T-Account
function TAccountInput({ schema, answer, update, currency, readonly }) {
  const left  = schema.left  || {};
  const right = schema.right || {};
  const leftRows  = left.rows  || [];
  const rightRows = right.rows || [];
  const leftAns  = answer?.left  || {};
  const rightAns = answer?.right || {};
  const leftTotal  = leftRows.reduce((s, r)  => s + numVal(leftAns[r.id]),  0);
  const rightTotal = rightRows.reduce((s, r) => s + numVal(rightAns[r.id]), 0);

  return (
    <div style={{ overflowX: "auto" }}>
      {schema.accountName && (
        <p style={{ textAlign: "center", fontWeight: 700, fontSize: 14, marginBottom: 8, borderBottom: "2px solid #d1d5db", paddingBottom: 6 }}>
          {schema.accountName}
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "2px solid #d1d5db", borderRadius: 8, overflow: "hidden", minWidth: 480 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, borderRight: "2px solid #d1d5db" }}>
          <thead><tr><th colSpan={2} style={{ ...TH, textAlign: "left" }}>{left.heading || "Dr"}</th></tr></thead>
          <tbody>
            {leftRows.map((row) => (
              <tr key={row.id}>
                <td style={{ ...CELL, color: "#374151" }}>{row.label}</td>
                <td style={{ ...CELL, width: 120 }}>
                  <AmountInput value={leftAns[row.id] ?? ""} onChange={(v) => update({ ...answer, left: { ...leftAns, [row.id]: v } })} readonly={readonly} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={TOTAL_ROW}>
            <td style={CELL}>Total</td>
            <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>{fmt(leftTotal)}</td>
          </tr></tfoot>
        </table>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr><th colSpan={2} style={{ ...TH, textAlign: "left" }}>{right.heading || "Cr"}</th></tr></thead>
          <tbody>
            {rightRows.map((row) => (
              <tr key={row.id}>
                <td style={{ ...CELL, color: "#374151" }}>{row.label}</td>
                <td style={{ ...CELL, width: 120 }}>
                  <AmountInput value={rightAns[row.id] ?? ""} onChange={(v) => update({ ...answer, right: { ...rightAns, [row.id]: v } })} readonly={readonly} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={TOTAL_ROW}>
            <td style={CELL}>Total</td>
            <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>{fmt(rightTotal)}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// Income Statement / Cash Flow
function MultiSectionInput({ schema, answer, update, currency, readonly }) {
  const sections = schema.sections || [];
  const amounts  = answer?.amounts || {};
  const setAmt   = (id, v) => update({ ...answer, amounts: { ...amounts, [id]: v } });

  const rows = [];

  if (schema.openingBalance !== undefined) {
    rows.push(
      <tr key="__opening" style={{ background: "#fafafa" }}>
        <td style={{ ...CELL, fontWeight: 600 }}>Opening Cash Balance</td>
        <td style={{ ...CELL, width: 140 }}>
          <AmountInput value={amounts["__opening"] ?? ""} onChange={(v) => setAmt("__opening", v)} readonly={readonly} />
        </td>
      </tr>
    );
  }

  sections.forEach((sec, si) => {
    const secTotal = (sec.rows || []).reduce((s, r) => s + numVal(amounts[r.id]), 0);
    if (sec.name) {
      rows.push(
        <tr key={`sh-${si}`} style={{ background: "#f9fafb" }}>
          <td colSpan={2} style={{ ...CELL, fontWeight: 700, fontSize: 12, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {sec.name}
          </td>
        </tr>
      );
    }
    (sec.rows || []).forEach((row) => {
      rows.push(
        <tr key={row.id}>
          <td style={{ ...CELL, paddingLeft: 24, color: "#374151" }}>{row.label}</td>
          <td style={{ ...CELL, width: 140 }}>
            <AmountInput value={amounts[row.id] ?? ""} onChange={(v) => setAmt(row.id, v)} readonly={readonly} />
          </td>
        </tr>
      );
    });
    if (sec.subtotalLabel) {
      rows.push(
        <tr key={`st-${si}`} style={SUBTOTAL_ROW}>
          <td style={{ ...CELL, color: "#1e40af" }}>{sec.subtotalLabel}</td>
          <td style={{ ...CELL, textAlign: "right", color: "#1e40af" }}>{fmt(secTotal)}</td>
        </tr>
      );
    }
  });

  const grandTotal = sections.reduce((t, sec) => t + (sec.rows || []).reduce((s, r) => s + numVal(amounts[r.id]), 0), 0)
    + (schema.openingBalance !== undefined ? numVal(amounts["__opening"]) : 0);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>
          <th style={{ ...TH, textAlign: "left" }}>Item</th>
          <th style={{ ...TH, width: 140, textAlign: "right" }}>{currency}</th>
        </tr></thead>
        <tbody>{rows}</tbody>
        <tfoot><tr style={TOTAL_ROW}>
          <td style={{ ...CELL, color: "#111827" }}>{schema.resultLabel || schema.closingBalanceLabel || "Total"}</td>
          <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>{fmt(grandTotal)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

// Trial Balance
function TrialBalanceInput({ schema, answer, update, currency, readonly }) {
  const rows = schema.rows || [];
  const ans  = answer?.rows || {};
  const set  = (id, field, v) => update({ ...answer, rows: { ...ans, [id]: { ...(ans[id] || {}), [field]: v } } });
  const totalDr = rows.reduce((s, r) => s + numVal((ans[r.id] || {}).debit),  0);
  const totalCr = rows.reduce((s, r) => s + numVal((ans[r.id] || {}).credit), 0);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>
          <th style={{ ...TH, textAlign: "left" }}>Account</th>
          <th style={{ ...TH, width: 130 }}>Dr ({currency})</th>
          <th style={{ ...TH, width: 130 }}>Cr ({currency})</th>
        </tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
              <td style={{ ...CELL, color: "#374151" }}>{row.account}</td>
              <td style={{ ...CELL, width: 130 }}>
                <AmountInput value={(ans[row.id] || {}).debit  ?? ""} onChange={(v) => set(row.id, "debit",  v)} readonly={readonly} />
              </td>
              <td style={{ ...CELL, width: 130 }}>
                <AmountInput value={(ans[row.id] || {}).credit ?? ""} onChange={(v) => set(row.id, "credit", v)} readonly={readonly} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr style={TOTAL_ROW}>
          <td style={CELL}>Totals</td>
          <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>{fmt(totalDr)}</td>
          <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>{fmt(totalCr)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FinancialStatementInput({ schema, value, onChange, readonly = false }) {
  const [answer, setAnswer] = useState(value && typeof value === "object" ? value : {});

  useEffect(() => {
    if (value && typeof value === "object") setAnswer(value);
  }, [value]);

  if (!schema || typeof schema !== "object") {
    return (
      <div style={{ padding: "12px 16px", border: "1px solid #fcd34d", background: "#fffbeb", borderRadius: 10, fontSize: 13, color: "#92400e" }}>
        Financial statement not configured yet. Please contact your teacher.
      </div>
    );
  }

  const update   = (next) => { setAnswer(next); if (onChange) onChange(next); };
  const subtype  = schema.subtype  || "";
  const currency = schema.currency || "Ksh";

  return (
    <div style={{ fontFamily: "'Lato', sans-serif" }}>
      {schema.title && (
        <p style={{ textAlign: "center", fontWeight: 700, fontSize: 14, color: "#111827", borderBottom: "2px solid #e5e7eb", paddingBottom: 8, marginBottom: 12 }}>
          {schema.title}
        </p>
      )}

      {(subtype === "balance_sheet" || subtype === "trading_account") && (
        <TwoColInput schema={schema} answer={answer} update={update} currency={currency} readonly={readonly} />
      )}
      {subtype === "t_account" && (
        <TAccountInput schema={schema} answer={answer} update={update} currency={currency} readonly={readonly} />
      )}
      {(subtype === "income_statement" || subtype === "cash_flow") && (
        <MultiSectionInput schema={schema} answer={answer} update={update} currency={currency} readonly={readonly} />
      )}
      {subtype === "trial_balance" && (
        <TrialBalanceInput schema={schema} answer={answer} update={update} currency={currency} readonly={readonly} />
      )}
      {!subtype && (
        <div style={{ padding: "12px 16px", border: "1px solid #fcd34d", background: "#fffbeb", borderRadius: 10, fontSize: 13, color: "#92400e" }}>
          Statement type not set. Please edit this question.
        </div>
      )}
    </div>
  );
}