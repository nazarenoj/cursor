import { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { dibujarEncabezadoConLogo } from '../utils/pdfLogo';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useCategorias } from '../hooks/useCategorias';
import './ListadoPagos.css';

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
  const { liquidacionesCuotas, liquidacionesMensuales } = useLiquidaciones();
  const { categorias } = useCategorias();

  const [filtros, setFiltros] = useState<FiltrosPagos>({
    fechaDesde: '',
    fechaHasta: '',
    socio: '',
    mes: '',
    medioPago: '',
    categoriaId: '',
  });
  const [mostrarGrafico, setMostrarGrafico] = useState(false);

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
    const medios = new Set<string>();
    cuotas.forEach((cuota) => {
      if (cuota.medioPago) {
        cuota.medioPago.split(',').forEach((segmento) => {
          const medio = segmento.split(':')[0]?.trim();
          if (medio) {
            medios.add(medio);
          }
        });
      }
    });
    return Array.from(medios.values());
  }, [cuotas]);

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
            <button className="btn-exportar" onClick={() => exportarPagosPdf(pagosFiltrados)}>
              📄 Exportar PDF
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

        <div className="tabla-wrapper">
          <table className="tabla-pagos">
            <thead>
              <tr>
                <th>Fecha Pago</th>
                <th>Socio</th>
                <th>Mes</th>
                <th>Monto</th>
                <th>Medio de Pago</th>
                <th>Fecha Liquidación</th>
              </tr>
            </thead>
            <tbody>
              {pagosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="sin-datos">
                    No hay cobros registrados todavía.
                  </td>
                </tr>
              ) : (
                pagosFiltrados.map((pago) => (
                  <tr key={pago.id}>
                    <td>{pago.fechaPago || '-'}</td>
                    <td>
                      {pago.numeroSocio} - {pago.apellido}, {pago.nombre}
                    </td>
                    <td>{formatearMes(pago.mes)}</td>
                    <td>${pago.monto.toFixed(2)}</td>
                    <td>{pago.medioPago ?? '-'}</td>
                    <td>{pago.fechaLiquidacion || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const exportarPagosPdf = (pagos: CuotaExtendida[]) => {
  if (pagos.length === 0) {
    alert('No hay cobros para exportar.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape' });
  const fecha = new Date().toLocaleString('es-AR');

  // Encabezado con logo
  dibujarEncabezadoConLogo(doc, 'landscape');

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
        dibujarEncabezadoConLogo(doc, 'landscape');
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


