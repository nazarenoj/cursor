import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dibujarEncabezadoConLogo } from './pdfLogo';
import { apiService } from '../services/api';
import { exportToExcel } from './exportExcel';
import type { Categoria, Socio } from '../types';
import { formatDateOnlyES } from './clubDateTime';

const formatFecha = (fecha: string | null): string => {
  return formatDateOnlyES(fecha);
};

const getNombreCategoria = (categorias: Categoria[], id: number): string => {
  return categorias.find((cat) => cat.id === id)?.nombre ?? 'Sin categoría';
};

/** Columnas exportables a PDF (id debe coincidir con TablaSocios/ImprimirSocios). Se excluye 'acciones'. */
const SOCIOS_PDF_COLUMNS: { id: string; header: string; getValue: (s: Socio, getCat: (id: number) => string) => string | number }[] = [
  { id: 'numeroSocio', header: 'N° Socio', getValue: (s) => s.numeroSocio },
  { id: 'apellido', header: 'Apellido', getValue: (s) => s.apellido },
  { id: 'nombre', header: 'Nombre', getValue: (s) => s.nombre },
  { id: 'dni', header: 'DNI', getValue: (s) => s.dni ?? '-' },
  { id: 'telefono', header: 'Teléfono', getValue: (s) => s.telefono || '-' },
  { id: 'email', header: 'Email', getValue: (s) => s.email || '-' },
  { id: 'categoria', header: 'Categoría', getValue: (s, getCat) => getCat(s.categoriaId) },
  { id: 'estado', header: 'Estado', getValue: (s) => (s.fechaBaja ? 'Inactivo' : 'Activo') },
  { id: 'provincia', header: 'Provincia', getValue: (s) => s.provincia ?? '-' },
  { id: 'localidad', header: 'Localidad', getValue: (s) => s.localidad ?? '-' },
  { id: 'codigoPostal', header: 'CP', getValue: (s) => s.codigoPostal || '-' },
  { id: 'fechaAlta', header: 'Fecha Alta', getValue: (s) => formatFecha(s.fechaAlta) },
  { id: 'fechaBaja', header: 'Fecha Baja', getValue: (s) => formatFecha(s.fechaBaja) },
];

export const exportarSociosPdf = async (
  socios: Socio[],
  categorias: Categoria[],
  nombreClub: string = 'Club Social Realico',
  visibleColumnIds?: string[],
) => {
  // Registrar exportación en auditoría
  try {
    await apiService.registrarExportacion('socios', 'PDF', { total: socios.length });
  } catch (err) {
    // No bloquear la exportación si falla el registro
    console.warn('No se pudo registrar la exportación en auditoría:', err);
  }

  const idsToExport = visibleColumnIds && visibleColumnIds.length > 0
    ? visibleColumnIds.filter((id) => id !== 'acciones')
    : SOCIOS_EXCEL_COLUMNS.map((c) => c.id);
  const columns = SOCIOS_PDF_COLUMNS.filter((c) => idsToExport.includes(c.id));
  if (columns.length === 0) return;

  const getCat = (id: number) => getNombreCategoria(categorias, id);
  
  const doc = new jsPDF({ orientation: 'landscape' });
  const fecha = new Date().toLocaleString('es-AR');

  // Encabezado con logo
  dibujarEncabezadoConLogo(doc, 'landscape', nombreClub);

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
    head: [columns.map((c) => c.header)],
    body: socios.map((socio) => columns.map((col) => col.getValue(socio, getCat))),
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

  doc.save(`Listado-Socios-${Date.now()}.pdf`);
};

/** Columnas exportables a Excel (id debe coincidir con TablaSocios). Se excluye 'acciones'. */
const SOCIOS_EXCEL_COLUMNS: { id: string; header: string; getValue: (s: Socio, getCat: (id: number) => string) => string | number }[] = [
  { id: 'numeroSocio', header: 'N° Socio', getValue: (s) => s.numeroSocio },
  { id: 'apellido', header: 'Apellido', getValue: (s) => s.apellido },
  { id: 'nombre', header: 'Nombre', getValue: (s) => s.nombre },
  { id: 'dni', header: 'DNI', getValue: (s) => s.dni ?? '-' },
  { id: 'telefono', header: 'Teléfono', getValue: (s) => s.telefono || '-' },
  { id: 'email', header: 'Email', getValue: (s) => s.email || '-' },
  { id: 'categoria', header: 'Categoría', getValue: (s, getCat) => getCat(s.categoriaId) },
  { id: 'estado', header: 'Estado', getValue: (s) => (s.fechaBaja ? 'Inactivo' : 'Activo') },
];

export const exportarSociosExcel = async (
  socios: Socio[],
  categorias: Categoria[],
  visibleColumnIds?: string[],
) => {
  try {
    await apiService.registrarExportacion('socios', 'Excel', { total: socios.length });
  } catch (err) {
    console.warn('No se pudo registrar la exportación en auditoría:', err);
  }
  const getCat = (id: number) => getNombreCategoria(categorias, id);
  const idsToExport = visibleColumnIds && visibleColumnIds.length > 0
    ? visibleColumnIds.filter((id) => id !== 'acciones')
    : SOCIOS_EXCEL_COLUMNS.map((c) => c.id);
  const columns = SOCIOS_EXCEL_COLUMNS.filter((c) => idsToExport.includes(c.id));
  if (columns.length === 0) return;
  const data = socios.map((socio) => {
    const row: Record<string, string | number> = {};
    columns.forEach((col) => {
      row[col.header] = col.getValue(socio, getCat);
    });
    return row;
  });
  exportToExcel(data, `Listado-Socios-${Date.now()}`, 'Socios');
};


