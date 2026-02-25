import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { SelectorColumnas } from './SelectorColumnas';
import type { LiquidacionCuota, LiquidacionMensual } from '../types';
import './TablaLiquidacionesMensuales.css';

const LIQUIDACIONES_COLUMNS = [
  { id: 'mes', label: 'Mes' },
  { id: 'fechaLiquidacion', label: 'Fecha de Liquidación' },
  { id: 'socios', label: 'Socios' },
  { id: 'totalLiquidado', label: 'Total Liquidado' },
  { id: 'totalCobrado', label: 'Total Cobrado' },
  { id: 'totalPendiente', label: 'Total Pendiente' },
  { id: 'acciones', label: 'Acciones' },
];
const LIQUIDACIONES_DEFAULT_VISIBLE = LIQUIDACIONES_COLUMNS.map((c) => c.id);

interface TablaLiquidacionesMensualesProps {
  liquidacionesMensuales: LiquidacionMensual[];
  liquidacionesCuotas: LiquidacionCuota[];
  onVerDetalle: (mes: string) => void;
  onImprimir: (mes: string) => void;
  onBorrar: (mes: string) => void;
  onEnviarWhatsApp?: (mes: string) => void;
  /** Botones adicionales para mostrar en la misma línea que el selector de columnas */
  extraActions?: React.ReactNode;
}

interface ResumenMensual {
  mes: string;
  fechaLiquidacion: string;
  totalSocios: number;
  totalMonto: number;
  totalPagado: number;
  totalPendiente: number;
}

const getNombreMes = (mesString: string) => {
  if (!mesString) return '-';
  const [año, mes] = mesString.split('-');
  const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
  return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
};

