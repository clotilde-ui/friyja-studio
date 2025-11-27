import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // <-- Port changé de 5173 à 5174
    strictPort: true,
    host: true
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});