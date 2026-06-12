import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        line: "#d7dde8",
        mist: "#f4f7fb",
        sage: "#dcebd7",
        gold: "#fff2c7",
        cobalt: "#1f3f73"
      },
      boxShadow: {
        soft: "0 10px 35px rgba(23, 32, 51, 0.08)"
      }
    },
  },
  plugins: [],
};

export default config;
