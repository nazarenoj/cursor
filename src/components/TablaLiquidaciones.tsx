import { useState, useMemo } from 'react';
import type { LiquidacionCuota } from '../types';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { SelectorColumnas } from './SelectorColumnas';
import './TablaLiquidaciones.css';
import { formatDateOnlyES } from '../utils/clubDateTime';

const LIQUIDACIONES_COLUMNS = [
  { id: 'numeroSocio', label: 'N° Socio' },
  { id: 'apellido', label: 'Apellido' },
  { id: 'nombre', label: 'Nombre' },
  { id: 'categoria', label: 'Categoría' },
  { id: 'mes', label: 'Mes' },
  { id: 'fechaLiquidacion', label: 'Fecha Liquidación' },
  { id: 'monto', label: 'Monto' },
  { id: 'estado', label: 'Estado' },
  { id: 'fechaPago', label: 'Fecha Pago' },
  { id: 'medioPago', label: 'Medio de Pago' },
];
const LIQUIDACIONES_DEFAULT_VISIBLE = LIQUIDACIONES_COLUMNS.map((c) => c.id);

type FiltrosLiquidaciones = {
  socio: string;
  categoria: string;
  mes: string;
  estado: '' | 'pagado' | 'pendiente';
};

interface TablaLiquidacionesProps {
  liquidaciones: (LiquidacionCuota & { mes: string; fechaLiquidacion: string })[];
  onMarcarPagado: (id: number) => void;
  onMarcarNoPagado: (id: number) => void;
  onBorrar: (id: number) => void;
}

