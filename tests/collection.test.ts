import { describe, expect, it } from 'vitest';
import { checkDeck, mergeIntoCollection } from '../src/lib/collection';
import { parseDecklist } from '../src/lib/decklist';
import type { CollectionItem } from '../src/types';

const deck = parseDecklist(`Pokémon:
4 Dreepy TWM 128
Trainer:
4 Ultra Ball SVI 196
Energy:
6 Basic {R} Energy SVE 2`).cards;

function coll(text: string): CollectionItem[] {
  return mergeIntoCollection([], parseDecklist(text).cards);
}

describe('checkDeck', () => {
  it('monta quando tem tudo na impressão exata', () => {
    const r = checkDeck(deck, coll('Pokémon:\n4 Dreepy TWM 128\nTrainer:\n5 Ultra Ball SVI 196\nEnergy:\n10 Basic {R} Energy SVE 2'));
    expect(r.exactBuildable).toBe(true);
    expect(r.missing).toBe(0);
  });

  it('conta o que falta', () => {
    const r = checkDeck(deck, coll('Pokémon:\n2 Dreepy TWM 128\nTrainer:\n4 Ultra Ball SVI 196'));
    expect(r.buildable).toBe(false);
    expect(r.missing).toBe(2 + 6);
    expect(r.lines.find((l) => l.card.name === 'Dreepy')).toMatchObject({ exact: 2, missing: 2 });
  });

  it('usa outra impressão do mesmo nome e avisa', () => {
    const r = checkDeck(deck, coll('Pokémon:\n4 Dreepy TWM 128\nTrainer:\n2 Ultra Ball SVI 196\n2 Ultra Ball PAF 91\nEnergy:\n6 Basic {R} Energy SVE 2'));
    expect(r.buildable).toBe(true);
    expect(r.exactBuildable).toBe(false);
    expect(r.alt).toBe(2);
  });

  it('energia básica de outra impressão conta como exata', () => {
    const r = checkDeck(deck, coll('Pokémon:\n4 Dreepy TWM 128\nTrainer:\n4 Ultra Ball SVI 196\nEnergy:\n6 Basic {R} Energy MEE 2'));
    expect(r.exactBuildable).toBe(true);
  });

  it('não usa a mesma carta da coleção duas vezes', () => {
    const twoPrints = parseDecklist('Trainer:\n2 Ultra Ball SVI 196\n2 Ultra Ball PAF 91').cards;
    const r = checkDeck(twoPrints, coll('Trainer:\n3 Ultra Ball SVI 196'));
    expect(r.missing).toBe(1);
  });

  it('lista sem coleção/número aceita qualquer impressão', () => {
    const r = checkDeck(parseDecklist('Trainer:\n4 Ultra Ball').cards, coll('Trainer:\n4 Ultra Ball PAF 91'));
    expect(r.exactBuildable).toBe(true);
  });
});

describe('mergeIntoCollection', () => {
  it('soma a mesma impressão e mantém impressões diferentes separadas', () => {
    let c = coll('Trainer:\n2 Ultra Ball SVI 196');
    c = mergeIntoCollection(c, parseDecklist('Trainer:\n1 Ultra Ball SVI 196\n1 Ultra Ball PAF 91').cards);
    expect(c).toHaveLength(2);
    expect(c.find((x) => x.set === 'SVI')!.qty).toBe(3);
  });
});
