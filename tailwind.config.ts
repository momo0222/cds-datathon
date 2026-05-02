import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FAFAF8",
          100: "#F5F4F0",
          200: "#E8E6DF",
          300: "#D4D0C8",
          400: "#A8A294",
          500: "#7C7568",
          600: "#5A5548",
          700: "#3D3A30",
          800: "#2A2822",
          900: "#1A1915",
        },
        coral: { DEFAULT: "#E8453C", light: "#FDEDEC", dark: "#B22E27" },
        ocean: { DEFAULT: "#2D5A8E", light: "#E8F0FA", dark: "#1B3A5E" },
        moss: { DEFAULT: "#2DA478", light: "#E6F9F0", dark: "#1E7A56" },
        amber: { DEFAULT: "#EA961E", light: "#FFF6E8", dark: "#B87315" },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        "slide-in": "slideIn 0.3s cubic-bezier(0.16,1,0.3,1)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
