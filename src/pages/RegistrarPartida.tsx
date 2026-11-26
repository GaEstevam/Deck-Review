import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import BattleLogImport from '../components/BattleLogImport';
import Dropdown from '../components/Dropdown';
import { Empty, PageHead, Seg, Toast, useToast } from '../components/ui';
import { END_REASON_LABEL, suggestOpponentDeck, type BattleLogInfo } from '../lib/battleLog';
import { normalize, uniqueNames } from '../lib/decklist';
import { fmtDate, today } from '../lib/format';
import { LOSS_REASONS, lossReasonLabel, VENUE_LABEL } from '../lib/labels';
import { matchResult, sortMatches } from '../lib/stats';
import { addMatch, deleteMatch, updateMatch } from '../store/actions';
import { deckVersions, versionLabel } from '../store/selection';
import { useData } from '../store/store';
import type { CardMark, GameResult, LossReason, Match, Turn, Venue } from '../types';

interface GameDraft {
  result: GameResult | null;
  turn: Turn | null;
}

const blankGames = (): GameDraft[] => [
  { result: null, turn: null },
  { result: null, turn: null },
  { result: null, turn: null },
];

const RESULT_TONE = (v: GameResult) => (v === 'V' ? 'on-v' : v === 'D' ? 'on-d' : 'on-e');

/** O que um Battle Log disse sobre um jogo (só os dados, sem o texto). */
interface LogEntry {
  info: BattleLogInfo;
  me: string;
  rival: string | null;
  result: GameResult | null;
  turn: Turn | null;
  suggested: string | null;
}

const RESULT_WORD: Record<GameResult, string> = { V: 'vitória', D: 'derrota', E: 'empate' };

function LogSummary({ entry, game, onClear }: { entry: LogEntry; game: GameDraft; onClear: () => void }) {
  const { info, me, rival } = entry;
  const parts: string[] = [];
  if (entry.result) parts.push(`${entry.result === 'V' ? 'você venceu' : `${rival ?? 'o oponente'} venceu`}${info.endReason ? ` (${END_REASON_LABEL[info.endReason]})` : ''}`);
  else parts.push('vencedor não encontrado no log');
  if (entry.turn) parts.push(`você começou em ${entry.turn}º`);
  if (info.turns) parts.push(`${info.turns} turnos`);
  if (rival && (info.prizes[me] !== undefined || info.prizes[rival] !== undefined)) parts.push(`prêmios ${info.prizes[me] ?? 0} × ${info.prizes[rival] ?? 0}`);
  if (info.mulligans[me]) parts.push(`${info.mulligans[me]} mulligan${info.mulligans[me] > 1 ? 's' : ''} seu${info.mulligans[me] > 1 ? 's' : ''}`);
  const rivalMons = rival ? (info.pokemon[rival] ?? []) : [];

  const warnings: string[] = [];
  if (entry.result && game.result && game.result !== entry.result)
    warnings.push(`O log indica ${RESULT_WORD[entry.result]}, mas está marcado ${RESULT_WORD[game.result]}.`);
  if (entry.turn && game.turn && game.turn !== entry.turn) warnings.push(`O log indica que você começou em ${entry.turn}º.`);

  return (
    <div className="log-panel">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="small">
          <b>Log lido</b> <span className="muted">· {me} vs {rival ?? '?'} · {info.lines} linhas</span>
          <div style={{ marginTop: 2 }}>{parts.join(' · ')}</div>
          {rivalMons.length > 0 && (
            <div className="tiny muted" style={{ marginTop: 2 }}>
              Oponente jogou: {rivalMons.slice(0, 8).join(', ')}
              {rivalMons.length > 8 ? '…' : ''}
              {entry.suggested && (
                <>
                  {' '}
                  → deck sugerido: <b>{entry.suggested}</b>
                </>
              )}
            </div>
          )}
        </div>
        <button type="button" className="ghost sm" onClick={onClear} aria-label="Fechar resumo do log">
          ✕
        </button>
      </div>
      {warnings.map((w) => (
        <div key={w} className="notice" style={{ marginTop: 8 }}>
          ⚠ {w} Pode salvar assim mesmo se estiver certo.
        </div>
      ))}
    </div>
  );
}

/** Rota /partidas/:id — abre o formulário em modo edição (key garante estado novo por partida). */
export function EditarPartida() {
  const { id } = useParams();
  return <RegistrarPartida key={id} editId={id} />;
}

function gamesFrom(m: Match | undefined): GameDraft[] {
  const gs = blankGames();
  m?.games.slice(0, 3).forEach((g, i) => (gs[i] = { result: g.result, turn: g.turn }));
  return gs;
}

