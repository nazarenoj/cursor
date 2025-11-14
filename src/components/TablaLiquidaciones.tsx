import { format } from 'date-fns';
import type { LiquidacionCuota } from '../types';
import './TablaLiquidaciones.css';

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
          <span className="resumen-valor">{liquidaciones.length}</span>
        </div>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-liquidaciones">
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
              <th>Acciones</th>
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
                <td className="monto">${liquidacion.monto.toFixed(2)}</td>
                <td>
                  <span className={`badge ${liquidacion.pagado ? 'badge-pagado' : 'badge-pendiente'}`}>
                    {liquidacion.pagado ? 'Pagado' : 'Pendiente'}
                  </span>
                </td>
                <td>{formatFecha(liquidacion.fechaPago)}</td>
                <td>{liquidacion.medioPago ?? '-'}</td>
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

