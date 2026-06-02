import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#fff8e6",
          100: "#feefc3",
          200: "#fde18a",
          300: "#fbd14b",
          400: "#f3c01c",
          500: "#d9a300",
          600: "#a87800",
          700: "#7a5500",
        },
      },
    },
  },
  plugins: [],
};

export default config;
