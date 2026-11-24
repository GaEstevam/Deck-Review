import type { CardEntry } from '../types';
import type { OwnershipReport } from '../lib/collection';
import { groupByType } from '../lib/decklist';

/** Lista de cartas agrupada por tipo; com `ownership`, mostra o que você tem da coleção. */
export default function DecklistView({ cards, ownership }: { cards: CardEntry[]; ownership?: OwnershipReport }) {
  const byCard = new Map(ownership?.lines.map((l) => [l.card, l]));
  return (
    <div className="decklist">
      {groupByType(cards).map((g) => (
        <div key={g.type}>
          <h3>
            {g.label} · {g.total}
          </h3>
          <ul>
            {g.cards.map((c, i) => {
              const own = byCard.get(c);
              return (
                <li key={`${c.name}-${c.set}-${c.number}-${i}`}>
                  <span className="qty">{c.qty}</span>
                  <span>
                    {c.name} {(c.set || c.number) && <span className="print">{[c.set, c.number].filter(Boolean).join(' ')}</span>}
                  </span>
                  {own && (
                    <span className="own">
                      {own.missing > 0 ? (
                        <span className="bad">falta {own.missing}</span>
                      ) : own.alt > 0 ? (
                        <span className="warn" title="Você tem esta carta em outra impressão">
                          ✓ outra impressão
                        </span>
                      ) : (
                        <span className="good">✓</span>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
