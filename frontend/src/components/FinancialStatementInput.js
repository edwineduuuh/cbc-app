"use client";
/**
 * FinancialStatementInput
 * Student-facing component. Renders a blank editable financial statement
 * based on the teacher's marking_scheme structure.
 *
 * Props:
 *   schema          – marking_scheme JSON from the question (teacher-defined correct answer)
 *   value           – student's current answer JSON (or null)
 *   onChange(json)  – called on every edit
 *   readonly        – if true, shows submitted state (no editing)
 *   showCorrect     – if true, shows correct values alongside (for review)
 */

import { useState, useEffect } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return "";
  return num.toLocaleString("en-KE");
}

function sumRows(rows) {
  return rows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
}

function deepCloneBlank(schema) {
  // Build a blank student answer mirroring the schema structure (labels present, amounts cleared)
  const json = JSON.parse(JSON.stringify(schema));
  const clearRows = (rows) => rows.map((r) => ({ ...r, amount: "" }));
  const clearRowsLabel = (rows) =>
    rows.map((r) => ({ ...r, label: "", amount: "" }));

  switch (schema.subtype) {
    case "balance_sheet":
    case "trading_account": {
      const cloneSection = (secs) =>
        secs.map((s) => ({ ...s, rows: clearRowsLabel(s.rows) }));
      json.left.sections = cloneSection(json.left.sections);
      json.right.sections = cloneSection(json.right.sections);
      break;
    }
    case "t_account":
      json.left.rows = clearRowsLabel(json.left.rows);
      json.right.rows = clearRowsLabel(json.right.rows);
      break;
    case "income_statement":
    case "cash_flow":
      json.sections = json.sections.map((s) => ({
        ...s,
        rows: clearRowsLabel(s.rows),
      }));
      if (schema.subtype === "cash_flow") json.openingBalance = "";
      break;
    case "trial_balance":
      json.rows = json.rows.map((r) => ({
        ...r,
        account: "",
        debit: "",
        credit: "",
      }));
      break;
    default:
      break;
  }
  return json;
}

// ── shared row display ────────────────────────────────────────────────────────
const cellCls = (readonly) =>
  `border-0 border-b border-gray-200 bg-transparent focus:outline-none focus:border-blue-400 text-sm w-full py-1 px-1 ${readonly ? "cursor-default" : ""}`;

function AmountRowInput({
  row,
  onChange,
  currency,
  readonly,
  correctRow,
  showCorrect,
}) {
  const studentAmt = parseFloat(row.amount) || 0;
  const correctAmt = parseFloat(correctRow?.amount) || 0;
  const isCorrectLabel =
    !showCorrect ||
    row.label?.trim().toLowerCase() === correctRow?.label?.trim().toLowerCase();
  const isCorrectAmt = !showCorrect || studentAmt === correctAmt;

  return (
    <div className="flex items-center gap-1 py-0.5">
      <input
        type="text"
        value={row.label}
        disabled={readonly}
        placeholder="Item…"
        onChange={(e) => onChange({ ...row, label: e.target.value })}
        className={`${cellCls(readonly)} flex-1 ${showCorrect && !isCorrectLabel ? "text-red-500" : ""}`}
      />
      <div
        className={`flex items-center gap-0.5 shrink-0 w-32 ${showCorrect && !isCorrectAmt ? "text-red-500" : ""}`}
      >
        <span className="text-gray-400 text-xs">{currency}</span>
        <input
          type="number"
          value={row.amount}
          disabled={readonly}
          placeholder="0"
          onChange={(e) => onChange({ ...row, amount: e.target.value })}
          className={`${cellCls(readonly)} text-right w-full`}
        />
      </div>
      {showCorrect && !isCorrectAmt && (
        <span className="text-xs text-green-600 font-semibold shrink-0 w-20 text-right">
          ✓ {fmt(correctAmt)}
        </span>
      )}
    </div>
  );
}

