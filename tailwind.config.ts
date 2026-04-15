import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "!./archive/**",
  ],
  prefix: "",
  safelist: [
    "card-bubble",
    "card-bubble-glass",
    "card-bubble-elevated",
    "btn-glass",
    "btn-glass-accent",
    "btn-glass-secondary",
    "progress-bubble",
    "float-bubble",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      borderRadius: {
        card: "12px",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        brand: {
          primary: "var(--color-primary)",
          accent: "var(--color-accent)",
          cta: "var(--color-cta)",
        },
        surface: {
          deep: "var(--color-bg-deep)",
          panel: "var(--color-bg-panel)",
          light: "var(--color-bg-light)",
        },
        text: {
          primary: "var(--color-text-primary)",
          muted: "var(--color-text-muted)",
        },
      },
      // SkaiScraper brand tokens
      brand: {
        navy: "#0A1A2F",
        blue: "#117CFF",
        yellow: "#FFC838",
        ink: "#0F172A",
        50: "#f2f7ff",
        100: "#e6f0ff",
        500: "#117CFF",
        700: "#0A1A2F",
        900: "#081427",
      },
      borderRadius: {
        lg: "14px", // Consistent large radius
        xl: "20px", // Card radius
        "2xl": "24px", // Image/hero radius
        md: "12px", // Button radius
        sm: "8px",
      },
      backgroundImage: {
        "gradient-hero": "var(--gradient-hero)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-subtle": "var(--gradient-subtle)",
        // Unified Gradient System (Dec 2025)
        "gradient-primary": "linear-gradient(to right, var(--primary), var(--accent))",
        "gradient-blue": "linear-gradient(to right, #2563eb, #06b6d4)",
        "gradient-purple": "linear-gradient(to right, #9333ea, #ec4899)",
        "gradient-indigo": "linear-gradient(to right, #4f46e5, #7c3aed)",
        "gradient-success": "linear-gradient(to right, #10b981, #059669)",
        "gradient-error": "linear-gradient(to right, #ef4444, #dc2626)",
        "gradient-warning": "linear-gradient(to right, #f59e0b, #d97706)",
        "gradient-cyan": "linear-gradient(to right, #06b6d4, #0891b2)",
      },
      boxShadow: {
        "lg-custom": "var(--shadow-lg)",
        "xl-custom": "var(--shadow-xl)",
        glow: "var(--shadow-glow)",
        elevated: "0 8px 24px rgba(10,26,47,0.18)",
      },
      transitionTimingFunction: {
        "brand-out": "cubic-bezier(.2,.8,.25,1)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        indeterminate: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        indeterminate: "indeterminate 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
