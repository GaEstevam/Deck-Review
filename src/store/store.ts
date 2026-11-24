import { useSyncExternalStore } from 'react';
import type { AppData } from '../types';

const STORAGE_KEY = 'deck-review:data';

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

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : emptyData();
  } catch {
    return emptyData();
  }
}

let state: AppData = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Falha ao salvar no navegador', e);
  }
}

function emit() {
  for (const l of listeners) l();
}

export function getData(): AppData {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Aplica uma alteração (pode mutar o rascunho) e salva. */
export function update(mutate: (draft: AppData) => void): void {
  const draft = structuredClone(state);
  mutate(draft);
  draft.updatedAt = new Date().toISOString();
  state = draft;
  persist();
  emit();
}

/** Substitui tudo (importação ou dados vindos da nuvem). Mantém o updatedAt recebido. */
export function replaceData(data: AppData): void {
  state = normalizeData(data);
  persist();
  emit();
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData);
}
