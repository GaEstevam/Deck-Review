import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' faz o build funcionar em qualquer caminho (GitHub Pages usa /<repo>/).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      // o SDK do Firebase é importado direto do CDN (https://www.gstatic.com/firebasejs/…), não do pacote
      external: [/^https:\/\//],
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/rules/**'],
  },
});
