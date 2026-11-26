import { useEffect, useState } from 'react';
import { speciesSlug, TYPE_STYLE, type PokeType } from './pokemon';

/**
 * Tipo e miniatura (ícone de menu do Sword/Shield) de um Pokémon, vindos da PokéAPI (pokeapi.co).
 * Só o nome da espécie é enviado. A resposta fica guardada no navegador por 30 dias.
 */
export interface PokemonInfo {
  slug: string;
  type: PokeType | null;
  icon: string | null;
  /** O ícone é a miniatura pequena (pixel art); se não houver, usa o sprite normal. */
  isMiniIcon: boolean;
}

const TTL = 30 * 24 * 3600 * 1000;
const key = (slug: string) => `deck-review:pokeapi:v1:${slug}`;
const inflight = new Map<string, Promise<PokemonInfo | null>>();

function readCache(slug: string): PokemonInfo | null | undefined {
  try {
    const raw = localStorage.getItem(key(slug));
    if (!raw) return undefined;
    const c = JSON.parse(raw) as { at: number; info: PokemonInfo | null };
    return Date.now() - c.at < TTL ? c.info : undefined;
  } catch {
    return undefined;
  }
}

interface ApiPokemon {
  types: { slot: number; type: { name: string } }[];
  sprites: {
    front_default: string | null;
    versions?: { 'generation-viii'?: { icons?: { front_default: string | null } } };
  };
}

async function fetchInfo(slug: string): Promise<PokemonInfo | null> {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`PokéAPI ${res.status}`);
  const p = (await res.json()) as ApiPokemon;
  const t = p.types.sort((a, b) => a.slot - b.slot)[0]?.type.name;
  const mini = p.sprites.versions?.['generation-viii']?.icons?.front_default ?? null;
  return {
    slug,
    type: t && t in TYPE_STYLE ? (t as PokeType) : null,
    icon: mini ?? p.sprites.front_default,
    isMiniIcon: Boolean(mini),
  };
}

export function loadPokemonInfo(name: string): Promise<PokemonInfo | null> {
  const slug = speciesSlug(name);
  if (!slug) return Promise.resolve(null);
  const cached = readCache(slug);
  if (cached !== undefined) return Promise.resolve(cached);
  let p = inflight.get(slug);
  if (!p) {
    p = fetchInfo(slug)
      .then((info) => {
        localStorage.setItem(key(slug), JSON.stringify({ at: Date.now(), info }));
        return info;
      })
      .catch(() => null) // sem internet ou API fora: segue sem miniatura, tenta de novo depois
      .finally(() => inflight.delete(slug));
    inflight.set(slug, p);
  }
  return p;
}

export function usePokemonInfo(name: string | null): PokemonInfo | null {
  const [info, setInfo] = useState<PokemonInfo | null>(() => {
    const slug = name ? speciesSlug(name) : null;
    return slug ? (readCache(slug) ?? null) : null;
  });
  useEffect(() => {
    let alive = true;
    if (!name) {
      setInfo(null);
      return;
    }
    void loadPokemonInfo(name).then((i) => alive && setInfo(i));
    return () => {
      alive = false;
    };
  }, [name]);
  return info;
}
