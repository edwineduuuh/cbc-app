"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function WelcomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    last_name: "",
    parent_name: "",
    school_name: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const save = async (skip = false) => {
    if (!skip) {
      setSaving(true);
      try {
        const token = localStorage.getItem("accessToken");
        await fetch(`${API}/auth/me/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
      } catch (_) {
        // non-fatal — profile can be completed later
      } finally {
        setSaving(false);
      }
    }
    router.replace("/dashboard");
  };

  const firstName = user?.first_name || "there";

  const inputCls =
    "w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-900 outline-none transition-all bg-gray-50 focus:bg-white placeholder-gray-400 focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(14,116,144,0.1)]";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Cormorant Garamond', serif; }
        * { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "linear-gradient(160deg, #ffffff 0%, #f0f4f8 60%, #e8f4f8 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #0e7490, #0f1f3d)" }}
            >
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-display text-4xl text-gray-900 mb-2">
              You're in, {firstName}!
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Tell us a bit more so we can personalise your space.
              <br />
              <span className="text-gray-400">This takes about 20 seconds.</span>
            </p>
          </div>

          {/* Trial badge */}
          <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6">
            <span className="text-amber-500 text-base">✦</span>
            <p className="text-xs font-medium text-amber-800">
              5 free quizzes are waiting for you
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="space-y-5">

              <div>
                <label className={labelCls}>Last Name</label>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="e.g. Wanjiru"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Parent / Guardian Name</label>
                <input
                  name="parent_name"
                  value={formData.parent_name}
                  onChange={handleChange}
                  placeholder="e.g. Mary Wanjiru"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  School Name{" "}
                  <span className="text-gray-400 font-normal normal-case tracking-normal">
                    (optional)
                  </span>
                </label>
                <input
                  name="school_name"
                  value={formData.school_name}
                  onChange={handleChange}
                  placeholder="e.g. Nairobi Primary School"
                  className={inputCls}
                />
              </div>

              <button
                onClick={() => save(false)}
                disabled={saving}
                className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.01] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #0e7490, #0f1f3d)" }}
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Save & Start Learning
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={() => save(true)}
            className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip for now →
          </button>
        </motion.div>
      </div>
    </>
  );
}
