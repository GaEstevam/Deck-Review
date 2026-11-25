/**
 * Leitor do Battle Log exportado pelo Pokémon TCG Live (texto copiado da tela de resultados).
 *
 * Só extrai informações; o texto do log não é guardado em lugar nenhum.
 * Todo campo é opcional: o que não for encontrado volta como null, sem erro.
 *
 * Formatos conhecidos (vistos em logs reais):
 *   pt-BR  "X comprou 7 cartas para a mão inicial."   en  "X drew 7 cards for the opening hand."
 *          "X venceu a jogada de moeda."                   "X won the coin toss."
 *          "X decidiu jogar primeiro."                     "X decided to go first."
 *          "X decidiu ser o segundo a jogar."              "X decided to go second."
 *          "Turno de X"
 *          "X pegou uma carta de Prêmio." / "X pegou 2 cartas de Prêmio."
 *          "X comprou uma nova mão." / "X comprou 2 novas mãos."
 *          "X jogou <carta> no Campo Ativo." / "... no Banco."
 *          "X evoluiu <a> para <b> no Banco."
 *          "O oponente se rendeu. X venceu."
 *          "O oponente pegou todas as cartas de Prêmio. X venceu."
 * Linhas de turno e de fim de partida em inglês ainda não foram vistas, por isso não são reconhecidas.
 */

export type EndReason = 'desistencia' | 'premios' | 'outro';

export interface BattleLogInfo {
  lines: number;
  players: [string, string] | null;
  coinWinner: string | null;
  firstPlayer: string | null;
  turns: number | null;
  winner: string | null;
  endReason: EndReason | null;
  /** Frase do jogo que explica o fim, como veio no log (ex.: "O oponente se rendeu."). */
  endText: string | null;
  prizes: Record<string, number>;
  mulligans: Record<string, number>;
  /** Pokémon que cada jogador colocou em jogo (na ordem em que apareceram). */
  pokemon: Record<string, string[]>;
}

const OPENING = [/^(.+?) comprou 7 cartas para a mão inicial\.$/, /^(.+?) drew 7 cards for the opening hand\.$/];
const COIN = [/^(.+?) venceu a jogada de moeda\.$/, /^(.+?) won the coin toss\.$/];
const GO_FIRST = [/^(.+?) decidiu jogar primeiro\.$/, /^(.+?) decided to go first\.$/];
const GO_SECOND = [/^(.+?) decidiu ser o segundo a jogar\.$/, /^(.+?) decided to go second\.$/];
const TURN = /^Turno de (.+)$/;

function firstMatch(line: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = p.exec(line);
    if (m) return m[1].trim();
  }
  return null;
}

/** Nome do jogador que começa a linha (dentre os conhecidos), ou null. */
function speaker(line: string, players: string[]): string | null {
  // o nome mais longo primeiro, para "Ana" não casar com "Ana_2"
  for (const p of [...players].sort((a, b) => b.length - a.length)) {
    if (line.startsWith(`${p} `)) return p;
  }
  return null;
}

export function looksLikeBattleLog(info: BattleLogInfo): boolean {
  return info.players !== null;
}

