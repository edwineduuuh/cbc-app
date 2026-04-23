"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import {
  GraduationCap,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Sparkles,
  Copy,
  Users,
  BookOpen,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

export default function JoinClassroomPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (!authLoading && user?.role === "teacher") router.replace("/teacher");
  }, [user, authLoading, router]);

  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const previewClassroom = async (code) => {
    if (code.length < 8) return;

    try {
      const res = await fetch(`${API}/auth/classrooms/search/?q=${code}`);
      const data = await res.json();
      if (data.length > 0) {
        setPreview(data[0]);
      } else {
        setPreview(null);
      }
    } catch (error) {
      setPreview(null);
    }
  };

  const handleJoinCodeChange = (e) => {
    const value = e.target.value.toUpperCase();
    setJoinCode(value);
    previewClassroom(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem("accessToken");

    try {
      const res = await fetch(`${API}/auth/classrooms/join/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ join_code: joinCode }),
      });

      const data = await res.json();

      if (res.ok) {
        setToast({
          show: true,
          message: data.message,
          type: "success",
        });
        setTimeout(() => router.push("/student/my-classrooms"), 2000);
      } else {
        setToast({
          show: true,
          message: data.error || "Invalid join code",
          type: "error",
        });
      }
    } catch (error) {
      setToast({ show: true, message: "Network error", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-blue-100 hover:text-white mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
              <h1 className="text-4xl font-bold mb-3">Join a Classroom</h1>
              <p className="text-blue-100 text-lg">
                Enter the join code your teacher gave you
              </p>
            </motion.div>
          </div>
        </div>

        {/* Join Form */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden">
              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Join Code Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Enter Join Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={handleJoinCodeChange}
                        placeholder="e.g., MATH-9-9N-XK7P"
                        className="w-full px-4 py-4 text-center text-2xl font-mono font-bold tracking-wider border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none uppercase"
                        autoFocus
                      />
                      {joinCode.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setJoinCode("");
                            setPreview(null);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg"
                        >
                          <XCircle className="w-5 h-5 text-gray-400" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Codes are case-insensitive. Example: MATH-9-9N-XK7P
                    </p>
                  </div>

                  {/* Classroom Preview */}
                  {preview && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-green-800">
                          Classroom Found!
                        </h3>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-3xl">
                          {preview.subject_icon || "📚"}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900">
                            {preview.subject_name} - Grade {preview.grade}
                            {preview.name}
                          </h4>
                          <p className="text-gray-600 mt-1">
                            Teacher:{" "}
                            {preview.teacher_full_name || preview.teacher_name}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Users className="w-4 h-4" />
                              <span>{preview.student_count || 0} students</span>
                            </div>
                            {preview.description && (
                              <p className="text-sm text-gray-600">
                                • {preview.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    disabled={!joinCode || loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {loading ? "Joining..." : "Join Classroom"}
                  </Button>

                  {/* How it works */}
                  <div className="mt-8 pt-6 border-t">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      How to join:
                    </h3>
                    <ol className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0 mt-0.5">
                          1
                        </span>
                        <span>
                          Ask your teacher for the classroom join code
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0 mt-0.5">
                          2
                        </span>
                        <span>
                          Enter the code exactly as shown (including dashes)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0 mt-0.5">
                          3
                        </span>
                        <span>Click Join Classroom and you are in!</span>
                      </li>
                    </ol>
                  </div>
                </form>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
}
