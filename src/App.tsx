import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SociosPage } from './pages/SociosPage';
import { CategoriasPage } from './pages/CategoriasPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/socios" replace />} />
          <Route path="/socios" element={<SociosPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

