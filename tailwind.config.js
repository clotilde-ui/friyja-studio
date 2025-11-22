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
          card: '#333333',    // Fond des cartes
          light: '#E5E5E5',   // Texte
          accent: '#26B743',  // Vert Freyja
        }
      }
    },
  },
  plugins: [],
};