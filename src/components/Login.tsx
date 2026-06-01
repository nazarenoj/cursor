import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { APP_VERSION } from '../version';
import './Login.css';

const CLUB_CONFIG_CACHE_KEY = 'club-config-cache-v1';

const getLogoFullUrl = (url: string | null): string => {
  if (!url) return '/logo.svg';
  if (url.startsWith('http')) return url;
  const hostname = window.location.hostname;
  const apiBase =
    import.meta.env.PROD
      ? `${window.location.origin}/api`
      : import.meta.env.VITE_API_URL ||
        (hostname === 'localhost' || hostname === '127.0.0.1'
          ? 'http://localhost:4000/api'
          : `${window.location.origin}/api`);
  return apiBase.replace(/\/api$/, '') + url;
};

const persistCachedConfig = (config: {
  nombreClub: string;
  logoUrl: string | null;
  colorPrimario: string;
  timezone: string;
  appVersion?: string;
}) => {
  try {
    localStorage.setItem(CLUB_CONFIG_CACHE_KEY, JSON.stringify(config));
  } catch {
    // Ignorar si localStorage no está disponible
  }
};

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const [config, setConfig] = useState<{
    nombreClub: string;
    logoUrl: string | null;
    colorPrimario: string;
    timezone: string;
    appVersion?: string;
  } | null>(null);

  const cargarConfigPublica = async () => {
    setConfigLoading(true);
    setConfigError('');
    try {
      const data = await apiService.getClubConfigPublic();
      setConfig({
        nombreClub: data.nombreClub,
        logoUrl: data.logoUrl ?? null,
        colorPrimario: data.colorPrimario,
        timezone: data.timezone,
        appVersion: typeof data.appVersion === 'string' ? data.appVersion : undefined,
      });
      persistCachedConfig({
        nombreClub: data.nombreClub,
        logoUrl: data.logoUrl ?? null,
        colorPrimario: data.colorPrimario,
        timezone: data.timezone,
        appVersion: typeof data.appVersion === 'string' ? data.appVersion : undefined,
      });
    } catch (e) {
      setConfig(null);
      setConfigError('No se pudo cargar la configuración del club. Verificá la conexión e intentá nuevamente.');
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    cargarConfigPublica();
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (configLoading) {
    return (
      <div className="login-container login-state-container">
        <div className="login-card login-state-card">
          <p>Cargando datos del club...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="login-container login-state-container">
        <div className="login-card login-state-card">
          <p className="error-message">{configError}</p>
          <button type="button" className="btn-login" onClick={cargarConfigPublica}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(usuario, password);
      // Redirigir a la ruta raíz, que automáticamente redirigirá a la primera ruta permitida
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-container"
      style={{ ['--color-primary' as string]: config.colorPrimario }}
    >
      <div className="login-card">
        <div className="login-header">
          <img
            src={getLogoFullUrl(config.logoUrl)}
            alt={config.nombreClub}
            className="login-logo"
          />
          <h1>{config.nombreClub}</h1>
          <p>Sistema de Gestión de Socios</p>
          <div className="login-version">
            Versión v{config.appVersion ?? APP_VERSION}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="usuario">Usuario</label>
            <input
              type="text"
              id="usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

