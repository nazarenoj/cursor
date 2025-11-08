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
        <div className="navbar-brand">
          <h1>Club Social y Deportivo</h1>
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
        </ul>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};


