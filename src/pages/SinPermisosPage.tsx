import { useNavigate } from 'react-router-dom';
import './SinPermisosPage.css';

export const SinPermisosPage = () => {
  const navigate = useNavigate();

  return (
    <div className="sin-permisos-page">
      <div className="sin-permisos-card">
        <h1>Sin Permisos</h1>
        <p>No tiene permisos asignados para acceder a ninguna funcionalidad del sistema.</p>
        <p>Por favor, contacte al administrador para que le asigne los permisos necesarios.</p>
        <button onClick={() => navigate('/login')} className="btn-volver">
          Volver al Login
        </button>
      </div>
    </div>
  );
};

