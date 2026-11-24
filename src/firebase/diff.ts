import type { AppData } from '../types';

/** Partes de AppData guardadas como coleções no Firestore (um documento por item, com `id`). */
export const LISTS = {
  decks: 'decks',
  versions: 'versoes',
  matches: 'partidas',
  collection: 'colecao',
} as const;
export type ListKey = keyof typeof LISTS;

export const CONFIG = 'config';
export const META_DOC = 'meta';
export const SETTINGS_DOC = 'preferencias';

/** Caminho relativo a usuarios/{uid}; `data: null` = apagar. */
export interface WriteOp {
  path: [string, string];
  data: object | null;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Operações para levar o Firestore de `prev` para `next` — só o que mudou. */
export function diffOps(prev: AppData, next: AppData): WriteOp[] {
  const ops: WriteOp[] = [];
  for (const key of Object.keys(LISTS) as ListKey[]) {
    const before = new Map((prev[key] as { id: string }[]).map((x) => [x.id, x]));
    const after = new Map((next[key] as { id: string }[]).map((x) => [x.id, x]));
    for (const [id, item] of after) {
      if (same(before.get(id), item)) continue;
      const data: Record<string, unknown> = { ...item };
      delete data.id;
      ops.push({ path: [LISTS[key], id], data });
    }
    for (const id of before.keys()) if (!after.has(id)) ops.push({ path: [LISTS[key], id], data: null });
  }
  if (!same(prev.meta, next.meta)) ops.push({ path: [CONFIG, META_DOC], data: next.meta });
  if (!same(prev.settings, next.settings)) ops.push({ path: [CONFIG, SETTINGS_DOC], data: next.settings });
  return ops;
}
