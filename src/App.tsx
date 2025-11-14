import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { PrivateRoute } from './components/PrivateRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RedirectToFirstAllowed } from './components/RedirectToFirstAllowed';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { SociosPage } from './pages/SociosPage';
import { CategoriasPage } from './pages/CategoriasPage';
import { LiquidacionesPage } from './pages/LiquidacionesPage';
import { PagosPage } from './pages/PagosPage';
import { PagosListadoPage } from './pages/PagosListadoPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { TesoreriaPage } from './pages/TesoreriaPage';
import { SinPermisosPage } from './pages/SinPermisosPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Layout>
                  <Routes>
                    <Route path="/" element={<RedirectToFirstAllowed />} />
                    <Route
                      path="/socios"
                      element={
                        <ProtectedRoute permiso="socios">
                          <SociosPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/categorias"
                      element={
                        <ProtectedRoute permiso="categorias">
                          <CategoriasPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/liquidaciones"
                      element={
                        <ProtectedRoute permiso="liquidaciones">
                          <LiquidacionesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pagos"
                      element={
                        <ProtectedRoute permiso="pagos">
                          <PagosPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pagos/listado"
                      element={
                        <ProtectedRoute permiso="listado_pagos">
                          <PagosListadoPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/usuarios"
                      element={
                        <ProtectedRoute permiso="usuarios">
                          <UsuariosPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tesoreria"
                      element={
                        <ProtectedRoute permiso="listado_pagos">
                          <TesoreriaPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/sin-permisos" element={<SinPermisosPage />} />
                  </Routes>
                  </Layout>
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </PermissionsProvider>
    </AuthProvider>
  );
}

export default App;

