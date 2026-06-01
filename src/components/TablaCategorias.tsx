import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { SelectorColumnas } from './SelectorColumnas';
import type { Categoria } from '../types';
import './TablaCategorias.css';

const CATEGORIAS_COLUMNS = [
  { id: 'id', label: 'ID' },
  { id: 'nombre', label: 'Nombre' },
  { id: 'costoCuota', label: 'Costo Cuota' },
  { id: 'acciones', label: 'Acciones' },
];

const DEFAULT_VISIBLE = CATEGORIAS_COLUMNS.map((c) => c.id);

interface TablaCategoriasProps {
  categorias: Categoria[];
  onModificar: (categoria: Categoria) => void;
  onBorrar: (id: number) => void;
  ordenColumna?: { columna: string; direccion: 'asc' | 'desc' } | null;
  onOrdenar?: (columna: string) => void;
}

export const TablaCategorias = ({ categorias, onModificar, onBorrar, ordenColumna, onOrdenar }: TablaCategoriasProps) => {
  const { visibleColumns, setVisibleColumns, toggleColumn, loading } = useColumnPreferences(
    'categorias',
    DEFAULT_VISIBLE,
  );

  const visible = loading ? DEFAULT_VISIBLE : visibleColumns;
  const isVisible = (id: string) => visible.includes(id);

  if (categorias.length === 0) {
    return (
      <div className="tabla-vacia">
        <p>No hay categorías registradas.</p>
      </div>
    );
  }

  return (
    <div className="tabla-categorias-container">
      <div className="tabla-acciones-superior">
        <SelectorColumnas
          columnas={CATEGORIAS_COLUMNS}
          visibleIds={visible}
          onToggle={toggleColumn}
          onRestaurar={() => setVisibleColumns(DEFAULT_VISIBLE)}
          titulo="Columnas visibles"
        />
      </div>
      <div className="tabla-wrapper">
        <table className="tabla-categorias">
          <thead>
            <tr>
              {isVisible('id') && (
                <th
                  className={onOrdenar ? 'sortable' : ''}
                  onClick={() => onOrdenar?.('id')}
                  style={onOrdenar ? { cursor: 'pointer', userSelect: 'none' } : {}}
                >
                  ID
                  {ordenColumna?.columna === 'id' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('nombre') && (
                <th
                  className={onOrdenar ? 'sortable' : ''}
                  onClick={() => onOrdenar?.('nombre')}
                  style={onOrdenar ? { cursor: 'pointer', userSelect: 'none' } : {}}
                >
                  Nombre
                  {ordenColumna?.columna === 'nombre' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('costoCuota') && (
                <th
                  className={onOrdenar ? 'sortable' : ''}
                  onClick={() => onOrdenar?.('costoCuota')}
                  style={onOrdenar ? { cursor: 'pointer', userSelect: 'none' } : {}}
                >
                  Costo Cuota
                  {ordenColumna?.columna === 'costoCuota' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('acciones') && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {categorias.map((categoria) => (
              <tr key={categoria.id}>
                {isVisible('id') && <td>{categoria.id}</td>}
                {isVisible('nombre') && <td>{categoria.nombre}</td>}
                {isVisible('costoCuota') && <td>${categoria.costoCuota.toFixed(2)}</td>}
                {isVisible('acciones') && (
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
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
