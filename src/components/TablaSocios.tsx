import { usePermissions } from '../contexts/PermissionsContext';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { SelectorColumnas } from './SelectorColumnas';
import type { Socio, Categoria } from '../types';
import './TablaSocios.css';

const SOCIOS_COLUMNS = [
  { id: 'numeroSocio', label: 'N° Socio' },
  { id: 'apellido', label: 'Apellido' },
  { id: 'nombre', label: 'Nombre' },
  { id: 'dni', label: 'DNI' },
  { id: 'telefono', label: 'Teléfono' },
  { id: 'email', label: 'Email' },
  { id: 'categoria', label: 'Categoría' },
  { id: 'estado', label: 'Estado' },
  { id: 'acciones', label: 'Acciones' },
];

const DEFAULT_VISIBLE = SOCIOS_COLUMNS.map((c) => c.id);

interface TablaSociosProps {
  socios: Socio[];
  categorias: Categoria[];
  onModificar: (socio: Socio) => void;
  onDarBaja?: (socio: Socio) => void;
  onDarAlta?: (socio: Socio) => void;
  onBorrar: (id: number) => void;
  onVerLiquidaciones: (socio: Socio) => void;
  onRegistrarPago: (socio: Socio) => void;
  onEnviarLiquidacionesWhatsApp?: (socio: Socio) => void;
  onExportPdf: () => void;
  /** Si se pasa, recibe las columnas visibles para exportar solo esas a Excel */
  onExportExcel?: (visibleColumnIds: string[]) => void;
  onAgregar?: () => void;
  ordenColumna?: { columna: string; direccion: 'asc' | 'desc' } | null;
  onOrdenar?: (columna: string) => void;
  filtroEstado?: boolean | undefined;
}

