import { useState, useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { FormularioLiquidacion } from './FormularioLiquidacion';
import { TablaLiquidaciones } from './TablaLiquidaciones';
import { TablaLiquidacionesMensuales } from './TablaLiquidacionesMensuales';
import { ImprimirLiquidaciones } from './ImprimirLiquidaciones';
import './ListaLiquidaciones.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export const ListaLiquidaciones = () => {
  const { 
    liquidacionesMensuales,
    liquidacionesCuotas,
    generarLiquidacionMensual, 
    marcarComoPagado, 
    marcarComoNoPagado,
    borrarLiquidacionCuota,
    borrarLiquidacionMensual,
    listarLiquidaciones,
    getLiquidacionMensualPorMes,
    loading: loadingLiquidaciones,
    error: errorLiquidaciones,
  } = useLiquidaciones();
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mesDetalle, setMesDetalle] = useState<string | null>(null);
  const [mesImpresion, setMesImpresion] = useState<string | null>(null);
  const [mostrarImpresion, setMostrarImpresion] = useState(false);
  const [error, setError] = useState<string>('');
  const [mostrarGrafico, setMostrarGrafico] = useState(false);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const totalLiquidado = useMemo(
    () => liquidacionesCuotas.reduce((sum, cuota) => sum + cuota.monto, 0),
    [liquidacionesCuotas],
  );
  const totalCobrado = useMemo(
    () => liquidacionesCuotas.filter((cuota) => cuota.pagado).reduce((sum, cuota) => sum + cuota.monto, 0),
    [liquidacionesCuotas],
  );
  const totalAdeudado = useMemo(
    () => Math.max(totalLiquidado - totalCobrado, 0),
    [totalLiquidado, totalCobrado],
  );

  const graficoData = useMemo(() => {
    if (totalLiquidado <= 0) {
      return null;
    }
    const porcentajePagado = totalCobrado > 0 ? (totalCobrado / totalLiquidado) * 100 : 0;
    const porcentajeAdeudado = Math.max(100 - porcentajePagado, 0);
    return {
      labels: ['Pagado (%)', 'Adeudado (%)'],
      datasets: [
        {
          label: 'Distribución porcentual',
          data: [Number(porcentajePagado.toFixed(2)), Number(porcentajeAdeudado.toFixed(2))],
          backgroundColor: ['rgba(72, 187, 120, 0.8)', 'rgba(244, 114, 182, 0.8)'],
          borderColor: ['rgba(56, 161, 105, 1)', 'rgba(236, 72, 153, 1)'],
          borderWidth: 1,
        },
      ],
    };
  }, [totalLiquidado, totalCobrado]);

  const graficoOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'pie'>) => {
            const label = context.label || '';
            const value = typeof context.parsed === 'number' ? context.parsed : 0;
            const monto = label.startsWith('Pagado') ? totalCobrado : totalAdeudado;
            return `${label}: ${value.toFixed(2)}% ($${monto.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })})`;
          },
        },
      },
    },
  };

  // Función helper para obtener el mes de una cuota
  const getMesDeCuota = (cuota: typeof liquidacionesCuotas[0]): string => {
    const liquidacionMensual = liquidacionesMensuales.find(lm => lm.id === cuota.liquidacionMensualId);
    return liquidacionMensual?.mes || '';
  };

  // Función helper para obtener la fecha de liquidación de una cuota
  const getFechaLiquidacionDeCuota = (cuota: typeof liquidacionesCuotas[0]): string => {
    const liquidacionMensual = liquidacionesMensuales.find(lm => lm.id === cuota.liquidacionMensualId);
    return liquidacionMensual?.fechaLiquidacion || '';
  };

  const ordenarPorMes = (
    a: { mes: string; fechaLiquidacion: string },
    b: { mes: string; fechaLiquidacion: string },
  ) => {
    if (b.mes !== a.mes) {
      return b.mes.localeCompare(a.mes);
    }
    const fechaA = a.fechaLiquidacion || '';
    const fechaB = b.fechaLiquidacion || '';
    return fechaB.localeCompare(fechaA);
  };