export const TablaLiquidacionesMensuales = ({
  liquidacionesMensuales,
  liquidacionesCuotas,
  onVerDetalle,
  onImprimir,
  onBorrar,
  onEnviarWhatsApp,
  extraActions,
}: TablaLiquidacionesMensualesProps) => {
  const { visibleColumns, setVisibleColumns, toggleColumn, loading: loadingCols } = useColumnPreferences(
    'liquidaciones',
    LIQUIDACIONES_DEFAULT_VISIBLE,
  );
  const visible = loadingCols ? LIQUIDACIONES_DEFAULT_VISIBLE : visibleColumns;
  const isVisible = (id: string) => visible.includes(id);

  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);

  const handleOrdenar = (columna: string) => {
    if (ordenColumna && ordenColumna.columna === columna) {
      setOrdenColumna({ columna, direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const obtenerResumen = (liquidacion: LiquidacionMensual): ResumenMensual => {
    const cuotas = liquidacionesCuotas.filter(
      (cuota) => cuota.liquidacionMensualId === liquidacion.id
    );
    const totalMonto = cuotas.reduce((sum, cuota) => sum + cuota.monto, 0);
    const totalPagado = cuotas.filter((cuota) => cuota.pagado).reduce((sum, cuota) => sum + cuota.monto, 0);
    const totalPendiente = totalMonto - totalPagado;
    return {
      mes: liquidacion.mes,
      fechaLiquidacion: liquidacion.fechaLiquidacion,
      totalSocios: cuotas.length,
      totalMonto,
      totalPagado,
      totalPendiente,
    };
  };

  const liquidacionesOrdenadas = useMemo(() => {
    const list = [...liquidacionesMensuales];
    if (!ordenColumna) return list.sort((a, b) => b.mes.localeCompare(a.mes));
    const { columna, direccion } = ordenColumna;
    return list.sort((a, b) => {
      const resumenA = obtenerResumen(a);
      const resumenB = obtenerResumen(b);
      let comparacion = 0;
      switch (columna) {
        case 'mes':
          comparacion = resumenA.mes.localeCompare(resumenB.mes);
          break;
        case 'fechaLiquidacion':
          comparacion = (resumenA.fechaLiquidacion || '').localeCompare(resumenB.fechaLiquidacion || '');
          break;
        case 'socios':
          comparacion = resumenA.totalSocios - resumenB.totalSocios;
          break;
        case 'totalLiquidado':
          comparacion = resumenA.totalMonto - resumenB.totalMonto;
          break;
        case 'totalCobrado':
          comparacion = resumenA.totalPagado - resumenB.totalPagado;
          break;
        case 'totalPendiente':
          comparacion = resumenA.totalPendiente - resumenB.totalPendiente;
          break;
        default:
          return 0;
      }
      return direccion === 'asc' ? comparacion : -comparacion;
    });
  }, [liquidacionesMensuales, ordenColumna, liquidacionesCuotas]);

  if (liquidacionesMensuales.length === 0) {
    return (
      <div className="tabla-liquidaciones-mensuales-container">
        <div className="tabla-wrapper">
          <div className="tabla-acciones-superior">
            <SelectorColumnas
              columnas={LIQUIDACIONES_COLUMNS}
              visibleIds={visible}
              onToggle={toggleColumn}
              onRestaurar={() => setVisibleColumns(LIQUIDACIONES_DEFAULT_VISIBLE)}
              titulo="Columnas visibles"
            />
            {extraActions}
          </div>
          <div className="tabla-vacia">
            <p>No hay liquidaciones mensuales registradas.</p>
            <p className="subtitulo">Genera una liquidación mensual para comenzar.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tabla-liquidaciones-mensuales-container">
      <div className="tabla-wrapper">
        <div className="tabla-acciones-superior">
          <SelectorColumnas
            columnas={LIQUIDACIONES_COLUMNS}
            visibleIds={visible}
            onToggle={toggleColumn}
            onRestaurar={() => setVisibleColumns(LIQUIDACIONES_DEFAULT_VISIBLE)}
            titulo="Columnas visibles"
          />
          {extraActions}
        </div>
        <table className="tabla-liquidaciones-mensuales">
          <thead>
            <tr>
              {isVisible('mes') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('mes')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Mes
                  {ordenColumna?.columna === 'mes' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('fechaLiquidacion') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('fechaLiquidacion')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Fecha de Liquidación
                  {ordenColumna?.columna === 'fechaLiquidacion' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('socios') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('socios')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Socios
                  {ordenColumna?.columna === 'socios' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('totalLiquidado') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('totalLiquidado')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Total Liquidado
                  {ordenColumna?.columna === 'totalLiquidado' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('totalCobrado') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('totalCobrado')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Total Cobrado
                  {ordenColumna?.columna === 'totalCobrado' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('totalPendiente') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('totalPendiente')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Total Pendiente
                  {ordenColumna?.columna === 'totalPendiente' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              )}
              {isVisible('acciones') && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {liquidacionesOrdenadas.map((liquidacion) => {
              const resumen = obtenerResumen(liquidacion);
              return (
                <tr key={liquidacion.id}>
                  {isVisible('mes') && <td className="col-mes">{getNombreMes(resumen.mes)}</td>}
                  {isVisible('fechaLiquidacion') && (
                    <td>
                      {resumen.fechaLiquidacion
                        ? format(new Date(resumen.fechaLiquidacion), 'dd/MM/yyyy')
                        : '-'}
                    </td>
                  )}
                  {isVisible('socios') && <td>{resumen.totalSocios}</td>}
                  {isVisible('totalLiquidado') && <td className="monto">${resumen.totalMonto.toFixed(2)}</td>}
                  {isVisible('totalCobrado') && <td className="monto pagado">${resumen.totalPagado.toFixed(2)}</td>}
                  {isVisible('totalPendiente') && <td className="monto pendiente">${resumen.totalPendiente.toFixed(2)}</td>}
                  {isVisible('acciones') && (
                    <td>
                      <div className="acciones">
                        <button
                          onClick={() => onVerDetalle(resumen.mes)}
                          className="btn-accion btn-detalle"
                          title="Ver detalle"
                        >
                          🔍
                        </button>
                        <button
                          onClick={() => onImprimir(resumen.mes)}
                          className="btn-accion btn-imprimir"
                          title="Imprimir mes"
                        >
                          🖨️
                        </button>
                        {onEnviarWhatsApp && (
                          <button
                            onClick={() => onEnviarWhatsApp(resumen.mes)}
                            className="btn-accion btn-whatsapp"
                            title="Enviar por WhatsApp"
                          >
                            📱
                          </button>
                        )}
                        <button
                          onClick={() => onBorrar(resumen.mes)}
                          className="btn-accion btn-borrar"
                          title="Borrar liquidación mensual"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


