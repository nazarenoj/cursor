import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiService, type SociosSort } from '../services/api';
import type { Socio, FiltrosSocio } from '../types';

export interface SociosMeta {
  total: number;
  pages: number;
  currentPage: number;
}

const SOCIOS_QUERY_KEY = ['socios'] as const;
const PROXIMO_NUMERO_KEY = ['socios', 'proximo-numero'] as const;

type QueryState = {
  filtros: FiltrosSocio;
  page: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

const sortArg = (q: QueryState): SociosSort | undefined =>
  q.sortBy ? { sortBy: q.sortBy, sortDir: q.sortDir ?? 'asc' } : undefined;

export const useSocios = () => {
  const queryClient = useQueryClient();
  const [queryParams, setQueryParams] = useState<QueryState>({
    filtros: {},
    page: 1,
  });

  const {
    data,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [...SOCIOS_QUERY_KEY, queryParams.filtros, queryParams.page, queryParams.sortBy, queryParams.sortDir],
    queryFn: () => apiService.getSocios(queryParams.filtros, queryParams.page, 20, sortArg(queryParams)),
    placeholderData: keepPreviousData,
  });

  const { data: proximoNumeroData } = useQuery({
    queryKey: PROXIMO_NUMERO_KEY,
    queryFn: () => apiService.getProximoNumeroSocio(),
    staleTime: 30_000,
  });

  const socios = data?.data ?? [];
  const meta: SociosMeta = data?.meta ?? {
    total: 0,
    pages: 0,
    currentPage: queryParams.page,
  };
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Error al cargar los socios.') : null;

  const loadSocios = useCallback(
    (filtros?: FiltrosSocio, page = 1, sortOverride?: SociosSort | 'preserve') => {
      setQueryParams((prev) => {
        const next: QueryState = {
          filtros: filtros !== undefined ? filtros : prev.filtros,
          page,
        };
        if (sortOverride === 'preserve' || sortOverride === undefined) {
          if (prev.sortBy) {
            next.sortBy = prev.sortBy;
            next.sortDir = prev.sortDir;
          }
        } else {
          next.sortBy = sortOverride.sortBy;
          next.sortDir = sortOverride.sortDir;
        }
        return next;
      });
    },
    [],
  );

  const invalidateSocios = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SOCIOS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['socios', 'todos'] });
    queryClient.invalidateQueries({ queryKey: PROXIMO_NUMERO_KEY });
  }, [queryClient]);

  const agregarSocioMutation = useMutation({
    mutationFn: ({ socio, foto }: { socio: Omit<Socio, 'id'>; foto?: File }) =>
      apiService.crearSocio(socio, foto),
    onSuccess: () => invalidateSocios(),
  });

  const modificarSocioMutation = useMutation({
    mutationFn: ({ id, socio, foto }: { id: number; socio: Omit<Socio, 'id'>; foto?: File | null }) =>
      apiService.actualizarSocio(id, socio, foto),
    onSuccess: () => invalidateSocios(),
  });

  const darBajaSocioMutation = useMutation({
    mutationFn: (id: number) => apiService.darBajaSocio(id),
    onSuccess: () => invalidateSocios(),
  });

  const darAltaSocioMutation = useMutation({
    mutationFn: (id: number) => apiService.darAltaSocio(id),
    onSuccess: () => invalidateSocios(),
  });

  const borrarSocioMutation = useMutation({
    mutationFn: (id: number) => apiService.eliminarSocio(id),
    onSuccess: () => invalidateSocios(),
  });

  const agregarSocio = async (socio: Omit<Socio, 'id'>, foto?: File): Promise<Socio> => {
    const creado = await agregarSocioMutation.mutateAsync({ socio, foto });
    return creado;
  };

  const modificarSocio = async (id: number, socio: Omit<Socio, 'id'>, foto?: File | null): Promise<Socio> => {
    return modificarSocioMutation.mutateAsync({ id, socio, foto });
  };

  const darBajaSocio = async (id: number): Promise<Socio> => {
    return darBajaSocioMutation.mutateAsync(id);
  };

  const darAltaSocio = async (id: number): Promise<Socio> => {
    return darAltaSocioMutation.mutateAsync(id);
  };

  const borrarSocio = async (id: number): Promise<void> => {
    await borrarSocioMutation.mutateAsync(id);
  };

  const obtenerProximoNumeroSocio = () => {
    return proximoNumeroData?.siguiente ?? 1;
  };

  const listarSocios = (filtros?: FiltrosSocio): Socio[] => {
    let resultado = [...socios];

    if (filtros) {
      if (filtros.numeroSocio) {
        resultado = resultado.filter((s) =>
          s.numeroSocio.toString().includes(filtros.numeroSocio!),
        );
      }
      if (filtros.apellido) {
        resultado = resultado.filter((s) =>
          s.apellido.toLowerCase().includes(filtros.apellido!.toLowerCase()),
        );
      }
      if (filtros.nombre) {
        resultado = resultado.filter((s) =>
          s.nombre.toLowerCase().includes(filtros.nombre!.toLowerCase()),
        );
      }
      if (filtros.dni) {
        resultado = resultado.filter((s) => (s.dni ?? '').includes(filtros.dni!));
      }
      if (filtros.categoriaIds && filtros.categoriaIds.length > 0) {
        resultado = resultado.filter((s) => filtros.categoriaIds!.includes(s.categoriaId));
      } else if (filtros.categoriaId) {
        resultado = resultado.filter((s) => s.categoriaId === filtros.categoriaId);
      }
      if (filtros.activo !== undefined) {
        if (filtros.activo) {
          resultado = resultado.filter((s) => !s.fechaBaja);
        } else {
          resultado = resultado.filter((s) => !!s.fechaBaja);
        }
      }
      if (filtros.provincia) {
        resultado = resultado.filter((s) =>
          (s.provincia ?? '').toLowerCase().includes(filtros.provincia!.toLowerCase()),
        );
      }
      if (filtros.localidad) {
        resultado = resultado.filter((s) =>
          (s.localidad ?? '').toLowerCase().includes(filtros.localidad!.toLowerCase()),
        );
      }
    }

    return resultado;
  };

  const getSocioById = (id: number): Socio | undefined => {
    return socios.find((s) => s.id === id);
  };

  return {
    socios,
    meta,
    loading,
    isFetching,
    error,
    agregarSocio,
    modificarSocio,
    darBajaSocio,
    darAltaSocio,
    borrarSocio,
    listarSocios,
    getSocioById,
    loadSocios,
    obtenerProximoNumeroSocio,
    refetch,
  };
};
