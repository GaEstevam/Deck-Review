import { describe, expect, it } from 'vitest';
import { mainPokemon, speciesSlug } from '../src/lib/pokemon';
import type { CardEntry } from '../src/types';

describe('speciesSlug', () => {
  it('tira sufixos e prefixos de carta', () => {
    expect(speciesSlug('Dragapult ex')).toBe('dragapult');
    expect(speciesSlug('Mega Lopunny ex')).toBe('lopunny');
    expect(speciesSlug('Clefairy ex da Lílian')).toBe('clefairy');
    expect(speciesSlug("Lillie's Clefairy ex")).toBe('clefairy');
    expect(speciesSlug("Team Rocket's Mewtwo ex")).toBe('mewtwo');
    expect(speciesSlug('Iron Hands ex')).toBe('iron-hands');
    expect(speciesSlug('Mr. Mime')).toBe('mr-mime');
    expect(speciesSlug("Farfetch'd")).toBe('farfetchd');
    expect(speciesSlug('Giratina VSTAR')).toBe('giratina');
    expect(speciesSlug('Dragapult ex / Dusknoir')).toBe('dragapult');
    expect(speciesSlug('')).toBeNull();
  });
});

describe('mainPokemon', () => {
  const cards: CardEntry[] = [
    { name: 'Dreepy', qty: 4, type: 'pokemon' },
    { name: 'Dragapult ex', qty: 3, type: 'pokemon' },
    { name: 'Fezandipiti ex', qty: 1, type: 'pokemon' },
    { name: 'Ultra Ball', qty: 4, type: 'treinador' },
  ];
  it('usa o escolhido pelo usuário', () => {
    expect(mainPokemon({ name: 'Meu deck', mainPokemon: 'Dreepy' }, { cards })).toBe('Dreepy');
  });
  it('usa o nome do deck quando ele está na lista', () => {
    expect(mainPokemon({ name: 'Dragapult' }, { cards })).toBe('Dragapult ex');
  });
  it('senão, o Pokémon ex com mais cópias', () => {
    expect(mainPokemon({ name: 'Teste' }, { cards })).toBe('Dragapult ex');
  });
  it('sem lista, tenta o nome do deck', () => {
    expect(mainPokemon({ name: 'Gardevoir' }, null)).toBe('Gardevoir');
  });
});
