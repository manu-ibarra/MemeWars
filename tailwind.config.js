/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',
        brand: '#FFE600',
        brand2: '#FFD400',
        card: '#1A1A1A',
        line: '#2A2A2A',
      },
      fontFamily: {
        display: ['Bungee', 'Luckiest Guy', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        hard: '4px 4px 0 #FFE600',
        hardsm: '2px 2px 0 #FFE600',
      },
    },
  },
  plugins: [],
};
