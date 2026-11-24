import { useMemo } from 'react';
import DeckScopeBar from '../components/DeckScopeBar';
import { Empty, PageHead } from '../components/ui';
import { THRESHOLDS } from '../lib/alerts';
import { normalize, uniqueNames } from '../lib/decklist';
import { cardMarkStats } from '../lib/stats';
import { useSelection } from '../store/selection';

export default function Cartas() {
  const sel = useSelection();
  const { deck, version, scopeMatches } = sel;
  const rows = useMemo(() => cardMarkStats(scopeMatches), [scopeMatches]);

  if (!deck) return <Empty title="Nenhum deck" to="/decks" action="Cadastrar deck" />;

  const marked = new Set(rows.map((r) => normalize(r.name)));
  const neverMarked = version ? uniqueNames(version.cards).filter((n) => !marked.has(normalize(n))) : [];
  const inList = new Set((version?.cards ?? []).map((c) => normalize(c.name)));

  return (
    <>
      <PageHead title="Cartas" subtitle="Quantas partidas marcaram cada carta como decisiva ou inútil, e em quais confrontos." />
      <DeckScopeBar sel={sel} />

      <div className="card section">
        {rows.length === 0 ? (
          <p className="muted small">Nenhuma carta marcada ainda. Ao registrar uma partida, abra “Cartas que decidiram”.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Carta</th>
                  <th className="r">Grande</th>
                  <th className="r">Inútil</th>
                  <th>Confrontos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td>
                      {r.name}
                      {version && !inList.has(normalize(r.name)) && <span className="tiny faint"> · fora da v{version.number}</span>}
                    </td>
                    <td className="r num good">{r.grande || ''}</td>
                    <td className="r num bad">{r.inutil || ''}</td>
                    <td className="small">
                      {r.grandeVs.length > 0 && <div className="good">★ {r.grandeVs.join(', ')}</div>}
                      {r.inutilVs.length > 0 && <div className="bad">✗ {r.inutilVs.join(', ')}</div>}
                    </td>
                    <td>{r.inutil >= THRESHOLDS.uselessMarks && <span className="badge bad">candidata a sair</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {neverMarked.length > 0 && (
        <div className="card section">
          <h2>Nunca marcadas</h2>
          <p className="small muted" style={{ margin: '4px 0 10px' }}>
            Cartas da v{version!.number} que ainda não decidiram partida nenhuma (nem para o bem, nem para o mal).
          </p>
          <div className="chips">
            {neverMarked.map((n) => (
              <span key={n} className="chip" style={{ cursor: 'default' }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
