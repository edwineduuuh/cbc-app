"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/** Normalise LaTeX delimiters to the $-form that remark-math understands, so
 * both new content and older cached content (which used \( \) / \[ \]) render. */
function normalizeMath(s) {
  return String(s || "")
    .replace(/\\\[/g, "$$$$")
    .replace(/\\\]/g, "$$$$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");
}

/**
 * Renders Markdown (GFM tables/lists/bold) with real math rendered by KaTeX.
 * KaTeX renders synchronously in React, so there's no MathJax timing race.
 */
export default function Markdown({ children, className = "" }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          h1: (p) => <h1 className="mt-3 mb-2 text-xl font-bold" {...p} />,
          h2: (p) => <h2 className="mt-3 mb-2 text-lg font-bold" {...p} />,
          h3: (p) => <h3 className="mt-2 mb-1 text-base font-semibold" {...p} />,
          p: (p) => <p className="my-2 leading-relaxed" {...p} />,
          ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5" {...p} />,
          ol: (p) => <ol className="my-2 list-decimal space-y-1 pl-5" {...p} />,
          li: (p) => <li className="leading-relaxed" {...p} />,
          strong: (p) => <strong className="font-semibold" {...p} />,
          a: (p) => (
            <a className="text-indigo-600 underline" target="_blank" rel="noreferrer" {...p} />
          ),
          code: (p) => (
            <code
              className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/10"
              {...p}
            />
          ),
          blockquote: (p) => (
            <blockquote
              className="my-2 border-l-4 border-gray-300 pl-3 italic text-gray-600 dark:border-gray-600 dark:text-gray-300"
              {...p}
            />
          ),
          table: (p) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...p} />
            </div>
          ),
          thead: (p) => <thead className="bg-gray-100 dark:bg-gray-700/50" {...p} />,
          th: (p) => (
            <th
              className="border border-gray-300 px-3 py-1.5 text-left font-semibold dark:border-gray-600"
              {...p}
            />
          ),
          td: (p) => (
            <td className="border border-gray-300 px-3 py-1.5 dark:border-gray-600" {...p} />
          ),
          hr: () => <hr className="my-3 border-gray-200 dark:border-gray-700" />,
        }}
      >
        {normalizeMath(children)}
      </ReactMarkdown>
    </div>
  );
}
