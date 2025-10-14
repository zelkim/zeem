/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './renderer/src/**/*.{html,js,jsx,ts,tsx}',
    './renderer/index.html'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial'],
      },
      colors: {
        bg: '#0b0f1a',
        card: '#0f172a',
        text: '#e5e7eb',
        muted: '#9aa3b2',
        primary: '#94a3b8' // monotone steel
      }
    },
  },
  plugins: [],
}
