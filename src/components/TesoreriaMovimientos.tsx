import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import type { Caja, MovimientoCaja } from '../types';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { SelectorColumnas } from './SelectorColumnas';
import { SelectorFiltros } from './SelectorFiltros';
import { useFilterPreferences } from '../hooks/useFilterPreferences';
import './Tesoreria.css';

const MOVIMIENTOS_COLUMNS = [
  { id: 'fecha', label: 'Fecha' },
  { id: 'tipo', label: 'Tipo' },
  { id: 'monto', label: 'Monto' },
  { id: 'medioPago', label: 'Medio de pago' },
  { id: 'concepto', label: 'Concepto' },
  { id: 'descripcion', label: 'Descripción' },
];
const MOVIMIENTOS_DEFAULT_VISIBLE = MOVIMIENTOS_COLUMNS.map((c) => c.id);

const TESORERIA_MOV_FILTROS = [
  { id: 'fechaDesde', label: 'Fecha Desde' },
  { id: 'fechaHasta', label: 'Fecha Hasta' },
  { id: 'tipo', label: 'Tipo' },
  { id: 'concepto', label: 'Concepto' },
  { id: 'descripcion', label: 'Descripción' },
] as const;

const TESORERIA_MOV_FILTROS_DEFAULT = TESORERIA_MOV_FILTROS.map((f) => f.id);

type FiltrosMovimientos = {
  cajaId: string;
  fechaDesde: string;
  fechaHasta: string;
  tipo: '' | 'ingreso' | 'egreso';
  concepto: string;
  descripcion: string;
};

