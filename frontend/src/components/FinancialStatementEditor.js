"use client";
/**
 * FinancialStatementEditor
 * Used by admin/teacher when creating or editing a financial_statement question.
 * The teacher defines the CORRECT answer structure (marking scheme).
 *
 * Props:
 *   subtype        – "balance_sheet" | "income_statement" | "trading_account" | "cash_flow" | "t_account" | "trial_balance"
 *   value          – current marking_scheme JSON (or null)
 *   onChange(json) – called whenever the structure changes
 *   currency       – default "Ksh"
 */

import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";

// ── helpers ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8);

function emptyRow() {
  return { id: uid(), label: "", amount: "" };
}

function initSchema(subtype, currency = "Ksh") {
  const base = { subtype, currency, title: "" };
  switch (subtype) {
    case "balance_sheet":
      return {
        ...base,
        left: {
          heading: "Liabilities",
          sections: [{ id: uid(), name: "", rows: [emptyRow()] }],
        },
        right: {
          heading: "Assets",
          sections: [{ id: uid(), name: "", rows: [emptyRow()] }],
        },
      };
    case "trading_account":
      return {
        ...base,
        left: {
          heading: "Dr",
          sections: [{ id: uid(), name: "", rows: [emptyRow()] }],
        },
        right: {
          heading: "Cr",
          sections: [{ id: uid(), name: "", rows: [emptyRow()] }],
        },
      };
    case "t_account":
      return {
        ...base,
        accountName: "",
        left: { heading: "Dr (Debit)", rows: [emptyRow()] },
        right: { heading: "Cr (Credit)", rows: [emptyRow()] },
      };
    case "income_statement":
      return {
        ...base,
        sections: [
          {
            id: uid(),
            name: "Revenue",
            subtotalLabel: "Total Revenue",
            rows: [emptyRow()],
          },
          {
            id: uid(),
            name: "Expenses",
            subtotalLabel: "Total Expenses",
            rows: [emptyRow()],
          },
        ],
        resultLabel: "Net Profit / (Loss)",
      };
    case "cash_flow":
      return {
        ...base,
        openingBalance: "",
        sections: [
          {
            id: uid(),
            name: "Operating Activities",
            subtotalLabel: "Net Cash from Operating",
            rows: [emptyRow()],
          },
          {
            id: uid(),
            name: "Investing Activities",
            subtotalLabel: "Net Cash from Investing",
            rows: [emptyRow()],
          },
          {
            id: uid(),
            name: "Financing Activities",
            subtotalLabel: "Net Cash from Financing",
            rows: [emptyRow()],
          },
        ],
        closingBalanceLabel: "Closing Cash Balance",
      };
    case "trial_balance":
      return {
        ...base,
        rows: [{ id: uid(), account: "", debit: "", credit: "" }],
      };
    default:
      return base;
  }
}

