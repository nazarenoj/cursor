import { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useCategorias } from '../hooks/useCategorias';
import './ListadoPagos.css';

type FiltrosPagos = {
  fechaDesde: string;
  fechaHasta: string;
  socio: string;
  mes: string;
  medioPago: string;
  categoriaId: string;
};

type PagoFiltrado = {
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

  const mapPago = (cuota: (typeof liquidacionesCuotas)[number]): PagoFiltrado => {
    const liquidacionMensual = liquidacionesMensuales.find(
      (lm) => lm.id === cuota.liquidacionMensualId,
    );

    return {
      ...cuota,
      mes: liquidacionMensual?.mes || '',
      fechaLiquidacion: liquidacionMensual?.fechaLiquidacion || '',
    };
  };

  const pagos = useMemo<PagoFiltrado[]>(() => {
    return liquidacionesCuotas
      .filter((cuota) => cuota.pagado)
      .map(mapPago)
      .sort((a, b) => (b.fechaPago || '').localeCompare(a.fechaPago || ''));
  }, [liquidacionesCuotas, liquidacionesMensuales]);

  const mesesDisponibles = useMemo(() => {
    return Array.from(new Set(pagos.map((pago) => pago.mes).filter(Boolean))).sort().reverse();
  }, [pagos]);

  const mediosDisponibles = useMemo(() => {
    const set = new Set<string>();
    pagos.forEach((pago) => {
      if (pago.medioPago) {
        pago.medioPago.split(',').forEach((segmento) => {
          const medio = segmento.split(':')[0]?.trim();
          if (medio) {
            set.add(medio);
          }
        });
      }
    });
    return Array.from(set.values());
  }, [pagos]);

  const pagosFiltrados = useMemo(() => {
    return pagos.filter((pago) => {
      if (filtros.fechaDesde && pago.fechaPago && new Date(pago.fechaPago) < new Date(filtros.fechaDesde)) {
        return false;
      }
      if (filtros.fechaHasta && pago.fechaPago && new Date(pago.fechaPago) > new Date(filtros.fechaHasta)) {
        return false;
      }
      if (filtros.socio) {
        const texto = `${pago.numeroSocio} ${pago.apellido} ${pago.nombre}`.toLowerCase();
        if (!texto.includes(filtros.socio.toLowerCase())) {
          return false;
        }
      }
      if (filtros.mes && pago.mes !== filtros.mes) {
        return false;
      }
      if (
        filtros.medioPago &&
        (!pago.medioPago || !pago.medioPago.toLowerCase().includes(filtros.medioPago.toLowerCase()))
      ) {
        return false;
      }
      if (filtros.categoriaId && `${pago.categoriaId}` !== filtros.categoriaId) {
        return false;
      }
      return true;
    });
  }, [pagos, filtros]);

  const totalPagado = pagosFiltrados.reduce((sum, pago) => sum + pago.monto, 0);

  return (
    <div className="listado-pagos">
      <div className="card">
        <div className="header">
          <h1>Listado de Pagos Registrados</h1>
          <div className="resumen">
            <span>
              Pagos filtrados: <strong>{pagosFiltrados.length}</strong>
            </span>
            <span>
              Total cobrado:{' '}
              <strong>
                $
                {totalPagado.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </span>
          </div>
        </div>

        <div className="filtros-pagos">
          <div className="filtro">
            <label htmlFor="fecha-desde">Fecha pago desde</label>
            <input
              id="fecha-desde"
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) => setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))}
            />
          </div>
          <div className="filtro">
            <label htmlFor="fecha-hasta">Fecha pago hasta</label>
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
                    No hay pagos registrados todavía.
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

const exportarPagosPdf = (pagos: PagoFiltrado[]) => {
  if (pagos.length === 0) {
    alert('No hay pagos para exportar.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape' });
  const fecha = new Date().toLocaleString('es-AR');

  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 297, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Club Social y Deportivo - Listado de Pagos', 148.5, 16, { align: 'center' });

  doc.setTextColor(45, 55, 72);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Fecha de generación: ${fecha}`, 14, 33);
  doc.text(`Pagos incluidos: ${pagos.length}`, 14, 41);
  const total = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  doc.text(`Total cobrado: $${total.toFixed(2)}`, 14, 49);

  autoTable(doc, {
    startY: 58,
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
      const pageCount = doc.internal.getNumberOfPages();
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

  doc.save(`Listado-Pagos-${Date.now()}.pdf`);
};


