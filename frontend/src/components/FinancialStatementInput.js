"use client";
/**
 * FinancialStatementInput — Student-facing
 *
 * The teacher provides ALL given data in the question text.
 * This component shows a blank financial statement where the student
 * fills in AMOUNTS only (row labels are pre-set by the teacher).
 *
 * Simple schema format:
 *   Two-column (balance_sheet, trading_account, t_account):
 *     { subtype, title, currency,
 *       left_heading, left_rows:  [{id, label, amount}],
 *       right_heading, right_rows: [{id, label, amount}] }
 *
 *   Single-column (income_statement, cash_flow):
 *     { subtype, title, currency, rows: [{id, label, amount}] }
 *
 *   Trial balance:
 *     { subtype, title, currency, rows: [{id, account, debit, credit}] }
 */

import { useState, useEffect } from "react";

const TWO_COL = ["balance_sheet", "trading_account", "t_account"];

function fmt(n) {
  const num = parseFloat(String(n ?? "").replace(/,/g, ""));
  return isNaN(num) ? "" : num.toLocaleString("en-KE");
}

function inputCls(correct) {
  if (correct === true)  return "border-green-400 bg-green-50 text-green-800";
  if (correct === false) return "border-red-400 bg-red-50 text-red-700";
  return "border-gray-300 bg-white";
}

function AmountCell({ value, onChange, readonly, correctAmt, showCorrect }) {
  const studentNum = parseFloat(String(value ?? "").replace(/,/g, ""));
  const correctNum = parseFloat(String(correctAmt ?? "").replace(/,/g, ""));
  const isCorrect = showCorrect && !isNaN(correctNum)
    ? !isNaN(studentNum) && Math.abs(studentNum - correctNum) < 0.01
    : null;

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value ?? ""}
        disabled={readonly}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        className={`w-full text-right text-sm py-1 px-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${inputCls(isCorrect)}`}
      />
      {showCorrect && isCorrect === false && (
        <span className="text-xs text-green-700 font-bold shrink-0">✓ {fmt(correctAmt)}</span>
      )}
    </div>
  );
}

