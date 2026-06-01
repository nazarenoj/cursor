import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import { getFirstAllowedRoute } from '../utils/getFirstAllowedRoute';
import './SinPermisosPage.css';

export const SinPermisosPage = () => {
  const navigate = useNavigate();
  const { permisos, esAdmin, loading } = usePermissions();
  const { user } = useAuth();

  // Si los permisos se cargan después de estar en esta página, redirigir
  useEffect(() => {
    if (loading) {
      return;
    }

    // Si es admin, redirigir a socios
    const esAdminDirecto = user?.usuario === 'admin' || user?.usuario === 'jnazareno';
    if (esAdmin || esAdminDirecto) {
      navigate('/socios', { replace: true });
      return;
    }

    // Si tiene permisos, redirigir a la primera ruta permitida
    if (permisos.length > 0) {
      const firstRoute = getFirstAllowedRoute(permisos, esAdmin);
      if (firstRoute) {
        console.log('SinPermisosPage: Permisos cargados, redirigiendo a:', firstRoute);
        navigate(firstRoute, { replace: true });
      }
    }
  }, [permisos, esAdmin, loading, navigate, user]);

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

