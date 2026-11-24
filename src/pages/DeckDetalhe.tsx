import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DecklistInput, { useParsedList } from '../components/DecklistInput';
import DecklistView from '../components/DecklistView';
import OwnershipSummary from '../components/OwnershipSummary';
import { PageHead, Rate, Toast, useToast } from '../components/ui';
import { checkDeck } from '../lib/collection';
import { diffCards, formatChanges, formatDecklist } from '../lib/decklist';
import { fmtDate } from '../lib/format';
import { record } from '../lib/stats';
import { addVersion, deleteDeck, deleteVersion, renameDeck, setCurrentVersion, setDeckStatus } from '../store/actions';
import { deckVersions } from '../store/selection';
import { useData } from '../store/store';
import type { DeckStatus, DeckVersion } from '../types';

function NewVersionForm({ deckId, base, onDone }: { deckId: string; base: DeckVersion | undefined; onDone: () => void }) {
  const [list, setList] = useState(base ? formatDecklist(base.cards) : '');
  const [reason, setReason] = useState('');
  const parsed = useParsedList(list);
  const changes = base ? diffCards(base.cards, parsed.cards) : [];

  const save = () => {
    if (!parsed.cards.length) return;
    addVersion(deckId, parsed.cards, reason);
    onDone();
  };

  return (
    <div className="card stack">
      <h2>Nova versão</h2>
      <p className="small muted">Edite a lista abaixo (ou cole a nova do TCG Live). As mudanças são calculadas sozinhas.</p>
      <DecklistInput value={list} onChange={setList} />
      {base && (
        <p className="small">
          Mudanças em relação à v{base.number}: <b>{formatChanges(changes)}</b>
        </p>
      )}
      <label>
        Motivo da mudança
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: Perdendo para Gardevoir no fim do jogo" />
      </label>
      <div className="row">
        <button className="primary" onClick={save} disabled={!parsed.cards.length || (base != null && changes.length === 0)}>
          Salvar como v{(base?.number ?? 0) + 1}
        </button>
        <button className="ghost" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function DeckDetalhe() {
  const { id } = useParams();
  const data = useData();
  const navigate = useNavigate();
  const [toast, showToast] = useToast();
  const [newVersion, setNewVersion] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const deck = data.decks.find((d) => d.id === id);

  if (!deck) {
    return (
      <div className="card empty">
        <h2>Deck não encontrado</h2>
        <Link to="/decks">Voltar para Meus decks</Link>
      </div>
    );
  }

  const versions = deckVersions(data, deck.id);
  const current = versions.find((v) => v.id === deck.currentVersionId);
  const latest = versions[0];
  const matches = data.matches.filter((m) => m.deckId === deck.id);
  const shown = versions.find((v) => v.id === (open ?? current?.id));

  const copy = async (v: DeckVersion) => {
    try {
      await navigator.clipboard.writeText(formatDecklist(v.cards));
      showToast('Lista copiada');
    } catch {
      showToast('Não foi possível copiar');
    }
  };

  return (
    <>
      <PageHead title={deck.name} subtitle={<Link to="/decks">← Meus decks</Link>}>
        <select className="inline-select" value={deck.status} onChange={(e) => setDeckStatus(deck.id, e.target.value as DeckStatus)} aria-label="Situação">
          <option value="testando">Testando</option>
          <option value="principal">Principal</option>
          <option value="arquivado">Arquivado</option>
        </select>
        <button
          onClick={() => {
            const n = prompt('Novo nome do deck', deck.name);
            if (n) renameDeck(deck.id, n);
          }}
        >
          Renomear
        </button>
        {!newVersion && (
          <button className="primary" onClick={() => setNewVersion(true)}>
            + Nova versão
          </button>
        )}
      </PageHead>

      {newVersion && <NewVersionForm deckId={deck.id} base={latest} onDone={() => setNewVersion(false)} />}

      <div className="card section">
        <div className="card-head">
          <h2>Versões</h2>
          <p>Deck inteiro: <Rate rec={record(matches)} /></p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Versão</th>
                <th>Data</th>
                <th>Mudanças</th>
                <th>Resultado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => {
                const prev = versions.find((x) => x.number < v.number);
                const rec = record(matches.filter((m) => m.versionId === v.id));
                return (
                  <tr key={v.id}>
                    <td>
                      <button className="ghost sm" onClick={() => setOpen(v.id)}>
                        <b>v{v.number}</b>
                      </button>
                      {v.id === deck.currentVersionId && <span className="badge accent">atual</span>}
                    </td>
                    <td className="num small">{fmtDate(v.date)}</td>
                    <td className="small">
                      {prev ? formatChanges(diffCards(prev.cards, v.cards)) : <span className="muted">lista inicial</span>}
                      {v.reason && <div className="tiny faint">{v.reason}</div>}
                    </td>
                    <td className="small">
                      <Rate rec={rec} />
                    </td>
                    <td className="r" style={{ whiteSpace: 'nowrap' }}>
                      {v.id !== deck.currentVersionId && (
                        <button className="sm" onClick={() => setCurrentVersion(deck.id, v.id)} title="Usar esta versão como atual">
                          Tornar atual
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {shown && (
        <div className="card section">
          <div className="card-head">
            <h2>
              Lista v{shown.number} <span className="muted small">· {fmtDate(shown.date)}</span>
            </h2>
            <div className="row">
              <OwnershipSummary report={checkDeck(shown.cards, data.collection)} hasCollection={data.collection.length > 0} />
              <button className="sm" onClick={() => copy(shown)}>
                Copiar lista
              </button>
              {versions.length > 1 && (
                <button
                  className="sm danger"
                  onClick={() => {
                    const n = matches.filter((m) => m.versionId === shown.id).length;
                    if (confirm(`Apagar v${shown.number}${n ? ` e as ${n} partidas registradas com ela` : ''}? Não dá para desfazer.`)) {
                      deleteVersion(shown.id);
                      setOpen(null);
                    }
                  }}
                >
                  Apagar versão
                </button>
              )}
            </div>
          </div>
          <DecklistView cards={shown.cards} ownership={data.collection.length ? checkDeck(shown.cards, data.collection) : undefined} />
        </div>
      )}

      <div className="section row">
        <button
          className="danger"
          onClick={() => {
            if (confirm(`Apagar o deck ${deck.name}, todas as versões e ${matches.length} partidas? Não dá para desfazer. (Para só tirar da frente, use "Arquivado".)`)) {
              deleteDeck(deck.id);
              navigate('/decks');
            }
          }}
        >
          Apagar deck
        </button>
      </div>
      <Toast msg={toast} />
    </>
  );
}
