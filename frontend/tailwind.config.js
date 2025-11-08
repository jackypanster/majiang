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
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out'
      }
    }
  },
  plugins: []
}
