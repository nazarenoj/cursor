import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { dibujarEncabezadoConLogo } from '../utils/pdfLogo';
import { apiService } from '../services/api';
import { exportToExcel } from '../utils/exportExcel';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import type { Categoria } from '../types';
import './ImprimirCategorias.css';

const CATEGORIAS_COLUMN_IDS = ['id', 'nombre', 'costoCuota', 'acciones'];

interface ImprimirCategoriasProps {
  categorias: Categoria[];
  onVolver: () => void;
}

export const ImprimirCategorias = ({ categorias, onVolver }: ImprimirCategoriasProps) => {
  const { nombreClub } = useClubConfig();
  const { visibleColumns } = useColumnPreferences('categorias', CATEGORIAS_COLUMN_IDS);
  const handleExportarPdf = async () => {
    // Registrar exportación en auditoría
    try {
      await apiService.registrarExportacion('categorias', 'PDF', { total: categorias.length });
    } catch (err) {
      // No bloquear la exportación si falla el registro
      console.warn('No se pudo registrar la exportación en auditoría:', err);
    }
    
    const doc = new jsPDF();
    const fecha = new Date().toLocaleString('es-AR');

    // Encabezado con logo
    dibujarEncabezadoConLogo(doc, 'portrait', nombreClub);

    // Información del documento
    doc.setTextColor(45, 55, 72);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Fecha de generación: ${fecha}`, 14, 48);
    doc.text(`Total de categorías: ${categorias.length}`, 14, 55);

    // Tabla
    autoTable(doc, {
      startY: 63,
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: 255,
        fontSize: 11,
      },
      bodyStyles: {
        textColor: 45,
        fontSize: 10,
      },
      head: [['ID', 'Nombre', 'Costo Cuota']],
      body: categorias.map((categoria) => [
        categoria.id.toString(),
        categoria.nombre,
        `$${categoria.costoCuota.toFixed(2)}`,
      ]),
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
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

    doc.save(`Listado-Categorias-${Date.now()}.pdf`);
  };

  const handleExportarExcel = () => {
    try {
      apiService.registrarExportacion('categorias', 'Excel', { total: categorias.length }).catch(console.warn);
      const visibleExport = visibleColumns.filter((id) => id !== 'acciones');
      const ids = visibleExport.length ? visibleExport : ['id', 'nombre', 'costoCuota'];
      const headers: Record<string, string> = { id: 'ID', nombre: 'Nombre', costoCuota: 'Costo Cuota' };
      const getValue: Record<string, (c: Categoria) => string | number> = {
        id: (c) => c.id,
        nombre: (c) => c.nombre,
        costoCuota: (c) => c.costoCuota,
      };
      const data = categorias.map((c) => {
        const row: Record<string, string | number> = {};
        ids.forEach((id) => {
          if (headers[id] && getValue[id]) row[headers[id]] = getValue[id](c);
        });
        return row;
      });
      if (Object.keys(data[0] || {}).length === 0) return;
      exportToExcel(data, `Listado-Categorias-${Date.now()}`, 'Categorías');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo exportar a Excel.');
    }
  };

  return (
    <div className="imprimir-categorias">
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
          <h1>Listado de Categorías</h1>
          <p className="fecha-impresion">Fecha de impresión: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p className="total-categorias">Total de categorías: {categorias.length}</p>
        </div>

        <table className="tabla-imprimir">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Costo Cuota</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map(categoria => (
              <tr key={categoria.id}>
                <td>{categoria.id}</td>
                <td>{categoria.nombre}</td>
                <td>${categoria.costoCuota.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

