import { useState } from 'react';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { FormularioLiquidacion } from './FormularioLiquidacion';
import { TablaLiquidaciones } from './TablaLiquidaciones';
import { TablaLiquidacionesMensuales } from './TablaLiquidacionesMensuales';
import { ImprimirLiquidaciones } from './ImprimirLiquidaciones';
import './ListaLiquidaciones.css';

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
    getLiquidacionMensualPorMes
  } = useLiquidaciones();
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mesDetalle, setMesDetalle] = useState<string | null>(null);
  const [mesImpresion, setMesImpresion] = useState<string | null>(null);
  const [mostrarImpresion, setMostrarImpresion] = useState(false);
  const [error, setError] = useState<string>('');

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

  const ordenarPorMes = (a: { mes: string; fechaLiquidacion: string }, b: { mes: string; fechaLiquidacion: string }) => {
    // Ordenar por mes descendente (más reciente primero)
    if (b.mes !== a.mes) {
      return b.mes.localeCompare(a.mes);
    }
    // Si es el mismo mes, ordenar por fecha de liquidación
    return b.fechaLiquidacion.localeCompare(a.fechaLiquidacion);
  };

  const cuotasOrdenadas = [...todasLiquidaciones].sort(ordenarPorMes);

  const obtenerCuotasPorMes = (mes: string) => cuotasOrdenadas.filter(l => l.mes === mes);

  const handleGenerar = (mes: string) => {
    try {
      setError('');
      generarLiquidacionMensual(mes);
      setMostrarFormulario(false);
      alert(`Liquidación generada exitosamente para el mes ${mes}`);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al generar la liquidación';
      setError(mensaje);
      alert(mensaje);
    }
  };

  const handleMarcarPagado = (id: number) => {
    if (window.confirm('¿Marcar esta liquidación como pagada?')) {
      marcarComoPagado(id);
    }
  };

  const handleMarcarNoPagado = (id: number) => {
    if (window.confirm('¿Marcar esta liquidación como no pagada?')) {
      marcarComoNoPagado(id);
    }
  };

  const handleBorrar = (id: number) => {
    if (window.confirm('¿Está seguro que desea eliminar esta liquidación individual?')) {
      try {
        borrarLiquidacionCuota(id);
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error al borrar la liquidación';
        alert(mensaje);
      }
    }
  };

  const handleBorrarLiquidacionMensual = (mes: string) => {
    const liquidacionMensual = getLiquidacionMensualPorMes(mes);
    if (!liquidacionMensual) return;

    if (window.confirm(`¿Está seguro que desea eliminar toda la liquidación del mes ${mes}? Esto eliminará todas las cuotas relacionadas.`)) {
      try {
        borrarLiquidacionMensual(liquidacionMensual.id);
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
              🖨️ Imprimir Mes
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
          <button onClick={() => setMostrarFormulario(true)} className="btn-agregar">
            + Generar Liquidación
          </button>
          {cuotasOrdenadas.length > 0 && (
            <button onClick={() => handleImprimirMes()} className="btn-imprimir">
              🖨️ Imprimir Todas
            </button>
          )}
        </div>
      </div>

      <TablaLiquidacionesMensuales
        liquidacionesMensuales={liquidacionesMensuales}
        liquidacionesCuotas={liquidacionesCuotas}
        onVerDetalle={handleVerDetalle}
        onImprimir={handleImprimirMes}
        onBorrar={handleBorrarLiquidacionMensual}
      />
    </div>
  );
};

