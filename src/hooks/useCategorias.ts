import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { Categoria } from '../types';

export const useCategorias = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getCategorias();
      setCategorias(data);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al cargar las categorías.';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const agregarCategoria = async (categoria: Omit<Categoria, 'id'>): Promise<Categoria> => {
    const creada = await apiService.crearCategoria(categoria);
    setCategorias(prev => [...prev, creada]);
    return creada;
  };

  const modificarCategoria = async (
    id: number,
    categoria: Omit<Categoria, 'id'>,
  ): Promise<Categoria> => {
    const actualizada = await apiService.actualizarCategoria(id, categoria);
    setCategorias(prev =>
      prev.map(cat => (cat.id === id ? actualizada : cat)),
    );
    return actualizada;
  };

  const borrarCategoria = async (id: number): Promise<void> => {
    await apiService.eliminarCategoria(id);
    setCategorias(prev => prev.filter(c => c.id !== id));
  };

  const listarCategorias = (): Categoria[] => {
    return [...categorias];
  };

  const getCategoriaById = (id: number): Categoria | undefined => {
    return categorias.find(c => c.id === id);
  };

  return {
    categorias,
    loading,
    error,
    agregarCategoria,
    modificarCategoria,
    borrarCategoria,
    listarCategorias,
    getCategoriaById,
    loadCategorias,
  };
};

