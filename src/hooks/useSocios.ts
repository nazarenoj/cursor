import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { Socio, FiltrosSocio } from '../types';

export const useSocios = () => {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSocios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getSocios();
      setSocios(data);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al cargar los socios.';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSocios().catch(() => {
      // El error ya fue registrado en el estado
    });
  }, [loadSocios]);

  const obtenerProximoNumeroSocio = () => {
    if (socios.length === 0) return 1;
    return Math.max(...socios.map((s) => s.numeroSocio)) + 1;
  };

  const agregarSocio = async (socio: Omit<Socio, 'id'>, foto?: File): Promise<Socio> => {
    const creado = await apiService.crearSocio(socio, foto);
    setSocios(prev => [...prev, creado]);
    return creado;
  };

  const modificarSocio = async (id: number, socio: Omit<Socio, 'id'>, foto?: File | null): Promise<Socio> => {
    const actualizado = await apiService.actualizarSocio(id, socio, foto);
    setSocios(prev => prev.map(item => (item.id === id ? actualizado : item)));
    return actualizado;
  };

  const darBajaSocio = async (id: number): Promise<Socio> => {
    const actualizado = await apiService.darBajaSocio(id);
    setSocios(prev => prev.map(item => (item.id === id ? actualizado : item)));
    return actualizado;
  };

  const darAltaSocio = async (id: number): Promise<Socio> => {
    const actualizado = await apiService.darAltaSocio(id);
    setSocios(prev => prev.map(item => (item.id === id ? actualizado : item)));
    return actualizado;
  };

  const borrarSocio = async (id: number): Promise<void> => {
    await apiService.eliminarSocio(id);
    setSocios(prev => prev.filter(s => s.id !== id));
  };

  const listarSocios = (filtros?: FiltrosSocio): Socio[] => {
    let resultado = [...socios];

    if (filtros) {
      if (filtros.numeroSocio) {
        resultado = resultado.filter(s => 
          s.numeroSocio.toString().includes(filtros.numeroSocio!)
        );
      }
      if (filtros.apellido) {
        resultado = resultado.filter(s => 
          s.apellido.toLowerCase().includes(filtros.apellido!.toLowerCase())
        );
      }
      if (filtros.nombre) {
        resultado = resultado.filter(s => 
          s.nombre.toLowerCase().includes(filtros.nombre!.toLowerCase())
        );
      }
      if (filtros.dni) {
        resultado = resultado.filter(s => 
          (s.dni ?? '').includes(filtros.dni!)
        );
      }
      if (filtros.categoriaId) {
        resultado = resultado.filter(s => s.categoriaId === filtros.categoriaId);
      }
      if (filtros.activo !== undefined) {
        if (filtros.activo) {
          resultado = resultado.filter(s => !s.fechaBaja);
        } else {
          resultado = resultado.filter(s => !!s.fechaBaja);
        }
      }
      if (filtros.provincia) {
        resultado = resultado.filter(s => 
          (s.provincia ?? '').toLowerCase().includes(filtros.provincia!.toLowerCase())
        );
      }
      if (filtros.localidad) {
        resultado = resultado.filter(s => 
          (s.localidad ?? '').toLowerCase().includes(filtros.localidad!.toLowerCase())
        );
      }
    }

    return resultado;
  };

  const getSocioById = (id: number): Socio | undefined => {
    return socios.find(s => s.id === id);
  };

  return {
    socios,
    loading,
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
  };
};