function TrialRowInput({ row, onChange, readonly, correctRow, showCorrect }) {
  return (
    <div className="grid grid-cols-[1fr_96px_96px] gap-2 py-0.5">
      <input
        type="text"
        value={row.account}
        disabled={readonly}
        placeholder="Account…"
        onChange={(e) => onChange({ ...row, account: e.target.value })}
        className={`${cellCls(readonly)} ${showCorrect && row.account !== correctRow?.account ? "text-red-500" : ""}`}
      />
      <input
        type="number"
        value={row.debit}
        disabled={readonly}
        placeholder="0"
        onChange={(e) => onChange({ ...row, debit: e.target.value })}
        className={`${cellCls(readonly)} text-right ${showCorrect && parseFloat(row.debit) !== parseFloat(correctRow?.debit) ? "text-red-500" : ""}`}
      />
      <input
        type="number"
        value={row.credit}
        disabled={readonly}
        placeholder="0"
        onChange={(e) => onChange({ ...row, credit: e.target.value })}
        className={`${cellCls(readonly)} text-right ${showCorrect && parseFloat(row.credit) !== parseFloat(correctRow?.credit) ? "text-red-500" : ""}`}
      />
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function FinancialStatementInput({
  schema,
  value,
  onChange,
  readonly = false,
  showCorrect = false,
}) {
  const [answer, setAnswer] = useState(() => {
    if (value && typeof value === "object") return value;
    return deepCloneBlank(schema);
  });

  useEffect(() => {
    if (value && typeof value === "object") setAnswer(value);
  }, [value]);

  const update = (next) => {
    setAnswer(next);
    if (onChange) onChange(next);
  };

  const currency = schema?.currency || "Ksh";
  const subtype = schema?.subtype;

  // ── table styles ───────────────────────────────────────────────────────────
  const panelStyle = {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 14,
    overflow: "hidden",
    flex: 1,
  };
  const headerStyle = {
    background: "#f8fafc",
    borderBottom: "1.5px solid #e2e8f0",
    padding: "8px 14px",
    fontWeight: 700,
    fontSize: 13,
    color: "#374151",
    textAlign: "center",
  };
  const totalRowStyle = {
    borderTop: "2px solid #94a3b8",
    padding: "6px 14px",
    display: "flex",
    justifyContent: "space-between",
    fontWeight: 700,
    fontSize: 13,
    background: "#f1f5f9",
  };

  // ── BALANCE SHEET / TRADING ACCOUNT ───────────────────────────────────────
  if (subtype === "balance_sheet" || subtype === "trading_account") {
    const updateSide = (sideKey, newSide) =>
      update({ ...answer, [sideKey]: newSide });
    const updateSection = (sideKey, si, newSec) => {
      const side = answer[sideKey];
      updateSide(sideKey, {
        ...side,
        sections: side.sections.map((s, i) => (i === si ? newSec : s)),
      });
    };

    const renderSide = (sideKey) => {
      const side = answer[sideKey];
      const correctSide = schema[sideKey];
      const total = side.sections.reduce((acc, s) => acc + sumRows(s.rows), 0);
      const correctTotal =
        correctSide?.sections?.reduce((acc, s) => acc + sumRows(s.rows), 0) ||
        0;

      return (
        <div style={panelStyle}>
          <div style={headerStyle}>{side.heading}</div>
          <div style={{ padding: "10px 14px" }}>
            {side.sections.map((sec, si) => {
              const correctSec = correctSide?.sections?.[si];
              return (
                <div key={si} className="mb-3">
                  {sec.name !== undefined && (
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 pb-0.5 border-b border-gray-100">
                      {sec.name || (
                        <span className="opacity-30">(section)</span>
                      )}
                    </div>
                  )}
                  {sec.rows.map((row, ri) => (
                    <AmountRowInput
                      key={ri}
                      row={row}
                      currency={currency}
                      readonly={readonly}
                      correctRow={correctSec?.rows?.[ri]}
                      showCorrect={showCorrect}
                      onChange={(r) =>
                        updateSection(sideKey, si, {
                          ...sec,
                          rows: sec.rows.map((x, i) => (i === ri ? r : x)),
                        })
                      }
                    />
                  ))}
                </div>
              );
            })}
          </div>
          <div style={totalRowStyle}>
            <span>Total</span>
            <span
              className={
                showCorrect && total !== correctTotal ? "text-red-500" : ""
              }
            >
              {currency} {fmt(total)}
              {showCorrect && total !== correctTotal && (
                <span className="text-green-600 text-xs ml-2">
                  ✓ {fmt(correctTotal)}
                </span>
              )}
            </span>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-3">
        {schema.title && (
          <p className="text-center text-sm font-bold text-gray-700 whitespace-pre-line">
            {schema.title}
          </p>
        )}
        <div className="flex gap-3">
          {renderSide("left")}
          {renderSide("right")}
        </div>
      </div>
    );
  }

  // ── T-ACCOUNT ─────────────────────────────────────────────────────────────
  if (subtype === "t_account") {
    const updateSide = (sideKey, newSide) =>
      update({ ...answer, [sideKey]: newSide });
    const total = (sideKey) => sumRows(answer[sideKey]?.rows || []);
    const correctTotal = (sideKey) => sumRows(schema[sideKey]?.rows || []);

    const renderSide = (sideKey) => {
      const side = answer[sideKey];
      const cSide = schema[sideKey];
      const t = total(sideKey);
      const ct = correctTotal(sideKey);
      return (
        <div style={panelStyle}>
          <div style={headerStyle}>{side.heading}</div>
          <div style={{ padding: "10px 14px" }}>
            {side.rows.map((row, ri) => (
              <AmountRowInput
                key={ri}
                row={row}
                currency={currency}
                readonly={readonly}
                correctRow={cSide?.rows?.[ri]}
                showCorrect={showCorrect}
                onChange={(r) =>
                  updateSide(sideKey, {
                    ...side,
                    rows: side.rows.map((x, i) => (i === ri ? r : x)),
                  })
                }
              />
            ))}
          </div>
          <div style={totalRowStyle}>
            <span>Total</span>
            <span className={showCorrect && t !== ct ? "text-red-500" : ""}>
              {currency} {fmt(t)}
              {showCorrect && t !== ct && (
                <span className="text-green-600 text-xs ml-2">✓ {fmt(ct)}</span>
              )}
            </span>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-3">
        {(schema.accountName || answer.accountName) && (
          <p className="text-center text-sm font-bold text-gray-700">
            {schema.accountName}
          </p>
        )}
        <div className="flex gap-3">
          {renderSide("left")}
          {renderSide("right")}
        </div>
      </div>
    );
  }

  // ── INCOME STATEMENT / CASH FLOW ─────────────────────────────────────────
  if (subtype === "income_statement" || subtype === "cash_flow") {
    const updateSection = (si, newSec) =>
      update({
        ...answer,
        sections: answer.sections.map((s, i) => (i === si ? newSec : s)),
      });

    const sectionTotals = answer.sections.map((s) => sumRows(s.rows));
    const grandTotal = sectionTotals.reduce((a, b) => a + b, 0);
    const correctSectionTotals = schema.sections.map((s) => sumRows(s.rows));
    const correctGrandTotal = correctSectionTotals.reduce((a, b) => a + b, 0);
    const openingBal = parseFloat(answer.openingBalance) || 0;
    const closingBal = openingBal + grandTotal;
    const correctOpeningBal = parseFloat(schema.openingBalance) || 0;
    const correctClosingBal = correctOpeningBal + correctGrandTotal;

    return (
      <div style={panelStyle}>
        {schema.title && <div style={headerStyle}>{schema.title}</div>}
        <div style={{ padding: "12px 16px" }}>
          {subtype === "cash_flow" && (
            <div className="flex justify-between items-center py-1.5 border-b border-gray-100 mb-3">
              <span className="text-sm font-semibold text-gray-600">
                Opening Cash Balance
              </span>
              <div className="flex items-center gap-1 w-36">
                <span className="text-gray-400 text-xs">{currency}</span>
                <input
                  type="number"
                  value={answer.openingBalance || ""}
                  disabled={readonly}
                  placeholder="0"
                  onChange={(e) =>
                    update({ ...answer, openingBalance: e.target.value })
                  }
                  className={`${cellCls(readonly)} text-right w-full`}
                />
              </div>
            </div>
          )}
          {answer.sections.map((sec, si) => {
            const correctSec = schema.sections[si];
            const secTotal = sectionTotals[si];
            const cSecTotal = correctSectionTotals[si];
            return (
              <div key={si} className="mb-4">
                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1.5 pb-0.5 border-b border-indigo-100">
                  {sec.name}
                </div>
                {sec.rows.map((row, ri) => (
                  <AmountRowInput
                    key={ri}
                    row={row}
                    currency={currency}
                    readonly={readonly}
                    correctRow={correctSec?.rows?.[ri]}
                    showCorrect={showCorrect}
                    onChange={(r) =>
                      updateSection(si, {
                        ...sec,
                        rows: sec.rows.map((x, i) => (i === ri ? r : x)),
                      })
                    }
                  />
                ))}
                <div className="flex justify-between items-center py-1 border-t border-gray-200 mt-1 text-sm font-semibold text-gray-600">
                  <span>{sec.subtotalLabel || "Subtotal"}</span>
                  <span
                    className={
                      showCorrect && secTotal !== cSecTotal
                        ? "text-red-500"
                        : ""
                    }
                  >
                    {currency} {fmt(secTotal)}
                    {showCorrect && secTotal !== cSecTotal && (
                      <span className="text-green-600 text-xs ml-2">
                        ✓ {fmt(cSecTotal)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
          <div
            style={{
              ...totalRowStyle,
              marginTop: 8,
              borderRadius: "0 0 10px 10px",
            }}
          >
            <span>
              {subtype === "cash_flow"
                ? schema.closingBalanceLabel || "Closing Cash Balance"
                : schema.resultLabel || "Net Profit / (Loss)"}
            </span>
            <span
              className={
                showCorrect &&
                (subtype === "cash_flow"
                  ? closingBal !== correctClosingBal
                  : grandTotal !== correctGrandTotal)
                  ? "text-red-500"
                  : ""
              }
            >
              {currency}{" "}
              {fmt(subtype === "cash_flow" ? closingBal : grandTotal)}
              {showCorrect &&
                (subtype === "cash_flow"
                  ? closingBal !== correctClosingBal
                  : grandTotal !== correctGrandTotal) && (
                  <span className="text-green-600 text-xs ml-2">
                    ✓{" "}
                    {fmt(
                      subtype === "cash_flow"
                        ? correctClosingBal
                        : correctGrandTotal,
                    )}
                  </span>
                )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── TRIAL BALANCE ─────────────────────────────────────────────────────────
  if (subtype === "trial_balance") {
    const totalDebit = answer.rows.reduce(
      (a, r) => a + (parseFloat(r.debit) || 0),
      0,
    );
    const totalCredit = answer.rows.reduce(
      (a, r) => a + (parseFloat(r.credit) || 0),
      0,
    );
    const cTotalDebit = schema.rows.reduce(
      (a, r) => a + (parseFloat(r.debit) || 0),
      0,
    );
    const cTotalCredit = schema.rows.reduce(
      (a, r) => a + (parseFloat(r.credit) || 0),
      0,
    );

    return (
      <div style={panelStyle}>
        {schema.title && <div style={headerStyle}>{schema.title}</div>}
        <div style={{ padding: "0 16px" }}>
          <div className="grid grid-cols-[1fr_96px_96px] gap-2 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Account
            </span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
              Dr ({currency})
            </span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
              Cr ({currency})
            </span>
          </div>
          {answer.rows.map((row, ri) => (
            <TrialRowInput
              key={ri}
              row={row}
              readonly={readonly}
              correctRow={schema.rows[ri]}
              showCorrect={showCorrect}
              onChange={(r) =>
                update({
                  ...answer,
                  rows: answer.rows.map((x, i) => (i === ri ? r : x)),
                })
              }
            />
          ))}
          <div className="grid grid-cols-[1fr_96px_96px] gap-2 py-2 border-t-2 border-gray-400 font-bold text-sm mt-2">
            <span>Totals</span>
            <span
              className={`text-right ${showCorrect && totalDebit !== cTotalDebit ? "text-red-500" : ""}`}
            >
              {fmt(totalDebit)}
              {showCorrect && totalDebit !== cTotalDebit && (
                <span className="text-green-600 text-xs block">
                  ✓ {fmt(cTotalDebit)}
                </span>
              )}
            </span>
            <span
              className={`text-right ${showCorrect && totalCredit !== cTotalCredit ? "text-red-500" : ""}`}
            >
              {fmt(totalCredit)}
              {showCorrect && totalCredit !== cTotalCredit && (
                <span className="text-green-600 text-xs block">
                  ✓ {fmt(cTotalCredit)}
                </span>
              )}
            </span>
          </div>
          {totalDebit === totalCredit && totalDebit > 0 && !showCorrect && (
            <p className="text-center text-xs text-green-600 font-semibold py-2">
              ✓ Trial balance agrees
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-gray-400 italic">
      Unsupported statement type: {subtype}
    </p>
  );
}
