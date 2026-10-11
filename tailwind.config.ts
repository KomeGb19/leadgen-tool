import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#14171B", // alias of ink, replaces the old .bg-background CSS rule
        ink: "#14171B",        // primary background — near-black charcoal
        panel: "#1C2126",      // card/panel surface
        rail: "#22282F",       // sidebar/rail surface
        paper: "#EDEAE1",      // manifest paper — used sparingly for contrast blocks
        line: "#333A42",       // hairline borders
        muted: "#8A9199",      // secondary text
        amber: "#E8A33D",      // placard amber — the one accent
        amberDim: "#8A6323",
        ok: "#3FA66B",
        warn: "#D97A2E",
        danger: "#D14343",
        info: "#4A90D9",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        body: ["var(--font-sans)", "sans-serif"], // keeps existing font-body classes working
        display: ["var(--font-display)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "3px",
      },
      letterSpacing: {
        widest2: "0.2em",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
} satisfies Config;