export function parseBattleLog(text: string): BattleLogInfo {
  const all = text.split(/\r?\n/).map((l) => l.trim());
  const lines = all.filter((l) => l.length > 0);

  const info: BattleLogInfo = {
    lines: lines.length,
    players: null,
    coinWinner: null,
    firstPlayer: null,
    turns: null,
    winner: null,
    endReason: null,
    endText: null,
    prizes: {},
    mulligans: {},
    pokemon: {},
  };

  // jogadores: as duas linhas de mão inicial
  const players: string[] = [];
  for (const l of lines) {
    const p = firstMatch(l, OPENING);
    if (p && !players.includes(p)) players.push(p);
    if (players.length === 2) break;
  }
  if (players.length === 2) info.players = [players[0], players[1]];
  const other = (p: string) => players.find((x) => x !== p) ?? null;

  let decidedFirst: string | null = null;
  let firstTurnOf: string | null = null;
  let turns = 0;

  for (const l of lines) {
    if (!info.coinWinner) info.coinWinner = firstMatch(l, COIN);
    if (!decidedFirst) {
      const f = firstMatch(l, GO_FIRST);
      if (f) decidedFirst = f;
      const s = firstMatch(l, GO_SECOND);
      if (s && players.length === 2) decidedFirst = other(s);
    }
    const t = TURN.exec(l);
    if (t) {
      turns++;
      if (!firstTurnOf) firstTurnOf = t[1].trim();
      continue;
    }
    if (!players.length) continue;
    const who = speaker(l, players);
    if (!who) continue;
    const rest = l.slice(who.length + 1);

    const prize = /^pegou (uma|\d+) cartas? de Prêmio\.$/.exec(rest);
    if (prize) info.prizes[who] = (info.prizes[who] ?? 0) + (prize[1] === 'uma' ? 1 : Number(prize[1]));

    const mull = /^comprou (uma|\d+) novas? mãos?\.$/.exec(rest);
    if (mull) info.mulligans[who] = (info.mulligans[who] ?? 0) + (mull[1] === 'uma' ? 1 : Number(mull[1]));

    const put = /^jogou (.+) no (?:Campo Ativo|Banco)\.$/.exec(rest) ?? /^evoluiu .+ para (.+) no (?:Campo Ativo|Banco)\.$/.exec(rest);
    if (put) {
      const list = (info.pokemon[who] ??= []);
      if (!list.includes(put[1])) list.push(put[1]);
    }
  }

  info.firstPlayer = decidedFirst ?? (firstTurnOf && players.includes(firstTurnOf) ? firstTurnOf : null);
  info.turns = turns > 0 ? turns : null;

  // fim de partida: procura de baixo para cima uma linha que termine em "<jogador> venceu."
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15) && !info.winner; i--) {
    const l = lines[i];
    for (const p of players) {
      const suffix = `${p} venceu.`;
      if (l === suffix || l.endsWith(` ${suffix}`)) {
        info.winner = p;
        const before = l.slice(0, l.length - suffix.length).trim();
        info.endText = before || null;
        info.endReason = /se rendeu/i.test(before) ? 'desistencia' : /todas as cartas de Prêmio/i.test(before) ? 'premios' : before ? 'outro' : null;
        break;
      }
    }
  }

  return info;
}

export const END_REASON_LABEL: Record<EndReason, string> = {
  desistencia: 'desistência',
  premios: 'todas as cartas de Prêmio',
  outro: 'outro motivo',
};

/**
 * Sugere o deck do oponente comparando os Pokémon que ele jogou com os decks do meta.
 * Um deck do meta "casa" se o nome dele (ex.: "Dragapult ex") é um dos Pokémon jogados.
 * Retorna null se nenhum ou mais de um deck casar.
 */
export function suggestOpponentDeck(played: string[], metaDecks: string[]): string | null {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const names = new Set(played.map(norm));
  const hits = metaDecks.filter((d) => {
    const n = norm(d);
    // aceita "Dragapult ex" e "Dragapult ex / Dusknoir" (cada parte precisa estar em jogo)
    const parts = n.split(/\s*[/+&]\s*/).filter(Boolean);
    return parts.length > 0 && parts.every((p) => names.has(p));
  });
  if (hits.length === 1) return hits[0];
  // mais de um: fica com o que tem mais partes casando (ex.: "Dragapult ex / Dusknoir" vence "Dragapult ex")
  if (hits.length > 1) {
    const score = (d: string) => norm(d).split(/\s*[/+&]\s*/).length;
    const best = Math.max(...hits.map(score));
    const top = hits.filter((d) => score(d) === best);
    return top.length === 1 ? top[0] : null;
  }
  return null;
}
