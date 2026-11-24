import type { GameResult, LossReason, Match, MetaEntry } from '../types';
import { normalize } from './decklist';
import { parseISODate, toISODate } from './format';

export const SMALL_SAMPLE = 10;
export const COMPARE_SMALL_SAMPLE = 15;
export const MATCHUP_MIN_FOR_EXPECTED = 5;

export function matchResult(m: Match): GameResult {
  let w = 0;
  let l = 0;
  for (const g of m.games) {
    if (g.result === 'V') w++;
    else if (g.result === 'D') l++;
  }
  if (w > l) return 'V';
  if (l > w) return 'D';
  return 'E';
}

export interface WinRecord {
  v: number;
  d: number;
  e: number;
  n: number;
  rate: number | null;
  low: number | null;
  high: number | null;
}

/** Intervalo de Wilson (95%) — a "faixa provável" da taxa. */
export function wilson(p: number | null, n: number, z = 1.96): [number | null, number | null] {
  if (p == null || n <= 0) return [null, null];
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export function makeRecord(v: number, d: number, e: number): WinRecord {
  const n = v + d + e;
  const rate = n ? (v + 0.5 * e) / n : null;
  const [low, high] = wilson(rate, n);
  return { v, d, e, n, rate, low, high };
}

/** Taxa = (V + 0,5·E) / (V + D + E), contando cada partida (melhor de 3) uma vez. */
export function record(matches: Match[]): WinRecord {
  let v = 0;
  let d = 0;
  let e = 0;
  for (const m of matches) {
    const r = matchResult(m);
    if (r === 'V') v++;
    else if (r === 'D') d++;
    else e++;
  }
  return makeRecord(v, d, e);
}

export function sortMatches(ms: Match[]): Match[] {
  return [...ms].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export interface MatchupRow {
  key: string;
  name: string;
  share: number; // % do meta (0 se não está no meta)
  inMeta: boolean;
  record: WinRecord;
}

export function matchups(matches: Match[], meta: MetaEntry[]): MatchupRow[] {
  const map = new Map<string, { name: string; share: number; inMeta: boolean; ms: Match[] }>();
  for (const e of meta) {
    map.set(normalize(e.deck), { name: e.deck, share: e.share, inMeta: true, ms: [] });
  }
  for (const m of matches) {
    const k = normalize(m.opponent);
    if (!k) continue;
    let entry = map.get(k);
    if (!entry) {
      entry = { name: m.opponent.trim(), share: 0, inMeta: false, ms: [] };
      map.set(k, entry);
    }
    entry.ms.push(m);
  }
  return [...map.entries()]
    .map(([key, e]) => ({ key, name: e.name, share: e.share, inMeta: e.inMeta, record: record(e.ms) }))
    .sort((a, b) => b.share - a.share || b.record.n - a.record.n || a.name.localeCompare(b.name));
}

export interface ExpectedResult {
  rate: number | null;
  usedMatchups: number; // confrontos com amostra suficiente
  metaEntries: number;
  metaTotal: number; // soma das fatias do meta
}

/**
 * Taxa esperada no evento: Σ fatia_d × taxa_d.
 * Confrontos com menos de 5 partidas usam a taxa geral; a parte do meta que não está
 * listada ("outros") também usa a taxa geral.
 */
export function expectedRate(matches: Match[], meta: MetaEntry[], minMatches = MATCHUP_MIN_FOR_EXPECTED): ExpectedResult {
  const overall = record(matches).rate;
  const metaTotal = meta.reduce((s, e) => s + Math.max(0, e.share), 0);
  if (overall == null) return { rate: null, usedMatchups: 0, metaEntries: meta.length, metaTotal };
  const rows = new Map(matchups(matches, meta).map((r) => [r.key, r]));
  let sum = 0;
  let used = 0;
  for (const e of meta) {
    const r = rows.get(normalize(e.deck));
    const share = Math.max(0, e.share);
    const ok = r && r.record.n >= minMatches && r.record.rate != null;
    if (ok) used++;
    sum += share * (ok ? (r!.record.rate as number) : overall);
  }
  let denom = 100;
  if (metaTotal < 100) sum += (100 - metaTotal) * overall;
  else denom = metaTotal;
  return { rate: sum / denom, usedMatchups: used, metaEntries: meta.length, metaTotal };
}

export type TrendStatus = 'melhorando' | 'estavel' | 'piorando' | 'insuficiente';

export interface TrendResult {
  status: TrendStatus;
  recent: WinRecord;
  previous: WinRecord;
  diff: number | null;
  window: number;
}

/** Compara as últimas 20 partidas com as 20 anteriores (ou metades menores, mínimo 5). */
export function trend(ms: Match[], window = 20, threshold = 0.1): TrendResult {
  const s = sortMatches(ms);
  const size = Math.min(window, Math.floor(s.length / 2));
  if (size < 5) {
    return { status: 'insuficiente', recent: record(s.slice(-window)), previous: makeRecord(0, 0, 0), diff: null, window: size };
  }
  const recent = record(s.slice(-size));
  const previous = record(s.slice(-2 * size, -size));
  const diff = (recent.rate ?? 0) - (previous.rate ?? 0);
  const status: TrendStatus = diff >= threshold ? 'melhorando' : diff <= -threshold ? 'piorando' : 'estavel';
  return { status, recent, previous, diff, window: size };
}

export function weekStart(date: string): string {
  const d = parseISODate(date);
  const day = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - day);
  return toISODate(d);
}

export function weeklySeries(ms: Match[]): { week: string; record: WinRecord }[] {
  const map = new Map<string, Match[]>();
  for (const m of ms) {
    const w = weekStart(m.date);
    const list = map.get(w) ?? [];
    list.push(m);
    map.set(w, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, list]) => ({ week, record: record(list) }));
}

