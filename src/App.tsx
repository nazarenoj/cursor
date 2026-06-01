import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ClubConfigProvider } from './contexts/ClubConfigContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { PrivateRoute } from './components/PrivateRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RedirectToFirstAllowed } from './components/RedirectToFirstAllowed';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

const SociosPage = lazy(() => import('./pages/SociosPage').then((m) => ({ default: m.SociosPage })));
const CategoriasPage = lazy(() => import('./pages/CategoriasPage').then((m) => ({ default: m.CategoriasPage })));
const LiquidacionesPage = lazy(() => import('./pages/LiquidacionesPage').then((m) => ({ default: m.LiquidacionesPage })));
const PagosPage = lazy(() => import('./pages/PagosPage').then((m) => ({ default: m.PagosPage })));
const PagosListadoPage = lazy(() => import('./pages/PagosListadoPage').then((m) => ({ default: m.PagosListadoPage })));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage').then((m) => ({ default: m.UsuariosPage })));
const BackupPage = lazy(() => import('./pages/BackupPage').then((m) => ({ default: m.BackupPage })));
const TesoreriaPage = lazy(() => import('./pages/TesoreriaPage').then((m) => ({ default: m.TesoreriaPage })));
const TesoreriaMovimientosPage = lazy(() => import('./pages/TesoreriaMovimientosPage').then((m) => ({ default: m.TesoreriaMovimientosPage })));
const SinPermisosPage = lazy(() => import('./pages/SinPermisosPage').then((m) => ({ default: m.SinPermisosPage })));
const ConfiguracionClubPage = lazy(() => import('./pages/ConfiguracionClubPage').then((m) => ({ default: m.ConfiguracionClubPage })));
const ListaCajas = lazy(() => import('./components/ListaCajas').then((m) => ({ default: m.ListaCajas })));
const ListaMediosPago = lazy(() => import('./components/ListaMediosPago').then((m) => ({ default: m.ListaMediosPago })));
const RegistrarEgreso = lazy(() => import('./components/RegistrarEgreso').then((m) => ({ default: m.RegistrarEgreso })));
const ListaAuditoria = lazy(() => import('./components/ListaAuditoria').then((m) => ({ default: m.ListaAuditoria })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ClubConfigProvider>
        <PermissionsProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<div className="app-loading">Cargando...</div>}>
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
                        <ProtectedRoute permiso="socios.ver">
                          <SociosPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/categorias"
                      element={
                        <ProtectedRoute permiso="categorias.ver">
                          <CategoriasPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/liquidaciones"
                      element={
                        <ProtectedRoute permiso="liquidaciones.ver">
                          <LiquidacionesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pagos"
                      element={
                        <ProtectedRoute permiso="pagos.registrar">
                          <PagosPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pagos/listado"
                      element={
                        <ProtectedRoute permiso="pagos.ver">
                          <PagosListadoPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/usuarios"
                      element={
                        <ProtectedRoute permiso="usuarios.ver">
                          <UsuariosPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/backup"
                      element={
                        <ProtectedRoute permiso="backup.ver">
                          <BackupPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tesoreria"
                      element={
                        <ProtectedRoute permiso="tesoreria.ver">
                          <TesoreriaPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tesoreria/cobros"
                      element={
                        <ProtectedRoute permiso="tesoreria.ver">
                          <TesoreriaPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tesoreria/movimientos"
                      element={
                        <ProtectedRoute permiso="cajas.ver">
                          <TesoreriaMovimientosPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/cajas"
                      element={
                        <ProtectedRoute permiso="cajas.ver">
                          <ListaCajas />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/cajas/egresos"
                      element={
                        <ProtectedRoute permiso="cajas.movimientos">
                          <RegistrarEgreso />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/medios-pago"
                      element={
                        <ProtectedRoute permiso="medios_pago.ver">
                          <ListaMediosPago />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/auditoria"
                      element={
                        <ProtectedRoute permiso="auditoria.ver">
                          <ListaAuditoria />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/sin-permisos" element={<SinPermisosPage />} />
                    <Route
                      path="/configuracion-club"
                      element={
                        <ProtectedRoute permiso="club.configurar">
                          <ConfiguracionClubPage />
                        </ProtectedRoute>
                      }
                    />
                    </Routes>
                    </Layout>
                  </PrivateRoute>
                }
              />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        </PermissionsProvider>
      </ClubConfigProvider>
    </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

