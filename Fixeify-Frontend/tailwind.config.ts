import daisyui from "daisyui";
import typography from "@tailwindcss/typography";
import plugin from "tailwindcss/plugin";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [
    daisyui,
    typography,
    plugin(function ({ addUtilities }) {
      const newUtilities = {
        ".supports-[backdrop-filter]:bg-transparent": {
          "@supports (backdrop-filter: blur(0))": {
            background: "transparent",
          },
        },
        ".supports-[backdrop-filter]:bg-opacity-0": {
          "@supports (backdrop-filter: blur(0))": {
            "background-opacity": "0",
          },
        },
      };
      addUtilities(newUtilities);
    }),
  ],
  daisyui: {
    themes: ["light", "dark"],
  },
};