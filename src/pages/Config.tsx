import { useRef, useState } from 'react';
import { PageHead, Toast, useToast } from '../components/ui';
import { today } from '../lib/format';
import { setSettings } from '../store/actions';
import { emptyData, getData, normalizeData, replaceData, update, useData } from '../store/store';
import { connect, disconnect, getSyncConfig, syncNow, useSyncState } from '../store/sync';

function SyncCard() {
  const s = useSyncState();
  const cfg = getSyncConfig();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const doConnect = async () => {
    setBusy(true);
    setErr('');
    try {
      await connect(token);
      setToken('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack">
      <h2>Sincronizar entre aparelhos</h2>
      <p className="small muted">
        Os dados ficam neste navegador. Para usar no PC e no celular com os mesmos dados, ligue a sincronização: o app guarda tudo em um
        <b> Gist privado</b> na sua conta do GitHub. O token fica só neste aparelho.
      </p>
      {cfg ? (
        <>
          <div className={`notice ${s.phase === 'error' ? 'err' : 'ok'}`}>
            {s.phase === 'error' ? `Erro: ${s.message}` : s.phase === 'syncing' ? 'Sincronizando…' : `Ligada${s.lastSync ? ` · último envio às ${s.lastSync}` : ''}`}
          </div>
          <div className="row">
            <button onClick={() => void syncNow()}>Sincronizar agora</button>
            <button className="danger" onClick={() => confirm('Desligar a sincronização neste aparelho? Os dados locais continuam aqui.') && disconnect()}>
              Desligar
            </button>
          </div>
        </>
      ) : (
        <>
          <ol className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              No GitHub, abra{' '}
              <a href="https://github.com/settings/tokens/new?scopes=gist&description=Deck%20Review" target="_blank" rel="noreferrer">
                Settings → Developer settings → Tokens (classic)
              </a>{' '}
              e crie um token só com o escopo <b>gist</b>.
            </li>
            <li>Cole o token abaixo. No outro aparelho, cole o mesmo token — o app encontra os dados sozinho.</li>
            <li>Ao conectar, vale o lado com a alteração mais recente (nuvem ou este aparelho).</li>
          </ol>
          <label>
            Token do GitHub
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_…" autoComplete="off" />
          </label>
          {err && <div className="notice err">{err}</div>}
          <div className="row">
            <button className="primary" onClick={doConnect} disabled={busy || !token.trim()}>
              {busy ? 'Conectando…' : 'Conectar'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function BackupCard() {
  const [toast, showToast] = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck-review-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = normalizeData(JSON.parse(await file.text()));
      if (!confirm(`Substituir os dados atuais por este backup (${parsed.decks.length} decks, ${parsed.matches.length} partidas)?`)) return;
      replaceData({ ...parsed, updatedAt: new Date().toISOString() });
      showToast('Backup importado');
    } catch {
      showToast('Arquivo inválido');
    }
  };

  return (
    <div className="card stack">
      <h2>Backup</h2>
      <p className="small muted">Baixe um arquivo com tudo (decks, versões, partidas, meta e coleção) ou restaure um backup.</p>
      <div className="row">
        <button onClick={exportJson}>Baixar backup (.json)</button>
        <button onClick={() => fileRef.current?.click()}>Importar backup</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importJson(f);
            e.target.value = '';
          }}
        />
      </div>
      <div className="row">
        <button
          className="danger sm"
          onClick={() => {
            if (confirm('Apagar TODOS os dados deste app (decks, partidas, meta e coleção)? Baixe um backup antes. Não dá para desfazer.')) {
              update((d) => Object.assign(d, { ...emptyData(), settings: d.settings }));
            }
          }}
        >
          Apagar todos os dados
        </button>
      </div>
      <Toast msg={toast} />
    </div>
  );
}

export default function Config() {
  const data = useData();
  const s = data.settings;
  return (
    <>
      <PageHead title="Configurações" />
      <div className="grid grid-2">
        <div className="card stack">
          <h2>Evento alvo</h2>
          <label>
            Nome
            <input value={s.eventName} onChange={(e) => setSettings({ eventName: e.target.value })} />
          </label>
          <label>
            Data
            <input type="date" value={s.eventDate} onChange={(e) => e.target.value && setSettings({ eventDate: e.target.value })} />
          </label>
        </div>
        <SyncCard />
        <BackupCard />
      </div>
    </>
  );
}
