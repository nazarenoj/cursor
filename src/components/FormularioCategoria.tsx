import { useState } from 'react';
import type { Categoria } from '../types';
import './FormularioCategoria.css';

interface FormularioCategoriaProps {
  categoria?: Categoria;
  onSubmit: (categoria: Omit<Categoria, 'id'>) => void;
  onCancel: () => void;
}

export const FormularioCategoria = ({ categoria, onSubmit, onCancel }: FormularioCategoriaProps) => {
  const [nombre, setNombre] = useState(categoria?.nombre || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ nombre });
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


