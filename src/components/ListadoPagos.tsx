import { useMemo, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { dibujarEncabezadoConLogo } from '../utils/pdfLogo';
import { exportToExcel } from '../utils/exportExcel';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useCategorias } from '../hooks/useCategorias';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { SelectorColumnas } from './SelectorColumnas';
import { apiService } from '../services/api';
import type { MedioPagoDB } from '../types';
import './ListadoPagos.css';

const PAGOS_COLUMNS = [
  { id: 'fechaPago', label: 'Fecha Pago' },
  { id: 'socio', label: 'Socio' },
  { id: 'mes', label: 'Mes' },
  { id: 'monto', label: 'Monto' },
  { id: 'medioPago', label: 'Medio de Pago' },
  { id: 'fechaLiquidacion', label: 'Fecha Liquidación' },
];
const PAGOS_DEFAULT_VISIBLE = PAGOS_COLUMNS.map((c) => c.id);

ChartJS.register(ArcElement, Tooltip, Legend);

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
        if (new Date(cuota.fechaPago) < new Date(filtros.fechaDesde)) {
          return false;
        }
      }
      if (filtros.fechaHasta) {
        if (!cuota.fechaPago) return false;
        if (new Date(cuota.fechaPago) > new Date(filtros.fechaHasta)) {
          return false;
        }
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

        {mostrarGrafico && graficoData && (
          <div className="grafico-pagos">
            <Pie data={graficoData} options={graficoOptions} />
          </div>
        )}

        <div className="filtros-pagos">
          <div className="filtro">
            <label htmlFor="fecha-desde">Fecha cobro desde</label>
            <input
              id="fecha-desde"
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) => setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))}
            />
          </div>
          <div className="filtro">
            <label htmlFor="fecha-hasta">Fecha cobro hasta</label>
            <input
              id="fecha-hasta"
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) => setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))}
            />
          </div>
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
          <div className="acciones-filtros">
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
            <button className="btn-exportar" onClick={() => exportarPagosPdf(pagosFiltrados, nombreClub).catch(console.error)}>
              📄 Exportar PDF
            </button>
            <button className="btn-exportar btn-exportar-excel" onClick={() => exportarPagosExcel(pagosFiltrados, visible).catch(console.error)}>
              📊 Exportar Excel
            </button>
            <button
              className="btn-grafico"
              onClick={() => setMostrarGrafico((prev) => !prev)}
              disabled={!graficoData}
            >
              📊 {mostrarGrafico ? 'Ocultar gráfico' : 'Ver gráfico'}
            </button>
          </div>
        </div>

        <div className="tabla-pagos-container">
          <div className="tabla-wrapper">
            <div className="tabla-acciones-superior">
              <SelectorColumnas
                columnas={PAGOS_COLUMNS}
                visibleIds={visible}
                onToggle={toggleColumn}
                onRestaurar={() => setVisibleColumns(PAGOS_DEFAULT_VISIBLE)}
                titulo="Columnas visibles"
              />
            </div>
            <table className="tabla-pagos">
            <thead>
              <tr>
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
                    {isVisible('fechaPago') && <td>{pago.fechaPago || '-'}</td>}
                    {isVisible('socio') && (
                      <td>
                        {pago.numeroSocio} - {pago.apellido}, {pago.nombre}
                      </td>
                    )}
                    {isVisible('mes') && <td>{formatearMes(pago.mes)}</td>}
                    {isVisible('monto') && <td>${pago.monto.toFixed(2)}</td>}
                    {isVisible('medioPago') && <td>{pago.medioPago ?? '-'}</td>}
                    {isVisible('fechaLiquidacion') && <td>{pago.fechaLiquidacion || '-'}</td>}
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

const exportarPagosPdf = async (pagos: CuotaExtendida[], nombreClub: string) => {
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
    head: [
      [
        'Fecha Pago',
        'Socio',
        'Mes',
        'Monto',
        'Medio de Pago',
        'Fecha Liquidación',
      ],
    ],
    body: pagos.map((pago) => [
      pago.fechaPago || '-',
      `${pago.numeroSocio} - ${pago.apellido}, ${pago.nombre}`,
      formatearMes(pago.mes),
      `$${pago.monto.toFixed(2)}`,
      pago.medioPago ?? '-',
      pago.fechaLiquidacion || '-',
    ]),
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
    fechaPago: (p) => p.fechaPago || '-',
    socio: (p) => `${p.numeroSocio} - ${p.apellido}, ${p.nombre}`,
    mes: (p) => formatearMes(p.mes),
    monto: (p) => p.monto,
    medioPago: (p) => p.medioPago ?? '-',
    fechaLiquidacion: (p) => p.fechaLiquidacion || '-',
  };
  const headers: Record<string, string> = {
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
  exportToExcel(data, `Listado-Cobros-${Date.now()}`, 'Cobros');
};


