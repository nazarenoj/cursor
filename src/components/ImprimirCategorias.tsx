import { format } from 'date-fns';
import type { Categoria } from '../types';
import './ImprimirCategorias.css';

interface ImprimirCategoriasProps {
  categorias: Categoria[];
  onVolver: () => void;
}

export const ImprimirCategorias = ({ categorias, onVolver }: ImprimirCategoriasProps) => {
  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="imprimir-categorias">
      <div className="imprimir-controls no-print">
        <button onClick={handleImprimir} className="btn-imprimir">
          🖨️ Imprimir
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

