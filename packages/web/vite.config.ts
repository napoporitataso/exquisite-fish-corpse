import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/exquisite-fish-corpse/',
  css: {
    postcss: {
      plugins: [autoprefixer],
    },
  },
  server: {
    port: 3000,
  },
});
