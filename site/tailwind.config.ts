import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{astro,html,ts,tsx,js,jsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        panel: {
          lilac: { DEFAULT: "#EEEAFE", ink: "#7C3AED" },
          mint:  { DEFAULT: "#E6F6EE", ink: "#16A34A" },
          peach: { DEFAULT: "#FEEFE0", ink: "#D97706" },
          sky:   { DEFAULT: "#E0F2FE", ink: "#0284C7" },
          rose:  { DEFAULT: "#FCE7F3", ink: "#DB2777" },
        },
        bbg: {
          teal: "#1FBFA8",
          purple: "#7C3AED",
          ink: "#1F2937",
          muted: "#6B7280",
          warn: "#DC2626",
          success: "#16A34A",
          annot: "#374151",
          paper: "#FAFAFA",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "Menlo", "monospace"],
      },
      keyframes: {
        breath: {
          "0%, 100%": { transform: "scale(1)" },
          "50%":      { transform: "scale(1.04)" },
        },
        blink: {
          "0%, 80%, 100%": { opacity: "1" },
          "85%":           { opacity: "0.4" },
        },
        dashFlow: {
          to: { strokeDashoffset: "-20" },
        },
      },
      animation: {
        breath: "breath 2.4s ease-in-out infinite",
        blink:  "blink 1.6s ease-in-out infinite",
        "dash-flow": "dashFlow 1.2s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
