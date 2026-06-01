import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import type { MovimientoCaja, Caja } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDateOnlyES } from '../utils/clubDateTime';
import './ResumenCaja.css';

interface ResumenCajaProps {
  caja: Caja;
  onClose: () => void;
}

export const ResumenCaja = ({ caja, onClose }: ResumenCajaProps) => {
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    fechaDesde: '',
    fechaHasta: '',
    tipo: '' as '' | 'ingreso' | 'egreso',
  });

  const cargarMovimientos = async () => {
    setLoading(true);
    setError('');
    try {
      const filtrosParaEnviar: {
        fechaDesde?: string;
        fechaHasta?: string;
        tipo?: 'ingreso' | 'egreso';
      } = {};
      
      if (filtros.fechaDesde) {
        filtrosParaEnviar.fechaDesde = filtros.fechaDesde;
      }
      if (filtros.fechaHasta) {
        filtrosParaEnviar.fechaHasta = filtros.fechaHasta;
      }
      if (filtros.tipo) {
        filtrosParaEnviar.tipo = filtros.tipo;
      }

      const data = await apiService.getMovimientosCaja(caja.id, filtrosParaEnviar);
      setMovimientos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMovimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caja.id, filtros.fechaDesde, filtros.fechaHasta, filtros.tipo]);

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaDesde: '',
      fechaHasta: '',
      tipo: '',
    });
  };

  const resumen = useMemo(() => {
    const totalIngresos = movimientos
      .filter((m) => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0);
    const totalEgresos = movimientos
      .filter((m) => m.tipo === 'egreso')
      .reduce((sum, m) => sum + m.monto, 0);
    const saldoPeriodo = totalIngresos - totalEgresos;
    const cantidadIngresos = movimientos.filter((m) => m.tipo === 'ingreso').length;
    const cantidadEgresos = movimientos.filter((m) => m.tipo === 'egreso').length;

    return {
      totalIngresos,
      totalEgresos,
      saldoPeriodo,
      cantidadIngresos,
      cantidadEgresos,
      totalMovimientos: movimientos.length,
    };
  }, [movimientos]);

  const formatearFecha = (fecha: string) => {
    return formatDateOnlyES(fecha);
  };

  const generarPDF = async () => {
    // Registrar exportación en auditoría
    try {
      await apiService.registrarExportacion('cajas', 'PDF', {
        cajaId: caja.id,
        total: movimientos.length,
        fechaDesde: filtros.fechaDesde,
        fechaHasta: filtros.fechaHasta,
        tipo: filtros.tipo,
      });
    } catch (error) {
      console.error('Error al registrar exportación:', error);
    }

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text(`Resumen de Caja/Cuenta: ${caja.nombre}`, 14, 20);
    
    // Información de filtros
    doc.setFontSize(10);
    let yPos = 30;
    if (filtros.fechaDesde || filtros.fechaHasta || filtros.tipo) {
      doc.text('Filtros aplicados:', 14, yPos);
      yPos += 5;
      if (filtros.fechaDesde) {
        doc.text(`Fecha desde: ${formatearFecha(filtros.fechaDesde)}`, 14, yPos);
        yPos += 5;
      }
      if (filtros.fechaHasta) {
        doc.text(`Fecha hasta: ${formatearFecha(filtros.fechaHasta)}`, 14, yPos);
        yPos += 5;
      }
      if (filtros.tipo) {
        doc.text(`Tipo: ${filtros.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}`, 14, yPos);
        yPos += 5;
      }
      yPos += 3;
    }
    
    // Resumen estadístico
    doc.setFontSize(12);
    doc.text('Resumen Estadístico', 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.text(`Saldo Actual de la Caja: $${caja.saldoActual.toFixed(2)}`, 14, yPos);
    yPos += 5;
    doc.text(`Saldo Inicial: $${caja.saldoInicial.toFixed(2)}`, 14, yPos);
    yPos += 5;
    doc.text(`Total Ingresos: $${resumen.totalIngresos.toFixed(2)} (${resumen.cantidadIngresos} movimientos)`, 14, yPos);
    yPos += 5;
    doc.text(`Total Egresos: $${resumen.totalEgresos.toFixed(2)} (${resumen.cantidadEgresos} movimientos)`, 14, yPos);
    yPos += 5;
    doc.text(`Saldo del Período: $${resumen.saldoPeriodo.toFixed(2)}`, 14, yPos);
    yPos += 8;
    
    // Tabla de movimientos
    const tableData = movimientos.map((movimiento) => {
      const conceptoConSocio = movimiento.socioNombre && movimiento.socioApellido
        ? `${movimiento.concepto} - ${movimiento.socioApellido}, ${movimiento.socioNombre}`
        : movimiento.concepto;
      
      return [
        formatearFecha(movimiento.fecha),
        movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        conceptoConSocio,
        movimiento.descripcion || '-',
        movimiento.medioPagoNombre || '-',
        `${movimiento.tipo === 'ingreso' ? '+' : '-'}$${movimiento.monto.toFixed(2)}`,
      ];
    });
    
    (doc as jsPDF & { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
      startY: yPos,
      head: [['Fecha', 'Tipo', 'Concepto', 'Descripción', 'Medio de Pago', 'Monto']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 50 },
        3: { cellWidth: 40 },
        4: { cellWidth: 30 },
        5: { cellWidth: 25, halign: 'right' },
      },
    });
    
    // Fecha de generación
    const fechaGeneracion = new Date().toLocaleString('es-AR');
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Generado el ${fechaGeneracion} - Página ${i} de ${pageCount}`,
        14,
        doc.internal.pageSize.height - 10,
      );
    }
    
    // Guardar PDF
    const nombreArchivo = `Resumen_${caja.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nombreArchivo);
  };

  return (
    <div className="resumen-caja-overlay" onClick={onClose}>
      <div className="resumen-caja-modal" onClick={(e) => e.stopPropagation()}>
        <div className="resumen-caja-header">
          <h2>Resumen de Caja/Cuenta: {caja.nombre}</h2>
          <div className="header-actions">
            <button className="btn-generar-pdf" onClick={generarPDF} title="Generar PDF">
              📄 Generar PDF
            </button>
            <button className="btn-cerrar" onClick={onClose} title="Cerrar">
              ×
            </button>
          </div>
        </div>

        <div className="resumen-caja-filtros">
          <div className="filtro-group">
            <label htmlFor="fechaDesde">Fecha Desde</label>
            <input
              type="date"
              id="fechaDesde"
              name="fechaDesde"
              value={filtros.fechaDesde}
              onChange={handleFiltroChange}
            />
          </div>
          <div className="filtro-group">
            <label htmlFor="fechaHasta">Fecha Hasta</label>
            <input
              type="date"
              id="fechaHasta"
              name="fechaHasta"
              value={filtros.fechaHasta}
              onChange={handleFiltroChange}
            />
          </div>
          <div className="filtro-group">
            <label htmlFor="tipo">Tipo</label>
            <select
              id="tipo"
              name="tipo"
              value={filtros.tipo}
              onChange={handleFiltroChange}
            >
              <option value="">Todos</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>
          <div className="filtro-actions">
            <button type="button" onClick={limpiarFiltros} className="btn-limpiar">
              Limpiar Filtros
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="resumen-caja-stats">
          <div className="stat-card">
            <div className="stat-label">Saldo Actual de la Caja</div>
            <div className={`stat-value ${caja.saldoActual >= 0 ? 'positivo' : 'negativo'}`}>
              ${caja.saldoActual.toFixed(2)}
            </div>
            <div className="stat-count">Saldo inicial: ${caja.saldoInicial.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Ingresos</div>
            <div className="stat-value ingresos">${resumen.totalIngresos.toFixed(2)}</div>
            <div className="stat-count">{resumen.cantidadIngresos} movimientos</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Egresos</div>
            <div className="stat-value egresos">${resumen.totalEgresos.toFixed(2)}</div>
            <div className="stat-count">{resumen.cantidadEgresos} movimientos</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Saldo del Período</div>
            <div className={`stat-value ${resumen.saldoPeriodo >= 0 ? 'positivo' : 'negativo'}`}>
              ${resumen.saldoPeriodo.toFixed(2)}
            </div>
            <div className="stat-count">{resumen.totalMovimientos} movimientos totales</div>
          </div>
        </div>

        {loading ? (
          <div className="resumen-caja-loading">Cargando movimientos...</div>
        ) : (
          <div className="resumen-caja-tabla-wrapper">
            <table className="resumen-caja-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th>Descripción</th>
                  <th>Medio de Pago</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="sin-datos">
                      No hay movimientos para el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  movimientos.map((movimiento) => {
                    const conceptoConSocio = movimiento.socioNombre && movimiento.socioApellido
                      ? `${movimiento.concepto} - ${movimiento.socioApellido}, ${movimiento.socioNombre}`
                      : movimiento.concepto;
                    
                    return (
                      <tr key={movimiento.id}>
                        <td>{formatearFecha(movimiento.fecha)}</td>
                        <td>
                          <span className={`badge-tipo ${movimiento.tipo}`}>
                            {movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </span>
                        </td>
                        <td>{conceptoConSocio}</td>
                        <td>{movimiento.descripcion || '-'}</td>
                        <td>{movimiento.medioPagoNombre || '-'}</td>
                        <td className={movimiento.tipo === 'ingreso' ? 'monto-ingreso' : 'monto-egreso'}>
                          {movimiento.tipo === 'ingreso' ? '+' : '-'}${movimiento.monto.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

