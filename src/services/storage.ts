import type { Socio, Categoria, LiquidacionCuota, LiquidacionMensual } from '../types';

// Servicio para manejar el almacenamiento local (localStorage)
// En producción, esto podría ser reemplazado por llamadas a una API

const STORAGE_KEYS = {
  SOCIOS: 'socios',
  CATEGORIAS: 'categorias',
  LIQUIDACIONES_MENSUALES: 'liquidaciones_mensuales',
  LIQUIDACIONES_CUOTAS: 'liquidaciones_cuotas',
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

  // Gestión de Liquidaciones Mensuales
  getLiquidacionesMensuales: (): LiquidacionMensual[] => {
    const data = localStorage.getItem(STORAGE_KEYS.LIQUIDACIONES_MENSUALES);
    return data ? JSON.parse(data) : [];
  },

  saveLiquidacionesMensuales: (liquidaciones: LiquidacionMensual[]): void => {
    localStorage.setItem(STORAGE_KEYS.LIQUIDACIONES_MENSUALES, JSON.stringify(liquidaciones));
  },

  // Gestión de Relaciones Socio-Liquidación
  getLiquidacionesCuotas: (): LiquidacionCuota[] => {
    const data = localStorage.getItem(STORAGE_KEYS.LIQUIDACIONES_CUOTAS);
    return data ? JSON.parse(data) : [];
  },

  saveLiquidacionesCuotas: (liquidaciones: LiquidacionCuota[]): void => {
    localStorage.setItem(STORAGE_KEYS.LIQUIDACIONES_CUOTAS, JSON.stringify(liquidaciones));
  },
};

