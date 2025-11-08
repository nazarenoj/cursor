import type { Categoria } from '../types';
import './TablaCategorias.css';

interface TablaCategoriasProps {
  categorias: Categoria[];
  onModificar: (categoria: Categoria) => void;
  onBorrar: (id: number) => void;
}

export const TablaCategorias = ({ categorias, onModificar, onBorrar }: TablaCategoriasProps) => {
  if (categorias.length === 0) {
    return (
      <div className="tabla-vacia">
        <p>No hay categorías registradas.</p>
      </div>
    );
  }

  return (
    <div className="tabla-categorias-container">
      <div className="tabla-wrapper">
        <table className="tabla-categorias">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map(categoria => (
              <tr key={categoria.id}>
                <td>{categoria.id}</td>
                <td>{categoria.nombre}</td>
                <td>
                  <div className="acciones">
                    <button
                      onClick={() => onModificar(categoria)}
                      className="btn-accion btn-modificar"
                      title="Modificar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onBorrar(categoria.id)}
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


