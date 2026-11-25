import { useState } from 'react';
import { looksLikeBattleLog, parseBattleLog, type BattleLogInfo } from '../lib/battleLog';
import { setSettings } from '../store/actions';
import { useData } from '../store/store';

/**
 * Botão "Colar log" de um jogo: lê o Battle Log do TCG Live (área de transferência ou colado à mão),
 * descobre qual jogador é você e devolve as informações. O texto do log é descartado em seguida.
 */
export default function BattleLogImport({ onApply }: { onApply: (info: BattleLogInfo, me: string) => void }) {
  const data = useData();
  const [manual, setManual] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<BattleLogInfo | null>(null); // aguardando "qual é você?"

  const handle = (raw: string) => {
    const info = parseBattleLog(raw);
    if (!looksLikeBattleLog(info)) {
      setError('Isso não parece um Battle Log do TCG Live (não achei as linhas de mão inicial).');
      return;
    }
    setError('');
    setManual(false);
    setText('');
    const saved = data.settings.playerName.trim().toLowerCase();
    const me = info.players!.find((p) => p.toLowerCase() === saved);
    if (me) onApply(info, me);
    else setPending(info);
  };

  const fromClipboard = async () => {
    setError('');
    try {
      if (!navigator.clipboard?.readText) throw new Error('sem suporte');
      const t = await navigator.clipboard.readText();
      if (!t.trim()) throw new Error('vazio');
      handle(t);
    } catch {
      // permissão negada, navegador sem suporte ou área de transferência vazia: cola à mão
      setManual(true);
    }
  };

  const choose = (me: string) => {
    setSettings({ playerName: me });
    const info = pending!;
    setPending(null);
    onApply(info, me);
  };

  return (
    <>
      <button type="button" className="sm" onClick={fromClipboard} title="Ler o Battle Log copiado no TCG Live">
        Colar log
      </button>
      {(manual || error || pending) && (
        <div className="log-panel">
          {pending ? (
            <>
              <div className="small" style={{ marginBottom: 8 }}>
                Qual destes jogadores é você? <span className="faint">(fica salvo em Configurações)</span>
              </div>
              <div className="row">
                {pending.players!.map((p) => (
                  <button type="button" key={p} className="sm primary" onClick={() => choose(p)}>
                    {p}
                  </button>
                ))}
                <button type="button" className="sm ghost" onClick={() => setPending(null)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              {manual && (
                <>
                  <div className="small muted" style={{ marginBottom: 6 }}>
                    Não consegui ler a área de transferência. Cole o log aqui (Ctrl+V). O texto não é salvo.
                  </div>
                  <textarea
                    rows={3}
                    autoFocus
                    value={text}
                    placeholder="Preparação&#10;Fulano escolheu cara para a jogada inicial de moeda.&#10;…"
                    onChange={(e) => setText(e.target.value)}
                    onPaste={(e) => {
                      const t = e.clipboardData.getData('text');
                      if (t) {
                        e.preventDefault();
                        handle(t);
                      }
                    }}
                  />
                  <div className="row" style={{ marginTop: 8 }}>
                    <button type="button" className="sm primary" disabled={!text.trim()} onClick={() => handle(text)}>
                      Ler log
                    </button>
                    <button
                      type="button"
                      className="sm ghost"
                      onClick={() => {
                        setManual(false);
                        setText('');
                        setError('');
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
              {error && (
                <div className="notice err" style={{ marginTop: manual ? 8 : 0 }}>
                  {error}{' '}
                  {!manual && (
                    <button type="button" className="sm ghost" onClick={() => setError('')}>
                      Fechar
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
