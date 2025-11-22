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
          dark: '#272727',    // Fond principal
          card: '#333333',    // Fond des cartes
          light: '#E5E5E5',   // Texte principal
          dim: '#A0A0A0',     // Texte secondaire
          
          // Vos couleurs de marque
          accent: '#24B745',  // Vert Freyja (Action principale)
          pink: '#FFBEFA',    // Rose (Action secondaire / Statique)
          cream: '#FAF5ED',   // Crème (Fond clair / Info)
        }
      }
    },
  },
  plugins: [],
};