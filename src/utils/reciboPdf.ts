import jsPDF from 'jspdf';
import { dibujarEncabezadoConLogo } from './pdfLogo';
import { getNombreMesRecibo } from './formatRecibo';

export { getNombreMesRecibo };

export interface ReciboCuotaLinea {
  mes: string;
  fechaLiquidacion: string;
  monto: number;
}

export interface ReciboSocioMin {
  numeroSocio: number;
  apellido: string;
  nombre: string;
}

export interface GenerarReciboParams {
  socio: ReciboSocioMin;
  /** Texto de medios ya formateado (ej. "Efectivo: $500 | Tarjeta: $200"). Se usa si no se pasa mediosDetalle. */
  medios?: string;
  /** Detalle por ítem (puede haber varios por mismo medio). En el PDF se sumariza por medio y solo se muestra el resumen. */
  mediosDetalle?: { medio: string; monto: number }[];
  cuotas: ReciboCuotaLinea[];
  total: number;
  nombreClub: string;
  numeroRecibo?: number;
  /** Fecha de emisión original del recibo (para reimpresión). */
  fechaEmision?: string | Date | null;
}

/**
 * Genera el PDF del recibo de pago y devuelve la URL del blob y el nombre del archivo.
 * Si se pasa mediosDetalle, en el PDF se sumarizan los montos por medio (un total por medio), sin discriminar por liquidación.
 */
export const generarRecibo = ({
  socio,
  medios,
  mediosDetalle,
  cuotas,
  total,
  nombreClub,
  numeroRecibo,
  fechaEmision,
}: GenerarReciboParams): { url: string; nombre: string } => {
  const doc = new jsPDF();
  const fechaBase = fechaEmision ? new Date(fechaEmision) : new Date();
  const fechaHoy = Number.isNaN(fechaBase.getTime())
    ? new Date().toLocaleString('es-AR')
    : fechaBase.toLocaleString('es-AR');

  // Texto de medios para el PDF: sumarizado por medio si hay detalle, sino el string recibido
  const textoMedios =
    mediosDetalle && mediosDetalle.length > 0
      ? (() => {
          const porMedio = new Map<string, number>();
          mediosDetalle.forEach(({ medio, monto }) => {
            const nombre = medio || 'Efectivo';
            porMedio.set(nombre, (porMedio.get(nombre) ?? 0) + monto);
          });
          return [...porMedio.entries()]
            .map(([medio, monto]) => `${medio}: $${monto.toFixed(2)}`)
            .join(' | ');
        })()
      : medios ?? '';

  dibujarEncabezadoConLogo(doc, 'portrait', nombreClub);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Fecha de emisión: ${fechaHoy}`, 190, 48, { align: 'right' });
  if (numeroRecibo != null) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Recibo Nº ${String(numeroRecibo).padStart(6, '0')}`, 190, 55, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Socio: ${socio.apellido}, ${socio.nombre}`, 20, 63);
  doc.text(`Número de socio: ${socio.numeroSocio}`, 20, 71);

  const yMedios = 83;
  doc.setFont('helvetica', 'bold');
  doc.text('Medios de cobro:', 20, yMedios);
  doc.setFont('helvetica', 'normal');
  doc.text(textoMedios, 20, yMedios + 7, { maxWidth: 170 });

  let y = yMedios + 23;
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de cuotas canceladas', 20, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(20, y, 170, 10, 3, 3, 'F');
  doc.setFontSize(10);
  doc.text('Mes', 27, y + 7);
  doc.text('Fecha liquidación', 72, y + 7);
  doc.text('Monto', 150, y + 7, { align: 'right' });
  y += 14;

  doc.setFontSize(10);
  cuotas.forEach((cuota) => {
    doc.text(getNombreMesRecibo(cuota.mes), 27, y);
    doc.text(cuota.fechaLiquidacion || '-', 95, y, { align: 'center' });
    doc.text(`$${cuota.monto.toFixed(2)}`, 150, y, { align: 'right' });
    y += 7;
    if (y > 260) {
      doc.addPage();
      dibujarEncabezadoConLogo(doc, 'portrait', nombreClub);
      y = 106;
    }
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total abonado: $${total.toFixed(2)}`, 150, y + 6, { align: 'right' });

  doc.setDrawColor(200);
  doc.line(20, y + 20, 190, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Firma y sello', 150, y + 26, { align: 'center' });

  const blobUrl = doc.output('bloburl') as string | URL;
  const urlString = typeof blobUrl === 'string' ? blobUrl : blobUrl.toString();
  const nombre =
    numeroRecibo != null
      ? `Recibo-${String(numeroRecibo).padStart(6, '0')}-${socio.numeroSocio}.pdf`
      : `Recibo-${socio.numeroSocio}-${Date.now()}.pdf`;
  return { url: urlString, nombre };
};
