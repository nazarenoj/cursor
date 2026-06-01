import { lazy, Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { useCategorias } from '../hooks/useCategorias';
import { useFilterPreferences } from '../hooks/useFilterPreferences';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { SelectorColumnas } from './SelectorColumnas';
import { TablaLiquidacionesMensuales } from './TablaLiquidacionesMensuales';
import { ErrorBoundary } from './ErrorBoundary';
import './ListaLiquidaciones.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const FormularioLiquidacion = lazy(() =>
  import('./FormularioLiquidacion').then((m) => ({ default: m.FormularioLiquidacion })),
);
const FormularioLiquidacionSocios = lazy(() =>
  import('./FormularioLiquidacionSocios').then((m) => ({ default: m.FormularioLiquidacionSocios })),
);
const TablaLiquidaciones = lazy(() =>
  import('./TablaLiquidaciones').then((m) => ({ default: m.TablaLiquidaciones })),
);
const EnviarWhatsApp = lazy(() =>
  import('./EnviarWhatsApp').then((m) => ({ default: m.EnviarWhatsApp })),
);

const LIQUIDACIONES_FILTROS = [
  { id: 'categoria', label: 'Categoría(s)' },
  { id: 'socio', label: 'Socio (nombre o número)' },
  { id: 'año', label: 'Año' },
  { id: 'fecha', label: 'Mes de liquidación (desde / hasta)' },
];
const LIQUIDACIONES_FILTROS_DEFAULT = LIQUIDACIONES_FILTROS.map((f) => f.id);

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
  const { categorias } = useCategorias();
  const { nombreClub } = useClubConfig();

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarFormularioSocios, setMostrarFormularioSocios] = useState(false);
  const [mesDetalle, setMesDetalle] = useState<string | null>(null);
  const [mostrarWhatsApp, setMostrarWhatsApp] = useState(false);
  const [liquidacionMensualWhatsApp, setLiquidacionMensualWhatsApp] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string>('');
  const [mostrarGrafico, setMostrarGrafico] = useState(false);
  const [modalGrafico, setModalGrafico] = useState<'pie' | 'barras' | null>(null);
  const [filtroCategoriaIds, setFiltroCategoriaIds] = useState<number[]>([]);
  const [filtroSocioTexto, setFiltroSocioTexto] = useState('');
  const [filtroAño, setFiltroAño] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroCategoriasAbierto, setFiltroCategoriasAbierto] = useState(false);
  const refFiltroCategorias = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (refFiltroCategorias.current && !refFiltroCategorias.current.contains(e.target as Node)) {
        setFiltroCategoriasAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!modalGrafico) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalGrafico(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalGrafico]);

  const {
    visibleFilters,
    setVisibleFilters,
    toggleFilter,
    isFilterVisible,
  } = useFilterPreferences('liquidaciones-filtros', LIQUIDACIONES_FILTROS_DEFAULT);

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
      if (filtroCategoriaIds.length > 0 && !filtroCategoriaIds.includes(cuota.categoriaId)) {
        return false;
      }
      if (filtroSocioTexto.trim()) {
        const texto = filtroSocioTexto.trim().toLowerCase();
        const numeroStr = String(cuota.numeroSocio ?? '').toLowerCase();
        const apellido = (cuota.apellido ?? '').toLowerCase();
        const nombre = (cuota.nombre ?? '').toLowerCase();
        const matchNumero = numeroStr.includes(texto);
        const matchApellido = apellido.includes(texto);
        const matchNombre = nombre.includes(texto);
        const matchNombreCompleto = `${apellido} ${nombre}`.trim().includes(texto) || `${nombre} ${apellido}`.trim().includes(texto);
        if (!matchNumero && !matchApellido && !matchNombre && !matchNombreCompleto) {
          return false;
        }
      }
      if (filtroAño && !cuota.mes.startsWith(filtroAño)) {
        return false;
      }
      const mesDesde = filtroDesde || '';
      const mesHasta = filtroHasta || '';
      if (mesDesde && cuota.mes < mesDesde) return false;
      if (mesHasta && cuota.mes > mesHasta) return false;
      return true;
    });
  }, [todasLiquidaciones, filtroCategoriaIds, filtroSocioTexto, filtroAño, filtroDesde, filtroHasta]);

  const cuotasOrdenadas = useMemo(() => {
    return [...liquidacionesFiltradas].sort(ordenarPorMes);
  }, [liquidacionesFiltradas]);

  // Filtrar liquidaciones mensuales: por año, por fecha desde/hasta y solo las que tienen al menos una cuota que pasa los filtros
  const liquidacionesMensualesFiltradas = useMemo(() => {
    const idsConCuotas = new Set(cuotasOrdenadas.map(c => c.liquidacionMensualId));
    let filtradas = liquidacionesMensuales.filter(lm => idsConCuotas.has(lm.id));
    if (filtroAño) {
      filtradas = filtradas.filter(lm => lm.mes.startsWith(filtroAño));
    }
    const mesDesde = filtroDesde || '';
    const mesHasta = filtroHasta || '';
    if (mesDesde) filtradas = filtradas.filter(lm => lm.mes >= mesDesde);
    if (mesHasta) filtradas = filtradas.filter(lm => lm.mes <= mesHasta);
    return filtradas;
  }, [liquidacionesMensuales, filtroAño, filtroDesde, filtroHasta, cuotasOrdenadas]);

  const obtenerCuotasPorMes = (mes: string) => cuotasOrdenadas.filter(l => l.mes === mes);

  const añosDisponibles = useMemo(() => {
    const años = new Set<string>(liquidacionesMensuales.map(lm => lm.mes.substring(0, 4)));
    const añoActual = new Date().getFullYear().toString();
    años.add(añoActual);
    return [...años].sort((a, b) => Number(b) - Number(a));
  }, [liquidacionesMensuales]);

  // Totales y gráficos a partir de cuotas filtradas
  const totalLiquidado = useMemo(
    () => cuotasOrdenadas.reduce((sum, cuota) => sum + cuota.monto, 0),
    [cuotasOrdenadas],
  );
  const totalCobrado = useMemo(
    () => cuotasOrdenadas.filter((cuota) => cuota.pagado).reduce((sum, cuota) => sum + cuota.monto, 0),
    [cuotasOrdenadas],
  );
  const totalAdeudado = useMemo(
    () => Math.max(totalLiquidado - totalCobrado, 0),
    [totalLiquidado, totalCobrado],
  );

  const graficoData = useMemo(() => {
    if (totalLiquidado <= 0) return null;
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

  const graficoOptions: ChartOptions<'pie'> = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { position: 'bottom' as const, labels: { boxWidth: 16 } },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'pie'>) => {
            const label = context.label || '';
            const value = typeof context.parsed === 'number' ? context.parsed : 0;
            const monto = label.startsWith('Pagado') ? totalCobrado : totalAdeudado;
            return `${label}: ${value.toFixed(2)}% ($${monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
          },
        },
      },
    },
  }), [totalCobrado, totalAdeudado]);

  // Gráfico de barras: cobrado vs liquidado por liquidación mensual (datos filtrados)
  const graficoBarrasData = useMemo(() => {
    const ordenadas = [...liquidacionesMensualesFiltradas].sort((a, b) => a.mes.localeCompare(b.mes));
    if (ordenadas.length === 0) return null;
    const labels = ordenadas.map(lm => {
      const [año, mes] = lm.mes.split('-');
      const d = new Date(parseInt(año), parseInt(mes) - 1, 1);
      return d.toLocaleString('es-AR', { month: 'short', year: '2-digit' });
    });
    const liquidadoPorMes = ordenadas.map(lm => {
      const cuotas = cuotasOrdenadas.filter(c => c.liquidacionMensualId === lm.id);
      return cuotas.reduce((s, c) => s + c.monto, 0);
    });
    const cobradoPorMes = ordenadas.map(lm => {
      const cuotas = cuotasOrdenadas.filter(c => c.liquidacionMensualId === lm.id && c.pagado);
      return cuotas.reduce((s, c) => s + c.monto, 0);
    });
    return {
      labels,
      datasets: [
        { label: 'Liquidado', data: liquidadoPorMes, backgroundColor: 'rgba(102, 126, 234, 0.8)', borderColor: 'rgb(102, 126, 234)', borderWidth: 1 },
        { label: 'Cobrado', data: cobradoPorMes, backgroundColor: 'rgba(72, 187, 120, 0.8)', borderColor: 'rgb(56, 161, 105)', borderWidth: 1 },
      ],
    };
  }, [liquidacionesMensualesFiltradas, cuotasOrdenadas]);

  const graficoBarrasOptions: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    plugins: { legend: { position: 'top' as const } },
    scales: {
      x: { stacked: false },
      y: { beginAtZero: true, ticks: { callback: (v) => (typeof v === 'number' ? `$${v.toLocaleString('es-AR')}` : v) } },
    },
  }), []);

  const handleGenerar = async (mes: string, reemplazarSiNoPagada?: boolean) => {
    try {
      setError('');
      const resultado = await generarLiquidacionMensual(mes, undefined, reemplazarSiNoPagada);

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

  const handleGenerarPorSocios = async (pares: Array<{ socioId: number; mes: string }>) => {
    if (pares.length === 0) return;
    try {
      setError('');
      const porMes = new Map<string, number[]>();
      for (const { socioId, mes } of pares) {
        if (!porMes.has(mes)) porMes.set(mes, []);
        porMes.get(mes)!.push(socioId);
      }
      let totalCuotasCreadas = 0;
      for (const [mes, socioIds] of porMes) {
        const unicos = [...new Set(socioIds)];
        const resultado = await generarLiquidacionesPorSocios(unicos, [mes]);
        totalCuotasCreadas += resultado.totalCuotasCreadas;
      }
      setMostrarFormularioSocios(false);
      alert(
        `Liquidaciones generadas exitosamente.\n${totalCuotasCreadas} cuota(s) creada(s) en ${porMes.size} mes(es).`,
      );
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

  const handleExportarPdf = async (mes?: string) => {
    const liquidacionesParaExportar = mes ? obtenerCuotasPorMes(mes) : cuotasOrdenadas;
    if (liquidacionesParaExportar.length === 0) {
      alert(mes ? 'No hay liquidaciones para exportar en el mes seleccionado' : 'No hay liquidaciones para exportar');
      return;
    }
    try {
      const { exportarLiquidacionesPdf } = await import('../utils/exportLiquidacionesPdf');
      await exportarLiquidacionesPdf(liquidacionesParaExportar, mes ?? '', nombreClub);
    } catch (error) {
      console.error(error);
      alert('No se pudo exportar el PDF.');
    }
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
      <Suspense fallback={<div className="lista-liquidaciones"><p>Cargando mensajes...</p></div>}>
        <EnviarWhatsApp
          liquidacionMensualId={liquidacionMensualWhatsApp}
          onVolver={handleCerrarWhatsApp}
        />
      </Suspense>
    );
  }

  if (mostrarFormularioSocios) {
    return (
      <div className="lista-liquidaciones">
        <Suspense fallback={<p>Cargando formulario...</p>}>
          <FormularioLiquidacionSocios
            liquidacionesCuotas={liquidacionesCuotas}
            liquidacionesMensuales={liquidacionesMensuales}
            onGenerar={handleGenerarPorSocios}
            onCancel={() => {
              setMostrarFormularioSocios(false);
              setError('');
            }}
          />
        </Suspense>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (mostrarFormulario) {
    return (
      <div className="lista-liquidaciones">
        <Suspense fallback={<p>Cargando formulario...</p>}>
          <FormularioLiquidacion
            onGenerar={handleGenerar}
            onCancel={() => {
              setMostrarFormulario(false);
              setError('');
            }}
          />
        </Suspense>
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
                <button onClick={() => handleExportarPdf(mesDetalle)} className="btn-imprimir">
                  📄 Exportar PDF
                </button>
            {(() => {
              const liquidacionMensual = liquidacionesMensuales.find(lm => lm.mes === mesDetalle);
              return liquidacionMensual ? (
                <button
                  onClick={() => handleEnviarWhatsApp(liquidacionMensual.id)}
                  className="btn-whatsapp"
                  title="Mensajes a socios (WhatsApp)"
                >
                  📱 Mensajes a socios
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
          <Suspense fallback={<p>Cargando detalle...</p>}>
            <TablaLiquidaciones
              liquidaciones={detalle}
              onMarcarPagado={handleMarcarPagado}
              onMarcarNoPagado={handleMarcarNoPagado}
              onBorrar={handleBorrar}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="lista-liquidaciones lista-liquidaciones-principal">
      <div className="lista-header">
        <h1>Gestión de Liquidaciones Mensuales</h1>
      </div>

      {mostrarGrafico && (graficoData || graficoBarrasData) && (
        <div className="graficos-liquidaciones-wrapper">
          <div
            className="grafico-liquidaciones grafico-clickeable"
            role="button"
            tabIndex={0}
            onClick={() => graficoData && setModalGrafico('pie')}
            onKeyDown={(e) => graficoData && (e.key === 'Enter' || e.key === ' ') && setModalGrafico('pie')}
            title="Clic para ampliar"
          >
            {graficoData && (
              <>
                <ErrorBoundary compact message="El gráfico no pudo mostrarse.">
                  <Pie data={graficoData} options={graficoOptions} />
                </ErrorBoundary>
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
              </>
            )}
          </div>
          {graficoBarrasData && (
            <div
              className="grafico-barras-liquidaciones grafico-clickeable"
              role="button"
              tabIndex={0}
              onClick={() => setModalGrafico('barras')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setModalGrafico('barras')}
              title="Clic para ampliar"
            >
              <h3 className="grafico-barras-titulo">Cobrado vs Liquidado por liquidación</h3>
              <ErrorBoundary compact message="El gráfico no pudo mostrarse.">
                <Bar data={graficoBarrasData} options={graficoBarrasOptions} />
              </ErrorBoundary>
            </div>
          )}
        </div>
      )}

      {modalGrafico && (
        <div
          className="modal-grafico-overlay"
          onClick={() => setModalGrafico(null)}
          onKeyDown={(e) => e.key === 'Escape' && setModalGrafico(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Gráfico ampliado"
        >
          <div className="modal-grafico-contenido" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-grafico-cerrar" onClick={() => setModalGrafico(null)} aria-label="Cerrar">
              ✕
            </button>
            {modalGrafico === 'pie' && graficoData && (
              <div className="modal-grafico-cuerpo">
                <ErrorBoundary compact message="El gráfico no pudo mostrarse.">
                  <Pie data={graficoData} options={{ ...graficoOptions, maintainAspectRatio: true, aspectRatio: 1 }} />
                </ErrorBoundary>
                <div className="resumen-grafico">
                  <div><span>Total liquidado:</span> ${totalLiquidado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div><span>Total cobrado:</span> ${totalCobrado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div><span>Total adeudado:</span> ${totalAdeudado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}
            {modalGrafico === 'barras' && graficoBarrasData && (
              <div className="modal-grafico-cuerpo modal-grafico-barras">
                <h3 className="grafico-barras-titulo">Cobrado vs Liquidado por liquidación</h3>
                <ErrorBoundary compact message="El gráfico no pudo mostrarse.">
                  <Bar data={graficoBarrasData} options={graficoBarrasOptions} />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="tabla-mensuales-wrapper">
        <TablaLiquidacionesMensuales
          liquidacionesMensuales={liquidacionesMensualesFiltradas}
          liquidacionesCuotas={cuotasOrdenadas}
          filtros={
            <div className="filtros-liquidaciones-bar">
              {isFilterVisible('categoria') && (
                <div className="filtro filtro-categorias-checkbox" ref={refFiltroCategorias}>
                  <label>Categoría(s)</label>
                  <button
                    type="button"
                    className={`selector-categorias-trigger ${filtroCategoriasAbierto ? 'abierto' : ''}`}
                    onClick={() => setFiltroCategoriasAbierto((a) => !a)}
                    aria-expanded={filtroCategoriasAbierto}
                    aria-haspopup="listbox"
                  >
                    {filtroCategoriaIds.length === 0
                      ? 'Todas'
                      : filtroCategoriaIds.length === 1
                        ? categorias.find((c) => c.id === filtroCategoriaIds[0])?.nombre ?? '1 categoría'
                        : `${filtroCategoriaIds.length} categorías`}
                    <span className="selector-categorias-chevron" aria-hidden>▼</span>
                  </button>
                  {filtroCategoriasAbierto && (
                    <div className="selector-categorias-panel" role="listbox">
                      <div className="selector-categorias-acciones">
                        <button type="button" className="selector-categorias-btn-todo" onClick={() => setFiltroCategoriaIds(categorias.map(c => c.id))}>
                          Seleccionar todo
                        </button>
                        <button type="button" className="selector-categorias-btn-todo" onClick={() => setFiltroCategoriaIds([])}>
                          Deseleccionar todo
                        </button>
                      </div>
                      {categorias.map((cat) => (
                        <label key={cat.id} className="selector-categorias-opcion">
                          <input
                            type="checkbox"
                            checked={filtroCategoriaIds.includes(cat.id)}
                            onChange={() => {
                              const nuevo = filtroCategoriaIds.includes(cat.id)
                                ? filtroCategoriaIds.filter((x) => x !== cat.id)
                                : [...filtroCategoriaIds, cat.id];
                              setFiltroCategoriaIds(nuevo);
                            }}
                          />
                          <span>{cat.nombre}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {isFilterVisible('socio') && (
                <div className="filtro">
                  <label htmlFor="liquidaciones-socio-texto">Socio (nombre o número)</label>
                  <input
                    id="liquidaciones-socio-texto"
                    type="text"
                    placeholder="Nombre o número"
                    value={filtroSocioTexto}
                    onChange={(e) => setFiltroSocioTexto(e.target.value)}
                  />
                </div>
              )}
              {isFilterVisible('año') && (
                <div className="filtro">
                  <label htmlFor="liquidaciones-año">Año</label>
                  <select
                    id="liquidaciones-año"
                    value={filtroAño}
                    onChange={(e) => setFiltroAño(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {añosDisponibles.map((año) => (
                      <option key={año} value={año}>{año}</option>
                    ))}
                  </select>
                </div>
              )}
              {isFilterVisible('fecha') && (
                <>
                  <div className="filtro">
                    <label htmlFor="liquidaciones-desde">Mes desde</label>
                    <input
                      id="liquidaciones-desde"
                      type="month"
                      value={filtroDesde}
                      onChange={(e) => setFiltroDesde(e.target.value)}
                    />
                  </div>
                  <div className="filtro">
                    <label htmlFor="liquidaciones-hasta">Mes hasta</label>
                    <input
                      id="liquidaciones-hasta"
                      type="month"
                      value={filtroHasta}
                      onChange={(e) => setFiltroHasta(e.target.value)}
                    />
                  </div>
                </>
              )}
              <button
                type="button"
                className="btn-limpiar-filtros"
                onClick={() => {
                  setFiltroCategoriaIds([]);
                  setFiltroSocioTexto('');
                  setFiltroAño('');
                  setFiltroDesde('');
                  setFiltroHasta('');
                }}
              >
                Limpiar filtros
              </button>
            </div>
          }
          selectorFiltrosVisibles={
            <SelectorColumnas
              columnas={LIQUIDACIONES_FILTROS}
              visibleIds={visibleFilters}
              onToggle={toggleFilter}
              onRestaurar={() => setVisibleFilters(LIQUIDACIONES_FILTROS_DEFAULT)}
              titulo="Filtros visibles"
              labelBoton="Filtros"
            />
          }
          onVerDetalle={handleVerDetalle}
          onImprimir={handleExportarPdf}
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
                <button onClick={() => handleExportarPdf()} className="btn-imprimir">
                  📄 Exportar PDF
                </button>
              )}
              {cuotasOrdenadas.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      const { exportLiquidacionesDobleEntrada } = await import('../utils/exportLiquidacionesExcel');
                      await exportLiquidacionesDobleEntrada(cuotasOrdenadas);
                    } catch (error) {
                      console.error(error);
                      alert('No se pudo exportar el Excel.');
                    }
                  }}
                  className="btn-imprimir"
                  title="Excel doble entrada: socios x cuotas, verde=pagado, rojo=pendiente"
                >
                  📊 Excel Doble Entrada
                </button>
              )}
              <button
                className="btn-grafico"
                onClick={() => setMostrarGrafico((prev) => !prev)}
                disabled={!graficoData && !graficoBarrasData}
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

