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

import React, { useState, useEffect } from "react";

function numVal(v) {
  return parseFloat(String(v ?? "").replace(/,/g, "")) || 0;
}

function fmt(n) {
  if (!n && n !== 0) return "";
  const num = parseFloat(String(n).replace(/,/g, ""));
  return isNaN(num) ? "" : num.toLocaleString("en-KE");
}

const CELL = {
  padding: "5px 10px",
  border: "1px solid #e5e7eb",
  verticalAlign: "middle",
};
const TH = {
  ...CELL,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 700,
  fontSize: 12,
  textAlign: "center",
};
const SUBTOTAL_ROW = {
  fontWeight: 700,
  background: "#f0f9ff",
  borderTop: "1px solid #bfdbfe",
};
const TOTAL_ROW = {
  fontWeight: 700,
  background: "#f3f4f6",
  borderTop: "2px solid #9ca3af",
};

function AmountInput({ value, onChange, readonly }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      disabled={readonly}
      placeholder="0"
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        textAlign: "right",
        fontSize: 13,
        padding: "4px 8px",
        border: "1.5px solid #d1d5db",
        borderRadius: 8,
        background: readonly ? "#f9fafb" : "#fff",
        outline: "none",
        boxSizing: "border-box",
      }}
      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
    />
  );
}

