import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import type { Categoria } from '../types';

export const useCategorias = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const data = storageService.getCategorias();
    // Inicializar con categorías por defecto si no hay ninguna
    if (data.length === 0) {
      const categoriasDefault: Categoria[] = [
        { id: 1, nombre: 'Activo' },
        { id: 2, nombre: 'Vitalicio' },
        { id: 3, nombre: 'Honorario' },
        { id: 4, nombre: 'Temporario' },
      ];
      storageService.saveCategorias(categoriasDefault);
      setCategorias(categoriasDefault);
    } else {
      setCategorias(data);
    }
    setLoading(false);
  }, []);

  const loadCategorias = () => {
    setLoading(true);
    const data = storageService.getCategorias();
    setCategorias(data);
    setLoading(false);
  };

  const agregarCategoria = (categoria: Omit<Categoria, 'id'>): Categoria => {
    const nuevoId = categorias.length > 0 ? Math.max(...categorias.map(c => c.id)) + 1 : 1;
    const nuevaCategoria: Categoria = { ...categoria, id: nuevoId };
    const nuevasCategorias = [...categorias, nuevaCategoria];
    setCategorias(nuevasCategorias);
    storageService.saveCategorias(nuevasCategorias);
    return nuevaCategoria;
  };

  const modificarCategoria = (id: number, categoria: Partial<Categoria>): boolean => {
    const index = categorias.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    const categoriasActualizadas = [...categorias];
    categoriasActualizadas[index] = { ...categoriasActualizadas[index], ...categoria };
    setCategorias(categoriasActualizadas);
    storageService.saveCategorias(categoriasActualizadas);
    return true;
  };

  const borrarCategoria = (id: number): boolean => {
    const categoriasFiltradas = categorias.filter(c => c.id !== id);
    if (categoriasFiltradas.length === categorias.length) return false;
    
    setCategorias(categoriasFiltradas);
    storageService.saveCategorias(categoriasFiltradas);
    return true;
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
    agregarCategoria,
    modificarCategoria,
    borrarCategoria,
    listarCategorias,
    getCategoriaById,
    loadCategorias,
  };
};

