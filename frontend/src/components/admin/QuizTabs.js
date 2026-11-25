import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

/** Preview / Edit for one quiz - same bar on both pages. */
export default function QuizTabs({ id, active, light = false }) {
  const tabs = [
    ["preview", "Preview", Eye],
    ["edit", "Edit", Pencil],
  ];
  return (
    <nav className={`flex gap-1 rounded-xl p-1 w-fit ${light ? "bg-gray-100" : "bg-white/10"}`} aria-label="Quiz pages">
      {tabs.map(([k, l, Icon]) => {
        const on = active === k;
        return (
          <Link key={k} href={`/admin/quizzes/${id}/${k}`} aria-current={on ? "page" : undefined}
            style={on ? { background: "#20B8A6", color: "#080F1D" } : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              on ? "shadow-sm" : light ? "text-gray-600 hover:bg-white" : "text-indigo-100 hover:bg-white/10"
            }`}>
            <Icon className="w-4 h-4" /> {l}
          </Link>
        );
      })}
    </nav>
  );
}
