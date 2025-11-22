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
          bg: '#FAF5ED',      // FOND APP (Crème)
          text: '#232323',    // TEXTE PRINCIPAL (Noir Freyja)
          
          card: '#232323',    // FOND CARTES (Noir Freyja)
          cardText: '#FAF5ED',// TEXTE SUR CARTES (Crème)
          
          accent: '#24B745',  // VERT FREYJA
          pink: '#FFBEFA',    // Rose
        }
      }
    },
  },
  plugins: [],
};