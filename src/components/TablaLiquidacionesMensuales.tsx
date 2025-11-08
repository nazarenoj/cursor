import { format } from 'date-fns';
import type { LiquidacionCuota, LiquidacionMensual } from '../types';
import './TablaLiquidacionesMensuales.css';

interface TablaLiquidacionesMensualesProps {
  liquidacionesMensuales: LiquidacionMensual[];
  liquidacionesCuotas: LiquidacionCuota[];
  onVerDetalle: (mes: string) => void;
  onImprimir: (mes: string) => void;
  onBorrar: (mes: string) => void;
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
}: TablaLiquidacionesMensualesProps) => {
  if (liquidacionesMensuales.length === 0) {
    return (
      <div className="tabla-vacia">
        <p>No hay liquidaciones mensuales registradas.</p>
        <p className="subtitulo">Genera una liquidación mensual para comenzar.</p>
      </div>
    );
  }

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

  const liquidacionesOrdenadas = [...liquidacionesMensuales].sort((a, b) =>
    b.mes.localeCompare(a.mes)
  );

  return (
    <div className="tabla-liquidaciones-mensuales-container">
      <div className="tabla-wrapper">
        <table className="tabla-liquidaciones-mensuales">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Fecha de Liquidación</th>
              <th>Socios</th>
              <th>Total Liquidado</th>
              <th>Total Pagado</th>
              <th>Total Pendiente</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {liquidacionesOrdenadas.map((liquidacion) => {
              const resumen = obtenerResumen(liquidacion);
              return (
                <tr key={liquidacion.id}>
                  <td className="col-mes">{getNombreMes(resumen.mes)}</td>
                  <td>
                    {resumen.fechaLiquidacion
                      ? format(new Date(resumen.fechaLiquidacion), 'dd/MM/yyyy')
                      : '-'}
                  </td>
                  <td>{resumen.totalSocios}</td>
                  <td className="monto">${resumen.totalMonto.toFixed(2)}</td>
                  <td className="monto pagado">${resumen.totalPagado.toFixed(2)}</td>
                  <td className="monto pendiente">${resumen.totalPendiente.toFixed(2)}</td>
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
                      <button
                        onClick={() => onBorrar(resumen.mes)}
                        className="btn-accion btn-borrar"
                        title="Borrar liquidación mensual"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


