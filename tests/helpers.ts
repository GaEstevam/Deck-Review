import type { Game, GameResult, Match } from '../src/types';

let n = 0;

/** Cria uma partida de teste. `games` como "VD V" → jogos V, D, V. */
export function match(opts: Partial<Match> & { res?: string; turns?: (1 | 2 | null)[] } = {}): Match {
  const { res = 'V', turns = [], ...rest } = opts;
  const games: Game[] = res
    .replace(/\s/g, '')
    .split('')
    .map((r, i) => ({ result: r as GameResult, turn: turns[i] ?? null }));
  n++;
  return {
    id: `m${n}`,
    date: '2026-12-01',
    createdAt: new Date(2026, 0, 1, 0, 0, n).toISOString(),
    deckId: 'd1',
    versionId: 'v1',
    opponent: 'Gardevoir ex',
    games,
    venue: 'online',
    timeout: false,
    lossReason: null,
    cards: [],
    note: '',
    ...rest,
  };
}

export function many(count: number, opts: Parameters<typeof match>[0]): Match[] {
  return Array.from({ length: count }, () => match(opts));
}
