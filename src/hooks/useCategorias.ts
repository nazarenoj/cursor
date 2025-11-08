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
        { id: 1, nombre: 'Activo', costoCuota: 5000 },
        { id: 2, nombre: 'Vitalicio', costoCuota: 0 },
        { id: 3, nombre: 'Honorario', costoCuota: 0 },
        { id: 4, nombre: 'Temporario', costoCuota: 3000 },
      ];
      storageService.saveCategorias(categoriasDefault);
      setCategorias(categoriasDefault);
    } else {
      // Migrar categorías existentes que no tengan costoCuota
      const categoriasMigradas = data.map(cat => ({
        ...cat,
        costoCuota: cat.costoCuota ?? 0
      }));
      // Solo guardar si hubo cambios
      if (categoriasMigradas.some((cat, i) => cat.costoCuota !== data[i]?.costoCuota)) {
        storageService.saveCategorias(categoriasMigradas);
      }
      setCategorias(categoriasMigradas);
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

