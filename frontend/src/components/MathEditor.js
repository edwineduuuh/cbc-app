"use client";
import { useState, useEffect } from "react";

export default function MathEditor({
  value,
  onChange,
  placeholder = "Type question here...",
}) {
  const [preview, setPreview] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.MathJax) {
      window.MathJax = {
        tex: { inlineMath: [["$", "$"]], displayMath: [["$$", "$$"]] },
      };
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (showPreview && window.MathJax) {
      window.MathJax.typesetPromise?.();
    }
  }, [preview, showPreview]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    setPreview(newValue);
  };

  const insertMath = (template) => {
    const textarea = document.getElementById("math-textarea");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value || "";
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newValue = before + template + after;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + template.length,
        start + template.length,
      );
    }, 0);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-100 border-b p-2 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => insertMath("$  $")}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm"
          title="Inline math"
        >
          $ $
        </button>
        <button
          type="button"
          onClick={() => insertMath("$$  $$")}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm"
          title="Display math"
        >
          $$ $$
        </button>
        <button
          type="button"
          onClick={() => insertMath("\\frac{}{}")}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm"
          title="Fraction"
        >
          a/b
        </button>
        <button
          type="button"
          onClick={() => insertMath("^{}")}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm"
          title="Exponent"
        >
          x²
        </button>
        <button
          type="button"
          onClick={() => insertMath("_{}")}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm"
          title="Subscript"
        >
          x₁
        </button>
        <button
          type="button"
          onClick={() => insertMath("\\sqrt{}")}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm"
          title="Square root"
        >
          √
        </button>
        <button
          type="button"
          onClick={() => insertMath("\\theta")}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm"
          title="Greek letter theta"
        >
          θ
        </button>
        <button
          type="button"
          onClick={() => insertMath("\\pi")}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm"
          title="Pi"
        >
          π
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1 border rounded text-sm ${
              showPreview
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <textarea
        id="math-textarea"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full p-4 font-mono text-sm resize-none focus:outline-none"
        rows={6}
        style={{ fontFamily: "monospace" }}
      />

      {/* Preview */}
      {showPreview && (
        <div className="border-t bg-gray-50 p-4">
          <div className="text-xs text-gray-600 uppercase mb-2">Preview:</div>
          <div
            className="bg-white p-4 rounded border"
            dangerouslySetInnerHTML={{
              __html:
                preview ||
                '<span class="text-gray-400">Nothing to preview</span>',
            }}
          />
        </div>
      )}

      {/* Help */}
      <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-600">
        <strong>Quick guide:</strong> Inline math: <code>$x^2$</code> → x² |
        Display:{" "}
        <code>
          $$\frac{a}
          {b}$$
        </code>{" "}
        → centered fraction | Greek: <code>\alpha</code>, <code>\theta</code>,{" "}
        <code>\pi</code>
      </div>
    </div>
  );
}
