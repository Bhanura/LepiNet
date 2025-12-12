/** @type {import('tailwindcss').Config} */
module.exports = {
  // FIXED: Updated paths to scan the correct directories
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}