// Balance Sheet / Trading Account
function TwoColInput({ schema, answer, update, currency, readonly }) {
  const left = schema.left || {};
  const right = schema.right || {};
  const leftSections = left.sections || [];
  const rightSections = right.sections || [];
  const leftAns = answer?.left || {};
  const rightAns = answer?.right || {};
  const leftTotal = leftSections
    .flatMap((s) => s.rows || [])
    .reduce((s, r) => s + numVal(leftAns[r.id]), 0);
  const rightTotal = rightSections
    .flatMap((s) => s.rows || [])
    .reduce((s, r) => s + numVal(rightAns[r.id]), 0);

  function buildRows(sections, sideAns, sideKey) {
    const out = [];
    sections.forEach((sec, si) => {
      if (sec.name) {
        out.push(
          <tr key={`h-${sideKey}-${si}`}>
            <td
              colSpan={2}
              style={{
                ...CELL,
                fontWeight: 700,
                fontSize: 11,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                background: "#f9fafb",
              }}
            >
              {sec.name}
            </td>
          </tr>,
        );
      }
      (sec.rows || []).forEach((row) => {
        out.push(
          <tr key={`r-${sideKey}-${row.id}`}>
            <td style={{ ...CELL, color: "#374151" }}>{row.label}</td>
            <td style={{ ...CELL, width: 120 }}>
              <AmountInput
                value={sideAns[row.id] ?? ""}
                onChange={(v) =>
                  update({ ...answer, [sideKey]: { ...sideAns, [row.id]: v } })
                }
                readonly={readonly}
              />
            </td>
          </tr>,
        );
      });
    });
    return out;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          minWidth: 560,
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr>
              <th style={{ ...TH, textAlign: "left" }}>
                {left.heading || "Left"}
              </th>
              <th style={{ ...TH, width: 120 }}>{currency}</th>
            </tr>
          </thead>
          <tbody>{buildRows(leftSections, leftAns, "left")}</tbody>
          <tfoot>
            <tr style={TOTAL_ROW}>
              <td style={CELL}>Total</td>
              <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>
                {fmt(leftTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr>
              <th style={{ ...TH, textAlign: "left" }}>
                {right.heading || "Right"}
              </th>
              <th style={{ ...TH, width: 120 }}>{currency}</th>
            </tr>
          </thead>
          <tbody>{buildRows(rightSections, rightAns, "right")}</tbody>
          <tfoot>
            <tr style={TOTAL_ROW}>
              <td style={CELL}>Total</td>
              <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>
                {fmt(rightTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// T-Account
function TAccountInput({ schema, answer, update, currency, readonly }) {
  const left = schema.left || {};
  const right = schema.right || {};
  const leftRows = left.rows || [];
  const rightRows = right.rows || [];
  const leftAns = answer?.left || {};
  const rightAns = answer?.right || {};
  const leftTotal = leftRows.reduce((s, r) => s + numVal(leftAns[r.id]), 0);
  const rightTotal = rightRows.reduce((s, r) => s + numVal(rightAns[r.id]), 0);

  return (
    <div style={{ overflowX: "auto" }}>
      {schema.accountName && (
        <p
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 8,
            borderBottom: "2px solid #d1d5db",
            paddingBottom: 6,
          }}
        >
          {schema.accountName}
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          border: "2px solid #d1d5db",
          borderRadius: 8,
          overflow: "hidden",
          minWidth: 480,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            borderRight: "2px solid #d1d5db",
          }}
        >
          <thead>
            <tr>
              <th colSpan={2} style={{ ...TH, textAlign: "left" }}>
                {left.heading || "Dr"}
              </th>
            </tr>
          </thead>
          <tbody>
            {leftRows.map((row) => (
              <tr key={row.id}>
                <td style={{ ...CELL, color: "#374151" }}>{row.label}</td>
                <td style={{ ...CELL, width: 120 }}>
                  <AmountInput
                    value={leftAns[row.id] ?? ""}
                    onChange={(v) =>
                      update({ ...answer, left: { ...leftAns, [row.id]: v } })
                    }
                    readonly={readonly}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={TOTAL_ROW}>
              <td style={CELL}>Total</td>
              <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>
                {fmt(leftTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr>
              <th colSpan={2} style={{ ...TH, textAlign: "left" }}>
                {right.heading || "Cr"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rightRows.map((row) => (
              <tr key={row.id}>
                <td style={{ ...CELL, color: "#374151" }}>{row.label}</td>
                <td style={{ ...CELL, width: 120 }}>
                  <AmountInput
                    value={rightAns[row.id] ?? ""}
                    onChange={(v) =>
                      update({ ...answer, right: { ...rightAns, [row.id]: v } })
                    }
                    readonly={readonly}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={TOTAL_ROW}>
              <td style={CELL}>Total</td>
              <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>
                {fmt(rightTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Income Statement / Cash Flow
function MultiSectionInput({ schema, answer, update, currency, readonly }) {
  const sections = schema.sections || [];
  const amounts = answer?.amounts || {};
  const setAmt = (id, v) =>
    update({ ...answer, amounts: { ...amounts, [id]: v } });

  const rows = [];

  if (schema.openingBalance !== undefined) {
    rows.push(
      <tr key="__opening" style={{ background: "#fafafa" }}>
        <td style={{ ...CELL, fontWeight: 600 }}>Opening Cash Balance</td>
        <td style={{ ...CELL, width: 140 }}>
          <AmountInput
            value={amounts["__opening"] ?? ""}
            onChange={(v) => setAmt("__opening", v)}
            readonly={readonly}
          />
        </td>
      </tr>,
    );
  }

  sections.forEach((sec, si) => {
    const secTotal = (sec.rows || []).reduce(
      (s, r) => s + numVal(amounts[r.id]),
      0,
    );
    if (sec.name) {
      rows.push(
        <tr key={`sh-${si}`} style={{ background: "#f9fafb" }}>
          <td
            colSpan={2}
            style={{
              ...CELL,
              fontWeight: 700,
              fontSize: 12,
              color: "#374151",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {sec.name}
          </td>
        </tr>,
      );
    }
    (sec.rows || []).forEach((row) => {
      rows.push(
        <tr key={row.id}>
          <td style={{ ...CELL, paddingLeft: 24, color: "#374151" }}>
            {row.label}
          </td>
          <td style={{ ...CELL, width: 140 }}>
            <AmountInput
              value={amounts[row.id] ?? ""}
              onChange={(v) => setAmt(row.id, v)}
              readonly={readonly}
            />
          </td>
        </tr>,
      );
    });
    if (sec.subtotalLabel) {
      rows.push(
        <tr key={`st-${si}`} style={SUBTOTAL_ROW}>
          <td style={{ ...CELL, color: "#1e40af" }}>{sec.subtotalLabel}</td>
          <td style={{ ...CELL, textAlign: "right", color: "#1e40af" }}>
            {fmt(secTotal)}
          </td>
        </tr>,
      );
    }
  });

  const grandTotal =
    sections.reduce(
      (t, sec) =>
        t + (sec.rows || []).reduce((s, r) => s + numVal(amounts[r.id]), 0),
      0,
    ) +
    (schema.openingBalance !== undefined ? numVal(amounts["__opening"]) : 0);

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: "left" }}>Item</th>
            <th style={{ ...TH, width: 140, textAlign: "right" }}>
              {currency}
            </th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
        <tfoot>
          <tr style={TOTAL_ROW}>
            <td style={{ ...CELL, color: "#111827" }}>
              {schema.resultLabel || schema.closingBalanceLabel || "Total"}
            </td>
            <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>
              {fmt(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Trial Balance
function TrialBalanceInput({ schema, answer, update, currency, readonly }) {
  const rows = schema.rows || [];
  const ans = answer?.rows || {};
  const set = (id, field, v) =>
    update({
      ...answer,
      rows: { ...ans, [id]: { ...(ans[id] || {}), [field]: v } },
    });
  const totalDr = rows.reduce((s, r) => s + numVal((ans[r.id] || {}).debit), 0);
  const totalCr = rows.reduce(
    (s, r) => s + numVal((ans[r.id] || {}).credit),
    0,
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: "left" }}>Account</th>
            <th style={{ ...TH, width: 130 }}>Dr ({currency})</th>
            <th style={{ ...TH, width: 130 }}>Cr ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id}
              style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
            >
              <td style={{ ...CELL, color: "#374151" }}>{row.account}</td>
              <td style={{ ...CELL, width: 130 }}>
                <AmountInput
                  value={(ans[row.id] || {}).debit ?? ""}
                  onChange={(v) => set(row.id, "debit", v)}
                  readonly={readonly}
                />
              </td>
              <td style={{ ...CELL, width: 130 }}>
                <AmountInput
                  value={(ans[row.id] || {}).credit ?? ""}
                  onChange={(v) => set(row.id, "credit", v)}
                  readonly={readonly}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={TOTAL_ROW}>
            <td style={CELL}>Totals</td>
            <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>
              {fmt(totalDr)}
            </td>
            <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>
              {fmt(totalCr)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Blank dynamic templates (no teacher schema required) ────────────────────

const BLANK_CONFIGS = {
  balance_sheet: { leftHead: "Assets", rightHead: "Capital & Liabilities" },
  trading_account: { leftHead: "Dr (Debit)", rightHead: "Cr (Credit)" },
  t_account: { leftHead: "Dr (Debit)", rightHead: "Cr (Credit)" },
};
const BLANK_SECTIONS = {
  income_statement: ["Revenue / Income", "Less: Expenses"],
  cash_flow: [
    "Operating Activities",
    "Investing Activities",
    "Financing Activities",
  ],
};

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

function BlankTwoCol({ subtype, value, onChange, readonly }) {
  const cfg = BLANK_CONFIGS[subtype] || {
    leftHead: "Left",
    rightHead: "Right",
  };
  const init =
    value && value._blank
      ? value
      : { _blank: true, title: "", left: [], right: [] };
  const [state, setState] = React.useState(init);

  function push(ch) {
    setState(ch);
    if (onChange) onChange(ch);
  }

  function addRow(side) {
    const next = {
      ...state,
      [side]: [...(state[side] || []), { id: uid(), label: "", amount: "" }],
    };
    push(next);
  }
  function setField(side, id, field, val) {
    const next = {
      ...state,
      [side]: state[side].map((r) =>
        r.id === id ? { ...r, [field]: val } : r,
      ),
    };
    push(next);
  }
  function removeRow(side, id) {
    const next = { ...state, [side]: state[side].filter((r) => r.id !== id) };
    push(next);
  }

  const total = (side) =>
    (state[side] || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const T = (side) => (total(side) ? total(side).toLocaleString("en-KE") : "");

  const colStyle = { flex: 1, minWidth: 0 };
  const hdr = {
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: 700,
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: "8px 8px 0 0",
    textAlign: "center",
    border: "1px solid #bfdbfe",
  };
  const rowStyle = {
    display: "flex",
    gap: 4,
    alignItems: "center",
    padding: "4px 6px",
    borderBottom: "1px solid #f3f4f6",
  };
  const labelIn = {
    flex: 2,
    fontSize: 13,
    padding: "4px 8px",
    border: "1.5px solid #d1d5db",
    borderRadius: 6,
    background: readonly ? "#f9fafb" : "#fff",
  };
  const amtIn = {
    flex: 1,
    fontSize: 13,
    padding: "4px 8px",
    border: "1.5px solid #d1d5db",
    borderRadius: 6,
    textAlign: "right",
    background: readonly ? "#f9fafb" : "#fff",
  };
  const totRow = {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 10px",
    fontWeight: 700,
    fontSize: 13,
    background: "#f3f4f6",
    borderTop: "2px solid #9ca3af",
    borderRadius: "0 0 8px 8px",
    border: "1px solid #e5e7eb",
  };

  function Side({ side }) {
    return (
      <div style={colStyle}>
        <div style={hdr}>{side === "left" ? cfg.leftHead : cfg.rightHead}</div>
        <div style={{ border: "1px solid #e5e7eb", borderTop: "none" }}>
          {(state[side] || []).map((r) => (
            <div key={r.id} style={rowStyle}>
              <input
                style={labelIn}
                disabled={readonly}
                value={r.label}
                placeholder="Item name"
                onChange={(e) => setField(side, r.id, "label", e.target.value)}
              />
              <input
                style={amtIn}
                disabled={readonly}
                value={r.amount}
                placeholder="Amount"
                type="number"
                onChange={(e) => setField(side, r.id, "amount", e.target.value)}
              />
              {!readonly && (
                <button
                  type="button"
                  title="Remove row"
                  onClick={() => removeRow(side, r.id)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: "1.5px solid #fca5a5",
                    background: "#fff5f5",
                    color: "#ef4444",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {!readonly && (
            <div style={{ padding: "6px 10px" }}>
              <button
                type="button"
                onClick={() => addRow(side)}
                style={{
                  fontSize: 12,
                  color: "#2563eb",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 6,
                  padding: "3px 10px",
                  cursor: "pointer",
                }}
              >
                + Add row
              </button>
            </div>
          )}
        </div>
        <div style={totRow}>
          <span>Total</span>
          <span>{T(side)}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!readonly ? (
        <input
          value={state.title || ""}
          onChange={(e) => push({ ...state, title: e.target.value })}
          placeholder="Enter statement title (e.g. ABC Co. \u2014 Balance Sheet as at 31 Dec 2025)..."
          style={{
            width: "100%",
            textAlign: "center",
            fontWeight: 600,
            fontSize: 14,
            padding: "7px 12px",
            border: "1.5px dashed #93c5fd",
            borderRadius: 8,
            background: "#f8faff",
            color: "#1e3a8a",
            boxSizing: "border-box",
            marginBottom: 12,
            outline: "none",
          }}
        />
      ) : state.title ? (
        <p
          style={{
            textAlign: "center",
            fontWeight: 600,
            fontSize: 14,
            color: "#1e3a8a",
            marginBottom: 10,
          }}
        >
          {state.title}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 12 }}>
        <Side side="left" />
        <Side side="right" />
      </div>
    </div>
  );
}

function BlankMultiSection({ subtype, value, onChange, readonly }) {
  const sections = BLANK_SECTIONS[subtype] || ["Items"];
  const initRows = Object.fromEntries(sections.map((s) => [s, []]));
  const init =
    value && value._blank ? value : { _blank: true, title: "", rows: initRows };
  const [state, setState] = React.useState(init);

  function push(ch) {
    setState(ch);
    if (onChange) onChange(ch);
  }

  function addRow(sec) {
    const next = {
      ...state,
      rows: {
        ...state.rows,
        [sec]: [
          ...(state.rows[sec] || []),
          { id: uid(), label: "", amount: "" },
        ],
      },
    };
    push(next);
  }
  function setField(sec, id, field, val) {
    const next = {
      ...state,
      rows: {
        ...state.rows,
        [sec]: state.rows[sec].map((r) =>
          r.id === id ? { ...r, [field]: val } : r,
        ),
      },
    };
    push(next);
  }
  function removeRow(sec, id) {
    const next = {
      ...state,
      rows: {
        ...state.rows,
        [sec]: state.rows[sec].filter((r) => r.id !== id),
      },
    };
    push(next);
  }

  const secTotal = (sec) =>
    (state.rows[sec] || []).reduce(
      (s, r) => s + (parseFloat(r.amount) || 0),
      0,
    );
  const grandTotal = sections.reduce((s, sec) => s + secTotal(sec), 0);

  const rowStyle = {
    display: "flex",
    gap: 4,
    alignItems: "center",
    padding: "4px 8px",
    borderBottom: "1px solid #f3f4f6",
  };
  const labelIn = {
    flex: 2,
    fontSize: 13,
    padding: "4px 8px",
    border: "1.5px solid #d1d5db",
    borderRadius: 6,
    background: readonly ? "#f9fafb" : "#fff",
  };
  const amtIn = {
    flex: 1,
    fontSize: 13,
    padding: "4px 8px",
    border: "1.5px solid #d1d5db",
    borderRadius: 6,
    textAlign: "right",
    background: readonly ? "#f9fafb" : "#fff",
  };

  return (
    <div>
      {!readonly ? (
        <input
          value={state.title || ""}
          onChange={(e) => push({ ...state, title: e.target.value })}
          placeholder="Enter statement title (e.g. ABC Co. \u2014 Income Statement for year ended 31 Dec 2025)..."
          style={{
            width: "100%",
            textAlign: "center",
            fontWeight: 600,
            fontSize: 14,
            padding: "7px 12px",
            border: "1.5px dashed #93c5fd",
            borderRadius: 8,
            background: "#f8faff",
            color: "#1e3a8a",
            boxSizing: "border-box",
            marginBottom: 12,
            outline: "none",
          }}
        />
      ) : state.title ? (
        <p
          style={{
            textAlign: "center",
            fontWeight: 600,
            fontSize: 14,
            color: "#1e3a8a",
            marginBottom: 10,
          }}
        >
          {state.title}
        </p>
      ) : null}
      {sections.map((sec) => (
        <div key={sec} style={{ marginBottom: 16 }}>
          <div
            style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: 700,
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: "8px 8px 0 0",
              border: "1px solid #bfdbfe",
            }}
          >
            {sec}
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderTop: "none" }}>
            {(state.rows[sec] || []).map((r) => (
              <div key={r.id} style={rowStyle}>
                <input
                  style={labelIn}
                  disabled={readonly}
                  value={r.label}
                  placeholder="Item name"
                  onChange={(e) => setField(sec, r.id, "label", e.target.value)}
                />
                <input
                  style={amtIn}
                  disabled={readonly}
                  value={r.amount}
                  placeholder="Amount"
                  type="number"
                  onChange={(e) =>
                    setField(sec, r.id, "amount", e.target.value)
                  }
                />
                {!readonly && (
                  <button
                    type="button"
                    title="Remove row"
                    onClick={() => removeRow(sec, r.id)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "1.5px solid #fca5a5",
                      background: "#fff5f5",
                      color: "#ef4444",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {!readonly && (
              <div style={{ padding: "6px 10px" }}>
                <button
                  type="button"
                  onClick={() => addRow(sec)}
                  style={{
                    fontSize: 12,
                    color: "#2563eb",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 6,
                    padding: "3px 10px",
                    cursor: "pointer",
                  }}
                >
                  + Add row
                </button>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 10px",
                fontWeight: 700,
                fontSize: 13,
                background: "#f3f4f6",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <span>Subtotal</span>
              <span>
                {secTotal(sec) ? secTotal(sec).toLocaleString("en-KE") : ""}
              </span>
            </div>
          </div>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px 10px",
          fontWeight: 700,
          fontSize: 14,
          background: "#1d4ed8",
          color: "#fff",
          borderRadius: 8,
        }}
      >
        <span>Net Total</span>
        <span>{grandTotal ? grandTotal.toLocaleString("en-KE") : ""}</span>
      </div>
    </div>
  );
}

function BlankTrialBalance({ value, onChange, readonly }) {
  const init =
    value && value._blank ? value : { _blank: true, title: "", rows: [] };
  const [state, setState] = React.useState(init);

  function push(ch) {
    setState(ch);
    if (onChange) onChange(ch);
  }
  function addRow() {
    push({
      ...state,
      rows: [...state.rows, { id: uid(), account: "", debit: "", credit: "" }],
    });
  }
  function setField(id, field, val) {
    push({
      ...state,
      rows: state.rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)),
    });
  }
  function removeRow(id) {
    push({ ...state, rows: state.rows.filter((r) => r.id !== id) });
  }

  const totalDr = state.rows.reduce(
    (s, r) => s + (parseFloat(r.debit) || 0),
    0,
  );
  const totalCr = state.rows.reduce(
    (s, r) => s + (parseFloat(r.credit) || 0),
    0,
  );
  const inp = {
    fontSize: 13,
    padding: "4px 8px",
    border: "1.5px solid #d1d5db",
    borderRadius: 6,
    background: readonly ? "#f9fafb" : "#fff",
    width: "100%",
  };

  return (
    <div>
      {!readonly ? (
        <input
          value={state.title || ""}
          onChange={(e) => push({ ...state, title: e.target.value })}
          placeholder="Enter statement title (e.g. ABC Co. \u2014 Trial Balance as at 31 Dec 2025)..."
          style={{
            width: "100%",
            textAlign: "center",
            fontWeight: 600,
            fontSize: 14,
            padding: "7px 12px",
            border: "1.5px dashed #93c5fd",
            borderRadius: 8,
            background: "#f8faff",
            color: "#1e3a8a",
            boxSizing: "border-box",
            marginBottom: 12,
            outline: "none",
          }}
        />
      ) : state.title ? (
        <p
          style={{
            textAlign: "center",
            fontWeight: 600,
            fontSize: 14,
            color: "#1e3a8a",
            marginBottom: 10,
          }}
        >
          {state.title}
        </p>
      ) : null}
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr>
            <th style={TH}>Account Name</th>
            <th style={{ ...TH, width: 120 }}>Dr (Ksh)</th>
            <th style={{ ...TH, width: 120 }}>Cr (Ksh)</th>
            {!readonly && <th style={{ ...TH, width: 40 }}></th>}
          </tr>
        </thead>
        <tbody>
          {state.rows.map((r) => (
            <tr key={r.id}>
              <td style={CELL}>
                <input
                  style={inp}
                  disabled={readonly}
                  value={r.account}
                  placeholder="Account name"
                  onChange={(e) => setField(r.id, "account", e.target.value)}
                />
              </td>
              <td style={CELL}>
                <input
                  style={{ ...inp, textAlign: "right" }}
                  disabled={readonly}
                  type="number"
                  value={r.debit}
                  placeholder="0"
                  onChange={(e) => setField(r.id, "debit", e.target.value)}
                />
              </td>
              <td style={CELL}>
                <input
                  style={{ ...inp, textAlign: "right" }}
                  disabled={readonly}
                  type="number"
                  value={r.credit}
                  placeholder="0"
                  onChange={(e) => setField(r.id, "credit", e.target.value)}
                />
              </td>
              {!readonly && (
                <td style={{ ...CELL, textAlign: "center" }}>
                  <button
                    type="button"
                    title="Remove row"
                    onClick={() => removeRow(r.id)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "1.5px solid #fca5a5",
                      background: "#fff5f5",
                      color: "#ef4444",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </td>
              )}
            </tr>
          ))}
          {!readonly && (
            <tr>
              <td colSpan={readonly ? 3 : 4} style={{ ...CELL, paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={addRow}
                  style={{
                    fontSize: 12,
                    color: "#2563eb",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 6,
                    padding: "3px 10px",
                    cursor: "pointer",
                  }}
                >
                  + Add row
                </button>
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={TOTAL_ROW}>
            <td style={CELL}>
              <strong>Totals</strong>
            </td>
            <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>
              {totalDr ? totalDr.toLocaleString("en-KE") : ""}
            </td>
            <td style={{ ...CELL, textAlign: "right", color: "#1d4ed8" }}>
              {totalCr ? totalCr.toLocaleString("en-KE") : ""}
            </td>
            {!readonly && <td style={CELL}></td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FinancialStatementInput({
  schema,
  subtype: subtypeProp,
  value,
  onChange,
  readonly = false,
}) {
  const [answer, setAnswer] = useState(
    value && typeof value === "object" ? value : {},
  );

  useEffect(() => {
    if (value && typeof value === "object") setAnswer(value);
  }, [value]);

  // Resolve subtype — from schema or from the subtype prop passed directly
  const resolvedSubtype = (schema && schema.subtype) || subtypeProp || "";

  // If no schema but we have a subtype, render a blank dynamic template
  if (!schema || typeof schema !== "object") {
    if (!resolvedSubtype) {
      return (
        <div
          style={{
            padding: "12px 16px",
            border: "1px solid #fcd34d",
            background: "#fffbeb",
            borderRadius: 10,
            fontSize: 13,
            color: "#92400e",
          }}
        >
          Financial statement not configured yet. Please contact your teacher.
        </div>
      );
    }
    // Blank template — student adds their own rows
    const titleMap = {
      balance_sheet: "Balance Sheet",
      trading_account: "Trading / P&L Account",
      t_account: "T-Account / Ledger",
      income_statement: "Income Statement",
      cash_flow: "Cash Flow Statement",
      trial_balance: "Trial Balance",
    };
    return (
      <div style={{ fontFamily: "'Lato', sans-serif" }}>
        <p
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: 14,
            color: "#111827",
            borderBottom: "2px solid #e5e7eb",
            paddingBottom: 8,
            marginBottom: 12,
          }}
        >
          {titleMap[resolvedSubtype] || "Financial Statement"}
        </p>
        {(resolvedSubtype === "balance_sheet" ||
          resolvedSubtype === "trading_account" ||
          resolvedSubtype === "t_account") && (
          <BlankTwoCol
            subtype={resolvedSubtype}
            value={value}
            onChange={onChange}
            readonly={readonly}
          />
        )}
        {(resolvedSubtype === "income_statement" ||
          resolvedSubtype === "cash_flow") && (
          <BlankMultiSection
            subtype={resolvedSubtype}
            value={value}
            onChange={onChange}
            readonly={readonly}
          />
        )}
        {resolvedSubtype === "trial_balance" && (
          <BlankTrialBalance
            value={value}
            onChange={onChange}
            readonly={readonly}
          />
        )}
      </div>
    );
  }

  const update = (next) => {
    setAnswer(next);
    if (onChange) onChange(next);
  };
  const subtype = schema.subtype || "";
  const currency = schema.currency || "Ksh";

  return (
    <div style={{ fontFamily: "'Lato', sans-serif" }}>
      {schema.title && (
        <p
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: 14,
            color: "#111827",
            borderBottom: "2px solid #e5e7eb",
            paddingBottom: 8,
            marginBottom: 12,
          }}
        >
          {schema.title}
        </p>
      )}

      {(subtype === "balance_sheet" || subtype === "trading_account") && (
        <TwoColInput
          schema={schema}
          answer={answer}
          update={update}
          currency={currency}
          readonly={readonly}
        />
      )}
      {subtype === "t_account" && (
        <TAccountInput
          schema={schema}
          answer={answer}
          update={update}
          currency={currency}
          readonly={readonly}
        />
      )}
      {(subtype === "income_statement" || subtype === "cash_flow") && (
        <MultiSectionInput
          schema={schema}
          answer={answer}
          update={update}
          currency={currency}
          readonly={readonly}
        />
      )}
      {subtype === "trial_balance" && (
        <TrialBalanceInput
          schema={schema}
          answer={answer}
          update={update}
          currency={currency}
          readonly={readonly}
        />
      )}
      {!subtype && (
        <div
          style={{
            padding: "12px 16px",
            border: "1px solid #fcd34d",
            background: "#fffbeb",
            borderRadius: 10,
            fontSize: 13,
            color: "#92400e",
          }}
        >
          Statement type not set. Please edit this question.
        </div>
      )}
    </div>
  );
}
