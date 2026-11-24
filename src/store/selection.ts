import { useMemo } from 'react';
import type { AppData, Deck, DeckVersion, Match } from '../types';
import { useData } from './store';

export interface Selection {
  data: AppData;
  deck: Deck | null;
  version: DeckVersion | null;
  versions: DeckVersion[];
  deckMatches: Match[];
  versionMatches: Match[];
  scopeMatches: Match[];
  scope: AppData['settings']['scope'];
}

export function pickDeck(data: AppData): Deck | null {
  const active = data.decks.filter((d) => d.status !== 'arquivado');
  return (
    data.decks.find((d) => d.id === data.settings.selectedDeckId) ??
    active.find((d) => d.status === 'principal') ??
    active[0] ??
    data.decks[0] ??
    null
  );
}

export function deckVersions(data: AppData, deckId: string | undefined): DeckVersion[] {
  return data.versions.filter((v) => v.deckId === deckId).sort((a, b) => b.number - a.number);
}

/** Deck selecionado, versão atual e as partidas de cada recorte. */
export function useSelection(): Selection {
  const data = useData();
  return useMemo(() => {
    const deck = pickDeck(data);
    const versions = deckVersions(data, deck?.id);
    const version = versions.find((v) => v.id === deck?.currentVersionId) ?? versions[0] ?? null;
    const deckMatches = deck ? data.matches.filter((m) => m.deckId === deck.id) : [];
    const versionMatches = version ? deckMatches.filter((m) => m.versionId === version.id) : [];
    const scope = data.settings.scope;
    return {
      data,
      deck,
      version,
      versions,
      deckMatches,
      versionMatches,
      scopeMatches: scope === 'versao' ? versionMatches : deckMatches,
      scope,
    };
  }, [data]);
}

export function versionLabel(data: AppData, versionId: string): string {
  const v = data.versions.find((x) => x.id === versionId);
  if (!v) return '?';
  const deck = data.decks.find((d) => d.id === v.deckId);
  return `${deck?.name ?? '?'} v${v.number}`;
}
