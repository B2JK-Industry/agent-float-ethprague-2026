import type { Config } from "tailwindcss";

import { brandTheme } from "../../assets/brand/tailwind-preset";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: brandTheme,
  },
};

export default config;
