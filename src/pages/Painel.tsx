import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import AlertList from '../components/AlertList';
import DeckScopeBar from '../components/DeckScopeBar';
import MigrationBanner from '../components/MigrationBanner';
import OwnershipSummary from '../components/OwnershipSummary';
import WeeklyChart from '../components/WeeklyChart';
import { Empty, PageHead } from '../components/ui';
import { computeAlerts } from '../lib/alerts';
import { checkDeck } from '../lib/collection';
import { daysBetween, fmtDate, pct, plural, pts, range, today } from '../lib/format';
import { expectedRate, record, SMALL_SAMPLE, trend, weeklySeries } from '../lib/stats';
import { useSelection } from '../store/selection';

const TREND_LABEL = {
  melhorando: { text: 'Melhorando', cls: 'good' },
  estavel: { text: 'Estável', cls: '' },
  piorando: { text: 'Piorando', cls: 'bad' },
  insuficiente: { text: 'Poucos dados', cls: 'faint' },
} as const;

export default function Painel() {
  const sel = useSelection();
  const { data, deck, version, versions, deckMatches, scopeMatches } = sel;
  const s = data.settings;
  const days = daysBetween(today(), s.eventDate);

  const view = useMemo(() => {
    const rec = record(scopeMatches);
    return {
      rec,
      exp: expectedRate(scopeMatches, data.meta.entries),
      tr: trend(deckMatches),
      weekly: weeklySeries(scopeMatches),
      alerts: computeAlerts({ matches: scopeMatches, deckMatches, meta: data.meta.entries, versions, currentVersion: version }),
      own: version ? checkDeck(version.cards, data.collection) : null,
    };
  }, [scopeMatches, deckMatches, data.meta.entries, data.collection, versions, version]);

  const countdown = (
    <div className="hero">
      <div className="hero-row">
        <div>
          <h2>
            {days > 0 ? `Rumo ao ${s.eventName}` : days === 0 ? `Hoje é o ${s.eventName}` : `${s.eventName} encerrado`}
            <span className="dot">.</span>
          </h2>
          <p>
            {days >= 0 ? fmtDate(s.eventDate) : <Link to="/config" style={{ color: '#fff' }}>Definir o próximo evento</Link>}
            {deck ? ` · ${deck.name}${version ? ` v${version.number}` : ''}` : ''}
          </p>
          <div className="energy-dots" style={{ marginTop: 14 }} aria-hidden="true">
            {['--fire', '--water', '--grass', '--lightning', '--psychic', '--fighting'].map((c) => (
              <span key={c} style={{ background: `var(${c})` }} />
            ))}
          </div>
        </div>
        {days > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div className="big num">{days}</div>
            <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 13 }}>{days === 1 ? 'dia restante' : 'dias restantes'}</div>
          </div>
        )}
      </div>
    </div>
  );

  if (!deck) {
    return (
      <>
        <PageHead title="Painel" subtitle="Meu deck está pronto para o evento?" />
        <MigrationBanner />
        {countdown}
        <div className="section">
          <Empty title="Cadastre seu primeiro deck" text="Cole a lista do TCG Live e comece a registrar partidas." to="/decks" action="Cadastrar deck" />
        </div>
      </>
    );
  }

  const { rec, exp, tr, weekly, alerts, own } = view;
  const small = rec.n < SMALL_SAMPLE;
  const trInfo = TREND_LABEL[tr.status];
  const noMeta = data.meta.entries.length === 0;

  return (
    <>
      <PageHead title="Painel" subtitle="Meu deck está pronto para o evento?" />
      <MigrationBanner />

      {countdown}

      <div className="section row between">
        <DeckScopeBar sel={sel} />
        {version && <OwnershipSummary report={own!} hasCollection={data.collection.length > 0} />}
      </div>

      <div className="section grid grid-3">
        <div className="card stat">
          <span className="stat-icon" aria-hidden="true">★</span>
          <span className="stat-label">Taxa de vitória geral</span>
          <span className={`stat-value${small ? ' small-sample' : ''}`}>{pct(rec.rate)}</span>
          <span className="stat-sub">
            {rec.n === 0 ? 'nenhuma partida ainda' : `${plural(rec.n, 'partida', 'partidas')} · faixa ${range(rec.low, rec.high)}`}
          </span>
          {small && rec.n > 0 && <span className="tiny warn">amostra pequena</span>}
        </div>

        <div className="card stat">
          <span className="stat-icon" aria-hidden="true">◎</span>
          <span className="stat-label">Taxa esperada no {s.eventName.replace(/^Regional do /, '')}</span>
          <span className={`stat-value${small || noMeta ? ' small-sample' : ''}`}>{pct(exp.rate)}</span>
          <span className="stat-sub">
            {noMeta ? (
              <>
                sem meta cadastrado — <Link to="/meta">cadastrar</Link>
              </>
            ) : (
              `${exp.usedMatchups} de ${exp.metaEntries} confrontos do meta com 5+ partidas`
            )}
          </span>
          {small && rec.n > 0 && <span className="tiny warn">amostra pequena</span>}
        </div>

        <div className="card stat">
          <span className="stat-icon" aria-hidden="true">↗</span>
          <span className="stat-label">Tendência (deck inteiro)</span>
          <span className={`stat-value ${trInfo.cls}`}>{trInfo.text}</span>
          <span className="stat-sub">
            {tr.status === 'insuficiente'
              ? 'precisa de pelo menos 10 partidas'
              : `últimas ${tr.window}: ${pct(tr.recent.rate)} vs ${pct(tr.previous.rate)} antes (${pts(tr.diff ?? 0)})`}
          </span>
        </div>
      </div>

      <div className="section grid grid-2">
        <div className="card">
          <div className="card-head">
            <h2>Vitórias por semana</h2>
          </div>
          <WeeklyChart series={weekly} />
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Alertas ativos</h2>
            <span className="badge">{alerts.length}</span>
          </div>
          <AlertList alerts={alerts} />
        </div>
      </div>
    </>
  );
}
