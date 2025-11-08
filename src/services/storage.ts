import type { Socio, Categoria } from '../types';

// Servicio para manejar el almacenamiento local (localStorage)
// En producción, esto podría ser reemplazado por llamadas a una API

const STORAGE_KEYS = {
  SOCIOS: 'socios',
  CATEGORIAS: 'categorias',
} as const;

export const storageService = {
  // Gestión de Socios
  getSocios: (): Socio[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SOCIOS);
    return data ? JSON.parse(data) : [];
  },

  saveSocios: (socios: Socio[]): void => {
    localStorage.setItem(STORAGE_KEYS.SOCIOS, JSON.stringify(socios));
  },

  // Gestión de Categorías
  getCategorias: (): Categoria[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIAS);
    return data ? JSON.parse(data) : [];
  },

  saveCategorias: (categorias: Categoria[]): void => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(categorias));
  },
};

