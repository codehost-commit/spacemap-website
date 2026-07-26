/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          bg: "#05070d",
          panel: "#0b0f1a",
          border: "#1a2130",
          text: "#c9d4e5",
          dim: "#6a7a90",
          accent: "#4fd1ff",
          warn: "#ffb020",
          bad: "#ff4757",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
