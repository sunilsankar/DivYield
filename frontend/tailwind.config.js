/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-hover": "rgb(var(--primary-hover) / <alpha-value>)",
        "primary-light": "rgb(var(--primary-light) / <alpha-value>)",
        "primary-ring": "rgb(var(--primary-ring) / <alpha-value>)",
        paper: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          light: "#f8fafc",
          dark: "#0f172a",
        },
        ink: {
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          muted: "#64748b",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        sketch: ['"Architects Daughter"', "cursive", "sans-serif"],
        hand: ['"Patrick Hand"', "cursive", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        "soft-md": "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        "soft-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};
