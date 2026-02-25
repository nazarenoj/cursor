import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';
import type { ClubConfig } from '../types';

const DEFAULT_CONFIG: ClubConfig = {
  nombreClub: 'Club Social Realico',
  logoUrl: null,
  colorPrimario: '#667eea',
};

interface ClubConfigContextType extends ClubConfig {
  loading: boolean;
  refreshConfig: () => Promise<void>;
}

const ClubConfigContext = createContext<ClubConfigContextType | undefined>(undefined);

export const ClubConfigProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<ClubConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const refreshConfig = useCallback(async () => {
    if (!user) {
      setConfig(DEFAULT_CONFIG);
      setLoading(false);
      return;
    }
    try {
      const data = await apiService.getClubConfig();
      setConfig({
        nombreClub: data.nombreClub ?? DEFAULT_CONFIG.nombreClub,
        logoUrl: data.logoUrl ?? null,
        colorPrimario: data.colorPrimario ?? DEFAULT_CONFIG.colorPrimario,
      });
    } catch {
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setConfig(DEFAULT_CONFIG);
      setLoading(false);
      return;
    }
    setLoading(true);
    refreshConfig();
  }, [user, refreshConfig]);

  return (
    <ClubConfigContext.Provider
      value={{
        ...config,
        loading,
        refreshConfig,
      }}
    >
      {children}
    </ClubConfigContext.Provider>
  );
};

export const useClubConfig = () => {
  const ctx = useContext(ClubConfigContext);
  if (ctx === undefined) {
    throw new Error('useClubConfig debe usarse dentro de ClubConfigProvider');
  }
  return ctx;
};
