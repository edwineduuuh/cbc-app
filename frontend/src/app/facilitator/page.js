"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import {
  ClipboardCheck, CalendarDays, FileText, NotebookPen, Library, BookOpen,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const TOOLS = [
  {
    href: "/facilitator/assessments",
    icon: ClipboardCheck,
    title: "Assessment generator",
    blurb: "Build an assessment for a strand or sub-strand, with a marking scheme.",
  },
  {
    href: "/facilitator/schemes",
    icon: CalendarDays,
    title: "Schemes of Work",
    blurb: "Plan a term week by week from the curriculum design.",
    soon: true,
  },
  {
    href: "/facilitator/plans",
    icon: FileText,
    title: "Lesson Plans",
    blurb: "Plan a lesson from a strand and sub-strand, ready to teach from.",
    soon: true,
  },
  {
    href: "/facilitator/records",
    icon: NotebookPen,
    title: "Records of Work",
    blurb: "Log the lessons you taught each week, from your scheme or from scratch.",
    soon: true,
  },
  {
    href: "/facilitator/library",
    icon: Library,
    title: "My Library",
    blurb: "Everything you have made. Open it again, edit it, or print it.",
  },
];

export default function FacilitatorHome() {
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    fetchWithAuth(`${API}/facilitator/library/?limit=4`)
      .then((r) => r.json())
      .then((d) => setRecent(d.results || []))
      .catch(() => setRecent([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Facilitators Portal</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Classroom tools built from the official KICD curriculum designs, by grade,
        strand and sub-strand.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map(({ href, icon: Icon, title, blurb, soon }) => {
          const card = (
            <div
              className={`h-full rounded-2xl border p-5 transition-colors ${
                soon
                  ? "border-gray-200 bg-gray-50"
                  : "border-gray-200 bg-white hover:border-emerald-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    soon ? "bg-gray-200" : "bg-emerald-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${soon ? "text-gray-400" : "text-emerald-700"}`} />
                </div>
                {soon && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                    Coming soon
                  </span>
                )}
              </div>
              <p className={`font-semibold text-sm ${soon ? "text-gray-500" : "text-gray-900"}`}>
                {title}
              </p>
              <p className="text-xs text-gray-500 mt-1">{blurb}</p>
            </div>
          );
          return soon ? (
            <div key={href} className="cursor-default">{card}</div>
          ) : (
            <Link key={href} href={href}>{card}</Link>
          );
        })}
      </div>

      {recent.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Recent</h2>
            <Link href="/facilitator/library" className="text-xs font-medium text-emerald-700 hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {recent.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/facilitator/library/${row.id}`}
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 hover:border-emerald-200 p-3"
                >
                  <BookOpen className="w-4 h-4 text-gray-300 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">{row.title}</span>
                    <span className="block text-xs text-gray-500 truncate">
                      {row.tool_display}
                      {row.grade ? ` · Grade ${row.grade}` : ""}
                      {row.subject ? ` · ${row.subject}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
