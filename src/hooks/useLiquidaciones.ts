import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { useSocios } from './useSocios';
import { useCategorias } from './useCategorias';
import type { LiquidacionCuota, LiquidacionMensual, MedioPago } from '../types';

export const useLiquidaciones = () => {
  const { socios, listarSocios } = useSocios();
  const { categorias, getCategoriaById } = useCategorias();
  const [liquidacionesMensuales, setLiquidacionesMensuales] = useState<LiquidacionMensual[]>([]);
  const [liquidacionesCuotas, setLiquidacionesCuotas] = useState<LiquidacionCuota[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiquidaciones();
  }, []);

  const loadLiquidaciones = () => {
    setLoading(true);
    const mensuales = storageService.getLiquidacionesMensuales();
    const cuotas = storageService.getLiquidacionesCuotas().map((cuota) => ({
      ...cuota,
      medioPago: cuota.medioPago ?? null,
    }));
    setLiquidacionesMensuales(mensuales);
    setLiquidacionesCuotas(cuotas);
    setLoading(false);
  };

  const generarLiquidacionMensual = (mes: string): { liquidacionMensual: LiquidacionMensual; cuotas: LiquidacionCuota[] } => {
    // Obtener solo socios activos (sin fecha de baja)
    const sociosActivos = listarSocios({ activo: true });
    const fechaLiquidacion = new Date().toISOString().split('T')[0];

    // Verificar si ya existe una liquidación mensual para este mes
    const liquidacionExistente = liquidacionesMensuales.find(lm => lm.mes === mes);
    if (liquidacionExistente) {
      throw new Error(`Ya existe una liquidación para el mes ${mes}`);
    }

    // Crear la liquidación mensual
    const nuevoIdMensual = liquidacionesMensuales.length > 0 
      ? Math.max(...liquidacionesMensuales.map(lm => lm.id)) + 1
      : 1;

    const liquidacionMensual: LiquidacionMensual = {
      id: nuevoIdMensual,
      mes: mes,
      fechaLiquidacion: fechaLiquidacion,
    };

    // Crear las relaciones socio-liquidación
    const nuevasCuotas: LiquidacionCuota[] = [];
    sociosActivos.forEach(socio => {
      const categoria = getCategoriaById(socio.categoriaId);
      if (!categoria) return;

      const nuevoIdCuota = liquidacionesCuotas.length > 0 
        ? Math.max(...liquidacionesCuotas.map(lc => lc.id)) + 1 + nuevasCuotas.length
        : 1 + nuevasCuotas.length;

      const cuota: LiquidacionCuota = {
        id: nuevoIdCuota,
        liquidacionMensualId: nuevoIdMensual,
        socioId: socio.id,
        numeroSocio: socio.numeroSocio,
        apellido: socio.apellido,
        nombre: socio.nombre,
        categoriaId: categoria.id,
        categoriaNombre: categoria.nombre,
        monto: categoria.costoCuota,
        pagado: false,
        fechaPago: null,
        medioPago: null,
      };

      nuevasCuotas.push(cuota);
    });

    // Guardar ambas tablas
    const todasMensuales = [...liquidacionesMensuales, liquidacionMensual];
    const todasCuotas = [...liquidacionesCuotas, ...nuevasCuotas];
    
    setLiquidacionesMensuales(todasMensuales);
    setLiquidacionesCuotas(todasCuotas);
    
    storageService.saveLiquidacionesMensuales(todasMensuales);
    storageService.saveLiquidacionesCuotas(todasCuotas);
    
    return { liquidacionMensual, cuotas: nuevasCuotas };
  };

  const marcarComoPagado = (id: number, medioPago: string = 'Efectivo'): boolean => {
    const index = liquidacionesCuotas.findIndex(lc => lc.id === id);
    if (index === -1) return false;

    const cuotasActualizadas = [...liquidacionesCuotas];
    cuotasActualizadas[index] = {
      ...cuotasActualizadas[index],
      pagado: true,
      fechaPago: new Date().toISOString().split('T')[0],
      medioPago,
    };
    setLiquidacionesCuotas(cuotasActualizadas);
    storageService.saveLiquidacionesCuotas(cuotasActualizadas);
    return true;
  };

  const marcarComoNoPagado = (id: number): boolean => {
    const index = liquidacionesCuotas.findIndex(lc => lc.id === id);
    if (index === -1) return false;

    const cuotasActualizadas = [...liquidacionesCuotas];
    cuotasActualizadas[index] = {
      ...cuotasActualizadas[index],
      pagado: false,
      fechaPago: null,
      medioPago: null,
    };
    setLiquidacionesCuotas(cuotasActualizadas);
    storageService.saveLiquidacionesCuotas(cuotasActualizadas);
    return true;
  };

  const borrarLiquidacionCuota = (id: number): boolean => {
    const cuotasFiltradas = liquidacionesCuotas.filter(lc => lc.id !== id);
    if (cuotasFiltradas.length === liquidacionesCuotas.length) return false;

    setLiquidacionesCuotas(cuotasFiltradas);
    storageService.saveLiquidacionesCuotas(cuotasFiltradas);
    return true;
  };

  const marcarCuotasComoPagadas = (
    ids: number[],
    medioPago: string,
    fechaPago = new Date().toISOString().split('T')[0],
  ): boolean => {
    if (ids.length === 0) return false;
    let cambio = false;

    const cuotasActualizadas = liquidacionesCuotas.map((cuota) => {
      if (ids.includes(cuota.id)) {
        cambio = true;
        return {
          ...cuota,
          pagado: true,
          fechaPago,
          medioPago,
        };
      }
      return cuota;
    });

    if (!cambio) return false;

    setLiquidacionesCuotas(cuotasActualizadas);
    storageService.saveLiquidacionesCuotas(cuotasActualizadas);
    return true;
  };

  const borrarLiquidacionMensual = (id: number): boolean => {
    // Verificar si hay alguna cuota pagada para esta liquidación mensual
    const cuotasDeLiquidacion = liquidacionesCuotas.filter(
      lc => lc.liquidacionMensualId === id
    );
    
    const hayCuotasPagadas = cuotasDeLiquidacion.some(lc => lc.pagado);
    
    if (hayCuotasPagadas) {
      throw new Error('No se puede borrar una liquidación mensual que tiene cuotas pagadas. Primero debe marcar todas las cuotas como pendientes.');
    }

    // Si todas están pendientes, borrar la liquidación mensual y todas sus relaciones
    const mensualesFiltradas = liquidacionesMensuales.filter(lm => lm.id !== id);
    const cuotasFiltradas = liquidacionesCuotas.filter(lc => lc.liquidacionMensualId !== id);
    
    if (mensualesFiltradas.length === liquidacionesMensuales.length) return false;

    setLiquidacionesMensuales(mensualesFiltradas);
    setLiquidacionesCuotas(cuotasFiltradas);
    
    storageService.saveLiquidacionesMensuales(mensualesFiltradas);
    storageService.saveLiquidacionesCuotas(cuotasFiltradas);
    
    return true;
  };

  // Obtener todas las cuotas con información de la liquidación mensual
  const listarLiquidaciones = (mes?: string): LiquidacionCuota[] => {
    let cuotas = [...liquidacionesCuotas];
    
    if (mes) {
      const liquidacionMensual = liquidacionesMensuales.find(lm => lm.mes === mes);
      if (liquidacionMensual) {
        cuotas = cuotas.filter(lc => lc.liquidacionMensualId === liquidacionMensual.id);
      } else {
        return [];
      }
    }
    
    return cuotas;
  };

  // Obtener liquidación mensual por mes
  const getLiquidacionMensualPorMes = (mes: string): LiquidacionMensual | undefined => {
    return liquidacionesMensuales.find(lm => lm.mes === mes);
  };

  // Obtener todas las liquidaciones mensuales
  const listarLiquidacionesMensuales = (): LiquidacionMensual[] => {
    return [...liquidacionesMensuales];
  };

  return {
    liquidacionesMensuales,
    liquidacionesCuotas,
    loading,
    generarLiquidacionMensual,
    marcarComoPagado,
    marcarComoNoPagado,
    borrarLiquidacionCuota,
    borrarLiquidacionMensual,
    marcarCuotasComoPagadas,
    listarLiquidaciones,
    listarLiquidacionesMensuales,
    getLiquidacionMensualPorMes,
    loadLiquidaciones,
  };
};
