import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import type { Socio, FiltrosSocio } from '../types';

export const useSocios = () => {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSocios();
  }, []);

  const loadSocios = () => {
    setLoading(true);
    const data = storageService.getSocios();
    setSocios(data);
    setLoading(false);
  };

  const obtenerProximoNumeroSocio = () => {
    if (socios.length === 0) return 1;
    return Math.max(...socios.map((s) => s.numeroSocio)) + 1;
  };

  const existeNumeroSocio = (numero: number, excluirId?: number) => {
    return socios.some(
      (s) => s.numeroSocio === numero && (excluirId === undefined || s.id !== excluirId)
    );
  };

  const agregarSocio = (socio: Omit<Socio, 'id'>): Socio => {
    const numeroSocioAsignado =
      socio.numeroSocio && socio.numeroSocio > 0 ? socio.numeroSocio : obtenerProximoNumeroSocio();

    if (existeNumeroSocio(numeroSocioAsignado)) {
      throw new Error(`Ya existe un socio con el número ${numeroSocioAsignado}. Debe ser único.`);
    }

    const nuevoId = socios.length > 0 ? Math.max(...socios.map(s => s.id)) + 1 : 1;
    const nuevoSocio: Socio = { ...socio, id: nuevoId, numeroSocio: numeroSocioAsignado };
    const nuevosSocios = [...socios, nuevoSocio];
    setSocios(nuevosSocios);
    storageService.saveSocios(nuevosSocios);
    return nuevoSocio;
  };

  const modificarSocio = (id: number, socio: Partial<Socio>): boolean => {
    const index = socios.findIndex(s => s.id === id);
    if (index === -1) return false;

    const numeroSocioActual =
      socio.numeroSocio !== undefined ? socio.numeroSocio : socios[index].numeroSocio;

    if (numeroSocioActual <= 0) {
      throw new Error('El número de socio debe ser mayor a 0.');
    }

    if (existeNumeroSocio(numeroSocioActual, id)) {
      throw new Error(`Ya existe un socio con el número ${numeroSocioActual}. Debe ser único.`);
    }

    const sociosActualizados = [...socios];
    sociosActualizados[index] = {
      ...sociosActualizados[index],
      ...socio,
      numeroSocio: numeroSocioActual,
    };
    setSocios(sociosActualizados);
    storageService.saveSocios(sociosActualizados);
    return true;
  };

  const borrarSocio = (id: number): boolean => {
    const sociosFiltrados = socios.filter(s => s.id !== id);
    if (sociosFiltrados.length === socios.length) return false;
    
    setSocios(sociosFiltrados);
    storageService.saveSocios(sociosFiltrados);
    return true;
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
          s.dni.includes(filtros.dni!)
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
          s.provincia.toLowerCase().includes(filtros.provincia!.toLowerCase())
        );
      }
      if (filtros.localidad) {
        resultado = resultado.filter(s => 
          s.localidad.toLowerCase().includes(filtros.localidad!.toLowerCase())
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
    agregarSocio,
    modificarSocio,
    borrarSocio,
    listarSocios,
    getSocioById,
    loadSocios,
    obtenerProximoNumeroSocio,
  };
};


