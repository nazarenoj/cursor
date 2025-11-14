import { format } from 'date-fns';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useCategorias } from '../hooks/useCategorias';
import type { Socio } from '../types';
import './LiquidacionesSocio.css';

interface LiquidacionesSocioProps {
  socio: Socio;
  onVolver: () => void;
}

export const LiquidacionesSocio = ({ socio, onVolver }: LiquidacionesSocioProps) => {
  const { listarLiquidaciones, liquidacionesMensuales } = useLiquidaciones();
  const { getCategoriaById } = useCategorias();
  const cuotas = listarLiquidaciones().filter(l => l.socioId === socio.id);
  
  // Agregar información de mes y fecha de liquidación a las cuotas
  const liquidaciones = cuotas.map(cuota => {
    const liquidacionMensual = liquidacionesMensuales.find(lm => lm.id === cuota.liquidacionMensualId);
    return {
      ...cuota,
      mes: liquidacionMensual?.mes || '',
      fechaLiquidacion: liquidacionMensual?.fechaLiquidacion || '',
    };
  }).sort((a, b) => {
    if (b.mes !== a.mes) {
      return b.mes.localeCompare(a.mes);
    }
    return (b.fechaLiquidacion || '').localeCompare(a.fechaLiquidacion || '');
  });
  
  const categoria = getCategoriaById(socio.categoriaId);
  const nombreCategoria = categoria?.nombre || 'Sin categoría';

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy');
    } catch {
      return fecha;
    }
  };

  const getNombreMes = (mesString: string) => {
    const [año, mes] = mesString.split('-');
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  const totalMonto = liquidaciones.reduce((sum, l) => sum + l.monto, 0);
  const totalPagado = liquidaciones.filter(l => l.pagado).reduce((sum, l) => sum + l.monto, 0);
  const totalPendiente = totalMonto - totalPagado;
  const cantidadPagadas = liquidaciones.filter(l => l.pagado).length;
  return (
    <div className="liquidaciones-socio">
      <div className="liquidaciones-header">
        <button onClick={onVolver} className="btn-volver">
          ← Volver a Socios
        </button>
        <h1>Liquidaciones de {socio.apellido}, {socio.nombre}</h1>
        <p className="socio-info">
          N° Socio: {socio.numeroSocio} | DNI: {socio.dni} | Categoría: {nombreCategoria}
        </p>
      </div>

      {liquidaciones.length === 0 ? (
        <div className="sin-liquidaciones">
          <p>Este socio no tiene liquidaciones registradas.</p>
          <p className="subtitulo">Las liquidaciones se generan desde la sección "Liquidaciones".</p>
        </div>
      ) : (
        <>
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
              <span className="resumen-valor">{cantidadPagadas} / {liquidaciones.length}</span>
            </div>
          </div>

          <div className="tabla-wrapper">
            <table className="tabla-liquidaciones-socio">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Fecha Liquidación</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha Pago</th>
                  <th>Medio de Pago</th>
                </tr>
              </thead>
              <tbody>
                {liquidaciones.map(liquidacion => (
                  <tr key={liquidacion.id} className={liquidacion.pagado ? 'pagado' : ''}>
                    <td>{getNombreMes(liquidacion.mes)}</td>
                    <td>{formatFecha(liquidacion.fechaLiquidacion)}</td>
                    <td className="monto">${liquidacion.monto.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${liquidacion.pagado ? 'badge-pagado' : 'badge-pendiente'}`}>
                        {liquidacion.pagado ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td>{formatFecha(liquidacion.fechaPago)}</td>
                    <td>{liquidacion.medioPago ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

