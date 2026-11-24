import { useSyncExternalStore } from 'react';
import type { AppData } from '../types';
import { getData, normalizeData, replaceData, subscribe } from './store';

/**
 * Sincronização opcional com um Gist PRIVADO na sua conta do GitHub.
 * O token fica só neste navegador (localStorage), nunca vai para o Gist nem para o repositório.
 * Em outro aparelho basta colar o mesmo token: o app encontra o Gist pelo nome do arquivo.
 */

const CONFIG_KEY = 'deck-review:sync';
export const GIST_FILE = 'deck-review-data.json';
const API = 'https://api.github.com';

export interface SyncConfig {
  token: string;
  gistId: string | null;
}

export type SyncPhase = 'off' | 'idle' | 'syncing' | 'ok' | 'error';

export interface SyncState {
  phase: SyncPhase;
  message: string;
  lastSync: string | null;
}

let config: SyncConfig | null = loadConfig();
let syncState: SyncState = { phase: config ? 'idle' : 'off', message: '', lastSync: null };
let lastSyncedStamp: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let applyingRemote = false;
const syncListeners = new Set<() => void>();

function loadConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as SyncConfig;
    return c.token ? c : null;
  } catch {
    return null;
  }
}

function saveConfig(c: SyncConfig | null) {
  config = c;
  if (c) localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
  else localStorage.removeItem(CONFIG_KEY);
}

function setSync(patch: Partial<SyncState>) {
  syncState = { ...syncState, ...patch };
  for (const l of syncListeners) l();
}

export function getSyncConfig(): SyncConfig | null {
  return config;
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (l) => {
      syncListeners.add(l);
      return () => syncListeners.delete(l);
    },
    () => syncState,
  );
}

async function gh<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Token inválido ou expirado.');
    if (res.status === 403 || res.status === 404) throw new Error('O token não tem permissão para Gists (precisa do escopo "gist").');
    throw new Error(`GitHub respondeu ${res.status}.`);
  }
  return (await res.json()) as T;
}

interface GistFile {
  filename: string;
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}
interface Gist {
  id: string;
  updated_at: string;
  files: Record<string, GistFile>;
}

async function findGist(token: string): Promise<string | null> {
  for (let page = 1; page <= 5; page++) {
    const list = await gh<Gist[]>(`/gists?per_page=100&page=${page}`, token);
    const hit = list.find((g) => GIST_FILE in g.files);
    if (hit) return hit.id;
    if (list.length < 100) break;
  }
  return null;
}

async function createGist(token: string, data: AppData): Promise<string> {
  const g = await gh<Gist>('/gists', token, {
    method: 'POST',
    body: JSON.stringify({
      description: 'Deck Review — dados do app (privado)',
      public: false,
      files: { [GIST_FILE]: { content: JSON.stringify(data) } },
    }),
  });
  return g.id;
}

async function readGist(token: string, id: string): Promise<AppData | null> {
  const g = await gh<Gist>(`/gists/${id}`, token);
  const f = g.files[GIST_FILE];
  if (!f) return null;
  let content = f.content ?? '';
  if (f.truncated && f.raw_url) content = await (await fetch(f.raw_url)).text();
  return content ? normalizeData(JSON.parse(content)) : null;
}

async function writeGist(token: string, id: string, data: AppData): Promise<void> {
  await gh<Gist>(`/gists/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(data) } } }),
  });
}

function stamp() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Liga a sincronização: acha (ou cria) o Gist e junta com os dados locais. */
export async function connect(token: string): Promise<void> {
  const t = token.trim();
  if (!t) throw new Error('Cole um token.');
  setSync({ phase: 'syncing', message: 'Conectando…' });
  try {
    let gistId = await findGist(t);
    if (!gistId) gistId = await createGist(t, getData());
    saveConfig({ token: t, gistId });
    await syncNow();
  } catch (e) {
    setSync({ phase: 'error', message: (e as Error).message });
    throw e;
  }
}

export function disconnect(): void {
  saveConfig(null);
  lastSyncedStamp = null;
  setSync({ phase: 'off', message: '', lastSync: null });
}

/** Baixa da nuvem se lá estiver mais novo; senão envia o local. */
export async function syncNow(): Promise<void> {
  if (!config?.gistId) return;
  setSync({ phase: 'syncing', message: 'Sincronizando…' });
  try {
    const remote = await readGist(config.token, config.gistId);
    const local = getData();
    if (remote && remote.updatedAt > local.updatedAt) {
      applyingRemote = true;
      replaceData(remote);
      applyingRemote = false;
      lastSyncedStamp = remote.updatedAt;
    } else if (!remote || remote.updatedAt < local.updatedAt) {
      await writeGist(config.token, config.gistId, local);
      lastSyncedStamp = local.updatedAt;
    } else {
      lastSyncedStamp = local.updatedAt;
    }
    setSync({ phase: 'ok', message: '', lastSync: stamp() });
  } catch (e) {
    applyingRemote = false;
    setSync({ phase: 'error', message: (e as Error).message });
  }
}

async function pushNow(): Promise<void> {
  if (!config?.gistId) return;
  const local = getData();
  if (local.updatedAt === lastSyncedStamp) return;
  setSync({ phase: 'syncing', message: 'Salvando na nuvem…' });
  try {
    await writeGist(config.token, config.gistId, local);
    lastSyncedStamp = local.updatedAt;
    setSync({ phase: 'ok', message: '', lastSync: stamp() });
  } catch (e) {
    setSync({ phase: 'error', message: (e as Error).message });
  }
}

/** Chamado uma vez no início do app. */
export function startSync(): void {
  if (config?.gistId) void syncNow();
  subscribe(() => {
    if (!config?.gistId || applyingRemote) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void pushNow(), 2000);
  });
  // ao voltar para a aba (ex.: abriu no celular depois de usar no PC), busca novidades
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && config?.gistId) void syncNow();
  });
}
