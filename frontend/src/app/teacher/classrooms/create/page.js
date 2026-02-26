"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import {
  GraduationCap,
  BookOpen,
  Users,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  X,
} from "lucide-react";

const API = "https://cbc-backend-76im.onrender.com/api";

export default function CreateClassroomPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    subject: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (user?.role !== "teacher" && user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const res = await fetch(`${API}/subjects/`);
    const data = await res.json();
    setSubjects(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!formData.name.trim()) {
      setToast({
        show: true,
        message: "Class name is required",
        type: "error",
      });
      setLoading(false);
      return;
    }
    if (!formData.grade) {
      setToast({ show: true, message: "Please select a grade", type: "error" });
      setLoading(false);
      return;
    }
    if (!formData.subject) {
      setToast({
        show: true,
        message: "Please select a subject",
        type: "error",
      });
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("accessToken");

    try {
      const res = await fetch(`${API}/classrooms/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.toUpperCase(),
          grade: parseInt(formData.grade),
          subject: parseInt(formData.subject),
          description: formData.description,
          is_active: formData.is_active,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setToast({
          show: true,
          message: "🎉 Classroom created successfully!",
          type: "success",
        });
        setTimeout(() => router.push("/teacher/classrooms"), 2000);
      } else {
        setToast({
          show: true,
          message: data.error || "Failed to create classroom",
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

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
              <h1 className="text-4xl font-bold mb-3">Create Classroom</h1>
              <p className="text-emerald-100 text-lg">
                Set up a new class and get your unique join code
              </p>
            </motion.div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden">
              <form onSubmit={handleSubmit} className="p-8">
                <div className="space-y-6">
                  {/* Class Name & Grade */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Class Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            name: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="e.g., 9N, 8A, 7B"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none uppercase"
                        maxLength="10"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Example: 9N, 8A, 7B, 6M
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Grade Level <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.grade}
                        onChange={(e) =>
                          setFormData({ ...formData, grade: e.target.value })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                      >
                        <option value="">Select Grade</option>
                        {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                          <option key={g} value={g}>
                            Grade {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.icon} {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description{" "}
                      <span className="text-gray-500 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="e.g., Morning class, Advanced group, Remedial session..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none resize-none"
                    />
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="is_active" className="text-gray-700">
                      <span className="font-semibold">
                        Activate immediately
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        Students can join right away
                      </span>
                    </label>
                  </div>

                  {/* Preview Card */}
                  {formData.name && formData.grade && formData.subject && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-semibold text-emerald-900">
                          Preview
                        </h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-2xl">
                          {subjects.find((s) => s.id == formData.subject)
                            ?.icon || "📚"}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {
                              subjects.find((s) => s.id == formData.subject)
                                ?.name
                            }{" "}
                            - Grade {formData.grade}
                            {formData.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Join code will be generated automatically
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-4 pt-6 border-t">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={loading}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      {loading ? "Creating..." : "Create Classroom"}
                    </Button>
                    <Link href="/teacher/classrooms" className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </Link>
                  </div>
                </div>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
}
