import Dropdown from '../components/Dropdown';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DecklistInput, { useParsedList } from '../components/DecklistInput';
import OwnershipSummary from '../components/OwnershipSummary';
import { PageHead, Seg, Toast, useToast } from '../components/ui';
import { checkDeck, collectionTotals } from '../lib/collection';
import { formatDecklist, normalize } from '../lib/decklist';
import { TYPE_LABEL, TYPE_ORDER } from '../lib/labels';
import { addToCollection, clearCollection, removeCollectionItem, updateCollectionItem } from '../store/actions';
import { deckVersions } from '../store/selection';
import { useData } from '../store/store';
import type { CardType } from '../types';

function BuildCheck() {
  const data = useData();
  const decks = data.decks.filter((d) => d.status !== 'arquivado');
  const [pick, setPick] = useState<string>(() => {
    const d = decks.find((x) => x.id === data.settings.selectedDeckId) ?? decks[0];
    return d?.currentVersionId ?? '';
  });
  const version = data.versions.find((v) => v.id === pick);
  const report = version ? checkDeck(version.cards, data.collection) : null;
  const missing = report?.lines.filter((l) => l.missing > 0) ?? [];
  const alt = report?.lines.filter((l) => l.alt > 0) ?? [];

  const copyMissing = async () => {
    const text = formatDecklist(missing.map((l) => ({ ...l.card, qty: l.missing })));
    await navigator.clipboard.writeText(text).catch(() => undefined);
  };

  if (!decks.length) {
    return (
      <div className="card">
        <h2>Posso montar?</h2>
        <p className="muted small" style={{ marginTop: 6 }}>
          Cadastre um deck em <Link to="/decks">Meus decks</Link> para conferir com a sua coleção.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Posso montar?</h2>
        <Dropdown
          ariaLabel="Versão para conferir"
          value={pick}
          onChange={setPick}
          options={decks.map((d) => ({
            label: d.name,
            options: deckVersions(data, d.id).map((v) => ({
              value: v.id,
              label: `${d.name} v${v.number}`,
              hint: v.id === d.currentVersionId ? 'atual' : undefined,
            })),
          }))}
        />
      </div>

      {report && (
        <>
          <OwnershipSummary report={report} hasCollection={data.collection.length > 0} link={false} />
          {missing.length > 0 && (
            <div className="section">
              <div className="row between">
                <h3>Faltam</h3>
                <button className="sm" onClick={copyMissing}>
                  Copiar lista do que falta
                </button>
              </div>
              <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {missing.map((l, i) => (
                  <li key={i}>
                    <b>{l.missing}×</b> {l.card.name} <span className="faint">{[l.card.set, l.card.number].filter(Boolean).join(' ')}</span>
                    <span className="faint"> — tem {l.needed - l.missing} de {l.needed}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {alt.length > 0 && (
            <div className="section">
              <h3>Em outra impressão</h3>
              <p className="tiny muted" style={{ margin: '4px 0 6px' }}>
                Treinadores e energias são iguais em qualquer impressão; para Pokémon, confira se é a mesma carta (ataques).
              </p>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {alt.map((l, i) => (
                  <li key={i}>
                    {l.alt}× {l.card.name} <span className="faint">({TYPE_LABEL[l.card.type]})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="section">
        <h3 style={{ marginBottom: 8 }}>Todos os decks ativos (versão atual)</h3>
        <div className="stack" style={{ gap: 6 }}>
          {decks.map((d) => {
            const v = data.versions.find((x) => x.id === d.currentVersionId);
            if (!v) return null;
            return (
              <div key={d.id} className="row between small">
                <span>
                  {d.name} v{v.number}
                </span>
                <OwnershipSummary report={checkDeck(v.cards, data.collection)} hasCollection={data.collection.length > 0} link={false} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AddCards() {
  const [toast, showToast] = useToast();
  const [mode, setMode] = useState<'colar' | 'uma'>('colar');
  const [text, setText] = useState('');
  const parsed = useParsedList(text);
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [set, setSet] = useState('');
  const [number, setNumber] = useState('');
  const [type, setType] = useState<CardType>('pokemon');

  const importText = () => {
    if (!parsed.cards.length) return;
    addToCollection(parsed.cards);
    showToast(`${parsed.total} cartas adicionadas`);
    setText('');
  };

  const addOne = () => {
    if (!name.trim() || qty < 1) return;
    addToCollection([{ name: name.trim(), qty, type, ...(set.trim() ? { set: set.trim().toUpperCase() } : {}), ...(number.trim() ? { number: number.trim() } : {}) }]);
    showToast(`${qty}× ${name.trim()} adicionada`);
    setName('');
    setQty(1);
    setNumber('');
  };

  return (
    <div className="card stack">
      <div className="card-head" style={{ marginBottom: 0 }}>
        <h2>Adicionar cartas</h2>
        <Seg
          value={mode}
          onChange={setMode}
          options={[
            { value: 'colar', label: 'Colar lista' },
            { value: 'uma', label: 'Uma carta' },
          ]}
        />
      </div>
      {mode === 'colar' ? (
        <>
          <p className="small muted">
            Mesmo formato do TCG Live (uma carta por linha: quantidade, nome, coleção, número). Cartas que você já tem são somadas.
          </p>
          <DecklistInput value={text} onChange={setText} expected={null} placeholder={'Pokémon:\n3 Dreepy TWM 128\nTrainer:\n4 Ultra Ball SVI 196\nEnergy:\n10 Basic {P} Energy SVE 5'} />
          <div className="row">
            <button className="primary" onClick={importText} disabled={!parsed.cards.length}>
              Adicionar {parsed.total || ''} cartas à coleção
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="field-row">
            <label style={{ gridColumn: 'span 2' }}>
              Nome
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ultra Ball" />
            </label>
            <label>
              Quantidade
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
            </label>
          </div>
          <div className="field-row">
            <label>
              Coleção (opcional)
              <input value={set} onChange={(e) => setSet(e.target.value)} placeholder="SVI" />
            </label>
            <label>
              Número (opcional)
              <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="196" />
            </label>
            <label>
              Tipo
              <Dropdown<CardType> block ariaLabel="Tipo" value={type} onChange={setType} options={TYPE_ORDER.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
            </label>
          </div>
          <div className="row">
            <button className="primary" onClick={addOne} disabled={!name.trim()}>
              Adicionar
            </button>
          </div>
        </>
      )}
      <Toast msg={toast} />
    </div>
  );
}

export default function Colecao() {
  const data = useData();
  const [q, setQ] = useState('');
  const [type, setType] = useState<CardType | 'todas'>('todas');
  const totals = collectionTotals(data.collection);

  const list = useMemo(() => {
    const nq = normalize(q);
    return data.collection
      .filter((c) => (type === 'todas' || c.type === type) && (!nq || normalize(`${c.name} ${c.set ?? ''} ${c.number ?? ''}`).includes(nq)))
      .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name));
  }, [data.collection, q, type]);

  const exportText = async () => {
    await navigator.clipboard.writeText(formatDecklist(data.collection)).catch(() => undefined);
  };

  return (
    <>
      <PageHead title="Coleção" subtitle={`Todas as cartas que você tem: ${totals.cards} cartas, ${totals.unique} diferentes.`}>
        {data.collection.length > 0 && <button onClick={exportText}>Copiar coleção</button>}
      </PageHead>

      <div className="grid grid-2">
        <BuildCheck />
        <AddCards />
      </div>

      <div className="card section">
        <div className="card-head">
          <h2>Minhas cartas</h2>
          <div className="row">
            <input style={{ width: 200 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" aria-label="Buscar carta" />
            <Dropdown<CardType | 'todas'>
              ariaLabel="Tipo"
              value={type}
              onChange={setType}
              options={[{ value: 'todas', label: 'Todos os tipos' }, ...TYPE_ORDER.map((t) => ({ value: t, label: TYPE_LABEL[t] }))]}
            />
          </div>
        </div>
        {list.length === 0 ? (
          <p className="muted small">{data.collection.length ? 'Nada encontrado.' : 'Nenhuma carta registrada ainda.'}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Carta</th>
                  <th>Impressão</th>
                  <th>Tipo</th>
                  <th className="r">Qtd.</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="small muted">{[c.set, c.number].filter(Boolean).join(' ') || '—'}</td>
                    <td className="small muted">{TYPE_LABEL[c.type]}</td>
                    <td className="r" style={{ whiteSpace: 'nowrap' }}>
                      <button className="ghost sm" onClick={() => updateCollectionItem(c.id, { qty: c.qty - 1 })} aria-label="Menos uma">
                        −
                      </button>
                      <span className="num" style={{ display: 'inline-block', minWidth: 22, textAlign: 'center' }}>
                        {c.qty}
                      </span>
                      <button className="ghost sm" onClick={() => updateCollectionItem(c.id, { qty: c.qty + 1 })} aria-label="Mais uma">
                        +
                      </button>
                    </td>
                    <td className="r">
                      <button className="ghost sm" title="Remover" onClick={() => confirm(`Remover ${c.name} da coleção?`) && removeCollectionItem(c.id)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.collection.length > 0 && (
          <div className="section">
            <button className="sm danger" onClick={() => confirm('Apagar toda a coleção? Não dá para desfazer.') && clearCollection()}>
              Apagar coleção inteira
            </button>
          </div>
        )}
      </div>
    </>
  );
}