function TwoColStatement({ schema, answer, update, currency, readonly, showCorrect }) {
  const leftRows  = schema.left_rows  || [];
  const rightRows = schema.right_rows || [];
  const leftH  = schema.left_heading  || "Left";
  const rightH = schema.right_heading || "Right";
  const leftAns  = answer?.left  || {};
  const rightAns = answer?.right || {};
  const leftTotal  = leftRows.reduce((s, r)  => s + (parseFloat(leftAns[r.id]  ?? "") || 0), 0);
  const rightTotal = rightRows.reduce((s, r) => s + (parseFloat(rightAns[r.id] ?? "") || 0), 0);
  const correctLeftTotal  = leftRows.reduce((s, r)  => s + (parseFloat(r.amount) || 0), 0);
  const correctRightTotal = rightRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const maxRows = Math.max(leftRows.length, rightRows.length, 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 bg-blue-50 text-blue-800 font-bold border border-blue-100">{leftH}</th>
            <th className="py-2 px-3 bg-blue-50 text-blue-800 font-bold border border-blue-100 text-right w-36">{currency}</th>
            <th className="text-left py-2 px-3 bg-blue-50 text-blue-800 font-bold border border-blue-100">{rightH}</th>
            <th className="py-2 px-3 bg-blue-50 text-blue-800 font-bold border border-blue-100 text-right w-36">{currency}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRows }).map((_, i) => {
            const lr = leftRows[i];
            const rr = rightRows[i];
            return (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="py-1.5 px-3 border border-gray-100 font-medium text-gray-700">{lr?.label || ""}</td>
                <td className="py-1 px-2 border border-gray-100 w-36">
                  {lr && (
                    <AmountCell
                      value={leftAns[lr.id] ?? ""}
                      onChange={(v) => update({ ...answer, left: { ...leftAns, [lr.id]: v } })}
                      readonly={readonly}
                      correctAmt={lr.amount}
                      showCorrect={showCorrect}
                    />
                  )}
                </td>
                <td className="py-1.5 px-3 border border-gray-100 font-medium text-gray-700">{rr?.label || ""}</td>
                <td className="py-1 px-2 border border-gray-100 w-36">
                  {rr && (
                    <AmountCell
                      value={rightAns[rr.id] ?? ""}
                      onChange={(v) => update({ ...answer, right: { ...rightAns, [rr.id]: v } })}
                      readonly={readonly}
                      correctAmt={rr.amount}
                      showCorrect={showCorrect}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-gray-100 border-t-2 border-gray-400">
            <td className="py-2 px-3 border border-gray-200">Total</td>
            <td className="py-2 px-3 border border-gray-200 text-right text-blue-800">
              {fmt(leftTotal)}
              {showCorrect && Math.abs(leftTotal - correctLeftTotal) > 0.01 && (
                <span className="text-green-700 text-xs ml-1">✓ {fmt(correctLeftTotal)}</span>
              )}
            </td>
            <td className="py-2 px-3 border border-gray-200">Total</td>
            <td className="py-2 px-3 border border-gray-200 text-right text-blue-800">
              {fmt(rightTotal)}
              {showCorrect && Math.abs(rightTotal - correctRightTotal) > 0.01 && (
                <span className="text-green-700 text-xs ml-1">✓ {fmt(correctRightTotal)}</span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SingleColStatement({ schema, answer, update, currency, readonly, showCorrect }) {
  const rows = schema.rows || [];
  const ans  = answer?.rows || {};
  const studentTotal = rows.reduce((s, r) => s + (parseFloat(ans[r.id] ?? "") || 0), 0);
  const correctTotal = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 bg-blue-50 text-blue-800 font-bold border border-blue-100">Item</th>
            <th className="py-2 px-3 bg-blue-50 text-blue-800 font-bold border border-blue-100 text-right w-40">{currency}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="py-1.5 px-3 border border-gray-100 font-medium text-gray-700">{row.label}</td>
              <td className="py-1 px-2 border border-gray-100 w-40">
                <AmountCell
                  value={ans[row.id] ?? ""}
                  onChange={(v) => update({ ...answer, rows: { ...ans, [row.id]: v } })}
                  readonly={readonly}
                  correctAmt={row.amount}
                  showCorrect={showCorrect}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-gray-100 border-t-2 border-gray-400">
            <td className="py-2 px-3 border border-gray-200">{schema.total_label || "Total"}</td>
            <td className="py-2 px-3 border border-gray-200 text-right text-blue-800">
              {fmt(studentTotal)}
              {showCorrect && Math.abs(studentTotal - correctTotal) > 0.01 && (
                <span className="text-green-700 text-xs ml-1">✓ {fmt(correctTotal)}</span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function TrialBalanceStatement({ schema, answer, update, currency, readonly, showCorrect }) {
  const rows = schema.rows || [];
  const ans  = answer?.rows || {};
  const totalDr = rows.reduce((s, r) => s + (parseFloat(ans[r.id]?.debit  ?? "") || 0), 0);
  const totalCr = rows.reduce((s, r) => s + (parseFloat(ans[r.id]?.credit ?? "") || 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 bg-blue-50 text-blue-800 font-bold border border-blue-100">Account</th>
            <th className="py-2 px-3 bg-blue-50 text-blue-800 font-bold border border-blue-100 text-right w-36">Dr ({currency})</th>
            <th className="py-2 px-3 bg-blue-50 text-blue-800 font-bold border border-blue-100 text-right w-36">Cr ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const rowAns = ans[row.id] || {};
            const cDr = parseFloat(row.debit ?? "");
            const cCr = parseFloat(row.credit ?? "");
            const sDr = parseFloat(rowAns.debit ?? "");
            const sCr = parseFloat(rowAns.credit ?? "");
            const drOk = showCorrect && !isNaN(cDr) ? Math.abs(sDr - cDr) < 0.01 : null;
            const crOk = showCorrect && !isNaN(cCr) ? Math.abs(sCr - cCr) < 0.01 : null;
            return (
              <tr key={row.id || i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="py-1.5 px-3 border border-gray-100 font-medium text-gray-700">{row.account}</td>
                <td className="py-1 px-2 border border-gray-100 w-36">
                  <input type="number" value={rowAns.debit ?? ""} disabled={readonly} placeholder="0"
                    onChange={(e) => update({ ...answer, rows: { ...ans, [row.id]: { ...rowAns, debit: e.target.value } } })}
                    className={`w-full text-right text-sm py-1 px-2 border rounded-lg focus:outline-none ${inputCls(drOk)}`}
                  />
                </td>
                <td className="py-1 px-2 border border-gray-100 w-36">
                  <input type="number" value={rowAns.credit ?? ""} disabled={readonly} placeholder="0"
                    onChange={(e) => update({ ...answer, rows: { ...ans, [row.id]: { ...rowAns, credit: e.target.value } } })}
                    className={`w-full text-right text-sm py-1 px-2 border rounded-lg focus:outline-none ${inputCls(crOk)}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-gray-100 border-t-2 border-gray-400">
            <td className="py-2 px-3 border border-gray-200">Totals</td>
            <td className="py-2 px-3 border border-gray-200 text-right text-blue-800">{fmt(totalDr)}</td>
            <td className="py-2 px-3 border border-gray-200 text-right text-blue-800">{fmt(totalCr)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function FinancialStatementInput({ schema, value, onChange, readonly = false, showCorrect = false }) {
  const [answer, setAnswer] = useState(value || {});

  useEffect(() => {
    if (value && typeof value === "object") setAnswer(value);
  }, [value]);

  if (!schema || typeof schema !== "object") {
    return (
      <p className="text-sm text-amber-700 p-3 border border-amber-200 bg-amber-50 rounded-lg">
        Financial statement not set up yet. Please contact your teacher.
      </p>
    );
  }

  const update = (next) => { setAnswer(next); if (onChange) onChange(next); };
  const currency = schema.currency || "Ksh";
  const subtype  = schema.subtype  || "";

  return (
    <div className="space-y-3">
      {schema.title && (
        <p className="text-center text-sm font-bold text-gray-700 border-b pb-2">{schema.title}</p>
      )}
      {TWO_COL.includes(subtype) ? (
        <TwoColStatement schema={schema} answer={answer} update={update} currency={currency} readonly={readonly} showCorrect={showCorrect} />
      ) : subtype === "trial_balance" ? (
        <TrialBalanceStatement schema={schema} answer={answer} update={update} currency={currency} readonly={readonly} showCorrect={showCorrect} />
      ) : (
        <SingleColStatement schema={schema} answer={answer} update={update} currency={currency} readonly={readonly} showCorrect={showCorrect} />
      )}
    </div>
  );
}