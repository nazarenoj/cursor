import { useMemo, useState } from 'react';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useCategorias } from '../hooks/useCategorias';
import { ImprimirTesoreria } from './ImprimirTesoreria';
import './Tesoreria.css';

type FiltrosTesoreria = {
  fechaDesde: string;
  fechaHasta: string;
  medioPago: string;
};

const MEDIOS_PAGO = [
  'Efectivo',
  'Débito automático',
  'Mercado Pago',
  'Transferencia bancaria',
  'Cheque',
  'Tarjeta de crédito',
];

export const Tesoreria = () => {
  const { liquidacionesCuotas, liquidacionesMensuales } = useLiquidaciones();
  const { categorias } = useCategorias();

  const [filtros, setFiltros] = useState<FiltrosTesoreria>({
    fechaDesde: '',
    fechaHasta: '',
    medioPago: '',
  });
  const [mostrarImpresion, setMostrarImpresion] = useState(false);

  // Obtener todos los pagos con información completa
  const pagos = useMemo(() => {
    return liquidacionesCuotas
      .filter((cuota) => cuota.pagado && cuota.fechaPago && cuota.medioPago)
      .map((cuota) => {
        const liquidacionMensual = liquidacionesMensuales.find(
          (lm) => lm.id === cuota.liquidacionMensualId,
        );
        return {
          ...cuota,
          mes: liquidacionMensual?.mes || '',
          fechaLiquidacion: liquidacionMensual?.fechaLiquidacion || '',
        };
      });
  }, [liquidacionesCuotas, liquidacionesMensuales]);

  // Aplicar filtros
  const pagosFiltrados = useMemo(() => {
    return pagos.filter((pago) => {
      if (filtros.fechaDesde) {
        if (!pago.fechaPago || new Date(pago.fechaPago) < new Date(filtros.fechaDesde)) {
          return false;
        }
      }
      if (filtros.fechaHasta) {
        if (!pago.fechaPago || new Date(pago.fechaPago) > new Date(filtros.fechaHasta)) {
          return false;
        }
      }
      if (filtros.medioPago) {
        if (!pago.medioPago) return false;
        // El medioPago puede contener múltiples medios separados por coma
        const medios = pago.medioPago.split(',').map((m) => m.split(':')[0]?.trim());
        if (!medios.some((m) => m === filtros.medioPago)) {
          return false;
        }
      }
      return true;
    });
  }, [pagos, filtros]);

  // Agrupar pagos por medio de pago
  const pagosPorMedio = useMemo(() => {
    const agrupados: Record<string, typeof pagosFiltrados> = {};

    pagosFiltrados.forEach((pago) => {
      if (!pago.medioPago) return;

      // Si el medioPago contiene múltiples medios (ej: "Efectivo: $100, Transferencia: $200")
      const partes = pago.medioPago.split(',');
      
      partes.forEach((parte) => {
        const [medio, montoStr] = parte.split(':').map((s) => s.trim());
        if (!medio) return;

        const monto = montoStr 
          ? parseFloat(montoStr.replace('$', '').replace(/,/g, '')) || pago.monto
          : pago.monto;

        if (!agrupados[medio]) {
          agrupados[medio] = [];
        }

        // Obtener nombre de categoría
        const categoria = categorias.find((c) => c.id === pago.categoriaId);
        const categoriaNombre = categoria?.nombre || 'Sin categoría';

        // Crear un registro por cada medio de pago
        agrupados[medio].push({
          ...pago,
          medioPago: medio,
          monto: monto,
          categoriaNombre: categoriaNombre,
        });
      });
    });

    return agrupados;
  }, [pagosFiltrados, categorias]);

  // Calcular totales por medio de pago
  const totalesPorMedio = useMemo(() => {
    const totales: Record<string, number> = {};
    
    Object.entries(pagosPorMedio).forEach(([medio, pagos]) => {
      totales[medio] = pagos.reduce((sum, pago) => sum + pago.monto, 0);
    });

    return totales;
  }, [pagosPorMedio]);

  // Total general
  const totalGeneral = useMemo(() => {
    return Object.values(totalesPorMedio).reduce((sum, total) => sum + total, 0);
  }, [totalesPorMedio]);

  const limpiarFiltros = () => {
    setFiltros({
      fechaDesde: '',
      fechaHasta: '',
      medioPago: '',
    });
  };

  const seleccionarMesCorriente = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    setFiltros({
      ...filtros,
      fechaDesde: primerDia.toISOString().split('T')[0],
      fechaHasta: ultimoDia.toISOString().split('T')[0],
    });
  };

  const seleccionarMesPasado = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    
    setFiltros({
      ...filtros,
      fechaDesde: primerDia.toISOString().split('T')[0],
      fechaHasta: ultimoDia.toISOString().split('T')[0],
    });
  };

  const getNombreMes = (mesString: string) => {
    if (!mesString) return '-';
    const [año, mes] = mesString.split('-');
    const fecha = new Date(parseInt(año, 10), parseInt(mes, 10) - 1, 1);
    return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    try {
      return new Date(fecha).toLocaleDateString('es-AR');
    } catch {
      return fecha;
    }
  };

  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find((c) => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  if (mostrarImpresion) {
    return (
      <ImprimirTesoreria
        pagosPorMedio={pagosPorMedio}
        totalesPorMedio={totalesPorMedio}
        totalGeneral={totalGeneral}
        filtros={filtros}
        onVolver={() => setMostrarImpresion(false)}
      />
    );
  }

  return (
    <div className="tesoreria">
      <div className="tesoreria-header">
        <h1>Tesorería</h1>
        <p className="subtitle">Resumen de cobros por medio de pago</p>
        <div className="header-actions">
          <button className="btn-imprimir-tesoreria" onClick={() => setMostrarImpresion(true)}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      <div className="filtros-tesoreria">
        <div className="filtro-group">
          <label htmlFor="fechaDesde">Fecha Desde:</label>
          <input
            type="date"
            id="fechaDesde"
            value={filtros.fechaDesde}
            onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
          />
        </div>
        <div className="filtro-group">
          <label htmlFor="fechaHasta">Fecha Hasta:</label>
          <input
            type="date"
            id="fechaHasta"
            value={filtros.fechaHasta}
            onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
          />
        </div>
        <div className="filtro-group">
          <label htmlFor="medioPago">Medio de Pago:</label>
          <select
            id="medioPago"
            value={filtros.medioPago}
            onChange={(e) => setFiltros({ ...filtros, medioPago: e.target.value })}
          >
            <option value="">Todos</option>
            {MEDIOS_PAGO.map((medio) => (
              <option key={medio} value={medio}>
                {medio}
              </option>
            ))}
          </select>
        </div>
        <div className="filtro-acciones">
          <button className="btn-mes-rapido" onClick={seleccionarMesCorriente} title="Seleccionar mes corriente">
            📅 Mes Corriente
          </button>
          <button className="btn-mes-rapido" onClick={seleccionarMesPasado} title="Seleccionar mes pasado">
            📅 Mes Pasado
          </button>
          <button className="btn-limpiar" onClick={limpiarFiltros}>
            Limpiar Filtros
          </button>
        </div>
      </div>

      <div className="resumen-tesoreria">
        <div className="resumen-card">
          <h3>Total General</h3>
          <p className="monto-total">${totalGeneral.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</p>
        </div>
        <div className="resumen-por-medio">
          {Object.entries(totalesPorMedio)
            .sort(([, a], [, b]) => b - a)
            .map(([medio, total]) => (
              <div key={medio} className="resumen-item">
                <span className="medio-nombre">{medio}</span>
                <span className="medio-total">
                  ${total.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="tabla-tesoreria">
        <h2>Detalle de Cobros por Medio de Pago</h2>
        {Object.entries(pagosPorMedio)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([medio, pagosMedio]) => (
            <div key={medio} className="medio-section">
              <div className="medio-header">
                <h3>{medio}</h3>
                <span className="medio-cantidad">
                  {pagosMedio.length} cobro{pagosMedio.length !== 1 ? 's' : ''} - Total: $
                  {totalesPorMedio[medio].toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="tabla-wrapper">
                <table className="tabla-pagos-medio">
                  <thead>
                    <tr>
                      <th>Fecha Pago</th>
                      <th>N° Socio</th>
                      <th>Apellido</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Mes Liquidación</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosMedio
                      .sort((a, b) => (b.fechaPago || '').localeCompare(a.fechaPago || ''))
                      .map((pago) => (
                        <tr key={pago.id}>
                          <td>{formatFecha(pago.fechaPago)}</td>
                          <td>{pago.numeroSocio}</td>
                          <td>{pago.apellido}</td>
                          <td>{pago.nombre}</td>
                          <td>{getCategoriaNombre(pago.categoriaId)}</td>
                          <td>{getNombreMes(pago.mes)}</td>
                          <td className="monto">
                            ${pago.monto.toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        {Object.keys(pagosPorMedio).length === 0 && (
          <div className="sin-datos">
            <p>No se encontraron cobros con los filtros aplicados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

