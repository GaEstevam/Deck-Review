import { useMemo, useState } from 'react';
import Dropdown from '../components/Dropdown';
import { Empty, PageHead, Rate } from '../components/ui';
import { fmtDate, pct, pts } from '../lib/format';
import { COMPARE_SMALL_SAMPLE, expectedRate, matchups, record } from '../lib/stats';
import { deckVersions } from '../store/selection';
import { useData } from '../store/store';
import type { AppData, Match } from '../types';

/** Opção "deck:<id>" (deck inteiro) ou "ver:<id>" (uma versão). */
function resolve(data: AppData, key: string): { label: string; matches: Match[] } | null {
  const [kind, id] = key.split(':');
  if (kind === 'deck') {
    const d = data.decks.find((x) => x.id === id);
    return d ? { label: `${d.name} (todas as versões)`, matches: data.matches.filter((m) => m.deckId === id) } : null;
  }
  const v = data.versions.find((x) => x.id === id);
  if (!v) return null;
  const d = data.decks.find((x) => x.id === v.deckId);
  return { label: `${d?.name ?? '?'} v${v.number}`, matches: data.matches.filter((m) => m.versionId === id) };
}

function Picker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const data = useData();
  return (
    <Dropdown
      block
      value={value}
      onChange={onChange}
      options={data.decks.map((d) => ({
        label: d.name,
        options: [
          { value: `deck:${d.id}`, label: `${d.name} — todas as versões` },
          ...deckVersions(data, d.id).map((v) => ({ value: `ver:${v.id}`, label: `${d.name} v${v.number}`, hint: fmtDate(v.date) })),
        ],
      }))}
    />
  );
}

export default function Comparar() {
  const data = useData();
  const defaults = useMemo(() => {
    const deck = data.decks.find((d) => d.id === data.settings.selectedDeckId) ?? data.decks[0];
    if (!deck) return ['', ''];
    const vs = deckVersions(data, deck.id);
    if (vs.length >= 2) return [`ver:${vs[0].id}`, `ver:${vs[1].id}`];
    const other = data.decks.find((d) => d.id !== deck.id);
    return [`deck:${deck.id}`, other ? `deck:${other.id}` : `deck:${deck.id}`];
  }, [data]);
  const [a, setA] = useState(defaults[0]);
  const [b, setB] = useState(defaults[1]);

  if (!data.decks.length) return <Empty title="Nenhum deck" to="/decks" action="Cadastrar deck" />;

  const A = resolve(data, a);
  const B = resolve(data, b);
  if (!A || !B) return null;

  const meta = data.meta.entries;
  const ra = record(A.matches);
  const rb = record(B.matches);
  const ea = expectedRate(A.matches, meta);
  const eb = expectedRate(B.matches, meta);
  const small = ra.n < COMPARE_SMALL_SAMPLE || rb.n < COMPARE_SMALL_SAMPLE;

  const ma = new Map(matchups(A.matches, meta).map((r) => [r.key, r]));
  const mb = new Map(matchups(B.matches, meta).map((r) => [r.key, r]));
  const keys = [...new Set([...ma.keys(), ...mb.keys()])].sort(
    (x, y) => (ma.get(y)?.share ?? mb.get(y)?.share ?? 0) - (ma.get(x)?.share ?? mb.get(x)?.share ?? 0),
  );

  const diff = (x: number | null, y: number | null) =>
    x != null && y != null ? <span className={x - y > 0 ? 'good' : x - y < 0 ? 'bad' : 'muted'}>{pts(x - y)}</span> : null;

  return (
    <>
      <PageHead title="Comparar" subtitle="Dois decks, ou duas versões do mesmo deck, lado a lado." />

      <div className="card">
        <div className="field-row">
          <label>
            A
            <Picker value={a} onChange={setA} />
          </label>
          <label>
            B
            <Picker value={b} onChange={setB} />
          </label>
        </div>
        {small && (
          <div className="notice" style={{ marginTop: 12 }}>
            Amostra pequena: menos de {COMPARE_SMALL_SAMPLE} partidas de um dos lados. Trate a diferença com cautela.
          </div>
        )}
      </div>

      <div className="card section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th />
                <th>{A.label}</th>
                <th>{B.label}</th>
                <th>A − B</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Taxa geral</td>
                <td>
                  <Rate rec={ra} min={COMPARE_SMALL_SAMPLE} />
                </td>
                <td>
                  <Rate rec={rb} min={COMPARE_SMALL_SAMPLE} />
                </td>
                <td>{diff(ra.rate, rb.rate)}</td>
              </tr>
              <tr>
                <td>Taxa esperada no evento</td>
                <td className="num">{pct(ea.rate)}</td>
                <td className="num">{pct(eb.rate)}</td>
                <td>{diff(ea.rate, eb.rate)}</td>
              </tr>
              {keys.map((k) => {
                const x = ma.get(k);
                const y = mb.get(k);
                const row = x ?? y!;
                if (!x?.record.n && !y?.record.n) return null;
                return (
                  <tr key={k}>
                    <td>
                      vs {row.name} {row.inMeta && <span className="tiny faint">{row.share.toFixed(1)}%</span>}
                    </td>
                    <td>{x ? <Rate rec={x.record} /> : '—'}</td>
                    <td>{y ? <Rate rec={y.record} /> : '—'}</td>
                    <td>{diff(x?.record.rate ?? null, y?.record.rate ?? null)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
