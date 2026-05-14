import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{astro,html,ts,tsx,js,jsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        /* ─────────────────────────────────────────────
           NEW editorial-technical tokens (P1 redesign).
           Reference CSS variables so dark mode and density
           switches propagate automatically.
           ───────────────────────────────────────────── */
        paper:    "var(--paper)",
        "paper-2": "var(--paper-2)",
        card:     "var(--card)",
        "card-2": "var(--card-2)",
        ink:      "var(--ink)",
        "ink-2":  "var(--ink-2)",
        muted:    "var(--muted)",
        "muted-2": "var(--muted-2)",
        rule:        "var(--rule)",
        "rule-strong": "var(--rule-strong)",
        hairline:    "var(--hairline)",
        accent:      "var(--accent)",
        ok:          "var(--ok)",
        danger:      "var(--danger)",

        /* pillar palette — base + 16% bg tint */
        pillar: {
          lilac:    "var(--p-lilac)",
          "lilac-bg": "var(--p-lilac-bg)",
          mint:     "var(--p-mint)",
          "mint-bg":  "var(--p-mint-bg)",
          peach:    "var(--p-peach)",
          "peach-bg": "var(--p-peach-bg)",
          sky:      "var(--p-sky)",
          "sky-bg":   "var(--p-sky-bg)",
          rose:     "var(--p-rose)",
          "rose-bg":  "var(--p-rose-bg)",
        },

        /* personas — used by PersonaTag and persona-related dots */
        pers: {
          bea:   "var(--pers-bea)",
          rex:   "var(--pers-rex)",
          rita:  "var(--pers-rita)",
          sven:  "var(--pers-sven)",
          cara:  "var(--pers-cara)",
          otto:  "var(--pers-otto)",
          patty: "var(--pers-patty)",
        },

        /* ─────────────────────────────────────────────
           LEGACY tokens — preserved so existing components
           (pre-P1) keep rendering. Migrated piece by piece
           in P2–P5. Do NOT use in new code.
           ───────────────────────────────────────────── */
        panel: {
          lilac: { DEFAULT: "#EEEAFE", ink: "#7C3AED" },
          mint:  { DEFAULT: "#E6F6EE", ink: "#16A34A" },
          peach: { DEFAULT: "#FEEFE0", ink: "#D97706" },
          sky:   { DEFAULT: "#E0F2FE", ink: "#0284C7" },
          rose:  { DEFAULT: "#FCE7F3", ink: "#DB2777" },
        },
        bbg: {
          teal:    "#1FBFA8",
          purple:  "#7C3AED",
          ink:     "#1F2937",
          muted:   "#6B7280",
          warn:    "#DC2626",
          success: "#16A34A",
          annot:   "#374151",
          paper:   "#FAFAFA",
        },
      },

      fontFamily: {
        /* new editorial stack */
        display: ['"Fraunces"', '"Source Serif Pro"', "Georgia", "serif"],
        body:    ['"Inter Tight"', '"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono:    ['"JetBrains Mono"', '"SF Mono"', '"Berkeley Mono"', "ui-monospace", "Menlo", "monospace"],
        meta:    ['"Inter Tight"', "ui-sans-serif", "system-ui", "sans-serif"],

        /* legacy alias — pre-P1 code uses `font-sans` (= Inter) */
        sans: ['"Inter Tight"', '"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
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
