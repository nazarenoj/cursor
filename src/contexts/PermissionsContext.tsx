import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';
import type { Permiso } from '../types';

interface PermissionsContextType {
  permisos: Permiso[];
  loading: boolean;
  tienePermiso: (codigo: string) => boolean;
  esAdmin: boolean;
  recargarPermisos: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [esAdmin, setEsAdmin] = useState(false);

  const cargarPermisos = async () => {
    if (!user) {
      setPermisos([]);
      setEsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const esAdminUser = user.usuario === 'admin';
      console.log('cargarPermisos - Iniciando para usuario:', user.usuario, 'ID:', user.id, 'esAdmin:', esAdminUser);
      
      // Si es admin, establecer estado inmediatamente y no cargar permisos
      if (esAdminUser) {
        // Establecer todos los estados de una vez para evitar problemas de timing
        setEsAdmin(true);
        setPermisos([]); // Admin no necesita permisos explícitos
        setLoading(false);
        console.log('Usuario admin detectado - Permisos completos - esAdmin:', true, 'Usuario:', user.usuario);
        return;
      }

      // Para usuarios no admin, cargar sus permisos
      console.log('Cargando permisos para usuario no admin:', user.usuario, 'ID:', user.id);
      setEsAdmin(false); // Asegurar que no es admin
      const permisosData = await apiService.getPermisosUsuario(user.id);
      console.log('Permisos cargados para usuario:', user.usuario, 'Cantidad:', permisosData?.length || 0);
      if (permisosData && permisosData.length > 0) {
        console.log('Permisos:', permisosData.map(p => p.codigo).join(', '));
      } else {
        console.log('Usuario sin permisos asignados:', user.usuario);
      }
      setPermisos(permisosData || []);
    } catch (err) {
      console.error('Error al cargar permisos:', err);
      // En caso de error, asumir que no es admin y no tiene permisos
      setEsAdmin(false);
      setPermisos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPermisos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.usuario]);

  const tienePermiso = (codigo: string): boolean => {
    if (esAdmin) return true;
    
    // Verificar permiso exacto
    if (permisos.some((p) => p.codigo === codigo)) {
      return true;
    }
    
    // Si el permiso tiene formato "modulo.accion", verificar también el permiso genérico "modulo"
    // Esto permite que un permiso genérico (ej: "socios") otorgue acceso a todos los permisos del módulo
    if (codigo.includes('.')) {
      const [modulo] = codigo.split('.');
      if (permisos.some((p) => p.codigo === modulo)) {
        return true;
      }
    }
    
    return false;
  };

  return (
    <PermissionsContext.Provider
      value={{
        permisos,
        loading,
        tienePermiso,
        esAdmin,
        recargarPermisos: cargarPermisos,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions debe usarse dentro de PermissionsProvider');
  }
  return context;
};

