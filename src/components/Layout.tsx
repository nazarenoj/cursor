import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { APP_VERSION } from '../version';
import './Layout.css';

const SIDEBAR_STORAGE_KEY = 'app-sidebar-open';

const getGroupForPath = (path: string): string | null => {
  if (path.startsWith('/socios') || path.startsWith('/categorias') || path.startsWith('/pagos')) return 'Secretaría';
  if (path.startsWith('/liquidaciones')) return null; // enlace único
  if (path.startsWith('/tesoreria') || path.startsWith('/cajas') || path.startsWith('/medios-pago')) return 'Tesorería';
  if (path.startsWith('/usuarios') || path.startsWith('/auditoria') || path.startsWith('/backup') || path.startsWith('/configuracion-club')) return 'Seguridad';
  return null;
};

const getLogoFullUrl = (url: string | null): string => {
  if (!url) return '/logo.svg';
  if (url.startsWith('http')) return url;
  const hostname = window.location.hostname;
  const apiBase =
    import.meta.env.PROD
      ? `${window.location.origin}/api`
      : import.meta.env.VITE_API_URL ||
        (hostname === 'localhost' || hostname === '127.0.0.1'
          ? 'http://localhost:4000/api'
          : window.location.origin + '/api');
  return apiBase.replace(/\/api$/, '') + url;
};

