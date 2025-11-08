import { format } from 'date-fns';
import type { Socio, Categoria } from '../types';
import './TablaSocios.css';

interface TablaSociosProps {
  socios: Socio[];
  categorias: Categoria[];
  onModificar: (socio: Socio) => void;
  onBorrar: (id: number) => void;
}

export const TablaSocios = ({ socios, categorias, onModificar, onBorrar }: TablaSociosProps) => {
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

  if (socios.length === 0) {
    return (
      <div className="tabla-vacia">
        <p>No se encontraron socios con los filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="tabla-socios-container">
      <div className="tabla-wrapper">
        <table className="tabla-socios">
          <thead>
            <tr>
              <th>N° Socio</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Categoría</th>
              <th>Fecha Alta</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {socios.map(socio => (
              <tr key={socio.id} className={socio.fechaBaja ? 'inactivo' : ''}>
                <td>{socio.numeroSocio}</td>
                <td>{socio.apellido}</td>
                <td>{socio.nombre}</td>
                <td>{socio.dni}</td>
                <td>{socio.telefono || '-'}</td>
                <td>{socio.email || '-'}</td>
                <td>{getCategoriaNombre(socio.categoriaId)}</td>
                <td>{formatFecha(socio.fechaAlta)}</td>
                <td>
                  <span className={`badge ${socio.fechaBaja ? 'badge-inactivo' : 'badge-activo'}`}>
                    {socio.fechaBaja ? 'Inactivo' : 'Activo'}
                  </span>
                </td>
                <td>
                  <div className="acciones">
                    <button
                      onClick={() => onModificar(socio)}
                      className="btn-accion btn-modificar"
                      title="Modificar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onBorrar(socio.id)}
                      className="btn-accion btn-borrar"
                      title="Borrar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

