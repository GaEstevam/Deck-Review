import type { Deck, DeckVersion } from '../types';

/**
 * Nome da espécie no formato da PokéAPI a partir do nome de uma carta ou deck.
 * Ex.: "Dragapult ex" → "dragapult", "Clefairy ex da Lílian" → "clefairy",
 *      "Mega Lopunny ex" → "lopunny", "Lillie's Clefairy ex" → "clefairy", "Mr. Mime" → "mr-mime".
 */
export function speciesSlug(cardName: string): string | null {
  let s = cardName
    .split(/\s*[/+&|]\s*/)[0] // "Dragapult ex / Dusknoir" → primeira parte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .trim();
  s = s.replace(/^.+?'s\s+/i, ''); // "Lillie's Clefairy ex", "Team Rocket's Mewtwo ex"
  s = s.replace(/\s+(da|do|de)\s+.+$/i, ''); // "Clefairy ex da Lilian"
  s = s.replace(/^(mega|radiant|radiante|shiny|dark|origin|origem)\s+/i, '');
  s = s.replace(/\s+(ex|gx|v|vmax|vstar|v-union|break|prime|lv\.?\s*x|☆|δ)$/i, '');
  s = s.replace(/\s+(ex|gx|v|vmax|vstar)$/i, '');
  s = s.replace(/♀/g, '-f').replace(/♂/g, '-m');
  s = s.toLowerCase().replace(/[.']/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s || null;
}

/**
 * Pokémon principal do deck: o escolhido pelo usuário; senão o nome do deck, se for um Pokémon
 * da lista; senão o Pokémon "ex" com mais cópias; senão o primeiro Pokémon da lista.
 */
export function mainPokemon(deck: Pick<Deck, 'name' | 'mainPokemon'>, version: Pick<DeckVersion, 'cards'> | null): string | null {
  if (deck.mainPokemon) return deck.mainPokemon;
  const mons = (version?.cards ?? []).filter((c) => c.type === 'pokemon');
  const deckSlug = speciesSlug(deck.name);
  const byName = mons.find((c) => speciesSlug(c.name) === deckSlug);
  if (byName) return byName.name;
  if (!mons.length) return deck.name; // sem lista: tenta o próprio nome do deck
  const exes = mons.filter((c) => /\bex\b/i.test(c.name)).sort((a, b) => b.qty - a.qty);
  return (exes[0] ?? mons[0]).name;
}

export type PokeType =
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'ice' | 'fighting' | 'poison' | 'ground'
  | 'flying' | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

/** Cor sólida de cada tipo e a cor do texto por cima (contraste). */
export const TYPE_STYLE: Record<PokeType, { bg: string; fg: string; label: string }> = {
  normal: { bg: '#a49e8a', fg: '#1b1915', label: 'Normal' },
  fire: { bg: '#e0603a', fg: '#ffffff', label: 'Fogo' },
  water: { bg: '#3d86d6', fg: '#ffffff', label: 'Água' },
  grass: { bg: '#4c9a52', fg: '#ffffff', label: 'Planta' },
  electric: { bg: '#f2c230', fg: '#1b1915', label: 'Elétrico' },
  ice: { bg: '#74c7d0', fg: '#10292c', label: 'Gelo' },
  fighting: { bg: '#b8462f', fg: '#ffffff', label: 'Lutador' },
  poison: { bg: '#8f4ca6', fg: '#ffffff', label: 'Venenoso' },
  ground: { bg: '#c49c50', fg: '#1b1915', label: 'Terrestre' },
  flying: { bg: '#8ea2e2', fg: '#121a33', label: 'Voador' },
  psychic: { bg: '#dd5a88', fg: '#ffffff', label: 'Psíquico' },
  bug: { bg: '#8fa338', fg: '#ffffff', label: 'Inseto' },
  rock: { bg: '#a49449', fg: '#ffffff', label: 'Pedra' },
  ghost: { bg: '#5a4c8c', fg: '#ffffff', label: 'Fantasma' },
  dragon: { bg: '#5650c4', fg: '#ffffff', label: 'Dragão' },
  dark: { bg: '#3a3433', fg: '#ffffff', label: 'Sombrio' },
  steel: { bg: '#8796a4', fg: '#ffffff', label: 'Aço' },
  fairy: { bg: '#e08cc3', fg: '#2a1023', label: 'Fada' },
};
