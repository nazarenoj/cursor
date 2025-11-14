import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dibujarEncabezadoConLogo } from '../utils/pdfLogo';
import type { Categoria } from '../types';
import './ImprimirCategorias.css';

interface ImprimirCategoriasProps {
  categorias: Categoria[];
  onVolver: () => void;
}

export const ImprimirCategorias = ({ categorias, onVolver }: ImprimirCategoriasProps) => {
  const handleExportarPdf = () => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleString('es-AR');

    // Encabezado con logo
    dibujarEncabezadoConLogo(doc, 'portrait');

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

    doc.save(`Listado-Categorias-${Date.now()}.pdf`);
  };

  return (
    <div className="imprimir-categorias">
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

