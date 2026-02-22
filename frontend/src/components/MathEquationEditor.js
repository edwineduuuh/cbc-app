"use client";

import { useState, useEffect, useRef } from "react";

/**
 * MATH EQUATION EDITOR
 *
 * Uses MathQuill for beautiful math input
 *
 * SETUP:
 * 1. Add to your layout.js or page head:
 *    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.css"/>
 *    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
 *    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.js"></script>
 *
 * USAGE:
 *    <MathEquationEditor
 *      value={mathAnswer}
 *      onChange={(latex) => setMathAnswer(latex)}
 *    />
 */

export function MathEquationEditor({
  value = "",
  onChange,
  placeholder = "Enter math equation...",
}) {
  const mathFieldRef = useRef(null);
  const [mathField, setMathField] = useState(null);
  const [previewLatex, setPreviewLatex] = useState(value);

  // Initialize MathQuill
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.MathQuill &&
      mathFieldRef.current &&
      !mathField
    ) {
      const MQ = window.MathQuill.getInterface(2);
      const field = MQ.MathField(mathFieldRef.current, {
        handlers: {
          edit: function () {
            const latex = field.latex();
            setPreviewLatex(latex);
            onChange?.(latex);
          },
        },
      });

      if (value) {
        field.latex(value);
      }

      setMathField(field);
    }
  }, [mathField, onChange, value]);

  // Quick insert buttons
  const insertSymbol = (latex) => {
    if (mathField) {
      mathField.cmd(latex);
      mathField.focus();
    }
  };

  const symbols = [
    { label: "x²", latex: "^2" },
    { label: "xⁿ", latex: "^" },
    { label: "√", latex: "\\sqrt" },
    { label: "∛", latex: "\\sqrt[3]" },
    { label: "÷", latex: "\\div" },
    { label: "×", latex: "\\times" },
    { label: "±", latex: "\\pm" },
    { label: "≤", latex: "\\leq" },
    { label: "≥", latex: "\\geq" },
    { label: "≠", latex: "\\neq" },
    { label: "∞", latex: "\\infty" },
    { label: "π", latex: "\\pi" },
    { label: "α", latex: "\\alpha" },
    { label: "β", latex: "\\beta" },
    { label: "θ", latex: "\\theta" },
    { label: "∑", latex: "\\sum" },
    { label: "∫", latex: "\\int" },
    { label: "lim", latex: "\\lim" },
    { label: "log", latex: "\\log" },
    { label: "ln", latex: "\\ln" },
    { label: "sin", latex: "\\sin" },
    { label: "cos", latex: "\\cos" },
    { label: "tan", latex: "\\tan" },
    { label: "a/b", latex: "\\frac" },
  ];

  return (
    <div className="space-y-3">
      {/* Math Input Field */}
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-white focus-within:border-blue-500 transition-colors">
        <div
          ref={mathFieldRef}
          className="min-h-[60px] text-2xl"
          style={{ fontSize: "24px" }}
        />
      </div>

      {/* Symbol Palette */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-xs font-semibold text-gray-600 mb-2">
          Quick Symbols:
        </div>
        <div className="flex flex-wrap gap-1">
          {symbols.map((symbol, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => insertSymbol(symbol.latex)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-400 text-sm font-medium transition-colors"
              title={symbol.latex}
            >
              {symbol.label}
            </button>
          ))}
        </div>
      </div>

      {/* LaTeX Preview */}
      {previewLatex && (
        <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
          LaTeX: {previewLatex}
        </div>
      )}
    </div>
  );
}

/**
 * FALLBACK: Simple LaTeX Input (if MathQuill fails to load)
 */
export function SimpleMathInput({
  value = "",
  onChange,
  placeholder = "Enter math (e.g., x^2 + 2x + 1)",
}) {
  const [latex, setLatex] = useState(value);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLatex(newValue);
    onChange?.(newValue);
  };

  // Common patterns
  const insertPattern = (pattern) => {
    setLatex(latex + pattern);
    onChange?.(latex + pattern);
  };

  const patterns = [
    { label: "x²", value: "x^2" },
    { label: "xⁿ", value: "x^n" },
    { label: "√x", value: "\\sqrt{x}" },
    { label: "x/y", value: "\\frac{x}{y}" },
    { label: "≤", value: "\\leq" },
    { label: "≥", value: "\\geq" },
    { label: "≠", value: "\\neq" },
    { label: "π", value: "\\pi" },
  ];

  return (
    <div className="space-y-2">
      <textarea
        value={latex}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        rows={3}
      />

      {/* Quick Patterns */}
      <div className="flex flex-wrap gap-2">
        {patterns.map((pattern, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => insertPattern(pattern.value)}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium"
          >
            {pattern.label}
          </button>
        ))}
      </div>

      {/* Preview */}
      {latex && (
        <div className="text-xs text-gray-500">
          LaTeX:{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded">{latex}</code>
        </div>
      )}
    </div>
  );
}

/**
 * SMART WRAPPER: Uses MathQuill if available, falls back to simple input
 */
export default function SmartMathEditor(props) {
  const [useMathQuill, setUseMathQuill] = useState(false);

  useEffect(() => {
    // Check if MathQuill is loaded
    if (typeof window !== "undefined" && window.MathQuill) {
      setUseMathQuill(true);
    }
  }, []);

  if (useMathQuill) {
    return <MathEquationEditor {...props} />;
  }

  return <SimpleMathInput {...props} />;
}

/**
 * EXAMPLE USAGE IN YOUR QUESTION FORM:
 */
export function QuestionFormExample() {
  const [mathAnswer, setMathAnswer] = useState("");

  return (
    <div className="p-6">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Model Answer (Math)
      </label>

      <SmartMathEditor
        value={mathAnswer}
        onChange={(latex) => setMathAnswer(latex)}
        placeholder="Enter the correct answer..."
      />

      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Preview:</h4>
        <div
          className="border p-4 rounded bg-white"
          dangerouslySetInnerHTML={{
            __html: `<span class="math">\\[${mathAnswer}\\]</span>`,
          }}
        />
      </div>
    </div>
  );
}
