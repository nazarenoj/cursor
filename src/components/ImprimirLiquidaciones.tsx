import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dibujarEncabezadoConLogo } from '../utils/pdfLogo';
import type { LiquidacionCuota } from '../types';
import './ImprimirLiquidaciones.css';

interface ImprimirLiquidacionesProps {
  liquidaciones: (LiquidacionCuota & { mes: string; fechaLiquidacion: string })[];
  mesFiltro: string;
  onVolver: () => void;
}

export const ImprimirLiquidaciones = ({ liquidaciones, mesFiltro, onVolver }: ImprimirLiquidacionesProps) => {
  const handleExportarPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const fecha = new Date().toLocaleString('es-AR');

    // Encabezado con logo
    dibujarEncabezadoConLogo(doc, 'landscape');

    // Información del documento
    doc.setTextColor(45, 55, 72);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Fecha de generación: ${fecha}`, 14, 38);
    if (mesFiltro) {
      doc.text(`Mes: ${getNombreMes(mesFiltro)}`, 14, 45);
    }
    doc.text(`Total de liquidaciones: ${liquidaciones.length}`, 14, 52);
    doc.text(`Total liquidado: $${totalMonto.toFixed(2)}`, 14, 59);
    doc.text(`Total cobrado: $${totalPagado.toFixed(2)}`, 14, 66);
    doc.text(`Total pendiente: $${totalPendiente.toFixed(2)}`, 14, 73);

    // Tabla
    autoTable(doc, {
      startY: 81,
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: 255,
        fontSize: 9,
      },
      bodyStyles: {
        textColor: 45,
        fontSize: 8,
      },
      head: [[
        'N° Socio',
        'Apellido',
        'Nombre',
        'Categoría',
        'Mes',
        'Fecha Liquidación',
        'Monto',
        'Estado',
        'Fecha Pago',
        'Medio de Pago',
      ]],
      body: liquidaciones.map((liquidacion) => [
        liquidacion.numeroSocio.toString(),
        liquidacion.apellido,
        liquidacion.nombre,
        liquidacion.categoriaNombre,
        getNombreMes(liquidacion.mes),
        formatFecha(liquidacion.fechaLiquidacion),
        `$${liquidacion.monto.toFixed(2)}`,
        liquidacion.pagado ? 'Pagado' : 'Pendiente',
        formatFecha(liquidacion.fechaPago),
        liquidacion.medioPago ?? '-',
      ]),
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          dibujarEncabezadoConLogo(doc, 'landscape');
        }
        const pageCount = doc.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          pageSize.width - 20,
          pageSize.height - 10,
          { align: 'right' },
        );
      },
    });

    doc.save(`Listado-Liquidaciones-${Date.now()}.pdf`);
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
        <button onClick={handleExportarPdf} className="btn-imprimir">
          📄 Exportar PDF
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
            <span className="resumen-label">Total Cobrado:</span>
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

