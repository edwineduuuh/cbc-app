"use client";

import { useRef, useEffect, useState, useCallback } from "react";

// Practical, working templates organized by category
const TEMPLATE_LIBRARY = {
  Math: [
    { label: "Fraction", value: "\\frac{a}{b}" },
    { label: "x squared", value: "x^{2}" },
    { label: "x cubed", value: "x^{3}" },
    { label: "Square root", value: "\\sqrt{x}" },
  ],
  Chemistry: [
    { label: "H₂O", value: "H_2O" },
    { label: "CO₂", value: "CO_2" },
    { label: "H₂", value: "H_2" },
    { label: "O₂", value: "O_2" },
    { label: "H₂SO₄", value: "H_2SO_4" },
    { label: "NaCl", value: "NaCl" },
  ],
  Symbols: [
    { label: "π", value: "\\pi" },
    { label: "±", value: "\\pm" },
    { label: "≈", value: "\\approx" },
    { label: "≠", value: "\\neq" },
    { label: "∞", value: "\\infty" },
  ],
};

export default function SimpleMathInput({ value, onChange }) {
  const mfRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState("Math");

  // Initialize MathLive
  useEffect(() => {
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

  // Update field when external value changes
  useEffect(() => {
    const el = mfRef.current;
    if (!el || value === undefined) return;
    try {
      if (el.value !== value) {
        el.value = value;
      }
    } catch (e) {
      console.warn("Could not set field value:", e);
    }
  }, [value]);

  // Read value from field
  const handleFieldChange = useCallback(() => {
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

  // Attach change listeners
  useEffect(() => {
    const el = mfRef.current;
    if (!el) return;
    const events = ["input", "change", "blur"];
    events.forEach((event) => el.addEventListener(event, handleFieldChange));
    return () => {
      events.forEach((event) =>
        el.removeEventListener(event, handleFieldChange),
      );
    };
  }, [handleFieldChange]);

  // Insert template into field
  const insertTemplate = useCallback(
    (template) => {
      const el = mfRef.current;
      if (!el || !isReady) return;
      try {
        const currentValue = el.value || "";
        el.value = currentValue + template;
        setTimeout(() => {
          handleFieldChange();
          el.focus();
        }, 0);
      } catch (e) {
        console.error("Insert failed:", e);
      }
    },
    [isReady, handleFieldChange],
  );

  return (
    <div className="w-full">
      {/* Main Math Input Field */}
      <div className="mb-3 border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
        <math-field
          ref={mfRef}
          style={{
            width: "100%",
            padding: "14px 16px",
            fontSize: "16px",
            display: "block",
            minHeight: "60px",
            fontFamily: "'Lato', sans-serif",
            boxSizing: "border-box",
            background: "#ffffff",
            color: "#111827",
            "--selection-background-color": "#dbeafe",
            "--contains-highlight-background-color": "transparent",
          }}
          virtual-keyboard-mode="onfocus"
          fonts-directory="https://unpkg.com/mathlive@0.109.0/dist/fonts/"
        />
      </div>

      {/* Template Library Tabs */}
      {isReady && (
        <div>
          {/* Tab Buttons */}
          <div className="flex gap-2 mb-3 border-b border-gray-200">
            {Object.keys(TEMPLATE_LIBRARY).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {TEMPLATE_LIBRARY[activeTab].map((template) => (
              <button
                key={template.value}
                onClick={() => insertTemplate(template.value)}
                className="p-3 text-center bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 active:bg-blue-100 transition-all"
                title={`Insert: ${template.label}`}
              >
                <div className="text-sm font-medium text-gray-700">
                  {template.label}
                </div>
              </button>
            ))}
          </div>

          {/* Help Message */}
          <p className="mt-3 text-xs text-gray-500">
            ✓ Click any button to insert it | or type directly in the field
            above
          </p>
        </div>
      )}

      {!isReady && (
        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg text-center">
          <p className="text-sm text-gray-600">Loading math editor...</p>
        </div>
      )}
    </div>
  );
}
