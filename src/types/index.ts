// Modelo de dados do app. Tudo fica em um único objeto AppData,
// salvo no navegador e (opcionalmente) sincronizado com um Gist privado.

export type CardType = 'pokemon' | 'treinador' | 'energia';

export interface CardEntry {
  name: string;
  qty: number;
  type: CardType;
  set?: string;
  number?: string;
}

export type DeckStatus = 'testando' | 'principal' | 'arquivado';

export interface Deck {
  id: string;
  name: string;
  status: DeckStatus;
  currentVersionId: string | null;
  createdAt: string;
  /** Pokémon principal escolhido (nome da carta). Vazio = o app escolhe sozinho. */
  mainPokemon?: string;
}

export interface DeckVersion {
  id: string;
  deckId: string;
  number: number;
  date: string; // YYYY-MM-DD
  cards: CardEntry[];
  reason: string;
}

export type GameResult = 'V' | 'D' | 'E';
export type Turn = 1 | 2;

export interface Game {
  result: GameResult;
  turn: Turn | null;
}

export type Venue = 'online' | 'presencial';

export type LossReason =
  | 'comeco_ruim'
  | 'faltou_energia'
  | 'confronto_ruim'
  | 'erro_meu'
  | 'sorte'
  | 'tempo';

export type CardMark = 'grande' | 'inutil';

export interface MarkedCard {
  name: string;
  mark: CardMark;
}

export interface Match {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO, desempata partidas do mesmo dia
  deckId: string;
  versionId: string;
  opponent: string;
  games: Game[];
  venue: Venue;
  timeout: boolean;
  lossReason: LossReason | null;
  cards: MarkedCard[];
  note: string;
}

export interface MetaEntry {
  deck: string;
  share: number; // porcentagem, 0–100
}

export interface Meta {
  updatedAt: string;
  source: string;
  entries: MetaEntry[];
}

export interface CollectionItem extends CardEntry {
  id: string;
}

export type Scope = 'versao' | 'deck';

export interface Settings {
  eventName: string;
  eventDate: string; // YYYY-MM-DD
  selectedDeckId: string | null;
  scope: Scope;
  lastDeckId: string | null;
  /** Seu nome no Pokémon TCG Live (para saber qual lado do Battle Log é você). */
  playerName: string;
}

export interface AppData {
  schema: 1;
  decks: Deck[];
  versions: DeckVersion[];
  matches: Match[];
  meta: Meta;
  collection: CollectionItem[];
  settings: Settings;
  updatedAt: string;
}
