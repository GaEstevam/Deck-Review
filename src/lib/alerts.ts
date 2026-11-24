import type { DeckVersion, Match, MetaEntry } from '../types';
import { normalize } from './decklist';
import { pct, pts } from './format';
import { cardMarkStats, lossReasonStats, matchups, record, timeoutStats, turnSplit } from './stats';

/** Limites dos alertas — ponto de partida, ajuste depois das primeiras semanas. */
export const THRESHOLDS = {
  matchupRate: 0.45,
  matchupMinMatches: 8,
  matchupMinShare: 10,
  setupLossShare: 0.25,
  turnDiff: 0.15,
  turnMinGames: 5,
  timeoutShare: 0.15,
  timeoutMinMatches: 5,
  versionDrop: 0.1,
  versionMinMatches: 15,
  uselessMarks: 3,
  myErrorShare: 0.3,
  minLosses: 4,
};

export interface Alert {
  id: string;
  priority: number; // menor = mais importante
  title: string;
  detail: string;
  suggestion: string;
}

export interface AlertInput {
  /** Partidas do recorte escolhido (versão atual ou deck inteiro). */
  matches: Match[];
  /** Todas as partidas do deck (para cartas e versões). */
  deckMatches: Match[];
  meta: MetaEntry[];
  versions: DeckVersion[]; // versões do deck
  currentVersion: DeckVersion | null;
}

export function computeAlerts({ matches, deckMatches, meta, versions, currentVersion }: AlertInput): Alert[] {
  const T = THRESHOLDS;
  const alerts: Alert[] = [];

  // 1. Confronto ruim e relevante no meta
  for (const row of matchups(matches, meta)) {
    const r = row.record;
    if (r.rate != null && r.n >= T.matchupMinMatches && row.share >= T.matchupMinShare && r.rate < T.matchupRate) {
      alerts.push({
        id: `matchup:${row.key}`,
        priority: 1,
        title: `Confronto ruim: ${row.name}`,
        detail: `${pct(r.rate)} em ${r.n} partidas, e ele é ${row.share.toFixed(1)}% do meta.`,
        suggestion: 'Treinar esse confronto e rever o plano de jogo contra ele.',
      });
    }
  }

  // 2 e 7. Motivos de derrota
  const lr = lossReasonStats(matches);
  if (lr.losses >= T.minLosses) {
    const setup = lr.counts.comeco_ruim + lr.counts.faltou_energia;
    if (setup / lr.losses >= T.setupLossShare) {
      alerts.push({
        id: 'setup',
        priority: 2,
        title: 'Muitas derrotas por começo ruim ou falta de energia',
        detail: `${setup} de ${lr.losses} derrotas (${pct(setup / lr.losses)}).`,
        suggestion: 'Rever cartas de busca e a contagem de energias.',
      });
    }
    const mine = lr.counts.erro_meu;
    if (mine / lr.losses >= T.myErrorShare) {
      alerts.push({
        id: 'erro-meu',
        priority: 7,
        title: '“Erro meu” é o principal motivo de derrota',
        detail: `${mine} de ${lr.losses} derrotas (${pct(mine / lr.losses)}).`,
        suggestion: 'O deck está bom; o foco é treino de jogo, não mudar cartas.',
      });
    }
  }

  // 3. Começar em 1º vs 2º
  const ts = turnSplit(matches);
  if (ts.first.n >= T.turnMinGames && ts.second.n >= T.turnMinGames && ts.first.rate != null && ts.second.rate != null) {
    const diff = ts.first.rate - ts.second.rate;
    if (Math.abs(diff) >= T.turnDiff) {
      alerts.push({
        id: 'turn',
        priority: 3,
        title: `O deck rende muito mais começando em ${diff > 0 ? '1º' : '2º'}`,
        detail: `1º: ${pct(ts.first.rate)} (${ts.first.n} jogos) · 2º: ${pct(ts.second.rate)} (${ts.second.n} jogos).`,
        suggestion: 'Decidir antes do evento o que escolher ao vencer a moeda.',
      });
    }
  }

  // 4. Tempo
  const to = timeoutStats(matches);
  if (to.n >= T.timeoutMinMatches && to.rate != null && to.rate >= T.timeoutShare) {
    alerts.push({
      id: 'timeout',
      priority: 4,
      title: 'O tempo está acabando com frequência',
      detail: `${to.count} de ${to.n} partidas (${pct(to.rate)}).`,
      suggestion: 'Treinar jogar mais rápido ou rever cartas que travam o turno.',
    });
  }

  // 5. Versão nova pior que a anterior
  if (currentVersion) {
    const prev = [...versions]
      .filter((v) => v.number < currentVersion.number)
      .sort((a, b) => b.number - a.number)[0];
    if (prev) {
      const cur = record(deckMatches.filter((m) => m.versionId === currentVersion.id));
      const old = record(deckMatches.filter((m) => m.versionId === prev.id));
      if (cur.n >= T.versionMinMatches && old.n >= T.versionMinMatches && cur.rate != null && old.rate != null) {
        const diff = cur.rate - old.rate;
        if (diff <= -T.versionDrop) {
          alerts.push({
            id: 'version',
            priority: 5,
            title: `v${currentVersion.number} está pior que v${prev.number}`,
            detail: `v${currentVersion.number}: ${pct(cur.rate)} (${cur.n}) · v${prev.number}: ${pct(old.rate)} (${old.n}) · ${pts(diff)}.`,
            suggestion: 'Considerar voltar à versão anterior.',
          });
        }
      }
    }
  }

  // 6. Cartas inúteis (só as que ainda estão na lista atual)
  const inList = new Set((currentVersion?.cards ?? []).map((c) => normalize(c.name)));
  for (const row of cardMarkStats(deckMatches)) {
    if (row.inutil >= T.uselessMarks && (!currentVersion || inList.has(normalize(row.name)))) {
      alerts.push({
        id: `card:${normalize(row.name)}`,
        priority: 6,
        title: `${row.name} marcada como inútil`,
        detail: `Em ${row.inutil} partidas${row.inutilVs.length ? ` (contra ${row.inutilVs.slice(0, 3).join(', ')})` : ''}.`,
        suggestion: 'Candidata a sair na próxima versão.',
      });
    }
  }

  return alerts.sort((a, b) => a.priority - b.priority);
}
