import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './ConfiguracionBackup.css';

interface BackupConfig {
  rutaBackup: string;
  frecuencia: 'horaria' | 'diaria' | 'semanal' | 'mensual';
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
}

interface ConfiguracionBackupProps {
  onVolver?: () => void;
}

export const ConfiguracionBackup = ({ onVolver }: ConfiguracionBackupProps) => {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [herramientas, setHerramientas] = useState<Herramientas | null>(null);
  const [loading, setLoading] = useState(true);
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
      };
      setConfig(configData);
      setHerramientas(data.herramientas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la configuración');
    } finally {
      setLoading(false);
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

  const handleChange = (field: keyof BackupConfig, value: any) => {
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
          <label htmlFor="rutaBackup">Ruta de Backup:</label>
          <input
            id="rutaBackup"
            type="text"
            value={config.rutaBackup}
            onChange={(e) => handleChange('rutaBackup', e.target.value)}
            placeholder="C:\Backups\SistemaGestionSocios"
            className="form-input"
          />
          <small>Ruta donde se guardarán los archivos de backup comprimidos</small>
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
          <label htmlFor="rutaWinRAR">Ruta de WinRAR:</label>
          <input
            id="rutaWinRAR"
            type="text"
            value={config.rutaWinRAR}
            onChange={(e) => handleChange('rutaWinRAR', e.target.value)}
            placeholder="C:\Program Files\WinRAR\WinRAR.exe"
            className="form-input"
          />
          <small>Ruta completa al ejecutable de WinRAR</small>
          {!herramientas.winrar.disponible && (
            <div className="alert alert-warning">
              ⚠️ WinRAR no encontrado en la ruta especificada
            </div>
          )}
        </div>
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
          <div className={`herramienta-item ${herramientas.winrar.disponible ? 'disponible' : 'no-disponible'}`}>
            <span className="herramienta-icon">
              {herramientas.winrar.disponible ? '✅' : '❌'}
            </span>
            <div>
              <strong>WinRAR</strong>
              <p>{herramientas.winrar.disponible ? `Disponible: ${herramientas.winrar.ruta}` : 'No encontrado'}</p>
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

