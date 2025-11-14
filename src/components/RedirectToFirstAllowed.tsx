import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionsContext';
import { getFirstAllowedRoute } from '../utils/getFirstAllowedRoute';

export const RedirectToFirstAllowed = () => {
  const navigate = useNavigate();
  const { permisos, esAdmin, loading } = usePermissions();

  useEffect(() => {
    if (!loading) {
      const firstRoute = getFirstAllowedRoute(permisos, esAdmin);
      console.log('Redirigiendo a:', firstRoute, { permisos, esAdmin, loading });
      navigate(firstRoute, { replace: true });
    }
  }, [permisos, esAdmin, loading, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div>Redirigiendo...</div>
    </div>
  );
};

