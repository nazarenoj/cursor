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
  ): Promise<{ liquidacionMensual: LiquidacionMensual; cuotas: LiquidacionCuota[] }> => {
    const resultado = await apiService.crearLiquidacionMensual(mes);
    setLiquidacionesMensuales((prev) => [...prev, resultado.liquidacionMensual]);
    setLiquidacionesCuotas((prev) => [...prev, ...resultado.cuotas]);
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
    const actualizadas = await apiService.pagarCuotas(ids, medioPago, fechaPago);
    const mapa = new Map(actualizadas.map((cuota) => [cuota.id, cuota]));
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
