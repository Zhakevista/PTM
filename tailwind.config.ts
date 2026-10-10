import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          500: "#3b82f6",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      keyframes: {
        flashRed: {
          "0%, 100%": { backgroundColor: "#1e3a8a" },
          "50%": { backgroundColor: "#dc2626" },
        },
        pulseGreen: {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(34,197,94,0.7)" },
          "50%": { transform: "scale(1.04)", boxShadow: "0 0 0 24px rgba(34,197,94,0)" },
        },
      },
      animation: {
        "flash-red": "flashRed 0.7s ease-in-out infinite",
        "pulse-green": "pulseGreen 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
