import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dibujarEncabezadoConLogo } from '../utils/pdfLogo';
import type { Socio, Categoria, FiltrosSocio } from '../types';
import './ImprimirSocios.css';

interface ImprimirSociosProps {
  socios: Socio[];
  categorias: Categoria[];
  filtros: FiltrosSocio;
  onVolver: () => void;
}

export const ImprimirSocios = ({ socios, categorias, filtros, onVolver }: ImprimirSociosProps) => {
  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy');
    } catch {
      return fecha;
    }
  };

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
    doc.text(`Filtros aplicados: ${getFiltrosTexto()}`, 14, 45);
    doc.text(`Total de socios: ${socios.length}`, 14, 52);

    // Tabla
    autoTable(doc, {
      startY: 60,
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
        'DNI',
        'Fecha Nac.',
        'Dirección',
        'Localidad',
        'Provincia',
        'Teléfono',
        'Email',
        'Categoría',
        'Obra Social',
        'N° Afiliado',
        'Fecha Alta',
        'Fecha Baja',
        'Estado',
      ]],
      body: socios.map((socio) => [
        socio.numeroSocio.toString(),
        socio.apellido,
        socio.nombre,
        socio.dni,
        formatFecha(socio.fechaNacimiento),
        `${socio.calle} ${socio.numeroCasa}`,
        socio.localidad,
        socio.provincia,
        socio.telefono || '-',
        socio.email || '-',
        getCategoriaNombre(socio.categoriaId),
        socio.obraSocial || '-',
        socio.numeroAfiliado || '-',
        formatFecha(socio.fechaAlta),
        formatFecha(socio.fechaBaja),
        socio.fechaBaja ? 'Inactivo' : 'Activo',
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

  const getFiltrosTexto = () => {
    const filtrosTexto: string[] = [];
    if (filtros.numeroSocio) filtrosTexto.push(`N° Socio: ${filtros.numeroSocio}`);
    if (filtros.apellido) filtrosTexto.push(`Apellido: ${filtros.apellido}`);
    if (filtros.nombre) filtrosTexto.push(`Nombre: ${filtros.nombre}`);
    if (filtros.dni) filtrosTexto.push(`DNI: ${filtros.dni}`);
    if (filtros.categoriaId) {
      const categoria = categorias.find(c => c.id === filtros.categoriaId);
      filtrosTexto.push(`Categoría: ${categoria?.nombre || ''}`);
    }
    if (filtros.activo !== undefined) filtrosTexto.push(`Estado: ${filtros.activo ? 'Activo' : 'Inactivo'}`);
    if (filtros.provincia) filtrosTexto.push(`Provincia: ${filtros.provincia}`);
    if (filtros.localidad) filtrosTexto.push(`Localidad: ${filtros.localidad}`);
    return filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Sin filtros';
  };

  return (
    <div className="imprimir-socios">
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
          <h1>Listado de Socios</h1>
          <p className="fecha-impresion">Fecha de impresión: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p className="filtros-aplicados">{getFiltrosTexto()}</p>
          <p className="total-socios">Total de socios: {socios.length}</p>
        </div>

        <table className="tabla-imprimir">
          <thead>
            <tr>
              <th>N° Socio</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Fecha Nac.</th>
              <th>Dirección</th>
              <th>Localidad</th>
              <th>Provincia</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Categoría</th>
              <th>Obra Social</th>
              <th>N° Afiliado</th>
              <th>Fecha Alta</th>
              <th>Fecha Baja</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {socios.map(socio => (
              <tr key={socio.id} className={socio.fechaBaja ? 'inactivo' : ''}>
                <td>{socio.numeroSocio}</td>
                <td>{socio.apellido}</td>
                <td>{socio.nombre}</td>
                <td>{socio.dni}</td>
                <td>{formatFecha(socio.fechaNacimiento)}</td>
                <td>{socio.calle} {socio.numeroCasa}</td>
                <td>{socio.localidad}</td>
                <td>{socio.provincia}</td>
                <td>{socio.telefono || '-'}</td>
                <td>{socio.email || '-'}</td>
                <td>{getCategoriaNombre(socio.categoriaId)}</td>
                <td>{socio.obraSocial || '-'}</td>
                <td>{socio.numeroAfiliado || '-'}</td>
                <td>{formatFecha(socio.fechaAlta)}</td>
                <td>{formatFecha(socio.fechaBaja)}</td>
                <td>{socio.fechaBaja ? 'Inactivo' : 'Activo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

