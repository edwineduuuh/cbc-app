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
  padding: "8px 12px",
  border: "1px solid #e5e7eb",
  verticalAlign: "middle",
};
const TH = {
  ...CELL,
  background: "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 12,
  textAlign: "center",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};
const SUBTOTAL_ROW = {
  fontWeight: 700,
  background: "#eff6ff",
  borderTop: "2px solid #bfdbfe",
};
const TOTAL_ROW = {
  fontWeight: 700,
  background: "#1e40af",
  color: "#fff",
  borderTop: "2px solid #1e3a8a",
};

function AmountInput({ value, onChange, readonly }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value ?? ""}
      disabled={readonly}
      placeholder="0"
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9.\-]/g, "");
        onChange(v);
      }}
      style={{
        width: "100%",
        textAlign: "right",
        fontSize: 14,
        fontWeight: 600,
        padding: "7px 10px",
        border: "1.5px solid #d1d5db",
        borderRadius: 8,
        background: readonly ? "#f8fafc" : "#fff",
        outline: "none",
        boxSizing: "border-box",
        color: readonly ? "#6b7280" : "#111827",
        WebkitAppearance: "none",
        MozAppearance: "textfield",
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "#3b82f6";
        e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "#d1d5db";
        e.target.style.boxShadow = "none";
      }}
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
              <td style={{ ...CELL, color: "#fff" }}>Total</td>
              <td
                style={{
                  ...CELL,
                  textAlign: "right",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
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
              <td style={{ ...CELL, color: "#fff" }}>Total</td>
              <td
                style={{
                  ...CELL,
                  textAlign: "right",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
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
              <td style={{ ...CELL, color: "#fff" }}>Total</td>
              <td
                style={{
                  ...CELL,
                  textAlign: "right",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
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
              <td style={{ ...CELL, color: "#fff" }}>Total</td>
              <td
                style={{
                  ...CELL,
                  textAlign: "right",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
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
            <td style={{ ...CELL, color: "#fff" }}>
              {schema.resultLabel || schema.closingBalanceLabel || "Total"}
            </td>
            <td
              style={{
                ...CELL,
                textAlign: "right",
                color: "#fff",
                fontWeight: 700,
              }}
            >
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
            <td style={{ ...CELL, color: "#fff" }}>Totals</td>
            <td
              style={{
                ...CELL,
                textAlign: "right",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {fmt(totalDr)}
            </td>
            <td
              style={{
                ...CELL,
                textAlign: "right",
                color: "#fff",
                fontWeight: 700,
              }}
            >
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

// ── TwoColSide must be at module level (NOT inside BlankTwoCol) ──────────────
// Defining it inside another component would cause React to treat it as a new
// component type on every render, unmounting/remounting it and losing focus.
function TwoColSide({
  heading,
  rows,
  readonly,
  onLabelChange,
  onAmountChange,
  onRemove,
  onAdd,
  total,
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          padding: "10px 14px",
          borderRadius: "10px 10px 0 0",
          textAlign: "center",
          letterSpacing: "0.03em",
          wordBreak: "break-word",
          whiteSpace: "normal",
          lineHeight: 1.35,
        }}
      >
        {heading}
      </div>
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderTop: "none",
          background: "#fff",
        }}
      >
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "6px 10px",
              borderBottom: "1px solid #f1f5f9",
              background: "#fff",
            }}
          >
            <input
              style={{
                flex: 2,
                fontSize: 13,
                padding: "7px 10px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                background: readonly ? "#f8fafc" : "#fff",
                color: "#111827",
                outline: "none",
                minWidth: 0,
              }}
              disabled={readonly}
              value={r.label}
              placeholder="Item name"
              onChange={(e) => onLabelChange(r.id, e.target.value)}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "none";
              }}
            />
            <input
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 600,
                padding: "7px 10px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                textAlign: "right",
                background: readonly ? "#f8fafc" : "#fff",
                color: "#111827",
                outline: "none",
                minWidth: 0,
                WebkitAppearance: "none",
                MozAppearance: "textfield",
              }}
              disabled={readonly}
              value={r.amount}
              placeholder="0"
              type="text"
              inputMode="decimal"
              onChange={(e) =>
                onAmountChange(r.id, e.target.value.replace(/[^0-9.\-]/g, ""))
              }
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "none";
              }}
            />
            {!readonly && (
              <button
                type="button"
                title="Remove row"
                onClick={() => onRemove(r.id)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "1.5px solid #fca5a5",
                  background: "#fff5f5",
                  color: "#ef4444",
                  fontSize: 14,
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
          <div style={{ padding: "8px 10px", background: "#f8fafc" }}>
            <button
              type="button"
              onClick={onAdd}
              style={{
                fontSize: 13,
                color: "#1d4ed8",
                background: "#eff6ff",
                border: "1.5px dashed #93c5fd",
                borderRadius: 8,
                padding: "5px 14px",
                cursor: "pointer",
                fontWeight: 600,
                width: "100%",
              }}
            >
              + Add row
            </button>
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px 14px",
          fontWeight: 700,
          fontSize: 14,
          background: "#1e40af",
          color: "#fff",
          borderRadius: "0 0 10px 10px",
        }}
      >
        <span>Total</span>
        <span>{total}</span>
      </div>
    </div>
  );
}

