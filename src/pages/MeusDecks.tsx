import Dropdown from '../components/Dropdown';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DecklistInput, { useParsedList } from '../components/DecklistInput';
import OwnershipSummary from '../components/OwnershipSummary';
import { PageHead, Rate, Seg } from '../components/ui';
import { checkDeck } from '../lib/collection';
import { STATUS_LABEL } from '../lib/labels';
import { record } from '../lib/stats';
import { createDeck } from '../store/actions';
import { useData } from '../store/store';
import type { DeckStatus } from '../types';

function NewDeckForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [list, setList] = useState('');
  const [status, setStatus] = useState<DeckStatus>('testando');
  const [error, setError] = useState('');
  const parsed = useParsedList(list);

  const save = () => {
    if (!name.trim()) return setError('Dê um nome ao deck.');
    if (!parsed.cards.length) return setError('Cole a lista de cartas.');
    const id = createDeck(name, parsed.cards, 'Lista inicial', status);
    onDone();
    navigate(`/decks/${id}`);
  };

  return (
    <div className="card stack">
      <h2>Novo deck</h2>
      <div className="field-row">
        <label>
          Nome do deck
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Dragapult" autoFocus />
        </label>
        <label>
          Situação
          <Dropdown<DeckStatus>
            block
            ariaLabel="Situação"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'testando', label: 'Testando' },
              { value: 'principal', label: 'Principal' },
            ]}
          />
        </label>
      </div>
      <label>
        Lista (cole do TCG Live: Exportar lista)
        <DecklistInput value={list} onChange={setList} />
      </label>
      {error && <div className="notice err">{error}</div>}
      <div className="row">
        <button className="primary" onClick={save}>
          Criar deck (v1)
        </button>
        <button className="ghost" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function MeusDecks() {
  const data = useData();
  const [creating, setCreating] = useState(data.decks.length === 0);
  const [filter, setFilter] = useState<'ativos' | 'arquivados'>('ativos');

  const decks = data.decks
    .filter((d) => (filter === 'ativos' ? d.status !== 'arquivado' : d.status === 'arquivado'))
    .sort((a, b) => Number(b.status === 'principal') - Number(a.status === 'principal') || a.name.localeCompare(b.name));

  return (
    <>
      <PageHead title="Meus decks" subtitle="Cada deck guarda suas versões; cada mudança de carta vira uma versão nova.">
        <Seg
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ativos', label: 'Ativos' },
            { value: 'arquivados', label: 'Arquivados' },
          ]}
        />
        {!creating && (
          <button className="primary" onClick={() => setCreating(true)}>
            + Novo deck
          </button>
        )}
      </PageHead>

      {creating && <NewDeckForm onDone={() => setCreating(false)} />}

      <div className="section grid grid-2">
        {decks.map((d) => {
          const versions = data.versions.filter((v) => v.deckId === d.id);
          const current = versions.find((v) => v.id === d.currentVersionId);
          const matches = data.matches.filter((m) => m.deckId === d.id);
          const curRec = record(matches.filter((m) => m.versionId === current?.id));
          const own = current ? checkDeck(current.cards, data.collection) : null;
          return (
            <Link key={d.id} to={`/decks/${d.id}`} className="card deck-tile">
              <div className="row between">
                <h2>{d.name}</h2>
                <span className={`badge ${d.status === 'principal' ? 'accent' : ''}`}>{STATUS_LABEL[d.status]}</span>
              </div>
              <p className="small muted" style={{ marginTop: 6 }}>
                {current ? `v${current.number} atual` : 'sem versão'} · {versions.length} versões · {matches.length} partidas
              </p>
              <p className="small" style={{ marginTop: 8 }}>
                Versão atual: <Rate rec={curRec} />
              </p>
              {own && (
                <div style={{ marginTop: 10 }}>
                  <OwnershipSummary report={own} hasCollection={data.collection.length > 0} link={false} />
                </div>
              )}
            </Link>
          );
        })}
      </div>
      {!creating && decks.length === 0 && (
        <p className="muted section">{filter === 'ativos' ? 'Nenhum deck ativo.' : 'Nenhum deck arquivado.'}</p>
      )}
    </>
  );
}
