/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          bg: "#08111d",
          panel: "#0e1826",
          border: "#22344a",
          text: "#edf3fb",
          dim: "#8ea4be",
          accent: "#7fd8ff",
          warn: "#f6c56b",
          bad: "#ff6a7a",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["Space Grotesk", "Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
