import { format } from 'date-fns';
import { useState, useMemo } from 'react';
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
  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);

  const handleOrdenar = (columna: string) => {
    if (ordenColumna && ordenColumna.columna === columna) {
      setOrdenColumna({ columna, direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const liquidacionesOrdenadas = useMemo(() => {
    if (!ordenColumna) return liquidaciones;
    const { columna, direccion } = ordenColumna;
    return [...liquidaciones].sort((a, b) => {
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
  }, [liquidaciones, ordenColumna]);
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

  const th = (id: string, label: string) => (
    <th
      className="sortable"
      onClick={() => handleOrdenar(id)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      {label}
      {ordenColumna?.columna === id && (
        <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
      )}
    </th>
  );

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

