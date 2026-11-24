import type { AppData } from '../types';
import { normalizeData } from './store';

/**
 * Antes do login, o app guardava tudo no navegador (localStorage).
 * Ao entrar pela primeira vez, oferecemos levar esses dados para a conta no Firestore.
 * Os dados antigos não são apagados: ficam no navegador como cópia de segurança.
 */
const LEGACY_KEY = 'deck-review:data';
const doneKey = (uid: string) => `deck-review:migracao:${uid}`;

export function readLegacyData(): AppData | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const data = normalizeData(JSON.parse(raw));
    const hasContent = data.decks.length || data.matches.length || data.collection.length || data.meta.entries.length;
    return hasContent ? data : null;
  } catch {
    return null;
  }
}

const IMPORTED_KEY = 'deck-review:migracao-importada';

/** Já decidido por esta conta, ou os dados já foram importados por alguma conta neste navegador. */
export function migrationHandled(uid: string): boolean {
  return localStorage.getItem(doneKey(uid)) !== null || localStorage.getItem(IMPORTED_KEY) !== null;
}

export function markMigration(uid: string, result: 'importado' | 'ignorado'): void {
  localStorage.setItem(doneKey(uid), `${result}:${new Date().toISOString()}`);
  if (result === 'importado') localStorage.setItem(IMPORTED_KEY, uid);
}

// Configuração da sincronização antiga por Gist (substituída pelo Firestore).
localStorage.removeItem('deck-review:sync');
