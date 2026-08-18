import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1420",
          900: "#101D2E",
          800: "#16283D",
          700: "#1D3550",
          600: "#28486B",
        },
        sand: {
          50: "#FBF9F4",
          100: "#F5F0E4",
          200: "#EAE1CB",
        },
        gold: {
          400: "#C9A44C",
          500: "#B08A34",
          600: "#8F6E24",
        },
        hot: "#C2410C",
        warm: "#B7791F",
        cold: "#2563A8",
        unqualified: "#6B7280",
      },
      fontFamily: {
        display: [
          "Iowan Old Style",
          "Palatino Linotype",
          "URW Palladio L",
          "Georgia",
          "serif",
        ],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,29,46,0.06), 0 1px 1px rgba(16,29,46,0.04)",
        panel: "0 4px 24px rgba(16,29,46,0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
