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
      boxShadow: {
        "soft-sm": "0 1px 2px rgba(0,0,0,0.04)",
        "soft":    "0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
        "soft-md": "0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)",
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
        "wiggle-hint": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%":      { transform: "translateX(-4px)" },
          "75%":      { transform: "translateX(4px)" },
        },
        "reveal-up": {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "check-pop": {
          "0%":   { transform: "scale(0.6)", opacity: "0" },
          "50%":  { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        breath: "breath 2.4s ease-in-out infinite",
        blink:  "blink 1.6s ease-in-out infinite",
        "dash-flow":   "dashFlow 1.2s linear infinite",
        "wiggle-hint": "wiggle-hint 600ms ease-in-out 1",
        "reveal-up":   "reveal-up 200ms cubic-bezier(.2,.7,.3,1) both",
        "check-pop":   "check-pop 200ms cubic-bezier(.2,.9,.4,1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
