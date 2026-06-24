"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders Markdown (GitHub-flavoured: tables, lists, bold, etc.) with clean
 * Tailwind styling, then runs MathJax over the result so \( \) / $ $ math
 * typesets correctly.
 */
export default function Markdown({ children, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && typeof window !== "undefined" && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  }, [children]);

  return (
    <div ref={ref} className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
          // Tables — the main culprit in the screenshot
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
        {children}
      </ReactMarkdown>
    </div>
  );
}
