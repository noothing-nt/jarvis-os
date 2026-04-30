/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        /* ── Base surfaces ──────────────────────────────── */
        base:    "#0D1117",   // deepest bg
        subtle:  "#161B22",   // sidebar bg
        inset:   "#010409",   // code blocks
        surface: "#1C2333",   // card bg
        raised:  "#21262D",   // hover state
        overlay: "#2D333B",   // modal bg

        /* ── Borders ────────────────────────────────────── */
        border:  "#30363D",
        "border-subtle": "#21262D",
        "border-em":     "#388BFD",

        /* ── Text ───────────────────────────────────────── */
        primary:   "#E6EDF3",
        secondary: "#8B949E",
        muted:     "#484F58",
        onblue:    "#FFFFFF",

        /* ── Brand / Accent ─────────────────────────────── */
        accent: {
          DEFAULT: "#2F81F7",
          hover:   "#388BFD",
          muted:   "#1F3A5F",
          subtle:  "#0D2340",
        },

        /* ── Semantic ───────────────────────────────────── */
        success: {
          DEFAULT: "#3FB950",
          light:   "#56D364",
          bg:      "#1B3A27",
          border:  "#2EA043",
        },
        danger: {
          DEFAULT: "#F85149",
          light:   "#FF7B72",
          bg:      "#3D1C1C",
          border:  "#DA3633",
        },
        warning: {
          DEFAULT: "#D29922",
          light:   "#E3B341",
          bg:      "#272115",
          border:  "#9E6A03",
        },
        purple: {
          DEFAULT: "#A371F7",
          light:   "#BC8CFF",
          bg:      "#2D1F4E",
          border:  "#6E40C9",
        },
        teal: {
          DEFAULT: "#2FBFA5",
          light:   "#39D0B8",
          bg:      "#0D2D2A",
          border:  "#1A7F6E",
        },
      },

      fontFamily: {
        sans:    ["'Inter'", "system-ui", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },

      fontSize: {
        "2xs": ["10px", { lineHeight: "1.4" }],
        xs:    ["11px", { lineHeight: "1.5" }],
        sm:    ["12px", { lineHeight: "1.6" }],
        base:  ["13px", { lineHeight: "1.6" }],
        md:    ["14px", { lineHeight: "1.6" }],
        lg:    ["15px", { lineHeight: "1.5" }],
        xl:    ["17px", { lineHeight: "1.5" }],
        "2xl": ["20px", { lineHeight: "1.4" }],
        "3xl": ["24px", { lineHeight: "1.3" }],
        "4xl": ["30px", { lineHeight: "1.2" }],
      },

      spacing: {
        sidebar: "256px",
        topbar:  "56px",
      },

      borderRadius: {
        sm:  "4px",
        DEFAULT: "6px",
        md:  "8px",
        lg:  "10px",
        xl:  "12px",
        "2xl": "16px",
        full: "9999px",
      },

      boxShadow: {
        card:   "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(48,54,61,0.5)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,139,253,0.3)",
        modal:  "0 16px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(48,54,61,0.6)",
        focus:  "0 0 0 3px rgba(47,129,247,0.4)",
        sm:     "0 1px 2px rgba(0,0,0,0.5)",
        inner:  "inset 0 1px 0 rgba(255,255,255,0.04)",
        "inset-border": "inset 0 0 0 1px rgba(48,54,61,0.8)",
      },

      animation: {
        "fade-in":   "fadeIn 0.15s ease-out",
        "slide-up":  "slideUp 0.2s ease-out",
        "slide-in":  "slideIn 0.2s ease-out",
        "scale-in":  "scaleIn 0.15s ease-out",
        "shimmer":   "shimmer 1.8s ease-in-out infinite",
        "ping-slow": "ping 2.5s cubic-bezier(0,0,0.2,1) infinite",
        "spin-slow": "spin 4s linear infinite",
        "bounce-sm": "bounceSm 1s ease-in-out infinite",
      },

      keyframes: {
        fadeIn:  { from: { opacity: 0 },                       to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        slideIn: { from: { opacity: 0, transform: "translateX(-6px)" }, to: { opacity: 1, transform: "translateX(0)" } },
        scaleIn: { from: { opacity: 0, transform: "scale(0.97)" }, to: { opacity: 1, transform: "scale(1)" } },
        shimmer: {
          "0%":   { backgroundPosition: "-600px 0" },
          "100%": { backgroundPosition: "600px 0"  },
        },
        bounceSm: {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-2px)" },
        },
      },
    },
  },
  plugins: [],
};