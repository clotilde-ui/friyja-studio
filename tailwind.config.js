/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        studio: {
          dark: '#272727',    // Votre fond principal
          card: '#333333',    // Pour les cartes (légèrement plus clair)
          light: '#E5E5E5',   // Texte principal
          dim: '#A0A0A0',     // Texte secondaire
          accent: '#26B743',  // Votre vert Freyja
        }
      }
    },
  },
  plugins: [],
};