/**
 * SDK web modular do Firebase, carregado direto do CDN oficial (gstatic).
 * Ele não entra no pacote do site: o navegador baixa estes módulos do Google.
 * O pacote "firebase" do npm é usado apenas para os tipos (ver src/types/firebase-cdn.d.ts).
 */
import { initializeApp, type FirebaseApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import { connectAuthEmulator, getAuth, type Auth } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { emulatorConfig, firebaseConfig, useEmulators } from './config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function init() {
  if (app) return;
  app = initializeApp(useEmulators ? emulatorConfig : firebaseConfig);
  auth = getAuth(app);
  auth.languageCode = 'pt-BR'; // e-mails de redefinição de senha em português
  db = initializeFirestore(app, {
    // guarda uma cópia local: o app abre rápido e funciona sem internet, sincronizando depois
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    // campos opcionais vazios (ex.: carta sem coleção) não viram erro
    ignoreUndefinedProperties: true,
  });
  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

export function getFirebaseAuth(): Auth {
  init();
  return auth!;
}

export function getDb(): Firestore {
  init();
  return db!;
}
