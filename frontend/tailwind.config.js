/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // ✅ Use class-based dark mode for manual control
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {},
  },
  plugins: [require("flowbite/plugin")], // ✅ Ensure Flowbite works with Tailwind
};