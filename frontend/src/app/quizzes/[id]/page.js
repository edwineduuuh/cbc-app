"use client";
import { fetchWithAuth } from "@/lib/api";
import { use } from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Nunito } from "next/font/google";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Flag,
  Send,
  Loader2,
  X,
  Menu,
} from "lucide-react";
import SimpleMathInput from "@/components/SimpleMathInput";
import ChemTextBar from "@/components/ChemTextBar";
import PhysicsFormulaBar from "@/components/PhysicsFormulaBar";
import FinancialStatementInput from "@/components/FinancialStatementInput";
import katex from "katex";
import "katex/dist/katex.min.css";
import { renderMathHtml, tidyFeedback } from "@/lib/math";
import AnswerOption, { optionTex, correctLetterOf } from "@/components/quiz/AnswerOption";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

/* Serve Cloudinary images straight from its CDN with auto format/quality and a
   width cap - far faster than proxying through the Next.js image optimizer. */
function cldOptimize(url, width = 900) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";
function _patchKatexSvg(html) {
  // KaTeX 0.16+ draws \sqrt with SVGs. Tailwind v4 sets svg{display:block}
  // globally which hides them. We must inject display:inline INTO the existing
  // style attribute - adding a second style attribute is invalid and browsers
  // ignore it, so we merge instead.
  return html.replace(/<svg([^>]*)>/g, (_, attrs) => {
    if (attrs.includes('style="')) {
      return "<svg" + attrs.replace('style="', 'style="display:inline;') + ">";
    }
    return '<svg style="display:inline;"' + attrs + ">";
  });
}
function _katex(expr, display) {
  try {
    return _patchKatexSvg(
      katex.renderToString(expr.trim(), {
        displayMode: display,
        throwOnError: false,
      }),
    );
  } catch {
    return expr;
  }
}
function _mdTableToHtml(text) {
  const tableRe = /(\|.+\|\s*\n\|[-| :]+\|\s*\n(?:\|.+\|\s*\n?)*)/g;
  return text.replace(tableRe, (block) => {
    const rows = block.trim().split("\n").map(r => r.trim());
    const header = rows[0].split("|").filter((_, i, a) => i > 0 && i < a.length - 1)
      .map(c => `<th style="padding:6px 12px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text);font-weight:700;text-align:left;font-size:13px">${c.trim()}</th>`).join("");
    const body = rows.slice(2).map(r => {
      const cells = r.split("|").filter((_, i, a) => i > 0 && i < a.length - 1)
        .map(c => `<td style="padding:6px 12px;border:1px solid var(--border);color:var(--text);font-size:13px">${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<table style="border-collapse:collapse;margin:10px 0;width:auto;max-width:100%"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
  });
}

function renderMath(text) {
  if (!text) return "";
  return renderMathHtml(_mdTableToHtml(text));
}

// Renders text preserving newlines as <br/> and processing math
function renderText(text) {
  if (!text) return "";
  return renderMath(text).replace(/\n/g, "<br/>");
}

function renderTextWithBlanks(text, answeredBlanks = {}) {
  if (!text) return "";
  let result = renderMath(text);
  result = result.replace(/__(\d+)__/g, (_, numStr) => {
    const num = parseInt(numStr);
    const answer = answeredBlanks[num];
    return answer
      ? `<span style="display:inline-block;min-width:80px;border-bottom:2px solid #2563eb;background:#eff6ff;color:#1d4ed8;font-weight:700;padding:0 6px 2px;border-radius:4px;margin:0 2px;">${answer}</span>`
      : `<span style="display:inline-block;min-width:80px;border-bottom:2px solid #8892a4;color:#6b7280;padding:0 6px 2px;margin:0 2px;">_${num}_</span>`;
  });
  return result.replace(/\n/g, "<br/>");
}
// ─── Timer Hook ───────────────────────────────────────────────────────────────
function useTimer(totalSeconds, onExpire) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);
  const pct = (remaining / totalSeconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = pct < 20;
  return {
    display: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
    pct,
    isUrgent,
    remaining,
  };
}

// ─── Passage Content Formatter ────────────────────────────────────────────────
function PassageContent({
  type,
  content,
  activeBlank = null,
  answeredBlanks = {},
}) {
  const t = (type || "").toLowerCase();

  // Renders text and replaces __N__ with interactive blank spans
  const renderWithBlanks = (text) => {
    const parts = text.split(/(__\d+__)/g);
    return parts.map((part, i) => {
      const match = part.match(/^__(\d+)__$/);
      if (!match)
        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: renderMath(part) }}
          />
        );
      const num = parseInt(match[1]);
      const isActive = activeBlank === num;
      const answer = answeredBlanks[num];
      return (
        <span
          key={i}
          id={`blank-${num}`}
          style={{
            display: "inline-block",
            minWidth: 80,
            borderBottom: `2px solid ${isActive ? "#20B8A6" : answer ? "#7FB0EA" : "#8892a4"}`,
            background: isActive
              ? "#e8f4ff"
              : answer
                ? "rgba(77,141,218,0.10)"
                : "transparent",
            color: isActive ? "#20B8A6" : answer ? "#7FB0EA" : "var(--text)",
            fontWeight: answer ? 700 : 400,
            padding: "0 6px 2px",
            borderRadius: 4,
            margin: "0 2px",
            transition: "all 0.3s ease",
            boxShadow: isActive ? "0 0 0 3px #bdd7f5" : "none",
            fontSize: 15,
          }}
        >
          {answer ?? `_${num}_`}
        </span>
      );
    });
  };

  if (t === "poem") {
    return (
      <div style={{ fontStyle: "italic", color: "var(--text)" }}>
        {content.split("\n").map((line, i) => (
          <div
            key={i}
            style={{
              lineHeight: 2.2,
              paddingLeft: line.startsWith("  ") ? 24 : 0,
              minHeight: line.trim() === "" ? 20 : "auto",
              fontSize: 15,
            }}
            dangerouslySetInnerHTML={{
              __html: line.trim() === "" ? "\u00A0" : renderMath(line),
            }}
          />
        ))}
      </div>
    );
  }

  if (t === "dialogue") {
    const lines = content.split("\n").filter((l) => l.trim() !== "");
    const speakerColors = [
      "#20B8A6",
      "#1d8f57",
      "#c0334a",
      "#d4900a",
      "#764ba2",
      "#0ea5c9",
      "#e05d20",
      "#2d6a4f",
    ];
    const speakerMap = {};
    let colorIdx = 0;
    const getColor = (speaker) => {
      const key = speaker.trim().toLowerCase();
      if (!speakerMap[key]) {
        speakerMap[key] = speakerColors[colorIdx % speakerColors.length];
        colorIdx++;
      }
      return speakerMap[key];
    };
    return (
      <div style={{ color: "var(--text)" }}>
        {lines.map((line, i) => {
          const match = line.match(/^([^:]{1,40}):\s*(.+)/);
          if (match) {
            const speaker = match[1].trim();
            const speech = match[2].trim();
            const color = getColor(speaker);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 12,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color,
                    fontSize: 11,
                    minWidth: 70,
                    maxWidth: 80,
                    flexShrink: 0,
                    paddingTop: 3,
                    fontFamily: "var(--font-sans)",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    lineHeight: 1.3,
                    opacity: 0.85,
                  }}
                >
                  {speaker}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    color: "var(--text)",
                    flex: 1,
                    lineHeight: 1.75,
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMath(speech) }}
                />
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                fontStyle: "italic",
                marginBottom: 10,
                paddingLeft: 8,
                borderLeft: "3px solid var(--border)",
              }}
              dangerouslySetInnerHTML={{ __html: renderMath(line) }}
            />
          );
        })}
      </div>
    );
  }

  if (t === "narrative" || t === "prose" || t === "story") {
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());
    return (
      <div>
        {paragraphs.map((para, i) => (
          <p
            key={i}
            style={{
              fontSize: 15,
              lineHeight: 1.9,
              color: "var(--text)",
              marginBottom: 14,
              textIndent: "1.4em",
            }}
          >
            {renderWithBlanks(para.trim())}
          </p>
        ))}
      </div>
    );
  }

  // Default - handles blanks too
  return (
    <p
      style={{
        fontSize: 15,
        lineHeight: 1.9,
        color: "var(--text)",
        whiteSpace: "pre-line",
      }}
    >
      {renderWithBlanks(content)}
    </p>
  );
}

// ─── Math Input ───────────────────────────────────────────────────────────────
function MathInput({ value, onChange }) {
  const mfRef = useRef(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    import("mathlive").then((ML) => {
      try {
        if (ML.default)
          ML.default.fontsDirectory =
            "https://unpkg.com/mathlive@0.109.0/dist/fonts/";
        if (window.MathfieldElement)
          window.MathfieldElement.fontsDirectory =
            "https://unpkg.com/mathlive@0.109.0/dist/fonts/";
      } catch (err) {
        console.error("MathLive init failed:", err);
      }
    });
  }, []);

  useEffect(() => {
    const el = mfRef.current;
    if (!el || value === undefined) return;
    if (el.value !== value) el.value = value;
  }, [value]);

  const readValue = useCallback(() => {
    const el = mfRef.current;
    if (!el) return;
    const currentValue = el.value?.trim() || "";
    if (currentValue && currentValue !== "\\placeholder{}")
      onChange(currentValue);
  }, [onChange]);

  useEffect(() => {
    const el = mfRef.current;
    if (!el) return;
    const events = ["input", "change", "blur", "keyup", "keydown"];
    events.forEach((event) => el.addEventListener(event, readValue));
    const timeout = setTimeout(readValue, 300);
    return () => {
      events.forEach((event) => el.removeEventListener(event, readValue));
      clearTimeout(timeout);
    };
  }, [readValue]);

  return (
    <div
      style={{
        border: "2px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--bg-card)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        minHeight: "68px",
      }}
    >
      <math-field
        ref={mfRef}
        style={{
          width: "100%",
          padding: "16px 18px",
          fontSize: "18px",
          display: "block",
          minHeight: "68px",
        }}
        virtual-keyboard-mode="onfocus"
        fonts-directory="https://unpkg.com/mathlive@0.109.0/dist/fonts/"
      />
    </div>
  );
}

// ─── MCQ Option ───────────────────────────────────────────────────────────────
function MCQOption({ letter, text, imageUrl, selected, onClick, mark, disabled }) {
  return (
    <AnswerOption letter={letter} html={renderMath(optionTex(text))} imageUrl={imageUrl}
                  selected={selected} mark={mark} onClick={onClick} disabled={disabled} />
  );
}

// ─── Part Answer Block - full Chemistry + Physics formula bars for multipart ──

function PartAnswerBlock({ value, onChange, isKiswahili }) {
  const partRef = useRef(null);
  return (
    <div>
      <ChemTextBar textareaRef={partRef} value={value} onChange={onChange} />
      <PhysicsFormulaBar
        textareaRef={partRef}
        value={value}
        onChange={onChange}
      />
      <div style={{ position: "relative" }}>
        <textarea
          ref={partRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={
            isKiswahili
              ? "Andika jibu lako hapa\u2026"
              : "Write your answer here\u2026"
          }
          style={{
            width: "100%",
            border: "2px solid var(--border)",
            borderRadius: 14,
            padding: "12px 16px",
            fontSize: 15,
            color: "var(--text)",
            background: "var(--bg-card)",
            fontFamily: "var(--font-sans)",
            lineHeight: 1.7,
            resize: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#20B8A6")}
          onBlur={(e) => (e.target.style.borderColor = "#e8eaf0")}
        />
        <span
          style={{
            position: "absolute",
            bottom: 10,
            right: 12,
            fontSize: 11,
            color: "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          {isKiswahili ? `herufi ${value.length}` : `${value.length} chars`}
        </span>
      </div>
    </div>
  );
}

// ─── Table Questions ──────────────────────────────────────────────────────────

function getMatchingConfig(tableData) {
  // Returns { ec, ic, getAnswer } if this is a matching table, else null.
  const rows = tableData?.rows || [];
  if (rows.length < 2 || rows[0]?.length !== 2) return null;
  const dataRows = rows.slice(1);

  const editableCols = new Set();
  dataRows.forEach((row) =>
    row.forEach((cell, c) => {
      if (cell.e) editableCols.add(c);
    }),
  );

  // Learners get the answers removed by the server: the chips arrive as a
  // shuffled `chip_pool` and the answer column is blank, so which chip
  // belongs to which row is not in the page. See redact_table() in
  // questions/serializers.py.
  if (Array.isArray(tableData.chip_pool) && editableCols.size === 1) {
    const ec = [...editableCols][0];
    return {
      ec,
      ic: ec === 0 ? 1 : 0,
      getAnswer: () => "",
      pool: tableData.chip_pool,
      multi: !!tableData.chip_multi,
    };
  }

  if (editableCols.size === 1) {
    const ec = [...editableCols][0];
    const ic = ec === 0 ? 1 : 0;
    // Accept cells where .a is set; also fall back to .v so teachers don't
    // have to separately fill the "Correct answer" field.
    if (
      dataRows.every((row) => row[ec]?.a?.trim() || row[ec]?.v?.trim()) &&
      dataRows.every((row) => row[ic]?.v?.trim())
    ) {
      return {
        ec,
        ic,
        getAnswer: (row) => row[ec].a?.trim() || row[ec].v?.trim(),
      };
    }
  }

  // Fallback: both columns fully static (.e false) but both have .v values -
  // teacher filled the table as a reference and expects matching behaviour.
  // Treat column index 1 as the answer pool.
  if (editableCols.size === 0) {
    if (
      dataRows.every((row) => row[0]?.v?.trim()) &&
      dataRows.every((row) => row[1]?.v?.trim())
    ) {
      return { ec: 1, ic: 0, getAnswer: (row) => row[1].v?.trim() };
    }
  }

  return null;
}

function isMatchingTable(tableData) {
  return getMatchingConfig(tableData) !== null;
}

function MatchingTable({ tableData, answer, onAnswer }) {
  const rows = tableData.rows;
  const headers = rows[0];
  const dataRows = rows.slice(1);
  const cfg = getMatchingConfig(tableData);
  const { ec, ic, getAnswer } = cfg;
  const serverPool = cfg.pool; // present for learners (answers redacted)

  // A cell's answer may be a COMMA-SEPARATED set of chips. Multi-mode (several
  // chips per cell + reuse) kicks in when any cell lists >1 chip, or an answer
  // repeats across rows. Otherwise it stays the classic 1-to-1, used-once flow.
  const rowTokens = (row) =>
    getAnswer(row).split(",").map((s) => s.trim()).filter(Boolean);
  const allTokens = serverPool || dataRows.flatMap(rowTokens);
  const distinctTokens = [...new Set(allTokens)];
  const multiMode = serverPool
    ? cfg.multi
    : dataRows.some((row) => rowTokens(row).length > 1) ||
      allTokens.length !== distinctTokens.length;

  // Shuffle the chip pool once on mount.
  const [pool] = useState(() => {
    const items = serverPool
      ? distinctTokens.map((text, i) => ({ key: `t${i}`, text }))
      : multiMode
      ? distinctTokens.map((text, i) => ({ key: `t${i}`, text }))
      : dataRows.map((row, ri) => ({ key: `${ri + 1}_${ec}`, text: getAnswer(row) }));
    return items.sort(() => Math.random() - 0.5);
  });
  const [selected, setSelected] = useState(null);

  // ans[key] is ALWAYS an array of placed chip texts (back-compat: coerce old
  // single-value answers to arrays).
  const rawAns = typeof answer === "object" && answer ? answer : {};
  const ans = {};
  for (const k in rawAns) {
    ans[k] = Array.isArray(rawAns[k]) ? rawAns[k] : rawAns[k] ? [rawAns[k]] : [];
  }
  const placedAt = (key) => ans[key] || [];

  const placedTexts = new Set(Object.values(ans).flat());
  // Multi-mode chips are reusable, so the pool always stays available.
  const available = multiMode ? pool : pool.filter((p) => !placedTexts.has(p.text));

  const handleZone = (ri) => {
    const key = `${ri + 1}_${ec}`;
    if (selected) {
      const item = pool.find((p) => p.key === selected);
      if (!item) return;
      const cur = placedAt(key);
      if (multiMode) {
        if (!cur.includes(item.text)) onAnswer({ ...ans, [key]: [...cur, item.text] });
      } else {
        onAnswer({ ...ans, [key]: [item.text] }); // replace (1-to-1)
      }
      setSelected(null);
    } else if (!multiMode && placedAt(key).length) {
      // classic: tap a filled zone (no selection) to clear it
      const next = { ...ans };
      delete next[key];
      onAnswer(next);
    }
  };

  const removeChip = (key, text, e) => {
    e.stopPropagation();
    const next = { ...ans, [key]: placedAt(key).filter((t) => t !== text) };
    if (next[key].length === 0) delete next[key];
    onAnswer(next);
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      {/* Instructions */}
      <p
        style={{
          fontSize: 12,
          color: "#20B8A6",
          fontWeight: 700,
          marginBottom: 12,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {selected
          ? "▶ Now tap a row to place it"
          : multiMode
            ? "Tap an answer, then a row - you can place several per row and reuse the same answer"
            : "Step 1 - tap an answer below · Step 2 - tap its match in the table"}
      </p>

      {/* Table */}
      <div
        style={{
          overflowX: "auto",
          marginBottom: 18,
          borderRadius: 14,
          border: "1.5px solid var(--border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 340 }}
        >
          <thead>
            <tr>
              {headers.map((cell, c) => (
                <th
                  key={c}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)",
                    background: "var(--bg)",
                    borderBottom: "2px solid var(--border)",
                    borderRight:
                      c < headers.length - 1 ? "1.5px solid var(--border)" : "none",
                  }}
                >
                  {cell.v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => {
              const key = `${ri + 1}_${ec}`;
              const placed = placedAt(key);
              const isTarget = selected && (multiMode || placed.length === 0);
              return (
                <tr
                  key={ri}
                  style={{ background: ri % 2 === 0 ? "var(--bg-card)" : "var(--bg-secondary)" }}
                >
                  {/* Column A item */}
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text)",
                      borderBottom:
                        ri < dataRows.length - 1 ? "1px solid var(--border)" : "none",
                      borderRight: "1.5px solid var(--border)",
                    }}
                  >
                    {row[ic].v}
                  </td>
                  {/* Drop zone */}
                  <td
                    onClick={() => handleZone(ri)}
                    style={{
                      padding: "10px 14px",
                      cursor: isTarget || placed.length ? "pointer" : "default",
                      borderBottom:
                        ri < dataRows.length - 1 ? "1px solid var(--border)" : "none",
                      background: isTarget
                        ? "rgba(77,141,218,0.10)"
                        : placed.length
                          ? "var(--bg-secondary)"
                          : "transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    {placed.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                        {placed.map((txt, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "rgba(60,203,139,0.14)",
                              borderRadius: 8,
                              padding: "4px 8px",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#6EE7A8",
                            }}
                          >
                            {txt}
                            <button
                              onClick={(e) => removeChip(key, txt, e)}
                              style={{
                                background: "rgba(240,113,120,0.14)",
                                border: "none",
                                borderRadius: 6,
                                padding: "1px 6px",
                                fontSize: 11,
                                color: "#F07178",
                                cursor: "pointer",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        {multiMode && isTarget && (
                          <span style={{ fontSize: 12, color: "#20B8A6", fontWeight: 700 }}>+ add</span>
                        )}
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: 13,
                          color: isTarget ? "#20B8A6" : "var(--text-muted)",
                          fontWeight: isTarget ? 700 : 400,
                          border: `2px dashed ${isTarget ? "#20B8A6" : "var(--border)"}`,
                          borderRadius: 8,
                          padding: "6px 12px",
                          display: "block",
                          transition: "all 0.15s",
                        }}
                      >
                        {isTarget ? "Tap to place here →" : "- empty -"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Answer pool */}
      {available.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Answer choices
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {available.map((item) => {
              const isSel = selected === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelected(isSel ? null : item.key)}
                  style={{
                    padding: "9px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 10,
                    border: `2px solid ${isSel ? "#20B8A6" : "var(--border)"}`,
                    background: isSel ? "#0E7490" : "var(--bg-card)",
                    color: isSel ? "#fff" : "var(--text)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    boxShadow: isSel
                      ? "0 2px 8px rgba(26,111,196,0.25)"
                      : "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  {item.text}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!multiMode && available.length === 0 && (
        <p
          style={{
            fontSize: 13,
            color: "#3CCB8B",
            fontWeight: 700,
            textAlign: "center",
            padding: "8px 0",
          }}
        >
          ✓ All answers placed - review and submit
        </p>
      )}
    </div>
  );
}

function FillInTable({ tableData, answer, onAnswer }) {
  const rows = tableData.rows;
  const ans = typeof answer === "object" && answer ? answer : {};

  const update = (r, c, val) => onAnswer({ ...ans, [`${r}_${c}`]: val });

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: 14,
        border: "1.5px solid var(--border)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      }}
    >
      <table
        style={{ width: "100%", borderCollapse: "collapse", minWidth: 300 }}
      >
        <tbody>
          {rows.map((row, r) => (
            <tr
              key={r}
              style={{
                background:
                  r === 0 ? "var(--bg-secondary)" : r % 2 === 1 ? "var(--bg-card)" : "var(--bg-secondary)",
              }}
            >
              {row.map((cell, c) => (
                <td
                  key={c}
                  style={{
                    padding: cell.e ? "8px 10px" : "12px 16px",
                    borderBottom:
                      r < rows.length - 1 ? "1px solid var(--border)" : "none",
                    borderRight:
                      c < row.length - 1 ? "1.5px solid var(--border)" : "none",
                    fontSize: 14,
                    fontWeight: r === 0 ? 700 : 400,
                    color: "var(--text)",
                    background: cell.e ? "rgba(77,141,218,0.10)" : "inherit",
                    minWidth: 100,
                  }}
                >
                  {cell.e ? (
                    <input
                      type="text"
                      value={ans[`${r}_${c}`] || ""}
                      onChange={(e) => update(r, c, e.target.value)}
                      placeholder="Your answer…"
                      style={{
                        width: "100%",
                        border: "none",
                        background: "transparent",
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#1e3a5f",
                        outline: "none",
                        fontFamily: "var(--font-sans)",
                      }}
                    />
                  ) : (
                    cell.v
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Question Nav ─────────────────────────────────────────────────────────────
function QuestionNav({ questions, answers, currentIdx, onJump, show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="question-nav"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          style={{
            position: "fixed",
            top: 80,
            right: 12,
            zIndex: 25,
            display: "flex",
            flexDirection: "column",
            gap: 5,
            maxHeight: "calc(100vh - 100px)",
            overflowY: "auto",
            overflowX: "visible",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            padding: "6px 4px",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(6px)",
            borderRadius: 14,
            boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
            border: "1px solid var(--border)",
          }}
        >
          {questions.map((_, i) => {
            const answered = answers[i] !== undefined && answers[i] !== "";
            const current = i === currentIdx;
            return (
              <button
                key={i}
                onClick={() => onJump(i)}
                title={`Q${i + 1}`}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border: current
                    ? "2px solid #20B8A6"
                    : "2px solid transparent",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 12,
                  background: current
                    ? "#20B8A6"
                    : answered
                      ? "#d4edda"
                      : "var(--bg-secondary)",
                  color: current ? "#fff" : answered ? "#1a7a4a" : "var(--text-muted)",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-sans)",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Submit Modal ─────────────────────────────────────────────────────────────
const facts = [
  "💡 CBE focuses on skills and competency, not just memorization.",
  "📚 Regular practice improves retention by up to 80%.",
  "🧠 Taking quizzes is more effective than re-reading notes.",
  "⏱️ Short daily practice sessions beat long weekly cramming.",
  "Students who review mistakes improve faster than those who don't.",
];
const fact = facts[Math.floor(Math.random() * facts.length)];

function SubmitModal({ open, onConfirm, onCancel, unanswered, submitting }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(10,10,30,0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.93, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.93, y: 20 }}
            style={{
              background: "var(--bg-card)",
              borderRadius: 24,
              padding: 32,
              width: "100%",
              maxWidth: 400,
              boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "#e8f4ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <Send size={24} color="#20B8A6" />
            </div>
            <h3
              style={{
                fontSize: 22,
                fontWeight: 800,
                textAlign: "center",
                color: "var(--text)",
                marginBottom: 10,
                fontFamily: "var(--font-sans)",
              }}
            >
              Submit Quiz?
            </h3>
            {unanswered > 0 ? (
              <div
                style={{
                  background: "#fff7ed",
                  border: "1.5px solid #fb923c",
                  borderRadius: 12,
                  padding: "12px 16px",
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 15, fontWeight: 700, color: "#c2410c", marginBottom: 4 }}>
                  ⚠ {unanswered} question{unanswered !== 1 ? "s" : ""} not answered
                </p>
                <p style={{ fontSize: 13, color: "#9a3412", lineHeight: 1.5 }}>
                  Go back and attempt them - take a breath, stay calm, and do your best on each one. You will still see the correct answer in the feedback.
                </p>
              </div>
            ) : (
              <p
                style={{
                  fontSize: 14,
                  color: "#3CCB8B",
                  fontWeight: 600,
                  textAlign: "center",
                  marginBottom: 24,
                  fontFamily: "var(--font-sans)",
                }}
              >
                ✓ All questions answered. Ready to submit!
              </p>
            )}
            {submitting && (
              <div
                style={{
                  background: "#f0f6ff",
                  borderRadius: 12,
                  padding: "12px 16px",
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: "#20B8A6",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  We are marking your answers…
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{fact}</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "2px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--text)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Go Back
              </button>
              <button
                onClick={onConfirm}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background: "#0E7490",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={16}
                      style={{ animation: "spin 1s linear infinite" }}
                    />{" "}
                    Marking…
                  </>
                ) : (
                  "Submit Now"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────
function ResultsScreen({ result, quiz }) {
  const score = Math.round(result.score ?? 0);
  const passed = score >= (quiz?.passing_score ?? 75);
  const color = score >= 75 ? "#1d8f57" : score >= 50 ? "#d4900a" : "#c0334a";
  const circumference = 2 * Math.PI * 68;
  const feedback = result.detailed_feedback || {};
  const questionIds = Object.keys(feedback);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #f0f6ff 0%, #f9fff4 100%)",
        padding: "24px 16px 80px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <svg width={160} height={160} style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx={80}
              cy={80}
              r={68}
              fill="none"
              stroke="#e8eaf0"
              strokeWidth={10}
            />
            <motion.circle
              cx={80}
              cy={80}
              r={68}
              fill="none"
              stroke={color}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
              transition={{
                duration: 1.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.3,
              }}
            />
          </svg>
          <div
            style={{ position: "absolute", marginTop: 0, textAlign: "center" }}
          >
            <span
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: "var(--text)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {score}%
            </span>
            <p
              style={{
                fontSize: 12,
                color: passed ? "#1d8f57" : "#c0334a",
                fontWeight: 700,
              }}
            >
              {passed ? "PASSED ✓" : "TRY AGAIN"}
            </p>
          </div>
        </div>
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: 24,
            padding: 28,
            marginBottom: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
            border: "1px solid var(--border)",
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              textAlign: "center",
              color: "var(--text)",
              marginBottom: 20,
              fontFamily: "var(--font-sans)",
            }}
          >
            {passed ? "Well done!" : "📚 Keep going!"}
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Marks",
                value: `${result.total_marks_awarded ?? 0} / ${result.total_max_marks ?? 0}`,
              },
              {
                label: "Correct",
                value: `${result.correct_answers ?? "-"} questions`,
              },
              { label: "Questions", value: result.total_questions ?? "-" },
              { label: "Pass Mark", value: `${quiz?.passing_score ?? 75}%` },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: "var(--bg)",
                  borderRadius: 14,
                  padding: "14px 12px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/explore" style={{ flex: 1 }}>
              <button
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "2px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--text)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Browse Quizzes
              </button>
            </Link>
            <Link href="/register?reason=quota" style={{ flex: 1 }}>
              <button
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background: "#0E7490",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save My Results
              </button>
            </Link>
          </div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            color: "#fff",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 8,
              fontFamily: "var(--font-sans)",
            }}
          >
            Create a free account to unlock full feedback
          </h3>
          <p
            style={{
              fontSize: 13,
              opacity: 0.9,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            See exactly what you got wrong, clear explanations per question, study
            tips, and save your progress.
          </p>
          <Link href="/register?reason=quota">
            <button
              style={{
                background: "var(--bg-card)",
                color: "#764ba2",
                padding: "12px 28px",
                borderRadius: 12,
                border: "none",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Create Free Account →
            </button>
          </Link>
        </div>
        {quiz?.questions?.some(
          (q) =>
            q.question_type === "structured" || q.question_type === "essay",
        ) && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              background: "#f0f6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: 13,
              color: "var(--text)",
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
            <span>
              Your written answers are checked against model answers written by
              our educators. If you believe a grade is incorrect, contact us to
              request a human review.
            </span>
          </div>
        )}

        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "var(--text)",
            marginBottom: 16,
            fontFamily: "var(--font-sans)",
          }}
        >
          Question Breakdown
        </h2>
        {questionIds.map((qId, index) => {
          const item = feedback[qId];
          const question = quiz.questions.find((q) => q.id === qId);
          return (
            <div
              key={qId}
              style={{
                background: "var(--bg-card)",
                borderRadius: 16,
                padding: 20,
                marginBottom: 12,
                border: "1px solid var(--border)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: item.is_correct ? "#d4edda" : "rgba(240,113,120,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.is_correct ? (
                      <CheckCircle size={16} color="#1d8f57" />
                    ) : (
                      <span style={{ fontSize: 14 }}>✗</span>
                    )}
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--text)",
                      fontSize: 14,
                    }}
                  >
                    Question {index + 1}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: item.is_correct ? "#1d8f57" : "#c0334a",
                    background: item.is_correct ? "#d4edda" : "rgba(240,113,120,0.12)",
                    padding: "4px 10px",
                    borderRadius: 8,
                  }}
                >
                  {item.marks_awarded} / {item.max_marks} marks
                </span>
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text)",
                  marginBottom: 12,
                  lineHeight: 1.6,
                }}
                dangerouslySetInnerHTML={{
                  __html: renderMath(item.question_text),
                }}
              />
              <div
                style={{
                  background: "#f0f6ff",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 10,
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#20B8A6",
                    marginBottom: 4,
                  }}
                >
                  YOUR ANSWER
                </p>
                <p style={{ fontSize: 14, color: "#1e3a5f" }}>
                  {item.student_answer || "(No answer)"}
                </p>
              </div>
              <div
                style={{
                  position: "relative",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    filter: "blur(4px)",
                    background: "var(--bg)",
                    padding: "10px 14px",
                    userSelect: "none",
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text)",
                      marginBottom: 4,
                    }}
                  >
                    DETAILED FEEDBACK
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text)" }}>
                    Clear feedback explaining exactly what you missed and
                    how to improve.
                  </p>
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.7)",
                  }}
                >
                  <Link href="/register?reason=quota">
                    <button
                      style={{
                        background: "#0E7490",
                        color: "#fff",
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🔒 Unlock Free
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Working Panel ────────────────────────────────────────────────────────────
function WorkingPanel({ questionIdx, onWorkingCapture }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasWorking, setHasWorking] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setOpen(false);
      setMode(null);
      setHasWorking(false);
    }, 0);
    return () => clearTimeout(t);
  }, [questionIdx]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  };

  useEffect(() => {
    if (mode === "canvas") setTimeout(initCanvas, 50);
  }, [mode]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };
  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasWorking(true);
  };
  const stopDraw = (e) => {
    e.preventDefault();
    setIsDrawing(false);
    if (hasWorking) {
      const canvas = canvasRef.current;
      const base64 = canvas.toDataURL("image/png").split(",")[1];
      onWorkingCapture(base64);
    }
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasWorking(false);
    onWorkingCapture(null);
  };
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      onWorkingCapture(base64);
      setHasWorking(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!mode) setMode(isMobile ? "camera" : "canvas");
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderRadius: 10,
          border: "2px dashed #bdd7f5",
          background: hasWorking ? "#e8f4ff" : "var(--bg-secondary)",
          color: hasWorking ? "#20B8A6" : "var(--text-muted)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        ✏️ {hasWorking ? "Working saved ✓" : "Show your working (optional)"}
      </button>
      {open && (
        <div
          style={{
            marginTop: 12,
            background: "var(--bg-card)",
            borderRadius: 16,
            border: "2px solid var(--border)",
            padding: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["canvas", "camera"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  border: "2px solid " + (mode === m ? "#20B8A6" : "var(--border)"),
                  background: mode === m ? "#e8f4ff" : "var(--bg-card)",
                  color: mode === m ? "#20B8A6" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {m === "canvas" ? "✏️ Draw" : "📷 Photo"}
              </button>
            ))}
          </div>
          {mode === "canvas" && (
            <div>
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 10,
                  border: "1.5px solid var(--border)",
                  cursor: "crosshair",
                  touchAction: "none",
                  background: "var(--bg-card)",
                  display: "block",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <button
                  onClick={clearCanvas}
                  style={{
                    fontSize: 12,
                    color: "#c0334a",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  🗑 Clear
                </button>
              </div>
            </div>
          )}
          {mode === "camera" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                style={{ display: "none" }}
              />
              <button
                onClick={() => fileInputRef.current.click()}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  background: "#0E7490",
                  color: "#fff",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {hasWorking ? "📷 Retake Photo" : "📷 Take Photo / Upload"}
              </button>
              {hasWorking && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#1d8f57",
                    marginTop: 8,
                    fontWeight: 600,
                  }}
                >
                  ✓ Working captured
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Timer Badge ──────────────────────────────────────────────────────────────
function TimerBadge({ totalSeconds, onExpire }) {
  const { display, isUrgent } = useTimer(totalSeconds, onExpire);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 12,
        background: isUrgent ? "rgba(240,113,120,0.12)" : "#f0f6ff",
        border: `2px solid ${isUrgent ? "#f5b8c0" : "#bdd7f5"}`,
        animation: isUrgent ? "pulse 1s infinite" : "none",
      }}
    >
      <Clock size={14} color={isUrgent ? "#c0334a" : "#20B8A6"} />
      <span
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: isUrgent ? "#c0334a" : "#20B8A6",
          fontFamily: "var(--font-sans)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {display}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuizTakePage({ params }) {
  const resolvedParams = use(params);
  const quizId = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const guestSessionFromUrl = searchParams.get("guest_session");

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false); // locks after a successful submit so re-clicks during navigation can't fire another attempt
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [result, setResult] = useState(null);
  const [showNav, setShowNav] = useState(true);
  const [flagged, setFlagged] = useState(new Set());
  const [workingImages, setWorkingImages] = useState({});
  const [activeBlank, setActiveBlank] = useState(null); // ← blank highlight state
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const quizStartedAt = useRef(new Date().toISOString());
  const structuredTextareaRef = useRef(null);

  // Practice vs Exam mode + per-question immediate feedback (Practice only)
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState("practice"); // 'practice' | 'exam'
  const [feedbacks, setFeedbacks] = useState({}); // index -> grade-one response
  const [checking, setChecking] = useState(false);

  // Passage questions read better in landscape - detect a phone held portrait so
  // we can nudge the reader to rotate. Auto-clears the moment they turn sideways.
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);
  const [tiltDismissed, setTiltDismissed] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 768px) and (orientation: portrait)");
    const update = () => setIsPortraitPhone(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const currentQ = questions[currentIdx];

  const totalQ = questions.length;
  const answeredCount = questions.filter((q, idx) => {
    if (workingImages[idx]) return true;
    const v = answers[idx];
    if (v === undefined || v === null) return false;
    // Multipart: every part must have an answer
    if (q.parts && q.parts.length > 0) {
      if (typeof v !== "object") return false;
      return q.parts.every((part) => {
        const pa = v[String(part.id)];
        if (pa === undefined || pa === null) return false;
        if (typeof pa === "object") return Object.keys(pa).length > 0;
        const s = String(pa).trim();
        return s !== "" && s !== "\\placeholder{}";
      });
    }
    if (typeof v === "object") return Object.keys(v).length > 0;
    const s = String(v).trim();
    return s !== "" && s !== "\\placeholder{}";
  }).length;
  const unanswered = totalQ - answeredCount;
  const progressPct = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;

  useEffect(() => {
    if (!quizId) return;
    const token = localStorage.getItem("accessToken");
    (async () => {
      try {
        const res = token
          ? await fetchWithAuth(`${API}/quizzes/${quizId}/`)
          : await fetch(`${API}/quizzes/${quizId}/`);
        if (!res.ok) throw new Error("Quiz load failed");
        const data = await res.json();
        setQuiz(data);
        setQuestions(data.questions || []);
        // Exam-type quizzes default to Exam mode (no immediate feedback).
        if (data.quiz_type === "exam") setMode("exam");
      } catch (err) {
        console.error("❌ Failed to load quiz:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId, user, guestSessionFromUrl, router]);

  // Preload EVERY image the quiz can show - question images AND MCQ option
  // images - the moment the quiz loads, so a timed student never waits for an
  // image when they reach a question. Same Cloudinary transform used at render
  // so the preloaded URL is the exact one the browser will request.
  useEffect(() => {
    if (!questions.length || typeof window === "undefined") return;
    const urls = new Set();
    questions.forEach((q) => {
      if (q.question_image_url) urls.add(cldOptimize(q.question_image_url));
      ["a", "b", "c", "d"].forEach((lc) => {
        const u = q[`option_${lc}_image_url`];
        if (u) urls.add(cldOptimize(u));
      });
    });
    const preloaded = [];
    urls.forEach((src) => {
      const im = new window.Image();
      im.decoding = "async";
      im.src = src;
      preloaded.push(im);
    });
    return () => preloaded.forEach((im) => (im.src = ""));
  }, [questions]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const onViewportChange = () => {
      const offset =
        window.innerHeight -
        window.visualViewport.height -
        window.visualViewport.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };
    window.visualViewport.addEventListener("resize", onViewportChange);
    window.visualViewport.addEventListener("scroll", onViewportChange);
    return () => {
      window.visualViewport.removeEventListener("resize", onViewportChange);
      window.visualViewport.removeEventListener("scroll", onViewportChange);
    };
  }, []);

  const handleAnswer = useCallback(
    (value) => {
      // Practice mode: once the answer is being checked or has been checked,
      // it is locked - the feedback is tied to exactly what was submitted.
      if (mode === "practice" && (checking || feedbacks[currentIdx])) return;
      setAnswers((prev) => ({ ...prev, [currentIdx]: value }));
    },
    [currentIdx, mode, checking, feedbacks],
  );

  // Capture current math-field value before navigating away
  const captureMathField = useCallback(() => {
    const mf = document.querySelector("math-field");
    if (mf) {
      const val = mf.value?.trim();
      if (val && val !== "\\placeholder{}") {
        setAnswers((prev) => ({ ...prev, [currentIdx]: val }));
      }
    }
  }, [currentIdx]);

  const goToQuestion = useCallback(
    (idx) => {
      captureMathField();
      setCurrentIdx(idx);
    },
    [captureMathField],
  );

  const openSubmitModal = useCallback(() => {
    captureMathField();
    setTimeout(() => setShowSubmitModal(true), 50);
  }, [captureMathField]);

  // Practice mode: grade the current question immediately for instant feedback.
  const checkAnswer = async () => {
    if (checking || feedbacks[currentIdx]) return;
    const ans = answers[currentIdx];
    const hasImg = !!workingImages[currentIdx];
    const hasAns =
      hasImg ||
      (ans !== undefined &&
        ans !== null &&
        (typeof ans === "object"
          ? Object.keys(ans).length > 0
          : String(ans).trim() !== "" && String(ans).trim() !== "\\placeholder{}"));
    if (!hasAns) return;
    // Drop focus so a still-focused textarea/math-field can't take keystrokes
    // once the input area is locked for checking.
    if (typeof document !== "undefined") document.activeElement?.blur?.();
    setChecking(true);
    try {
      const res = await fetchWithAuth(`${API}/quizzes/grade-one/`, {
        method: "POST",
        body: JSON.stringify({
          question_id: currentQ.id,
          answer: ans ?? "",
          working_image: workingImages[currentIdx] || undefined,
        }),
      });
      const d = await res.json();
      if (res.ok) setFeedbacks((p) => ({ ...p, [currentIdx]: d }));
    } catch {
      /* ignore - they can still move on */
    } finally {
      setChecking(false);
    }
  };

  const handleQuizSubmit = async () => {
    // Guard: ignore re-clicks while a submit is in flight, and permanently once
    // one has succeeded (kids were spamming Submit during the navigation gap and
    // creating duplicate attempts).
    if (submitting || submittedRef.current) return;
    setSubmitting(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s - submit is now instant
    try {
      // Snapshot answers + capture any visible math field directly
      const finalAnswers = { ...answers };
      const mf = document.querySelector("math-field");
      if (mf) {
        const val = mf.value?.trim();
        if (val && val !== "\\placeholder{}") {
          finalAnswers[currentIdx] = val;
        }
      }

      const answersDict = {};
      questions.forEach((q, idx) => {
        let answer = finalAnswers[idx];
        if (answer === undefined || answer === null) return;
        if (typeof answer === "string") answer = answer.trim();
        if (
          typeof answer === "string" &&
          answer.length > 0 &&
          answer !== "\\placeholder{}"
        ) {
          answersDict[q.id] = answer;
        } else if (
          typeof answer === "object" &&
          answer !== null &&
          Object.keys(answer).length > 0
        ) {
          answersDict[q.id] = answer;
        }
      });

      const token = localStorage.getItem("accessToken");
      const payload = {
        quiz_id: parseInt(quizId, 10),
        answers: answersDict,
        working_images: workingImages,
        started_at: quizStartedAt.current,
      };
      if (!token)
        payload.session_id =
          "device_" + (localStorage.getItem("device_quizzes_used") || "0");

      const fetchOpts = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      };

      const response = await (token ? fetchWithAuth : fetch)(
        `${API}/quizzes/submit/`,
        fetchOpts,
      );

      clearTimeout(timeout);

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error("Server returned invalid response (not JSON)");
      }

      if (response.status === 402) {
        if (data?.quota_exceeded) {
          submittedRef.current = true;
          router.push("/register?reason=quota");
        } else if (data?.credits_exhausted) {
          submittedRef.current = true;
          router.push("/subscribe");
        } else {
          setSubmitting(false); // no redirect - let them retry
          alert(data?.error || "Submission failed. Please try again.");
        }
        return;
      }
      if (!response.ok) {
        setSubmitting(false); // retryable error
        alert(data?.error || "Submission failed. Please try again.");
        return;
      }
      if (data.show_signup_prompt) {
        submittedRef.current = true;
        router.push("/register?reason=quota");
        return;
      }
      if (data.is_guest) {
        const used = parseInt(
          localStorage.getItem("device_quizzes_used") || "0",
        );
        localStorage.setItem("device_quizzes_used", String(used + 1));
        submittedRef.current = true;
        setResult(data);
        return;
      }
      // 201 (sync legacy) or 202 (async grading) - both include id.
      // Lock the button and KEEP it in the "Marking…" state; navigation to the
      // results page unmounts this screen. We deliberately do NOT flip submitting
      // back to false here - that gap is what let kids re-click and double-submit.
      submittedRef.current = true;
      if (data.id) router.replace(`/attempts/${data.id}`);
      else setResult(data);
    } catch (error) {
      clearTimeout(timeout);
      setSubmitting(false); // real error - allow another attempt
      console.error("Submit error:", error);
      if (error.name === "AbortError") {
        alert(
          "Marking is taking longer than expected. Please try submitting again.",
        );
      } else {
        alert(error.message || "Failed to submit quiz. Check your connection.");
      }
    }
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(currentIdx) ? next.delete(currentIdx) : next.add(currentIdx);
      return next;
    });
  };

  const handleTimerExpire = useCallback(() => {
    if (!result) openSubmitModal();
  }, [result, openSubmitModal]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "3px solid var(--border)",
              borderTopColor: "#20B8A6",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              fontFamily: "var(--font-sans)",
            }}
          >
            Loading quiz…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (result) return <ResultsScreen result={result} quiz={quiz} />;

  if (!currentQ) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No questions found.</p>
          <Link href="/explore">
            <button
              style={{
                marginTop: 16,
                color: "#20B8A6",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ← Back to Explore
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const isMCQ = currentQ.question_type === "mcq";
  const isFillBlank = currentQ.question_type === "fill_blank";
  const isMath = currentQ.question_type === "math";
  const isText =
    currentQ.question_type === "structured" ||
    currentQ.question_type === "essay";
  const isTable = currentQ.question_type === "table";
  const isFinancial = currentQ.question_type === "financial_statement";
  const isKiswahili = /kiswahili/i.test(currentQ?.subject_name || "");

  // Practice mode: lock the answer inputs while checking is in flight AND after
  // feedback has appeared, so the choice/answer can't be changed once committed.
  const practiceLocked =
    mode === "practice" && (checking || !!feedbacks[currentIdx]);

  // Start screen: pick Practice vs Exam before the quiz (and timer) begins.
  if (quiz && !started) {
    const examType = quiz.quiz_type === "exam";
    return (
      <div
        className={nunito.className}
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: 28,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
            {quiz.title}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 22 }}>
            {totalQ} question{totalQ !== 1 ? "s" : ""}
            {quiz.duration_minutes ? ` · ${quiz.duration_minutes} min` : ""}
          </p>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            How do you want to take it?
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { id: "practice", title: "Practice", desc: "Feedback after each question" },
              { id: "exam", title: "Exam", desc: "Feedback only at the end" },
            ].map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    textAlign: "left",
                    padding: 16,
                    borderRadius: 16,
                    cursor: "pointer",
                    border: `2px solid ${active ? "#20B8A6" : "var(--border)"}`,
                    background: active ? "rgba(26,111,196,0.08)" : "var(--bg-card)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: active ? "#20B8A6" : "var(--text)",
                      marginBottom: 4,
                    }}
                  >
                    {m.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
                    {m.desc}
                  </div>
                </button>
              );
            })}
          </div>
          {examType && (
            <p
              style={{
                fontSize: 12,
                color: "#F2C978",
                background: "rgba(232,182,91,0.10)",
                border: "1px solid #fde68a",
                borderRadius: 10,
                padding: "8px 10px",
                marginBottom: 16,
              }}
            >
              This is an exam-style quiz - Exam mode is recommended.
            </p>
          )}
          <button
            onClick={() => {
              quizStartedAt.current = new Date().toISOString();
              setStarted(true);
            }}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 14,
              border: "none",
              background: "#0E7490",
              color: "#fff",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Start Quiz →
          </button>
        </div>
      </div>
    );
  }

  // Build answeredBlanks map: { blankNum: optionText } - scoped to current passage only
  const answeredBlanks = {};
  const currentPassageId = currentQ?.passage?.id;
  if (currentPassageId) {
    const samePassageQs = questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => q.passage?.id === currentPassageId);

    samePassageQs.forEach(({ q, idx }, posInPassage) => {
      if (q.parts && q.parts.length > 0) {
        q.parts.forEach((part, partIdx) => {
          const letter =
            typeof answers[idx] === "object" ? answers[idx]?.[part.id] : null;
          const optionText = letter
            ? part[`option_${letter.toLowerCase()}`]
            : null;
          if (optionText) {
            // Blank number: use a digit in the part_label when present
            // (e.g. "3", "1.", "1(a)"); otherwise fall back to the part's
            // position so letter labels ("a","b","c"…) map to 1,2,3…
            const m = String(part.part_label ?? "").match(/\d+/);
            const blankNum = m ? parseInt(m[0], 10) : partIdx + 1;
            answeredBlanks[blankNum] = optionText;
          }
        });
      } else {
        const letter = typeof answers[idx] === "string" ? answers[idx] : null;
        const optionText = letter ? q[`option_${letter.toLowerCase()}`] : null;
        if (optionText) answeredBlanks[posInPassage + 1] = optionText;
      }
    });
  }

  return (
    <div
      className={nunito.className}
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
      }}
      onCopy={(e) => {
        if (!["TEXTAREA", "INPUT"].includes(e.target.tagName))
          e.preventDefault();
      }}
      onCut={(e) => {
        if (!["TEXTAREA", "INPUT"].includes(e.target.tagName))
          e.preventDefault();
      }}
      onContextMenu={(e) => {
        if (!["TEXTAREA", "INPUT"].includes(e.target.tagName))
          e.preventDefault();
      }}
      onKeyDown={(e) => {
        const tag = e.target.tagName;
        if (["TEXTAREA", "INPUT"].includes(tag)) return;
        if (
          (e.ctrlKey || e.metaKey) &&
          ["c", "a", "u", "s", "p"].includes(e.key.toLowerCase())
        )
          e.preventDefault();
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
        @keyframes tiltNudge { 0%,55%,100% { transform: rotate(0deg); } 70%,85% { transform: rotate(90deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus, input:focus { outline: none; }
        button { font-family: inherit; }
        .question-nav { display: flex; }
        @media (max-width: 900px) { .question-nav { display: none !important; } }
        .passage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .passage-panel { position: sticky; top: 80px; align-self: start; max-height: calc(100vh - 100px); overflow-y: auto; padding-bottom: 40px; }
        @media (max-width: 768px) {
          .passage-grid { display: flex !important; flex-direction: column !important; }
          .passage-panel { position: static !important; max-height: none !important; overflow-y: visible !important; margin-bottom: 20px; }
        }
        /* Prevent text selection on question content */
        *:not(textarea):not(input) { user-select: none; -webkit-user-select: none; }
      `}</style>

      <SubmitModal
        open={showSubmitModal}
        onConfirm={handleQuizSubmit}
        onCancel={() => setShowSubmitModal(false)}
        unanswered={unanswered}
        submitting={submitting}
      />
      <QuestionNav
        questions={questions}
        answers={answers}
        currentIdx={currentIdx}
        onJump={goToQuestion}
        show={showNav}
      />

      {/* Top Bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            padding: "0 16px",
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Link href="/explore">
            <button
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "2px solid var(--border)",
                background: "var(--bg-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X size={16} color="#6b7280" />
            </button>
          </Link>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 5,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                {answeredCount} of {totalQ} answered
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "var(--bg)",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <motion.div
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
                style={{
                  height: "100%",
                  background: "#0E7490",
                  borderRadius: 99,
                }}
              />
            </div>
          </div>
          {quiz?.duration_minutes && (
            <TimerBadge
              totalSeconds={quiz.duration_minutes * 60}
              onExpire={handleTimerExpire}
            />
          )}
          <button
            onClick={() => setShowNav((p) => !p)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: "2px solid var(--border)",
              background: showNav ? "#e8f4ff" : "var(--bg-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Menu size={16} color={showNav ? "#20B8A6" : "#6b7280"} />
          </button>
        </div>
      </div>

      {/* Content */}
      {/* Rotate-your-phone nudge - passage questions read far better in landscape */}
      {currentQ?.passage && isPortraitPhone && !tiltDismissed && (
        <div
          style={{
            maxWidth: 680,
            margin: "12px auto -8px",
            padding: "0 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderLeft: "4px solid #6366f1",
              borderRadius: 14,
              padding: "10px 12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                flexShrink: 0,
                transformOrigin: "center",
                animation: "tiltNudge 2.8s ease-in-out infinite",
              }}
            >
              <rect x="7" y="2" width="10" height="20" rx="2" ry="2" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            <p
              style={{
                flex: 1,
                fontSize: 13,
                lineHeight: 1.4,
                color: "var(--text)",
                fontWeight: 500,
              }}
            >
              {isKiswahili
                ? "Dokezo: geuza simu yako upande kwa kusoma kifungu kwa urahisi."
                : "Tip: turn your phone sideways to read the passage more comfortably."}
            </p>
            <button
              onClick={() => setTiltDismissed(true)}
              aria-label={isKiswahili ? "Funga" : "Dismiss"}
              style={{
                flexShrink: 0,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                fontSize: 18,
                lineHeight: 1,
                padding: "2px 6px",
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div
        className={currentQ?.passage ? "passage-grid" : ""}
        style={{
          maxWidth: currentQ?.passage ? 1200 : 680,
          margin: "0 auto",
          padding: "32px 16px 120px",
          ...(currentQ?.passage ? {} : { display: "block" }),
        }}
      >
        {/* Passage Panel */}
        {currentQ?.passage && (
          <div
            className="passage-panel"
            style={{
              background: "var(--bg-card)",
              borderRadius: 20,
              border: "2px solid var(--border)",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  background: "var(--bg)",
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                {currentQ.passage.passage_type}
              </span>
              {currentQ.passage.author && (
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  - {currentQ.passage.author}
                </span>
              )}
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--text)",
                marginBottom: 16,
                fontFamily: "var(--font-sans)",
              }}
            >
              {currentQ.passage.title}
            </h3>
            <PassageContent
              type={currentQ.passage.passage_type}
              content={currentQ.passage.content}
              activeBlank={activeBlank}
              answeredBlanks={answeredBlanks}
            />
          </div>
        )}

        {/* Questions Panel */}
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Question header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      background: "#0E7490",
                      color: "#fff",
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 15,
                      fontFamily: "var(--font-sans)",
                      flexShrink: 0,
                    }}
                  >
                    {currentIdx + 1}
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {isKiswahili
                        ? currentQ.question_type === "essay"
                          ? "INSHA"
                          : currentQ.question_type === "structured"
                            ? "MUUNDO"
                            : currentQ.question_type === "fill_blank"
                              ? "JAZA NAFASI"
                              : currentQ.question_type
                                  ?.replace("_", " ")
                                  .toUpperCase() || "MCQ"
                        : currentQ.question_type?.replace("_", " ") || "MCQ"}
                    </span>
                    <span
                      style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}
                    >
                      · {currentQ.max_marks}{" "}
                      {isKiswahili
                        ? "alama"
                        : `mark${currentQ.max_marks !== 1 ? "s" : ""}`}
                    </span>
                    {currentQ.created_at && (
                      <span
                        style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}
                        title={new Date(currentQ.created_at).toLocaleString()}
                      >
                        · {isKiswahili ? "Imeongezwa" : "Added"}{" "}
                        {new Date(currentQ.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {flagged.has(currentIdx) && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "#d4900a",
                          fontWeight: 700,
                          marginLeft: 10,
                        }}
                      >
                        ⚑ {isKiswahili ? "Imewekwa alama" : "Flagged"}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={toggleFlag}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: `2px solid ${flagged.has(currentIdx) ? "#f0d690" : "var(--border)"}`,
                    background: flagged.has(currentIdx) ? "rgba(232,182,91,0.12)" : "var(--bg-card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Flag
                    size={15}
                    color={flagged.has(currentIdx) ? "#d4900a" : "#bcc3d0"}
                  />
                </button>
              </div>

              {/* Question text */}
              <div
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 20,
                  padding: "22px 24px",
                  marginBottom: 24,
                  border: "2px solid var(--border)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
                }}
              >
                <p
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--text)",
                    lineHeight: 1.65,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderTextWithBlanks(
                      currentQ.question_text,
                      answeredBlanks,
                    ),
                  }}
                />
              </div>

              {/* Question image */}
              {currentQ.question_image_url && (
                <div
                  style={{
                    marginBottom: 24,
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "2px solid var(--border)",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    window.open(currentQ.question_image_url, "_blank")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cldOptimize(currentQ.question_image_url)}
                    alt="Question diagram"
                    loading="eager"
                    decoding="async"
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                  <div
                    style={{
                      padding: "8px 14px",
                      background: "var(--bg)",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Click to view full size
                  </div>
                </div>
              )}

              {/* Answer inputs - Practice mode locks them once checking starts */}
              <div
                style={{
                  pointerEvents: practiceLocked ? "none" : "auto",
                  opacity: practiceLocked ? 0.7 : 1,
                  transition: "opacity 0.15s ease",
                }}
                aria-disabled={practiceLocked}
              >
              {/* MCQ */}
              {isMCQ && !(currentQ.parts && currentQ.parts.length > 0) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {["A", "B", "C", "D"].map((letter) => {
                    const lc = letter.toLowerCase();
                    const text = currentQ[`option_${lc}`];
                    const imageUrl = currentQ[`option_${lc}_image_url`];
                    if (!text && !imageUrl) return null;
                    return (
                      <MCQOption
                        key={letter}
                        letter={letter}
                        text={text}
                        imageUrl={imageUrl}
                        selected={answers[currentIdx] === letter}
                        mark={(() => {
                          const fb = mode === "practice" ? feedbacks[currentIdx] : null;
                          if (!fb) return null;
                          const right = fb.is_correct ? answers[currentIdx]
                            : correctLetterOf(fb.feedback?.correct_answer);
                          if (letter === right) return "correct";
                          if (letter === answers[currentIdx]) return "wrong";
                          return "dim";
                        })()}
                        disabled={mode === "practice" && !!feedbacks[currentIdx]}
                        onClick={() => handleAnswer(letter)}
                      />
                    );
                  })}
                </div>
              )}

              {isMath && !(currentQ.parts && currentQ.parts.length > 0) ? (
                workingImages[currentIdx] ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#1d8f57",
                      fontWeight: 600,
                      padding: "12px 0",
                    }}
                  >
                    ✓ Working photo captured - no need to type your answer.
                  </p>
                ) : isMCQ ? null : (
                  <SimpleMathInput
                    value={answers[currentIdx] ?? ""}
                    onChange={(val) => handleAnswer(val)}
                  />
                )
              ) : isFillBlank &&
                !(currentQ.parts && currentQ.parts.length > 0) ? (
                <input
                  type="text"
                  value={answers[currentIdx] ?? ""}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder={
                    isKiswahili
                      ? "Andika jibu lako hapa…"
                      : "Type your answer here…"
                  }
                  style={{
                    width: "100%",
                    border: "2px solid var(--border)",
                    borderRadius: 16,
                    padding: "14px 18px",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--text)",
                    background: "var(--bg-card)",
                    fontFamily: "var(--font-sans)",
                    transition: "border-color 0.15s",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#20B8A6")}
                  onBlur={(e) => (e.target.style.borderColor = "#e8eaf0")}
                />
              ) : null}

              {/* Structured / Essay */}
              {isText && !(currentQ.parts && currentQ.parts.length > 0) && (
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 10,
                    }}
                  >
                    {isKiswahili
                      ? currentQ.question_type === "essay"
                        ? "Andika insha yako"
                        : "Andika jibu lako"
                      : currentQ.question_type === "essay"
                        ? "Write your essay"
                        : "Write your answer"}
                  </p>
                  <ChemTextBar
                    textareaRef={structuredTextareaRef}
                    value={answers[currentIdx] ?? ""}
                    onChange={(val) => handleAnswer(val)}
                  />
                  <PhysicsFormulaBar
                    textareaRef={structuredTextareaRef}
                    value={answers[currentIdx] ?? ""}
                    onChange={(val) => handleAnswer(val)}
                  />
                  <div style={{ position: "relative" }}>
                    <textarea
                      ref={structuredTextareaRef}
                      value={answers[currentIdx] ?? ""}
                      onChange={(e) => handleAnswer(e.target.value)}
                      rows={currentQ.question_type === "essay" ? 8 : 5}
                      placeholder={
                        isKiswahili
                          ? currentQ.question_type === "essay"
                            ? "Anza insha yako hapa…"
                            : "Eleza jibu lako kwa undani…"
                          : currentQ.question_type === "essay"
                            ? "Begin your essay here…"
                            : "Explain your answer in detail…"
                      }
                      style={{
                        width: "100%",
                        border: "2px solid var(--border)",
                        borderRadius: 16,
                        padding: "14px 18px",
                        fontSize: 15,
                        color: "var(--text)",
                        background: "var(--bg-card)",
                        fontFamily: "var(--font-sans)",
                        lineHeight: 1.7,
                        resize: "none",
                        transition: "border-color 0.15s",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#20B8A6")}
                      onBlur={(e) => (e.target.style.borderColor = "#e8eaf0")}
                    />
                    <span
                      style={{
                        position: "absolute",
                        bottom: 10,
                        right: 12,
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {isKiswahili
                        ? `herufi ${(answers[currentIdx] ?? "").length}`
                        : `${(answers[currentIdx] ?? "").length} chars`}
                    </span>
                  </div>
                  {currentQ.max_marks > 1 && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                      {isKiswahili
                        ? `Alama ${currentQ.max_marks} - toa jibu la kina.`
                        : `Worth ${currentQ.max_marks} marks - provide a detailed answer.`}
                    </p>
                  )}
                </div>
              )}

              {/* Table question */}
              {isTable &&
                currentQ.table_data &&
                (() => {
                  const td = currentQ.table_data;
                  const tt = td.table_type;
                  // Static: display only, nothing to interact with
                  if (tt === "static") {
                    return (
                      <div
                        style={{
                          marginTop: 4,
                          overflowX: "auto",
                          borderRadius: 14,
                          border: "1.5px solid var(--border)",
                          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            minWidth: 300,
                          }}
                        >
                          <tbody>
                            {td.rows.map((row, r) => (
                              <tr
                                key={r}
                                style={{
                                  background:
                                    r === 0
                                      ? "var(--bg-secondary)"
                                      : r % 2 === 1
                                        ? "var(--bg-card)"
                                        : "var(--bg-secondary)",
                                }}
                              >
                                {row.map((cell, c) => (
                                  <td
                                    key={c}
                                    style={{
                                      padding: "12px 16px",
                                      fontSize: 14,
                                      fontWeight: r === 0 ? 700 : 400,
                                      color: "var(--text)",
                                      borderBottom:
                                        r < td.rows.length - 1
                                          ? "1px solid var(--border)"
                                          : "none",
                                      borderRight:
                                        c < row.length - 1
                                          ? "1.5px solid var(--border)"
                                          : "none",
                                    }}
                                  >
                                    {cell.v}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  // Matching: explicit drag-and-drop (or heuristic detection for old data)
                  if (tt === "matching" || isMatchingTable(td)) {
                    return (
                      <MatchingTable
                        tableData={td}
                        answer={answers[currentIdx]}
                        onAnswer={(val) => handleAnswer(val)}
                      />
                    );
                  }
                  // Fill-in (default)
                  return (
                    <FillInTable
                      tableData={td}
                      answer={answers[currentIdx]}
                      onAnswer={(val) => handleAnswer(val)}
                    />
                  );
                })()}

              {/* Financial Statement question */}
              {isFinancial && (
                <div style={{ marginTop: 8 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 12,
                    }}
                  >
                    Complete the financial statement
                  </p>
                  <FinancialStatementInput
                    schema={null}
                    schemaHeadings={currentQ.statement_schema_template || null}
                    subtype={currentQ.statement_subtype || ""}
                    value={
                      typeof answers[currentIdx] === "object"
                        ? answers[currentIdx]
                        : null
                    }
                    onChange={(json) => handleAnswer(json)}
                  />
                </div>
              )}

              {/* Working panel - math only, not for multipart */}
              {isMath && !(currentQ.parts && currentQ.parts.length > 0) && (
                <WorkingPanel
                  questionIdx={currentIdx}
                  onWorkingCapture={(base64) =>
                    setWorkingImages((prev) => ({
                      ...prev,
                      [currentIdx]: base64,
                    }))
                  }
                />
              )}

              {/* Multi-part questions */}
              {currentQ.parts && currentQ.parts.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                  }}
                >
                  {currentQ.parts.map((part) => {
                    const partAnswer =
                      typeof answers[currentIdx] === "object"
                        ? (answers[currentIdx]?.[part.id] ?? "")
                        : "";
                    const blankNum = parseInt(part.part_label);

                    const handlePartAnswer = (value) => {
                      if (practiceLocked) return;
                      setAnswers((prev) => ({
                        ...prev,
                        [currentIdx]: {
                          ...(typeof prev[currentIdx] === "object"
                            ? prev[currentIdx]
                            : {}),
                          [part.id]: value,
                        },
                      }));
                      // Highlight and scroll to the matching blank in the passage
                      setActiveBlank(blankNum);
                      setTimeout(() => {
                        document
                          .getElementById(`blank-${blankNum}`)
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                      }, 50);
                      setTimeout(() => setActiveBlank(null), 1500);
                    };

                    return (
                      <div
                        key={part.id}
                        style={{
                          background: "var(--bg-card)",
                          borderRadius: 16,
                          padding: 20,
                          border: "2px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 14,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: "#0E7490",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: 13,
                            }}
                          >
                            {part.part_label}
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              color: "var(--text-muted)",
                              fontWeight: 600,
                            }}
                          >
                            {part.max_marks}{" "}
                            {isKiswahili
                              ? "alama"
                              : `mark${part.max_marks !== 1 ? "s" : ""}`}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 15,
                            color: "var(--text)",
                            lineHeight: 1.65,
                            marginBottom: 14,
                          }}
                          dangerouslySetInnerHTML={{
                            __html: renderText(part.question_text),
                          }}
                        />
                        {part.question_type === "mcq" ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {["A", "B", "C", "D"].map((letter) => {
                              const text = part[`option_${letter.toLowerCase()}`];
                              if (!text) return null;
                              return (
                                <MCQOption
                                  key={letter}
                                  letter={letter}
                                  text={text}
                                  selected={partAnswer === letter}
                                  onClick={() => handlePartAnswer(letter)}
                                />
                              );
                            })}
                          </div>
                        ) : part.question_type === "financial_statement" ? (
                          <div style={{ marginTop: 8 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                              Complete the financial statement
                            </p>
                            <FinancialStatementInput
                              schema={null}
                              schemaHeadings={part.marking_scheme ? {
                                leftHeading: part.marking_scheme.left?.heading,
                                rightHeading: part.marking_scheme.right?.heading,
                                sectionNames: Array.isArray(part.marking_scheme.sections)
                                  ? part.marking_scheme.sections.map(s => s.name)
                                  : undefined,
                              } : null}
                              subtype={part.statement_subtype || part.marking_scheme?.subtype || ""}
                              value={typeof partAnswer === "object" ? partAnswer : null}
                              onChange={(json) => handlePartAnswer(json)}
                            />
                          </div>
                        ) : (
                          <PartAnswerBlock
                            value={partAnswer}
                            onChange={(val) => handlePartAnswer(val)}
                            isKiswahili={isKiswahili}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Practice-mode immediate feedback */}
      {mode === "practice" &&
        feedbacks[currentIdx] &&
        (() => {
          const fb = feedbacks[currentIdx];
          const f = fb.feedback || {};
          const full = fb.max_marks > 0 ? fb.marks_awarded >= fb.max_marks : fb.is_correct;
          const zero = (fb.marks_awarded ?? 0) <= 0;
          const color = full ? "#1d8f57" : zero ? "#F07178" : "#d4900a";
          const bg = full ? "rgba(32,184,166,0.12)" : zero ? "rgba(240,113,120,0.12)" : "rgba(232,182,91,0.12)";
          // Strip a leading verdict word (the heading already shows it) and turn
          // literal \n / real newlines into proper line breaks for clean spacing.
          const body = tidyFeedback(f.feedback || "")
            .trim()
            .replace(/^(Correct!|Not quite\.?|Partially correct\.?)\s*/i, "");
          // Split on literal \n / real newlines into clean, spaced paragraphs.
          // Tables first (they span lines), then one paragraph per line.
          const segs = _mdTableToHtml(body.replace(/\\n/g, "\n"))
            .split(/\r\n|\n/).map((s) => s.trim()).filter(Boolean);
          const paras = (list) =>
            list
              .map(
                (s, i, a) =>
                  `<p style="margin:0 0 ${i < a.length - 1 ? "10px" : "0"} 0">${renderMath(s)}</p>`,
              )
              .join("");
          const fbHtml = paras(segs);
          // The worked solution for THIS answer. On a wrong maths answer the
          // marker writes it into study_tip, not feedback - it was never shown.
          const tip = tidyFeedback(f.study_tip || "").trim();
          const tipHtml =
            tip && !(f.feedback || "").includes(tip.slice(0, 60))
              ? paras(_mdTableToHtml(tip).split(/\n/).map((s) => s.trim()).filter(Boolean))
              : "";
          return (
            <div style={{ maxWidth: 680, margin: "16px auto 110px", padding: "0 16px" }}>
              <div style={{ background: bg, border: `1.5px solid ${color}44`, borderRadius: 16, padding: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontWeight: 800, color, fontSize: 15 }}>
                    {full ? "Correct!" : zero ? "Not quite" : "Partially correct"}
                  </span>
                  <span style={{ fontWeight: 800, color, fontSize: 14 }}>
                    {fb.marks_awarded}/{fb.max_marks}
                  </span>
                </div>
                {f.correct_answer && !full && (
                  <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 6 }}>
                    <b>Correct answer:</b>{" "}
                    {typeof f.correct_answer === "string"
                      ? f.correct_answer
                      : JSON.stringify(f.correct_answer)}
                  </p>
                )}
                {body && (
                  <div
                    style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.75 }}
                    dangerouslySetInnerHTML={{ __html: fbHtml }}
                  />
                )}
                {tipHtml && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                                textTransform: "uppercase", color, marginBottom: 6 }}>
                      How to work it out
                    </p>
                    <div
                      style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.75 }}
                      dangerouslySetInnerHTML={{ __html: tipHtml }}
                    />
                  </div>
                )}
                {f.explanation_image_url && (
                  <img
                    src={f.explanation_image_url}
                    alt="Explanation diagram"
                    style={{
                      maxWidth: "100%",
                      borderRadius: 10,
                      marginTop: 10,
                      display: "block",
                    }}
                  />
                )}
              </div>
            </div>
          );
        })()}
        </div>
      </div>

      {/* Bottom Nav */}
      <div
        style={{
          position: "fixed",
          bottom: keyboardOffset,
          left: 0,
          right: 0,
          zIndex: 20,
          background: "var(--bg-card)",
          borderTop: "1px solid var(--border)",
          padding: "14px 16px",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
          transition: "bottom 0.15s ease",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => goToQuestion(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              border: "2px solid var(--border)",
              background: "var(--bg-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: currentIdx === 0 ? "not-allowed" : "pointer",
              opacity: currentIdx === 0 ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={20} color="#6b7280" />
          </button>

          {mode === "practice" && !feedbacks[currentIdx] ? (
            <button
              onClick={checkAnswer}
              disabled={checking}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                border: "none",
                background: checking
                  ? "#94a3b8"
                  : "#0E7490",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: checking ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: "var(--font-sans)",
                boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
              }}
            >
              {checking ? "Checking..." : "Check Answer"}
            </button>
          ) : currentIdx < totalQ - 1 ? (
            <button
              onClick={() => goToQuestion(currentIdx + 1)}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                border: "none",
                background: "#0E7490",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: "var(--font-sans)",
                boxShadow: "0 4px 16px rgba(26,111,196,0.3)",
              }}
            >
              Next Question <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={openSubmitModal}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, #1d8f57, #0ea5c9)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: "var(--font-sans)",
                boxShadow: "0 4px 16px rgba(29,143,87,0.3)",
              }}
            >
              <Send size={18} /> Submit Quiz
            </button>
          )}

          {currentIdx < totalQ - 1 && unanswered === 0 && (
            <button
              onClick={openSubmitModal}
              title="All answered - submit now"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                border: "2px solid #a8e6c4",
                background: "rgba(32,184,166,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Send size={18} color="#1d8f57" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
