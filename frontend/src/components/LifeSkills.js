"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ArrowLeft, Lightbulb } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const TYPE_LABELS = {
  quote: "Quote",
  story: "Story",
  tip: "Tip",
};

const TYPE_COLORS = {
  quote: { bg: "#eff6ff", border: "#bfdbfe", badge: "#3b82f6", text: "#1e40af" },
  story: { bg: "#fdf4ff", border: "#e9d5ff", badge: "#9333ea", text: "#6b21a8" },
  tip:   { bg: "#f0fdf4", border: "#bbf7d0", badge: "#22c55e", text: "#15803d" },
};

function ContentCard({ item, onClick }) {
  const colors = TYPE_COLORS[item.content_type] || TYPE_COLORS.tip;
  const title = item.title || "Untitled";
  const preview = item.preview || (item.text ? item.text.slice(0, 120) + (item.text.length > 120 ? "…" : "") : "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: "0 8px 30px rgba(0,0,0,0.10)" }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick(item)}
      style={{
        background: "#fff",
        border: `1.5px solid ${colors.border}`,
        borderRadius: 14,
        padding: "20px 22px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
    >
      {/* Type badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            background: colors.badge,
            color: "#fff",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 9px",
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {TYPE_LABELS[item.content_type] || item.content_type}
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          fontWeight: 700,
          fontSize: 16,
          color: "#1a1a2e",
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>

      {/* Preview */}
      {preview && (
        <div
          style={{
            fontSize: 14,
            color: "#555",
            lineHeight: 1.6,
          }}
        >
          {preview}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        {item.author ? (
          <span style={{ fontSize: 12, color: "#888" }}>— {item.author}</span>
        ) : (
          <span />
        )}
        <span
          style={{
            fontSize: 13,
            color: colors.text,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          Read more →
        </span>
      </div>
    </motion.div>
  );
}

function DetailView({ item, onBack }) {
  const colors = TYPE_COLORS[item.content_type] || TYPE_COLORS.tip;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.22 }}
      style={{ maxWidth: 720, margin: "0 auto" }}
    >
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "#3b82f6",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          padding: "0 0 20px 0",
        }}
      >
        <ArrowLeft size={16} /> Back to Life Skills
      </button>

      <div
        style={{
          background: "#fff",
          border: `2px solid ${colors.border}`,
          borderRadius: 16,
          padding: "32px 36px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        }}
      >
        {/* Badge */}
        <span
          style={{
            background: colors.badge,
            color: "#fff",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            padding: "3px 12px",
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {TYPE_LABELS[item.content_type] || item.content_type}
        </span>

        {/* Title */}
        <h2
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#1a1a2e",
            margin: "16px 0 20px",
            lineHeight: 1.25,
          }}
        >
          {item.title || "Untitled"}
        </h2>

        {/* Full text */}
        <div
          style={{
            fontSize: 16,
            color: "#333",
            lineHeight: 1.85,
            whiteSpace: "pre-wrap",
          }}
        >
          {item.text}
        </div>

        {item.author && (
          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: `1px solid ${colors.border}`,
              fontSize: 14,
              color: "#666",
              fontStyle: "italic",
            }}
          >
            — {item.author}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function LifeSkills() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/motivational/?category=life`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load content");
        return r.json();
      })
      .then((data) => {
        setItems(Array.isArray(data) ? data : data.results || []);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError("Could not load content. Please try again.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  const filtered =
    filter === "all" ? items : items.filter((i) => i.content_type === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9ff", padding: "0 0 60px" }}>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #7c3aed 100%)",
          padding: "52px 24px 44px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 70% 50%, rgba(124,58,237,0.25) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.12)",
              borderRadius: 20,
              padding: "5px 16px",
              marginBottom: 18,
            }}
          >
            <BookOpen size={14} color="#fff" />
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
              Life Skills Academy
            </span>
          </div>

          <h1
            style={{
              color: "#fff",
              fontSize: "clamp(24px, 5vw, 36px)",
              fontWeight: 900,
              margin: "0 0 14px",
              lineHeight: 1.2,
            }}
          >
            Real-world knowledge textbooks don&apos;t cover
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.80)",
              fontSize: 16,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Skills for money, relationships, safety, health, citizenship, and your future.
          </p>
        </div>
      </div>

      {/* Content area */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 20px 0" }}>
        <AnimatePresence mode="wait">
          {selected ? (
            <DetailView
              key="detail"
              item={selected}
              onBack={() => setSelected(null)}
            />
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Filter tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 28,
                  flexWrap: "wrap",
                }}
              >
                {["all", "story", "tip", "quote"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: "7px 18px",
                      borderRadius: 20,
                      border: "1.5px solid",
                      borderColor: filter === f ? "#2563eb" : "#d1d5db",
                      background: filter === f ? "#2563eb" : "#fff",
                      color: filter === f ? "#fff" : "#555",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {f === "all"
                      ? "All"
                      : f === "story"
                      ? "Stories"
                      : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
                  </button>
                ))}
              </div>

              {/* States */}
              {loading && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 0",
                    color: "#888",
                    fontSize: 15,
                  }}
                >
                  Loading content…
                </div>
              )}

              {error && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 0",
                    color: "#ef4444",
                    fontSize: 15,
                  }}
                >
                  {error}
                </div>
              )}

              {!loading && !error && filtered.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    color: "#888",
                  }}
                >
                  <Lightbulb size={40} color="#d1d5db" style={{ marginBottom: 16 }} />
                  <p style={{ fontSize: 16, margin: 0 }}>
                    No content here yet. Check back soon!
                  </p>
                </div>
              )}

              {!loading && !error && filtered.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 20,
                  }}
                >
                  {filtered.map((item) => (
                    <ContentCard
                      key={item.id}
                      item={item}
                      onClick={setSelected}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
