import { defineConfig } from 'vitest/config';

// Testes das regras do Firestore: rodam contra o emulador (npm run test:regras).
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
