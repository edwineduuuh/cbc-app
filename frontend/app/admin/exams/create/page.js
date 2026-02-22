"use client";

import ExamBuilder from "@/components/ExamBuilder";
import { useRouter } from "next/navigation";

export default function CreateExamPage() {
  const router = useRouter();

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