export const TesoreriaMovimientos = () => {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [loadingCajas, setLoadingCajas] = useState(true);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [error, setError] = useState('');
  const [errorFechas, setErrorFechas] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<FiltrosMovimientos>({
    cajaId: '',
    fechaDesde: '',
    fechaHasta: '',
    tipo: '',
    concepto: '',
    descripcion: '',
  });

  const { visibleColumns, setVisibleColumns, toggleColumn, loading: loadingCols } = useColumnPreferences(
    'tesoreria-movimientos',
    MOVIMIENTOS_DEFAULT_VISIBLE,
  );
  const visible = loadingCols ? MOVIMIENTOS_DEFAULT_VISIBLE : visibleColumns;
  const isVisible = (id: string) => visible.includes(id);

  const { visibleFilters, toggleFilter, setVisibleFilters, isFilterVisible } = useFilterPreferences(
    'tesoreria-movimientos',
    TESORERIA_MOV_FILTROS_DEFAULT,
  );

  useEffect(() => {
    const loadCajas = async () => {
      setLoadingCajas(true);
      try {
        const data = await apiService.getCajas();
        setCajas(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar cajas');
      } finally {
        setLoadingCajas(false);
      }
    };
    loadCajas();
  }, []);

  const loadMovimientos = async () => {
    if (!filtros.cajaId) {
      setMovimientos([]);
      return;
    }
    setLoadingMovimientos(true);
    setError('');
    try {
      const data = await apiService.getMovimientosCaja(Number(filtros.cajaId), {
        fechaDesde: filtros.fechaDesde || undefined,
        fechaHasta: filtros.fechaHasta || undefined,
        tipo: filtros.tipo || undefined,
      });
      setMovimientos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar movimientos');
      setMovimientos([]);
    } finally {
      setLoadingMovimientos(false);
    }
  };

  useEffect(() => {
    loadMovimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.cajaId, filtros.fechaDesde, filtros.fechaHasta, filtros.tipo]);

  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);

  const handleOrdenar = (columna: string) => {
    if (ordenColumna?.columna === columna) {
      setOrdenColumna({ columna, direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (filtros.concepto && !(m.concepto || '').toLowerCase().includes(filtros.concepto.toLowerCase())) return false;
      if (filtros.descripcion && !(m.descripcion || '').toLowerCase().includes(filtros.descripcion.toLowerCase())) return false;
      return true;
    });
  }, [movimientos, filtros.concepto, filtros.descripcion]);

  const movimientosOrdenados = useMemo(() => {
    if (!ordenColumna) {
      return [...movimientosFiltrados].sort((a, b) => {
        const fechaA = a.fecha || '';
        const fechaB = b.fecha || '';
        if (fechaA === fechaB) {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return fechaB.localeCompare(fechaA);
      });
    }
    const { columna, direccion } = ordenColumna;
    return [...movimientosFiltrados].sort((a, b) => {
      let cmp = 0;
      switch (columna) {
        case 'fecha':
          cmp = (a.fecha || '').localeCompare(b.fecha || '');
          if (cmp === 0) cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        case 'tipo':
          cmp = (a.tipo || '').localeCompare(b.tipo || '');
          break;
        case 'monto':
          cmp = a.monto - b.monto;
          break;
        case 'medioPago':
          cmp = (a.medioPagoNombre || '').localeCompare(b.medioPagoNombre || '');
          break;
        case 'concepto':
          cmp = (a.concepto || '').localeCompare(b.concepto || '');
          break;
        case 'descripcion':
          cmp = (a.descripcion || '').localeCompare(b.descripcion || '');
          break;
        default:
          return 0;
      }
      return direccion === 'asc' ? cmp : -cmp;
    });
  }, [movimientosFiltrados, ordenColumna]);

  const totales = useMemo(() => {
    let ingresos = 0;
    let egresos = 0;
    movimientosFiltrados.forEach((m) => {
      if (m.tipo === 'ingreso') ingresos += m.monto;
      if (m.tipo === 'egreso') egresos += m.monto;
    });
    return {
      ingresos,
      egresos,
      neto: ingresos - egresos,
    };
  }, [movimientosFiltrados]);

  const cajaSeleccionada = cajas.find((c) => c.id === Number(filtros.cajaId));

  const formatFecha = (fecha: string | null | undefined) => {
    if (!fecha) return '-';
    // Evitar corrimiento por zona horaria:
    // new Date('YYYY-MM-DD') interpreta como UTC y puede restar un día en TZ negativa.
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [y, m, d] = fecha.split('-').map((x) => Number(x));
      const dt = new Date(y, m - 1, d); // midnight local
      return dt.toLocaleDateString('es-AR');
    }
    return fecha;
  };

  const handleChangeFiltro = (patch: Partial<FiltrosMovimientos>) => {
    setFiltros((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const limpiarFiltros = () => {
    setFiltros((prev) => ({
      ...prev,
      fechaDesde: '',
      fechaHasta: '',
      tipo: '',
      concepto: '',
      descripcion: '',
    }));
    setErrorFechas(null);
  };

  return (
    <div className="tesoreria">
      <div className="tesoreria-header">
        <h1>Tesorería</h1>
        <p className="subtitle">Movimientos de caja</p>
        <div className="header-actions">
          <SelectorFiltros
            filtros={TESORERIA_MOV_FILTROS as unknown as { id: string; label: string }[]}
            visibleIds={visibleFilters}
            onToggle={toggleFilter}
            onRestaurar={() => setVisibleFilters(TESORERIA_MOV_FILTROS_DEFAULT)}
            titulo="Filtros visibles"
          />
          <SelectorColumnas
            columnas={MOVIMIENTOS_COLUMNS}
            visibleIds={visible}
            onToggle={toggleColumn}
            onRestaurar={() => setVisibleColumns(MOVIMIENTOS_DEFAULT_VISIBLE)}
            titulo="Columnas visibles"
          />
        </div>
      </div>

      <div className="filtros-tesoreria">
        <div className="filtro-group">
          <label htmlFor="cajaId">Caja:</label>
          <select
            id="cajaId"
            value={filtros.cajaId}
            onChange={(e) => handleChangeFiltro({ cajaId: e.target.value })}
            disabled={loadingCajas}
          >
            <option value="">Seleccionar caja</option>
            {cajas.map((caja) => (
              <option key={caja.id} value={caja.id}>
                {caja.nombre}
              </option>
            ))}
          </select>
        </div>
        {isFilterVisible('fechaDesde') && (
          <div className="filtro-group">
            <label htmlFor="fechaDesdeMov">Fecha Desde:</label>
            <input
              type="date"
              id="fechaDesdeMov"
              value={filtros.fechaDesde}
              onChange={(e) => {
                const nextFechaDesde = e.target.value;
                setErrorFechas(null);
                setFiltros((prev) => {
                  // input[type=date] devuelve YYYY-MM-DD (ordenable lexicográficamente)
                  if (prev.fechaHasta && nextFechaDesde && nextFechaDesde > prev.fechaHasta) {
                    // Ajustar fechaHasta para mantener coherencia
                    return { ...prev, fechaDesde: nextFechaDesde, fechaHasta: nextFechaDesde };
                  }
                  return { ...prev, fechaDesde: nextFechaDesde };
                });
              }}
            />
          </div>
        )}
        {isFilterVisible('fechaHasta') && (
          <div className="filtro-group">
            <label htmlFor="fechaHastaMov">Fecha Hasta:</label>
            <input
              type="date"
              id="fechaHastaMov"
              value={filtros.fechaHasta}
              onChange={(e) => {
                const nextFechaHasta = e.target.value;
                setErrorFechas(null);
                setFiltros((prev) => {
                  if (prev.fechaDesde && nextFechaHasta && nextFechaHasta < prev.fechaDesde) {
                    // Ajustar fechaDesde para mantener coherencia
                    return { ...prev, fechaHasta: nextFechaHasta, fechaDesde: nextFechaHasta };
                  }
                  return { ...prev, fechaHasta: nextFechaHasta };
                });
              }}
            />
          </div>
        )}
        {isFilterVisible('tipo') && (
          <div className="filtro-group">
            <label htmlFor="tipoMov">Tipo:</label>
            <select
              id="tipoMov"
              value={filtros.tipo}
              onChange={(e) => handleChangeFiltro({ tipo: e.target.value as FiltrosMovimientos['tipo'] })}
            >
              <option value="">Ingresos y egresos</option>
              <option value="ingreso">Solo ingresos</option>
              <option value="egreso">Solo egresos</option>
            </select>
          </div>
        )}
        {isFilterVisible('concepto') && (
          <div className="filtro-group">
            <label htmlFor="filtroConcepto">Concepto:</label>
            <input
              type="text"
              id="filtroConcepto"
              placeholder="Buscar concepto"
              value={filtros.concepto}
              onChange={(e) => handleChangeFiltro({ concepto: e.target.value })}
            />
          </div>
        )}
        {isFilterVisible('descripcion') && (
          <div className="filtro-group">
            <label htmlFor="filtroDescripcion">Descripción:</label>
            <input
              type="text"
              id="filtroDescripcion"
              placeholder="Buscar descripción"
              value={filtros.descripcion}
              onChange={(e) => handleChangeFiltro({ descripcion: e.target.value })}
            />
          </div>
        )}
        <div className="filtro-acciones">
          <button className="btn-limpiar" type="button" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
      </div>

      {(error || errorFechas) && (
        <div className="resumen-tesoreria">
          <div className="resumen-card">
            <h3>Error</h3>
            {error && <p style={{ color: '#c53030' }}>{error}</p>}
            {errorFechas && <p style={{ color: '#c53030' }}>{errorFechas}</p>}
          </div>
        </div>
      )}

      {cajaSeleccionada && (
        <div className="resumen-tesoreria">
          <div className="resumen-card">
            <h3>Caja seleccionada</h3>
            <p>{cajaSeleccionada.nombre}</p>
          </div>
          <div className="resumen-card">
            <h3>Total ingresos (filtro)</h3>
            <p className="monto-total">
              $
              {totales.ingresos.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="resumen-card">
            <h3>Total egresos (filtro)</h3>
            <p className="monto-total">
              $
              {totales.egresos.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="resumen-card">
            <h3>Saldo neto (filtro)</h3>
            <p className="monto-total">
              $
              {totales.neto.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      )}

      <div className="tabla-tesoreria">
        <h2>Listado de movimientos de caja</h2>
        <div className="tabla-pagos-medio-container">
          <div className="tabla-wrapper">
            <table className="tabla-pagos-medio">
              <thead>
                <tr>
                  {isVisible('fecha') && (
                    <th className="sortable" onClick={() => handleOrdenar('fecha')}>
                      Fecha
                      {ordenColumna?.columna === 'fecha' && (
                        <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </th>
                  )}
                  {isVisible('tipo') && (
                    <th className="sortable" onClick={() => handleOrdenar('tipo')}>
                      Tipo
                      {ordenColumna?.columna === 'tipo' && (
                        <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </th>
                  )}
                  {isVisible('monto') && (
                    <th className="sortable" onClick={() => handleOrdenar('monto')}>
                      Monto
                      {ordenColumna?.columna === 'monto' && (
                        <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </th>
                  )}
                  {isVisible('medioPago') && (
                    <th className="sortable" onClick={() => handleOrdenar('medioPago')}>
                      Medio de pago
                      {ordenColumna?.columna === 'medioPago' && (
                        <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </th>
                  )}
                  {isVisible('concepto') && (
                    <th className="sortable" onClick={() => handleOrdenar('concepto')}>
                      Concepto
                      {ordenColumna?.columna === 'concepto' && (
                        <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </th>
                  )}
                  {isVisible('descripcion') && (
                    <th className="sortable" onClick={() => handleOrdenar('descripcion')}>
                      Descripción
                      {ordenColumna?.columna === 'descripcion' && (
                        <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loadingMovimientos ? (
                  <tr>
                    <td colSpan={visible.length || 6} className="sin-datos">
                      Cargando movimientos...
                    </td>
                  </tr>
                ) : movimientosOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={visible.length || 6} className="sin-datos">
                      {filtros.cajaId ? 'No hay movimientos para los filtros seleccionados.' : 'Seleccioná una caja para ver sus movimientos.'}
                    </td>
                  </tr>
                ) : (
                  movimientosOrdenados.map((mov) => (
                    <tr key={mov.id}>
                      {isVisible('fecha') && <td>{formatFecha(mov.fecha)}</td>}
                      {isVisible('tipo') && <td>{mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</td>}
                      {isVisible('monto') && (
                        <td className={mov.tipo === 'ingreso' ? 'monto ingreso' : 'monto egreso'}>
                          $
                          {mov.monto.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      )}
                      {isVisible('medioPago') && <td>{mov.medioPagoNombre || '-'}</td>}
                      {isVisible('concepto') && <td>{mov.concepto}</td>}
                      {isVisible('descripcion') && <td>{mov.descripcion || '-'}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

