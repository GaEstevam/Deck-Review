import { NavLink, Outlet } from 'react-router-dom';
import { useSyncState } from '../store/sync';

const MAIN = [
  { to: '/', label: 'Painel', end: true },
  { to: '/registrar', label: 'Registrar partida' },
  { to: '/decks', label: 'Meus decks' },
  { to: '/colecao', label: 'Coleção' },
];
const ANALYSIS = [
  { to: '/confrontos', label: 'Confrontos' },
  { to: '/cartas', label: 'Cartas' },
  { to: '/comparar', label: 'Comparar' },
  { to: '/relatorio', label: 'Relatório da semana' },
];
const SETUP = [
  { to: '/meta', label: 'Meta' },
  { to: '/config', label: 'Configurações' },
];

function SyncBadge() {
  const s = useSyncState();
  if (s.phase === 'off') return <span className="tiny faint">Dados só neste aparelho</span>;
  const text =
    s.phase === 'syncing' ? s.message || 'Sincronizando…' : s.phase === 'error' ? `Erro: ${s.message}` : s.lastSync ? `Sincronizado ${s.lastSync}` : 'Nuvem ligada';
  return (
    <span className="tiny muted row" style={{ gap: 6 }} title={text}>
      <span className={`sync-dot ${s.phase}`} /> {s.phase === 'error' ? 'Erro na sincronização' : text}
    </span>
  );
}

function Links({ items }: { items: { to: string; label: string; end?: boolean }[] }) {
  return (
    <>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          {i.label}
        </NavLink>
      ))}
    </>
  );
}

export default function Layout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="./icon.svg" alt="" /> Deck Review
        </div>
        <Links items={MAIN} />
        <div className="nav-sep" />
        <Links items={ANALYSIS} />
        <div className="nav-sep" />
        <Links items={SETUP} />
        <div className="sidebar-foot">
          <SyncBadge />
        </div>
      </aside>

      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <img src="./icon.svg" alt="" /> Deck Review
          </div>
          <SyncBadge />
        </div>
        <nav className="tabs">
          <Links items={[...MAIN, ...ANALYSIS, ...SETUP]} />
        </nav>
      </header>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
