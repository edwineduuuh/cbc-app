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
  Plus,
  Users,
  BookOpen,
  Copy,
  CheckCircle,
  XCircle,
  Search,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Clock,
  RefreshCw,
} from "lucide-react";

const API = "https://cbc-backend-76im.onrender.com/api";

export default function TeacherClassroomsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [copiedCode, setCopiedCode] = useState(null);

 useEffect(() => {
   if (!authLoading) {
     if (!user) {
       router.push("/login");
       return;
     }

     // ALLOW both teacher AND admin
     if (user.role !== "teacher" && user.role !== "admin") {
       router.push("/dashboard");
       return;
     }

     // If we get here, user is teacher or admin - PROCEED!
     console.log("✅ Teacher/Admin access granted:", user.role);
   }
 }, [user, authLoading, router]);
    
useEffect(() => {
  if (user) {
    fetchClassrooms();
    fetchSubjects();
  }
}, [user]);

// 👇 ADD THIS NEW DEBUG useEffect
useEffect(() => {
  console.log("📦 classrooms state updated:", classrooms);
  console.log("📏 length:", classrooms.length);
  console.log("🖼️ first item:", classrooms[0]);
}, [classrooms]);

useEffect(() => {
  if (!authLoading && !user) router.push("/login");
  if (user?.role !== "teacher" && user?.role !== "admin") {
    router.push("/dashboard");
  }
}, [user, authLoading]);

  const fetchClassrooms = async () => {
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/classrooms/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setClassrooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch classrooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    const res = await fetch(`${API}/subjects/`);
    const data = await res.json();
    setSubjects(data);
  };

  const copyJoinCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setToast({
      show: true,
      message: "Join code copied to clipboard! 📋",
      type: "success",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteClassroom = async (id, name) => {
    if (
      !confirm(
        `Are you sure you want to delete ${name}? This cannot be undone.`,
      )
    )
      return;

    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/classrooms/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setToast({
          show: true,
          message: "Classroom deleted successfully",
          type: "success",
        });
        fetchClassrooms();
      }
    } catch (error) {
      setToast({
        show: true,
        message: "Failed to delete classroom",
        type: "error",
      });
    }
  };

  const getSubjectIcon = (subjectId) => {
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.icon || "📚";
  };

  const stats = {
    total: classrooms.length,
    active: classrooms.filter((c) => c.is_active).length,
    totalStudents: classrooms.reduce(
      (acc, c) => acc + (c.student_count || 0),
      0,
    ),
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">My Classrooms</h1>
                  <p className="text-emerald-100 text-lg mt-1">
                    Manage your classes and students
                  </p>
                </div>
              </div>
              <Link href="/teacher/classrooms/create">
                <Button className="bg-white text-emerald-700 hover:bg-emerald-50 border-0">
                  <Plus className="w-4 h-4 mr-2" />
                  New Classroom
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Total Classes
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats.total}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Active Classes
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats.active}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Total Students
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats.totalStudents}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Classrooms Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
            </div>
          ) : classrooms.length === 0 ? (
            <Card className="text-center py-20">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No Classrooms Yet
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Create your first classroom and share the join code with your
                students
              </p>
              <Link href="/teacher/classrooms/create">
                <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Classroom
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classrooms.map((classroom, index) => (
                <motion.div
                  key={classroom.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/teacher/classrooms/${classroom.id}`}>
                    <Card
                      hover
                      className="h-full cursor-pointer relative overflow-hidden group"
                    >
                      {/* Status Badge */}
                      <div className="absolute top-4 right-4">
                        {classroom.is_active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="p-6">
                        {/* Subject Icon & Name */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-2xl">
                            {getSubjectIcon(classroom.subject)}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">
                              {classroom.subject_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Grade {classroom.grade}
                              {classroom.name}
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        {classroom.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {classroom.description}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{classroom.student_count || 0} students</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {new Date(
                                classroom.created_at,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Join Code */}
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">
                            Join Code
                          </p>
                          <div className="flex items-center justify-between">
                            <code className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                              {classroom.join_code}
                            </code>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                copyJoinCode(classroom.join_code);
                              }}
                              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              {copiedCode === classroom.join_code ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* View Details */}
                        <div className="mt-4 flex items-center justify-end text-emerald-600 font-medium text-sm group-hover:text-emerald-700">
                          View Classroom
                          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
