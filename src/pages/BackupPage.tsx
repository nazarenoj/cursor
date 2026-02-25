import { useState } from 'react';
import { ListaBackups } from '../components/ListaBackups';
import { ConfiguracionBackup } from '../components/ConfiguracionBackup';
import './BackupPage.css';

export const BackupPage = () => {
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);

  return (
    <div className="backup-page">
      <div className="backup-header">
        <h1>Gestión de Backups</h1>
        <div className="backup-actions">
          <button
            onClick={() => setMostrarConfiguracion(!mostrarConfiguracion)}
            className={`btn-toggle ${mostrarConfiguracion ? 'active' : ''}`}
          >
            {mostrarConfiguracion ? '← Ver Backups' : '⚙️ Configuración'}
          </button>
        </div>
      </div>

      {mostrarConfiguracion ? (
        <ConfiguracionBackup onVolver={() => setMostrarConfiguracion(false)} />
      ) : (
        <ListaBackups onConfigurar={() => setMostrarConfiguracion(true)} />
      )}
    </div>
  );
};

