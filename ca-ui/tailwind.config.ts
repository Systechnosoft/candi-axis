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
        border: "hsl(var(--border) / 0.2)",
        input: "hsl(var(--border) / 0.6)",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: "hsl(var(--sidebar))",
        surface: "hsl(var(--card))",
        subtle: "hsl(var(--muted))",
        "strong-border": "hsl(var(--strong-border))",
        brand: {
          DEFAULT: "hsl(var(--primary))",
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
        heading: ["var(--font-heading)", "Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
      }
    },
  },
  plugins: [],
};
export default config;
