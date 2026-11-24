import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/session';
import { sair } from '../firebase/auth';
import { useStoreStatus } from '../store/store';

const MAIN = [
  { to: '/', label: 'Painel', end: true },
  { to: '/decks', label: 'Meus decks' },
  { to: '/colecao', label: 'Coleção' },
  { to: '/meta', label: 'Meta' },
];
const ANALYSIS = [
  { to: '/confrontos', label: 'Confrontos' },
  { to: '/cartas', label: 'Cartas' },
  { to: '/comparar', label: 'Comparar' },
  { to: '/relatorio', label: 'Relatório da semana' },
];

function Pills({ items }: { items: { to: string; label: string; end?: boolean }[] }) {
  return (
    <>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `pill${isActive ? ' active' : ''}`}>
          {i.label}
        </NavLink>
      ))}
    </>
  );
}

export function Notch() {
  return (
    <Link to="/" className="notch" aria-label="Deck Review — Painel">
      <img src="./icon.svg" alt="" />
      Deck Review
    </Link>
  );
}

function UserMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  if (!user) return null;
  const name = user.displayName || user.email?.split('@')[0] || 'Treinador';
  return (
    <div className="menu" ref={ref}>
      <button className="user-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <span className="avatar">{user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : name[0].toUpperCase()}</span>
        <span className="user-name">{name}</span>
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          <div className="who">
            <div style={{ fontWeight: 600 }}>{name}</div>
            <div className="tiny muted">{user.email}</div>
          </div>
          <Link to="/config">Configurações</Link>
          <button onClick={() => void sair()}>Sair</button>
        </div>
      )}
    </div>
  );
}

function SaveStatus() {
  const s = useStoreStatus();
  if (s.error) return <div className="status-bar"><div className="notice err">{s.error}</div></div>;
  return null;
}

export default function Layout() {
  return (
    <div className="frame">
      <header className="hdr">
        <div className="hdr-left">
          <Pills items={MAIN} />
        </div>
        <Notch />
        <div className="hdr-right">
          <UserMenu />
          <Link className="cta" to="/registrar">
            Registrar partida <span className="cta-ic">↗</span>
          </Link>
        </div>
      </header>
      <nav className="subnav" aria-label="Seções">
        <span className="subnav-label">Análises</span>
        <span className="hdr-mobile-only" style={{ gap: 8 }}>
          <Pills items={MAIN} />
        </span>
        <Pills items={ANALYSIS} />
      </nav>
      <SaveStatus />
      <main className="main">
        <Outlet />
      </main>
      <Link className="cta fab" to="/registrar">
        Registrar <span className="cta-ic">+</span>
      </Link>
    </div>
  );
}
