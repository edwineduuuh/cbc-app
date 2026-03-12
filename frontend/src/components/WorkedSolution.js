"use client";
import { useEffect } from "react";

export default function WorkedSolution({ steps, answer }) {
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
    } else {
      window.MathJax.typesetPromise?.();
    }
  }, [steps]);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-xl p-6 mt-4">
      <h4 className="text-yellow-500 font-bold text-sm uppercase tracking-wider mb-4">
        📐 Worked Solution
      </h4>
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full border border-yellow-500/50 text-yellow-500 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                {step.label}
              </div>
              <div className="text-white text-base leading-loose">
                {`$$${step.latex}$$`}
              </div>
            </div>
          </div>
        ))}
      </div>
      {answer && (
        <div className="mt-6 pt-4 border-t border-gray-700 flex items-center justify-between">
          <div className="text-xs text-gray-400 uppercase tracking-wider">
            Answer
          </div>
          <div className="text-2xl font-bold text-yellow-500">{answer}</div>
        </div>
      )}
    </div>
  );
}
