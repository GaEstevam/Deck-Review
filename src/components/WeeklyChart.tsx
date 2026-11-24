import type { WinRecord } from '../lib/stats';
import { SMALL_SAMPLE } from '../lib/stats';
import { fmtShortDate, pct } from '../lib/format';

/** Curva da taxa de vitória por semana (SVG simples, sem biblioteca). */
export default function WeeklyChart({ series }: { series: { week: string; record: WinRecord }[] }) {
  if (series.length === 0) return <p className="muted small">Sem partidas ainda.</p>;
  const W = 640;
  const H = 200;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (series.length === 1 ? iw / 2 : (i * iw) / (series.length - 1));
  const y = (r: number) => pad.t + ih - r * ih;
  const pts = series.map((s, i) => [x(i), y(s.record.rate ?? 0)] as const);
  const path = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const step = Math.ceil(series.length / 8);

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Taxa de vitória por semana">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line className={t === 0.5 ? 'ref-line' : 'grid-line'} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end">
            {t * 100}%
          </text>
        </g>
      ))}
      <path className="series" d={path} />
      {series.map((s, i) => (
        <g key={s.week}>
          <circle className={`dot${s.record.n < SMALL_SAMPLE / 2 ? ' small' : ''}`} cx={pts[i][0]} cy={pts[i][1]} r={4}>
            <title>
              Semana de {fmtShortDate(s.week)}: {pct(s.record.rate)} em {s.record.n} partidas
            </title>
          </circle>
          {i % step === 0 && (
            <text x={pts[i][0]} y={H - 8} textAnchor="middle">
              {fmtShortDate(s.week)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
