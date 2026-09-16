/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        art: {
          navy: '#0B2447',
          navy2: '#123362',
          navy3: '#1B4480',
          green: '#00843D',
          green2: '#14A85C',
          red: '#EF3340',
          red2: '#C4161C',
          gold: '#FDB913',
          bg: '#F2F5FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(11, 36, 71, 0.08), 0 4px 16px rgba(11, 36, 71, 0.06)',
        panel: '0 8px 30px rgba(11, 36, 71, 0.18)',
      },
    },
  },
  plugins: [],
}
