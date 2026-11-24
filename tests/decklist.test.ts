import { describe, expect, it } from 'vitest';
import { diffCards, formatChanges, formatDecklist, parseDecklist } from '../src/lib/decklist';
import { parseMetaText } from '../src/lib/meta';

const TCG_LIVE = `Pokémon: 7
4 Dreepy TWM 128
2 Drakloak TWM 129
1 Dragapult ex TWM 130

Trainer: 6
4 Ultra Ball SVI 196
2 Boss's Orders PAL 172

Energy: 5
3 Basic {R} Energy SVE 2
2 Basic {P} Energy SVE 5

Total Cards: 18`;

describe('parseDecklist', () => {
  it('lê o formato do TCG Live com seções, coleção e número', () => {
    const r = parseDecklist(TCG_LIVE);
    expect(r.errors).toEqual([]);
    expect(r.total).toBe(18);
    expect(r.cards[0]).toEqual({ name: 'Dreepy', qty: 4, type: 'pokemon', set: 'TWM', number: '128' });
    expect(r.cards.find((c) => c.name === "Boss's Orders")).toMatchObject({ type: 'treinador', set: 'PAL', number: '172' });
    expect(r.cards.find((c) => c.name === 'Basic {R} Energy')).toMatchObject({ type: 'energia', qty: 3 });
  });

  it('aceita linhas sem coleção/número e cabeçalhos em português', () => {
    const r = parseDecklist('Treinador: 4\n4 Ultra Ball\nEnergia:\n2x Energia Básica de Fogo');
    expect(r.cards).toEqual([
      { name: 'Ultra Ball', qty: 4, type: 'treinador' },
      { name: 'Energia Básica de Fogo', qty: 2, type: 'energia' },
    ]);
  });

  it('soma linhas repetidas e aponta linhas inválidas', () => {
    const r = parseDecklist('Trainer:\n2 Ultra Ball SVI 196\n2 Ultra Ball SVI 196\nqualquer coisa');
    expect(r.cards).toHaveLength(1);
    expect(r.cards[0].qty).toBe(4);
    expect(r.errors).toHaveLength(1);
  });

  it('volta ao mesmo texto ao formatar', () => {
    const r = parseDecklist(TCG_LIVE);
    expect(parseDecklist(formatDecklist(r.cards)).cards).toEqual(r.cards);
  });
});

describe('diffCards', () => {
  it('calcula +/− por nome, ignorando troca de impressão', () => {
    const a = parseDecklist('Trainer:\n4 Ultra Ball SVI 196\n2 Switch SVI 194\n1 Iono PAL 185').cards;
    const b = parseDecklist('Trainer:\n4 Ultra Ball PAF 91\n1 Switch SVI 194\n1 Counter Catcher PAR 160\n1 Iono PAL 185').cards;
    expect(formatChanges(diffCards(a, b))).toBe('+1 Counter Catcher, −1 Switch');
  });
});

describe('parseMetaText', () => {
  it('lê nome e porcentagem com vírgula ou ponto', () => {
    expect(parseMetaText('1. Gardevoir ex 18,5%\nDragapult ex\t14.2\n\nlixo')).toEqual([
      { deck: 'Gardevoir ex', share: 18.5 },
      { deck: 'Dragapult ex', share: 14.2 },
    ]);
  });
});
