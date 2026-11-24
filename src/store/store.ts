import { useSyncExternalStore } from 'react';
import { diffOps } from '../firebase/diff';
import type { AppData } from '../types';

/**
 * Estado do app em memória, espelhando os dados do usuário logado no Firestore.
 * - Leitura: o Firestore avisa em tempo real (inclusive mudanças feitas em outro aparelho).
 * - Escrita: `update()` muda o estado na hora e grava no Firestore só o que mudou.
 * O acesso ao Firestore é injetado por `bindUser` (ver src/auth/session.ts), o que mantém
 * este arquivo sem dependência do SDK e fácil de testar.
 */

export function emptyData(): AppData {
  return {
    schema: 1,
    decks: [],
    versions: [],
    matches: [],
    meta: { updatedAt: '', source: 'Limitless TCG', entries: [] },
    collection: [],
    settings: {
      eventName: 'Regional do Rio',
      eventDate: '2027-03-06',
      selectedDeckId: null,
      scope: 'versao',
      lastDeckId: null,
    },
    updatedAt: new Date(0).toISOString(),
  };
}

/** Garante que dados antigos/importados tenham todos os campos. */
export function normalizeData(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;
  const d = raw as Partial<AppData>;
  return {
    schema: 1,
    decks: Array.isArray(d.decks) ? d.decks : [],
    versions: Array.isArray(d.versions) ? d.versions : [],
    matches: Array.isArray(d.matches) ? d.matches : [],
    meta: { ...base.meta, ...(d.meta ?? {}), entries: Array.isArray(d.meta?.entries) ? d.meta!.entries : [] },
    collection: Array.isArray(d.collection) ? d.collection : [],
    settings: { ...base.settings, ...(d.settings ?? {}) },
    updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : base.updatedAt,
  };
}

// ---------- Estado ----------

export interface StoreStatus {
  phase: 'idle' | 'loading' | 'ready' | 'error';
  saving: number; // gravações aguardando confirmação do servidor
  error: string | null;
}

export type Writer = (prev: AppData, next: AppData) => Promise<void>;

let state: AppData = emptyData();
let status: StoreStatus = { phase: 'idle', saving: 0, error: null };
let writer: Writer | null = null;
const listeners = new Set<() => void>();
const statusListeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function setStatus(patch: Partial<StoreStatus>) {
  status = { ...status, ...patch };
  for (const l of statusListeners) l();
}

export function getData(): AppData {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData);
}

export function useStoreStatus(): StoreStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
  );
}

// ---------- Ligação com o usuário logado ----------

/** Começa a sessão de um usuário: estado vazio, carregando, e define quem grava. */
export function startSession(w: Writer): void {
  writer = w;
  state = emptyData();
  setStatus({ phase: 'loading', saving: 0, error: null });
  emit();
}

/** Termina a sessão (logout): apaga o estado da memória. */
export function endSession(): void {
  writer = null;
  state = emptyData();
  setStatus({ phase: 'idle', saving: 0, error: null });
  emit();
}

/** Chamado quando chega uma parte dos dados do Firestore. */
export function applyRemote(patch: Partial<AppData>, ready: boolean): void {
  state = { ...state, ...patch };
  if (ready && status.phase === 'loading') setStatus({ phase: 'ready' });
  emit();
}

export function setStoreError(message: string): void {
  setStatus({ phase: status.phase === 'loading' ? 'error' : status.phase, error: message });
}

// ---------- Escrita ----------

function persist(prev: AppData, next: AppData) {
  if (!writer || diffOps(prev, next).length === 0) return;
  setStatus({ saving: status.saving + 1 });
  writer(prev, next)
    .then(() => setStatus({ error: null }))
    .catch((e: Error) => setStatus({ error: `Não foi possível salvar: ${e.message}` }))
    .finally(() => setStatus({ saving: Math.max(0, status.saving - 1) }));
}

/** Aplica uma alteração (pode mutar o rascunho), mostra na hora e grava no Firestore. */
export function update(mutate: (draft: AppData) => void): void {
  if (!writer) return;
  const prev = state;
  const draft = structuredClone(state);
  mutate(draft);
  draft.updatedAt = new Date().toISOString();
  state = draft;
  emit();
  persist(prev, draft);
}

/** Substitui tudo (importação de backup ou dos dados antigos deste aparelho). */
export function replaceData(data: AppData): void {
  update((d) => Object.assign(d, normalizeData(data)));
}
