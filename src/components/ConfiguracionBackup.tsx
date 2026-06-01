import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './ConfiguracionBackup.css';

interface BackupConfig {
  rutaBackup: string;
  frecuencia: 'horaria' | 'diaria' | 'semanal' | 'mensual';
  formatoBackup: 'auto' | 'zip_portable';
  rutaWinRAR: string;
  mantenerBackups: {
    horarios: number;
    diarios: number;
    semanales: number;
    mensuales: number;
  };
}

interface Herramientas {
  winrar: {
    disponible: boolean;
    ruta: string | null;
  };
  mysqldump: {
    disponible: boolean;
    comando: string | null;
  };
  compresion?: {
    disponible: boolean;
    metodo: string | null;
    extension: string | null;
    mensaje: string | null;
  };
}

interface ConfiguracionBackupProps {
  onVolver?: () => void;
}

export const ConfiguracionBackup = ({ onVolver }: ConfiguracionBackupProps) => {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [herramientas, setHerramientas] = useState<Herramientas | null>(null);
  const [roots, setRoots] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [canGoUp, setCanGoUp] = useState(false);
  const [subdirs, setSubdirs] = useState<string[]>([]);
  const [loadingExplorer, setLoadingExplorer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [servidorWindows, setServidorWindows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getBackupConfig();
      // Asegurar que frecuencia sea del tipo correcto
      const configData: BackupConfig = {
        ...data.config,
        frecuencia: data.config.frecuencia as 'horaria' | 'diaria' | 'semanal' | 'mensual',
        formatoBackup:
          data.config.formatoBackup === 'zip_portable' ? 'zip_portable' : 'auto',
      };
      setConfig(configData);
      setHerramientas(data.herramientas);
      setServidorWindows(Boolean(data.servidorWindows));
      await cargarExplorador(configData.rutaBackup);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const cargarExplorador = async (path?: string) => {
    try {
      setLoadingExplorer(true);
      const data = await apiService.getBackupExplorer(path);
      setRoots(data.roots || []);
      setCurrentPath(data.actual || '');
      setParentPath(data.padre || '');
      setCanGoUp(Boolean(data.puedeSubir));
      setSubdirs(data.subdirectorios || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar carpetas');
    } finally {
      setLoadingExplorer(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await apiService.updateBackupConfig(config);
      setSuccess('Configuración guardada exitosamente');
      
      // Recargar configuración para obtener valores actualizados
      await cargarConfiguracion();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof BackupConfig, value: BackupConfig[keyof BackupConfig]) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const handleMantenerBackupsChange = (tipo: keyof BackupConfig['mantenerBackups'], value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      mantenerBackups: {
        ...config.mantenerBackups,
        [tipo]: value,
      },
    });
  };

  if (loading) {
    return <div className="configuracion-backup">Cargando configuración...</div>;
  }

  if (!config || !herramientas) {
    return <div className="configuracion-backup">Error al cargar la configuración</div>;
  }

  return (
    <div className="configuracion-backup">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="config-section">
        <h2>Configuración General</h2>
        
        <div className="form-group">
          <label>Carpeta de Backups:</label>
          <div className="explorer-toolbar">
            <select
              className="form-select"
              value={roots.includes(currentPath) ? currentPath : ''}
              onChange={(e) => {
                if (e.target.value) cargarExplorador(e.target.value);
              }}
            >
              <option value="">Unidad</option>
              {roots.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-carpeta"
              onClick={() => canGoUp && cargarExplorador(parentPath)}
              disabled={!canGoUp || loadingExplorer}
            >
              Subir
            </button>
            <button
              type="button"
              className="btn-carpeta"
              onClick={() => currentPath && handleChange('rutaBackup', currentPath)}
              disabled={!currentPath}
            >
              Seleccionar actual
            </button>
          </div>
          <div className="ruta-actual">{currentPath || 'Sin carpeta seleccionada'}</div>
          <div className="carpetas-selector" role="listbox" aria-label="Explorador de carpetas">
            {loadingExplorer ? (
              <div className="carpeta-vacia">Cargando carpetas...</div>
            ) : subdirs.length === 0 ? (
              <div className="carpeta-vacia">No hay subcarpetas en esta ubicación.</div>
            ) : (
              subdirs.map((dir) => {
                const selected = config.rutaBackup === dir;
                const nombre = dir.split(/[\\/]/).filter(Boolean).pop() || dir;
                return (
                  <div key={dir} className={`carpeta-item ${selected ? 'selected' : ''}`}>
                    <button
                      type="button"
                      className="carpeta-open"
                      onClick={() => cargarExplorador(dir)}
                    >
                      {nombre}
                    </button>
                    <button
                      type="button"
                      className="carpeta-select"
                      onClick={() => handleChange('rutaBackup', dir)}
                    >
                      Seleccionar
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <small>Ruta seleccionada para guardar backups: {config.rutaBackup || '(ninguna)'}</small>
        </div>

        <div className="form-group">
          <label htmlFor="frecuencia">Frecuencia de Backup Automático:</label>
          <select
            id="frecuencia"
            value={config.frecuencia}
            onChange={(e) => handleChange('frecuencia', e.target.value)}
            className="form-select"
          >
            <option value="horaria">Horaria (cada hora)</option>
            <option value="diaria">Diaria (02:00 AM)</option>
            <option value="semanal">Semanal (Domingos 02:00 AM)</option>
            <option value="mensual">Mensual (Día 1, 02:00 AM)</option>
          </select>
          <small>Los backups automáticos se ejecutarán según esta frecuencia</small>
        </div>

        <div className="form-group">
          <label htmlFor="formatoBackup">Formato del archivo de backup:</label>
          <select
            id="formatoBackup"
            value={config.formatoBackup}
            onChange={(e) =>
              handleChange('formatoBackup', e.target.value as BackupConfig['formatoBackup'])
            }
            className="form-select"
          >
            <option value="auto">
              Automático: WinRAR en .rar si está instalado (Windows); si no, ZIP
            </option>
            <option value="zip_portable">
              ZIP portable: siempre .zip (recomendado para compartir entre Linux, Windows y Hostinger)
            </option>
          </select>
          <small>
            Los archivos .rar no se pueden restaurar en Linux sin WinRAR. Para intercambiar copias entre
            distintos sistemas usá ZIP portable.
          </small>
        </div>

        {servidorWindows && (
          <div className="form-group">
            <label htmlFor="rutaWinRAR">Ruta de WinRAR (solo Windows):</label>
            <input
              id="rutaWinRAR"
              type="text"
              value={config.rutaWinRAR}
              onChange={(e) => handleChange('rutaWinRAR', e.target.value)}
              placeholder="C:\Program Files\WinRAR\WinRAR.exe"
              className="form-input"
            />
            <small>
              Opcional: si WinRAR está instalado, los backups se guardan como .rar; si no, se usa ZIP con Node.js
              (válido en Linux/Hostinger sin WinRAR ni unzip).
            </small>
            {!herramientas.winrar.disponible && (
              <div className="alert alert-warning">
                WinRAR no encontrado: se usará compresión ZIP integrada (Node.js) si está disponible en el servidor.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="config-section">
        <h2>Retención de Backups</h2>
        <p className="section-description">
          Cantidad de backups a mantener según la frecuencia. Los backups más antiguos se eliminarán automáticamente.
        </p>

        <div className="mantener-backups-grid">
          <div className="form-group">
            <label htmlFor="mantenerHorarios">Backups Horarios:</label>
            <input
              id="mantenerHorarios"
              type="number"
              min="1"
              max="168"
              value={config.mantenerBackups.horarios}
              onChange={(e) => handleMantenerBackupsChange('horarios', parseInt(e.target.value))}
              className="form-input"
            />
            <small>Máximo: 168 (1 semana)</small>
          </div>

          <div className="form-group">
            <label htmlFor="mantenerDiarios">Backups Diarios:</label>
            <input
              id="mantenerDiarios"
              type="number"
              min="1"
              max="365"
              value={config.mantenerBackups.diarios}
              onChange={(e) => handleMantenerBackupsChange('diarios', parseInt(e.target.value))}
              className="form-input"
            />
            <small>Máximo: 365 (1 año)</small>
          </div>

          <div className="form-group">
            <label htmlFor="mantenerSemanales">Backups Semanales:</label>
            <input
              id="mantenerSemanales"
              type="number"
              min="1"
              max="52"
              value={config.mantenerBackups.semanales}
              onChange={(e) => handleMantenerBackupsChange('semanales', parseInt(e.target.value))}
              className="form-input"
            />
            <small>Máximo: 52 (1 año)</small>
          </div>

          <div className="form-group">
            <label htmlFor="mantenerMensuales">Backups Mensuales:</label>
            <input
              id="mantenerMensuales"
              type="number"
              min="1"
              max="60"
              value={config.mantenerBackups.mensuales}
              onChange={(e) => handleMantenerBackupsChange('mensuales', parseInt(e.target.value))}
              className="form-input"
            />
            <small>Máximo: 60 (5 años)</small>
          </div>
        </div>
      </div>

      <div className="config-section">
        <h2>Estado de Herramientas</h2>
        <div className="herramientas-status">
          <div
            className={`herramienta-item ${
              herramientas.winrar.disponible || herramientas.compresion?.disponible ? 'disponible' : 'no-disponible'
            }`}
          >
            <span className="herramienta-icon">
              {herramientas.winrar.disponible || herramientas.compresion?.disponible ? '✅' : '❌'}
            </span>
            <div>
              <strong>WinRAR / compresión de backups</strong>
              <p>
                {herramientas.winrar.disponible
                  ? `WinRAR: ${herramientas.winrar.ruta}`
                  : herramientas.compresion?.disponible
                    ? herramientas.compresion.metodo === 'node_zip'
                      ? 'Sin WinRAR: backups en .zip vía Node.js (archiver/unzipper; apto Hostinger/Linux)'
                      : `Compresión: ${herramientas.compresion.metodo} (${herramientas.compresion.extension})`
                    : 'Sin WinRAR ni método de compresión disponible'}
              </p>
            </div>
          </div>
          <div className={`herramienta-item ${herramientas.mysqldump.disponible ? 'disponible' : 'no-disponible'}`}>
            <span className="herramienta-icon">
              {herramientas.mysqldump.disponible ? '✅' : '❌'}
            </span>
            <div>
              <strong>MySQL Dump</strong>
              <p>{herramientas.mysqldump.disponible ? `Disponible: ${herramientas.mysqldump.comando}` : 'No encontrado'}</p>
            </div>
          </div>
          {herramientas.compresion && (
            <div className={`herramienta-item ${herramientas.compresion.disponible ? 'disponible' : 'no-disponible'}`}>
              <span className="herramienta-icon">
                {herramientas.compresion.disponible ? '✅' : '❌'}
              </span>
              <div>
                <strong>Compresión de backups</strong>
                <p>
                  {herramientas.compresion.disponible
                    ? `Método: ${herramientas.compresion.metodo === 'node_zip' ? 'Node.js (zip)' : herramientas.compresion.metodo} → archivos ${herramientas.compresion.extension}`
                    : herramientas.compresion.mensaje || 'Sin herramienta disponible'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="config-actions">
        <button onClick={handleSave} disabled={saving} className="btn-save">
          {saving ? 'Guardando...' : '💾 Guardar Configuración'}
        </button>
        {onVolver && (
          <button onClick={onVolver} className="btn-cancel">
            Volver
          </button>
        )}
      </div>
    </div>
  );
};

