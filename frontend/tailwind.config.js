/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Swiss-Retro Fusion Palette
        pitch: {
          white: "#F8F7F2",      // Off-white paper
          cream: "#F2F0E8",      // Warm cream
          linen: "#EAE7DA",      // Linen texture base
          grid:  "#E0DDD0",      // Grid lines
        },
        ink: {
          black: "#1A1916",      // Rich ink black
          dark:  "#2C2A26",      // Dark charcoal
          mid:   "#5C5A54",      // Mid tone
          light: "#8C8A84",      // Light ink
        },
        neon: {
          green:  "#00FF87",     // Arcade neon green
          cyan:   "#00E5FF",     // Electric cyan
          yellow: "#FFE600",     // Retro yellow
          orange: "#FF6B00",     // Stadium orange
          pink:   "#FF2D78",     // Arcade magenta
        },
        signal: {
          emerald: "#00C060",    // Primary brand emerald
          teal:    "#00A896",    // Secondary teal
          amber:   "#F59E0B",    // Warning amber
          red:     "#E53E3E",    // Danger red
        },
      },
      fontFamily: {
        display: ["'Inter'", "Helvetica Neue", "Arial", "sans-serif"],
        mono:    ["'JetBrains Mono'", "Courier New", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "3xs": ["0.5rem",   { lineHeight: "0.75rem"  }],
      },
      backgroundImage: {
        "retro-grid": `
          linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)
        `,
        "neon-glow-green": "radial-gradient(circle, rgba(0,255,135,0.15) 0%, transparent 70%)",
        "neon-glow-cyan":  "radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)",
      },
      backgroundSize: {
        "grid-sm": "24px 24px",
        "grid-md": "48px 48px",
        "grid-lg": "96px 96px",
      },
      boxShadow: {
        "neon-green": "0 0 20px rgba(0,255,135,0.3), 0 0 40px rgba(0,255,135,0.1)",
        "neon-cyan":  "0 0 20px rgba(0,229,255,0.3), 0 0 40px rgba(0,229,255,0.1)",
        "neon-yellow":"0 0 20px rgba(255,230,0,0.35), 0 0 40px rgba(255,230,0,0.15)",
        "retro-card": "4px 4px 0px #1A1916",
        "retro-card-lg": "6px 6px 0px #1A1916",
        "retro-card-hover": "8px 8px 0px #1A1916",
        "swiss-panel": "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
      },
      animation: {
        "scan-line":     "scanLine 3s linear infinite",
        "retro-blink":   "retroBlink 1.2s step-end infinite",
        "neon-pulse":    "neonPulse 2s ease-in-out infinite",
        "ticker-scroll": "tickerScroll 30s linear infinite",
        "fade-up":       "fadeUp 0.4s ease-out both",
        "slide-in":      "slideIn 0.3s ease-out both",
      },
      keyframes: {
        scanLine: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        retroBlink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        neonPulse: {
          "0%, 100%": { opacity: "0.85", filter: "brightness(1)" },
          "50%":      { opacity: "1",    filter: "brightness(1.15)" },
        },
        tickerScroll: {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
}