export default function RegistrarPartida({ editId }: { editId?: string } = {}) {
  const data = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, showToast] = useToast();
  const editing = editId ? data.matches.find((m) => m.id === editId) : undefined;
  // na edição, o deck da partida aparece mesmo se estiver arquivado
  const activeDecks = data.decks.filter((d) => d.status !== 'arquivado' || d.id === editing?.deckId);
  const defaultDeck =
    activeDecks.find((d) => d.id === data.settings.lastDeckId) ??
    activeDecks.find((d) => d.id === data.settings.selectedDeckId) ??
    activeDecks[0];

  const [deckId, setDeckId] = useState(editing?.deckId ?? defaultDeck?.id ?? '');
  const deck = data.decks.find((d) => d.id === deckId);
  const versions = deckVersions(data, deckId);
  const [versionId, setVersionId] = useState(editing?.versionId ?? deck?.currentVersionId ?? '');
  const version = versions.find((v) => v.id === versionId) ?? versions.find((v) => v.id === deck?.currentVersionId) ?? versions[0];

  const [date, setDate] = useState(editing?.date ?? today());
  const [opponent, setOpponent] = useState(editing?.opponent ?? '');
  const [games, setGames] = useState<GameDraft[]>(() => gamesFrom(editing));
  const [venue, setVenue] = useState<Venue>(editing?.venue ?? 'online');
  const [timeout, setTimeoutFlag] = useState(editing?.timeout ?? false);
  const [lossReason, setLossReason] = useState<LossReason | null>(editing?.lossReason ?? null);
  const [marks, setMarks] = useState<Record<string, CardMark>>(() => Object.fromEntries((editing?.cards ?? []).map((c) => [c.name, c.mark])));
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<(LogEntry | null)[]>([null, null, null]);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState('');

  // aviso vindo da edição ("Partida atualizada") ao voltar para esta tela
  const flash = (location.state as { toast?: string } | null)?.toast;
  useEffect(() => {
    if (flash) {
      showToast(flash);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  const opponents = useMemo(() => {
    const set = new Map<string, string>();
    for (const e of data.meta.entries) set.set(e.deck.toLowerCase(), e.deck);
    for (const m of data.matches) if (m.opponent) set.set(m.opponent.toLowerCase(), m.opponent);
    return [...set.values()];
  }, [data.meta.entries, data.matches]);

  const played = games.filter((g) => g.result) as { result: GameResult; turn: Turn | null }[];
  const preview: GameResult | null = played.length
    ? matchResult({ games: played } as Match)
    : null;

  if (editId && !editing) {
    return (
      <>
        <PageHead title="Editar partida" />
        <Empty title="Partida não encontrada" text="Ela pode ter sido apagada." to="/registrar" action="Voltar para as partidas" />
      </>
    );
  }

  if (!deck || !version) {
    return (
      <>
        <PageHead title="Registrar partida" />
        <Empty title="Nenhum deck ativo" text="Cadastre um deck antes de registrar partidas." to="/decks" action="Cadastrar deck" />
      </>
    );
  }

  const changeDeck = (id: string) => {
    setDeckId(id);
    const d = data.decks.find((x) => x.id === id);
    setVersionId(d?.currentVersionId ?? '');
    setMarks({});
  };

  const setGame = (i: number, patch: Partial<GameDraft>) =>
    setGames((gs) => gs.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  /** Preenche um jogo com o que o Battle Log diz; o texto do log já foi descartado. */
  const applyLog = (i: number, info: BattleLogInfo, me: string) => {
    const result: GameResult | null = info.winner ? (info.winner === me ? 'V' : 'D') : null;
    const turn: Turn | null = info.firstPlayer ? (info.firstPlayer === me ? 1 : 2) : null;
    setGames((gs) => gs.map((g, j) => (j === i ? { result: result ?? g.result, turn: turn ?? g.turn } : g)));
    const rival = info.players?.find((p) => p !== me) ?? null;
    let suggested: string | null = null;
    if (rival && !opponent.trim()) {
      suggested = suggestOpponentDeck(info.pokemon[rival] ?? [], opponents);
      if (suggested) setOpponent(suggested);
    }
    setLogs((ls) => ls.map((x, j) => (j === i ? { info, me, rival, result, turn, suggested } : x)));
  };

  const cycleMark = (name: string) =>
    setMarks((m) => {
      const next = { ...m };
      if (!m[name]) next[name] = 'grande';
      else if (m[name] === 'grande') next[name] = 'inutil';
      else delete next[name];
      return next;
    });

  const save = () => {
    if (!opponent.trim()) return setError('Informe o deck do oponente.');
    if (!played.length) return setError('Marque o resultado de pelo menos um jogo.');
    setError('');
    const fields = {
      date,
      deckId: deck.id,
      versionId: version.id,
      opponent: opponent.trim(),
      games: played.map((g) => ({ result: g.result, turn: g.turn })),
      venue,
      timeout,
      lossReason: preview === 'D' ? lossReason : null,
      cards: Object.entries(marks).map(([name, mark]) => ({ name, mark })),
      note: note.trim(),
    };
    if (editing) {
      updateMatch(editing.id, fields);
      navigate('/registrar', { state: { toast: 'Partida atualizada' } });
      return;
    }
    addMatch(fields);
    setOpponent('');
    setGames(blankGames());
    setTimeoutFlag(false);
    setLossReason(null);
    setMarks({});
    setNote('');
    setLogs([null, null, null]);
    showToast('Partida registrada');
  };

  const all = sortMatches(data.matches).reverse();
  const nf = normalize(filter);
  const recent = showAll
    ? all.filter((m) => !nf || normalize(`${m.opponent} ${versionLabel(data, m.versionId)} ${fmtDate(m.date)} ${m.note}`).includes(nf))
    : all.slice(0, 15);
  // cartas da versão + as que já estavam marcadas (para poder desmarcar mesmo se saíram da lista)
  const markNames = [...new Set([...uniqueNames(version.cards), ...Object.keys(marks)])];

  return (
    <>
      {editing ? (
        <PageHead title="Editar partida" subtitle={`${fmtDate(editing.date)} · vs ${editing.opponent} · ${versionLabel(data, editing.versionId)}`}>
          <Link className="btn" to="/registrar">
            Cancelar
          </Link>
        </PageHead>
      ) : (
        <PageHead title="Registrar partida" subtitle="Menos de 1 minuto: resultado, motivo e cartas que decidiram." />
      )}

      <div className="card stack">
        <div className="field-row">
          <label>
            Deck
            <Dropdown block ariaLabel="Deck" value={deck.id} onChange={changeDeck} options={activeDecks.map((d) => ({ value: d.id, label: d.name }))} />
          </label>
          <label>
            Versão
            <Dropdown
              block
              ariaLabel="Versão"
              value={version.id}
              onChange={setVersionId}
              options={versions.map((v) => ({ value: v.id, label: `v${v.number}`, hint: v.id === deck.currentVersionId ? 'atual' : undefined }))}
            />
          </label>
          <label>
            Data
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <label>
          Deck do oponente
          <input list="opponents" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Ex.: Gardevoir ex" />
          <datalist id="opponents">
            {opponents.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </label>
        {data.meta.entries.length > 0 && (
          <div className="chips">
            {data.meta.entries.slice(0, 12).map((e) => (
              <button type="button" key={e.deck} className={`chip${opponent === e.deck ? ' on' : ''}`} onClick={() => setOpponent(e.deck)}>
                {e.deck}
              </button>
            ))}
          </div>
        )}

        <div>
          <div className="small muted" style={{ marginBottom: 8 }}>
            Resultado (melhor de 3 — para partida única, marque só o Jogo 1). No TCG Live, exporte o Battle Log e use “Colar log” para
            preencher sozinho.
          </div>
          <div className="stack">
            {games.map((g, i) => (
              <div className="row" key={i}>
                <span style={{ width: 60 }} className="small">
                  Jogo {i + 1}
                </span>
                <Seg
                  value={g.result}
                  tone={RESULT_TONE}
                  onChange={(r) => setGame(i, { result: g.result === r ? null : r })}
                  options={[
                    { value: 'V', label: 'V' },
                    { value: 'D', label: 'D' },
                    { value: 'E', label: 'E' },
                  ]}
                />
                <Seg
                  value={g.turn}
                  onChange={(t) => setGame(i, { turn: g.turn === t ? null : t })}
                  options={[
                    { value: 1 as Turn, label: 'Comecei 1º' },
                    { value: 2 as Turn, label: '2º' },
                  ]}
                />
                <BattleLogImport onApply={(info, me) => applyLog(i, info, me)} />
                {logs[i] && <LogSummary entry={logs[i]!} game={g} onClear={() => setLogs((ls) => ls.map((x, j) => (j === i ? null : x)))} />}
              </div>
            ))}
          </div>
          {preview && (
            <p className="small" style={{ marginTop: 8 }}>
              Resultado da partida:{' '}
              <b className={preview === 'V' ? 'good' : preview === 'D' ? 'bad' : 'warn'}>
                {preview === 'V' ? 'Vitória' : preview === 'D' ? 'Derrota' : 'Empate'}
              </b>
            </p>
          )}
        </div>

        <div className="row">
          <Seg
            value={venue}
            onChange={setVenue}
            options={[
              { value: 'online', label: VENUE_LABEL.online },
              { value: 'presencial', label: VENUE_LABEL.presencial },
            ]}
          />
          <label className="checkbox">
            <input type="checkbox" checked={timeout} onChange={(e) => setTimeoutFlag(e.target.checked)} /> O tempo acabou
          </label>
        </div>

        {preview === 'D' && (
          <div>
            <div className="small muted" style={{ marginBottom: 8 }}>
              Motivo da derrota
            </div>
            <div className="chips">
              {LOSS_REASONS.map((r) => (
                <button type="button" key={r.value} className={`chip${lossReason === r.value ? ' on' : ''}`} onClick={() => setLossReason(lossReason === r.value ? null : r.value)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <details>
          <summary>
            Cartas que decidiram {Object.keys(marks).length > 0 && `(${Object.keys(marks).length})`}
          </summary>
          <p className="tiny muted" style={{ marginBottom: 8 }}>
            Toque uma vez = <span className="good">grande</span>, duas = <span className="bad">inútil</span>, três = limpar.
          </p>
          <div className="chips">
            {markNames.map((name) => (
              <button type="button" key={name} className={`chip ${marks[name] ?? ''}`} onClick={() => cycleMark(name)}>
                {marks[name] === 'grande' ? '★ ' : marks[name] === 'inutil' ? '✗ ' : ''}
                {name}
              </button>
            ))}
          </div>
        </details>

        <label>
          Nota
          <textarea className="prose" value={note} onChange={(e) => setNote(e.target.value)} placeholder="O detalhe que ninguém lembra uma semana depois" />
        </label>

        {error && <div className="notice err">{error}</div>}
        <div className="row">
          <button className="primary" onClick={save}>
            {editing ? 'Salvar alterações' : 'Salvar partida'}
          </button>
          {editing && (
            <Link className="btn" to="/registrar">
              Cancelar
            </Link>
          )}
        </div>
      </div>

      {!editing && (
      <div className="card section">
        <div className="card-head">
          <h2>{showAll ? `Todas as partidas (${all.length})` : 'Últimas partidas'}</h2>
          <div className="row">
            {showAll && (
              <input style={{ width: 220 }} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar oponente, deck, data…" aria-label="Buscar partida" />
            )}
            {all.length > 15 && (
              <button className="sm" onClick={() => { setShowAll((s) => !s); setFilter(''); }}>
                {showAll ? 'Mostrar só as últimas' : `Ver todas (${all.length})`}
              </button>
            )}
          </div>
        </div>
        <p className="tiny muted" style={{ marginTop: -6, marginBottom: 8 }}>Toque em ✎ para editar uma partida.</p>
        {recent.length === 0 ? (
          <p className="muted small">{all.length ? 'Nenhuma partida encontrada.' : 'Nenhuma partida ainda.'}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Deck</th>
                  <th>Oponente</th>
                  <th>Jogos</th>
                  <th>Motivo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recent.map((m) => {
                  const r = matchResult(m);
                  return (
                    <tr key={m.id}>
                      <td className="num">{fmtDate(m.date)}</td>
                      <td>{versionLabel(data, m.versionId)}</td>
                      <td>
                        {m.opponent}
                        {m.note && <div className="tiny faint">{m.note}</div>}
                      </td>
                      <td>
                        <span className={`badge ${r === 'V' ? 'good' : r === 'D' ? 'bad' : 'warn'}`}>{r}</span>{' '}
                        <span className="tiny muted">
                          {m.games.map((g) => g.result + (g.turn ? `${g.turn}º` : '')).join(' ')}
                          {m.timeout ? ' · tempo' : ''}
                        </span>
                      </td>
                      <td className="small muted">{r === 'D' ? lossReasonLabel(m.lossReason) : ''}</td>
                      <td className="r" style={{ whiteSpace: 'nowrap' }}>
                        <Link className="btn ghost-link" to={`/partidas/${m.id}`} title="Editar partida" aria-label={`Editar partida contra ${m.opponent}`}>
                          ✎
                        </Link>
                        <button
                          className="ghost sm"
                          title="Apagar partida"
                          onClick={() => confirm(`Apagar a partida contra ${m.opponent} de ${fmtDate(m.date)}?`) && deleteMatch(m.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
      <Toast msg={toast} />
    </>
  );
}
