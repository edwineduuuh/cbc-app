"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = "http://127.0.0.1:8000/api";

export default function AdminExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const res = await fetch(`${API}/admin/quizzes/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const data = await res.json();
      setExams(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error("Failed to load exams:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Exams</h1>
          <Link href="/admin/exams/create">
            <button className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700">
              + Create New Exam
            </button>
          </Link>
        </div>

        {exams.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-gray-600 mb-4">No exams created yet</p>
            <Link href="/admin/exams/create">
              <button className="px-6 py-3 bg-emerald-600 text-white rounded-lg">
                Create Your First Exam
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-xl p-6 shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {exam.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {exam.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Grade {exam.grade}</span>
                      <span>•</span>
                      <span>{exam.subject_name}</span>
                      <span>•</span>
                      <span>
                        {exam.total_questions || exam.questions?.length || 0}{" "}
                        questions
                      </span>
                      <span>•</span>
                      <span>{exam.duration_minutes} mins</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/exams/${exam.id}/edit`}>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        Edit
                      </button>
                    </Link>
                    <button
                      onClick={() => router.push(`/quizzes/${exam.id}`)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
