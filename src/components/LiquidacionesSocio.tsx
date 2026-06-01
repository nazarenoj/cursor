import { useState, useMemo } from 'react';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useCategorias } from '../hooks/useCategorias';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { useFilterPreferences } from '../hooks/useFilterPreferences';
import { SelectorColumnas } from './SelectorColumnas';
import { SelectorFiltros } from './SelectorFiltros';
import type { Socio } from '../types';
import { formatDateOnlyES } from '../utils/clubDateTime';
import './LiquidacionesSocio.css';

const LIQUIDACIONES_SOCIO_COLUMNS = [
  { id: 'mes', label: 'Mes' },
  { id: 'fechaLiquidacion', label: 'Fecha Liquidación' },
  { id: 'monto', label: 'Monto' },
  { id: 'estado', label: 'Estado' },
  { id: 'numeroRecibo', label: 'Nº Recibo' },
  { id: 'fechaPago', label: 'Fecha Pago' },
  { id: 'medioPago', label: 'Medio de Pago' },
];
const LIQUIDACIONES_SOCIO_DEFAULT = LIQUIDACIONES_SOCIO_COLUMNS.map((c) => c.id);

const LIQUIDACIONES_SOCIO_FILTROS = [
  { id: 'mes', label: 'Mes' },
  { id: 'estado', label: 'Estado' },
  { id: 'numeroRecibo', label: 'Nº Recibo' },
  { id: 'fechaLiquidacionDesde', label: 'Fecha Liq. desde' },
  { id: 'fechaLiquidacionHasta', label: 'Fecha Liq. hasta' },
  { id: 'fechaPagoDesde', label: 'Fecha Pago desde' },
  { id: 'fechaPagoHasta', label: 'Fecha Pago hasta' },
];
const LIQUIDACIONES_SOCIO_FILTROS_DEFAULT = LIQUIDACIONES_SOCIO_FILTROS.map((f) => f.id);

type FiltrosLiquidacionesSocio = {
  mes: string;
  estado: '' | 'pagado' | 'pendiente';
  numeroRecibo: string;
  fechaLiquidacionDesde: string;
  fechaLiquidacionHasta: string;
  fechaPagoDesde: string;
  fechaPagoHasta: string;
};

interface LiquidacionesSocioProps {
  socio: Socio;
  onVolver: () => void;
}

