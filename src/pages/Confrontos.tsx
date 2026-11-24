import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import DeckScopeBar from '../components/DeckScopeBar';
import { Empty, PageHead, Rate, Record } from '../components/ui';
import { THRESHOLDS } from '../lib/alerts';
import { matchups, SMALL_SAMPLE, turnSplit } from '../lib/stats';
import { useSelection } from '../store/selection';

export default function Confrontos() {
  const sel = useSelection();
  const { data, deck, scopeMatches } = sel;
  const rows = useMemo(() => matchups(scopeMatches, data.meta.entries), [scopeMatches, data.meta.entries]);
  const ts = useMemo(() => turnSplit(scopeMatches), [scopeMatches]);

  if (!deck) return <Empty title="Nenhum deck" to="/decks" action="Cadastrar deck" />;

  return (
    <>
      <PageHead title="Confrontos" subtitle="Contra quem treinar: taxa contra cada deck, quanto ele é jogado e quantas partidas sustentam o número." />
      <DeckScopeBar sel={sel} />

      <div className="card section">
        {rows.length === 0 ? (
          <p className="muted small">
            Sem partidas nem meta. <Link to="/meta">Cadastre o meta</Link> e registre partidas.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Oponente</th>
                  <th className="r">Meta</th>
                  <th>Taxa · faixa · partidas</th>
                  <th>Placar</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const bad =
                    r.record.rate != null &&
                    r.record.n >= THRESHOLDS.matchupMinMatches &&
                    r.share >= THRESHOLDS.matchupMinShare &&
                    r.record.rate < THRESHOLDS.matchupRate;
                  return (
                    <tr key={r.key} className={r.record.n === 0 ? 'dim' : ''}>
                      <td>
                        {r.name}
                        {!r.inMeta && <span className="tiny faint"> · fora do meta</span>}
                      </td>
                      <td className="r num">{r.inMeta ? `${r.share.toFixed(1)}%` : '—'}</td>
                      <td>
                        <Rate rec={r.record} />
                      </td>
                      <td>{r.record.n > 0 && <Record rec={r.record} />}</td>
                      <td>
                        {bad && <span className="badge bad">treinar</span>}
                        {r.record.n > 0 && r.record.n < SMALL_SAMPLE && <span className="badge">amostra pequena</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card section">
        <h2>Começar em 1º ou 2º</h2>
        <p className="small muted" style={{ margin: '4px 0 12px' }}>
          Por jogo, somando todos os confrontos.
        </p>
        <div className="grid grid-2">
          <div>
            <div className="stat-label">Comecei em 1º</div>
            <Rate rec={ts.first} />
          </div>
          <div>
            <div className="stat-label">Comecei em 2º</div>
            <Rate rec={ts.second} />
          </div>
        </div>
      </div>
    </>
  );
}