export const TablaLiquidaciones = ({
  liquidaciones,
  onMarcarPagado,
  onMarcarNoPagado,
  onBorrar
}: TablaLiquidacionesProps) => {
  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);
  const [filtros, setFiltros] = useState<FiltrosLiquidaciones>({
    socio: '',
    categoria: '',
    mes: '',
    estado: '',
  });

  const { visibleColumns, setVisibleColumns, toggleColumn, loading: loadingCols } = useColumnPreferences(
    'liquidaciones',
    LIQUIDACIONES_DEFAULT_VISIBLE,
  );
  const visible = loadingCols ? LIQUIDACIONES_DEFAULT_VISIBLE : visibleColumns;
  const isVisible = (id: string) => visible.includes(id);

  const handleOrdenar = (columna: string) => {
    if (ordenColumna && ordenColumna.columna === columna) {
      setOrdenColumna({ columna, direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const liquidacionesFiltradas = useMemo(() => {
    return liquidaciones.filter((l) => {
      if (filtros.socio) {
        const texto = `${l.numeroSocio} ${l.apellido || ''} ${l.nombre || ''}`.toLowerCase();
        if (!texto.includes(filtros.socio.toLowerCase())) return false;
      }
      if (filtros.categoria && !(l.categoriaNombre || '').toLowerCase().includes(filtros.categoria.toLowerCase())) return false;
      if (filtros.mes && l.mes !== filtros.mes) return false;
      if (filtros.estado === 'pagado' && !l.pagado) return false;
      if (filtros.estado === 'pendiente' && l.pagado) return false;
      return true;
    });
  }, [liquidaciones, filtros]);

  const liquidacionesOrdenadas = useMemo(() => {
    if (!ordenColumna) return liquidacionesFiltradas;
    const { columna, direccion } = ordenColumna;
    return [...liquidacionesFiltradas].sort((a, b) => {
      let comparacion = 0;
      switch (columna) {
        case 'numeroSocio':
          comparacion = a.numeroSocio - b.numeroSocio;
          break;
        case 'apellido':
          comparacion = (a.apellido || '').localeCompare(b.apellido || '');
          break;
        case 'nombre':
          comparacion = (a.nombre || '').localeCompare(b.nombre || '');
          break;
        case 'categoria':
          comparacion = (a.categoriaNombre || '').localeCompare(b.categoriaNombre || '');
          break;
        case 'mes':
          comparacion = (a.mes || '').localeCompare(b.mes || '');
          break;
        case 'fechaLiquidacion':
          comparacion = (a.fechaLiquidacion || '').localeCompare(b.fechaLiquidacion || '');
          break;
        case 'monto':
          comparacion = a.monto - b.monto;
          break;
        case 'estado':
          comparacion = (a.pagado ? 1 : 0) - (b.pagado ? 1 : 0);
          break;
        case 'fechaPago':
          comparacion = (a.fechaPago || '').localeCompare(b.fechaPago || '');
          break;
        case 'medioPago':
          comparacion = (a.medioPago || '').localeCompare(b.medioPago || '');
          break;
        default:
          return 0;
      }
      return direccion === 'asc' ? comparacion : -comparacion;
    });
  }, [liquidacionesFiltradas, ordenColumna]);

  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>();
    liquidaciones.forEach((l) => { if (l.mes) meses.add(l.mes); });
    return Array.from(meses).sort().reverse();
  }, [liquidaciones]);

  const categoriasDisponibles = useMemo(() => {
    const cats = new Set<string>();
    liquidaciones.forEach((l) => { if (l.categoriaNombre) cats.add(l.categoriaNombre); });
    return Array.from(cats).sort();
  }, [liquidaciones]);

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

  const th = (id: string, label: string) =>
    isVisible(id) ? (
      <th className="sortable" onClick={() => handleOrdenar(id)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        {label}
        {ordenColumna?.columna === id && (
          <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
        )}
      </th>
    ) : null;

  if (liquidaciones.length === 0) {
    return (
      <div className="tabla-vacia">
        <p>No hay liquidaciones para mostrar.</p>
        <p className="subtitulo">Genera una liquidación mensual para comenzar.</p>
      </div>
    );
  }

  return (
    <div className="tabla-liquidaciones-container">
      <div className="resumen-liquidaciones">
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
          <span className="resumen-label">Cantidad de Cuotas:</span>
          <span className="resumen-valor">{liquidacionesFiltradas.length}</span>
        </div>
      </div>

      <div className="filtros-liquidaciones">
        <div className="filtro-group">
          <label htmlFor="filtro-socio-liq">Socio:</label>
          <input
            type="text"
            id="filtro-socio-liq"
            placeholder="N° socio, apellido, nombre"
            value={filtros.socio}
            onChange={(e) => setFiltros((p) => ({ ...p, socio: e.target.value }))}
          />
        </div>
        <div className="filtro-group">
          <label htmlFor="filtro-categoria-liq">Categoría:</label>
          <select
            id="filtro-categoria-liq"
            value={filtros.categoria}
            onChange={(e) => setFiltros((p) => ({ ...p, categoria: e.target.value }))}
          >
            <option value="">Todas</option>
            {categoriasDisponibles.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="filtro-group">
          <label htmlFor="filtro-mes-liq">Mes:</label>
          <select
            id="filtro-mes-liq"
            value={filtros.mes}
            onChange={(e) => setFiltros((p) => ({ ...p, mes: e.target.value }))}
          >
            <option value="">Todos</option>
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>{getNombreMes(m)}</option>
            ))}
          </select>
        </div>
        <div className="filtro-group">
          <label htmlFor="filtro-estado-liq">Estado:</label>
          <select
            id="filtro-estado-liq"
            value={filtros.estado}
            onChange={(e) => setFiltros((p) => ({ ...p, estado: e.target.value as FiltrosLiquidaciones['estado'] }))}
          >
            <option value="">Todos</option>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </div>
        <div className="filtro-acciones">
          <button type="button" className="btn-limpiar" onClick={() => setFiltros({ socio: '', categoria: '', mes: '', estado: '' })}>
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="tabla-acciones-liquidaciones">
        <SelectorColumnas
          columnas={LIQUIDACIONES_COLUMNS}
          visibleIds={visible}
          onToggle={toggleColumn}
          onRestaurar={() => setVisibleColumns(LIQUIDACIONES_DEFAULT_VISIBLE)}
        />
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-liquidaciones">
          <thead>
            <tr>
              {th('numeroSocio', 'N° Socio')}
              {th('apellido', 'Apellido')}
              {th('nombre', 'Nombre')}
              {th('categoria', 'Categoría')}
              {th('mes', 'Mes')}
              {th('fechaLiquidacion', 'Fecha Liquidación')}
              {th('monto', 'Monto')}
              {th('estado', 'Estado')}
              {th('fechaPago', 'Fecha Pago')}
              {th('medioPago', 'Medio de Pago')}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {liquidacionesOrdenadas.map(liquidacion => (
              <tr key={liquidacion.id} className={liquidacion.pagado ? 'pagado' : ''}>
                {isVisible('numeroSocio') && <td>{liquidacion.numeroSocio}</td>}
                {isVisible('apellido') && <td>{liquidacion.apellido}</td>}
                {isVisible('nombre') && <td>{liquidacion.nombre}</td>}
                {isVisible('categoria') && <td>{liquidacion.categoriaNombre}</td>}
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
                {isVisible('fechaPago') && <td>{formatFecha(liquidacion.fechaPago)}</td>}
                {isVisible('medioPago') && <td>{liquidacion.medioPago ?? '-'}</td>}
                <td>
                  <div className="acciones">
                    {!liquidacion.pagado ? (
                      <button
                        onClick={() => onMarcarPagado(liquidacion.id)}
                        className="btn-accion btn-pagar"
                        title="Marcar como Pagado"
                      >
                        ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => onMarcarNoPagado(liquidacion.id)}
                        className="btn-accion btn-desmarcar"
                        title="Marcar como No Pagado"
                      >
                        ✗
                      </button>
                    )}
                    <button
                      onClick={() => onBorrar(liquidacion.id)}
                      className="btn-accion btn-borrar"
                      title="Borrar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

