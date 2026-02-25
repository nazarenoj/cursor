import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionsContext';
import { getFirstAllowedRoute } from '../utils/getFirstAllowedRoute';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permiso: string;
}

export const ProtectedRoute = ({ children, permiso }: ProtectedRouteProps) => {
  const { tienePermiso, loading, permisos, esAdmin } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !tienePermiso(permiso)) {
      // Redirigir a la primera página permitida
      const firstRoute = getFirstAllowedRoute(permisos, esAdmin);
      console.log('ProtectedRoute: Sin permiso para', permiso, '- Redirigiendo a:', firstRoute, { tienePermiso: tienePermiso(permiso), permisos, esAdmin });
      
      if (firstRoute) {
        // Si hay una ruta permitida, redirigir a ella
        navigate(firstRoute, { replace: true });
      } else {
        // Si no hay ninguna ruta permitida, redirigir a sin-permisos
        // Pero nunca para admin (admin siempre tiene permisos)
        if (!esAdmin) {
          navigate('/sin-permisos', { replace: true });
        } else {
          // Fallback para admin (nunca debería llegar aquí)
          navigate('/socios', { replace: true });
        }
      }
    }
  }, [loading, tienePermiso, permiso, permisos, esAdmin, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Cargando...</div>
      </div>
    );
  }

  if (!tienePermiso(permiso)) {
    // Mientras redirige, mostrar mensaje
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Redirigiendo...</div>
      </div>
    );
  }

  return <>{children}</>;
};

