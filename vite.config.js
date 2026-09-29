import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        driversPrivacidad: resolve(import.meta.dirname, 'drivers/privacidad/index.html'),
      },
    },
  },
  plugins: [
    tailwindcss(),
  ],
});
