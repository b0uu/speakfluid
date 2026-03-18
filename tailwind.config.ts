import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#FFFFFF",
        "grey-50": "#F8F8FA",
        "grey-100": "#F0F0F3",
        "grey-200": "#E4E4E8",
        "grey-400": "#9CA3AF",
        "grey-600": "#6B7280",
        "grey-900": "#111111",
        blue: {
          DEFAULT: "#2D5BFF",
          light: "#6B8AFF",
          50: "#EEF2FF",
        },
        emerald: "#10B981",
        "amber-50": "#FFF8F0",
        amber: "#D97706",
        "red-500": "#EF4444",
        deco: "#D0D4E8",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        md: "14px",
        lg: "22px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0, 0, 0, 0.04)",
        elevated: "0 8px 24px rgba(0, 0, 0, 0.08)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-4px)" },
        },
        "tooltip-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out-up": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-12px)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.5s ease-out infinite",
        "float": "float 6s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "fade-in-up": "fade-in-up 250ms ease-out",
        "bounce-dot": "bounce-dot 1.2s ease-in-out infinite",
        "tooltip-in": "tooltip-in 150ms ease-out",
        "fade-out-up": "fade-out-up 300ms ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
