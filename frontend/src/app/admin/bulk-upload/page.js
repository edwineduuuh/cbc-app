"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "@/components/ui/Toast";
import {
  Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2,
  ArrowLeft, Trash2, Image as ImageIcon, BookOpen, GraduationCap,
  ChevronDown, ChevronRight, Eye, Download, RefreshCw, X, Zap,
  FileImage, File, Hash,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-production-8bc4.up.railway.app/api";
const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];
const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const ACCEPTED_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt";

export default function BulkUploadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  // MathJax
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.MathJax) {
      window.MathJax = { tex: { inlineMath: [["$", "$"]], displayMath: [["$$", "$$"]] } };
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (result?.questions && window.MathJax) {
      window.MathJax.typesetPromise?.();
    }
  }, [result]);

  // Load subjects — public endpoint, plain fetch avoids auth-redirect on token issues
  useEffect(() => {
    if (authLoading || !user) return;
    const load = async () => {
      setSubjectsLoading(true);
      try {
        const res = await fetch(`${API}/subjects/`);
        if (res.ok) {
          const data = await res.json();
          setSubjects(Array.isArray(data) ? data : data.results || []);
        } else {
          showToast("Failed to load learning areas. Please refresh.", "error");
        }
      } catch (err) {
        console.error("Failed to load subjects:", err);
        showToast("Could not reach server. Please refresh.", "error");
      } finally {
        setSubjectsLoading(false);
      }
    };
    load();
  }, [authLoading, user]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      const ext = f.name.toLowerCase().split(".").pop();
      if (["pdf", "doc", "docx", "png", "jpg", "jpeg", "txt"].includes(ext)) {
        setFile(f);
        setResult(null);
      } else {
        showToast("Unsupported file type", "error");
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !subject || !grade) {
      showToast("Please select a file, learning area, and grade", "error");
      return;
    }

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", subject);
    formData.append("grade", grade);

    try {
      const res = await fetchWithAuth(`${API}/admin/bulk-upload/`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          questionsCreated: data.questions_created || 0,
          imagesExtracted: data.images_extracted || 0,
          questions: data.questions || [],
          errors: data.errors || [],
        });
        showToast(`Successfully created ${data.questions_created} questions!`);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setResult({
          success: false,
          error: data.error || "Upload failed. Check if you have admin permissions.",
          rawPreview: data.raw_text_preview || null,
        });
        showToast(data.error || "Upload failed", "error");
      }
    } catch (error) {
      setResult({
        success: false,
        error: `Network error: ${error.message}`,
      });
      showToast("Upload failed: " + error.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setResult(null);
    setSubject("");
    setGrade("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-10 h-10 text-gray-400" />;
    const ext = file.name.toLowerCase().split(".").pop();
    if (["pdf"].includes(ext)) return <File className="w-10 h-10 text-red-500" />;
    if (["doc", "docx"].includes(ext)) return <FileText className="w-10 h-10 text-blue-500" />;
    if (["png", "jpg", "jpeg"].includes(ext)) return <FileImage className="w-10 h-10 text-purple-500" />;
    return <FileText className="w-10 h-10 text-gray-500" />;
  };

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }
  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.show} onClose={() => setToast((t) => ({ ...t, show: false }))} />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/admin")} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Bulk Upload</h1>
                <p className="text-sm text-gray-500">Upload exams &mdash; AI extracts questions automatically</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* How it works */}
          <div className="bg-linear-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-100 p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">How It Works</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Upload a PDF, Word document, or image of an exam paper. Our AI will automatically extract each question,
                  detect question types (MCQ, structured, math), extract embedded images, and create them in your question bank.
                </p>
              </div>
            </div>
          </div>

          {/* Upload Card */}
          <div className="bg-white rounded-xl border p-6 space-y-5">
            {/* File Drop Zone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam File *</label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  dragActive ? "border-emerald-500 bg-emerald-50" : file ? "border-emerald-300 bg-emerald-50/50" : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50"
                }`}
              >
                <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} onChange={handleFileChange} className="hidden" />
                {getFileIcon()}
                {file ? (
                  <div className="mt-3 text-center">
                    <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); if(fileInputRef.current) fileInputRef.current.value=""; }} className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium">Remove file</button>
                  </div>
                ) : (
                  <div className="mt-3 text-center">
                    <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, Word, Images, or Text files</p>
                  </div>
                )}
              </div>
            </div>

            {/* Subject & Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Learning Area *</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={subjectsLoading} className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60">
                  <option value="">{subjectsLoading ? "Loading..." : "Select Learning Area"}</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                  <option value="">Select Grade</option>
                  {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || !subject || !grade || uploading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {uploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Extracting questions with AI...</>
              ) : (
                <><Upload className="w-5 h-5" />Upload &amp; Extract Questions</>
              )}
            </button>
          </div>

          {/* Progress indicator during upload */}
          {uploading && (
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Processing your file...</h3>
                  <p className="text-sm text-gray-500">This may take 15-60 seconds depending on file size</p>
                </div>
              </div>
              <div className="space-y-2">
                <StepIndicator step="Extracting text &amp; images from file" status="active" />
                <StepIndicator step="AI analyzing and parsing questions" status="pending" />
                <StepIndicator step="Creating questions in database" status="pending" />
              </div>
            </div>
          )}

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {result.success ? (
                  <div className="space-y-4">
                    {/* Success Banner */}
                    <div className="bg-green-50 rounded-xl border border-green-200 p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-green-900">Upload Successful!</h3>
                          <div className="flex flex-wrap gap-4 mt-2">
                            <Stat label="Questions Created" value={result.questionsCreated} color="text-green-700" />
                            <Stat label="Images Extracted" value={result.imagesExtracted} color="text-blue-700" />
                            {result.errors?.length > 0 && <Stat label="Errors" value={result.errors.length} color="text-red-600" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Created Questions List */}
                    {result.questions?.length > 0 && (
                      <div className="bg-white rounded-xl border p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-emerald-500" />
                          Created Questions ({result.questions.length})
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {result.questions.map((q, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded shrink-0">
                                {q.type?.toUpperCase() || "Q"}
                              </span>
                              {q.has_image && (
                                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded shrink-0 flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />IMG
                                </span>
                              )}
                              <p className="text-sm text-gray-900 flex-1 line-clamp-2">{q.question_text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {result.errors?.length > 0 && (
                      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                        <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Some questions had errors ({result.errors.length})
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {result.errors.map((err, idx) => (
                            <div key={idx} className="text-sm text-red-700 bg-red-100/50 rounded-lg p-3">
                              <span className="font-medium">Q{err.question_number}:</span> {err.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button onClick={resetAll} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                        <Upload className="w-4 h-4" />Upload Another
                      </button>
                      <button onClick={() => router.push("/admin/questions")} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Eye className="w-4 h-4" />View Questions
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Error Result */
                  <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                        <XCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-red-900">Upload Failed</h3>
                        <p className="text-sm text-red-700 mt-1">{result.error}</p>
                        {result.rawPreview && (
                          <details className="mt-3">
                            <summary className="text-xs text-red-600 cursor-pointer font-medium">Show extracted text preview</summary>
                            <pre className="mt-2 text-xs text-red-800 bg-red-100/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-48">{result.rawPreview}</pre>
                          </details>
                        )}
                        <button onClick={resetAll} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-800">
                          <RefreshCw className="w-4 h-4" />Try again
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Supported Formats */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />Supported Formats &amp; Tips
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormatCard icon={<File className="w-5 h-5 text-red-500" />} title="PDF Files" desc="Regular or scanned PDFs. Scanned docs use AI vision for text extraction." />
              <FormatCard icon={<FileText className="w-5 h-5 text-blue-500" />} title="Word Documents" desc=".doc and .docx files. Images embedded in the document are auto-extracted." />
              <FormatCard icon={<FileImage className="w-5 h-5 text-purple-500" />} title="Images" desc="PNG, JPG, JPEG photos of exam papers. AI reads text directly from image." />
              <FormatCard icon={<FileText className="w-5 h-5 text-gray-500" />} title="Text Files" desc="Plain .txt files with questions. Best for already-typed content." />
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Pro tip:</span> For best results, use clear, well-formatted exam papers. 
                The AI auto-detects MCQs (A/B/C/D), structured questions, math equations (LaTeX), and embedded diagrams.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Sub-components
function StepIndicator({ step, status }) {
  return (
    <div className="flex items-center gap-3">
      {status === "active" ? (
        <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
      ) : status === "done" ? (
        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
      )}
      <span className={`text-sm ${status === "active" ? "text-blue-700 font-medium" : status === "done" ? "text-green-700" : "text-gray-400"}`}>{step}</span>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-sm text-gray-600 ml-1.5">{label}</span>
    </div>
  );
}

function FormatCard({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