const IconMenu = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { nombreClub, logoUrl, colorPrimario, appVersion } = useClubConfig();
  const { tienePermiso } = usePermissions();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const initialExpanded = getGroupForPath(location.pathname);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    initialExpanded ? new Set([initialExpanded]) : new Set()
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
    } catch {}
  }, [sidebarOpen]);

  useEffect(() => {
    const group = getGroupForPath(location.pathname);
    if (group) {
      setExpandedGroups((prev) => (prev.has(group) ? prev : new Set([...prev, group])));
    }
  }, [location.pathname]);

  const toggleSidebar = () => setSidebarOpen((o) => !o);

  return (
    <div className={`layout ${sidebarOpen ? 'layout--sidebar-open' : ''}`} style={{ ['--color-primary' as string]: colorPrimario }}>
      {/* Barra superior: logo, título, usuario y botón menú */}
      <header className="topbar">
        <button
          type="button"
          className="topbar-toggle"
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
          aria-label={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
        >
          {sidebarOpen ? <IconChevronLeft /> : <IconMenu />}
        </button>
        <div className="topbar-left">
          <div className="topbar-logo">
            <img src={getLogoFullUrl(logoUrl)} alt={nombreClub} />
          </div>
          <h1 className="topbar-brand">{nombreClub}</h1>
        </div>
        <div className="topbar-right">
          <div className="user-block">
            <span className="user-info">Usuario: {user?.usuario}</span>
            <span className="app-version">v{appVersion ?? APP_VERSION}</span>
          </div>
          <button onClick={logout} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="layout-body">
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={toggleSidebar}
            onKeyDown={(e) => e.key === 'Escape' && toggleSidebar()}
            aria-hidden="true"
          />
        )}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} aria-label="Menú principal">
          <nav className="sidebar-nav">
            {/* Secretaría */}
            {(tienePermiso('socios.ver') || tienePermiso('categorias.ver') || tienePermiso('pagos.ver')) && (
              <div className="nav-group">
                <button
                  type="button"
                  className={`nav-group-title nav-group-toggle ${expandedGroups.has('Secretaría') ? 'expanded' : ''}`}
                  onClick={() => toggleGroup('Secretaría')}
                  aria-expanded={expandedGroups.has('Secretaría')}
                >
                  Secretaría
                  <span className="nav-group-chevron" aria-hidden>▼</span>
                </button>
                <ul className={`nav-group-items ${expandedGroups.has('Secretaría') ? 'expanded' : ''}`}>
                  {tienePermiso('socios.ver') && (
                    <li>
                      <Link to="/socios" className={location.pathname === '/socios' ? 'active' : ''}>
                        Socios
                      </Link>
                    </li>
                  )}
                  {tienePermiso('categorias.ver') && (
                    <li>
                      <Link to="/categorias" className={location.pathname === '/categorias' ? 'active' : ''}>
                        Categorías
                      </Link>
                    </li>
                  )}
                  {tienePermiso('pagos.ver') && (
                    <li>
                      <Link to="/pagos/listado" className={location.pathname === '/pagos/listado' ? 'active' : ''}>
                        Listado Cobros
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}
            {tienePermiso('liquidaciones.ver') && (
              <div className="nav-group">
                <Link to="/liquidaciones" className={`nav-link-single ${location.pathname === '/liquidaciones' ? 'active' : ''}`}>
                  Liquidaciones
                </Link>
              </div>
            )}
            {/* Tesorería */}
            {(tienePermiso('tesoreria.ver') || tienePermiso('cajas.ver') || tienePermiso('medios_pago.ver')) && (
              <div className="nav-group">
                <button
                  type="button"
                  className={`nav-group-title nav-group-toggle ${expandedGroups.has('Tesorería') ? 'expanded' : ''}`}
                  onClick={() => toggleGroup('Tesorería')}
                  aria-expanded={expandedGroups.has('Tesorería')}
                >
                  Tesorería
                  <span className="nav-group-chevron" aria-hidden>▼</span>
                </button>
                <ul className={`nav-group-items ${expandedGroups.has('Tesorería') ? 'expanded' : ''}`}>
                  {tienePermiso('tesoreria.ver') && (
                    <>
                      <li>
                        <Link
                          to="/tesoreria/cobros"
                          className={location.pathname.startsWith('/tesoreria/cobros') ? 'active' : ''}
                        >
                          Cobros por medio de pago
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/tesoreria/movimientos"
                          className={location.pathname.startsWith('/tesoreria/movimientos') ? 'active' : ''}
                        >
                          Movimientos de caja
                        </Link>
                      </li>
                    </>
                  )}
                  {tienePermiso('cajas.ver') && (
                    <li>
                      <Link
                        to="/cajas"
                        className={location.pathname.startsWith('/cajas') && !location.pathname.startsWith('/cajas/egresos') ? 'active' : ''}
                      >
                        Cajas/Cuentas
                      </Link>
                    </li>
                  )}
                  {tienePermiso('medios_pago.ver') && (
                    <li>
                      <Link to="/medios-pago" className={location.pathname === '/medios-pago' ? 'active' : ''}>
                        Medios de Pago
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}
            {/* Seguridad */}
            {(tienePermiso('usuarios.ver') || tienePermiso('backup.ver') || tienePermiso('auditoria.ver')) && (
              <div className="nav-group">
                <button
                  type="button"
                  className={`nav-group-title nav-group-toggle ${expandedGroups.has('Seguridad') ? 'expanded' : ''}`}
                  onClick={() => toggleGroup('Seguridad')}
                  aria-expanded={expandedGroups.has('Seguridad')}
                >
                  Seguridad
                  <span className="nav-group-chevron" aria-hidden>▼</span>
                </button>
                <ul className={`nav-group-items ${expandedGroups.has('Seguridad') ? 'expanded' : ''}`}>
                  {tienePermiso('usuarios.ver') && (
                    <li>
                      <Link to="/usuarios" className={location.pathname === '/usuarios' ? 'active' : ''}>
                        Usuarios
                      </Link>
                    </li>
                  )}
                  {tienePermiso('auditoria.ver') && (
                    <li>
                      <Link to="/auditoria" className={location.pathname === '/auditoria' ? 'active' : ''}>
                        Auditoría
                      </Link>
                    </li>
                  )}
                  {tienePermiso('backup.ver') && (
                    <li>
                      <Link to="/backup" className={location.pathname === '/backup' ? 'active' : ''}>
                        Backup
                      </Link>
                    </li>
                  )}
                  {tienePermiso('club.configurar') && (
                    <li>
                      <Link to="/configuracion-club" className={location.pathname === '/configuracion-club' ? 'active' : ''}>
                        Config. Club
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </nav>
        </aside>

        <main className={`main-content ${!sidebarOpen ? 'main-content--full' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};
