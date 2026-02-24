import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyan: {
          brand: "#4EC5D4",
        },
        charcoal: {
          DEFAULT: "#2D2D2D",
          deep: "#0A0A0A",
          dark: "#111111",
          mid: "#1A1A1A",
        },
        amber: {
          brand: "#F59E0B",
        },
      },
      fontFamily: {
        heading: ["var(--font-outfit)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
