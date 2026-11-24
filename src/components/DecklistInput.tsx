import { useMemo } from 'react';
import { parseDecklist } from '../lib/decklist';

/** Caixa para colar a lista do TCG Live, com contagem e erros ao vivo. */
export function useParsedList(text: string) {
  return useMemo(() => parseDecklist(text), [text]);
}

export default function DecklistInput({
  value,
  onChange,
  expected = 60,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  expected?: number | null;
  placeholder?: string;
}) {
  const parsed = useParsedList(value);
  const ok = expected == null || parsed.total === expected;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <textarea
        rows={12}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Pokémon: 12\n4 Dreepy TWM 128\n...\nTrainer: 36\n4 Ultra Ball SVI 196\n...\nEnergy: 12\n...'}
        spellCheck={false}
      />
      {value.trim() && (
        <div className="row tiny">
          <span className={ok ? 'good' : 'warn'}>
            {parsed.total} cartas{expected != null && !ok ? ` (esperado ${expected})` : ''}
          </span>
          <span className="faint">· {parsed.cards.length} linhas</span>
        </div>
      )}
      {parsed.errors.length > 0 && (
        <div className="notice err">
          {parsed.errors.slice(0, 4).map((e) => (
            <div key={e}>{e}</div>
          ))}
          {parsed.errors.length > 4 && <div>… e mais {parsed.errors.length - 4}</div>}
        </div>
      )}
    </div>
  );
}

