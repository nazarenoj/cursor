import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { FiltrosSocio } from '../types';

/**
 * Todos los socios que coinciden con los filtros (paginado en el servidor, acumulado en cliente).
 * Usar en pantallas que necesitan el universo completo (p. ej. liquidaciones por socios, WhatsApp), no el subconjunto de la página.
 */
export const useSociosCompletos = (filtros: FiltrosSocio = {}) => {
  return useQuery({
    queryKey: ['socios', 'todos', filtros] as const,
    queryFn: () => apiService.getSociosTodasLasPaginas(filtros),
  });
};
