import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dibujarEncabezadoConLogo } from '../utils/pdfLogo';
import type { LiquidacionCuota } from '../types';
import './ImprimirTesoreria.css';

type PagoConInfo = LiquidacionCuota & {
  mes: string;
  fechaLiquidacion: string;
  monto: number;
  categoriaNombre: string;
};

interface ImprimirTesoreriaProps {
  pagosPorMedio: Record<string, PagoConInfo[]>;
  totalesPorMedio: Record<string, number>;
  totalGeneral: number;
  filtros: {
    fechaDesde: string;
    fechaHasta: string;
    medioPago: string;
  };
  onVolver: () => void;
}

export const ImprimirTesoreria = ({
  pagosPorMedio,
  totalesPorMedio,
  totalGeneral,
  filtros,
  onVolver,
}: ImprimirTesoreriaProps) => {
  const handleExportarPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait' });
    const fecha = new Date().toLocaleString('es-AR');

    // Encabezado con logo
    dibujarEncabezadoConLogo(doc, 'portrait');

    // Título del informe
    doc.setTextColor(45, 55, 72);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Informe de Tesorería', 105, 48, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let yPos = 56;
    doc.text(`Fecha de generación: ${fecha}`, 14, yPos);
    yPos += 6;
    doc.text(`Filtros aplicados: ${getFiltrosTexto()}`, 14, yPos);
    yPos += 6;
    doc.text(`Total General: $${totalGeneral.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`, 14, yPos);
    yPos += 10;

    // Resumen por medio de pago
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Resumen por Medio de Pago', 14, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    Object.entries(totalesPorMedio)
      .sort(([, a], [, b]) => b - a)
      .forEach(([medio, total]) => {
        doc.text(`${medio}: $${total.toLocaleString('es-AR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`, 20, yPos);
        yPos += 6;
      });

    yPos += 5;

    // Detalle por medio de pago
    Object.entries(pagosPorMedio)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([medio, pagosMedio]) => {
        if (yPos > 250) {
          doc.addPage();
          dibujarEncabezadoConLogo(doc, 'portrait');
          yPos = 48;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`${medio} - ${pagosMedio.length} cobro${pagosMedio.length !== 1 ? 's' : ''} - Total: $${totalesPorMedio[medio].toLocaleString('es-AR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`, 14, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          headStyles: {
            fillColor: [102, 126, 234],
            textColor: 255,
            fontSize: 9,
          },
          bodyStyles: {
            textColor: 45,
            fontSize: 8,
          },
          head: [['Fecha Cobro', 'N° Socio', 'Apellido', 'Nombre', 'Categoría', 'Mes Liquidación', 'Monto']],
          body: pagosMedio
            .sort((a, b) => (b.fechaPago || '').localeCompare(a.fechaPago || ''))
            .map((pago) => [
              formatFecha(pago.fechaPago),
              pago.numeroSocio.toString(),
              pago.apellido,
              pago.nombre,
              pago.categoriaNombre,
              getNombreMes(pago.mes),
              `$${pago.monto.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
            ]),
          didDrawPage: (data) => {
            if (data.pageNumber > 1 && data.cursor && data.cursor.y < 50) {
              dibujarEncabezadoConLogo(doc, 'portrait');
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

        yPos = (doc as any).lastAutoTable.finalY + 10;
      });

    doc.save(`Informe-Tesoreria-${Date.now()}.pdf`);
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
    if (!mesString) return '-';
    const [año, mes] = mesString.split('-');
    const fecha = new Date(parseInt(año, 10), parseInt(mes, 10) - 1, 1);
    return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  const getFiltrosTexto = () => {
    const filtrosTexto: string[] = [];
    if (filtros.fechaDesde) filtrosTexto.push(`Desde: ${formatFecha(filtros.fechaDesde)}`);
    if (filtros.fechaHasta) filtrosTexto.push(`Hasta: ${formatFecha(filtros.fechaHasta)}`);
    if (filtros.medioPago) filtrosTexto.push(`Medio: ${filtros.medioPago}`);
    return filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Sin filtros';
  };

  // Verificar si hay datos
  const tieneDatos = Object.keys(pagosPorMedio).length > 0;

  return (
    <div className="imprimir-tesoreria">
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
          <h1>Informe de Tesorería</h1>
          <h2>Club Social y Deportivo Realicó</h2>
          <p className="fecha-impresion">Fecha de impresión: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p className="filtros-aplicados">{getFiltrosTexto()}</p>
        </div>

        {!tieneDatos ? (
          <div className="sin-datos-impresion">
            <p>No hay datos para mostrar con los filtros aplicados.</p>
          </div>
        ) : (
          <>
            <div className="resumen-impresion">
              <div className="resumen-item resumen-total">
                <span className="resumen-label">Total General</span>
                <span className="resumen-valor">${totalGeneral.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</span>
              </div>
              {Object.entries(totalesPorMedio)
                .sort(([, a], [, b]) => b - a)
                .map(([medio, total]) => (
                  <div key={medio} className="resumen-item">
                    <span className="resumen-label">{medio}</span>
                    <span className="resumen-valor">${total.toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}</span>
                  </div>
                ))}
            </div>

            {Object.entries(pagosPorMedio)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([medio, pagosMedio]) => (
                <div key={medio} className="medio-section-impresion">
                  <div className="medio-header-impresion">
                    <h3>{medio}</h3>
                    <span className="medio-cantidad-impresion">
                      {pagosMedio.length} cobro{pagosMedio.length !== 1 ? 's' : ''} - Total: $
                      {totalesPorMedio[medio].toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <table className="tabla-imprimir">
                    <thead>
                      <tr>
                        <th>Fecha Cobro</th>
                        <th>N° Socio</th>
                        <th>Apellido</th>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Mes Liquidación</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagosMedio
                        .sort((a, b) => (b.fechaPago || '').localeCompare(a.fechaPago || ''))
                        .map((pago) => (
                          <tr key={pago.id}>
                            <td>{formatFecha(pago.fechaPago)}</td>
                            <td>{pago.numeroSocio}</td>
                            <td>{pago.apellido}</td>
                            <td>{pago.nombre}</td>
                            <td>{pago.categoriaNombre}</td>
                            <td>{getNombreMes(pago.mes)}</td>
                            <td className="monto">
                              ${pago.monto.toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
};

