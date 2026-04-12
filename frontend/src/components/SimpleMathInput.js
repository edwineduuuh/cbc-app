"use client";

import { useRef, useEffect, useState, useCallback } from "react";

// Essential math tools - keep it simple
const QUICK_TOOLS = [
  { label: "Fraction", latex: "\\frac{}{}", icon: "⅓" },
  { label: "Square root", latex: "\\sqrt{}", icon: "√" },
  { label: "Superscript", latex: "^{}", icon: "x²" },
  { label: "Subscript", latex: "_{}", icon: "x₂" },
  { label: "Pi", latex: "\\pi", icon: "π" },
];

export default function SimpleMathInput({ value, onChange }) {
  const mfRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize MathLive
    import("mathlive").then((ML) => {
      try {
        if (ML.default)
          ML.default.fontsDirectory =
            "https://unpkg.com/mathlive@0.109.0/dist/fonts/";
        if (window.MathfieldElement)
          window.MathfieldElement.fontsDirectory =
            "https://unpkg.com/mathlive@0.109.0/dist/fonts/";
        setIsReady(true);
      } catch (err) {
        console.error("MathLive init failed:", err);
      }
    });
  }, []);

  useEffect(() => {
    const el = mfRef.current;
    if (!el || value === undefined) return;
    try {
      el.value = value;
    } catch (e) {
      console.warn("Could not set field value:", e);
    }
  }, [value]);

  const readValue = useCallback(() => {
    const el = mfRef.current;
    if (!el) return;
    try {
      const currentValue = el.value?.trim() || "";
      if (currentValue && currentValue !== "\\placeholder{}")
        onChange(currentValue);
    } catch (e) {
      console.warn("Could not read field value:", e);
    }
  }, [onChange]);

  useEffect(() => {
    const el = mfRef.current;
    if (!el) return;
    const events = ["input", "change", "blur"];
    events.forEach((event) => el.addEventListener(event, readValue));
    return () => {
      events.forEach((event) => el.removeEventListener(event, readValue));
    };
  }, [readValue]);

  const insertTool = useCallback(
    (latex) => {
      const el = mfRef.current;
      if (!el) {
        console.warn("Math field not ready");
        return;
      }
      try {
        const currentValue = el.value || "";
        el.value = currentValue + latex;
        setTimeout(() => {
          readValue();
          el.focus();
        }, 50);
      } catch (e) {
        console.error("Insert tool failed:", e);
      }
    },
    [readValue],
  );

  return (
    <div className="w-full space-y-2">
      {/* Math Input Field */}
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
        <math-field
          ref={mfRef}
          style={{
            width: "100%",
            padding: "12px 14px",
            fontSize: "16px",
            display: "block",
            minHeight: "56px",
            fontFamily: "'Lato', sans-serif",
          }}
          virtual-keyboard-mode="onfocus"
          fonts-directory="https://unpkg.com/mathlive@0.109.0/dist/fonts/"
        />
      </div>

      {/* Quick Tools Toolbar - Simple and Clean */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_TOOLS.map((tool) => (
          <button
            key={tool.latex}
            type="button"
            onClick={() => insertTool(tool.latex)}
            disabled={!isReady}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isReady
                ? "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            title={isReady ? tool.label : "Loading..."}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        {isReady
          ? "Tip: Use the buttons above for common math symbols, or type directly."
          : "Loading math editor..."}
      </p>
    </div>
  );
}
