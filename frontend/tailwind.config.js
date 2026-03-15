/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff1f5",
          100: "#ffe0ec",
          200: "#ffc0d9",
          300: "#ff91bd",
          400: "#ff5b9b",
          500: "#ff2d7a",
          600: "#ef0a59",
          700: "#c9004a",
          800: "#a70040",
          900: "#8c003b",
        },
        dark: {
          900: "#0a0a0f",
          800: "#111118",
          700: "#1a1a27",
          600: "#242436",
          500: "#2e2e45",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 3s ease-in-out infinite",
        "gift-pop": "giftPop 0.6s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        giftPop: {
          "0%": { transform: "scale(0) translateY(0)", opacity: "0" },
          "60%": { transform: "scale(1.2) translateY(-20px)", opacity: "1" },
          "100%": { transform: "scale(1) translateY(-60px)", opacity: "0" },
        },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
