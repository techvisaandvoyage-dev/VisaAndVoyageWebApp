/** @type {import('tailwindcss').Config} */
// ============================================================
//  Tailwind CSS Configuration
//  Defines the custom design system tokens for the Visa App:
//  colors, fonts, backdrop blur, and animation utilities.
// ============================================================
export default {
  // Scan all JSX/JS files inside src/ for class names
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Custom Color Palette ──────────────────────────────
      colors: {
        // Base backgrounds - Powered by CSS Variables
        background: "var(--bg, #EEDFC7)",
        surface:    "var(--cd, var(--bg, #EEDFC7))",
        "surface-2":"var(--surface-2, #e2d5bd)",
        "surface-3":"var(--surface-3, #d6c8b0)",

        // Primary accent — Powered by CSS Variables
        cyan: {
          light:   "#e5edd9",
          DEFAULT: "var(--bb, #607938)",
          dim:     "#51662f",
          glow:    "rgba(96, 121, 56, 0.25)",
          border:  "rgba(96, 121, 56, 0.35)",
        },

        // Secondary accent — Gold
        gold: {
          DEFAULT: "#d97706",
          dim:     "#b45309",
          glow:    "rgba(217, 119, 6, 0.12)",
        },

        // Status colors
        status: {
          pending:  "#f59e0b",
          approved: "#10b981",
          review:   "#3b82f6",
          rejected: "#ef4444",
        },

        // Text hierarchy - Powered by CSS Variables
        text: {
          primary:   "var(--ink, #2D2B22)",
          secondary: "var(--mu, #6E6A59)",
          muted:     "var(--mu, #6E6A59)",
        },

        // Border
        border: {
          DEFAULT: "transparent",
          light:   "transparent",
        },
      },

      // ── Typography ────────────────────────────────────────
      fontFamily: {
        sans: ["var(--f)", "Urbanist", "Inter", "system-ui", "sans-serif"],
        heading: ["var(--fh, var(--f))", "Urbanist", "Inter", "system-ui", "sans-serif"],
        newsreader: ["var(--na-font, 'Newsreader')", "serif"],
        playfair: ["var(--na-font, 'Newsreader')", "serif"],
      },
      fontSize: {
        "2xs": "0.625rem",
      },

      // ── Backdrop Blur ─────────────────────────────────────
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "12px",
        lg: "20px",
        xl: "40px",
      },

      // ── Box Shadows ───────────────────────────────────────
      boxShadow: {
        "cyan-glow":  "0 0 20px rgba(96, 121, 56, 0.25)",
        "cyan-glow-lg":"0 0 40px rgba(96, 121, 56, 0.35)",
        "card":       "6.5px 6.5px 17.5px var(--lo), -6.5px -6.5px 17.5px var(--hi)",
        "modal":      "0 20px 50px rgba(45, 43, 34, 0.35)",

        // Neumorphic shadows from reference
        "neu-flat":        "5px 5px 11px var(--lo), -5px -5px 11px var(--hi)",
        "neu-raised":      "6.5px 6.5px 17.5px var(--lo), -6.5px -6.5px 17.5px var(--hi)",
        "neu-card":        "6.5px 6.5px 17.5px var(--lo), -6.5px -6.5px 17.5px var(--hi)",
        "neu-card-hover":  "6.5px 6.5px 17.5px var(--lo), -6.5px -6.5px 17.5px var(--hi), 0 20px 44px rgba(85, 104, 50, 0.38)",
        "neu-inset":       "inset 3px 3px 7px var(--lo), inset -3px -3px 7px var(--hi)",
        "neu-inset-sm":    "inset 2px 2px 5px var(--lo), inset -2px -2px 5px var(--hi)",
        "neu-button":      "5px 5px 11px var(--lo), -5px -5px 11px var(--hi)",
        "neu-pressed":     "inset 3px 3px 7px var(--lo), inset -3px -3px 7px var(--hi)",
        "neu-accent":      "5px 5px 11px var(--lo), -5px -5px 11px var(--hi)",
      },

      // ── Animations ────────────────────────────────────────
      animation: {
        "fade-in":     "fadeIn 0.4s ease-out",
        "slide-up":    "slideUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "pulse-cyan":  "pulseCyan 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%":   { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseCyan: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(2, 82, 213, 0.2)" },
          "50%":      { boxShadow: "0 0 30px rgba(2, 82, 213, 0.5)" },
        },
      },

      // ── Border Radius ─────────────────────────────────────
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
