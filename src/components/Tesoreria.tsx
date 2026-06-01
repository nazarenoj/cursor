import { useEffect, useMemo, useState } from 'react';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useCategorias } from '../hooks/useCategorias';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { SelectorColumnas } from './SelectorColumnas';
import { SelectorFiltros } from './SelectorFiltros';
import { ImprimirTesoreria } from './ImprimirTesoreria';
import { apiService } from '../services/api';
import { useFilterPreferences } from '../hooks/useFilterPreferences';
import { compareYMD, dateToYMDLocal, extractYMD, formatDateOnlyES } from '../utils/clubDateTime';
import './Tesoreria.css';

const TESORERIA_DETALLE_COLUMNS = [
  { id: 'medioPago', label: 'Medio de Pago' },
  { id: 'fechaPago', label: 'Fecha Pago' },
  { id: 'numeroSocio', label: 'N° Socio' },
  { id: 'apellido', label: 'Apellido' },
  { id: 'nombre', label: 'Nombre' },
  { id: 'categoria', label: 'Categoría' },
  { id: 'mesLiquidacion', label: 'Mes Liquidación' },
  { id: 'monto', label: 'Monto' },
];
const TESORERIA_DETALLE_DEFAULT = TESORERIA_DETALLE_COLUMNS.map((c) => c.id);

const TESORERIA_FILTROS = [
  { id: 'fechaDesde', label: 'Fecha Desde' },
  { id: 'fechaHasta', label: 'Fecha Hasta' },
  { id: 'medioPago', label: 'Medio de Pago' },
  { id: 'socioTexto', label: 'Socio' },
  { id: 'categoriaId', label: 'Categoría' },
  { id: 'mesLiquidacion', label: 'Mes Liquidado' },
] as const;

const TESORERIA_FILTROS_DEFAULT = TESORERIA_FILTROS.map((f) => f.id);

type FiltrosTesoreria = {
  fechaDesde: string;
  fechaHasta: string;
  medioPago: string;
  socioTexto: string;
  categoriaId: string;
  mesLiquidacion: string;
};

