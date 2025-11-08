import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SociosPage } from './pages/SociosPage';
import { CategoriasPage } from './pages/CategoriasPage';
import { LiquidacionesPage } from './pages/LiquidacionesPage';
import { PagosPage } from './pages/PagosPage';
import { PagosListadoPage } from './pages/PagosListadoPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/socios" replace />} />
          <Route path="/socios" element={<SociosPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/liquidaciones" element={<LiquidacionesPage />} />
          <Route path="/pagos" element={<PagosPage />} />
          <Route path="/pagos/listado" element={<PagosListadoPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

