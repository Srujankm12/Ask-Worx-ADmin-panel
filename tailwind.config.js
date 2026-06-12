/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#110196",
        secondary: "#00c6ff",
        dark: "#0a0a0a",
        accent: "#ff3d00",
      },
    },
  },
  plugins: [],
}
