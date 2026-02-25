import * as XLSX from 'xlsx';

/**
 * Exporta un array de objetos a un archivo Excel (.xlsx).
 * Las claves del primer objeto se usan como encabezados de columna.
 */
export function exportToExcel(
  data: Record<string, string | number>[],
  filename: string,
  sheetName = 'Datos'
): void {
  if (data.length === 0) {
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
