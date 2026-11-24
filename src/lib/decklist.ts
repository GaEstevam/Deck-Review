import type { CardEntry, CardType } from '../types';
import { TYPE_LABEL, TYPE_ORDER } from './labels';

export interface ParseResult {
  cards: CardEntry[];
  total: number;
  errors: string[];
}

const HEADER = /^(pok[eé]mon|trainers?|treinador(?:es)?|energ(?:y|ies|ia|ias))\s*[:\-–]?\s*\(?\d*\)?\s*$/i;
const IGNORE = /^(total(\s+cards)?|cartas|deck|lista)\s*[:\-]?\s*\d*\s*$/i;
const LINE = /^(\d+)\s*x?\s+(.+?)\s*$/i;
const SET_NUM = /^(.*?)\s+([A-Z][A-Z0-9]{1,5}(?:-[A-Z0-9]{1,4})?)\s+([A-Za-z]{0,4}\d+[a-z]?)$/;

function headerType(h: string): CardType {
  const s = h.toLowerCase();
  if (s.startsWith('pok')) return 'pokemon';
  if (s.startsWith('energ')) return 'energia';
  return 'treinador';
}

function guessType(name: string): CardType {
  return /\benerg(y|ia)\b/i.test(name) ? 'energia' : 'pokemon';
}

/**
 * Lê uma lista colada do TCG Live (ou formato parecido):
 *
 *   Pokémon: 12
 *   4 Dreepy TWM 128
 *   Trainer: 36
 *   4 Ultra Ball SVI 196
 *   Energy: 12
 *   6 Basic {R} Energy SVE 2
 */
export function parseDecklist(text: string): ParseResult {
  const cards: CardEntry[] = [];
  const errors: string[] = [];
  let current: CardType | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^[*•\-]\s+/, '').trim();
    if (!line) continue;
    if (HEADER.test(line)) {
      current = headerType(line);
      continue;
    }
    if (IGNORE.test(line)) continue;
    const m = LINE.exec(line);
    if (!m) {
      errors.push(`Linha não reconhecida: "${raw.trim()}"`);
      continue;
    }
    const qty = Number(m[1]);
    let name = m[2];
    let set: string | undefined;
    let number: string | undefined;
    const sn = SET_NUM.exec(name);
    if (sn && sn[1].trim()) {
      name = sn[1].trim();
      set = sn[2];
      number = sn[3];
    }
    const card: CardEntry = { name, qty, type: current ?? guessType(name) };
    if (set) card.set = set;
    if (number) card.number = number;
    cards.push(card);
  }

  return { cards: mergeDuplicates(cards), total: cards.reduce((s, c) => s + c.qty, 0), errors };
}

export function cardKey(c: Pick<CardEntry, 'name' | 'set' | 'number'>): string {
  return [normalize(c.name), (c.set ?? '').toUpperCase(), (c.number ?? '').toUpperCase()].join('|');
}

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function mergeDuplicates(cards: CardEntry[]): CardEntry[] {
  const map = new Map<string, CardEntry>();
  for (const c of cards) {
    const k = cardKey(c);
    const prev = map.get(k);
    if (prev) prev.qty += c.qty;
    else map.set(k, { ...c });
  }
  return [...map.values()];
}

export function totalCards(cards: CardEntry[]): number {
  return cards.reduce((s, c) => s + c.qty, 0);
}

export function groupByType<T extends CardEntry>(cards: T[]): { type: CardType; label: string; cards: T[]; total: number }[] {
  return TYPE_ORDER.map((type) => {
    const list = cards.filter((c) => c.type === type);
    return { type, label: TYPE_LABEL[type], cards: list, total: totalCards(list) };
  }).filter((g) => g.cards.length > 0);
}

/** Gera o texto no formato do TCG Live, para copiar/colar. */
export function formatDecklist(cards: CardEntry[]): string {
  const header: Record<CardType, string> = { pokemon: 'Pokémon', treinador: 'Trainer', energia: 'Energy' };
  return groupByType(cards)
    .map((g) => {
      const lines = g.cards.map((c) => [c.qty, c.name, c.set, c.number].filter(Boolean).join(' '));
      return `${header[g.type]}: ${g.total}\n${lines.join('\n')}`;
    })
    .join('\n\n');
}

export interface Change {
  name: string;
  delta: number;
}

/** Mudanças entre duas versões, agrupadas por nome (troca de impressão não conta). */
export function diffCards(prev: CardEntry[], next: CardEntry[]): Change[] {
  const count = new Map<string, { name: string; a: number; b: number }>();
  for (const c of prev) {
    const k = normalize(c.name);
    const e = count.get(k) ?? { name: c.name, a: 0, b: 0 };
    e.a += c.qty;
    count.set(k, e);
  }
  for (const c of next) {
    const k = normalize(c.name);
    const e = count.get(k) ?? { name: c.name, a: 0, b: 0 };
    e.b += c.qty;
    e.name = c.name;
    count.set(k, e);
  }
  return [...count.values()]
    .map((e) => ({ name: e.name, delta: e.b - e.a }))
    .filter((c) => c.delta !== 0)
    .sort((x, y) => y.delta - x.delta || x.name.localeCompare(y.name));
}

export function formatChanges(changes: Change[]): string {
  if (!changes.length) return 'sem mudanças';
  return changes.map((c) => `${c.delta > 0 ? '+' : '−'}${Math.abs(c.delta)} ${c.name}`).join(', ');
}

/** Nomes únicos das cartas de uma lista (para marcar "grande"/"inútil"). */
export function uniqueNames(cards: CardEntry[]): string[] {
  const seen = new Map<string, string>();
  for (const c of cards) if (!seen.has(normalize(c.name))) seen.set(normalize(c.name), c.name);
  return [...seen.values()];
}
