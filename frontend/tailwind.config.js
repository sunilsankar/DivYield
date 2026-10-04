/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          50: "#fdfcfa",
          100: "#fbf8f2",
          200: "#f5f0e6",
          300: "#eae2d1",
          light: "#faf7f2",
          dark: "#1e1e24",
        },
        ink: {
          900: "#18181b",
          800: "#27272a",
          700: "#3f3f46",
          muted: "#71717a",
        },
        sketch: {
          blue: "#2563eb",
          green: "#059669",
          amber: "#d97706",
          purple: "#7c3aed",
          rose: "#e11d48",
          cyan: "#0891b2",
        },
      },
      fontFamily: {
        sketch: ['"Architects Daughter"', '"Patrick Hand"', "cursive", "sans-serif"],
        hand: ['"Patrick Hand"', '"Comic Neue"', "cursive", "sans-serif"],
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        sketch: "3px 3px 0px 0px #18181b",
        "sketch-sm": "2px 2px 0px 0px #18181b",
        "sketch-lg": "5px 5px 0px 0px #18181b",
        "sketch-hover": "4px 4px 0px 0px #18181b",
        "sketch-inset": "inset 2px 2px 0px 0px rgba(24, 24, 27, 0.1)",
      },
      borderRadius: {
        sketch: "255px 15px 225px 15px/15px 225px 15px 255px",
        "sketch-sm": "120px 8px 110px 8px/8px 110px 8px 120px",
        "sketch-lg": "255px 25px 225px 25px/25px 225px 25px 255px",
      },
    },
  },
  plugins: [],
};
