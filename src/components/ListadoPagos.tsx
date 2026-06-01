import { useMemo, useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { dibujarEncabezadoConLogo } from '../utils/pdfLogo';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useCategorias } from '../hooks/useCategorias';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { useFilterPreferences } from '../hooks/useFilterPreferences';
import { SelectorColumnas } from './SelectorColumnas';
import { ErrorBoundary } from './ErrorBoundary';
import { apiService } from '../services/api';
import type { MedioPagoDB } from '../types';
import { extractYMD, formatDateOnlyES } from '../utils/clubDateTime';
import './ListadoPagos.css';

const PAGOS_COLUMNS = [
  { id: 'numeroRecibo', label: 'Nº Recibo' },
  { id: 'fechaPago', label: 'Fecha Pago' },
  { id: 'socio', label: 'Socio' },
  { id: 'mes', label: 'Mes' },
  { id: 'monto', label: 'Monto' },
  { id: 'medioPago', label: 'Medio de Pago' },
  { id: 'fechaLiquidacion', label: 'Fecha Liquidación' },
  { id: 'acciones', label: 'Acciones' },
];
const PAGOS_DEFAULT_VISIBLE = PAGOS_COLUMNS.map((c) => c.id);

const PAGOS_FILTROS = [
  { id: 'fechaDesde', label: 'Fecha cobro desde' },
  { id: 'fechaHasta', label: 'Fecha cobro hasta' },
  { id: 'socio', label: 'Socio' },
  { id: 'mes', label: 'Mes liquidado' },
  { id: 'medioPago', label: 'Medio de pago' },
  { id: 'categoriaId', label: 'Categoría de socio' },
];
const PAGOS_FILTROS_DEFAULT = PAGOS_FILTROS.map((f) => f.id);

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type FiltrosPagos = {
  fechaDesde: string;
  fechaHasta: string;
  socio: string;
  mes: string;
  medioPago: string;
  categoriaId: string;
};

type CuotaExtendida = {
  id: number;
  numeroSocio: number;
  apellido: string;
  nombre: string;
  mes: string;
  fechaLiquidacion: string;
  fechaPago: string | null;
  monto: number;
  medioPago: string | null;
  categoriaId: number;
  pagado: boolean;
  numeroRecibo?: number | null;
};

const formatearMes = (mesString: string) => {
  if (!mesString) return '-';
  const [año, mes] = mesString.split('-');
  const fecha = new Date(parseInt(año, 10), parseInt(mes, 10) - 1, 1);
  return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
};

