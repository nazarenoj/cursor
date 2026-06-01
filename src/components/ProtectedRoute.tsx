import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { getFirstAllowedRoute } from '../utils/getFirstAllowedRoute';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permiso: string;
}

export const ProtectedRoute = ({ children, permiso }: ProtectedRouteProps) => {
  const { user } = useAuth();
  const { tienePermiso, loading, permisos, esAdmin } = usePermissions();
  const navigate = useNavigate();

  // Admin y jnazareno tienen acceso total; evita race con carga de permisos
  const tieneAccesoTotal = user?.usuario === 'admin' || user?.usuario === 'jnazareno';
  const permitido = tieneAccesoTotal || tienePermiso(permiso);

  useEffect(() => {
    if (!loading && !permitido) {
      // Redirigir a la primera página permitida
      const firstRoute = getFirstAllowedRoute(permisos, esAdmin || tieneAccesoTotal);
      
      if (firstRoute) {
        navigate(firstRoute, { replace: true });
      } else {
        if (!esAdmin && !tieneAccesoTotal) {
          navigate('/sin-permisos', { replace: true });
        } else {
          navigate('/socios', { replace: true });
        }
      }
    }
  }, [loading, permitido, permisos, esAdmin, tieneAccesoTotal, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Cargando...</div>
      </div>
    );
  }

  if (!permitido) {
    // Mientras redirige, mostrar mensaje
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Redirigiendo...</div>
      </div>
    );
  }

  return <>{children}</>;
};