const getNombreMes = (mesString: string) => {
  if (!mesString) return '-';
  const [año, mes] = mesString.split('-');
  const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
  return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
};

  // Obtener todas las cuotas con información de mes
  const todasLiquidaciones = listarLiquidaciones().map(cuota => ({
    ...cuota,
    mes: getMesDeCuota(cuota),
    fechaLiquidacion: getFechaLiquidacionDeCuota(cuota),
  }));

  const liquidacionesFiltradas = useMemo(() => {
    return todasLiquidaciones.filter((cuota) => {
      if (filtroDesde) {
        const fechaLiquidacion = cuota.fechaLiquidacion || '';
        const fechaComparar = fechaLiquidacion ? new Date(fechaLiquidacion) : null;
        if (!fechaComparar || fechaComparar < new Date(filtroDesde)) {
          return false;
        }
      }
      if (filtroHasta) {
        const fechaLiquidacion = cuota.fechaLiquidacion || '';
        const fechaComparar = fechaLiquidacion ? new Date(fechaLiquidacion) : null;
        if (!fechaComparar || fechaComparar > new Date(filtroHasta)) {
          return false;
        }
      }
      return true;
    });
  }, [todasLiquidaciones, filtroDesde, filtroHasta]);

  const cuotasOrdenadas = useMemo(() => {
    return [...liquidacionesFiltradas].sort(ordenarPorMes);
  }, [liquidacionesFiltradas]);

  const obtenerCuotasPorMes = (mes: string) => cuotasOrdenadas.filter(l => l.mes === mes);

  const handleGenerar = async (mes: string) => {
    try {
      setError('');
      await generarLiquidacionMensual(mes);
      setMostrarFormulario(false);
      alert(`Liquidación generada exitosamente para el mes ${mes}`);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al generar la liquidación';
      setError(mensaje);
      alert(mensaje);
    }
  };

  const handleMarcarPagado = async (id: number) => {
    if (window.confirm('¿Marcar esta liquidación como pagada?')) {
      try {
        await marcarComoPagado(id);
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudo marcar como pagada.';
        alert(mensaje);
      }
    }
  };

  const handleMarcarNoPagado = async (id: number) => {
    if (window.confirm('¿Marcar esta liquidación como no pagada?')) {
      try {
        await marcarComoNoPagado(id);
      } catch (error) {
        const mensaje =
          error instanceof Error ? error.message : 'No se pudo marcar como pendiente.';
        alert(mensaje);
      }
    }
  };

  const handleBorrar = async (id: number) => {
    if (window.confirm('¿Está seguro que desea eliminar esta liquidación individual?')) {
      try {
        await borrarLiquidacionCuota(id);
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error al borrar la liquidación';
        alert(mensaje);
      }
    }
  };

  const handleBorrarLiquidacionMensual = async (mes: string) => {
    const liquidacionMensual = getLiquidacionMensualPorMes(mes);
    if (!liquidacionMensual) return;

    if (window.confirm(`¿Está seguro que desea eliminar toda la liquidación del mes ${mes}? Esto eliminará todas las cuotas relacionadas.`)) {
      try {
        await borrarLiquidacionMensual(liquidacionMensual.id);
        if (mesDetalle === mes) {
          setMesDetalle(null);
        }
        alert('Liquidación mensual eliminada exitosamente');
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error al borrar la liquidación mensual';
        alert(mensaje);
      }
    }
  };

  const handleVerDetalle = (mes: string) => {
    setMesDetalle(mes);
  };

  const handleCerrarDetalle = () => {
    setMesDetalle(null);
  };

  const handleImprimirMes = (mes?: string) => {
    if (mes && obtenerCuotasPorMes(mes).length === 0) {
      alert('No hay liquidaciones para imprimir en el mes seleccionado');
      return;
    }
    if (!mes && cuotasOrdenadas.length === 0) {
      alert('No hay liquidaciones para imprimir');
      return;
    }
    setMesImpresion(mes || null);
    setMostrarImpresion(true);
  };

  if (loadingLiquidaciones) {
    return (
      <div className="lista-liquidaciones">
        <p>Cargando liquidaciones...</p>
      </div>
    );
  }

  if (errorLiquidaciones && liquidacionesMensuales.length === 0) {
    return (
      <div className="lista-liquidaciones">
        <p className="mensaje-error">{errorLiquidaciones}</p>
      </div>
    );
  }

  if (mostrarImpresion) {
    const liquidacionesParaImpresion = mesImpresion
      ? obtenerCuotasPorMes(mesImpresion)
      : cuotasOrdenadas;

    return (
      <ImprimirLiquidaciones
        liquidaciones={liquidacionesParaImpresion}
        mesFiltro={mesImpresion ?? ''}
        onVolver={() => {
          setMostrarImpresion(false);
          setMesImpresion(null);
        }}
      />
    );
  }

  if (mostrarFormulario) {
    return (
      <div className="lista-liquidaciones">
        <FormularioLiquidacion
          onGenerar={handleGenerar}
          onCancel={() => {
            setMostrarFormulario(false);
            setError('');
          }}
        />
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (mesDetalle) {
    const detalle = obtenerCuotasPorMes(mesDetalle).sort(ordenarPorMes);
    const nombreMesDetalle = getNombreMes(mesDetalle);

    return (
      <div className="lista-liquidaciones">
        <div className="lista-header">
          <h1>Detalle de Liquidación - {nombreMesDetalle}</h1>
          <div className="lista-actions">
            <button onClick={handleCerrarDetalle} className="btn-volver">
              ← Volver al listado
            </button>
                <button onClick={() => handleImprimirMes(mesDetalle)} className="btn-imprimir">
                  📄 Exportar PDF
                </button>
            <button
              onClick={() => handleBorrarLiquidacionMensual(mesDetalle)}
              className="btn-borrar-mes"
              title="Borrar liquidación mensual completa"
            >
              🗑️ Borrar Mes
            </button>
          </div>
        </div>

        <TablaLiquidaciones
          liquidaciones={detalle}
          onMarcarPagado={handleMarcarPagado}
          onMarcarNoPagado={handleMarcarNoPagado}
          onBorrar={handleBorrar}
        />
      </div>
    );
  }

  return (
    <div className="lista-liquidaciones">
      <div className="lista-header">
        <h1>Gestión de Liquidaciones Mensuales</h1>
        <div className="lista-actions">
          <div className="filtros-fecha">
            <div className="filtro">
              <label htmlFor="liquidaciones-desde">Fecha desde</label>
              <input
                id="liquidaciones-desde"
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
              />
            </div>
            <div className="filtro">
              <label htmlFor="liquidaciones-hasta">Fecha hasta</label>
              <input
                id="liquidaciones-hasta"
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
              />
            </div>
          </div>
          <button onClick={() => setMostrarFormulario(true)} className="btn-agregar">
            + Generar Liquidación
          </button>
              {cuotasOrdenadas.length > 0 && (
                <button onClick={() => handleImprimirMes()} className="btn-imprimir">
                  📄 Exportar PDF
                </button>
              )}
          <button
            className="btn-grafico"
            onClick={() => setMostrarGrafico((prev) => !prev)}
            disabled={!graficoData}
          >
            📊 {mostrarGrafico ? 'Ocultar gráfico' : 'Ver gráfico'}
          </button>
        </div>
      </div>

      {mostrarGrafico && graficoData && (
        <div className="grafico-liquidaciones">
          <Pie data={graficoData} options={graficoOptions} />
          <div className="resumen-grafico">
            <div>
              <span>Total liquidado:</span> ${totalLiquidado.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div>
              <span>Total cobrado:</span> ${totalCobrado.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div>
              <span>Total adeudado:</span> ${totalAdeudado.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      )}

      <TablaLiquidacionesMensuales
        liquidacionesMensuales={liquidacionesMensuales}
        liquidacionesCuotas={cuotasOrdenadas}
        onVerDetalle={handleVerDetalle}
        onImprimir={handleImprimirMes}
        onBorrar={handleBorrarLiquidacionMensual}
      />
    </div>
  );
};

