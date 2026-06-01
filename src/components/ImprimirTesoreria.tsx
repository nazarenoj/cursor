import { format } from 'date-fns';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { dibujarEncabezadoConLogo } from '../utils/pdfLogo';
import { apiService } from '../services/api';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import type { LiquidacionCuota } from '../types';
import { formatDateOnlyES } from '../utils/clubDateTime';
import './ImprimirTesoreria.css';

const TESORERIA_DETALLE_IDS = [
  'medioPago',
  'fechaPago',
  'numeroSocio',
  'apellido',
  'nombre',
  'categoria',
  'mesLiquidacion',
  'monto',
];

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
    socioTexto?: string;
    categoriaId?: string;
    mesLiquidacion?: string;
    socioNombre?: string;
    categoriaNombre?: string;
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
  const { nombreClub } = useClubConfig();
  const { visibleColumns } = useColumnPreferences('tesoreria-detalle', TESORERIA_DETALLE_IDS);
  const handleExportarPdf = async () => {
    // Registrar exportación en auditoría
    try {
      const totalRegistros = Object.values(pagosPorMedio).reduce((sum, pagos) => sum + pagos.length, 0);
      await apiService.registrarExportacion('tesoreria', 'PDF', {
        total: totalRegistros,
        fechaDesde: filtros.fechaDesde,
        fechaHasta: filtros.fechaHasta,
        medioPago: filtros.medioPago,
      });
    } catch (error) {
      console.error('Error al registrar exportación:', error);
    }

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ orientation: 'portrait' });
    const fecha = new Date().toLocaleString('es-AR');

    // Encabezado con logo
    dibujarEncabezadoConLogo(doc, 'portrait', nombreClub);

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
          dibujarEncabezadoConLogo(doc, 'portrait', nombreClub);
          yPos = 48;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`${medio} - ${pagosMedio.length} cobro${pagosMedio.length !== 1 ? 's' : ''} - Total: $${totalesPorMedio[medio].toLocaleString('es-AR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`, 14, yPos);
        yPos += 8;

        const ids = visibleColumns.length > 0 ? visibleColumns : TESORERIA_DETALLE_IDS;
        const pdfIds = ids.filter((id) => id !== 'medioPago');
        const headersRow = pdfIds.map((id) => TESORERIA_HEADERS[id] || id);
        if (headersRow.length === 0) {
          yPos += 10;
          return;
        }
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
          head: [headersRow],
          body: pagosMedio
            .sort((a, b) => (b.fechaPago || '').localeCompare(a.fechaPago || ''))
            .map((pago) =>
              pdfIds.map((id) => {
                if (id === 'fechaPago') return formatFecha(pago.fechaPago);
                if (id === 'numeroSocio') return pago.numeroSocio.toString();
                if (id === 'apellido') return pago.apellido;
                if (id === 'nombre') return pago.nombre;
                if (id === 'categoria') return pago.categoriaNombre;
                if (id === 'mesLiquidacion') return getNombreMes(pago.mes);
                if (id === 'monto') return `$${pago.monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                return '';
              }),
            ),
          didDrawPage: (data) => {
            if (data.pageNumber > 1 && data.cursor && data.cursor.y < 50) {
              dibujarEncabezadoConLogo(doc, 'portrait', nombreClub);
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

        yPos = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 10;
      });

    doc.save(`Informe-Tesoreria-${Date.now()}.pdf`);
  };

  const formatFecha = (fecha: string | null) => {
    return formatDateOnlyES(fecha);
  };

  const getNombreMes = (mesString: string) => {
    if (!mesString) return '-';
    const [año, mes] = mesString.split('-');
    const fecha = new Date(parseInt(año, 10), parseInt(mes, 10) - 1, 1);
    return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  const TESORERIA_HEADERS: Record<string, string> = {
    medioPago: 'Medio de Pago',
    fechaPago: 'Fecha Cobro',
    numeroSocio: 'N° Socio',
    apellido: 'Apellido',
    nombre: 'Nombre',
    categoria: 'Categoría',
    mesLiquidacion: 'Mes Liquidación',
    monto: 'Monto',
  };

  const getFiltrosTexto = () => {
    const filtrosTexto: string[] = [];
    if (filtros.fechaDesde) filtrosTexto.push(`Desde: ${formatFecha(filtros.fechaDesde)}`);
    if (filtros.fechaHasta) filtrosTexto.push(`Hasta: ${formatFecha(filtros.fechaHasta)}`);
    if (filtros.medioPago) filtrosTexto.push(`Medio: ${filtros.medioPago}`);
    if (filtros.socioNombre) filtrosTexto.push(`Socio: ${filtros.socioNombre}`);
    if (filtros.categoriaNombre) filtrosTexto.push(`Categoría: ${filtros.categoriaNombre}`);
    if (filtros.mesLiquidacion) filtrosTexto.push(`Mes: ${filtros.mesLiquidacion}`);
    return filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Sin filtros';
  };

  const handleExportarExcel = async () => {
    const totalRegistros = Object.values(pagosPorMedio).reduce((sum, pagos) => sum + pagos.length, 0);
    if (totalRegistros === 0) return;
    try {
      apiService.registrarExportacion('tesoreria', 'Excel', {
        total: totalRegistros,
        fechaDesde: filtros.fechaDesde,
        fechaHasta: filtros.fechaHasta,
        medioPago: filtros.medioPago,
      }).catch(console.warn);
    } catch (e) {
      console.warn(e);
    }
    const ids = visibleColumns.length > 0 ? visibleColumns : TESORERIA_DETALLE_IDS;
    const headers: Record<string, string> = {
      medioPago: 'Medio de Pago',
      fechaPago: 'Fecha Cobro',
      numeroSocio: 'N° Socio',
      apellido: 'Apellido',
      nombre: 'Nombre',
      categoria: 'Categoría',
      mesLiquidacion: 'Mes Liquidación',
      monto: 'Monto',
    };
    const data: Record<string, string | number>[] = [];
    Object.entries(pagosPorMedio)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([medio, pagosMedio]) => {
        pagosMedio
          .sort((a, b) => (b.fechaPago || '').localeCompare(a.fechaPago || ''))
          .forEach((pago) => {
            const row: Record<string, string | number> = {};
            ids.forEach((id) => {
              if (id === 'medioPago') row[headers.medioPago] = medio;
              else if (id === 'fechaPago') row[headers.fechaPago] = formatFecha(pago.fechaPago);
              else if (id === 'numeroSocio') row[headers.numeroSocio] = pago.numeroSocio;
              else if (id === 'apellido') row[headers.apellido] = pago.apellido;
              else if (id === 'nombre') row[headers.nombre] = pago.nombre;
              else if (id === 'categoria') row[headers.categoria] = pago.categoriaNombre;
              else if (id === 'mesLiquidacion') row[headers.mesLiquidacion] = getNombreMes(pago.mes);
              else if (id === 'monto') row[headers.monto] = pago.monto;
            });
            data.push(row);
          });
      });
    if (data.length > 0 && Object.keys(data[0]).length > 0) {
      const { exportToExcel } = await import('../utils/exportExcel');
      exportToExcel(data, `Informe-Tesoreria-${Date.now()}`, 'Tesoreria');
    }
  };

  // Verificar si hay datos
  const tieneDatos = Object.keys(pagosPorMedio).length > 0;

  return (
    <div className="imprimir-tesoreria">
      <div className="imprimir-controls no-print">
        <button onClick={handleExportarPdf} className="btn-imprimir">
          📄 Exportar PDF
        </button>
        <button onClick={handleExportarExcel} className="btn-imprimir btn-exportar-excel">
          📊 Exportar Excel
        </button>
        <button onClick={onVolver} className="btn-volver">
          ← Volver
        </button>
      </div>

      <div className="imprimir-content">
        <div className="imprimir-header">
          <h1>Informe de Tesorería</h1>
          <h2>{nombreClub}</h2>
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

