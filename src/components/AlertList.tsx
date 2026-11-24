import type { Alert } from '../lib/alerts';

export default function AlertList({ alerts, limit }: { alerts: Alert[]; limit?: number }) {
  const list = limit ? alerts.slice(0, limit) : alerts;
  if (!list.length) return <p className="muted small">Nenhum alerta ativo. Continue registrando partidas.</p>;
  return (
    <div className="alerts">
      {list.map((a) => (
        <div key={a.id} className={`alert p${a.priority}`}>
          <div className="alert-title">{a.title}</div>
          <div className="alert-detail">{a.detail}</div>
          <div className="alert-suggestion">→ {a.suggestion}</div>
        </div>
      ))}
    </div>
  );
}
