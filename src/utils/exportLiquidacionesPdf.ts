import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dibujarEncabezadoConLogo } from './pdfLogo';
import { apiService } from '../services/api';
import type { LiquidacionCuota } from '../types';
import { formatDateOnlyES } from './clubDateTime';

type LiquidacionConMes = LiquidacionCuota & { mes: string; fechaLiquidacion: string };

const formatFecha = (fecha: string | null): string => {
  return formatDateOnlyES(fecha);
};

const getNombreMes = (mesString: string): string => {
  if (!mesString) return '-';
  const [año, mes] = mesString.split('-');
  const fecha = new Date(parseInt(año, 10), parseInt(mes, 10) - 1, 1);
  return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
};

export const exportarLiquidacionesPdf = async (
  liquidaciones: LiquidacionConMes[],
  mesFiltro: string,
  nombreClub: string,
): Promise<void> => {
  if (liquidaciones.length === 0) return;

  try {
    await apiService.registrarExportacion('liquidaciones', 'PDF', {
      total: liquidaciones.length,
      mes: mesFiltro,
    });
  } catch (err) {
    console.warn('No se pudo registrar la exportación en auditoría:', err);
  }

  const totalMonto = liquidaciones.reduce((sum, l) => sum + l.monto, 0);
  const totalPagado = liquidaciones.filter((l) => l.pagado).reduce((sum, l) => sum + l.monto, 0);
  const totalPendiente = totalMonto - totalPagado;

  const doc = new jsPDF({ orientation: 'landscape' });
  const fecha = new Date().toLocaleString('es-AR');

  dibujarEncabezadoConLogo(doc, 'landscape', nombreClub);

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
        dibujarEncabezadoConLogo(doc, 'landscape', nombreClub);
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

export type CuotaConMesYFecha = LiquidacionCuota & { mes: string; fechaLiquidacion: string };

/**
 * PDF de una o más cuotas del mismo contexto (p. ej. adjunto WhatsApp vía Baileys).
 * No descarga archivo; devuelve base64 para la API.
 */
export function liquidacionCuotasToPdfBase64(
  cuotas: CuotaConMesYFecha[],
  nombreClub: string,
): { base64: string; fileName: string } {
  if (!cuotas.length) throw new Error('Sin cuotas para generar PDF');
  const primera = cuotas[0];
  const doc = new jsPDF({ orientation: 'portrait' });

  dibujarEncabezadoConLogo(doc, 'portrait', nombreClub);
  doc.setTextColor(45, 55, 72);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Detalle de liquidación', 14, 48);
  doc.setFont('normal');
  doc.setFontSize(10);
  doc.text(`${primera.apellido}, ${primera.nombre} — Socio N° ${primera.numeroSocio}`, 14, 56);
  const fecha = new Date().toLocaleString('es-AR');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generado: ${fecha}`, 14, 63);

  autoTable(doc, {
    startY: 68,
    headStyles: { fillColor: [102, 126, 234], textColor: 255, fontSize: 9 },
    bodyStyles: { textColor: 45, fontSize: 8 },
    head: [['Categoría', 'Mes', 'F. liquidación', 'Monto', 'Estado', 'F. pago', 'Medio']],
    body: cuotas.map((c) => [
      c.categoriaNombre,
      getNombreMes(c.mes),
      formatFecha(c.fechaLiquidacion),
      `$${c.monto.toFixed(2)}`,
      c.pagado ? 'Pagado' : 'Pendiente',
      formatFecha(c.fechaPago),
      c.medioPago ?? '-',
    ]),
  });

  const mesTag = cuotas.length === 1 ? (primera.mes || 'mes').replace(/[^\w-]/g, '') : `${cuotas.length}-cuotas`;
  const fileName = `Liquidacion-${primera.numeroSocio}-${mesTag}.pdf`;
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.includes(',') ? dataUri.slice(dataUri.indexOf(',') + 1) : dataUri;
  return { base64, fileName };
}
