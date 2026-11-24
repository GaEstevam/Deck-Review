import { useRef } from 'react';
import { useAuth } from '../auth/session';
import { PageHead, Toast, useToast } from '../components/ui';
import { sair } from '../firebase/auth';
import { today } from '../lib/format';
import { setSettings } from '../store/actions';
import { markMigration, readLegacyData } from '../store/legacy';
import { emptyData, getData, normalizeData, replaceData, update, useData, useStoreStatus } from '../store/store';

function AccountCard() {
  const { user } = useAuth();
  const s = useStoreStatus();
  if (!user) return null;
  const providers = user.providerData.map((p) => (p.providerId === 'google.com' ? 'Google' : p.providerId === 'password' ? 'E-mail e senha' : p.providerId));
  return (
    <div className="card stack">
      <h2>Conta</h2>
      <div>
        <div style={{ fontWeight: 600 }}>{user.displayName || '—'}</div>
        <div className="small muted">{user.email}</div>
        <div className="tiny faint" style={{ marginTop: 4 }}>
          Entra com: {providers.join(', ')}
        </div>
      </div>
      <p className="small muted">
        Seus dados ficam no Cloud Firestore, na sua conta, e só você consegue lê-los. {s.saving > 0 ? 'Salvando…' : 'Tudo salvo.'}
      </p>
      <div className="row">
        <button onClick={() => void sair()}>Sair</button>
      </div>
    </div>
  );
}

function LegacyCard() {
  const { user } = useAuth();
  const [toast, showToast] = useToast();
  const legacy = readLegacyData();
  if (!legacy || !user) return null;
  return (
    <div className="card stack">
      <h2>Dados antigos deste aparelho</h2>
      <p className="small muted">
        Este navegador ainda guarda os dados da versão sem login ({legacy.decks.length} decks, {legacy.matches.length} partidas, {legacy.collection.length}{' '}
        cartas). Importar <b>substitui</b> o que está na sua conta.
      </p>
      <div className="row">
        <button
          onClick={() => {
            if (!confirm('Substituir os dados da sua conta pelos dados antigos deste aparelho?')) return;
            replaceData(legacy);
            markMigration(user.uid, 'importado');
            showToast('Dados importados');
          }}
        >
          Importar para minha conta
        </button>
      </div>
      <Toast msg={toast} />
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
      if (!confirm(`Substituir os dados da sua conta por este backup (${parsed.decks.length} decks, ${parsed.matches.length} partidas)?`)) return;
      replaceData(parsed);
      showToast('Backup importado');
    } catch {
      showToast('Arquivo inválido');
    }
  };

  return (
    <div className="card stack">
      <h2>Backup</h2>
      <p className="small muted">Baixe um arquivo com tudo (decks, versões, partidas, meta e coleção) ou restaure um backup na sua conta.</p>
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
            if (confirm('Apagar TODOS os seus dados (decks, partidas, meta e coleção)? Baixe um backup antes. Não dá para desfazer.')) {
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
        <AccountCard />
        <BackupCard />
        <LegacyCard />
      </div>
    </>
  );
}