export const TablaSocios = ({
  socios,
  categorias,
  onModificar,
  onDarBaja,
  onDarAlta,
  onBorrar,
  onVerLiquidaciones,
  onRegistrarPago,
  onEnviarLiquidacionesWhatsApp,
  onExportPdf,
  onExportExcel,
  onAgregar,
  ordenColumna,
  onOrdenar,
  filtroEstado,
}: TablaSociosProps) => {
  const { tienePermiso } = usePermissions();
  const { visibleColumns, setVisibleColumns, toggleColumn, loading } = useColumnPreferences(
    'socios',
    DEFAULT_VISIBLE,
  );

  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find((c) => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const visible = loading ? DEFAULT_VISIBLE : visibleColumns;
  const isVisible = (id: string) => visible.includes(id);

  const accionesSuperior = (
    <div className="tabla-acciones-superior">
      <SelectorColumnas
        columnas={SOCIOS_COLUMNS}
        visibleIds={visible}
        onToggle={toggleColumn}
        onRestaurar={() => setVisibleColumns(DEFAULT_VISIBLE)}
        titulo="Columnas visibles"
      />
      {onAgregar && (
        <button className="btn-agregar" onClick={onAgregar}>
          + Agregar Socio
        </button>
      )}
      <button className="btn-exportar" onClick={onExportPdf} title="Exportar a PDF">
        📄 Exportar PDF
      </button>
      {onExportExcel && (
        <button className="btn-exportar btn-exportar-excel" onClick={() => onExportExcel(visible)} title="Exportar a Excel">
          📊 Exportar Excel
        </button>
      )}
    </div>
  );

  if (socios.length === 0) {
    return (
      <div className="tabla-socios-container">
        <div className="tabla-wrapper">
          {accionesSuperior}
          <div className="tabla-vacia">
            <p>No se encontraron socios con los filtros aplicados.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tabla-socios-container">
      <div className="tabla-wrapper">
        {accionesSuperior}
        <table className="tabla-socios">
          <thead>
            <tr>
              {isVisible('numeroSocio') && (
                <th
                  className={onOrdenar ? 'sortable' : ''}
                  onClick={() => onOrdenar?.('numeroSocio')}
                  style={onOrdenar ? { cursor: 'pointer', userSelect: 'none' } : {}}
                >
                  N° Socio
                  {ordenColumna?.columna === 'numeroSocio' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('apellido') && (
                <th
                  className={onOrdenar ? 'sortable' : ''}
                  onClick={() => onOrdenar?.('apellido')}
                  style={onOrdenar ? { cursor: 'pointer', userSelect: 'none' } : {}}
                >
                  Apellido
                  {ordenColumna?.columna === 'apellido' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('nombre') && (
                <th
                  className={`${onOrdenar ? 'sortable' : ''} columna-nombre`}
                  onClick={() => onOrdenar?.('nombre')}
                  style={onOrdenar ? { cursor: 'pointer', userSelect: 'none' } : {}}
                >
                  Nombre
                  {ordenColumna?.columna === 'nombre' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('dni') && (
                <th
                  className={onOrdenar ? 'sortable' : ''}
                  onClick={() => onOrdenar?.('dni')}
                  style={onOrdenar ? { cursor: 'pointer', userSelect: 'none' } : {}}
                >
                  DNI
                  {ordenColumna?.columna === 'dni' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('telefono') && (
                <th
                  className={onOrdenar ? 'sortable' : ''}
                  onClick={() => onOrdenar?.('telefono')}
                  style={onOrdenar ? { cursor: 'pointer', userSelect: 'none' } : {}}
                >
                  Teléfono
                  {ordenColumna?.columna === 'telefono' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('email') && (
                <th
                  className={onOrdenar ? 'sortable' : ''}
                  onClick={() => onOrdenar?.('email')}
                  style={onOrdenar ? { cursor: 'pointer', userSelect: 'none' } : {}}
                >
                  Email
                  {ordenColumna?.columna === 'email' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('categoria') && (
                <th
                  className={onOrdenar ? 'sortable' : ''}
                  onClick={() => onOrdenar?.('categoria')}
                  style={onOrdenar ? { cursor: 'pointer', userSelect: 'none' } : {}}
                >
                  Categoría
                  {ordenColumna?.columna === 'categoria' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('estado') && (
                <th
                  className={onOrdenar ? 'sortable filterable' : ''}
                  onClick={() => onOrdenar?.('estado')}
                  style={onOrdenar ? { cursor: 'pointer', userSelect: 'none' } : {}}
                  title="Clic para filtrar: Activos → Inactivos → Todos"
                >
                  Estado
                  {filtroEstado !== undefined && (
                    <span className="filter-indicator">
                      {filtroEstado === true ? ' (Activos)' : ' (Inactivos)'}
                    </span>
                  )}
                  {filtroEstado === undefined && (
                    <span className="filter-indicator"> (Todos)</span>
                  )}
                </th>
              )}
              {isVisible('acciones') && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {socios.map((socio) => (
              <tr key={socio.id} className={socio.fechaBaja ? 'inactivo' : ''}>
                {isVisible('numeroSocio') && <td>{socio.numeroSocio}</td>}
                {isVisible('apellido') && <td>{socio.apellido}</td>}
                {isVisible('nombre') && <td className="columna-nombre">{socio.nombre}</td>}
                {isVisible('dni') && <td>{socio.dni ?? '-'}</td>}
                {isVisible('telefono') && <td>{socio.telefono || '-'}</td>}
                {isVisible('email') && <td>{socio.email || '-'}</td>}
                {isVisible('categoria') && <td>{getCategoriaNombre(socio.categoriaId)}</td>}
                {isVisible('estado') && (
                  <td>
                    <span className={`badge ${socio.fechaBaja ? 'badge-inactivo' : 'badge-activo'}`}>
                      {socio.fechaBaja ? 'Inactivo' : 'Activo'}
                    </span>
                  </td>
                )}
                {isVisible('acciones') && (
                  <td>
                    <div className="acciones">
                      {tienePermiso('socios.liquidaciones') && (
                        <button
                          onClick={() => onVerLiquidaciones(socio)}
                          className="btn-accion btn-liquidaciones"
                          title="Ver Liquidaciones"
                        >
                          💰
                        </button>
                      )}
                      {socio.telefono &&
                        tienePermiso('socios.whatsapp') &&
                        onEnviarLiquidacionesWhatsApp && (
                          <button
                            onClick={() => onEnviarLiquidacionesWhatsApp(socio)}
                            className="btn-accion btn-whatsapp"
                            title="Enviar Liquidaciones por WhatsApp"
                          >
                            📱
                          </button>
                        )}
                      {tienePermiso('pagos.registrar') && (
                        <button
                          onClick={() => onRegistrarPago(socio)}
                          className="btn-accion btn-pago"
                          title="Registrar Cobro"
                        >
                          💳
                        </button>
                      )}
                      {tienePermiso('socios.modificar') && !socio.fechaBaja && (
                        <button
                          onClick={() => onModificar(socio)}
                          className="btn-accion btn-modificar"
                          title="Modificar"
                        >
                          ✏️
                        </button>
                      )}
                      {tienePermiso('socios.modificar') &&
                        onDarBaja &&
                        !socio.fechaBaja && (
                          <button
                            onClick={() => onDarBaja(socio)}
                            className="btn-accion btn-dar-baja"
                            title="Dar de Baja"
                          >
                            ⬇️
                          </button>
                        )}
                      {tienePermiso('socios.modificar') && onDarAlta && socio.fechaBaja && (
                        <button
                          onClick={() => onDarAlta(socio)}
                          className="btn-accion btn-dar-alta"
                          title="Dar de Alta"
                        >
                          ⬆️
                        </button>
                      )}
                      {tienePermiso('socios.eliminar') && (
                        <button
                          onClick={() => onBorrar(socio.id)}
                          className="btn-accion btn-borrar"
                          title="Borrar"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
