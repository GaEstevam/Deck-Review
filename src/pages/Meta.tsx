import { useState } from 'react';
import { PageHead, Toast, useToast } from '../components/ui';
import { fmtDate } from '../lib/format';
import { parseMetaText } from '../lib/meta';
import { setMeta } from '../store/actions';
import { useData } from '../store/store';
import type { MetaEntry } from '../types';

export default function Meta() {
  const data = useData();
  const [toast, showToast] = useToast();
  const [rows, setRows] = useState<MetaEntry[]>(data.meta.entries.length ? data.meta.entries : [{ deck: '', share: 0 }]);
  const [source, setSource] = useState(data.meta.source);
  const [paste, setPaste] = useState('');

  const total = rows.reduce((s, r) => s + (Number(r.share) || 0), 0);
  const setRow = (i: number, patch: Partial<MetaEntry>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = () => {
    setMeta(rows, source);
    showToast('Meta salvo');
  };

  const importPaste = () => {
    const parsed = parseMetaText(paste);
    if (parsed.length) {
      setRows(parsed);
      setPaste('');
    }
  };

  return (
    <>
      <PageHead
        title="Meta"
        subtitle={`Os decks mais jogados e a fatia de cada um (Limitless TCG). Dá peso a cada confronto na taxa esperada.${
          data.meta.updatedAt ? ` Atualizado em ${fmtDate(data.meta.updatedAt)}.` : ''
        }`}
      />

      <div className="grid grid-2">
        <div className="card stack">
          <div className="card-head" style={{ marginBottom: 0 }}>
            <h2>Decks do meta</h2>
            <span className={`badge ${total > 100.5 ? 'bad' : 'accent'}`}>{total.toFixed(1)}%</span>
          </div>
          <p className="tiny muted">O que faltar para 100% conta como “outros” e usa a sua taxa geral.</p>
          {rows.map((r, i) => (
            <div className="row" key={i} style={{ flexWrap: 'nowrap' }}>
              <input value={r.deck} onChange={(e) => setRow(i, { deck: e.target.value })} placeholder="Deck" />
              <input
                type="number"
                step="0.1"
                min={0}
                max={100}
                style={{ width: 90 }}
                value={r.share}
                onChange={(e) => setRow(i, { share: Number(e.target.value) })}
                aria-label="Porcentagem"
              />
              <span className="muted">%</span>
              <button className="ghost sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remover">
                ✕
              </button>
            </div>
          ))}
          <div className="row">
            <button className="sm" onClick={() => setRows((rs) => [...rs, { deck: '', share: 0 }])}>
              + Deck
            </button>
          </div>
          <label>
            Fonte
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex.: Limitless — Regional de Sacramento" />
          </label>
          <div className="row">
            <button className="primary" onClick={save}>
              Salvar meta
            </button>
          </div>
        </div>

        <div className="card stack">
          <h2>Colar do Limitless</h2>
          <p className="small muted">Uma linha por deck: nome e porcentagem. Substitui a tabela ao lado (depois é só salvar).</p>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Gardevoir ex 18,5%\nDragapult ex 14.2%\nCharizard ex 12%'} />
          <div className="row">
            <button onClick={importPaste} disabled={!parseMetaText(paste).length}>
              Usar {parseMetaText(paste).length || ''} linhas
            </button>
          </div>
        </div>
      </div>
      <Toast msg={toast} />
    </>
  );
}
