/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#030712",
          "bg-secondary": "#111827",
          text: "#f9fafb",
          "text-muted": "#9ca3af",
          border: "rgba(255,255,255,0.08)",
        },
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
