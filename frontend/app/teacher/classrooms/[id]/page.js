"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import {
  Users,
  BookOpen,
  Copy,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Settings,
  UserMinus,
  RefreshCw,
  Download,
  Mail,
  GraduationCap,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";

const API = "http://127.0.0.1:8000/api";

export default function ClassroomDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id;

  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (user?.role !== "teacher" && user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user && classroomId) {
      fetchClassroom();
    }
  }, [user, classroomId]);

  const fetchClassroom = async () => {
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/classrooms/${classroomId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClassroom(data);
      } else {
        router.push("/teacher/classrooms");
      }
    } catch (error) {
      console.error("Failed to fetch classroom:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyJoinCode = () => {
    navigator.clipboard.writeText(classroom.join_code);
    setCopied(true);
    setToast({
      show: true,
      message: "Join code copied to clipboard! 📋",
      type: "success",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateJoinCode = async () => {
    if (
      !confirm(
        "⚠️ This will invalidate the current join code. Students will need the new code to join. Continue?",
      )
    )
      return;

    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(
        `${API}/classrooms/${classroomId}/regenerate-code/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirm: true }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        setClassroom({ ...classroom, join_code: data.new_code });
        setToast({
          show: true,
          message: "New join code generated! 🔐",
          type: "success",
        });
      }
    } catch (error) {
      setToast({
        show: true,
        message: "Failed to regenerate code",
        type: "error",
      });
    }
  };

  const removeStudent = async (studentId, studentName) => {
    if (!confirm(`Remove ${studentName} from this class?`)) return;

    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(
        `${API}/classrooms/${classroomId}/students/${studentId}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        setToast({
          show: true,
          message: `${studentName} removed from class`,
          type: "success",
        });
        fetchClassroom();
      }
    } catch (error) {
      setToast({
        show: true,
        message: "Failed to remove student",
        type: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (!classroom) return null;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Link
                href="/teacher/classrooms"
                className="inline-flex items-center gap-2 text-emerald-100 hover:text-white mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Classrooms
              </Link>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl">
                    {classroom.subject_icon || "📚"}
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold">
                      {classroom.subject_name} - Grade {classroom.grade}
                      {classroom.name}
                    </h1>
                    <p className="text-emerald-100 text-lg mt-1">
                      {classroom.description || "No description"}
                    </p>
                  </div>
                </div>
                <Link href={`/teacher/classrooms/${classroomId}/settings`}>
                  <Button className="bg-white/20 hover:bg-white/30 text-white border-0">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Join Code & Stats */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="sticky top-24">
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-emerald-600" />
                      Join Information
                    </h2>

                    {/* Join Code */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 mb-6">
                      <p className="text-sm text-gray-600 mb-2">
                        Share this code with students
                      </p>
                      <div className="flex items-center gap-3 mb-4">
                        <code className="flex-1 font-mono text-2xl font-bold text-emerald-700 bg-white px-4 py-3 rounded-xl border-2 border-emerald-200 text-center tracking-wider">
                          {classroom.join_code}
                        </code>
                        <button
                          onClick={copyJoinCode}
                          className="p-3 bg-white hover:bg-emerald-50 rounded-xl border-2 border-emerald-200 transition-colors"
                        >
                          {copied ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <Copy className="w-6 h-6 text-emerald-600" />
                          )}
                        </button>
                      </div>

                      <button
                        onClick={regenerateJoinCode}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-xl border-2 border-gray-200 text-sm text-gray-700 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Generate New Code
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Total Students
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {classroom.students?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Assigned Quizzes
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              0
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Created</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(
                                classroom.created_at,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Quick Actions
                      </h3>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Email Join Code to Class
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Student List
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Students List */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-600" />
                        Enrolled Students
                        <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                          {classroom.students?.length || 0}
                        </span>
                      </h2>
                    </div>

                    {classroom.students?.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-2xl">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                          No students yet
                        </h3>
                        <p className="text-gray-500 mb-4">
                          Share the join code with your students to get started
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-lg">
                          <code className="font-mono font-bold text-emerald-700">
                            {classroom.join_code}
                          </code>
                          <button
                            onClick={copyJoinCode}
                            className="p-1 hover:bg-emerald-200 rounded"
                          >
                            <Copy className="w-4 h-4 text-emerald-700" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {classroom.students.map((student, index) => (
                          <motion.div
                            key={student.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                                {student.first_name?.[0] ||
                                  student.username[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {student.first_name} {student.last_name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {student.email}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  @{student.username} • Grade {student.grade}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                removeStudent(
                                  student.id,
                                  student.first_name || student.username,
                                )
                              }
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <UserMinus className="w-5 h-5" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
