import type { MetaEntry } from '../types';

/** Lê linhas como "Gardevoir ex 18,5%", "1. Gardevoir ex  18.5" ou "Gardevoir ex<TAB>18.5". */
export function parseMetaText(text: string): MetaEntry[] {
  const out: MetaEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(?:\d+[.)]\s*)?(.+?)[\s\t:;-]+(\d+(?:[.,]\d+)?)\s*%?$/.exec(line);
    if (m) out.push({ deck: m[1].trim(), share: Number(m[2].replace(',', '.')) });
  }
  return out;
}