export const Tesoreria = () => {
  const { liquidacionesCuotas, liquidacionesMensuales } = useLiquidaciones();
  const { categorias } = useCategorias();

  const { visibleColumns, setVisibleColumns, toggleColumn, loading: loadingCols } = useColumnPreferences(
    'tesoreria-detalle',
    TESORERIA_DETALLE_DEFAULT,
  );
  const visible = loadingCols ? TESORERIA_DETALLE_DEFAULT : visibleColumns;
  const isVisible = (id: string) => visible.includes(id);

  const { visibleFilters, toggleFilter, setVisibleFilters, isFilterVisible } = useFilterPreferences(
    'tesoreria',
    TESORERIA_FILTROS_DEFAULT,
  );

  const [filtros, setFiltros] = useState<FiltrosTesoreria>({
    fechaDesde: '',
    fechaHasta: '',
    medioPago: '',
    socioTexto: '',
    categoriaId: '',
    mesLiquidacion: '',
  });
  const [mostrarImpresion, setMostrarImpresion] = useState(false);
  const [mediosPagoSistema, setMediosPagoSistema] = useState<string[]>([]);

  useEffect(() => {
    const loadMedios = async () => {
      try {
        const data = await apiService.getMediosPago();
        const activos = data
          .filter((m) => m.activo)
          .map((m) => m.nombre)
          .sort((a, b) => a.localeCompare(b));
        setMediosPagoSistema(activos);
      } catch {
        setMediosPagoSistema([]);
      }
    };
    loadMedios();
  }, []);

  // Obtener todos los pagos con información completa
  const pagos = useMemo(() => {
    return liquidacionesCuotas
      .filter((cuota) => cuota.pagado && cuota.fechaPago && cuota.medioPago)
      .map((cuota) => {
        const liquidacionMensual = liquidacionesMensuales.find(
          (lm) => lm.id === cuota.liquidacionMensualId,
        );
        return {
          ...cuota,
          mes: liquidacionMensual?.mes || '',
          fechaLiquidacion: liquidacionMensual?.fechaLiquidacion || '',
        };
      });
  }, [liquidacionesCuotas, liquidacionesMensuales]);

  // Meses únicos de los pagos (para filtro)
  const mesesDisponibles = useMemo(() => {
    const meses = new Set(pagos.map((p) => p.mes).filter(Boolean));
    return Array.from(meses).sort().reverse();
  }, [pagos]);

  // Aplicar filtros
  const pagosFiltrados = useMemo(() => {
    return pagos.filter((pago) => {
      if (filtros.fechaDesde) {
        const ymdPago = extractYMD(pago.fechaPago);
        const ymdDesde = extractYMD(filtros.fechaDesde);
        if (!ymdPago || !ymdDesde) return false;
        if (compareYMD(ymdPago, ymdDesde) < 0) return false;
      }
      if (filtros.fechaHasta) {
        const ymdPago = extractYMD(pago.fechaPago);
        const ymdHasta = extractYMD(filtros.fechaHasta);
        if (!ymdPago || !ymdHasta) return false;
        if (compareYMD(ymdPago, ymdHasta) > 0) return false;
      }
      if (filtros.medioPago) {
        if (!pago.medioPago) return false;
        const medios = pago.medioPago.split(',').map((m) => m.split(':')[0]?.trim());
        if (!medios.some((m) => m === filtros.medioPago)) return false;
      }
      if (filtros.socioTexto.trim()) {
        const texto = filtros.socioTexto.trim().toLowerCase();
        const match =
          String(pago.numeroSocio || '').toLowerCase().includes(texto) ||
          (pago.apellido || '').toLowerCase().includes(texto) ||
          (pago.nombre || '').toLowerCase().includes(texto) ||
          `${pago.apellido || ''} ${pago.nombre || ''}`.toLowerCase().includes(texto) ||
          `${pago.nombre || ''} ${pago.apellido || ''}`.toLowerCase().includes(texto);
        if (!match) return false;
      }
      if (filtros.categoriaId) {
        if (String(pago.categoriaId) !== filtros.categoriaId) return false;
      }
      if (filtros.mesLiquidacion) {
        if (pago.mes !== filtros.mesLiquidacion) return false;
      }
      return true;
    });
  }, [pagos, filtros]);

  // Agrupar pagos por medio de pago
  const pagosPorMedio = useMemo(() => {
    const agrupados: Record<string, typeof pagosFiltrados> = {};

    pagosFiltrados.forEach((pago) => {
      if (!pago.medioPago) return;

      // Si el medioPago contiene múltiples medios (ej: "Efectivo: $100, Transferencia: $200")
      const partes = pago.medioPago.split(',');
      
      partes.forEach((parte) => {
        const [medio, montoStr] = parte.split(':').map((s) => s.trim());
        if (!medio) return;

        const monto = montoStr 
          ? parseFloat(montoStr.replace('$', '').replace(/,/g, '')) || pago.monto
          : pago.monto;

        if (!agrupados[medio]) {
          agrupados[medio] = [];
        }

        // Obtener nombre de categoría
        const categoria = categorias.find((c) => c.id === pago.categoriaId);
        const categoriaNombre = categoria?.nombre || 'Sin categoría';

        // Crear un registro por cada medio de pago
        agrupados[medio].push({
          ...pago,
          medioPago: medio,
          monto: monto,
          categoriaNombre: categoriaNombre,
        });
      });
    });

    return agrupados;
  }, [pagosFiltrados, categorias]);

  // Calcular totales por medio de pago
  const totalesPorMedio = useMemo(() => {
    const totales: Record<string, number> = {};
    
    Object.entries(pagosPorMedio).forEach(([medio, pagos]) => {
      totales[medio] = pagos.reduce((sum, pago) => sum + pago.monto, 0);
    });

    return totales;
  }, [pagosPorMedio]);

  // Total general
  const totalGeneral = useMemo(() => {
    if (filtros.medioPago && totalesPorMedio[filtros.medioPago] != null) {
      return totalesPorMedio[filtros.medioPago];
    }
    return Object.values(totalesPorMedio).reduce((sum, total) => sum + total, 0);
  }, [totalesPorMedio, filtros.medioPago]);

  const limpiarFiltros = () => {
    setFiltros({
      fechaDesde: '',
      fechaHasta: '',
      medioPago: '',
      socioTexto: '',
      categoriaId: '',
      mesLiquidacion: '',
    });
  };

  const seleccionarMesCorriente = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    setFiltros({
      ...filtros,
      fechaDesde: dateToYMDLocal(primerDia),
      fechaHasta: dateToYMDLocal(ultimoDia),
    });
  };

  const seleccionarMesPasado = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    
    setFiltros({
      ...filtros,
      fechaDesde: dateToYMDLocal(primerDia),
      fechaHasta: dateToYMDLocal(ultimoDia),
    });
  };

  const getNombreMes = (mesString: string) => {
    if (!mesString) return '-';
    const [año, mes] = mesString.split('-');
    const fecha = new Date(parseInt(año, 10), parseInt(mes, 10) - 1, 1);
    return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  const formatFecha = (fecha: string | null) => {
    return formatDateOnlyES(fecha);
  };

  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find((c) => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);

  const handleOrdenar = (columna: string) => {
    if (ordenColumna?.columna === columna) {
      setOrdenColumna({ columna, direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const ordenarPagos = (pagos: typeof pagosFiltrados) => {
    if (!ordenColumna) return [...pagos].sort((a, b) => (b.fechaPago || '').localeCompare(a.fechaPago || ''));
    const { columna, direccion } = ordenColumna;
    return [...pagos].sort((a, b) => {
      let cmp = 0;
      switch (columna) {
        case 'medioPago':
          cmp = (a.medioPago || '').localeCompare(b.medioPago || '');
          break;
        case 'fechaPago':
          cmp = (a.fechaPago || '').localeCompare(b.fechaPago || '');
          break;
        case 'numeroSocio':
          cmp = (a.numeroSocio || 0) - (b.numeroSocio || 0);
          break;
        case 'apellido':
          cmp = (a.apellido || '').localeCompare(b.apellido || '');
          break;
        case 'nombre':
          cmp = (a.nombre || '').localeCompare(b.nombre || '');
          break;
        case 'categoria':
          cmp = getCategoriaNombre(a.categoriaId).localeCompare(getCategoriaNombre(b.categoriaId));
          break;
        case 'mesLiquidacion':
          cmp = (a.mes || '').localeCompare(b.mes || '');
          break;
        case 'monto':
          cmp = a.monto - b.monto;
          break;
        default:
          return 0;
      }
      return direccion === 'asc' ? cmp : -cmp;
    });
  };

  if (mostrarImpresion) {
    const catSel = filtros.categoriaId ? categorias.find((c) => String(c.id) === filtros.categoriaId) : null;
    const filtrosImpresion = {
      ...filtros,
      socioNombre: filtros.socioTexto.trim() || undefined,
      categoriaNombre: catSel?.nombre,
    };
    return (
      <ImprimirTesoreria
        pagosPorMedio={pagosPorMedio}
        totalesPorMedio={totalesPorMedio}
        totalGeneral={totalGeneral}
        filtros={filtrosImpresion}
        onVolver={() => setMostrarImpresion(false)}
      />
    );
  }

  return (
    <div className="tesoreria">
      <div className="tesoreria-header">
        <h1>Tesorería</h1>
        <p className="subtitle">Resumen de cobros por medio de pago</p>
        <div className="header-actions">
          <SelectorFiltros
            filtros={TESORERIA_FILTROS as unknown as { id: string; label: string }[]}
            visibleIds={visibleFilters}
            onToggle={toggleFilter}
            onRestaurar={() => setVisibleFilters(TESORERIA_FILTROS_DEFAULT)}
            titulo="Filtros visibles"
          />
          <SelectorColumnas
            columnas={TESORERIA_DETALLE_COLUMNS}
            visibleIds={visible}
            onToggle={toggleColumn}
            onRestaurar={() => setVisibleColumns(TESORERIA_DETALLE_DEFAULT)}
            titulo="Columnas visibles"
          />
          <button className="btn-imprimir-tesoreria" onClick={() => setMostrarImpresion(true)}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      <div className="filtros-tesoreria">
        {isFilterVisible('fechaDesde') && (
          <div className="filtro-group">
            <label htmlFor="fechaDesde">Fecha Desde:</label>
            <input
              type="date"
              id="fechaDesde"
              value={filtros.fechaDesde}
              onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
            />
          </div>
        )}

        {isFilterVisible('fechaHasta') && (
          <div className="filtro-group">
            <label htmlFor="fechaHasta">Fecha Hasta:</label>
            <input
              type="date"
              id="fechaHasta"
              value={filtros.fechaHasta}
              onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
            />
          </div>
        )}

        {isFilterVisible('medioPago') && (
          <div className="filtro-group">
            <label htmlFor="medioPago">Medio de Pago:</label>
            <select
              id="medioPago"
              value={filtros.medioPago}
              onChange={(e) => setFiltros({ ...filtros, medioPago: e.target.value })}
            >
              <option value="">Todos</option>
              {mediosPagoSistema.map((medio) => (
                <option key={medio} value={medio}>
                  {medio}
                </option>
              ))}
            </select>
          </div>
        )}

        {isFilterVisible('socioTexto') && (
          <div className="filtro-group filtro-socio-texto">
            <label htmlFor="socio">Socio:</label>
            <input
              type="text"
              id="socio"
              placeholder="Buscar por número, apellido o nombre"
              value={filtros.socioTexto}
              onChange={(e) => setFiltros({ ...filtros, socioTexto: e.target.value })}
            />
          </div>
        )}

        {isFilterVisible('categoriaId') && (
          <div className="filtro-group">
            <label htmlFor="categoria">Categoría:</label>
            <select
              id="categoria"
              value={filtros.categoriaId}
              onChange={(e) => setFiltros({ ...filtros, categoriaId: e.target.value })}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {isFilterVisible('mesLiquidacion') && (
          <div className="filtro-group">
            <label htmlFor="mesLiquidacion">Mes Liquidado:</label>
            <select
              id="mesLiquidacion"
              value={filtros.mesLiquidacion}
              onChange={(e) => setFiltros({ ...filtros, mesLiquidacion: e.target.value })}
            >
              <option value="">Todos</option>
              {mesesDisponibles.map((mes) => (
                <option key={mes} value={mes}>
                  {mes}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filtro-acciones">
          {(isFilterVisible('fechaDesde') || isFilterVisible('fechaHasta')) && (
            <>
              <button className="btn-mes-rapido" onClick={seleccionarMesCorriente} title="Seleccionar mes corriente">
                📅 Mes Corriente
              </button>
              <button className="btn-mes-rapido" onClick={seleccionarMesPasado} title="Seleccionar mes pasado">
                📅 Mes Pasado
              </button>
            </>
          )}
          <button className="btn-limpiar" onClick={limpiarFiltros}>
            Limpiar Filtros
          </button>
        </div>
      </div>

      <div className="resumen-tesoreria">
        <div className="resumen-card">
          <h3>Total General</h3>
          <p className="monto-total">${totalGeneral.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</p>
        </div>
        <div className="resumen-por-medio">
          {Object.entries(totalesPorMedio)
            .filter(([medio]) => !filtros.medioPago || medio === filtros.medioPago)
            .sort(([, a], [, b]) => b - a)
            .map(([medio, total]) => (
              <div key={medio} className="resumen-item">
                <span className="medio-nombre">{medio}</span>
                <span className="medio-total">
                  ${total.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="tabla-tesoreria">
        <h2>Detalle de Cobros por Medio de Pago</h2>
        {Object.entries(pagosPorMedio)
          .filter(([medio]) => !filtros.medioPago || medio === filtros.medioPago)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([medio, pagosMedio]) => (
            <div key={medio} className="medio-section">
              <div className="medio-header">
                <h3>{medio}</h3>
                <span className="medio-cantidad">
                  {pagosMedio.length} cobro{pagosMedio.length !== 1 ? 's' : ''} - Total: $
                  {totalesPorMedio[medio].toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="tabla-pagos-medio-container">
                <div className="tabla-wrapper">
                  <table className="tabla-pagos-medio">
                  <thead>
                    <tr>
                      {isVisible('medioPago') && (
                        <th className="sortable" onClick={() => handleOrdenar('medioPago')}>
                          Medio de Pago
                          {ordenColumna?.columna === 'medioPago' && (
                            <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                          )}
                        </th>
                      )}
                      {isVisible('fechaPago') && (
                        <th className="sortable" onClick={() => handleOrdenar('fechaPago')}>
                          Fecha Pago
                          {ordenColumna?.columna === 'fechaPago' && (
                            <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                          )}
                        </th>
                      )}
                      {isVisible('numeroSocio') && (
                        <th className="sortable" onClick={() => handleOrdenar('numeroSocio')}>
                          N° Socio
                          {ordenColumna?.columna === 'numeroSocio' && (
                            <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                          )}
                        </th>
                      )}
                      {isVisible('apellido') && (
                        <th className="sortable" onClick={() => handleOrdenar('apellido')}>
                          Apellido
                          {ordenColumna?.columna === 'apellido' && (
                            <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                          )}
                        </th>
                      )}
                      {isVisible('nombre') && (
                        <th className="sortable" onClick={() => handleOrdenar('nombre')}>
                          Nombre
                          {ordenColumna?.columna === 'nombre' && (
                            <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                          )}
                        </th>
                      )}
                      {isVisible('categoria') && (
                        <th className="sortable" onClick={() => handleOrdenar('categoria')}>
                          Categoría
                          {ordenColumna?.columna === 'categoria' && (
                            <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                          )}
                        </th>
                      )}
                      {isVisible('mesLiquidacion') && (
                        <th className="sortable" onClick={() => handleOrdenar('mesLiquidacion')}>
                          Mes Liquidación
                          {ordenColumna?.columna === 'mesLiquidacion' && (
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
                    </tr>
                  </thead>
                  <tbody>
                    {ordenarPagos(pagosMedio).map((pago) => (
                        <tr key={pago.id}>
                          {isVisible('medioPago') && <td>{medio}</td>}
                          {isVisible('fechaPago') && <td>{formatFecha(pago.fechaPago)}</td>}
                          {isVisible('numeroSocio') && <td>{pago.numeroSocio}</td>}
                          {isVisible('apellido') && <td>{pago.apellido}</td>}
                          {isVisible('nombre') && <td>{pago.nombre}</td>}
                          {isVisible('categoria') && <td>{getCategoriaNombre(pago.categoriaId)}</td>}
                          {isVisible('mesLiquidacion') && <td>{getNombreMes(pago.mes)}</td>}
                          {isVisible('monto') && (
                            <td className="monto">
                              ${pago.monto.toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          ))}
        {Object.entries(pagosPorMedio).filter(([m]) => !filtros.medioPago || m === filtros.medioPago).length === 0 && (
          <div className="sin-datos">
            <p>No se encontraron cobros con los filtros aplicados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

