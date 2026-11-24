import type { CardEntry, CollectionItem, DeckStatus, Match, MetaEntry, Scope, Settings } from '../types';
import { mergeIntoCollection } from '../lib/collection';
import { today, uid } from '../lib/format';
import { update } from './store';

// ---------- Decks e versões ----------

export function createDeck(name: string, cards: CardEntry[], reason: string, status: DeckStatus = 'testando'): string {
  const deckId = uid();
  const versionId = uid();
  update((d) => {
    d.decks.push({ id: deckId, name: name.trim(), status, currentVersionId: versionId, createdAt: new Date().toISOString() });
    d.versions.push({ id: versionId, deckId, number: 1, date: today(), cards, reason: reason.trim() });
    if (!d.settings.selectedDeckId) d.settings.selectedDeckId = deckId;
  });
  return deckId;
}

export function addVersion(deckId: string, cards: CardEntry[], reason: string, date = today()): string {
  const id = uid();
  update((d) => {
    const numbers = d.versions.filter((v) => v.deckId === deckId).map((v) => v.number);
    const number = (numbers.length ? Math.max(...numbers) : 0) + 1;
    d.versions.push({ id, deckId, number, date, cards, reason: reason.trim() });
    const deck = d.decks.find((x) => x.id === deckId);
    if (deck) deck.currentVersionId = id;
  });
  return id;
}

export function setCurrentVersion(deckId: string, versionId: string): void {
  update((d) => {
    const deck = d.decks.find((x) => x.id === deckId);
    if (deck) deck.currentVersionId = versionId;
  });
}

export function updateVersionReason(versionId: string, reason: string): void {
  update((d) => {
    const v = d.versions.find((x) => x.id === versionId);
    if (v) v.reason = reason;
  });
}

export function deleteVersion(versionId: string): void {
  update((d) => {
    const v = d.versions.find((x) => x.id === versionId);
    if (!v) return;
    d.versions = d.versions.filter((x) => x.id !== versionId);
    d.matches = d.matches.filter((m) => m.versionId !== versionId);
    const deck = d.decks.find((x) => x.id === v.deckId);
    if (deck && deck.currentVersionId === versionId) {
      const rest = d.versions.filter((x) => x.deckId === deck.id).sort((a, b) => b.number - a.number);
      deck.currentVersionId = rest[0]?.id ?? null;
    }
  });
}

export function renameDeck(deckId: string, name: string): void {
  update((d) => {
    const deck = d.decks.find((x) => x.id === deckId);
    if (deck && name.trim()) deck.name = name.trim();
  });
}

export function setDeckStatus(deckId: string, status: DeckStatus): void {
  update((d) => {
    const deck = d.decks.find((x) => x.id === deckId);
    if (deck) deck.status = status;
  });
}

export function deleteDeck(deckId: string): void {
  update((d) => {
    d.decks = d.decks.filter((x) => x.id !== deckId);
    d.versions = d.versions.filter((v) => v.deckId !== deckId);
    d.matches = d.matches.filter((m) => m.deckId !== deckId);
    if (d.settings.selectedDeckId === deckId) d.settings.selectedDeckId = d.decks[0]?.id ?? null;
    if (d.settings.lastDeckId === deckId) d.settings.lastDeckId = null;
  });
}

// ---------- Partidas ----------

export function addMatch(match: Omit<Match, 'id' | 'createdAt'>): void {
  update((d) => {
    d.matches.push({ ...match, id: uid(), createdAt: new Date().toISOString() });
    d.settings.lastDeckId = match.deckId;
  });
}

export function deleteMatch(id: string): void {
  update((d) => {
    d.matches = d.matches.filter((m) => m.id !== id);
  });
}

// ---------- Meta ----------

export function setMeta(entries: MetaEntry[], source: string): void {
  update((d) => {
    d.meta = {
      entries: entries.filter((e) => e.deck.trim()).map((e) => ({ deck: e.deck.trim(), share: Number(e.share) || 0 })),
      source: source.trim(),
      updatedAt: today(),
    };
  });
}

// ---------- Coleção ----------

export function addToCollection(cards: CardEntry[]): void {
  update((d) => {
    d.collection = mergeIntoCollection(d.collection, cards);
  });
}

export function updateCollectionItem(id: string, patch: Partial<CollectionItem>): void {
  update((d) => {
    const it = d.collection.find((c) => c.id === id);
    if (it) Object.assign(it, patch);
    d.collection = d.collection.filter((c) => c.qty > 0);
  });
}

export function removeCollectionItem(id: string): void {
  update((d) => {
    d.collection = d.collection.filter((c) => c.id !== id);
  });
}

export function clearCollection(): void {
  update((d) => {
    d.collection = [];
  });
}

// ---------- Preferências ----------

export function setSettings(patch: Partial<Settings>): void {
  update((d) => {
    d.settings = { ...d.settings, ...patch };
  });
}

export function selectDeck(deckId: string): void {
  setSettings({ selectedDeckId: deckId });
}

export function setScope(scope: Scope): void {
  setSettings({ scope });
}
