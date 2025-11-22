/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // Redéfinition complète selon votre charte
        white: '#FAF5ED', // Le "Nouveau Blanc" est Beige
        black: '#232323', // Le "Nouveau Noir" est Anthracite
        
        studio: {
          bg: '#FAF5ED',      // FOND APP
          text: '#232323',    // TEXTE PAGE
          
          card: '#232323',    // FOND CARTES
          cardText: '#FAF5ED',// TEXTE CARTES
          
          accent: '#24B745',  // VERT
          accentHover: '#1f9e3b',
        }
      }
    },
  },
  plugins: [],
};