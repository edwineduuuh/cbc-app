"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function BulkUploadPage() {
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  // MathJax 
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.MathJax) {
      window.MathJax = {
        tex: { inlineMath: [["$", "$"]], displayMath: [["$$", "$$"]] },
      };
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Trigger MathJax when results appear
  useEffect(() => {
    if (result?.questions && window.MathJax) {
      window.MathJax.typesetPromise?.();
    }
  }, [result]);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);

      // NO AUTH - subjects is public
      const res = await fetch(`${API}/subjects/`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (Array.isArray(data)) {
        setSubjects(data);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      console.error("Failed to load subjects:", error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file || !subject || !grade) {
      alert("Please select file, subject, and grade");
      return;
    }

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", subject);
    formData.append("grade", grade);
    formData.append("action", "preview"); // ADD THIS

    try {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        alert("You must be logged in as admin to upload");
        setUploading(false);
        return;
      }

      const res = await fetch(`${API}/admin/bulk-upload/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setPreview(data.questions || []); // CHANGED - show preview instead of result
      } else {
        setResult({
          success: false,
          message: `❌ Upload failed: ${data.error || "Check if you're logged in as admin"}`,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `❌ Upload failed: ${error.message}`,
      });
    } finally {
      setUploading(false);
    }
  };
const handleConfirm = async () => {
  setUploading(true);

  const token = localStorage.getItem("accessToken");

  try {
    const res = await fetch(`${API}/admin/bulk-upload/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "confirm",
        subject,
        grade,
        questions: preview,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setResult({
        success: true,
        message: `✅ Successfully created ${data.questions_created} questions!`,
        questions: data.questions,
      });
      setPreview(null);
      setFile(null);
      document.getElementById("file-upload").value = "";
    }
  } catch (error) {
    setResult({
      success: false,
      message: `❌ Save failed: ${error.message}`,
    });
  } finally {
    setUploading(false);
  }
};

const deleteImage = (index) => {
  setPreview((prev) =>
    prev.map((q, i) => (i === index ? { ...q, image_base64: null } : q)),
  );
};

const uploadImage = (index, file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result.split(",")[1];
    setPreview((prev) =>
      prev.map((q, i) =>
        i === index
          ? {
              ...q,
              image_base64: base64,
              image_ext: file.name.split(".").pop(),
            }
          : q,
      ),
    );
  };
  reader.readAsDataURL(file);
};
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-emerald-900 mb-2">
            📤 Bulk Upload Exams
          </h1>
          <p className="text-emerald-700">
            Upload PDF, Word, or Image files - AI will extract questions
            automatically
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 p-8">
          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-2">
                Upload Exam File *
              </label>
              <div className="border-2 border-dashed border-emerald-300 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors cursor-pointer bg-emerald-50">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                  <p className="text-emerald-900 font-semibold mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-emerald-600">
                    PDF, Word, Images accepted
                  </p>
                  {file && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-lg">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span className="text-sm font-medium text-emerald-900">
                        {file.name}
                      </span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Subject & Grade */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-2">
                  Subject *
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:opacity-50"
                >
                  <option value="">
                    {loading ? "Loading..." : "Select Subject"}
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {!loading && subjects.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    No subjects found. Add subjects first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-2">
                  Grade *
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="">Select Grade</option>
                  {[4, 5, 6, 7, 8, 9, 10].map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || !subject || !grade || uploading}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Extracting questions...
                </span>
              ) : (
                "🚀 Upload & Extract Questions"
              )}
            </button>
          </div>
        </div>
        {/* PREVIEW & IMAGE MANAGEMENT */}
        {preview && (
          <div className="mt-6 bg-white rounded-2xl shadow-xl border-2 border-blue-100 p-8">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">
              Preview & Manage Images ({preview.length} questions)
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
              {preview.map((q, idx) => (
                <div
                  key={idx}
                  className="border-2 border-gray-200 rounded-xl p-4 flex gap-4"
                >
                  {/* Question */}
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 mb-1">
                      Q{idx + 1} • {q.question_type?.toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-900">{q.question_text}</p>
                  </div>

                  {/* Image Management */}
                  <div className="w-40 flex-shrink-0">
                    {q.image_base64 ? (
                      <div className="relative group">
                        <img
                          src={`data:image/${q.image_ext || "png"};base64,${q.image_base64}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-green-200"
                        />
                        <button
                          onClick={() => deleteImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition">
                        <Upload className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">
                          Upload Image
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => uploadImage(idx, e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={uploading}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 transition"
              >
                {uploading ? "Saving..." : `✓ Save ${preview.length} Questions`}
              </button>
            </div>
          </div>
        )}
        {/* Result */}
        {result && (
          <div
            className={`mt-6 rounded-2xl border-2 p-6 ${
              result.success
                ? "bg-green-50 border-green-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p
                  className={`font-bold text-lg mb-2 ${
                    result.success ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {result.message}
                </p>

                {result.success && result.questions && (
                  <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                    <p className="text-sm font-semibold text-green-800">
                      Questions Created ({result.questions.length}):
                    </p>
                    {result.questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg p-3 border border-green-200"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
                            {q.type?.toUpperCase() || "Q"}
                          </span>
                          {q.has_image && (
                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                              📷 IMAGE
                            </span>
                          )}
                          <p className="text-sm text-gray-900 flex-1">
                            <div
                              className="text-sm text-gray-900 flex-1"
                              dangerouslySetInnerHTML={{
                                __html: q.question_text,
                              }}
                            />
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-bold mb-2">Supported Formats:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>PDF files (regular or scanned)</li>
                <li>Word documents (.doc, .docx)</li>
                <li>Images (.png, .jpg, .jpeg)</li>
                <li>Text files (.txt)</li>
              </ul>
              <p className="mt-3">
                The AI will automatically detect question types, extract options
                for MCQs, and create marking schemes for structured questions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
