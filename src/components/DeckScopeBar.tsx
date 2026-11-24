import { selectDeck, setScope } from '../store/actions';
import type { Selection } from '../store/selection';
import { Seg } from './ui';

/** Escolha do deck e do recorte (versão atual ou deck inteiro), compartilhada entre telas. */
export default function DeckScopeBar({ sel, showScope = true }: { sel: Selection; showScope?: boolean }) {
  const { data, deck, version } = sel;
  const decks = [...data.decks].sort((a, b) => Number(a.status === 'arquivado') - Number(b.status === 'arquivado') || a.name.localeCompare(b.name));
  if (!deck) return null;
  return (
    <div className="row">
      <select className="inline-select" value={deck.id} onChange={(e) => selectDeck(e.target.value)} aria-label="Deck">
        {decks.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
            {d.status === 'arquivado' ? ' (arquivado)' : ''}
          </option>
        ))}
      </select>
      {showScope && (
        <Seg
          value={sel.scope}
          onChange={setScope}
          options={[
            { value: 'versao', label: version ? `Versão atual (v${version.number})` : 'Versão atual' },
            { value: 'deck', label: 'Deck inteiro' },
          ]}
        />
      )}
    </div>
  );
}
