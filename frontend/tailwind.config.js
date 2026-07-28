/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          bg: '#06101a',
          panel: '#0d1723',
          border: '#24384a',
          text: '#f2f4f8',
          dim: '#8a99ad',
          accent: '#8ed8ff',
          warn: '#d8b36a',
          bad: '#f26d7d',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Space Grotesk', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
