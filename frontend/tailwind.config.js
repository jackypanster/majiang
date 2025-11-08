/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Mahjong tile colors
        'tile-wan': '#1e3a8a',   // Blue (万 - Characters)
        'tile-tiao': '#166534',  // Green (条 - Bamboos)
        'tile-tong': '#991b1b'   // Red (筒 - Dots)
      }
    }
  },
  plugins: []
}