/** Taxa por jogo, separando quando comecei em 1º e em 2º. */
export function turnSplit(ms: Match[]): { first: WinRecord; second: WinRecord } {
  const acc = { 1: [0, 0, 0], 2: [0, 0, 0] } as Record<1 | 2, number[]>;
  for (const m of ms) {
    for (const g of m.games) {
      if (g.turn !== 1 && g.turn !== 2) continue;
      const idx = g.result === 'V' ? 0 : g.result === 'D' ? 1 : 2;
      acc[g.turn][idx]++;
    }
  }
  return { first: makeRecord(acc[1][0], acc[1][1], acc[1][2]), second: makeRecord(acc[2][0], acc[2][1], acc[2][2]) };
}

export function lossReasonStats(ms: Match[]): { losses: number; counts: Record<LossReason, number> } {
  const counts: Record<LossReason, number> = {
    comeco_ruim: 0,
    faltou_energia: 0,
    confronto_ruim: 0,
    erro_meu: 0,
    sorte: 0,
    tempo: 0,
  };
  let losses = 0;
  for (const m of ms) {
    if (matchResult(m) !== 'D') continue;
    losses++;
    if (m.lossReason) counts[m.lossReason]++;
  }
  return { losses, counts };
}

export function timeoutStats(ms: Match[]): { count: number; n: number; rate: number | null } {
  const count = ms.filter((m) => m.timeout).length;
  return { count, n: ms.length, rate: ms.length ? count / ms.length : null };
}

export interface CardMarkRow {
  name: string;
  grande: number;
  inutil: number;
  grandeVs: string[];
  inutilVs: string[];
}

/** Quantas partidas marcaram cada carta como decisiva ("grande") ou inútil, e contra quem. */
export function cardMarkStats(ms: Match[]): CardMarkRow[] {
  const map = new Map<string, { name: string; grande: number; inutil: number; gv: Map<string, number>; iv: Map<string, number> }>();
  for (const m of ms) {
    const seen = new Set<string>();
    for (const c of m.cards) {
      const k = `${normalize(c.name)}|${c.mark}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const key = normalize(c.name);
      const e = map.get(key) ?? { name: c.name, grande: 0, inutil: 0, gv: new Map(), iv: new Map() };
      const vs = c.mark === 'grande' ? e.gv : e.iv;
      if (c.mark === 'grande') e.grande++;
      else e.inutil++;
      const opp = m.opponent.trim() || '?';
      vs.set(opp, (vs.get(opp) ?? 0) + 1);
      map.set(key, e);
    }
  }
  const fmt = (vs: Map<string, number>) =>
    [...vs.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => (c > 1 ? `${n} (${c})` : n));
  return [...map.values()]
    .map((e) => ({ name: e.name, grande: e.grande, inutil: e.inutil, grandeVs: fmt(e.gv), inutilVs: fmt(e.iv) }))
    .sort((a, b) => b.inutil + b.grande - (a.inutil + a.grande) || a.name.localeCompare(b.name));
}

export function inDateRange(ms: Match[], from: string, to: string): Match[] {
  return ms.filter((m) => m.date >= from && m.date <= to);
}
