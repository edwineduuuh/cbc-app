// Color palette
export const colors = {
  primary: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
  },
  success: {
    50: "#F0FDF4",
    500: "#10B981",
    600: "#059669",
  },
  error: {
    50: "#FEF2F2",
    500: "#EF4444",
    600: "#DC2626",
  },
  warning: {
    500: "#F59E0B",
  },
  neutral: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    500: "#6B7280",
    700: "#374151",
    900: "#111827",
  },
};

// Animation variants
export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideIn = {
  initial: { x: -300, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 300, opacity: 0 },
};

export const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};
