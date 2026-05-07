"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import {
  Plus, Pencil, Trash2, X, Save, Layers, ChevronDown, ChevronRight, Search,
} from "lucide-react";
import Toast from "@/components/ui/Toast";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

const BLANK_TOPIC = { name: "", description: "", subject: "", grade: "", order: 0 };
const BLANK_SUB = { name: "", order: 0 };

export default function TopicsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [search, setSearch] = useState("");

  // expanded topic rows
  const [expanded, setExpanded] = useState({});
  // substrands per topic: { [topicId]: [...] }
  const [substrands, setSubstrands] = useState({});
  const [loadingSubs, setLoadingSubs] = useState({});

  // topic modal
  const [topicModal, setTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicForm, setTopicForm] = useState(BLANK_TOPIC);
  const [savingTopic, setSavingTopic] = useState(false);

  // substrand modal
  const [subModal, setSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [subParentTopic, setSubParentTopic] = useState(null);
  const [subForm, setSubForm] = useState(BLANK_SUB);
  const [savingSub, setSavingSub] = useState(false);

  // delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'topic'|'sub', item }

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
    fetchWithAuth(`${API}/subjects/`)
      .then(r => r.json())
      .then(d => setSubjects(Array.isArray(d) ? d : d.results || []))
      .catch(console.error);
  }, [authLoading, user]); // eslint-disable-line

  const loadTopics = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSubject) params.set("subject", filterSubject);
    if (filterGrade) params.set("grade", filterGrade);
    const res = await fetchWithAuth(`${API}/admin/topics/?${params}`);
    if (res.ok) {
      const d = await res.json();
      setTopics(Array.isArray(d) ? d : d.results || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && user) loadTopics();
  }, [filterSubject, filterGrade, authLoading, user]); // eslint-disable-line

  const filteredTopics = topics.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Substrands ──────────────────────────────────────────────
  const toggleExpand = async (topicId) => {
    setExpanded(prev => ({ ...prev, [topicId]: !prev[topicId] }));
    if (!substrands[topicId] && !loadingSubs[topicId]) {
      setLoadingSubs(prev => ({ ...prev, [topicId]: true }));
      const res = await fetchWithAuth(`${API}/admin/substrands/?topic=${topicId}`);
      if (res.ok) {
        const d = await res.json();
        setSubstrands(prev => ({ ...prev, [topicId]: Array.isArray(d) ? d : d.results || [] }));
      }
      setLoadingSubs(prev => ({ ...prev, [topicId]: false }));
    }
  };

  const reloadSubs = async (topicId) => {
    const res = await fetchWithAuth(`${API}/admin/substrands/?topic=${topicId}`);
    if (res.ok) {
      const d = await res.json();
      setSubstrands(prev => ({ ...prev, [topicId]: Array.isArray(d) ? d : d.results || [] }));
    }
  };

  // ── Topic CRUD ───────────────────────────────────────────────
  const openCreateTopic = () => {
    setEditingTopic(null);
    setTopicForm({ ...BLANK_TOPIC, subject: filterSubject, grade: filterGrade });
    setTopicModal(true);
  };

  const openEditTopic = (topic) => {
    setEditingTopic(topic);
    setTopicForm({
      name: topic.name || "",
      description: topic.description || "",
      subject: topic.subject || "",
      grade: topic.grade || "",
      order: topic.order ?? 0,
    });
    setTopicModal(true);
  };

  const handleSaveTopic = async () => {
    if (!topicForm.name || !topicForm.subject || !topicForm.grade) {
      showToast("Name, subject, and grade are required", "error");
      return;
    }
    setSavingTopic(true);
    const payload = {
      ...topicForm,
      subject: Number(topicForm.subject),
      grade: Number(topicForm.grade),
      order: Number(topicForm.order) || 0,
    };
    const url = editingTopic ? `${API}/admin/topics/${editingTopic.id}/` : `${API}/admin/topics/`;
    const res = await fetchWithAuth(url, {
      method: editingTopic ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showToast(editingTopic ? "Topic updated!" : "Topic created!");
      setTopicModal(false);
      loadTopics();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(JSON.stringify(err) || "Failed to save", "error");
    }
    setSavingTopic(false);
  };

  const handleDeleteTopic = async (id) => {
    const res = await fetchWithAuth(`${API}/admin/topics/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setTopics(prev => prev.filter(t => t.id !== id));
      showToast("Topic deleted");
    } else {
      showToast("Failed to delete", "error");
    }
    setConfirmDelete(null);
  };

  // ── Substrand CRUD ──────────────────────────────────────────
  const openCreateSub = (topic) => {
    setEditingSub(null);
    setSubParentTopic(topic);
    setSubForm(BLANK_SUB);
    setSubModal(true);
  };

  const openEditSub = (sub, topic) => {
    setEditingSub(sub);
    setSubParentTopic(topic);
    setSubForm({ name: sub.name || "", order: sub.order ?? 0 });
    setSubModal(true);
  };

  const handleSaveSub = async () => {
    if (!subForm.name) {
      showToast("Name is required", "error");
      return;
    }
    setSavingSub(true);
    const payload = {
      name: subForm.name,
      order: Number(subForm.order) || 0,
      topic: subParentTopic.id,
    };
    const url = editingSub ? `${API}/admin/substrands/${editingSub.id}/` : `${API}/admin/substrands/`;
    const res = await fetchWithAuth(url, {
      method: editingSub ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showToast(editingSub ? "Sub-strand updated!" : "Sub-strand created!");
      setSubModal(false);
      reloadSubs(subParentTopic.id);
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(JSON.stringify(err) || "Failed to save", "error");
    }
    setSavingSub(false);
  };

  const handleDeleteSub = async (sub, topicId) => {
    const res = await fetchWithAuth(`${API}/admin/substrands/${sub.id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setSubstrands(prev => ({
        ...prev,
        [topicId]: (prev[topicId] || []).filter(s => s.id !== sub.id),
      }));
      showToast("Sub-strand deleted");
    } else {
      showToast("Failed to delete", "error");
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
            <h3 className="text-lg font-bold mb-2">
              Delete {confirmDelete.type === "topic" ? "topic" : "sub-strand"}?
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              &quot;{confirmDelete.item.name}&quot;
              {confirmDelete.type === "topic" && " — all sub-strands will also be deleted."}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">Cancel</button>
              <button
                onClick={() =>
                  confirmDelete.type === "topic"
                    ? handleDeleteTopic(confirmDelete.item.id)
                    : handleDeleteSub(confirmDelete.item, confirmDelete.topicId)
                }
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topic modal */}
      {topicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">{editingTopic ? "Edit Topic" : "New Topic"}</h2>
              <button onClick={() => setTopicModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input type="text" className={inputCls} placeholder="e.g. Algebra" value={topicForm.name} onChange={e => setTopicForm({ ...topicForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
                  <select className={inputCls} value={topicForm.subject} onChange={e => setTopicForm({ ...topicForm, subject: e.target.value })}>
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade <span className="text-red-500">*</span></label>
                  <select className={inputCls} value={topicForm.grade} onChange={e => setTopicForm({ ...topicForm, grade: e.target.value })}>
                    <option value="">Select grade</option>
                    {[4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={2} className={inputCls} placeholder="Optional description" value={topicForm.description} onChange={e => setTopicForm({ ...topicForm, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input type="number" className={inputCls} min={0} value={topicForm.order} onChange={e => setTopicForm({ ...topicForm, order: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setTopicModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSaveTopic} disabled={savingTopic} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50">
                <Save className="w-4 h-4" />
                {savingTopic ? "Saving…" : editingTopic ? "Save Changes" : "Create Topic"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-strand modal */}
      {subModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingSub ? "Edit Sub-strand" : "New Sub-strand"}
                <span className="text-sm font-normal text-gray-500 ml-2">in {subParentTopic?.name}</span>
              </h2>
              <button onClick={() => setSubModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input type="text" className={inputCls} placeholder="e.g. Linear Equations" value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input type="number" className={inputCls} min={0} value={subForm.order} onChange={e => setSubForm({ ...subForm, order: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setSubModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSaveSub} disabled={savingSub} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
                <Save className="w-4 h-4" />
                {savingSub ? "Saving…" : editingSub ? "Save Changes" : "Create Sub-strand"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main page */}
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Layers className="w-8 h-8 text-emerald-600" />
              Topics &amp; Sub-strands
            </h1>
            <p className="text-gray-600 mt-1">Curriculum topics and their sub-strands by subject and grade</p>
          </div>
          <button
            onClick={openCreateTopic}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" />
            New Topic
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search topics…" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
            <option value="">All Grades</option>
            {[4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <span className="self-center text-sm text-gray-500">{filteredTopics.length} topic{filteredTopics.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Topics list */}
        {filteredTopics.length === 0 ? (
          <div className="bg-white rounded-xl border p-16 text-center">
            <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No topics yet</h3>
            <p className="text-gray-500 text-sm mb-6">Create topics to organise your curriculum.</p>
            <button onClick={openCreateTopic} className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl text-sm hover:bg-emerald-700">
              Create first topic
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTopics.map(topic => {
              const isExpanded = !!expanded[topic.id];
              const subs = substrands[topic.id] || [];
              const isLoadingSubs = !!loadingSubs[topic.id];

              return (
                <div key={topic.id} className="bg-white rounded-xl border hover:border-emerald-200 transition-colors">
                  {/* Topic row */}
                  <div className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => toggleExpand(topic.id)}
                      className="p-1 text-gray-400 hover:text-emerald-600 rounded transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{topic.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Grade {topic.grade}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{topic.subject_name}</span>
                        <span className="text-xs text-gray-400">{topic.question_count} question{topic.question_count !== 1 ? "s" : ""}</span>
                      </div>
                      {topic.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{topic.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { toggleExpand(topic.id); openCreateSub(topic); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Add sub-strand"
                      >
                        <Plus className="w-3 h-3" /> Sub-strand
                      </button>
                      <button onClick={() => openEditTopic(topic)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Edit topic">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDelete({ type: "topic", item: topic })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete topic">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-strands */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 rounded-b-xl">
                      {isLoadingSubs ? (
                        <div className="py-4 flex justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500" />
                        </div>
                      ) : subs.length === 0 ? (
                        <div className="py-4 px-6 text-sm text-gray-400 italic">
                          No sub-strands yet.{" "}
                          <button onClick={() => openCreateSub(topic)} className="text-blue-600 underline">Add one</button>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {subs.map(sub => (
                            <div key={sub.id} className="flex items-center gap-3 px-6 py-3">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                              <span className="flex-1 text-sm text-gray-700">{sub.name}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => openEditSub(sub, topic)} className="p-1.5 text-gray-400 hover:bg-white hover:text-gray-700 rounded-lg transition-colors" title="Edit">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setConfirmDelete({ type: "sub", item: sub, topicId: topic.id })} className="p-1.5 text-red-300 hover:bg-white hover:text-red-500 rounded-lg transition-colors" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="px-6 py-3 border-t border-gray-100">
                        <button
                          onClick={() => openCreateSub(topic)}
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          <Plus className="w-3 h-3" /> Add sub-strand
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
