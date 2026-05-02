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
          50: "#F6F9F7",
          100: "#EDF4EF",
          200: "#D9E8DC",
          300: "#BDD8C3",
          400: "#8FBF99",
          500: "#639E6F",
          600: "#4A7A54",
          700: "#365A3E",
          800: "#263F2B",
          900: "#18281C",
        },
        ocean: {
          DEFAULT: "#1D9E75",  // Main teal from logo
          light: "#E1F5EE",    // Light teal background
          dark: "#0F6E56"      // Darker teal
        },
        moss: {
          DEFAULT: "#5DCAA5",  // Bright teal accent
          light: "#9FE1CB",    // Soft teal
          dark: "#085041"      // Deep teal
        },
        coral: {
          DEFAULT: "#FAC775",  // Golden orange from logo
          light: "#FAEEDA",    // Light peachy background
          dark: "#BA7517"      // Deeper orange
        },
        amber: {
          DEFAULT: "#EF9F27",  // Rich golden orange
          light: "#FAEEDA",    // Light warm background
          dark: "#854F0B"      // Dark amber/brown
        },
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
