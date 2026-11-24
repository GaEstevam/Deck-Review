import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/session';
import Layout from './components/Layout';
import { isConfigured } from './firebase/config';
import { Cadastro, EsqueciSenha, Login, NaoConfigurado } from './pages/auth/AuthPages';
import Cartas from './pages/Cartas';
import Colecao from './pages/Colecao';
import Comparar from './pages/Comparar';
import Config from './pages/Config';
import Confrontos from './pages/Confrontos';
import DeckDetalhe from './pages/DeckDetalhe';
import Meta from './pages/Meta';
import MeusDecks from './pages/MeusDecks';
import Painel from './pages/Painel';
import RegistrarPartida from './pages/RegistrarPartida';
import Relatorio from './pages/Relatorio';
import { useStoreStatus } from './store/store';

function Carregando({ texto }: { texto: string }) {
  return (
    <div className="loading">
      <div>
        <div className="spinner" />
        {texto}
      </div>
    </div>
  );
}

/** Sem login: só as telas de entrada. Qualquer outro endereço volta para /login. */
function RotasPublicas() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="cadastro" element={<Cadastro />} />
      <Route path="esqueci-senha" element={<EsqueciSenha />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function DadosCarregando() {
  const s = useStoreStatus();
  if (s.phase === 'error') {
    return (
      <div className="card empty">
        <h2>Não foi possível carregar seus dados</h2>
        <p>{s.error}</p>
      </div>
    );
  }
  return <Carregando texto="Carregando seus dados…" />;
}

function RotasDoApp() {
  const s = useStoreStatus();
  const ready = s.phase === 'ready';
  return (
    <Routes>
      <Route element={<Layout />}>
        {!ready ? (
          <Route path="*" element={<DadosCarregando />} />
        ) : (
          <>
            <Route index element={<Painel />} />
            <Route path="registrar" element={<RegistrarPartida />} />
            <Route path="decks" element={<MeusDecks />} />
            <Route path="decks/:id" element={<DeckDetalhe />} />
            <Route path="colecao" element={<Colecao />} />
            <Route path="confrontos" element={<Confrontos />} />
            <Route path="cartas" element={<Cartas />} />
            <Route path="comparar" element={<Comparar />} />
            <Route path="relatorio" element={<Relatorio />} />
            <Route path="meta" element={<Meta />} />
            <Route path="config" element={<Config />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Route>
    </Routes>
  );
}

function Portao() {
  const { user, loading } = useAuth();
  if (loading) return <Carregando texto="Abrindo…" />;
  return user ? <RotasDoApp /> : <RotasPublicas />;
}

// HashRouter: funciona no GitHub Pages sem configuração de servidor.
export default function App() {
  if (!isConfigured) {
    return (
      <HashRouter>
        <NaoConfigurado />
      </HashRouter>
    );
  }
  return (
    <HashRouter>
      <AuthProvider>
        <Portao />
      </AuthProvider>
    </HashRouter>
  );
}
