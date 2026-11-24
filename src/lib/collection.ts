import type { CardEntry, CollectionItem } from '../types';
import { cardKey, normalize } from './decklist';
import { uid } from './format';

export function isBasicEnergy(c: Pick<CardEntry, 'name' | 'type'>): boolean {
  if (c.type !== 'energia') return false;
  return /^basic\b/i.test(c.name) || /b[aá]sica/i.test(c.name) || /^\{[a-z]\}\s*energy$/i.test(c.name);
}

export interface OwnershipLine {
  card: CardEntry;
  needed: number;
  exact: number; // mesma impressão (ou mesmo nome, quando a lista não diz a coleção)
  alt: number; // outra impressão com o mesmo nome
  missing: number;
}

export interface OwnershipReport {
  lines: OwnershipLine[];
  needed: number;
  missing: number;
  alt: number;
  /** Tem todas as cartas, considerando outras impressões do mesmo nome. */
  buildable: boolean;
  /** Tem todas as cartas na impressão exata da lista. */
  exactBuildable: boolean;
}

/**
 * Confere a lista contra a coleção.
 * 1º usa a impressão exata (nome + coleção + número); depois completa com outras
 * impressões do mesmo nome. Energia básica e Treinador de outra impressão são a mesma
 * carta para o jogo; Pokémon de outra impressão pode ter ataques diferentes — a tela avisa.
 */
export function checkDeck(cards: CardEntry[], collection: CollectionItem[]): OwnershipReport {
  // estoque disponível por impressão
  const pool = new Map<string, { name: string; qty: number }>();
  for (const it of collection) {
    if (it.qty <= 0) continue;
    const k = cardKey(it);
    const e = pool.get(k) ?? { name: normalize(it.name), qty: 0 };
    e.qty += it.qty;
    pool.set(k, e);
  }

  const take = (pred: (k: string, e: { name: string; qty: number }) => boolean, want: number): number => {
    let got = 0;
    for (const [k, e] of pool) {
      if (got >= want) break;
      if (e.qty <= 0 || !pred(k, e)) continue;
      const t = Math.min(e.qty, want - got);
      e.qty -= t;
      got += t;
    }
    return got;
  };

  const lines: OwnershipLine[] = cards.map((card) => ({ card, needed: card.qty, exact: 0, alt: 0, missing: 0 }));

  // passo 1: impressão exata (cartas sem coleção/número aceitam qualquer impressão do nome)
  for (const l of lines) {
    const name = normalize(l.card.name);
    const hasPrint = Boolean(l.card.set && l.card.number);
    const k = cardKey(l.card);
    l.exact = take((pk, e) => (hasPrint ? pk === k : e.name === name), l.needed);
  }
  // passo 2: outras impressões do mesmo nome
  for (const l of lines) {
    const rest = l.needed - l.exact;
    if (rest <= 0) continue;
    const name = normalize(l.card.name);
    const got = take((_, e) => e.name === name, rest);
    if (isBasicEnergy(l.card)) l.exact += got;
    else l.alt = got;
    l.missing = rest - got;
  }

  const sum = (f: (l: OwnershipLine) => number) => lines.reduce((s, l) => s + f(l), 0);
  const missing = sum((l) => l.missing);
  const alt = sum((l) => l.alt);
  return {
    lines,
    needed: sum((l) => l.needed),
    missing,
    alt,
    buildable: missing === 0,
    exactBuildable: missing === 0 && alt === 0,
  };
}

/** Soma cartas à coleção (mesma impressão = soma quantidade). */
export function mergeIntoCollection(collection: CollectionItem[], cards: CardEntry[]): CollectionItem[] {
  const next = collection.map((c) => ({ ...c }));
  for (const card of cards) {
    const k = cardKey(card);
    const found = next.find((c) => cardKey(c) === k);
    if (found) found.qty += card.qty;
    else next.push({ ...card, id: uid() });
  }
  return next;
}

export function collectionTotals(collection: CollectionItem[]): { cards: number; unique: number } {
  return { cards: collection.reduce((s, c) => s + c.qty, 0), unique: collection.length };
}
