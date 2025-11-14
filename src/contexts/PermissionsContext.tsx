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
      setEsAdmin(esAdminUser);
      
      // Si es admin, no necesitamos cargar permisos (tiene todos)
      if (esAdminUser) {
        setPermisos([]); // Admin no necesita permisos explícitos
        setLoading(false);
        return;
      }

      const permisosData = await apiService.getPermisosUsuario(user.id);
      console.log('Permisos cargados para usuario:', user.usuario, permisosData);
      setPermisos(permisosData || []);
    } catch (err) {
      console.error('Error al cargar permisos:', err);
      setPermisos([]);
      setEsAdmin(false);
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
    return permisos.some((p) => p.codigo === codigo);
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

