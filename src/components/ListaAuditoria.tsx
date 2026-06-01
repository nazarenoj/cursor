import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { SelectorColumnas } from './SelectorColumnas';
import type { Auditoria, AuditoriaFiltros } from '../types';
import { formatDateTimeES, parseDateTimeToEpochMs } from '../utils/clubDateTime';
import './ListaAuditoria.css';

const AUDITORIA_COLUMNS = [
  { id: 'fechaHora', label: 'Fecha/Hora' },
  { id: 'usuario', label: 'Usuario' },
  { id: 'modulo', label: 'Módulo' },
  { id: 'accion', label: 'Acción' },
  { id: 'descripcion', label: 'Descripción' },
  { id: 'ip', label: 'IP' },
  { id: 'resultado', label: 'Resultado' },
  { id: 'detalles', label: 'Detalles' },
];
const AUDITORIA_DEFAULT_VISIBLE = AUDITORIA_COLUMNS.map((c) => c.id);

export const ListaAuditoria = () => {
  const [registros, setRegistros] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paginacion, setPaginacion] = useState({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 0,
  });
  const [filtros, setFiltros] = useState<AuditoriaFiltros>({
    page: 1,
    limit: 50,
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] = useState<Auditoria | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);

  const handleOrdenar = (columna: string) => {
    if (ordenColumna && ordenColumna.columna === columna) {
      setOrdenColumna({ columna, direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const registrosOrdenados = [...registros].sort((a, b) => {
    if (!ordenColumna) return 0;
    const { columna, direccion } = ordenColumna;
    let comparacion = 0;
    switch (columna) {
      case 'fechaHora':
        comparacion =
          (parseDateTimeToEpochMs(a.createdAt) ?? 0) - (parseDateTimeToEpochMs(b.createdAt) ?? 0);
        break;
      case 'usuario':
        comparacion = (a.usuarioNombre || '').localeCompare(b.usuarioNombre || '');
        break;
      case 'modulo':
        comparacion = (a.modulo || '').localeCompare(b.modulo || '');
        break;
      case 'accion':
        comparacion = (a.accion || '').localeCompare(b.accion || '');
        break;
      case 'descripcion':
        comparacion = (a.descripcion || '').localeCompare(b.descripcion || '');
        break;
      case 'ip':
        comparacion = (a.ipAddress || '').localeCompare(b.ipAddress || '');
        break;
      case 'resultado':
        comparacion = (a.resultado || '').localeCompare(b.resultado || '');
        break;
      default:
        return 0;
    }
    return direccion === 'asc' ? comparacion : -comparacion;
  });

  const { visibleColumns, setVisibleColumns, toggleColumn, loading: loadingCols } = useColumnPreferences(
    'auditoria',
    AUDITORIA_DEFAULT_VISIBLE,
  );
  const visible = loadingCols ? AUDITORIA_DEFAULT_VISIBLE : visibleColumns;
  const isVisible = (id: string) => visible.includes(id);

  useEffect(() => {
    loadData();
  }, [filtros]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getAuditoria(filtros);
      setRegistros(data.registros);
      setPaginacion(data.paginacion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar auditoría');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (key: keyof AuditoriaFiltros, value: string | number | boolean | undefined) => {
    setFiltros((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
      page: 1, // Resetear a primera página al cambiar filtros
    }));
  };

  const handlePageChange = (nuevaPagina: number) => {
    setFiltros((prev) => ({ ...prev, page: nuevaPagina }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const limpiarFiltros = () => {
    setFiltros({ page: 1, limit: 50 });
  };

  const handleEliminarFiltrados = async () => {
    const filtrosEliminar: Record<string, string | number> = {};
    if (filtros.usuario_id) filtrosEliminar.usuario_id = filtros.usuario_id;
    if (filtros.modulo) filtrosEliminar.modulo = filtros.modulo;
    if (filtros.accion) filtrosEliminar.accion = filtros.accion;
    if (filtros.fecha_desde) filtrosEliminar.fecha_desde = filtros.fecha_desde;
    if (filtros.fecha_hasta) filtrosEliminar.fecha_hasta = filtros.fecha_hasta;
    if (filtros.resultado) filtrosEliminar.resultado = filtros.resultado;

    const tieneFiltros = Object.keys(filtrosEliminar).length > 0;
    const mensajeConfirmacion = tieneFiltros
      ? `Se descargará un archivo Excel con los registros antes de eliminarlos.\n\n` +
        `¿Continuar? Se eliminarán los registros que coincidan con los filtros actuales (aprox. ${paginacion.total} registro(s)).`
      : `Se descargará un archivo Excel con TODOS los registros antes de eliminarlos.\n\n` +
        `¿Continuar? Se eliminará TODA la auditoría (aprox. ${paginacion.total} registro(s)).`;

    if (!window.confirm(mensajeConfirmacion)) return;

    setEliminando(true);
    try {
      const { registros } = await apiService.getAuditoriaExportar(filtrosEliminar);
      if (registros.length > 0) {
        const visibleExport = visible.filter((id) => id !== 'acciones');
        const columnMap: Record<string, (r: Auditoria) => string | number> = {
          fechaHora: (r) => (r.createdAt ? formatDateTimeES(r.createdAt) : ''),
          usuario: (r) => r.usuarioNombre || '',
          modulo: (r) => r.modulo || '',
          accion: (r) => r.accion || '',
          descripcion: (r) => r.descripcion || '',
          ip: (r) => r.ipAddress || '',
          resultado: (r) => r.resultado || '',
          detalles: (r) => r.ruta || '',
        };
        const headers: Record<string, string> = {
          fechaHora: 'Fecha',
          usuario: 'Usuario',
          modulo: 'Módulo',
          accion: 'Acción',
          descripcion: 'Descripción',
          ip: 'IP',
          resultado: 'Resultado',
          detalles: 'Ruta',
        };
        const ids = visibleExport.length > 0 ? visibleExport : AUDITORIA_COLUMNS.map((c) => c.id);
        const data = registros.map((r) => {
          const row: Record<string, string | number> = {};
          ids.forEach((id) => {
            if (columnMap[id] && headers[id]) row[headers[id]] = columnMap[id](r);
          });
          return row;
        });
        if (data.length > 0 && Object.keys(data[0]).length > 0) {
          const { exportToExcel } = await import('../utils/exportExcel');
          exportToExcel(data, `Auditoria-backup-${new Date().toISOString().slice(0, 10)}`, 'Auditoría');
        }
      }
      const resultado = await apiService.eliminarAuditoria(filtrosEliminar);
      alert(resultado.message);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar registros');
    } finally {
      setEliminando(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    return formatDateTimeES(fecha);
  };

  if (loading) {
    return <div className="lista-auditoria">Cargando registros de auditoría...</div>;
  }

  return (
    <div className="lista-auditoria">
      <div className="lista-header">
        <h1>Auditoría del Sistema</h1>
        <div className="lista-actions">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="btn-filtros"
          >
            {mostrarFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </button>
          <button
            onClick={handleEliminarFiltrados}
            className="btn-eliminar"
            disabled={eliminando}
            title={
              filtros.usuario_id || filtros.modulo || filtros.accion || filtros.fecha_desde || filtros.fecha_hasta || filtros.resultado
                ? 'Eliminar registros que coincidan con los filtros actuales'
                : 'Eliminar TODA la auditoría (se descargará Excel antes)'
            }
          >
            {eliminando ? 'Eliminando...' : '🗑️ Eliminar Filtrados'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {mostrarFiltros && (
        <div className="filtros-auditoria">
          <div className="filtros-grid">
            <div className="filtro-item">
              <label>Módulo</label>
              <select
                value={filtros.modulo || ''}
                onChange={(e) => handleFiltroChange('modulo', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="Socios">Socios</option>
                <option value="Categorías">Categorías</option>
                <option value="Liquidaciones">Liquidaciones</option>
                <option value="Pagos">Pagos</option>
                <option value="Usuarios">Usuarios</option>
                <option value="Cajas">Cajas</option>
                <option value="Medios de Pago">Medios de Pago</option>
                <option value="Backup">Backup</option>
                <option value="Autenticación">Autenticación</option>
              </select>
            </div>

            <div className="filtro-item">
              <label>Acción</label>
              <select
                value={filtros.accion || ''}
                onChange={(e) => handleFiltroChange('accion', e.target.value)}
              >
                <option value="">Todas</option>
                <option value="Crear">Crear</option>
                <option value="Modificar">Modificar</option>
                <option value="Eliminar">Eliminar</option>
                <option value="Listar">Listar</option>
                <option value="Consultar">Consultar</option>
                <option value="Iniciar Sesión">Iniciar Sesión</option>
                <option value="Registrar Pago">Registrar Pago</option>
              </select>
            </div>

            <div className="filtro-item">
              <label>Resultado</label>
              <select
                value={filtros.resultado || ''}
                onChange={(e) => handleFiltroChange('resultado', e.target.value as 'exitoso' | 'error')}
              >
                <option value="">Todos</option>
                <option value="exitoso">Exitoso</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div className="filtro-item">
              <label>Fecha Desde</label>
              <input
                type="date"
                value={filtros.fecha_desde || ''}
                onChange={(e) => handleFiltroChange('fecha_desde', e.target.value)}
              />
            </div>

            <div className="filtro-item">
              <label>Fecha Hasta</label>
              <input
                type="date"
                value={filtros.fecha_hasta || ''}
                onChange={(e) => handleFiltroChange('fecha_hasta', e.target.value)}
              />
            </div>

            <div className="filtro-item">
              <label>Usuario ID</label>
              <input
                type="number"
                value={filtros.usuario_id || ''}
                onChange={(e) => handleFiltroChange('usuario_id', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="ID de usuario"
              />
            </div>
          </div>

          <div className="filtros-actions">
            <button onClick={limpiarFiltros} className="btn-limpiar">
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      <div className="lista-info">
        <p>
          Total de registros: {paginacion.total} | Página {paginacion.pagina} de{' '}
          {paginacion.totalPaginas}
        </p>
      </div>

      <div className="tabla-auditoria-container">
        <div className="tabla-acciones-superior">
          <SelectorColumnas
            columnas={AUDITORIA_COLUMNS}
            visibleIds={visible}
            onToggle={toggleColumn}
            onRestaurar={() => setVisibleColumns(AUDITORIA_DEFAULT_VISIBLE)}
            titulo="Columnas visibles"
          />
        </div>
        <div className="tabla-wrapper">
          <table className="tabla-auditoria">
          <thead>
            <tr>
              {isVisible('fechaHora') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('fechaHora')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Fecha/Hora
                  {ordenColumna?.columna === 'fechaHora' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('usuario') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('usuario')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Usuario
                  {ordenColumna?.columna === 'usuario' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('modulo') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('modulo')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Módulo
                  {ordenColumna?.columna === 'modulo' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('accion') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('accion')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Acción
                  {ordenColumna?.columna === 'accion' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('descripcion') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('descripcion')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Descripción
                  {ordenColumna?.columna === 'descripcion' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('ip') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('ip')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  IP
                  {ordenColumna?.columna === 'ip' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('resultado') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('resultado')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Resultado
                  {ordenColumna?.columna === 'resultado' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('detalles') && <th>Detalles</th>}
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr>
                <td colSpan={visible.length || 8} className="sin-datos">
                  No hay registros de auditoría.
                </td>
              </tr>
            ) : (
              registrosOrdenados.map((registro) => (
                <tr key={registro.id}>
                  {isVisible('fechaHora') && <td>{formatearFecha(registro.createdAt)}</td>}
                  {isVisible('usuario') && <td>{registro.usuarioNombre}</td>}
                  {isVisible('modulo') && <td>{registro.modulo}</td>}
                  {isVisible('accion') && <td>{registro.accion}</td>}
                  {isVisible('descripcion') && <td className="descripcion-cell">{registro.descripcion}</td>}
                  {isVisible('ip') && <td>{registro.ipAddress}</td>}
                  {isVisible('resultado') && (
                    <td>
                      <span
                        className={`badge ${
                          registro.resultado === 'exitoso' ? 'badge-exitoso' : 'badge-error'
                        }`}
                      >
                        {registro.resultado === 'exitoso' ? '✓' : '✗'}
                      </span>
                    </td>
                  )}
                  {isVisible('detalles') && (
                    <td>
                      <button
                        onClick={() => setRegistroSeleccionado(registro)}
                        className="btn-detalle"
                      >
                        Ver
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {paginacion.totalPaginas > 1 && (
        <div className="paginacion">
          <button
            onClick={() => handlePageChange(paginacion.pagina - 1)}
            disabled={paginacion.pagina === 1}
            className="btn-pagina"
          >
            Anterior
          </button>
          <span>
            Página {paginacion.pagina} de {paginacion.totalPaginas}
          </span>
          <button
            onClick={() => handlePageChange(paginacion.pagina + 1)}
            disabled={paginacion.pagina === paginacion.totalPaginas}
            className="btn-pagina"
          >
            Siguiente
          </button>
        </div>
      )}

      {registroSeleccionado && (
        <ModalDetalle
          registro={registroSeleccionado}
          onClose={() => setRegistroSeleccionado(null)}
        />
      )}
    </div>
  );
};

interface ModalDetalleProps {
  registro: Auditoria;
  onClose: () => void;
}

const ModalDetalle = ({ registro, onClose }: ModalDetalleProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalle de Auditoría</h2>
          <button onClick={onClose} className="btn-cerrar">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="detalle-item">
            <strong>ID:</strong> {registro.id}
          </div>
          <div className="detalle-item">
            <strong>Fecha/Hora:</strong> {formatDateTimeES(registro.createdAt)}
          </div>
          <div className="detalle-item">
            <strong>Usuario:</strong> {registro.usuarioNombre} {registro.usuarioId && `(ID: ${registro.usuarioId})`}
          </div>
          <div className="detalle-item">
            <strong>Módulo:</strong> {registro.modulo}
          </div>
          <div className="detalle-item">
            <strong>Acción:</strong> {registro.accion}
          </div>
          <div className="detalle-item">
            <strong>Descripción:</strong> {registro.descripcion}
          </div>
          <div className="detalle-item">
            <strong>Método HTTP:</strong> {registro.metodoHttp}
          </div>
          <div className="detalle-item">
            <strong>Ruta:</strong> {registro.ruta}
          </div>
          <div className="detalle-item">
            <strong>IP Address:</strong> {registro.ipAddress}
          </div>
          <div className="detalle-item">
            <strong>User Agent:</strong> {registro.userAgent}
          </div>
          <div className="detalle-item">
            <strong>Resultado:</strong>{' '}
            <span
              className={`badge ${
                registro.resultado === 'exitoso' ? 'badge-exitoso' : 'badge-error'
              }`}
            >
              {registro.resultado}
            </span>
          </div>
          {registro.mensajeError && (
            <div className="detalle-item error">
              <strong>Error:</strong> {registro.mensajeError}
            </div>
          )}
          {registro.datosAnteriores != null && (
            <div className="detalle-item">
              <strong>Datos Anteriores:</strong>
              <pre>{JSON.stringify(registro.datosAnteriores, null, 2)}</pre>
            </div>
          )}
          {registro.datosNuevos != null && (
            <div className="detalle-item">
              <strong>Datos Nuevos:</strong>
              <pre>{JSON.stringify(registro.datosNuevos, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-cerrar-modal">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

