"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { Plus, Pencil, Trash2, X, Save, BookOpen, Search } from "lucide-react";
import Toast from "@/components/ui/Toast";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

const PASSAGE_TYPES = [
  { value: "prose", label: "Prose" },
  { value: "poem", label: "Poem" },
  { value: "dialogue", label: "Dialogue" },
  { value: "excerpt", label: "Excerpt" },
  { value: "article", label: "Article" },
  { value: "cloze", label: "Broken Passage / Cloze" },
];

const BLANK = {
  title: "",
  content: "",
  passage_type: "prose",
  subject: "",
  grade: "",
  author: "",
};

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function PassagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [passages, setPassages] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = create mode, object = edit mode
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = (message, type = "success") =>
    setToast({ visible: true, message, type });

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (!authLoading && user && !ALLOWED_ROLES.includes(user.role) && !user.is_staff && !user.is_superuser) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      fetchWithAuth(`${API}/subjects/`),
      fetchWithAuth(`${API}/admin/passages/`),
    ]).then(async ([subRes, passRes]) => {
      if (subRes.ok) {
        const d = await subRes.json();
        setSubjects(Array.isArray(d) ? d : d.results || []);
      }
      if (passRes.ok) {
        const d = await passRes.json();
        setPassages(Array.isArray(d) ? d : d.results || []);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [authLoading, user]); // eslint-disable-line

  const loadPassages = async () => {
    const params = new URLSearchParams();
    if (filterSubject) params.set("subject", filterSubject);
    if (filterGrade) params.set("grade", filterGrade);
    if (search) params.set("search", search);
    const res = await fetchWithAuth(`${API}/admin/passages/?${params}`);
    if (res.ok) {
      const d = await res.json();
      setPassages(Array.isArray(d) ? d : d.results || []);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      const t = setTimeout(loadPassages, 300);
      return () => clearTimeout(t);
    }
  }, [filterSubject, filterGrade, search, authLoading, user]); // eslint-disable-line

  const openCreate = () => {
    setEditing(null);
    setForm(BLANK);
    setShowModal(true);
  };

  const openEdit = (passage) => {
    setEditing(passage);
    setForm({
      title: passage.title || "",
      content: passage.content || "",
      passage_type: passage.passage_type || "prose",
      subject: passage.subject || "",
      grade: passage.grade || "",
      author: passage.author || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content || !form.subject || !form.grade) {
      showToast("Title, content, subject and grade are required", "error");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      subject: Number(form.subject),
      grade: Number(form.grade),
    };
    try {
      const url = editing
        ? `${API}/admin/passages/${editing.id}/`
        : `${API}/admin/passages/`;
      const res = await fetchWithAuth(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast(editing ? "Passage updated!" : "Passage created!");
        setShowModal(false);
        loadPassages();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(JSON.stringify(err) || "Failed to save", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetchWithAuth(`${API}/admin/passages/${id}/`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setPassages(prev => prev.filter(p => p.id !== id));
        showToast("Passage deleted");
      } else {
        showToast("Failed to delete", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
    setConfirmDelete(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <>
      <Toast {...toast} onClose={() => setToast(t => ({ ...t, visible: false }))} />

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <h3 className="text-lg font-bold mb-2">Delete passage?</h3>
            <p className="text-gray-600 text-sm mb-6">
              &quot;{confirmDelete.title}&quot; — this will unlink it from all associated questions.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="px-5 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">{editing ? "Edit Passage" : "New Passage"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input type="text" className={inputCls} placeholder="e.g. The Heron and the Fish" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
                  <select className={inputCls} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade <span className="text-red-500">*</span></label>
                  <select className={inputCls} value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
                    <option value="">Select grade</option>
                    {[4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passage Type</label>
                  <select className={inputCls} value={form.passage_type} onChange={e => setForm({ ...form, passage_type: e.target.value })}>
                    {PASSAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author / Source (optional)</label>
                <input type="text" className={inputCls} placeholder="e.g. John Mbiti, 2003 KCPE" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content <span className="text-red-500">*</span></label>
                <p className="text-xs text-gray-400 mb-1">Type the full passage exactly as it should appear to students.</p>
                <textarea
                  rows={12}
                  className={inputCls + " font-mono text-xs leading-relaxed"}
                  placeholder="Paste or type the full passage here..."
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">{form.content.length} characters · ~{Math.round(form.content.split(/\s+/).filter(Boolean).length)} words</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Passage"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main page */}
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-emerald-600" />
              Passages
            </h1>
            <p className="text-gray-600 mt-1">Reading passages linked to comprehension questions</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" />
            New Passage
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search passages…" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
            <option value="">All Grades</option>
            {[4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <span className="self-center text-sm text-gray-500">{passages.length} passage{passages.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Passages list */}
        {passages.length === 0 ? (
          <div className="bg-white rounded-xl border p-16 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No passages yet</h3>
            <p className="text-gray-500 text-sm mb-6">Create reading passages to link to comprehension questions.</p>
            <button onClick={openCreate} className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl text-sm hover:bg-emerald-700">
              Create first passage
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {passages.map(p => (
              <div key={p.id} className="bg-white rounded-xl border hover:border-emerald-300 transition-colors p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{p.title}</h3>
                      <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full capitalize">{p.passage_type}</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Grade {p.grade}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{p.subject_name}</span>
                      {p.author && <span className="text-xs text-gray-400">— {p.author}</span>}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{p.content}</p>
                    <p className="text-xs text-gray-400 mt-1">{p.content?.length || 0} chars · ~{Math.round((p.content || "").split(/\s+/).filter(Boolean).length)} words</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openEdit(p)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(p)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
