import { useState } from 'react';
import { useCategorias } from '../hooks/useCategorias';
import { FormularioCategoria } from './FormularioCategoria';
import { TablaCategorias } from './TablaCategorias';
import { ImprimirCategorias } from './ImprimirCategorias';
import type { Categoria } from '../types';
import './ListaCategorias.css';

export const ListaCategorias = () => {
  const { categorias, agregarCategoria, modificarCategoria, borrarCategoria, listarCategorias } = useCategorias();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | undefined>(undefined);
  const [mostrarImpresion, setMostrarImpresion] = useState(false);

  const categoriasListadas = listarCategorias();

  const handleAgregar = () => {
    setCategoriaEditando(undefined);
    setMostrarFormulario(true);
  };

  const handleModificar = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setMostrarFormulario(true);
  };

  const handleBorrar = (id: number) => {
    if (window.confirm('¿Está seguro que desea eliminar esta categoría?')) {
      borrarCategoria(id);
    }
  };

  const handleSubmit = (categoriaData: Omit<Categoria, 'id'>) => {
    if (categoriaEditando) {
      modificarCategoria(categoriaEditando.id, categoriaData);
    } else {
      agregarCategoria(categoriaData);
    }
    setMostrarFormulario(false);
    setCategoriaEditando(undefined);
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setCategoriaEditando(undefined);
  };

  if (mostrarImpresion) {
    return (
      <ImprimirCategorias
        categorias={categoriasListadas}
        onVolver={() => setMostrarImpresion(false)}
      />
    );
  }

  if (mostrarFormulario) {
    return (
      <div className="lista-categorias">
        <FormularioCategoria
          categoria={categoriaEditando}
          onSubmit={handleSubmit}
          onCancel={handleCancelar}
        />
      </div>
    );
  }

  return (
    <div className="lista-categorias">
      <div className="lista-header">
        <h1>Gestión de Categorías</h1>
        <div className="lista-actions">
          <button onClick={handleAgregar} className="btn-agregar">
            + Agregar Categoría
          </button>
          <button onClick={() => setMostrarImpresion(true)} className="btn-imprimir">
            🖨️ Imprimir
          </button>
        </div>
      </div>

      <div className="lista-info">
        <p>Total de categorías: {categoriasListadas.length}</p>
      </div>

      <TablaCategorias
        categorias={categoriasListadas}
        onModificar={handleModificar}
        onBorrar={handleBorrar}
      />
    </div>
  );
};



