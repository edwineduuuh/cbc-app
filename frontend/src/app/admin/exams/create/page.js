"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ExamBuilder from "@/components/ExamBuilder";
import { useRouter } from "next/navigation";

const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

export default function CreateExamPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (
      !authLoading &&
      user &&
      !ALLOWED_ROLES.includes(user.role) &&
      !user.is_staff &&
      !user.is_superuser
    ) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSave = (examData) => {
    alert("Exam created! ID: " + examData.id);
    router.push("/admin/exams");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create New Exam</h1>
        <ExamBuilder onSave={handleSave} />
      </div>
    </div>
  );
}
