import { useMemo, useState } from 'react';
import AlertList from '../components/AlertList';
import DeckScopeBar from '../components/DeckScopeBar';
import { Empty, PageHead, Rate } from '../components/ui';
import { computeAlerts } from '../lib/alerts';
import { addDays, fmtDate, pct, pts, today } from '../lib/format';
import { LOSS_REASONS } from '../lib/labels';
import { inDateRange, lossReasonStats, matchups, record } from '../lib/stats';
import { useSelection } from '../store/selection';

export default function Relatorio() {
  const sel = useSelection();
  const { data, deck, version, versions, deckMatches, scopeMatches } = sel;
  const [end, setEnd] = useState(today());
  const start = addDays(end, -6);
  const prevEnd = addDays(end, -7);
  const prevStart = addDays(end, -13);

  const r = useMemo(() => {
    const week = inDateRange(scopeMatches, start, end);
    const prev = inDateRange(scopeMatches, prevStart, prevEnd);
    const upToEnd = scopeMatches.filter((m) => m.date <= end);
    const deckUpToEnd = deckMatches.filter((m) => m.date <= end);
    return {
      week,
      cur: record(week),
      old: record(prev),
      matchups: matchups(week, data.meta.entries).filter((x) => x.record.n > 0),
      losses: lossReasonStats(week),
      alerts: computeAlerts({ matches: upToEnd, deckMatches: deckUpToEnd, meta: data.meta.entries, versions, currentVersion: version }),
    };
  }, [scopeMatches, deckMatches, start, end, prevStart, prevEnd, data.meta.entries, versions, version]);

  if (!deck) return <Empty title="Nenhum deck" to="/decks" action="Cadastrar deck" />;

  const diff = r.cur.rate != null && r.old.rate != null ? r.cur.rate - r.old.rate : null;

  return (
    <>
      <PageHead title="Relatório da semana" subtitle={`${fmtDate(start)} a ${fmtDate(end)} — fechar a semana e decidir o próximo passo.`}>
        <label className="row" style={{ flexDirection: 'row', alignItems: 'center' }}>
          Semana até
          <input type="date" value={end} onChange={(e) => e.target.value && setEnd(e.target.value)} style={{ width: 160 }} />
        </label>
      </PageHead>
      <DeckScopeBar sel={sel} />

      <div className="section grid grid-3">
        <div className="card stat">
          <span className="stat-label">Partidas na semana</span>
          <span className="stat-value">{r.cur.n}</span>
          <span className="stat-sub">semana anterior: {r.old.n}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Taxa de vitória</span>
          <span className={`stat-value${r.cur.n < 10 ? ' small-sample' : ''}`}>{pct(r.cur.rate)}</span>
          <span className="stat-sub">
            semana anterior: {pct(r.old.rate)} {diff != null && <b className={diff > 0 ? 'good' : diff < 0 ? 'bad' : ''}>({pts(diff)})</b>}
          </span>
        </div>
        <div className="card stat">
          <span className="stat-label">Derrotas</span>
          <span className="stat-value">{r.losses.losses}</span>
          <span className="stat-sub">
            {LOSS_REASONS.filter((x) => r.losses.counts[x.value] > 0)
              .map((x) => `${x.label}: ${r.losses.counts[x.value]}`)
              .join(' · ') || 'sem motivo marcado'}
          </span>
        </div>
      </div>

      <div className="section grid grid-2">
        <div className="card">
          <div className="card-head">
            <h2>Até 3 recomendações</h2>
          </div>
          <AlertList alerts={r.alerts} limit={3} />
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Confrontos da semana</h2>
          </div>
          {r.matchups.length === 0 ? (
            <p className="muted small">Nenhuma partida nesta semana.</p>
          ) : (
            <table>
              <tbody>
                {r.matchups.map((m) => (
                  <tr key={m.key}>
                    <td>{m.name}</td>
                    <td>
                      <Rate rec={m.record} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {r.week.some((m) => m.note) && (
        <div className="card section">
          <h2>Notas da semana</h2>
          <ul className="small" style={{ paddingLeft: 18, marginBottom: 0 }}>
            {r.week
              .filter((m) => m.note)
              .map((m) => (
                <li key={m.id}>
                  <span className="muted">
                    {fmtDate(m.date)} vs {m.opponent}:
                  </span>{' '}
                  {m.note}
                </li>
              ))}
          </ul>
        </div>
      )}
    </>
  );
}
