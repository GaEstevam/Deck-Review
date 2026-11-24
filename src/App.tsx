import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Painel from './pages/Painel';
import RegistrarPartida from './pages/RegistrarPartida';
import MeusDecks from './pages/MeusDecks';
import DeckDetalhe from './pages/DeckDetalhe';
import Colecao from './pages/Colecao';
import Confrontos from './pages/Confrontos';
import Cartas from './pages/Cartas';
import Comparar from './pages/Comparar';
import Relatorio from './pages/Relatorio';
import Meta from './pages/Meta';
import Config from './pages/Config';

// HashRouter: funciona no GitHub Pages sem configuração de servidor.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
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
        </Route>
      </Routes>
    </HashRouter>
  );
}
