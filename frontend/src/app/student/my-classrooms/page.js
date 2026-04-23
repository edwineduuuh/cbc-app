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
  BookOpen,
  Users,
  Plus,
  LogOut,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

export default function MyClassroomsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (!authLoading && user?.role === "teacher") {
      router.replace("/teacher");
    } else if (!authLoading && user && user.role !== "student") {
      router.replace("/dashboard");
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchMyClassrooms();
    }
  }, [user]);

  const fetchMyClassrooms = async () => {
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/auth/my-classrooms/`, {
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

  const leaveClassroom = async (classroomId, className) => {
    if (!confirm(`Are you sure you want to leave ${className}?`)) return;

    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/auth/classrooms/leave/${classroomId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setToast({
          show: true,
          message: `You left ${className}`,
          type: "success",
        });
        fetchMyClassrooms();
      }
    } catch (error) {
      setToast({
        show: true,
        message: "Failed to leave classroom",
        type: "error",
      });
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
                  <p className="text-blue-100 text-lg mt-1">
                    Your enrolled classes
                  </p>
                </div>
              </div>
              <Link href="/student/join-classroom">
                <Button className="bg-white text-blue-700 hover:bg-blue-50 border-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Join New Class
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Classrooms Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-20">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : classrooms.length === 0 ? (
            <Card className="text-center py-20">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No Classrooms Yet
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Ask your teacher for a join code to get started
              </p>
              <Link href="/student/join-classroom">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Join a Classroom
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
                  <Card className="h-full relative overflow-hidden group">
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
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-2xl">
                          {classroom.subject_icon || "📚"}
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

                      {/* Teacher Info */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <Users className="w-4 h-4" />
                        <span>
                          Teacher:{" "}
                          {classroom.teacher_full_name ||
                            classroom.teacher_name}
                        </span>
                      </div>

                      {/* Description */}
                      {classroom.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {classroom.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{classroom.student_count} students</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Joined{" "}
                            {new Date(
                              classroom.created_at,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <Link href={`/quizzes?classroom=${classroom.id}`}>
                          <Button variant="outline" size="sm">
                            <BookOpen className="w-4 h-4 mr-2" />
                            View Quizzes
                          </Button>
                        </Link>
                        <button
                          onClick={() =>
                            leaveClassroom(
                              classroom.id,
                              `${classroom.subject_name} - Grade ${classroom.grade}${classroom.name}`,
                            )
                          }
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
