import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { LiquidacionCuota, LiquidacionMensual } from '../types';

export const useLiquidaciones = () => {
  const [liquidacionesMensuales, setLiquidacionesMensuales] = useState<LiquidacionMensual[]>([]);
  const [liquidacionesCuotas, setLiquidacionesCuotas] = useState<LiquidacionCuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLiquidaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mensuales, cuotas] = await Promise.all([
        apiService.getLiquidacionesMensuales(),
        apiService.getLiquidacionesCuotas(),
      ]);
      setLiquidacionesMensuales(mensuales);
      setLiquidacionesCuotas(
        cuotas.map((cuota) => ({
          ...cuota,
          medioPago: cuota.medioPago ?? null,
        })),
      );
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : 'Error al cargar las liquidaciones.';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiquidaciones().catch(() => {
      // el error ya fue registrado
    });
  }, [loadLiquidaciones]);

  const generarLiquidacionMensual = async (
    mes: string,
    socioId?: number,
    reemplazarSiNoPagada?: boolean,
  ): Promise<{
    liquidacionMensual: LiquidacionMensual;
    cuotas: LiquidacionCuota[];
    liquidacionExistia?: boolean;
    sociosNuevosIncluidos?: number;
    yaExisteNoPagada?: boolean;
    yaTeníaCuotaPagada?: boolean;
    soloParaUnSocio?: boolean;
  }> => {
    const resultado = await apiService.crearLiquidacionMensual(mes, socioId, reemplazarSiNoPagada);
    const id = resultado.liquidacionMensual.id;
    setLiquidacionesMensuales((prev) => {
      const existe = prev.some((lm) => lm.id === id);
      if (existe) return prev.map((lm) => (lm.id === id ? resultado.liquidacionMensual : lm));
      return [...prev, resultado.liquidacionMensual];
    });
    setLiquidacionesCuotas((prev) => {
      const sinEsteMes = prev.filter((c) => c.liquidacionMensualId !== id);
      return [...sinEsteMes, ...resultado.cuotas];
    });
    return resultado;
  };

  const generarLiquidacionesPorSocios = async (
    socioIds: number[],
    meses: string[],
  ): Promise<{
    resultados: Array<{
      mes: string;
      liquidacionMensual: LiquidacionMensual;
      cuotas: LiquidacionCuota[];
      cuotasCreadas: number;
      cuotasExistentes: number;
      sociosNuevosIncluidos?: number;
    }>;
    totalMeses: number;
    totalCuotasCreadas: number;
    totalSociosNuevosIncluidos?: number;
  }> => {
    const resultado = await apiService.crearLiquidacionesPorSocios(socioIds, meses);
    
    // Actualizar estado con las nuevas liquidaciones mensuales (evitar duplicados)
    setLiquidacionesMensuales((prev) => {
      const nuevas = resultado.resultados.map(r => r.liquidacionMensual);
      const existentes = new Set(prev.map(lm => lm.id));
      const sinDuplicados = nuevas.filter(lm => !existentes.has(lm.id));
      return [...prev, ...sinDuplicados];
    });
    
    // Actualizar estado con las nuevas cuotas
    setLiquidacionesCuotas((prev) => {
      const nuevas = resultado.resultados.flatMap(r => r.cuotas);
      const existentes = new Set(prev.map(c => c.id));
      const sinDuplicados = nuevas.filter(c => !existentes.has(c.id));
      return [...prev, ...sinDuplicados];
    });
    
    return resultado;
  };

  const marcarComoPagado = async (
    id: number,
    medioPago: string = 'Efectivo',
    fechaPago?: string,
  ): Promise<LiquidacionCuota | null> => {
    const cuotaActual = liquidacionesCuotas.find((lc) => lc.id === id);
    if (!cuotaActual) return null;
    const actualizada = await apiService.marcarCuotaPagada(id, medioPago, fechaPago);
    setLiquidacionesCuotas((prev) => prev.map((lc) => (lc.id === id ? actualizada : lc)));
    return actualizada;
  };

  const marcarComoNoPagado = async (id: number): Promise<LiquidacionCuota | null> => {
    const cuotaActual = liquidacionesCuotas.find((lc) => lc.id === id);
    if (!cuotaActual) return null;
    const actualizada = await apiService.marcarCuotaPendiente(id);
    setLiquidacionesCuotas((prev) => prev.map((lc) => (lc.id === id ? actualizada : lc)));
    return actualizada;
  };

  const borrarLiquidacionCuota = async (id: number): Promise<void> => {
    await apiService.eliminarLiquidacionCuota(id);
    setLiquidacionesCuotas((prev) => prev.filter((lc) => lc.id !== id));
  };

  const marcarCuotasComoPagadas = async (
    ids: number[],
    medioPago: string,
    fechaPago?: string,
  ): Promise<LiquidacionCuota[]> => {
    if (ids.length === 0) return [];
    const respuesta = await apiService.pagarCuotas(ids, medioPago, fechaPago);
    // La respuesta puede ser un array o un objeto con propiedad cuotas
    let actualizadas: LiquidacionCuota[];
    if (Array.isArray(respuesta)) {
      actualizadas = respuesta;
    } else if (respuesta && typeof respuesta === 'object' && 'cuotas' in respuesta) {
      const respuestaConCuotas = respuesta as { cuotas: LiquidacionCuota[] };
      actualizadas = Array.isArray(respuestaConCuotas.cuotas) ? respuestaConCuotas.cuotas : [];
    } else {
      actualizadas = [];
    }
    const mapa = new Map(actualizadas.map((cuota: LiquidacionCuota) => [cuota.id, cuota]));
    setLiquidacionesCuotas((prev) =>
      prev.map((cuota) => (mapa.has(cuota.id) ? mapa.get(cuota.id)! : cuota)),
    );
    return actualizadas;
  };

  const borrarLiquidacionMensual = async (id: number): Promise<void> => {
    await apiService.eliminarLiquidacionMensual(id);
    setLiquidacionesMensuales((prev) => prev.filter((lm) => lm.id !== id));
    setLiquidacionesCuotas((prev) => prev.filter((lc) => lc.liquidacionMensualId !== id));
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
    error,
    generarLiquidacionMensual,
    generarLiquidacionesPorSocios,
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
