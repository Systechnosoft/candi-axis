import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sidebar: "var(--sidebar)",
        surface: "var(--surface)",
        subtle: "var(--subtle)",
        border: "var(--border)",
        "strong-border": "var(--strong-border)",
        brand: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          active: "#1E40AF",
        },
        secondary: {
          DEFAULT: "#6366F1",
        },
        text: {
          primary: "#111827",
          secondary: "#6B7280",
          muted: "#9CA3AF",
          inverse: "#FFFFFF",
        },
        status: {
          success: "#16A34A",
          warning: "#F59E0B",
          error: "#DC2626",
          info: "#0EA5E9",
        },
        success: {
          DEFAULT: "#16A34A",
          dark: "#15803D",
        },
        danger: {
          DEFAULT: "#DC2626",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
      }
    },
  },
  plugins: [],
};
export default config;
