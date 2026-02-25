import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { usePermissions } from '../contexts/PermissionsContext';
import './ListaBackups.css';

interface Backup {
  nombre: string;
  ruta: string;
  tamaño: number;
  fechaCreacion: string;
  fechaModificacion: string;
  valido?: boolean | null;
  razonInvalido?: string | null;
}

interface ListaBackupsProps {
  onConfigurar?: () => void;
}

export const ListaBackups = ({ }: ListaBackupsProps) => {
  const { tienePermiso } = usePermissions();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [restaurando, setRestaurando] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const puedeRestaurar = tienePermiso('backup.restaurar');
  const puedeEliminar = tienePermiso('backup.ejecutar');

  useEffect(() => {
    cargarBackups();
  }, []);

  const cargarBackups = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.listarBackups();
      setBackups(data.backups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los backups');
    } finally {
      setLoading(false);
    }
  };

  const handleEjecutarBackup = async () => {
    if (!window.confirm('¿Desea ejecutar un backup manual ahora?')) {
      return;
    }

    try {
      setEjecutando(true);
      setError(null);
      setSuccess(null);

      const resultado = await apiService.ejecutarBackup();
      
      if (resultado.resultado && resultado.resultado.exito) {
        setSuccess(`Backup creado exitosamente: ${resultado.resultado.nombre}`);
        await cargarBackups();
      } else if (resultado.resultado) {
        setError(`Backup completado con errores: ${resultado.resultado.errores?.join(', ') || 'Revisa los detalles'}`);
        await cargarBackups(); // Recargar para mostrar el backup aunque tenga errores
      } else {
        setError('Error desconocido al ejecutar el backup');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ejecutar el backup');
    } finally {
      setEjecutando(false);
    }
  };

  const handleRestaurar = async (backup: Backup) => {
    const confirmacion = window.prompt(
      `⚠️ ADVERTENCIA: Restaurar este backup reemplazará TODOS los datos actuales de la base de datos.\n\n` +
      `Este proceso NO se puede deshacer.\n\n` +
      `Para confirmar, escriba "RESTAURAR" (en mayúsculas):`
    );

    if (confirmacion !== 'RESTAURAR') {
      return;
    }

    try {
      setRestaurando(backup.nombre);
      setError(null);
      setSuccess(null);

      const respuesta = await apiService.restaurarBackup(backup.nombre);
      
      // Verificar si la respuesta indica éxito o error
      if (respuesta.resultado && respuesta.resultado.exito === false) {
        const errorMsg = respuesta.error || respuesta.message || 'Error desconocido al restaurar el backup';
        setError(errorMsg);
        setRestaurando(null);
      } else if (respuesta.resultado && respuesta.resultado.enProceso) {
        // La restauración se inició y está en proceso en segundo plano
        setSuccess(`Restauración iniciada. El proceso continuará en segundo plano. Verifica los logs del servidor para ver el resultado.`);
        setRestaurando(null);
        
        // Recargar después de un momento para que el usuario vea el mensaje
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else if (respuesta.resultado && respuesta.resultado.exito === true) {
        // Mostrar mensaje de éxito con información del método usado
        const metodoInfo = respuesta.resultado.metodoNombre 
          ? ` (Método usado: ${respuesta.resultado.metodoNombre})`
          : '';
        setSuccess(`Backup restaurado exitosamente${metodoInfo}`);
        setRestaurando(null);
        
        // Recargar después de un momento para que el usuario vea el mensaje
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        // Mensaje de éxito genérico (fallback)
        const metodoInfo = respuesta.resultado?.metodoNombre 
          ? ` (Método usado: ${respuesta.resultado.metodoNombre})`
          : '';
        setSuccess(`Backup restaurado exitosamente: ${backup.nombre}${metodoInfo}`);
        
        // Recargar después de un momento para que el usuario vea el mensaje
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restaurar el backup');
      setRestaurando(null);
    }
  };

  const handleEliminar = async (backup: Backup) => {
    const confirmacion = window.confirm(
      `⚠️ ADVERTENCIA: ¿Está seguro de que desea eliminar el backup "${backup.nombre}"?\n\n` +
      `Este proceso NO se puede deshacer.\n\n` +
      `El backup será eliminado permanentemente.`
    );

    if (!confirmacion) {
      return;
    }

    try {
      setEliminando(backup.nombre);
      setError(null);
      setSuccess(null);

      await apiService.eliminarBackup(backup.nombre);
      setSuccess(`Backup eliminado exitosamente: ${backup.nombre}`);
      
      // Recargar la lista de backups
      await cargarBackups();
      setEliminando(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el backup');
      setEliminando(null);
    }
  };

  const formatearTamaño = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatearFecha = (fecha: string): string => {
    try {
      const date = new Date(fecha);
      return date.toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fecha;
    }
  };

  if (loading) {
    return <div className="lista-backups">Cargando backups...</div>;
  }

  return (
    <div className="lista-backups">
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

      <div className="backups-header">
        <div className="backups-info">
          <h2>Backups Disponibles</h2>
          <p>Total: {backups.length} backup(s)</p>
        </div>
        <div className="backups-actions">
          <button
            onClick={handleEjecutarBackup}
            disabled={ejecutando}
            className="btn-ejecutar"
          >
            {ejecutando ? '⏳ Ejecutando...' : '💾 Ejecutar Backup Manual'}
          </button>
        </div>
      </div>

      {backups.length === 0 ? (
        <div className="sin-backups">
          <p>No hay backups disponibles.</p>
          <p>Ejecuta un backup manual para crear el primero.</p>
        </div>
      ) : (
        <div className="tabla-wrapper">
          <table className="tabla-backups">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Tamaño</th>
                <th>Fecha de Creación</th>
                <th>Última Modificación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.nombre} className={backup.valido === false ? 'backup-invalido' : ''}>
                  <td className="nombre-backup">{backup.nombre}</td>
                  <td>
                    {backup.valido === true && (
                      <span className="estado-valido" title="Backup válido">
                        ✅ Válido
                      </span>
                    )}
                    {backup.valido === false && (
                      <span className="estado-invalido" title={backup.razonInvalido || 'Backup inválido'}>
                        ⚠️ Inválido
                      </span>
                    )}
                    {backup.valido === null && (
                      <span className="estado-desconocido" title={backup.razonInvalido || 'No se pudo validar el backup. Verifique que WinRAR esté disponible.'}>
                        ❓ {backup.razonInvalido ? 'No validado' : 'Desconocido'}
                      </span>
                    )}
                  </td>
                  <td>{formatearTamaño(backup.tamaño)}</td>
                  <td>{formatearFecha(backup.fechaCreacion)}</td>
                  <td>{formatearFecha(backup.fechaModificacion)}</td>
                  <td>
                    <div className="acciones-backup">
                      {puedeRestaurar && (
                        <button
                          onClick={() => handleRestaurar(backup)}
                          disabled={restaurando === backup.nombre || eliminando === backup.nombre || backup.valido === false}
                          className="btn-restaurar"
                          title={backup.valido === false ? 'Este backup no es válido y no se puede restaurar' : 'Restaurar este backup'}
                        >
                          {restaurando === backup.nombre ? '⏳ Restaurando...' : '🔄 Restaurar'}
                        </button>
                      )}
                      {puedeEliminar && (
                        <button
                          onClick={() => handleEliminar(backup)}
                          disabled={restaurando === backup.nombre || eliminando === backup.nombre}
                          className="btn-eliminar"
                          title="Eliminar este backup"
                        >
                          {eliminando === backup.nombre ? '⏳ Eliminando...' : '🗑️ Eliminar'}
                        </button>
                      )}
                      {!puedeRestaurar && !puedeEliminar && (
                        <span className="sin-permiso" title="No tiene permisos para realizar acciones">
                          Sin permiso
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

