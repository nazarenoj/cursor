import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dibujarEncabezadoConLogo } from './pdfLogo';
import type { Categoria, Socio } from '../types';

const formatFecha = (fecha: string | null): string => {
  if (!fecha) return '-';
  try {
    return new Date(fecha).toLocaleDateString('es-AR');
  } catch {
    return fecha;
  }
};

const getNombreCategoria = (categorias: Categoria[], id: number): string => {
  return categorias.find((cat) => cat.id === id)?.nombre ?? 'Sin categoría';
};

export const exportarSociosPdf = (socios: Socio[], categorias: Categoria[]) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const fecha = new Date().toLocaleString('es-AR');

  // Encabezado con logo
  dibujarEncabezadoConLogo(doc, 'landscape');

  // Información del documento
  doc.setTextColor(45, 55, 72);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Fecha de generación: ${fecha}`, 14, 38);
  doc.text(`Total de socios listados: ${socios.length}`, 14, 45);

  autoTable(doc, {
    startY: 53,
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: 255,
      fontSize: 10,
    },
    bodyStyles: {
      textColor: 45,
      fontSize: 9,
    },
    head: [
      [
        'N° Socio',
        'Apellido',
        'Nombre',
        'DNI',
        'Categoría',
        'Teléfono',
        'Email',
        'Provincia',
        'Localidad',
        'Fecha Alta',
        'Fecha Baja',
      ],
    ],
    body: socios.map((socio) => [
      socio.numeroSocio,
      socio.apellido,
      socio.nombre,
      socio.dni,
      getNombreCategoria(categorias, socio.categoriaId),
      socio.telefono || '-',
      socio.email || '-',
      socio.provincia,
      socio.localidad,
      formatFecha(socio.fechaAlta),
      formatFecha(socio.fechaBaja),
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

  doc.save(`Listado-Socios-${Date.now()}.pdf`);
};


