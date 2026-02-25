import { useState, useRef, useEffect } from 'react';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { apiService } from '../services/api';
import './ConfiguracionClubPage.css';

const getLogoFullUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const hostname = window.location.hostname;
  const apiBase = import.meta.env.VITE_API_URL || (hostname === 'localhost' || hostname === '127.0.0.1' ? 'http://localhost:4000/api' : window.location.origin + '/api');
  return apiBase.replace(/\/api$/, '') + url;
};

export const ConfiguracionClubPage = () => {
  const { nombreClub, logoUrl, colorPrimario, loading, refreshConfig } = useClubConfig();
  const [nombre, setNombre] = useState(nombreClub);
  const [color, setColor] = useState(colorPrimario);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNombre(nombreClub);
    setColor(colorPrimario);
    if (!logoFile) setLogoPreview(getLogoFullUrl(logoUrl));
  }, [nombreClub, logoUrl, colorPrimario, logoFile]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoFile(null);
      setLogoPreview(getLogoFullUrl(logoUrl));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setGuardando(true);
    try {
      await apiService.updateClubConfig({
        nombreClub: nombre.trim() || nombreClub,
        colorPrimario: color,
        logo: logoFile ?? undefined,
      });
      await refreshConfig();
      setLogoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMensaje({ tipo: 'ok', texto: 'Configuración guardada correctamente.' });
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al guardar.',
      });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="configuracion-club-page">
        <p>Cargando configuración…</p>
      </div>
    );
  }

  return (
    <div className="configuracion-club-page">
      <h1>Configuración del club</h1>
      <p className="configuracion-club-desc">
        Definí el nombre del club, el logo y el color predominante de la aplicación. Estos datos se usan en el encabezado, informes y mensajes.
      </p>

      <form onSubmit={handleSubmit} className="configuracion-club-form">
        <div className="form-group">
          <label htmlFor="nombreClub">Nombre del club</label>
          <input
            id="nombreClub"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Club Social Realico"
            maxLength={255}
          />
        </div>

        <div className="form-group">
          <label htmlFor="colorPrimario">Color predominante</label>
          <div className="color-input-row">
            <input
              id="colorPrimario"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="color-picker"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#667eea"
              className="color-text"
              maxLength={20}
            />
          </div>
          <small>Se usa en la barra de navegación y botones principales.</small>
        </div>

        <div className="form-group">
          <label>Logo del club</label>
          <div className="logo-upload-area">
            <div className="logo-preview">
              {logoPreview ? (
                <img src={logoPreview} alt="Vista previa del logo" />
              ) : (
                <span className="logo-placeholder">Sin logo</span>
              )}
            </div>
            <div className="logo-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.svg"
                onChange={handleLogoChange}
                className="file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
              >
                {logoUrl || logoFile ? 'Cambiar logo' : 'Subir logo'}
              </button>
            </div>
          </div>
          <small>Formatos: JPG, PNG, GIF, WEBP o SVG. Tamaño máximo recomendado: 2 MB.</small>
        </div>

        {mensaje && (
          <div className={`mensaje mensaje-${mensaje.tipo}`}>
            {mensaje.texto}
          </div>
        )}

        <button type="submit" className="btn-guardar" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </form>
    </div>
  );
};