export const ListadoPagos = () => {
  const { nombreClub } = useClubConfig();
  const { liquidacionesCuotas, liquidacionesMensuales } = useLiquidaciones();
  const { categorias } = useCategorias();
  const [mediosPagoIngreso, setMediosPagoIngreso] = useState<MedioPagoDB[]>([]);

  const { visibleColumns, setVisibleColumns, toggleColumn, loading: loadingCols } = useColumnPreferences(
    'pagos',
    PAGOS_DEFAULT_VISIBLE,
  );
  const visible = loadingCols ? PAGOS_DEFAULT_VISIBLE : visibleColumns;
  const isVisible = (id: string) => visible.includes(id);

  const [filtros, setFiltros] = useState<FiltrosPagos>({
    fechaDesde: '',
    fechaHasta: '',
    socio: '',
    mes: '',
    medioPago: '',
    categoriaId: '',
  });
  const [mostrarGrafico, setMostrarGrafico] = useState(false);
  const [modalGrafico, setModalGrafico] = useState<'pie' | 'barras' | null>(null);

  const { visibleFilters, setVisibleFilters, toggleFilter, isFilterVisible } = useFilterPreferences(
    'pagos-filtros',
    PAGOS_FILTROS_DEFAULT,
  );

  useEffect(() => {
    const loadMediosPago = async () => {
      try {
        const medios = await apiService.getMediosPago();
        // Filtrar solo medios de pago para ingreso (ingreso o ambos)
        const mediosIngreso = medios.filter(
          (m) => m.activo && (m.tipoMovimiento === 'ingreso' || m.tipoMovimiento === 'ambos')
        );
        setMediosPagoIngreso(mediosIngreso);
      } catch (err) {
        console.error('Error al cargar medios de pago:', err);
      }
    };
    loadMediosPago();
  }, []);

  useEffect(() => {
    if (!modalGrafico) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalGrafico(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalGrafico]);

  const cuotas = useMemo<CuotaExtendida[]>(() => {
    return liquidacionesCuotas
      .map((cuota) => {
        const liquidacionMensual = liquidacionesMensuales.find(
          (lm) => lm.id === cuota.liquidacionMensualId,
        );
        return {
          ...cuota,
          mes: liquidacionMensual?.mes || '',
          fechaLiquidacion: liquidacionMensual?.fechaLiquidacion || '',
        };
      })
      .sort((a, b) => (b.fechaPago || '').localeCompare(a.fechaPago || ''));
  }, [liquidacionesCuotas, liquidacionesMensuales]);

  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>();
    cuotas.forEach((cuota) => {
      if (cuota.mes) {
        meses.add(cuota.mes);
      }
    });
    return Array.from(meses).sort().reverse();
  }, [cuotas]);

  const mediosDisponibles = useMemo(() => {
    // Usar solo los medios de pago configurados para ingreso
    return mediosPagoIngreso.map((m) => m.nombre).sort();
  }, [mediosPagoIngreso]);

  const cuotasFiltradas = useMemo(() => {
    return cuotas.filter((cuota) => {
      if (filtros.fechaDesde) {
        if (!cuota.fechaPago) return false;
        const ymdPago = extractYMD(cuota.fechaPago);
        const ymdDesde = extractYMD(filtros.fechaDesde);
        if (!ymdPago || !ymdDesde) {
          return false;
        }
        if (ymdPago < ymdDesde) return false;
      }
      if (filtros.fechaHasta) {
        if (!cuota.fechaPago) return false;
        const ymdPago = extractYMD(cuota.fechaPago);
        const ymdHasta = extractYMD(filtros.fechaHasta);
        if (!ymdPago || !ymdHasta) {
          return false;
        }
        if (ymdPago > ymdHasta) return false;
      }
      if (filtros.socio) {
        const texto = `${cuota.numeroSocio} ${cuota.apellido} ${cuota.nombre}`.toLowerCase();
        if (!texto.includes(filtros.socio.toLowerCase())) {
          return false;
        }
      }
      if (filtros.mes && cuota.mes !== filtros.mes) {
        return false;
      }
      if (filtros.medioPago) {
        if (!cuota.pagado || !cuota.medioPago) {
          return false;
        }
        if (!cuota.medioPago.toLowerCase().includes(filtros.medioPago.toLowerCase())) {
          return false;
        }
      }
      if (filtros.categoriaId && `${cuota.categoriaId}` !== filtros.categoriaId) {
        return false;
      }
      return true;
    });
  }, [cuotas, filtros]);

  const pagosFiltrados = useMemo(
    () => cuotasFiltradas.filter((cuota) => cuota.pagado),
    [cuotasFiltradas],
  );

  /** Todos los cobros (para reimprimir recibo con todas las cuotas del mismo número) */
  const todosPagos = useMemo(() => cuotas.filter((c) => c.pagado), [cuotas]);

  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);

  const handleOrdenar = (columna: string) => {
    if (ordenColumna && ordenColumna.columna === columna) {
      setOrdenColumna({ columna, direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const pagosOrdenados = useMemo(() => {
    if (!ordenColumna) return pagosFiltrados;
    const { columna, direccion } = ordenColumna;
    return [...pagosFiltrados].sort((a, b) => {
      let comparacion = 0;
      switch (columna) {
        case 'numeroRecibo':
          comparacion = (a.numeroRecibo ?? 0) - (b.numeroRecibo ?? 0);
          break;
        case 'fechaPago':
          comparacion = (a.fechaPago || '').localeCompare(b.fechaPago || '');
          break;
        case 'socio':
          comparacion = `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`);
          break;
        case 'mes':
          comparacion = a.mes.localeCompare(b.mes);
          break;
        case 'monto':
          comparacion = a.monto - b.monto;
          break;
        case 'medioPago':
          comparacion = (a.medioPago || '').localeCompare(b.medioPago || '');
          break;
        case 'fechaLiquidacion':
          comparacion = (a.fechaLiquidacion || '').localeCompare(b.fechaLiquidacion || '');
          break;
        default:
          return 0;
      }
      return direccion === 'asc' ? comparacion : -comparacion;
    });
  }, [pagosFiltrados, ordenColumna]);

  const totalLiquidado = useMemo(
    () => cuotasFiltradas.reduce((sum, cuota) => sum + cuota.monto, 0),
    [cuotasFiltradas],
  );
  const totalCobrado = useMemo(
    () => pagosFiltrados.reduce((sum, cuota) => sum + cuota.monto, 0),
    [pagosFiltrados],
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

  const graficoBarrasData = useMemo(() => {
    const porMes = new Map<string, number>();
    pagosFiltrados.forEach((p) => {
      if (!p.mes) return;
      const actual = porMes.get(p.mes) ?? 0;
      porMes.set(p.mes, actual + p.monto);
    });
    const meses = [...porMes.keys()].sort();
    if (meses.length === 0) return null;
    const labels = meses.map((mes) => {
      const [año, m] = mes.split('-');
      const d = new Date(parseInt(año, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleString('es-AR', { month: 'short', year: '2-digit' });
    });
    const data = meses.map((mes) => porMes.get(mes) ?? 0);
    return {
      labels,
      datasets: [
        {
          label: 'Cobrado',
          data,
          backgroundColor: 'rgba(72, 187, 120, 0.8)',
          borderColor: 'rgb(56, 161, 105)',
          borderWidth: 1,
        },
      ],
    };
  }, [pagosFiltrados]);

  const graficoBarrasOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      plugins: { legend: { position: 'top' as const } },
      scales: {
        x: { stacked: false },
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => (typeof v === 'number' ? `$${v.toLocaleString('es-AR')}` : v) },
        },
      },
    }),
    [],
  );

  const reimprimirRecibo = async (pago: CuotaExtendida) => {
    if (pago.numeroRecibo == null) {
      alert('Este cobro no tiene número de recibo.');
      return;
    }
    const cuotasDelRecibo = todosPagos.filter((p) => p.numeroRecibo === pago.numeroRecibo);
    if (cuotasDelRecibo.length === 0) return;
    const primero = cuotasDelRecibo[0];
    const socio = {
      numeroSocio: primero.numeroSocio,
      apellido: primero.apellido,
      nombre: primero.nombre,
    };
    const total = cuotasDelRecibo.reduce((s, c) => s + c.monto, 0);
    const porMedio = new Map<string, number>();
    cuotasDelRecibo.forEach((c) => {
      const medio = c.medioPago || 'Efectivo';
      porMedio.set(medio, (porMedio.get(medio) ?? 0) + c.monto);
    });
    const medios = [...porMedio.entries()]
      .map(([medio, monto]) => `${medio}: $${monto.toFixed(2)}`)
      .join(' | ');
    const cuotas = cuotasDelRecibo.map((c) => ({
      mes: c.mes,
      fechaLiquidacion: c.fechaLiquidacion,
      monto: c.monto,
    }));
    const { generarRecibo } = await import('../utils/reciboPdf');
    const result = generarRecibo({
      socio,
      medios,
      cuotas,
      total,
      nombreClub,
      numeroRecibo: pago.numeroRecibo,
      fechaEmision: primero.fechaPago ?? pago.fechaPago ?? null,
    });
    window.open(result.url, '_blank');
  };

  return (
    <div className="listado-pagos">
      <div className="card">
        <div className="header">
          <h1>Listado de Cobros Registrados</h1>
          <div className="resumen">
            <span>
              Pagos filtrados: <strong>{pagosFiltrados.length}</strong>
            </span>
            <span>
              Total liquidado:{' '}
              <strong>
                $
                {totalLiquidado.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </span>
            <span>
              Total cobrado:{' '}
              <strong>
                $
                {totalCobrado.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </span>
            <span>
              Total adeudado:{' '}
              <strong>
                $
                {totalAdeudado.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </span>
          </div>
        </div>

        {mostrarGrafico && (graficoData || graficoBarrasData) && (
          <div className="graficos-pagos-wrapper">
            <div
              className="grafico-pagos grafico-clickeable"
              role="button"
              tabIndex={0}
              onClick={() => graficoData && setModalGrafico('pie')}
              onKeyDown={(e) => graficoData && (e.key === 'Enter' || e.key === ' ') && setModalGrafico('pie')}
              title="Clic para ampliar"
            >
              {graficoData && (
                <ErrorBoundary compact message="El gráfico no pudo mostrarse.">
                  <Pie data={graficoData} options={graficoOptions} />
                </ErrorBoundary>
              )}
            </div>
            {graficoBarrasData && (
              <div
                className="grafico-barras-pagos grafico-clickeable"
                role="button"
                tabIndex={0}
                onClick={() => setModalGrafico('barras')}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setModalGrafico('barras')}
                title="Clic para ampliar"
              >
                <h3 className="grafico-barras-titulo">Cobrado por mes</h3>
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
                    <Pie data={graficoData} options={graficoOptions} />
                  </ErrorBoundary>
                </div>
              )}
              {modalGrafico === 'barras' && graficoBarrasData && (
                <div className="modal-grafico-cuerpo modal-grafico-barras">
                  <h3 className="grafico-barras-titulo">Cobrado por mes</h3>
                  <ErrorBoundary compact message="El gráfico no pudo mostrarse.">
                    <Bar data={graficoBarrasData} options={graficoBarrasOptions} />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="tabla-pagos-container">
          <div className="tabla-acciones-superior">
            <div className="tabla-fila-filtros">
              {isFilterVisible('fechaDesde') && (
                <div className="filtro">
                  <label htmlFor="fecha-desde">Fecha cobro desde</label>
                  <input
                    id="fecha-desde"
                    type="date"
                    value={filtros.fechaDesde}
                    onChange={(e) => setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))}
                  />
                </div>
              )}
              {isFilterVisible('fechaHasta') && (
                <div className="filtro">
                  <label htmlFor="fecha-hasta">Fecha cobro hasta</label>
                  <input
                    id="fecha-hasta"
                    type="date"
                    value={filtros.fechaHasta}
                    onChange={(e) => setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))}
                  />
                </div>
              )}
              {isFilterVisible('socio') && (
                <div className="filtro">
                  <label htmlFor="socio">Socio</label>
                  <input
                    id="socio"
                    type="text"
                    placeholder="Número o nombre"
                    value={filtros.socio}
                    onChange={(e) => setFiltros((prev) => ({ ...prev, socio: e.target.value }))}
                  />
                </div>
              )}
              {isFilterVisible('mes') && (
                <div className="filtro">
                  <label htmlFor="mes">Mes liquidado</label>
                  <select
                    id="mes"
                    value={filtros.mes}
                    onChange={(e) => setFiltros((prev) => ({ ...prev, mes: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    {mesesDisponibles.map((mes) => (
                      <option key={mes} value={mes}>
                        {formatearMes(mes)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {isFilterVisible('medioPago') && (
                <div className="filtro">
                  <label htmlFor="medio">Medio de pago</label>
                  <select
                    id="medio"
                    value={filtros.medioPago}
                    onChange={(e) => setFiltros((prev) => ({ ...prev, medioPago: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    {mediosDisponibles.map((medio) => (
                      <option key={medio} value={medio}>
                        {medio}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {isFilterVisible('categoriaId') && (
                <div className="filtro">
                  <label htmlFor="categoria">Categoría de socio</label>
                  <select
                    id="categoria"
                    value={filtros.categoriaId}
                    onChange={(e) => setFiltros((prev) => ({ ...prev, categoriaId: e.target.value }))}
                  >
                    <option value="">Todas</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                className="btn-limpiar"
                onClick={() =>
                  setFiltros({
                    fechaDesde: '',
                    fechaHasta: '',
                    socio: '',
                    mes: '',
                    medioPago: '',
                    categoriaId: '',
                  })
                }
              >
                Limpiar filtros
              </button>
            </div>
            <div className="tabla-fila-acciones">
              <SelectorColumnas
                columnas={PAGOS_COLUMNS}
                visibleIds={visible}
                onToggle={toggleColumn}
                onRestaurar={() => setVisibleColumns(PAGOS_DEFAULT_VISIBLE)}
                titulo="Columnas visibles"
              />
              <SelectorColumnas
                columnas={PAGOS_FILTROS}
                visibleIds={visibleFilters}
                onToggle={toggleFilter}
                onRestaurar={() => setVisibleFilters(PAGOS_FILTROS_DEFAULT)}
                titulo="Filtros visibles"
                labelBoton="Filtros"
              />
              <button
                className="btn-exportar"
                onClick={() => exportarPagosPdf(pagosFiltrados, nombreClub, visible).catch(console.error)}
              >
                📄 Exportar PDF
              </button>
              <button
                className="btn-exportar btn-exportar-excel"
                onClick={() => exportarPagosExcel(pagosFiltrados, visible).catch(console.error)}
              >
                📊 Exportar Excel
              </button>
              <button
                className="btn-grafico"
                onClick={() => setMostrarGrafico((prev) => !prev)}
                disabled={!graficoData && !graficoBarrasData}
              >
                📊 {mostrarGrafico ? 'Ocultar gráfico' : 'Ver gráfico'}
              </button>
            </div>
          </div>
          <div className="tabla-wrapper">
            <table className="tabla-pagos">
            <thead>
              <tr>
                {isVisible('numeroRecibo') && (
                  <th
                    className="sortable"
                    onClick={() => handleOrdenar('numeroRecibo')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    Nº Recibo
                    {ordenColumna?.columna === 'numeroRecibo' && (
                      <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                )}
                {isVisible('fechaPago') && (
                  <th
                    className="sortable"
                    onClick={() => handleOrdenar('fechaPago')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    Fecha Pago
                    {ordenColumna?.columna === 'fechaPago' && (
                      <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                )}
                {isVisible('socio') && (
                  <th
                    className="sortable"
                    onClick={() => handleOrdenar('socio')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    Socio
                    {ordenColumna?.columna === 'socio' && (
                      <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                )}
                {isVisible('mes') && (
                  <th
                    className="sortable"
                    onClick={() => handleOrdenar('mes')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    Mes
                    {ordenColumna?.columna === 'mes' && (
                      <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                )}
                {isVisible('monto') && (
                  <th
                    className="sortable"
                    onClick={() => handleOrdenar('monto')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    Monto
                    {ordenColumna?.columna === 'monto' && (
                      <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                )}
                {isVisible('medioPago') && (
                  <th
                    className="sortable"
                    onClick={() => handleOrdenar('medioPago')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    Medio de Pago
                    {ordenColumna?.columna === 'medioPago' && (
                      <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                )}
                {isVisible('fechaLiquidacion') && (
                  <th
                    className="sortable"
                    onClick={() => handleOrdenar('fechaLiquidacion')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    Fecha Liquidación
                    {ordenColumna?.columna === 'fechaLiquidacion' && (
                      <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                )}
                {isVisible('acciones') && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {pagosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={visible.length || 6} className="sin-datos">
                    No hay cobros registrados todavía.
                  </td>
                </tr>
              ) : (
                pagosOrdenados.map((pago) => (
                  <tr key={pago.id}>
                    {isVisible('numeroRecibo') && (
                      <td>{pago.numeroRecibo != null ? String(pago.numeroRecibo).padStart(6, '0') : '-'}</td>
                    )}
                    {isVisible('fechaPago') && <td>{formatDateOnlyES(pago.fechaPago)}</td>}
                    {isVisible('socio') && (
                      <td>
                        {pago.numeroSocio} - {pago.apellido}, {pago.nombre}
                      </td>
                    )}
                    {isVisible('mes') && <td>{formatearMes(pago.mes)}</td>}
                    {isVisible('monto') && <td>${pago.monto.toFixed(2)}</td>}
                    {isVisible('medioPago') && <td>{pago.medioPago ?? '-'}</td>}
                    {isVisible('fechaLiquidacion') && <td>{formatDateOnlyES(pago.fechaLiquidacion)}</td>}
                    {isVisible('acciones') && (
                      <td>
                        <button
                          type="button"
                          className="btn-reimprimir-recibo"
                          onClick={() => reimprimirRecibo(pago)}
                          disabled={pago.numeroRecibo == null}
                          title={pago.numeroRecibo != null ? 'Reimprimir recibo' : 'Sin número de recibo'}
                        >
                          🖨️ Reimprimir recibo
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const PAGOS_PDF_COLUMNS: { id: string; header: string; getValue: (p: CuotaExtendida) => string | number }[] = [
  { id: 'numeroRecibo', header: 'Nº Recibo', getValue: (p) => (p.numeroRecibo != null ? String(p.numeroRecibo).padStart(6, '0') : '-') },
  { id: 'fechaPago', header: 'Fecha Pago', getValue: (p) => formatDateOnlyES(p.fechaPago) },
  { id: 'socio', header: 'Socio', getValue: (p) => `${p.numeroSocio} - ${p.apellido}, ${p.nombre}` },
  { id: 'mes', header: 'Mes', getValue: (p) => formatearMes(p.mes) },
  { id: 'monto', header: 'Monto', getValue: (p) => `$${p.monto.toFixed(2)}` },
  { id: 'medioPago', header: 'Medio de Pago', getValue: (p) => p.medioPago ?? '-' },
  { id: 'fechaLiquidacion', header: 'Fecha Liquidación', getValue: (p) => formatDateOnlyES(p.fechaLiquidacion) },
];

const exportarPagosPdf = async (pagos: CuotaExtendida[], nombreClub: string, visibleColumnIds: string[] = []) => {
  if (pagos.length === 0) {
    alert('No hay cobros para exportar.');
    return;
  }

  // Registrar exportación en auditoría
  try {
    await apiService.registrarExportacion('pagos', 'PDF', { total: pagos.length });
  } catch (err) {
    // No bloquear la exportación si falla el registro
    console.warn('No se pudo registrar la exportación en auditoría:', err);
  }

  const ids = visibleColumnIds.length > 0 ? visibleColumnIds : PAGOS_COLUMNS.map((c) => c.id);
  const columns = PAGOS_PDF_COLUMNS.filter((c) => ids.includes(c.id));
  if (columns.length === 0) return;

  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape' });
  const fecha = new Date().toLocaleString('es-AR');

  // Encabezado con logo
  dibujarEncabezadoConLogo(doc, 'landscape', nombreClub);

  // Información del documento
  doc.setTextColor(45, 55, 72);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Fecha de generación: ${fecha}`, 14, 38);
  doc.text(`Cobros incluidos: ${pagos.length}`, 14, 45);
  const total = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  doc.text(`Total cobrado: $${total.toFixed(2)}`, 14, 52);

  autoTable(doc, {
    startY: 60,
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: 255,
      fontSize: 10,
    },
    bodyStyles: {
      textColor: 45,
      fontSize: 9,
    },
    head: [columns.map((c) => c.header)],
    body: pagos.map((pago) => columns.map((c) => c.getValue(pago))),
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        dibujarEncabezadoConLogo(doc, 'landscape', nombreClub);
      }
      const pageCount = doc.getNumberOfPages();
      const pageSize = doc.internal.pageSize;
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageSize.width - 20,
        pageSize.height - 10,
        { align: 'right' },
      );
    },
  });

  doc.save(`Listado-Cobros-${Date.now()}.pdf`);
};

const exportarPagosExcel = async (pagos: CuotaExtendida[], visibleColumnIds: string[]) => {
  if (pagos.length === 0) {
    alert('No hay cobros para exportar.');
    return;
  }
  try {
    await apiService.registrarExportacion('pagos', 'Excel', { total: pagos.length });
  } catch (err) {
    console.warn('No se pudo registrar la exportación en auditoría:', err);
  }
  const columnMap: Record<string, (p: CuotaExtendida) => string | number> = {
    numeroRecibo: (p) => (p.numeroRecibo != null ? String(p.numeroRecibo).padStart(6, '0') : '-'),
    fechaPago: (p) => formatDateOnlyES(p.fechaPago),
    socio: (p) => `${p.numeroSocio} - ${p.apellido}, ${p.nombre}`,
    mes: (p) => formatearMes(p.mes),
    monto: (p) => p.monto,
    medioPago: (p) => p.medioPago ?? '-',
    fechaLiquidacion: (p) => formatDateOnlyES(p.fechaLiquidacion),
  };
  const headers: Record<string, string> = {
    numeroRecibo: 'Nº Recibo',
    fechaPago: 'Fecha Pago',
    socio: 'Socio',
    mes: 'Mes',
    monto: 'Monto',
    medioPago: 'Medio de Pago',
    fechaLiquidacion: 'Fecha Liquidación',
  };
  const ids = visibleColumnIds.length > 0 ? visibleColumnIds : Object.keys(columnMap);
  const data = pagos.map((pago) => {
    const row: Record<string, string | number> = {};
    ids.forEach((id) => {
      if (columnMap[id] && headers[id]) row[headers[id]] = columnMap[id](pago);
    });
    return row;
  });
  if (Object.keys(data[0] || {}).length === 0) return;
  const { exportToExcel } = await import('../utils/exportExcel');
  exportToExcel(data, `Listado-Cobros-${Date.now()}`, 'Cobros');
};


