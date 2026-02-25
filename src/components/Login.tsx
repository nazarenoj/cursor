import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import './Login.css';

const getLogoFullUrl = (url: string | null): string => {
  if (!url) return '/logo.svg';
  if (url.startsWith('http')) return url;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:4000${url}`;
  }
  const portPart = window.location.port ? `:${window.location.port}` : '';
  return `${protocol}//${hostname}${portPart}${url}`;
};

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<{
    nombreClub: string;
    logoUrl: string | null;
    colorPrimario: string;
  }>({ nombreClub: 'Club Social Realico', logoUrl: null, colorPrimario: '#667eea' });

  useEffect(() => {
    apiService
      .getClubConfigPublic()
      .then((data) =>
        setConfig({
          nombreClub: data.nombreClub ?? 'Club Social Realico',
          logoUrl: data.logoUrl ?? null,
          colorPrimario: data.colorPrimario ?? '#667eea',
        }),
      )
      .catch(() => {});
  }, []);

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

