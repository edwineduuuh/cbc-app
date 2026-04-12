"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, ArrowRight, Clock } from "lucide-react";

const WHATSAPP_NUMBER = "254717946924";

const QUICK_MESSAGES = [
  {
    emoji: "💳",
    label: "Payment & Subscription",
    msg: "Hi! I need help with payment or my subscription.",
  },
  {
    emoji: "📚",
    label: "Quiz or Content Issue",
    msg: "Hi! I found an issue with a quiz or content on the platform.",
  },
  {
    emoji: "🔑",
    label: "Login / Account Help",
    msg: "Hi! I'm having trouble logging into my account.",
  },
  {
    emoji: "💬",
    label: "General Enquiry",
    msg: "Hi! I have a question about CBE Kenya Learning Platform.",
  },
];

export default function WhatsAppButton() {
  const [open, setOpen] = useState(false);

  const openChat = (msg) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-80 rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: "#0d1117",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ background: "#128C7E" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                  📞
                </div>
                <div>
                  <p className="font-bold text-white text-sm">
                    StadiSpace Support
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                    <p className="text-green-200 text-xs">
                      Usually replies in minutes
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              <div
                className="mb-4 p-3.5 rounded-2xl rounded-tl-sm text-sm text-white/80 leading-relaxed"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                👋 Hi! How can we help you today? Pick a topic below or send us
                a message directly.
              </div>

              <div className="space-y-2 mb-4">
                {QUICK_MESSAGES.map((item) => (
                  <motion.button
                    key={item.label}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openChat(item.msg)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span className="text-lg flex-shrink-0">{item.emoji}</span>
                    <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors flex-1">
                      {item.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-green-400 transition-colors" />
                  </motion.button>
                ))}
              </div>

              <button
                onClick={() =>
                  openChat("Hi! I need help with CBE Kenya Learning Platform.")
                }
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #128C7E, #25D366)",
                }}
              >
                <MessageCircle className="w-4 h-4" />
                Open WhatsApp Chat
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-3">
                <Clock className="w-3 h-3 text-white/20" />
                <p className="text-xs text-white/25 text-center">
                  Mon – Sat, 8am – 8pm EAT
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB - NO AUTO NOTIFICATION */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all"
        style={{
          background: open
            ? "#ef4444"
            : "linear-gradient(135deg, #128C7E, #25D366)",
        }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="wa"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