// ── shared row editors ───────────────────────────────────────────────────────
function AmountRow({ row, onChange, onDelete, currency }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
      <input
        type="text"
        placeholder="Item name…"
        value={row.label}
        onChange={(e) => onChange({ ...row, label: e.target.value })}
        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400"
      />
      <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-gray-50 w-32 shrink-0">
        <span className="text-gray-400 text-xs">{currency}</span>
        <input
          type="number"
          placeholder="0"
          value={row.amount}
          onChange={(e) => onChange({ ...row, amount: e.target.value })}
          className="w-full bg-transparent focus:outline-none text-right text-sm"
        />
      </div>
      <button
        onClick={onDelete}
        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function TrialRow({ row, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
      <input
        type="text"
        placeholder="Account name…"
        value={row.account}
        onChange={(e) => onChange({ ...row, account: e.target.value })}
        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400"
      />
      <input
        type="number"
        placeholder="Debit"
        value={row.debit}
        onChange={(e) => onChange({ ...row, debit: e.target.value })}
        className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400 text-right"
      />
      <input
        type="number"
        placeholder="Credit"
        value={row.credit}
        onChange={(e) => onChange({ ...row, credit: e.target.value })}
        className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400 text-right"
      />
      <button
        onClick={onDelete}
        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── sub-components per type ──────────────────────────────────────────────────

function TwoSidePanel({
  side,
  sideKey,
  schema,
  onChange,
  currency,
  hasSections,
}) {
  const update = (newSide) => onChange({ ...schema, [sideKey]: newSide });

  if (hasSections) {
    // balance_sheet / trading_account: each side has named sections
    const addSection = () =>
      update({
        ...side,
        sections: [
          ...side.sections,
          { id: uid(), name: "", rows: [emptyRow()] },
        ],
      });

    const updateSection = (si, newSec) => {
      const secs = side.sections.map((s, i) => (i === si ? newSec : s));
      update({ ...side, sections: secs });
    };
    const removeSection = (si) =>
      update({ ...side, sections: side.sections.filter((_, i) => i !== si) });

    return (
      <div className="flex-1 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <input
            type="text"
            value={side.heading}
            onChange={(e) => update({ ...side, heading: e.target.value })}
            className="font-bold text-sm border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 py-0.5 w-auto"
          />
        </div>
        {side.sections.map((sec, si) => (
          <div key={sec.id} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder="Section heading (optional)…"
                value={sec.name}
                onChange={(e) =>
                  updateSection(si, { ...sec, name: e.target.value })
                }
                className="text-xs font-semibold text-gray-500 uppercase border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 py-0.5 flex-1 tracking-wide"
              />
              {side.sections.length > 1 && (
                <button
                  onClick={() => removeSection(si)}
                  className="text-red-300 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            {sec.rows.map((row, ri) => (
              <AmountRow
                key={row.id}
                row={row}
                currency={currency}
                onChange={(r) =>
                  updateSection(si, {
                    ...sec,
                    rows: sec.rows.map((x, i) => (i === ri ? r : x)),
                  })
                }
                onDelete={() =>
                  updateSection(si, {
                    ...sec,
                    rows: sec.rows.filter((_, i) => i !== ri),
                  })
                }
              />
            ))}
            <button
              onClick={() =>
                updateSection(si, { ...sec, rows: [...sec.rows, emptyRow()] })
              }
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 mb-1"
            >
              <Plus className="w-3 h-3" /> Add row
            </button>
          </div>
        ))}
        <button
          onClick={addSection}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2 border border-dashed border-indigo-300 rounded-lg px-3 py-1.5 w-full justify-center"
        >
          <Plus className="w-3 h-3" /> Add section
        </button>
      </div>
    );
  }

  // t_account: single flat list of rows
  return (
    <div className="flex-1 border border-gray-200 rounded-xl p-4">
      <input
        type="text"
        value={side.heading}
        onChange={(e) => update({ ...side, heading: e.target.value })}
        className="font-bold text-sm border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 py-0.5 mb-3 block"
      />
      {side.rows.map((row, ri) => (
        <AmountRow
          key={row.id}
          row={row}
          currency={currency}
          onChange={(r) =>
            update({
              ...side,
              rows: side.rows.map((x, i) => (i === ri ? r : x)),
            })
          }
          onDelete={() =>
            update({ ...side, rows: side.rows.filter((_, i) => i !== ri) })
          }
        />
      ))}
      <button
        onClick={() => update({ ...side, rows: [...side.rows, emptyRow()] })}
        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
      >
        <Plus className="w-3 h-3" /> Add row
      </button>
    </div>
  );
}

// ── main editor ───────────────────────────────────────────────────────────────
export default function FinancialStatementEditor({
  subtype,
  value,
  onChange,
  currency = "Ksh",
}) {
  const [storedSchema, setStoredSchema] = useState(() => {
    if (value && typeof value === "object" && value.subtype === subtype)
      return value;
    return initSchema(subtype, currency);
  });

  // Always render a schema that MATCHES the current subtype. On the render that
  // fires right after subtype changes (before the effect re-inits state), the
  // stored schema still has the old shape — reading e.g. schema.left.sections
  // on it would crash. Deriving here keeps the UI fire-proof.
  const schema =
    storedSchema && storedSchema.subtype === subtype
      ? storedSchema
      : initSchema(subtype, currency);

  // When subtype changes externally, re-init state + notify parent.
  useEffect(() => {
    if (!value || value.subtype !== subtype) {
      const fresh = initSchema(subtype, currency);
      setStoredSchema(fresh);
      onChange(fresh);
    }
  }, [subtype]); // eslint-disable-line

  const update = (next) => {
    setStoredSchema(next);
    onChange(next);
  };

  const inputCls =
    "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 w-full";

  // ── Balance Sheet / Trading Account ────────────────────────────────────────
  if (subtype === "balance_sheet" || subtype === "trading_account") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Statement Title
            </label>
            <input
              type="text"
              className={inputCls}
              value={schema.title}
              placeholder={
                subtype === "balance_sheet"
                  ? "e.g. PEMBE TATU TRADERS – Balance Sheet"
                  : "e.g. Trading Account for year ended…"
              }
              onChange={(e) => update({ ...schema, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Currency
            </label>
            <input
              type="text"
              className={inputCls}
              value={schema.currency}
              onChange={(e) => update({ ...schema, currency: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-4">
          <TwoSidePanel
            side={schema.left}
            sideKey="left"
            schema={schema}
            onChange={update}
            currency={schema.currency}
            hasSections
          />
          <TwoSidePanel
            side={schema.right}
            sideKey="right"
            schema={schema}
            onChange={update}
            currency={schema.currency}
            hasSections
          />
        </div>
      </div>
    );
  }

  // ── T-Account ──────────────────────────────────────────────────────────────
  if (subtype === "t_account") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Account Name
            </label>
            <input
              type="text"
              className={inputCls}
              value={schema.accountName || ""}
              placeholder="e.g. Cash Account"
              onChange={(e) =>
                update({ ...schema, accountName: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Currency
            </label>
            <input
              type="text"
              className={inputCls}
              value={schema.currency}
              onChange={(e) => update({ ...schema, currency: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-4">
          <TwoSidePanel
            side={schema.left}
            sideKey="left"
            schema={schema}
            onChange={update}
            currency={schema.currency}
            hasSections={false}
          />
          <TwoSidePanel
            side={schema.right}
            sideKey="right"
            schema={schema}
            onChange={update}
            currency={schema.currency}
            hasSections={false}
          />
        </div>
      </div>
    );
  }

  // ── Income Statement / Cash Flow ───────────────────────────────────────────
  if (subtype === "income_statement" || subtype === "cash_flow") {
    const addSection = () =>
      update({
        ...schema,
        sections: [
          ...schema.sections,
          {
            id: uid(),
            name: "",
            subtotalLabel: "Subtotal",
            rows: [emptyRow()],
          },
        ],
      });

    const updateSection = (si, newSec) =>
      update({
        ...schema,
        sections: schema.sections.map((s, i) => (i === si ? newSec : s)),
      });

    const removeSection = (si) =>
      update({
        ...schema,
        sections: schema.sections.filter((_, i) => i !== si),
      });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Statement Title
            </label>
            <input
              type="text"
              className={inputCls}
              value={schema.title}
              placeholder={
                subtype === "income_statement"
                  ? "e.g. Income Statement for year ended 31/12/?"
                  : "e.g. Cash Flow Statement"
              }
              onChange={(e) => update({ ...schema, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Currency
            </label>
            <input
              type="text"
              className={inputCls}
              value={schema.currency}
              onChange={(e) => update({ ...schema, currency: e.target.value })}
            />
          </div>
        </div>
        {subtype === "cash_flow" && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-40 shrink-0">
              Opening Cash Balance
            </span>
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white w-36">
              <span className="text-gray-400 text-xs">{schema.currency}</span>
              <input
                type="number"
                value={schema.openingBalance || ""}
                placeholder="0"
                onChange={(e) =>
                  update({ ...schema, openingBalance: e.target.value })
                }
                className="w-full bg-transparent focus:outline-none text-right text-sm"
              />
            </div>
          </div>
        )}
        <div className="space-y-4">
          {schema.sections.map((sec, si) => (
            <div key={sec.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Section name…"
                  value={sec.name}
                  onChange={(e) =>
                    updateSection(si, { ...sec, name: e.target.value })
                  }
                  className="font-semibold text-sm border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 py-0.5 flex-1"
                />
                <input
                  type="text"
                  placeholder="Subtotal label…"
                  value={sec.subtotalLabel}
                  onChange={(e) =>
                    updateSection(si, { ...sec, subtotalLabel: e.target.value })
                  }
                  className="text-xs text-gray-500 border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 py-0.5 w-44"
                />
                {schema.sections.length > 1 && (
                  <button
                    onClick={() => removeSection(si)}
                    className="text-red-300 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {sec.rows.map((row, ri) => (
                <AmountRow
                  key={row.id}
                  row={row}
                  currency={schema.currency}
                  onChange={(r) =>
                    updateSection(si, {
                      ...sec,
                      rows: sec.rows.map((x, i) => (i === ri ? r : x)),
                    })
                  }
                  onDelete={() =>
                    updateSection(si, {
                      ...sec,
                      rows: sec.rows.filter((_, i) => i !== ri),
                    })
                  }
                />
              ))}
              <button
                onClick={() =>
                  updateSection(si, { ...sec, rows: [...sec.rows, emptyRow()] })
                }
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
              >
                <Plus className="w-3 h-3" /> Add row
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addSection}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 border border-dashed border-indigo-300 rounded-lg px-3 py-1.5"
          >
            <Plus className="w-3 h-3" /> Add section
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {subtype === "cash_flow"
                ? "Closing Balance Label"
                : "Result Label"}
            </label>
            <input
              type="text"
              value={
                subtype === "cash_flow"
                  ? schema.closingBalanceLabel || ""
                  : schema.resultLabel || ""
              }
              placeholder={
                subtype === "cash_flow"
                  ? "Closing Cash Balance"
                  : "Net Profit / (Loss)"
              }
              onChange={(e) =>
                update(
                  subtype === "cash_flow"
                    ? { ...schema, closingBalanceLabel: e.target.value }
                    : { ...schema, resultLabel: e.target.value },
                )
              }
              className="border border-gray-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:border-blue-400 w-48"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Trial Balance ──────────────────────────────────────────────────────────
  if (subtype === "trial_balance") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Statement Title
            </label>
            <input
              type="text"
              className={inputCls}
              value={schema.title}
              placeholder="e.g. Trial Balance as at 31/12/?"
              onChange={(e) => update({ ...schema, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Currency
            </label>
            <input
              type="text"
              className={inputCls}
              value={schema.currency}
              onChange={(e) => update({ ...schema, currency: e.target.value })}
            />
          </div>
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_96px_96px_32px] gap-2 px-4 py-2 bg-gray-50 border-b">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Account
            </span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
              Debit
            </span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
              Credit
            </span>
            <span />
          </div>
          <div className="p-3 space-y-1">
            {schema.rows.map((row, ri) => (
              <TrialRow
                key={row.id}
                row={row}
                onChange={(r) =>
                  update({
                    ...schema,
                    rows: schema.rows.map((x, i) => (i === ri ? r : x)),
                  })
                }
                onDelete={() =>
                  update({
                    ...schema,
                    rows: schema.rows.filter((_, i) => i !== ri),
                  })
                }
              />
            ))}
          </div>
          <div className="px-4 pb-3">
            <button
              onClick={() =>
                update({
                  ...schema,
                  rows: [
                    ...schema.rows,
                    { id: uid(), account: "", debit: "", credit: "" },
                  ],
                })
              }
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-gray-500">Select a statement type above.</p>
  );
}