function BlankTwoCol({ subtype, value, onChange, readonly, headings }) {
  const defaults = BLANK_CONFIGS[subtype] || { leftHead: "Left", rightHead: "Right" };
  const cfg = {
    leftHead: headings?.leftHeading || defaults.leftHead,
    rightHead: headings?.rightHeading || defaults.rightHead,
  };
  const init =
    value && value._blank
      ? value
      : { _blank: true, title: "", left: [], right: [] };
  const [state, setState] = React.useState(init);

  // Sync when value loads asynchronously (readonly results page)
  React.useEffect(() => {
    if (readonly && value && value._blank) setState(value);
  }, [readonly, value]);

  function push(ch) {
    setState(ch);
    if (onChange) onChange(ch);
  }

  function addRow(side) {
    push({
      ...state,
      [side]: [...(state[side] || []), { id: uid(), label: "", amount: "" }],
    });
  }
  function setField(side, id, field, val) {
    push({
      ...state,
      [side]: state[side].map((r) =>
        r.id === id ? { ...r, [field]: val } : r,
      ),
    });
  }
  function removeRow(side, id) {
    push({ ...state, [side]: state[side].filter((r) => r.id !== id) });
  }

  const calcTotal = (side) => {
    const t = (state[side] || []).reduce(
      (s, r) => s + (parseFloat(r.amount) || 0),
      0,
    );
    return t ? t.toLocaleString("en-KE") : "";
  };

  return (
    <div>
      {!readonly ? (
        <input
          value={state.title || ""}
          onChange={(e) => push({ ...state, title: e.target.value })}
          placeholder="Enter statement title (e.g. ABC Co. — Balance Sheet as at 31 Dec 2025)..."
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
        <TwoColSide
          heading={cfg.leftHead}
          rows={state.left || []}
          readonly={readonly}
          onLabelChange={(id, val) => setField("left", id, "label", val)}
          onAmountChange={(id, val) => setField("left", id, "amount", val)}
          onRemove={(id) => removeRow("left", id)}
          onAdd={() => addRow("left")}
          total={calcTotal("left")}
        />
        <TwoColSide
          heading={cfg.rightHead}
          rows={state.right || []}
          readonly={readonly}
          onLabelChange={(id, val) => setField("right", id, "label", val)}
          onAmountChange={(id, val) => setField("right", id, "amount", val)}
          onRemove={(id) => removeRow("right", id)}
          onAdd={() => addRow("right")}
          total={calcTotal("right")}
        />
      </div>
    </div>
  );
}

function BlankMultiSection({ subtype, value, onChange, readonly, headings }) {
  const defaultSections = BLANK_SECTIONS[subtype] || ["Items"];
  const sections = (headings?.sectionNames?.length ? headings.sectionNames : defaultSections);
  const initRows = Object.fromEntries(sections.map((s) => [s, []]));
  const init =
    value && value._blank ? value : { _blank: true, title: "", rows: initRows };
  const [state, setState] = React.useState(init);

  // Sync when value loads asynchronously (readonly results page)
  React.useEffect(() => {
    if (readonly && value && value._blank) setState(value);
  }, [readonly, value]);

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
    gap: 8,
    alignItems: "center",
    padding: "6px 10px",
    borderBottom: "1px solid #f1f5f9",
    background: "#fff",
  };
  const labelIn = {
    flex: 2,
    fontSize: 13,
    padding: "7px 10px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 8,
    background: readonly ? "#f8fafc" : "#fff",
    color: "#111827",
    outline: "none",
  };
  const amtIn = {
    flex: 1,
    fontSize: 13,
    fontWeight: 600,
    padding: "7px 10px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 8,
    textAlign: "right",
    background: readonly ? "#f8fafc" : "#fff",
    color: "#111827",
    outline: "none",
    WebkitAppearance: "none",
    MozAppearance: "textfield",
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
        <div
          key={sec}
          style={{
            marginBottom: 16,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              padding: "10px 14px",
              letterSpacing: "0.03em",
            }}
          >
            {sec}
          </div>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderTop: "none",
              background: "#fff",
            }}
          >
            {(state.rows[sec] || []).map((r) => (
              <div key={r.id} style={rowStyle}>
                <input
                  style={labelIn}
                  disabled={readonly}
                  value={r.label}
                  placeholder="Item name"
                  onChange={(e) => setField(sec, r.id, "label", e.target.value)}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3b82f6";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(59,130,246,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <input
                  style={amtIn}
                  disabled={readonly}
                  value={r.amount}
                  placeholder="0"
                  type="text"
                  inputMode="decimal"
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.\-]/g, "");
                    setField(sec, r.id, "amount", v);
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3b82f6";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(59,130,246,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                  }}
                />
                {!readonly && (
                  <button
                    type="button"
                    title="Remove row"
                    onClick={() => removeRow(sec, r.id)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: "1.5px solid #fca5a5",
                      background: "#fff5f5",
                      color: "#ef4444",
                      fontSize: 14,
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
              <div style={{ padding: "8px 10px", background: "#f8fafc" }}>
                <button
                  type="button"
                  onClick={() => addRow(sec)}
                  style={{
                    fontSize: 13,
                    color: "#1d4ed8",
                    background: "#eff6ff",
                    border: "1.5px dashed #93c5fd",
                    borderRadius: 8,
                    padding: "5px 14px",
                    cursor: "pointer",
                    fontWeight: 600,
                    width: "100%",
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
                padding: "8px 14px",
                fontWeight: 700,
                fontSize: 13,
                background: "#eff6ff",
                borderTop: "2px solid #bfdbfe",
                color: "#1e40af",
              }}
            >
              <span>Subtotal</span>
              <span>
                {secTotal(sec) ? secTotal(sec).toLocaleString("en-KE") : "—"}
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
    padding: "7px 10px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 8,
    background: readonly ? "#f8fafc" : "#fff",
    color: "#111827",
    outline: "none",
    width: "100%",
    WebkitAppearance: "none",
    MozAppearance: "textfield",
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
                  style={{ ...inp, textAlign: "right", fontWeight: 600 }}
                  disabled={readonly}
                  type="text"
                  inputMode="decimal"
                  value={r.debit}
                  placeholder="0"
                  onChange={(e) =>
                    setField(
                      r.id,
                      "debit",
                      e.target.value.replace(/[^0-9.\-]/g, ""),
                    )
                  }
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3b82f6";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(59,130,246,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </td>
              <td style={CELL}>
                <input
                  style={{ ...inp, textAlign: "right", fontWeight: 600 }}
                  disabled={readonly}
                  type="text"
                  inputMode="decimal"
                  value={r.credit}
                  placeholder="0"
                  onChange={(e) =>
                    setField(
                      r.id,
                      "credit",
                      e.target.value.replace(/[^0-9.\-]/g, ""),
                    )
                  }
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3b82f6";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(59,130,246,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </td>
              {!readonly && (
                <td style={{ ...CELL, textAlign: "center" }}>
                  <button
                    type="button"
                    title="Remove row"
                    onClick={() => removeRow(r.id)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: "1.5px solid #fca5a5",
                      background: "#fff5f5",
                      color: "#ef4444",
                      fontSize: 14,
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
              <td
                colSpan={readonly ? 3 : 4}
                style={{ ...CELL, paddingTop: 8, background: "#f8fafc" }}
              >
                <button
                  type="button"
                  onClick={addRow}
                  style={{
                    fontSize: 13,
                    color: "#1d4ed8",
                    background: "#eff6ff",
                    border: "1.5px dashed #93c5fd",
                    borderRadius: 8,
                    padding: "5px 14px",
                    cursor: "pointer",
                    fontWeight: 600,
                    width: "100%",
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
            <td style={{ ...CELL, color: "#fff" }}>
              <strong>Totals</strong>
            </td>
            <td
              style={{
                ...CELL,
                textAlign: "right",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {totalDr ? totalDr.toLocaleString("en-KE") : "—"}
            </td>
            <td
              style={{
                ...CELL,
                textAlign: "right",
                color: "#fff",
                fontWeight: 700,
              }}
            >
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
  schemaHeadings = null,
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
            headings={schemaHeadings}
            value={value}
            onChange={onChange}
            readonly={readonly}
          />
        )}
        {(resolvedSubtype === "income_statement" ||
          resolvedSubtype === "cash_flow") && (
          <BlankMultiSection
            subtype={resolvedSubtype}
            headings={schemaHeadings}
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
