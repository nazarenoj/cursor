import { format } from 'date-fns';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { apiService } from '../services/api';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import type { Socio, Categoria, FiltrosSocio } from '../types';
import { formatDateOnlyES } from '../utils/clubDateTime';
import './ImprimirSocios.css';

const SOCIOS_DEFAULT_VISIBLE = ['numeroSocio', 'apellido', 'nombre', 'dni', 'telefono', 'email', 'categoria', 'estado', 'acciones'];

interface ImprimirSociosProps {
  socios: Socio[];
  categorias: Categoria[];
  filtros: FiltrosSocio;
  onVolver: () => void;
}

export const ImprimirSocios = ({ socios, categorias, filtros, onVolver }: ImprimirSociosProps) => {
  const { nombreClub } = useClubConfig();
  const { visibleColumns } = useColumnPreferences('socios', SOCIOS_DEFAULT_VISIBLE);
  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const formatFecha = (fecha: string | null) => {
    return formatDateOnlyES(fecha);
  };

  const handleExportarPdf = async () => {
    const visibleIds = visibleColumns.filter((id) => id !== 'acciones');
    const { exportarSociosPdf } = await import('../utils/exportSociosPdf');
    await exportarSociosPdf(socios, categorias, nombreClub, visibleIds.length ? visibleIds : undefined);
  };

  const handleExportarExcel = async () => {
    try {
      await apiService.registrarExportacion(
        'socios',
        'Excel',
        filtros as unknown as Record<string, unknown>,
      );
    } catch (err) {
      console.warn('No se pudo registrar la exportación en auditoría:', err);
    }
    const visibleIds = visibleColumns.filter((id) => id !== 'acciones');
    const { exportarSociosExcel } = await import('../utils/exportSociosPdf');
    exportarSociosExcel(socios, categorias, visibleIds.length ? visibleIds : undefined);
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
        <button onClick={handleExportarExcel} className="btn-imprimir btn-exportar-excel">
          📊 Exportar Excel
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
                <td>{socio.dni ?? '-'}</td>
                <td>{formatFecha(socio.fechaNacimiento ?? '')}</td>
                <td>{[socio.calle, socio.numeroCasa].filter(Boolean).join(' ').trim() || '-'}</td>
                <td>{socio.localidad ?? '-'}</td>
                <td>{socio.provincia ?? '-'}</td>
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

