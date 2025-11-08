import { format } from 'date-fns';
import type { LiquidacionCuota } from '../types';
import './ImprimirLiquidaciones.css';

interface ImprimirLiquidacionesProps {
  liquidaciones: (LiquidacionCuota & { mes: string; fechaLiquidacion: string })[];
  mesFiltro: string;
  onVolver: () => void;
}

export const ImprimirLiquidaciones = ({ liquidaciones, mesFiltro, onVolver }: ImprimirLiquidacionesProps) => {
  const handleImprimir = () => {
    window.print();
  };

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

  return (
    <div className="imprimir-liquidaciones">
      <div className="imprimir-controls no-print">
        <button onClick={handleImprimir} className="btn-imprimir">
          🖨️ Imprimir
        </button>
        <button onClick={onVolver} className="btn-volver">
          ← Volver
        </button>
      </div>

      <div className="imprimir-content">
        <div className="imprimir-header">
          <h1>Listado de Liquidaciones Mensuales</h1>
          {mesFiltro && (
            <h2>{getNombreMes(mesFiltro)}</h2>
          )}
          <p className="fecha-impresion">Fecha de impresión: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p className="total-liquidaciones">Total de liquidaciones: {liquidaciones.length}</p>
        </div>

        <div className="resumen-impresion">
          <div className="resumen-item">
            <span className="resumen-label">Total Liquidado:</span>
            <span className="resumen-valor">${totalMonto.toFixed(2)}</span>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Total Pagado:</span>
            <span className="resumen-valor">${totalPagado.toFixed(2)}</span>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Total Pendiente:</span>
            <span className="resumen-valor">${totalPendiente.toFixed(2)}</span>
          </div>
        </div>

        <table className="tabla-imprimir">
          <thead>
            <tr>
              <th>N° Socio</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>Categoría</th>
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
                <td>{liquidacion.numeroSocio}</td>
                <td>{liquidacion.apellido}</td>
                <td>{liquidacion.nombre}</td>
                <td>{liquidacion.categoriaNombre}</td>
                <td>{getNombreMes(liquidacion.mes)}</td>
                <td>{formatFecha(liquidacion.fechaLiquidacion)}</td>
                <td>${liquidacion.monto.toFixed(2)}</td>
                <td>{liquidacion.pagado ? 'Pagado' : 'Pendiente'}</td>
                <td>{formatFecha(liquidacion.fechaPago)}</td>
                <td>{liquidacion.medioPago ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