export const LiquidacionesSocio = ({ socio, onVolver }: LiquidacionesSocioProps) => {
  const { listarLiquidaciones, liquidacionesMensuales } = useLiquidaciones();
  const { getCategoriaById } = useCategorias();
  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);
  const [filtros, setFiltros] = useState<FiltrosLiquidacionesSocio>({
    mes: '',
    estado: '',
    numeroRecibo: '',
    fechaLiquidacionDesde: '',
    fechaLiquidacionHasta: '',
    fechaPagoDesde: '',
    fechaPagoHasta: '',
  });

  const { visibleColumns, setVisibleColumns, toggleColumn, loading: loadingCols } = useColumnPreferences(
    'liquidaciones-socio',
    LIQUIDACIONES_SOCIO_DEFAULT,
  );
  const { visibleFilters, setVisibleFilters, toggleFilter } = useFilterPreferences(
    'liquidaciones-socio',
    LIQUIDACIONES_SOCIO_FILTROS_DEFAULT,
  );
  const visible = loadingCols ? LIQUIDACIONES_SOCIO_DEFAULT : visibleColumns;
  const isVisible = (id: string) => visible.includes(id);
  const isFiltroVisible = (id: string) => visibleFilters.includes(id);

  const cuotas = listarLiquidaciones().filter(l => l.socioId === socio.id);

  const liquidacionesBase = useMemo(() => {
    return cuotas.map(cuota => {
      const liquidacionMensual = liquidacionesMensuales.find(lm => lm.id === cuota.liquidacionMensualId);
      return {
        ...cuota,
        mes: liquidacionMensual?.mes || '',
        fechaLiquidacion: liquidacionMensual?.fechaLiquidacion || '',
      };
    });
  }, [cuotas, liquidacionesMensuales]);

  const liquidacionesFiltradas = useMemo(() => {
    return liquidacionesBase.filter((l) => {
      if (filtros.mes && l.mes !== filtros.mes) return false;
      if (filtros.estado === 'pagado' && !l.pagado) return false;
      if (filtros.estado === 'pendiente' && l.pagado) return false;
      if (filtros.numeroRecibo) {
        const reciboStr = l.numeroRecibo != null ? String(l.numeroRecibo) : '';
        if (!reciboStr.includes(filtros.numeroRecibo)) return false;
      }
      if (filtros.fechaLiquidacionDesde && (l.fechaLiquidacion || '') < filtros.fechaLiquidacionDesde) return false;
      if (filtros.fechaLiquidacionHasta && (l.fechaLiquidacion || '') > filtros.fechaLiquidacionHasta) return false;
      if (filtros.fechaPagoDesde && (l.fechaPago || '') < filtros.fechaPagoDesde) return false;
      if (filtros.fechaPagoHasta && (l.fechaPago || '') > filtros.fechaPagoHasta) return false;
      return true;
    });
  }, [liquidacionesBase, filtros]);

  const liquidaciones = useMemo(() => {
    if (!ordenColumna) {
      return [...liquidacionesFiltradas].sort((a, b) => {
        if (b.mes !== a.mes) return b.mes.localeCompare(a.mes);
        return (b.fechaLiquidacion || '').localeCompare(a.fechaLiquidacion || '');
      });
    }
    const { columna, direccion } = ordenColumna;
    return [...liquidacionesFiltradas].sort((a, b) => {
      let cmp = 0;
      switch (columna) {
        case 'mes': cmp = (a.mes || '').localeCompare(b.mes || ''); break;
        case 'fechaLiquidacion': cmp = (a.fechaLiquidacion || '').localeCompare(b.fechaLiquidacion || ''); break;
        case 'monto': cmp = a.monto - b.monto; break;
        case 'estado': cmp = (a.pagado ? 1 : 0) - (b.pagado ? 1 : 0); break;
        case 'numeroRecibo': cmp = (a.numeroRecibo ?? 0) - (b.numeroRecibo ?? 0); break;
        case 'fechaPago': cmp = (a.fechaPago || '').localeCompare(b.fechaPago || ''); break;
        case 'medioPago': cmp = (a.medioPago || '').localeCompare(b.medioPago || ''); break;
        default: return 0;
      }
      return direccion === 'asc' ? cmp : -cmp;
    });
  }, [liquidacionesFiltradas, ordenColumna]);

  const handleOrdenar = (columna: string) => {
    if (ordenColumna?.columna === columna) {
      setOrdenColumna({ columna, direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>();
    liquidacionesBase.forEach((l) => { if (l.mes) meses.add(l.mes); });
    return Array.from(meses).sort().reverse();
  }, [liquidacionesBase]);
  
  const categoria = getCategoriaById(socio.categoriaId);
  const nombreCategoria = categoria?.nombre || 'Sin categoría';

  const formatFecha = (fecha: string | null) => {
    return formatDateOnlyES(fecha);
  };

  const getNombreMes = (mesString: string) => {
    const [año, mes] = mesString.split('-');
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  const totalMonto = liquidacionesFiltradas.reduce((sum, l) => sum + l.monto, 0);
  const totalPagado = liquidacionesFiltradas.filter(l => l.pagado).reduce((sum, l) => sum + l.monto, 0);
  const totalPendiente = totalMonto - totalPagado;
  const cantidadPagadas = liquidacionesFiltradas.filter(l => l.pagado).length;
  const limpiarFiltros = () => setFiltros({
    mes: '',
    estado: '',
    numeroRecibo: '',
    fechaLiquidacionDesde: '',
    fechaLiquidacionHasta: '',
    fechaPagoDesde: '',
    fechaPagoHasta: '',
  });

  return (
    <div className={`liquidaciones-socio${liquidacionesBase.length > 0 ? ' liquidaciones-socio-con-scroll' : ''}`}>
      <div className="liquidaciones-header">
        <button onClick={onVolver} className="btn-volver">
          ← Volver a Socios
        </button>
        <h1>Liquidaciones de {socio.apellido}, {socio.nombre}</h1>
        <p className="socio-info">
          N° Socio: {socio.numeroSocio} | DNI: {socio.dni ?? '-'} | Categoría: {nombreCategoria}
        </p>
      </div>

      {/* Filtros con selector de visibilidad */}
      <div className="filtros-liquidaciones-socio-row">
        <div className="filtros-liquidaciones-socio">
          {isFiltroVisible('mes') && (
            <div className="filtro-group">
              <label htmlFor="filtro-mes-liq-soc">Mes:</label>
              <select
                id="filtro-mes-liq-soc"
                value={filtros.mes}
                onChange={(e) => setFiltros((p) => ({ ...p, mes: e.target.value }))}
              >
                <option value="">Todos</option>
                {mesesDisponibles.map((m) => (
                  <option key={m} value={m}>{getNombreMes(m)}</option>
                ))}
              </select>
            </div>
          )}
          {isFiltroVisible('estado') && (
            <div className="filtro-group">
              <label htmlFor="filtro-estado-liq-soc">Estado:</label>
              <select
                id="filtro-estado-liq-soc"
                value={filtros.estado}
                onChange={(e) => setFiltros((p) => ({ ...p, estado: e.target.value as FiltrosLiquidacionesSocio['estado'] }))}
              >
                <option value="">Todos</option>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
          )}
          {isFiltroVisible('numeroRecibo') && (
            <div className="filtro-group">
              <label htmlFor="filtro-recibo-liq-soc">Nº Recibo:</label>
              <input
                type="text"
                id="filtro-recibo-liq-soc"
                placeholder="Buscar recibo"
                value={filtros.numeroRecibo}
                onChange={(e) => setFiltros((p) => ({ ...p, numeroRecibo: e.target.value }))}
              />
            </div>
          )}
          {isFiltroVisible('fechaLiquidacionDesde') && (
            <div className="filtro-group">
              <label htmlFor="filtro-fechaliq-desde">Fecha Liq. desde:</label>
              <input
                type="date"
                id="filtro-fechaliq-desde"
                value={filtros.fechaLiquidacionDesde}
                onChange={(e) => setFiltros((p) => ({ ...p, fechaLiquidacionDesde: e.target.value }))}
              />
            </div>
          )}
          {isFiltroVisible('fechaLiquidacionHasta') && (
            <div className="filtro-group">
              <label htmlFor="filtro-fechaliq-hasta">Fecha Liq. hasta:</label>
              <input
                type="date"
                id="filtro-fechaliq-hasta"
                value={filtros.fechaLiquidacionHasta}
                onChange={(e) => setFiltros((p) => ({ ...p, fechaLiquidacionHasta: e.target.value }))}
              />
            </div>
          )}
          {isFiltroVisible('fechaPagoDesde') && (
            <div className="filtro-group">
              <label htmlFor="filtro-fechapago-desde">Fecha Pago desde:</label>
              <input
                type="date"
                id="filtro-fechapago-desde"
                value={filtros.fechaPagoDesde}
                onChange={(e) => setFiltros((p) => ({ ...p, fechaPagoDesde: e.target.value }))}
              />
            </div>
          )}
          {isFiltroVisible('fechaPagoHasta') && (
            <div className="filtro-group">
              <label htmlFor="filtro-fechapago-hasta">Fecha Pago hasta:</label>
              <input
                type="date"
                id="filtro-fechapago-hasta"
                value={filtros.fechaPagoHasta}
                onChange={(e) => setFiltros((p) => ({ ...p, fechaPagoHasta: e.target.value }))}
              />
            </div>
          )}
          <div className="filtro-acciones">
            <button type="button" className="btn-limpiar" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {liquidacionesBase.length === 0 ? (
        <div className="sin-liquidaciones">
          <p>Este socio no tiene liquidaciones registradas.</p>
          <p className="subtitulo">Las liquidaciones se generan desde la sección "Liquidaciones".</p>
        </div>
      ) : (
        <div className="liquidaciones-socio-contenido">
          <div className="resumen-liquidaciones-socio">
            <div className="resumen-item">
              <span className="resumen-label">Total Liquidado:</span>
              <span className="resumen-valor">${totalMonto.toFixed(2)}</span>
            </div>
            <div className="resumen-item">
              <span className="resumen-label">Total Cobrado:</span>
              <span className="resumen-valor pagado">${totalPagado.toFixed(2)}</span>
            </div>
            <div className="resumen-item">
              <span className="resumen-label">Total Pendiente:</span>
              <span className="resumen-valor pendiente">${totalPendiente.toFixed(2)}</span>
            </div>
            <div className="resumen-item">
              <span className="resumen-label">Cuotas Pagadas:</span>
              <span className="resumen-valor">{cantidadPagadas} / {liquidacionesFiltradas.length}</span>
            </div>
          </div>

          <div className="tabla-acciones-liquidaciones-socio">
            <SelectorFiltros
              filtros={LIQUIDACIONES_SOCIO_FILTROS}
              visibleIds={visibleFilters}
              onToggle={toggleFilter}
              onRestaurar={() => setVisibleFilters(LIQUIDACIONES_SOCIO_FILTROS_DEFAULT)}
              titulo="Filtros visibles"
            />
            <SelectorColumnas
              columnas={LIQUIDACIONES_SOCIO_COLUMNS}
              visibleIds={visible}
              onToggle={toggleColumn}
              onRestaurar={() => setVisibleColumns(LIQUIDACIONES_SOCIO_DEFAULT)}
            />
          </div>

          <div className="tabla-liquidaciones-socio-container">
            <div className="tabla-wrapper tabla-liquidaciones-socio-wrapper">
              <div className="tabla-liquidaciones-socio-inner">
              <table className="tabla-liquidaciones-socio">
                <thead>
                  <tr>
                    {isVisible('mes') && (
                      <th className="sortable" onClick={() => handleOrdenar('mes')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Mes
                        {ordenColumna?.columna === 'mes' && (
                          <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                    )}
                    {isVisible('fechaLiquidacion') && (
                      <th className="sortable" onClick={() => handleOrdenar('fechaLiquidacion')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Fecha Liquidación
                        {ordenColumna?.columna === 'fechaLiquidacion' && (
                          <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                    )}
                    {isVisible('monto') && (
                      <th className="sortable" onClick={() => handleOrdenar('monto')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Monto
                        {ordenColumna?.columna === 'monto' && (
                          <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                    )}
                    {isVisible('estado') && (
                      <th className="sortable" onClick={() => handleOrdenar('estado')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Estado
                        {ordenColumna?.columna === 'estado' && (
                          <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                    )}
                    {isVisible('numeroRecibo') && (
                      <th className="sortable" onClick={() => handleOrdenar('numeroRecibo')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Nº Recibo
                        {ordenColumna?.columna === 'numeroRecibo' && (
                          <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                    )}
                    {isVisible('fechaPago') && (
                      <th className="sortable" onClick={() => handleOrdenar('fechaPago')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Fecha Pago
                        {ordenColumna?.columna === 'fechaPago' && (
                          <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                    )}
                    {isVisible('medioPago') && (
                      <th className="sortable" onClick={() => handleOrdenar('medioPago')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Medio de Pago
                        {ordenColumna?.columna === 'medioPago' && (
                          <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {liquidaciones.map(liquidacion => (
                    <tr key={liquidacion.id} className={liquidacion.pagado ? 'pagado' : ''}>
                      {isVisible('mes') && <td>{getNombreMes(liquidacion.mes)}</td>}
                      {isVisible('fechaLiquidacion') && <td>{formatFecha(liquidacion.fechaLiquidacion)}</td>}
                      {isVisible('monto') && <td className="monto">${liquidacion.monto.toFixed(2)}</td>}
                      {isVisible('estado') && (
                        <td>
                          <span className={`badge ${liquidacion.pagado ? 'badge-pagado' : 'badge-pendiente'}`}>
                            {liquidacion.pagado ? 'Pagado' : 'Pendiente'}
                          </span>
                        </td>
                      )}
                      {isVisible('numeroRecibo') && (
                        <td>{liquidacion.numeroRecibo != null ? String(liquidacion.numeroRecibo).padStart(6, '0') : '-'}</td>
                      )}
                      {isVisible('fechaPago') && <td>{formatFecha(liquidacion.fechaPago)}</td>}
                      {isVisible('medioPago') && <td>{liquidacion.medioPago ?? '-'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

