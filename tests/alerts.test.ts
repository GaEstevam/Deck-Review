import { describe, expect, it } from 'vitest';
import { computeAlerts } from '../src/lib/alerts';
import type { DeckVersion } from '../src/types';
import { many } from './helpers';

const v1: DeckVersion = { id: 'v1', deckId: 'd1', number: 1, date: '2026-11-01', reason: '', cards: [{ name: 'Switch', qty: 2, type: 'treinador' }] };
const v2: DeckVersion = { ...v1, id: 'v2', number: 2 };

const ids = (a: { id: string }[]) => a.map((x) => x.id);

describe('computeAlerts', () => {
  it('confronto abaixo de 45% com 8+ partidas e 10%+ do meta', () => {
    const ms = [...many(3, { opponent: 'Gardevoir ex', res: 'V' }), ...many(5, { opponent: 'Gardevoir ex', res: 'D' })];
    const a = computeAlerts({ matches: ms, deckMatches: ms, meta: [{ deck: 'Gardevoir ex', share: 12 }], versions: [v1], currentVersion: v1 });
    expect(ids(a)).toContain('matchup:gardevoir ex');
    const low = computeAlerts({ matches: ms, deckMatches: ms, meta: [{ deck: 'Gardevoir ex', share: 5 }], versions: [v1], currentVersion: v1 });
    expect(ids(low)).not.toContain('matchup:gardevoir ex');
  });

  it('começo ruim / faltou energia e erro meu nas derrotas', () => {
    const ms = [...many(2, { res: 'D', lossReason: 'comeco_ruim' }), ...many(2, { res: 'D', lossReason: 'erro_meu' }), ...many(4, { res: 'V' })];
    const a = computeAlerts({ matches: ms, deckMatches: ms, meta: [], versions: [v1], currentVersion: v1 });
    expect(ids(a)).toEqual(expect.arrayContaining(['setup', 'erro-meu']));
  });

  it('versão nova 10+ pontos pior que a anterior, com 15+ partidas cada', () => {
    const old = many(15, { versionId: 'v1', res: 'V' });
    const cur = [...many(10, { versionId: 'v2', res: 'V' }), ...many(5, { versionId: 'v2', res: 'D' })];
    const a = computeAlerts({ matches: cur, deckMatches: [...old, ...cur], meta: [], versions: [v1, v2], currentVersion: v2 });
    expect(ids(a)).toContain('version');
  });

  it('carta marcada como inútil em 3+ partidas (se ainda está na lista)', () => {
    const ms = many(3, { cards: [{ name: 'Switch', mark: 'inutil' }] });
    expect(ids(computeAlerts({ matches: ms, deckMatches: ms, meta: [], versions: [v1], currentVersion: v1 }))).toContain('card:switch');
    const without = { ...v1, cards: [] };
    expect(ids(computeAlerts({ matches: ms, deckMatches: ms, meta: [], versions: [without], currentVersion: without }))).not.toContain('card:switch');
  });

  it('tempo acabou em 15%+ das partidas', () => {
    const ms = [...many(2, { timeout: true }), ...many(8, {})];
    expect(ids(computeAlerts({ matches: ms, deckMatches: ms, meta: [], versions: [v1], currentVersion: v1 }))).toContain('timeout');
  });
});
