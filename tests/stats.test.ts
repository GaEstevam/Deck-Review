import { describe, expect, it } from 'vitest';
import { expectedRate, matchResult, record, trend, turnSplit, weekStart, wilson } from '../src/lib/stats';
import { many, match } from './helpers';

describe('resultado e taxa', () => {
  it('decide a melhor de 3 pelos jogos', () => {
    expect(matchResult(match({ res: 'VDV' }))).toBe('V');
    expect(matchResult(match({ res: 'DD' }))).toBe('D');
    expect(matchResult(match({ res: 'VDE' }))).toBe('E');
    expect(matchResult(match({ res: 'E' }))).toBe('E');
  });

  it('empate conta meia vitória', () => {
    const r = record([match({ res: 'V' }), match({ res: 'D' }), match({ res: 'E' }), match({ res: 'V' })]);
    expect(r).toMatchObject({ v: 2, d: 1, e: 1, n: 4 });
    expect(r.rate).toBeCloseTo(2.5 / 4);
  });

  it('faixa provável contém a taxa e fica mais estreita com mais partidas', () => {
    const [l1, h1] = wilson(0.5, 10) as [number, number];
    const [l2, h2] = wilson(0.5, 100) as [number, number];
    expect(l1).toBeLessThan(0.5);
    expect(h1).toBeGreaterThan(0.5);
    expect(h2 - l2).toBeLessThan(h1 - l1);
  });
});

describe('taxa esperada', () => {
  it('pondera cada confronto pela fatia do meta (exemplo do plano)', () => {
    // Gardevoir 20% do meta, 40% de vitória contra ele (10 partidas);
    // resto (80%) usa a taxa geral.
    const ms = [...many(4, { opponent: 'Gardevoir ex', res: 'V' }), ...many(6, { opponent: 'Gardevoir ex', res: 'D' }), ...many(10, { opponent: 'Charizard ex', res: 'V' })];
    const overall = record(ms).rate!; // 14/20 = 0.7
    const e = expectedRate(ms, [{ deck: 'Gardevoir ex', share: 20 }]);
    expect(e.rate).toBeCloseTo(0.2 * 0.4 + 0.8 * overall);
    expect(e.usedMatchups).toBe(1);
  });

  it('confronto com menos de 5 partidas usa a taxa geral', () => {
    const ms = [...many(4, { opponent: 'Gardevoir ex', res: 'D' }), ...many(6, { opponent: 'Charizard ex', res: 'V' })];
    const overall = record(ms).rate!;
    const e = expectedRate(ms, [{ deck: 'Gardevoir ex', share: 50 }]);
    expect(e.rate).toBeCloseTo(overall);
    expect(e.usedMatchups).toBe(0);
  });

  it('normaliza quando as fatias passam de 100%', () => {
    const ms = [...many(5, { opponent: 'A', res: 'V' }), ...many(5, { opponent: 'B', res: 'D' })];
    const e = expectedRate(ms, [
      { deck: 'A', share: 60 },
      { deck: 'B', share: 60 },
    ]);
    expect(e.rate).toBeCloseTo(0.5);
  });
});

describe('tendência', () => {
  it('compara as últimas 20 com as 20 anteriores', () => {
    const old = many(20, { res: 'D', date: '2026-12-01' });
    const recent = many(20, { res: 'V', date: '2026-12-10' });
    const t = trend([...recent, ...old]);
    expect(t.status).toBe('melhorando');
    expect(t.window).toBe(20);
    expect(t.diff).toBeCloseTo(1);
  });

  it('diferença menor que 10 pontos é estável; poucas partidas é insuficiente', () => {
    const ms = [...many(10, { res: 'V', date: '2026-12-01' }), ...many(10, { res: 'V', date: '2026-12-02' })];
    expect(trend(ms).status).toBe('estavel');
    expect(trend(many(8, { res: 'V' })).status).toBe('insuficiente');
  });
});

describe('outros', () => {
  it('semana começa na segunda', () => {
    expect(weekStart('2026-11-24')).toBe('2026-11-23'); // terça → segunda
    expect(weekStart('2026-11-29')).toBe('2026-11-23'); // domingo → segunda anterior
  });

  it('separa jogos começando em 1º e 2º', () => {
    const t = turnSplit([match({ res: 'VD', turns: [1, 2] }), match({ res: 'V', turns: [1] })]);
    expect(t.first).toMatchObject({ v: 2, n: 2 });
    expect(t.second).toMatchObject({ d: 1, n: 1 });
  });
});
