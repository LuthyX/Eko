/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#00C896",
          dark: "#00A07A",
          deep: "#007A5C",
          light: "#E8FBF5",
          muted: "#A8EDD8",
        },
        surface: {
          0: "#FFFFFF",
          1: "#F0EFE9",
          2: "#E8E7E0",
          bg: "#F5F4F0",
        },
        text: {
          0: "#0F0F0E",
          1: "#3D3D38",
          2: "#7A7A72",
          3: "#AEAEA6",
        },
        border: {
          light: "rgba(0,0,0,0.08)",
          dark: "rgba(0,0,0,0.13)",
        },
      },
      fontFamily: {
        sans: ["Sora", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "10px",
        md: "14px",
        lg: "20px",
        xl: "26px",
      },
    },
  },
  plugins: [],
};
