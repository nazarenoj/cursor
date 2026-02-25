import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import { getFirstAllowedRoute } from '../utils/getFirstAllowedRoute';

export const RedirectToFirstAllowed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { permisos, esAdmin, loading } = usePermissions();
  const { user } = useAuth();
  const redirigidoRef = useRef(false);

  useEffect(() => {
    // Si ya estamos en /sin-permisos y tenemos permisos, no hacer nada más
    if (location.pathname === '/sin-permisos' && permisos.length > 0) {
      console.log('Ya estamos en /sin-permisos pero tenemos permisos, redirigiendo...');
      redirigidoRef.current = false; // Permitir nueva redirección
    }

    // Si ya redirigimos, no hacer nada más
    if (redirigidoRef.current && location.pathname !== '/') {
      return;
    }

    // Esperar a que termine de cargar los permisos
    if (loading) {
      console.log('RedirectToFirstAllowed: Esperando carga de permisos...');
      return;
    }

    // Verificar si es admin directamente por el usuario (fallback)
    const esAdminDirecto = user?.usuario === 'admin';
    console.log('RedirectToFirstAllowed: Estado actual:', { 
      esAdmin, 
      esAdminDirecto,
      usuario: user?.usuario,
      permisosCount: permisos.length, 
      loading,
      pathname: location.pathname
    });

    // Si es admin (por contexto o directamente), siempre redirigir a socios
    if (esAdmin || esAdminDirecto) {
      console.log('Admin detectado (esAdmin:', esAdmin, 'esAdminDirecto:', esAdminDirecto, ') - Redirigiendo a /socios');
      redirigidoRef.current = true;
      navigate('/socios', { replace: true });
      return;
    }

    // Si no es admin, verificar permisos
    const firstRoute = getFirstAllowedRoute(permisos, esAdmin);
    console.log('RedirectToFirstAllowed - Estado:', {
      firstRoute,
      permisosCount: permisos.length,
      permisos: permisos.map(p => p.codigo),
      esAdmin,
      loading,
      pathname: location.pathname
    });
    
    if (firstRoute) {
      // Si hay una ruta permitida, redirigir a ella
      console.log('Redirigiendo a ruta permitida:', firstRoute);
      redirigidoRef.current = true;
      navigate(firstRoute, { replace: true });
    } else {
      // Si no hay ruta permitida, verificar si realmente no tiene permisos
      // Solo redirigir a sin-permisos si loading es false Y permisos.length es 0
      // Esto asegura que los permisos se hayan cargado completamente
      if (permisos.length === 0 && !loading) {
        // Usuario sin permisos asignados (después de cargar)
        console.log('Usuario sin permisos (después de cargar) - Redirigiendo a /sin-permisos');
        redirigidoRef.current = true;
        navigate('/sin-permisos', { replace: true });
      } else if (permisos.length > 0) {
        // Usuario tiene permisos pero no coinciden con ninguna ruta conocida
        // Esto no debería pasar, pero como fallback, redirigir a la primera ruta
        console.warn('Usuario tiene permisos pero no coinciden con rutas:', permisos.map(p => p.codigo));
        // Intentar redirigir a socios como fallback (el backend validará)
        redirigidoRef.current = true;
        navigate('/socios', { replace: true });
      }
      // Si loading es true, no hacer nada (esperar a que termine)
    }
  }, [permisos, esAdmin, loading, navigate, user, location.pathname]);

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

