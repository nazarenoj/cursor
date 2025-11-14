import { useState } from 'react';
import type { Categoria } from '../types';
import './FormularioCategoria.css';

interface FormularioCategoriaProps {
  categoria?: Categoria;
  onSubmit: (categoria: Omit<Categoria, 'id'>) => void | Promise<void>;
  onCancel: () => void;
}

export const FormularioCategoria = ({ categoria, onSubmit, onCancel }: FormularioCategoriaProps) => {
  const [nombre, setNombre] = useState(categoria?.nombre || '');
  const [costoCuota, setCostoCuota] = useState(categoria?.costoCuota?.toString() || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      nombre,
      costoCuota: parseFloat(costoCuota) || 0,
    });
  };

  return (
    <div className="formulario-categoria">
      <h2>{categoria ? 'Modificar Categoría' : 'Agregar Nueva Categoría'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre de la Categoría *</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Ej: Activo, Vitalicio, Honorario"
          />
        </div>

        <div className="form-group">
          <label htmlFor="costoCuota">Costo de Cuota *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#666',
              fontWeight: '500'
            }}>$</span>
            <input
              type="number"
              id="costoCuota"
              name="costoCuota"
              value={costoCuota}
              onChange={(e) => setCostoCuota(e.target.value)}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              style={{ paddingLeft: '30px' }}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button type="submit" className="btn-submit">
            {categoria ? 'Modificar' : 'Agregar'}
          </button>
        </div>
      </form>
    </div>
  );
};


