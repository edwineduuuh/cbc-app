"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import {
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

const API = "https://cbc-backend-76im.onrender.com/api";

export default function ClassroomSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id;

  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [formData, setFormData] = useState({
    name: "",
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
    if (user && classroomId) {
      fetchClassroom();
    }
  }, [user, classroomId]);

  const fetchClassroom = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/classrooms/${classroomId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClassroom(data);
        setFormData({
          name: data.name,
          description: data.description || "",
          is_active: data.is_active,
        });
      } else {
        router.push("/teacher/classrooms");
      }
    } catch (error) {
      console.error("Failed to fetch classroom:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/classrooms/${classroomId}/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setToast({
          show: true,
          message: "Classroom updated successfully!",
          type: "success",
        });
        setTimeout(
          () => router.push(`/teacher/classrooms/${classroomId}`),
          1500,
        );
      } else {
        const data = await res.json();
        setToast({
          show: true,
          message: data.error || "Failed to update",
          type: "error",
        });
      }
    } catch (error) {
      setToast({ show: true, message: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this classroom? This cannot be undone.",
      )
    )
      return;

    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/classrooms/${classroomId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setToast({
          show: true,
          message: "Classroom deleted",
          type: "success",
        });
        setTimeout(() => router.push("/teacher/classrooms"), 1500);
      }
    } catch (error) {
      setToast({ show: true, message: "Failed to delete", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!classroom) return null;

  return (
    <>
      <Toast {...toast} onClose={() => setToast({ ...toast, show: false })} />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Link
              href={`/teacher/classrooms/${classroomId}`}
              className="inline-flex items-center gap-2 text-emerald-100 hover:text-white mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Classroom
            </Link>
            <h1 className="text-4xl font-bold">Classroom Settings</h1>
            <p className="text-emerald-100 text-lg mt-2">
              {classroom.subject_name} - Grade {classroom.grade}
              {classroom.name}
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Class Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value.toUpperCase(),
                    })
                  }
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600"
                  />
                  <label htmlFor="is_active" className="text-gray-700">
                    <span className="font-semibold">Classroom Active</span>
                    <span className="text-sm text-gray-500 ml-2">
                      Students can join and see quizzes
                    </span>
                  </label>
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={saving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleDelete}
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Classroom
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
}
