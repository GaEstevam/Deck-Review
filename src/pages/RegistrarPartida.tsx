import { useMemo, useState } from 'react';
import { Empty, PageHead, Seg, Toast, useToast } from '../components/ui';
import { uniqueNames } from '../lib/decklist';
import { fmtDate, today } from '../lib/format';
import { LOSS_REASONS, lossReasonLabel, VENUE_LABEL } from '../lib/labels';
import { matchResult, sortMatches } from '../lib/stats';
import { addMatch, deleteMatch } from '../store/actions';
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

export default function RegistrarPartida() {
  const data = useData();
  const [toast, showToast] = useToast();
  const activeDecks = data.decks.filter((d) => d.status !== 'arquivado');
  const defaultDeck =
    activeDecks.find((d) => d.id === data.settings.lastDeckId) ??
    activeDecks.find((d) => d.id === data.settings.selectedDeckId) ??
    activeDecks[0];

  const [deckId, setDeckId] = useState(defaultDeck?.id ?? '');
  const deck = data.decks.find((d) => d.id === deckId);
  const versions = deckVersions(data, deckId);
  const [versionId, setVersionId] = useState(deck?.currentVersionId ?? '');
  const version = versions.find((v) => v.id === versionId) ?? versions.find((v) => v.id === deck?.currentVersionId) ?? versions[0];

  const [date, setDate] = useState(today());
  const [opponent, setOpponent] = useState('');
  const [games, setGames] = useState<GameDraft[]>(blankGames);
  const [venue, setVenue] = useState<Venue>('online');
  const [timeout, setTimeoutFlag] = useState(false);
  const [lossReason, setLossReason] = useState<LossReason | null>(null);
  const [marks, setMarks] = useState<Record<string, CardMark>>({});
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

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
    addMatch({
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
    });
    setOpponent('');
    setGames(blankGames());
    setTimeoutFlag(false);
    setLossReason(null);
    setMarks({});
    setNote('');
    showToast('Partida registrada');
  };

  const recent = sortMatches(data.matches).reverse().slice(0, 15);

  return (
    <>
      <PageHead title="Registrar partida" subtitle="Menos de 1 minuto: resultado, motivo e cartas que decidiram." />

      <div className="card stack">
        <div className="field-row">
          <label>
            Deck
            <select value={deck.id} onChange={(e) => changeDeck(e.target.value)}>
              {activeDecks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Versão
            <select value={version.id} onChange={(e) => setVersionId(e.target.value)}>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.number}
                  {v.id === deck.currentVersionId ? ' (atual)' : ''}
                </option>
              ))}
            </select>
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
            Resultado (melhor de 3 — para partida única, marque só o Jogo 1)
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
            {uniqueNames(version.cards).map((name) => (
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
            Salvar partida
          </button>
        </div>
      </div>

      <div className="card section">
        <div className="card-head">
          <h2>Últimas partidas</h2>
        </div>
        {recent.length === 0 ? (
          <p className="muted small">Nenhuma partida ainda.</p>
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
                      <td className="r">
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
      <Toast msg={toast} />
    </>
  );
}
