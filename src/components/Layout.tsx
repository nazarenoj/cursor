import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

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
          <li>
            <Link
              to="/socios"
              className={location.pathname === '/socios' ? 'active' : ''}
            >
              Socios
            </Link>
          </li>
          <li>
            <Link
              to="/categorias"
              className={location.pathname === '/categorias' ? 'active' : ''}
            >
              Categorías
            </Link>
          </li>
          <li>
            <Link
              to="/liquidaciones"
              className={location.pathname === '/liquidaciones' ? 'active' : ''}
            >
              Liquidaciones
            </Link>
          </li>
          <li>
            <Link
              to="/pagos"
              className={location.pathname === '/pagos' ? 'active' : ''}
            >
              Pagos
            </Link>
          </li>
          <li>
            <Link
              to="/pagos/listado"
              className={location.pathname === '/pagos/listado' ? 'active' : ''}
            >
              Listado Pagos
            </Link>
          </li>
        </ul>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};


