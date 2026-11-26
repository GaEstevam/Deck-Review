import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { WinRecord } from '../lib/stats';
import { SMALL_SAMPLE } from '../lib/stats';
import { pct, range } from '../lib/format';

export function PageHead({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>
          {title}
          <span className="dot">.</span>
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export function Empty({ title, text, to, action }: { title: string; text?: string; to?: string; action?: string }) {
  return (
    <div className="card empty">
      <div className="icon-tile">⚡</div>
      <h2>
        {title}
        <span className="dot">.</span>
      </h2>
      {text && <p>{text}</p>}
      {to && action && (
        <Link className="btn primary" to={to}>
          {action}
        </Link>
      )}
    </div>
  );
}

/** Taxa com faixa provável; cinza + aviso quando a amostra é pequena. */
export function Rate({ rec, min = SMALL_SAMPLE, showN = true }: { rec: WinRecord; min?: number; showN?: boolean }) {
  if (rec.n === 0) return <span className="faint">—</span>;
  const small = rec.n < min;
  return (
    <span className={small ? 'faint' : ''} title={small ? 'amostra pequena' : undefined}>
      <span className="num">{pct(rec.rate)}</span>
      <span className="tiny faint"> {range(rec.low, rec.high)}</span>
      {showN && <span className="tiny faint"> · {rec.n}</span>}
    </span>
  );
}

/** Taxa em destaque com barra (verde ≥ 55%, âmbar 45–55%, vermelho < 45%); a marca no meio é 50%. */
export function RateBar({ rec, min = SMALL_SAMPLE }: { rec: WinRecord; min?: number }) {
  if (rec.n === 0 || rec.rate == null) return <span className="faint small">sem partidas</span>;
  const small = rec.n < min;
  const tone = rec.rate >= 0.55 ? 'good' : rec.rate >= 0.45 ? 'mid' : 'bad';
  return (
    <div title={small ? 'amostra pequena' : undefined}>
      <div className={`ratebar${small ? ' small-sample' : ''}`}>
        <span className="ratebar-pct">{pct(rec.rate)}</span>
        <span className="ratebar-track" aria-hidden="true">
          <span className={`ratebar-fill ${tone}`} style={{ width: `${Math.round(rec.rate * 100)}%` }} />
          <span className="ratebar-mark" />
        </span>
      </div>
      <div className="ratebar-sub">
        {rec.v}V {rec.d}D{rec.e ? ` ${rec.e}E` : ''} · {rec.n} {rec.n === 1 ? 'partida' : 'partidas'} · faixa {range(rec.low, rec.high)}
      </div>
    </div>
  );
}

export function ShareBar({ share, max }: { share: number; max: number }) {
  return (
    <span className="sharebar">
      <span className="num">{share.toFixed(1)}%</span>
      <span className="sharebar-track" aria-hidden="true">
        <span className="sharebar-fill" style={{ width: `${Math.min(100, (share / Math.max(max, 1)) * 100)}%`, display: 'block' }} />
      </span>
    </span>
  );
}

export function Record({ rec }: { rec: WinRecord }) {
  return (
    <span className="num tiny muted">
      {rec.v}V {rec.d}D{rec.e ? ` ${rec.e}E` : ''}
    </span>
  );
}

export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  tone,
}: {
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  tone?: (v: T) => string;
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? (tone ? tone(o.value) : 'on') : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function useToast(): [string | null, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, setMsg];
}

export function Toast({ msg }: { msg: string | null }) {
  return msg ? <div className="toast">{msg}</div> : null;
}
