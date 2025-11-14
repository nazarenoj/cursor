import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { tienePermiso } = usePermissions();

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-left">
          <div className="navbar-logo">
            <img src="/logo.svg" alt="Club Social Realicó" />
          </div>
          <div className="navbar-brand">
            <h1>Club Social y Deportivo</h1>
          </div>
        </div>
        <ul className="navbar-nav">
          {tienePermiso('socios') && (
            <li>
              <Link
                to="/socios"
                className={location.pathname === '/socios' ? 'active' : ''}
              >
                Socios
              </Link>
            </li>
          )}
          {tienePermiso('categorias') && (
            <li>
              <Link
                to="/categorias"
                className={location.pathname === '/categorias' ? 'active' : ''}
              >
                Categorías
              </Link>
            </li>
          )}
          {tienePermiso('liquidaciones') && (
            <li>
              <Link
                to="/liquidaciones"
                className={location.pathname === '/liquidaciones' ? 'active' : ''}
              >
                Liquidaciones
              </Link>
            </li>
          )}
          {tienePermiso('pagos') && (
            <li>
              <Link
                to="/pagos"
                className={location.pathname === '/pagos' ? 'active' : ''}
              >
                Cobros
              </Link>
            </li>
          )}
          {tienePermiso('listado_pagos') && (
            <li>
              <Link
                to="/pagos/listado"
                className={location.pathname === '/pagos/listado' ? 'active' : ''}
              >
                Listado Cobros
              </Link>
            </li>
          )}
          {tienePermiso('listado_pagos') && (
            <li>
              <Link
                to="/tesoreria"
                className={location.pathname === '/tesoreria' ? 'active' : ''}
              >
                Tesorería
              </Link>
            </li>
          )}
          {tienePermiso('usuarios') && (
            <li>
              <Link
                to="/usuarios"
                className={location.pathname === '/usuarios' ? 'active' : ''}
              >
                Usuarios
              </Link>
            </li>
          )}
        </ul>
        <div className="navbar-right">
          <span className="user-info">Usuario: {user?.usuario}</span>
          <button onClick={logout} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};


