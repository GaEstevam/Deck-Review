/**
 * Onde cada parte dos dados fica no Firestore:
 *
 *   usuarios/{uid}                       perfil (nome, e-mail, último acesso)
 *   usuarios/{uid}/decks/{deckId}
 *   usuarios/{uid}/versoes/{versaoId}
 *   usuarios/{uid}/partidas/{partidaId}
 *   usuarios/{uid}/colecao/{cartaId}
 *   usuarios/{uid}/config/meta           meta (decks mais jogados)
 *   usuarios/{uid}/config/preferencias   evento alvo, deck selecionado…
 *
 * As regras (firestore.rules) só deixam o dono do {uid} ler e escrever aqui.
 */
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type WriteBatch,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import type { Meta, Settings } from '../types';
import { CONFIG, LISTS, META_DOC, SETTINGS_DOC, type ListKey, type WriteOp } from './diff';
import { getDb } from './sdk';

export type Part =
  | { kind: 'list'; key: ListKey; items: { id: string }[] }
  | { kind: 'meta'; value: Partial<Meta> | null }
  | { kind: 'settings'; value: Partial<Settings> | null };

/** Escuta os dados do usuário em tempo real; `onPart` recebe cada parte sempre que ela muda. */
export function subscribeUserData(uid: string, onPart: (p: Part) => void, onError: (e: Error) => void): () => void {
  const db = getDb();
  const unsubs: (() => void)[] = [];
  for (const key of Object.keys(LISTS) as ListKey[]) {
    unsubs.push(
      onSnapshot(
        collection(db, 'usuarios', uid, LISTS[key]),
        (snap) => onPart({ kind: 'list', key, items: snap.docs.map((d) => ({ ...(d.data() as object), id: d.id })) }),
        onError,
      ),
    );
  }
  unsubs.push(
    onSnapshot(doc(db, 'usuarios', uid, CONFIG, META_DOC), (s) => onPart({ kind: 'meta', value: s.exists() ? (s.data() as Meta) : null }), onError),
    onSnapshot(
      doc(db, 'usuarios', uid, CONFIG, SETTINGS_DOC),
      (s) => onPart({ kind: 'settings', value: s.exists() ? (s.data() as Settings) : null }),
      onError,
    ),
  );
  return () => unsubs.forEach((u) => u());
}

/** Grava as mudanças em lotes de até 450 operações (o limite do Firestore é 500 por lote). */
export async function writeOps(uid: string, ops: WriteOp[]): Promise<void> {
  if (!ops.length) return;
  const db = getDb();
  const commits: Promise<void>[] = [];
  let batch: WriteBatch = writeBatch(db);
  let count = 0;
  for (const op of ops) {
    const ref = doc(db, 'usuarios', uid, op.path[0], op.path[1]);
    if (op.data) batch.set(ref, op.data);
    else batch.delete(ref);
    if (++count === 450) {
      commits.push(batch.commit());
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count) commits.push(batch.commit());
  await Promise.all(commits);
}

/** Documento raiz do usuário: nome, e-mail e último acesso. */
export async function saveProfile(uid: string, profile: { nome?: string; email: string }): Promise<void> {
  await setDoc(doc(getDb(), 'usuarios', uid), { ...profile, ultimoAcesso: serverTimestamp() }, { merge: true });
}
