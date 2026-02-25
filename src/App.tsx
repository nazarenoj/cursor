import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ClubConfigProvider } from './contexts/ClubConfigContext';
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
import { BackupPage } from './pages/BackupPage';
import { TesoreriaPage } from './pages/TesoreriaPage';
import { SinPermisosPage } from './pages/SinPermisosPage';
import { ConfiguracionClubPage } from './pages/ConfiguracionClubPage';
import { ListaCajas } from './components/ListaCajas';
import { ListaMediosPago } from './components/ListaMediosPago';
import { RegistrarEgreso } from './components/RegistrarEgreso';
import { ListaAuditoria } from './components/ListaAuditoria';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <ClubConfigProvider>
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
        </BrowserRouter>
        </PermissionsProvider>
      </ClubConfigProvider>
    </AuthProvider>
  );
}

export default App;

