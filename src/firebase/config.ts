/**
 * Configuração do projeto Firebase.
 *
 * Copie os valores do console: Configurações do projeto → Seus apps → App da Web → "firebaseConfig".
 * Estes valores são PÚBLICOS por natureza (vão para o navegador de qualquer visitante).
 * Quem protege os dados são as Regras de Segurança do Firestore (arquivo firestore.rules).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyACRcn7p1ioDRAwtVLQzLF_s6rD-di5rUM',
  authDomain: 'pokemon-deck-review.firebaseapp.com',
  projectId: 'pokemon-deck-review',
  storageBucket: 'pokemon-deck-review.firebasestorage.app',
  messagingSenderId: '421457037537',
  appId: '1:421457037537:web:7b13c0243f7b00094f0fa0',
  measurementId: 'G-RJMT50YCGL', // Analytics: não usado pelo app
};

/** Em desenvolvimento, `npm run dev:emulador` usa os emuladores locais do Firebase. */
export const useEmulators = import.meta.env.VITE_FIREBASE_EMULATOR === '1';

export const emulatorConfig = {
  apiKey: 'demo-key',
  authDomain: 'demo-deck-review.firebaseapp.com',
  projectId: 'demo-deck-review',
  appId: 'demo-app',
};

export const isConfigured = useEmulators || !Object.values(firebaseConfig).some((v) => v.includes('COLE_AQUI'));
