/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: { 300: '#F5D78E', 400: '#ECC94B', 500: '#D4AF37', 600: '#B8960C', 700: '#9A7D0A' },
        dark: { 900: '#050505', 800: '#0A0A0A', 700: '#111111', 600: '#1A1A1A', 500: '#222222', 400: '#2A2A2A' },
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #F5D78E 50%, #D4AF37 100%)',
      },
    },
  },
  plugins: [],
};
