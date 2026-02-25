import { useState, useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useSocios } from '../hooks/useSocios';
import { FormularioLiquidacion } from './FormularioLiquidacion';
import { FormularioLiquidacionSocios } from './FormularioLiquidacionSocios';
import { TablaLiquidaciones } from './TablaLiquidaciones';
import { TablaLiquidacionesMensuales } from './TablaLiquidacionesMensuales';
import { ImprimirLiquidaciones } from './ImprimirLiquidaciones';
import { EnviarWhatsApp } from './EnviarWhatsApp';
import './ListaLiquidaciones.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export const ListaLiquidaciones = () => {
  const { 
    liquidacionesMensuales,
    liquidacionesCuotas,
    generarLiquidacionMensual,
    generarLiquidacionesPorSocios, 
    marcarComoPagado, 
    marcarComoNoPagado,
    borrarLiquidacionCuota,
    borrarLiquidacionMensual,
    listarLiquidaciones,
    getLiquidacionMensualPorMes,
    loadLiquidaciones,
    loading: loadingLiquidaciones,
    error: errorLiquidaciones,
  } = useLiquidaciones();
  const { socios } = useSocios();
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarFormularioSocios, setMostrarFormularioSocios] = useState(false);
  const [mesDetalle, setMesDetalle] = useState<string | null>(null);
  const [mesImpresion, setMesImpresion] = useState<string | null>(null);
  const [mostrarImpresion, setMostrarImpresion] = useState(false);
  const [mostrarWhatsApp, setMostrarWhatsApp] = useState(false);
  const [liquidacionMensualWhatsApp, setLiquidacionMensualWhatsApp] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string>('');
  const [mostrarGrafico, setMostrarGrafico] = useState(false);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroSocioId, setFiltroSocioId] = useState<number | ''>('');

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
      // Filtro por fecha desde
      if (filtroDesde) {
        const fechaLiquidacion = cuota.fechaLiquidacion || '';
        const fechaComparar = fechaLiquidacion ? new Date(fechaLiquidacion) : null;
        if (!fechaComparar || fechaComparar < new Date(filtroDesde)) {
          return false;
        }
      }
      // Filtro por fecha hasta
      if (filtroHasta) {
        const fechaLiquidacion = cuota.fechaLiquidacion || '';
        const fechaComparar = fechaLiquidacion ? new Date(fechaLiquidacion) : null;
        if (!fechaComparar || fechaComparar > new Date(filtroHasta)) {
          return false;
        }
      }
      // Filtro por mes de liquidación
      if (filtroMes) {
        if (cuota.mes !== filtroMes) {
          return false;
        }
      }
      // Filtro por socio
      if (filtroSocioId !== '') {
        const socioIdNumero = Number(filtroSocioId);
        if (cuota.socioId !== socioIdNumero) {
          return false;
        }
      }
      return true;
    });
  }, [todasLiquidaciones, filtroDesde, filtroHasta, filtroMes, filtroSocioId]);

  const cuotasOrdenadas = useMemo(() => {
    return [...liquidacionesFiltradas].sort(ordenarPorMes);
  }, [liquidacionesFiltradas]);

  // Filtrar liquidaciones mensuales basándose en los filtros
  const liquidacionesMensualesFiltradas = useMemo(() => {
    let filtradas = [...liquidacionesMensuales];
    
    // Filtro por mes de liquidación
    if (filtroMes) {
      filtradas = filtradas.filter(lm => lm.mes === filtroMes);
    }
    
    // Filtro por socio - solo mostrar liquidaciones que tienen cuotas del socio seleccionado
    if (filtroSocioId !== '') {
      const socioIdNumero = Number(filtroSocioId);
      const liquidacionesIdsConSocio = new Set(
        cuotasOrdenadas
          .filter(cuota => cuota.socioId === socioIdNumero)
          .map(cuota => cuota.liquidacionMensualId)
      );
      filtradas = filtradas.filter(lm => liquidacionesIdsConSocio.has(lm.id));
    }
    
    // Filtro por fecha desde
    if (filtroDesde) {
      filtradas = filtradas.filter(lm => {
        if (!lm.fechaLiquidacion) return false;
        const fechaComparar = new Date(lm.fechaLiquidacion);
        return fechaComparar >= new Date(filtroDesde);
      });
    }
    
    // Filtro por fecha hasta
    if (filtroHasta) {
      filtradas = filtradas.filter(lm => {
        if (!lm.fechaLiquidacion) return false;
        const fechaComparar = new Date(lm.fechaLiquidacion);
        return fechaComparar <= new Date(filtroHasta);
      });
    }
    
    return filtradas;
  }, [liquidacionesMensuales, filtroMes, filtroSocioId, filtroDesde, filtroHasta, cuotasOrdenadas]);

  const obtenerCuotasPorMes = (mes: string) => cuotasOrdenadas.filter(l => l.mes === mes);

  const handleGenerar = async (mes: string, reemplazarSiNoPagada?: boolean) => {
    const socioId = filtroSocioId !== '' ? Number(filtroSocioId) : undefined;
    try {
      setError('');
      const resultado = await generarLiquidacionMensual(mes, socioId, reemplazarSiNoPagada);

      if (resultado.yaExisteNoPagada && !reemplazarSiNoPagada) {
        const confirmar = window.confirm(
          'El socio ya tiene una liquidación para este mes (no pagada). ¿Reemplazarla por una nueva?',
        );
        if (confirmar) {
          await handleGenerar(mes, true);
        }
        return;
      }

      setMostrarFormulario(false);
      let msg: string;
      if (resultado.yaTeníaCuotaPagada) {
        msg = `El socio ya tiene una liquidación pagada para el mes ${mes}. No se realizaron cambios.`;
      } else if (resultado.soloParaUnSocio) {
        msg = `Liquidación generada para el socio seleccionado (mes ${mes}).`;
      } else if (resultado.liquidacionExistia) {
        msg = `La liquidación del mes ${mes} ya existía.`;
        if (resultado.sociosNuevosIncluidos != null && resultado.sociosNuevosIncluidos > 0) {
          msg += `\nSe agregaron ${resultado.sociosNuevosIncluidos} cuota(s) para socio(s) activo(s) que no tenían.`;
        } else {
          msg += `\nTodos los socios activos ya tenían cuota.`;
        }
      } else {
        msg = `Liquidación generada exitosamente para el mes ${mes}.\n${resultado.cuotas.length} cuota(s) creada(s).`;
        if (resultado.sociosNuevosIncluidos != null && resultado.sociosNuevosIncluidos > 0) {
          msg += `\n${resultado.sociosNuevosIncluidos} socio(s) activo(s) sin liquidación previa fueron incluidos.`;
        }
      }
      alert(msg);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al generar la liquidación';
      setError(mensaje);
      alert(mensaje);
    }
  };

  const handleGenerarPorSocios = async (socioIds: number[], meses: string[]) => {
    try {
      setError('');
      const resultado = await generarLiquidacionesPorSocios(socioIds, meses);
      setMostrarFormularioSocios(false);
      
      let mensaje = `Liquidaciones generadas exitosamente:\n` +
        `- ${resultado.totalMeses} mes(es) procesado(s)\n` +
        `- ${resultado.totalCuotasCreadas} cuota(s) creada(s)\n` +
        `- ${socioIds.length} socio(s) seleccionado(s)`;
      if (resultado.totalSociosNuevosIncluidos != null && resultado.totalSociosNuevosIncluidos > 0) {
        mensaje += `\n- ${resultado.totalSociosNuevosIncluidos} socio(s) activo(s) sin liquidación previa incluidos en los meses.`;
      }
      alert(mensaje);
      // Recargar liquidaciones para mostrar las nuevas
      await loadLiquidaciones();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al generar las liquidaciones';
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

  const handleEnviarWhatsApp = (liquidacionMensualId?: number) => {
    setLiquidacionMensualWhatsApp(liquidacionMensualId);
    setMostrarWhatsApp(true);
  };

  const handleCerrarWhatsApp = () => {
    setMostrarWhatsApp(false);
    setLiquidacionMensualWhatsApp(undefined);
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

  if (mostrarWhatsApp) {
    return (
      <EnviarWhatsApp
        liquidacionMensualId={liquidacionMensualWhatsApp}
        onVolver={handleCerrarWhatsApp}
      />
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

  if (mostrarFormularioSocios) {
    return (
      <div className="lista-liquidaciones">
        <FormularioLiquidacionSocios
          onGenerar={handleGenerarPorSocios}
          onCancel={() => {
            setMostrarFormularioSocios(false);
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

  if (mostrarFormulario) {
    const socioFiltro = filtroSocioId !== '' ? socios.find((s) => s.id === filtroSocioId) : null;
    return (
      <div className="lista-liquidaciones">
        <FormularioLiquidacion
          onGenerar={handleGenerar}
          soloParaSocio={socioFiltro ? `${socioFiltro.apellido}, ${socioFiltro.nombre}` : undefined}
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
      <div className="lista-liquidaciones lista-liquidaciones-detalle">
        <div className="lista-header">
          <h1>Detalle de Liquidación - {nombreMesDetalle}</h1>
          <div className="lista-actions">
            <button onClick={handleCerrarDetalle} className="btn-volver">
              ← Volver al listado
            </button>
                <button onClick={() => handleImprimirMes(mesDetalle)} className="btn-imprimir">
                  📄 Exportar PDF
                </button>
            {(() => {
              const liquidacionMensual = liquidacionesMensuales.find(lm => lm.mes === mesDetalle);
              return liquidacionMensual ? (
                <button
                  onClick={() => handleEnviarWhatsApp(liquidacionMensual.id)}
                  className="btn-whatsapp"
                  title="Enviar por WhatsApp"
                >
                  📱 Enviar WhatsApp
                </button>
              ) : null;
            })()}
            <button
              onClick={() => handleBorrarLiquidacionMensual(mesDetalle)}
              className="btn-borrar-mes"
              title="Borrar liquidación mensual completa"
            >
              🗑️ Borrar Mes
            </button>
          </div>
        </div>

        <div className="detalle-tabla-liquidaciones-wrapper">
          <TablaLiquidaciones
            liquidaciones={detalle}
            onMarcarPagado={handleMarcarPagado}
            onMarcarNoPagado={handleMarcarNoPagado}
            onBorrar={handleBorrar}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="lista-liquidaciones lista-liquidaciones-principal">
      <div className="lista-header">
        <h1>Gestión de Liquidaciones Mensuales</h1>
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
          <div className="filtro">
            <label htmlFor="liquidaciones-mes">Mes de liquidación</label>
            <input
              id="liquidaciones-mes"
              type="month"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
            />
          </div>
          <div className="filtro">
            <label htmlFor="liquidaciones-socio">Socio</label>
            <select
              id="liquidaciones-socio"
              value={filtroSocioId}
              onChange={(e) => setFiltroSocioId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Todos los socios</option>
              {socios.map((socio) => (
                <option key={socio.id} value={socio.id}>
                  #{socio.numeroSocio} - {socio.apellido}, {socio.nombre}
                </option>
              ))}
            </select>
          </div>
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

      <div className="tabla-mensuales-wrapper">
        <TablaLiquidacionesMensuales
          liquidacionesMensuales={liquidacionesMensualesFiltradas}
          liquidacionesCuotas={cuotasOrdenadas}
          onVerDetalle={handleVerDetalle}
          onImprimir={handleImprimirMes}
          onBorrar={handleBorrarLiquidacionMensual}
          onEnviarWhatsApp={(mes) => {
            const liquidacionMensual = liquidacionesMensualesFiltradas.find(lm => lm.mes === mes);
            if (liquidacionMensual) {
              handleEnviarWhatsApp(liquidacionMensual.id);
            }
          }}
          extraActions={
            <>
              <button onClick={() => setMostrarFormulario(true)} className="btn-agregar">
                + Generar Liquidación Mensual
              </button>
              <button onClick={() => setMostrarFormularioSocios(true)} className="btn-agregar btn-agregar-socios">
                + Generar por Socios (Resto del Año)
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
            </>
          }
        />
      </div>
    </div>
  );
};

