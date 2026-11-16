"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";
import { Bookmark, Loader2, Search, Trash2, FileText } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

const TOOLS = [
  { value: "", label: "All" },
  { value: "assessment", label: "Assessments" },
  { value: "scheme_of_work", label: "Schemes" },
  { value: "lesson_plan", label: "Lesson plans" },
  { value: "lesson_notes", label: "Lesson notes" },
  { value: "record_of_work", label: "Records of work" },
];

function when(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export default function LibraryPage() {
  const [rows, setRows] = useState([]);
  const [tool, setTool] = useState("");
  const [onlyMarked, setOnlyMarked] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tool) params.set("tool", tool);
    if (onlyMarked) params.set("bookmarked", "1");
    if (q.trim()) params.set("q", q.trim());
    try {
      const r = await fetchWithAuth(`${API}/facilitator/library/?${params}`);
      const d = await r.json();
      setRows(d.results || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tool, onlyMarked, q]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const toggleMark = async (row) => {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, bookmarked: !r.bookmarked } : r)));
    try {
      await fetchWithAuth(`${API}/facilitator/library/${row.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ bookmarked: !row.bookmarked }),
      });
    } catch {
      load(); // put it back if the server disagreed
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    try {
      await fetchWithAuth(`${API}/facilitator/library/${row.id}/`, { method: "DELETE" });
    } catch {
      load();
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">My Library</h1>
      <p className="text-sm text-gray-500 mt-1 mb-5">
        Everything you have made. Open it again, edit it, or print it.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title or sub-strand"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={tool}
          onChange={(e) => setTool(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
        >
          {TOOLS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button
          onClick={() => setOnlyMarked((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm ${
            onlyMarked
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-gray-200 bg-white text-gray-600"
          }`}
        >
          <Bookmark className={`w-4 h-4 ${onlyMarked ? "fill-emerald-600" : ""}`} />
          Saved
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 text-center">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Nothing here yet.</p>
          <Link
            href="/facilitator/assessments"
            className="inline-block mt-3 text-sm font-semibold text-emerald-700 hover:underline"
          >
            Generate your first assessment
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="bg-white rounded-xl border border-gray-200 hover:border-emerald-200">
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggleMark(row)}
                  aria-label={row.bookmarked ? "Remove from saved" : "Save"}
                  className="shrink-0 text-gray-300 hover:text-emerald-600"
                >
                  <Bookmark className={`w-4 h-4 ${row.bookmarked ? "fill-emerald-600 text-emerald-600" : ""}`} />
                </button>

                <Link href={`/facilitator/library/${row.id}`} className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{row.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {row.tool_display}
                    {row.grade ? ` · Grade ${row.grade}` : ""}
                    {row.subject ? ` · ${row.subject}` : ""}
                    {row.substrand ? ` · ${row.substrand}` : ""}
                  </p>
                </Link>

                <span className="hidden sm:block text-xs text-gray-400 shrink-0">
                  {row.edited_at ? `edited ${when(row.edited_at)}` : when(row.created_at)}
                </span>

                <button
                  onClick={() => remove(row)}
                  aria-label="Delete"
                  className="shrink-0 p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
