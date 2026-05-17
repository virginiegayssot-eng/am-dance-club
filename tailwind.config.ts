import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          light: "#e5c3cb",
          DEFAULT: "#e4c3cc",
        },
        blue: {
          light: "#a3bdfe",
          DEFAULT: "#2041d8",
        },
        cream: "#fff8f3",
      },
      fontFamily: {
        heading: ["var(--font-archivo)", "sans-serif"],
        body: ["var(--font-space-grotesk)", "sans-serif"],
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #e4c3cc 0%, #a3bdfe 50%, #2041d8 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
