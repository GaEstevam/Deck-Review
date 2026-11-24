import { useState } from 'react';
import { useAuth } from '../auth/session';
import { markMigration, migrationHandled, readLegacyData } from '../store/legacy';
import { replaceData, useData } from '../store/store';

/**
 * Se este navegador tem dados da versão antiga (antes do login) e a conta ainda está vazia,
 * oferece levar tudo para o Firestore.
 */
export default function MigrationBanner() {
  const { user } = useAuth();
  const data = useData();
  const [hidden, setHidden] = useState(false);
  if (!user || hidden || migrationHandled(user.uid)) return null;
  const legacy = readLegacyData();
  if (!legacy) return null;
  const accountEmpty = !data.decks.length && !data.matches.length && !data.collection.length;
  if (!accountEmpty) return null;

  return (
    <div className="card" style={{ border: '2px solid var(--accent)', marginBottom: 16 }}>
      <div className="card-head" style={{ marginBottom: 6 }}>
        <h2>Encontramos dados salvos neste aparelho</h2>
      </div>
      <p className="small muted">
        {legacy.decks.length} decks, {legacy.versions.length} versões, {legacy.matches.length} partidas e {legacy.collection.length} cartas da coleção,
        guardados no navegador antes do login. Quer levar tudo para a sua conta?
      </p>
      <div className="row" style={{ marginTop: 14 }}>
        <button
          className="primary"
          onClick={() => {
            replaceData({ ...legacy, settings: { ...legacy.settings } });
            markMigration(user.uid, 'importado');
            setHidden(true);
          }}
        >
          Importar para minha conta
        </button>
        <button
          className="ghost"
          onClick={() => {
            markMigration(user.uid, 'ignorado');
            setHidden(true);
          }}
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
