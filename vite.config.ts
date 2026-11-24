import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' faz o build funcionar em qualquer caminho (GitHub Pages usa /<repo>/).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
