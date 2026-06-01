import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';
import type { ClubConfig } from '../types';
import { configureClubDateTime } from '../utils/clubDateTime';

const CLUB_CONFIG_CACHE_KEY = 'club-config-cache-v1';

const DEFAULT_CONFIG: ClubConfig = {
  nombreClub: 'Club Social Realico',
  logoUrl: null,
  colorPrimario: '#667eea',
  timezone: 'America/Argentina/Buenos_Aires',
  whatsappUsarServicio: true,
};

const normalizarWhatsappServicio = (v: unknown): boolean => {
  if (v === true || v === 1 || v === '1') return true;
  if (v === false || v === 0 || v === '0') return false;
  return true;
};

const readCachedConfig = (): ClubConfig | null => {
  try {
    const raw = localStorage.getItem(CLUB_CONFIG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClubConfig>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.nombreClub || !parsed.colorPrimario) return null;
    return {
      nombreClub: parsed.nombreClub,
      logoUrl: parsed.logoUrl ?? null,
      colorPrimario: parsed.colorPrimario,
      timezone: parsed.timezone ?? DEFAULT_CONFIG.timezone,
      whatsappUsarServicio: normalizarWhatsappServicio(parsed.whatsappUsarServicio),
      appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : undefined,
    };
  } catch {
    return null;
  }
};

const persistCachedConfig = (cfg: ClubConfig) => {
  try {
    localStorage.setItem(CLUB_CONFIG_CACHE_KEY, JSON.stringify(cfg));
  } catch {
    // Ignorar si no hay storage disponible
  }
};

interface ClubConfigContextType extends ClubConfig {
  loading: boolean;
  refreshConfig: () => Promise<void>;
}

const ClubConfigContext = createContext<ClubConfigContextType | undefined>(undefined);

export const ClubConfigProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<ClubConfig>(() => readCachedConfig() ?? DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const refreshConfig = useCallback(async () => {
    if (!user) {
      const cached = readCachedConfig();
      setConfig(cached ?? DEFAULT_CONFIG);
      setLoading(false);
      return;
    }
    try {
      const data = await apiService.getClubConfig();
      const nextConfig: ClubConfig = {
        nombreClub: data.nombreClub ?? DEFAULT_CONFIG.nombreClub,
        logoUrl: data.logoUrl ?? null,
        colorPrimario: data.colorPrimario ?? DEFAULT_CONFIG.colorPrimario,
        timezone: data.timezone ?? DEFAULT_CONFIG.timezone,
        whatsappUsarServicio: normalizarWhatsappServicio(
          data.whatsappUsarServicio ?? DEFAULT_CONFIG.whatsappUsarServicio,
        ),
        appVersion: typeof data.appVersion === 'string' ? data.appVersion : undefined,
      };
      setConfig(nextConfig);
      persistCachedConfig(nextConfig);
      configureClubDateTime(nextConfig.timezone);
    } catch {
      const fallback = readCachedConfig() ?? DEFAULT_CONFIG;
      setConfig(fallback);
      configureClubDateTime(fallback.timezone);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      const cached = readCachedConfig();
      const nextConfig = cached ?? DEFAULT_CONFIG;
      setConfig(nextConfig);
      configureClubDateTime(nextConfig.timezone);
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
