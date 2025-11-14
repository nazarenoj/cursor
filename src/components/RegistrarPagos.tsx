import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useCategorias } from '../hooks/useCategorias';
import type { MedioPago, Socio } from '../types';
import './RegistrarPagos.css';

const MEDIOS_PAGO: MedioPago[] = [
  'Efectivo',
  'Débito automático',
  'Mercado Pago',
  'Transferencia bancaria',
  'Cheque',
  'Tarjeta de crédito',
];

interface RegistrarPagosProps {
  socio?: Socio;
}

type MedioSeleccion = {
  medio: MedioPago;
  monto: number;
  editado: boolean;
};

export const RegistrarPagos = ({ socio }: RegistrarPagosProps) => {
  const navigate = useNavigate();
  const {
    liquidacionesCuotas,
    liquidacionesMensuales,
    marcarCuotasComoPagadas,
  } = useLiquidaciones();
  const { categorias } = useCategorias();
  const [mediosSeleccionados, setMediosSeleccionados] = useState<MedioSeleccion[]>([
    { medio: 'Efectivo', monto: 0, editado: false },
  ]);
  const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState<Set<number>>(new Set());
  const [alerta, setAlerta] = useState<{ tipo: 'info' | 'error'; texto: string } | null>(null);
  const [ultimoRecibo, setUltimoRecibo] = useState<{ url: string; nombre: string } | null>(null);

  const cuotasPendientes = useMemo(() => {
    return liquidacionesCuotas
      .filter((cuota) => !cuota.pagado && (!socio || cuota.socioId === socio.id))
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
      .sort((a, b) => b.mes.localeCompare(a.mes));
  }, [liquidacionesCuotas, liquidacionesMensuales, socio]);

  const totalSeleccionado = useMemo(() => {
    return cuotasPendientes
      .filter((cuota) => cuotasSeleccionadas.has(cuota.id))
      .reduce((sum, cuota) => sum + cuota.monto, 0);
  }, [cuotasPendientes, cuotasSeleccionadas]);

  const sumaMediosSeleccionados = useMemo(() => {
    return mediosSeleccionados.reduce((sum, item) => sum + item.monto, 0);
  }, [mediosSeleccionados]);

  const diferenciaMontos = useMemo(() => {
    return Number((totalSeleccionado - sumaMediosSeleccionados).toFixed(2));
  }, [totalSeleccionado, sumaMediosSeleccionados]);

  const ajustarDistribucion = (items: MedioSeleccion[], total: number): MedioSeleccion[] => {
    const lista: MedioSeleccion[] =
      items.length === 0
        ? [{ medio: 'Efectivo' as MedioPago, monto: 0, editado: false }]
        : items.map((item) => ({
            ...item,
            monto: Number.isFinite(item.monto) ? Number(item.monto) : 0,
          }));

    const manualSum = lista
      .filter((item) => item.editado)
      .reduce((sum, item) => sum + item.monto, 0);

    const autoItems = lista.filter((item) => !item.editado);
    const resultado: MedioSeleccion[] = lista.map((item) => ({ ...item }));

    const restante = Number((total - manualSum).toFixed(2));

    if (autoItems.length === 0) {
      return resultado;
    }

    if (restante <= 0) {
      return resultado.map((item) => (item.editado ? item : { ...item, monto: 0 }));
    }

    let acumulado = 0;
    autoItems.forEach((item, idx) => {
      const remaining = autoItems.length - idx;
      const index = resultado.findIndex((r) => r.medio === item.medio);
      const restanteDisponible = Number((total - manualSum - acumulado).toFixed(2));
      let monto =
        remaining <= 0
          ? 0
          : Number((restanteDisponible / remaining).toFixed(2));
      if (!Number.isFinite(monto) || monto < 0) {
        monto = 0;
      }
      acumulado += monto;
      resultado[index] = { ...resultado[index], monto };
    });

    return resultado;
  };

  useEffect(() => {
    setMediosSeleccionados((prev) => {
      const ajustado = ajustarDistribucion(prev, totalSeleccionado);
      const igual =
        ajustado.length === prev.length &&
        ajustado.every(
          (item, idx) =>
            item.medio === prev[idx]?.medio &&
            item.monto === prev[idx]?.monto &&
            item.editado === prev[idx]?.editado,
        );
      return igual ? prev : ajustado;
    });
  }, [totalSeleccionado]);

  const categoriaSocio = useMemo(() => {
    if (!socio) return null;
    return categorias.find((cat) => cat.id === socio.categoriaId);
  }, [categorias, socio]);

  const toggleSeleccion = (id: number) => {
    setAlerta(null);
    setCuotasSeleccionadas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  };

  const seleccionarTodo = () => {
    setAlerta(null);
    setCuotasSeleccionadas(new Set(cuotasPendientes.map((cuota) => cuota.id)));
  };

  const limpiarSeleccion = () => {
    setAlerta(null);
    setCuotasSeleccionadas(new Set());
  };

  const toggleMedioPago = (medio: MedioPago) => {
    setAlerta(null);
    setMediosSeleccionados((prev) => {
      let updated: MedioSeleccion[];
      if (prev.some((item) => item.medio === medio)) {
        updated = prev.filter((item) => item.medio !== medio);
      } else {
        updated = [...prev, { medio, monto: 0, editado: false }];
      }
      if (updated.length === 0) {
        updated = [{ medio: 'Efectivo', monto: 0, editado: false }];
      }
      return ajustarDistribucion(updated, totalSeleccionado);
    });
  };

  const actualizarMontoMedio = (medio: MedioPago, monto: number) => {
    setAlerta(null);
    setMediosSeleccionados((prev) => {
      const valor = Number.isFinite(monto) ? Math.max(monto, 0) : 0;
      const actualizados = prev.map((item) =>
        item.medio === medio ? { ...item, monto: valor, editado: true } : item,
      );
      return ajustarDistribucion(actualizados, totalSeleccionado);
    });
  };

  const recalcularDistribucion = () => {
    setAlerta(null);
    setMediosSeleccionados((prev) =>
      ajustarDistribucion(
        prev.map((item) => ({ ...item, editado: false })),
        totalSeleccionado,
      ),
    );
  };

  const handleConfirmarPago = async () => {
    if (cuotasSeleccionadas.size === 0) {
          setAlerta({ tipo: 'error', texto: 'Seleccioná al menos una cuota para registrar el cobro.' });
      return;
    }

    if (mediosSeleccionados.length === 0) {
      setAlerta({ tipo: 'error', texto: 'Seleccioná al menos un medio de pago.' });
      return;
    }

    if (Math.abs(diferenciaMontos) > 0.5) {
      setAlerta({
        tipo: 'error',
        texto: 'Los montos por medio de cobro no coinciden con el total a cobrar.',
      });
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmás registrar el cobro de ${cuotasSeleccionadas.size} cuota(s) por un total de $${totalSeleccionado.toFixed(
        2,
      )}?`,
    );

    if (!confirmar) return;

    const ids = Array.from(cuotasSeleccionadas);
    const descripcionMedios = mediosSeleccionados
      .map((item) => `${item.medio}: $${item.monto.toFixed(2)}`)
      .join(', ');

    try {
      const cuotasActualizadas = await marcarCuotasComoPagadas(ids, descripcionMedios);

      if (cuotasActualizadas.length === 0) {
        setAlerta({
          tipo: 'error',
          texto: 'No se pudo registrar el cobro. Intentá nuevamente.',
        });
        return;
      }

      if (socio) {
        const reciboGenerado = generarRecibo({
          socio,
          medios: descripcionMedios,
          cuotas: cuotasPendientes.filter((cuota) => ids.includes(cuota.id)),
          total: totalSeleccionado,
        });
        if (reciboGenerado) {
          setUltimoRecibo({
            url: reciboGenerado.url,
            nombre: reciboGenerado.nombre,
          });
          window.open(reciboGenerado.url, '_blank');
        }
      }

      setAlerta({ tipo: 'info', texto: 'El cobro se registró correctamente.' });
      setCuotasSeleccionadas(new Set());
      setMediosSeleccionados([{ medio: 'Efectivo', monto: 0, editado: false }]);
      setTimeout(() => {
        navigate('/socios');
      }, 1200);
    } catch (error) {
      setAlerta({
        tipo: 'error',
        texto:
          error instanceof Error
            ? error.message
            : 'No se pudo registrar el cobro. Intentá nuevamente.',
      });
    }
  };

  if (!socio) {
    return (
      <div className="registrar-pagos">
        <div className="card">
          <h1>Registrar Cobro de Cuotas</h1>
          <p>Seleccioná un socio desde el listado para registrar cobros.</p>
          <button className="btn-volver" onClick={() => navigate('/socios')}>
            ← Volver al listado de socios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="registrar-pagos">
      <div className="card">
            <div className="encabezado">
              <button className="btn-volver" onClick={() => navigate('/socios')}>
                ← Volver al listado de socios
              </button>
              <h1>Registrar Cobro</h1>
            </div>

        <div className="datos-socio">
          <div>
            <span className="label">Socio:</span> {socio.apellido}, {socio.nombre}
          </div>
          <div>
            <span className="label">Número de socio:</span> {socio.numeroSocio}
          </div>
          <div>
            <span className="label">Categoría:</span> {categoriaSocio?.nombre ?? 'Sin categoría'}
          </div>
        </div>

        <div className="acciones-cuotas">
          <div className="btn-group">
            <button
              className="btn-secundario"
              onClick={seleccionarTodo}
              disabled={cuotasPendientes.length === 0}
            >
              Seleccionar todas
            </button>
            <button
              className="btn-secundario"
              onClick={limpiarSeleccion}
              disabled={cuotasSeleccionadas.size === 0}
            >
              Limpiar selección
            </button>
          </div>

          <div className="medio-pago">
            <span className="label">Medios de Pago:</span>
            <div className="opciones">
              {MEDIOS_PAGO.map((medio) => {
                const seleccionado = mediosSeleccionados.some((item) => item.medio === medio);
                return (
                  <label key={medio} className={seleccionado ? 'medio-seleccionado' : ''}>
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={() => toggleMedioPago(medio)}
                    />
                    {medio}
                  </label>
                );
              })}
            </div>

            <div className="montos-medios">
              {mediosSeleccionados.map((item) => (
                <div key={item.medio} className="medio-row">
                  <span>{item.medio}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.monto}
                    onChange={(e) => actualizarMontoMedio(item.medio, Number(e.target.value))}
                  />
                </div>
              ))}
              <button className="btn-secundario" onClick={recalcularDistribucion}>
                Recalcular distribución
              </button>
            </div>
          </div>
        </div>

        <div className="tabla-wrapper">
          <table className="tabla-cuotas">
            <thead>
              <tr>
                <th></th>
                <th>Mes</th>
                <th>Fecha Liquidación</th>
                <th>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cuotasPendientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="sin-datos">
                    No hay cuotas pendientes para este socio.
                  </td>
                </tr>
              ) : (
                cuotasPendientes.map((cuota) => (
                  <tr key={cuota.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={cuotasSeleccionadas.has(cuota.id)}
                        onChange={() => toggleSeleccion(cuota.id)}
                      />
                    </td>
                    <td>{getNombreMes(cuota.mes)}</td>
                    <td>{cuota.fechaLiquidacion || '-'}</td>
                    <td>${cuota.monto.toFixed(2)}</td>
                    <td>
                      <span className="badge badge-pendiente">Pendiente</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="resumen-pago">
          <div>
            <span className="label">Cuotas seleccionadas:</span> {cuotasSeleccionadas.size}
          </div>
          <div>
            <span className="label">Total a cobrar:</span> ${totalSeleccionado.toFixed(2)}
          </div>
          <div>
            <span className="label">Total distribuido:</span> ${sumaMediosSeleccionados.toFixed(2)}
          </div>
          <div className={Math.abs(diferenciaMontos) > 0.5 ? 'alerta-diferencia error' : 'alerta-diferencia'}>
            Diferencia: ${diferenciaMontos.toFixed(2)}
          </div>
        </div>

        {alerta && (
          <div className={`mensaje ${alerta.tipo === 'error' ? 'error' : ''}`}>{alerta.texto}</div>
        )}

        {ultimoRecibo && (
          <div className="acciones-recibo">
            <button
              className="btn-recibo"
              onClick={() => window.open(ultimoRecibo.url, '_blank')}
            >
              Abrir último recibo generado
            </button>
            <span className="recibo-nombre">{ultimoRecibo.nombre}</span>
          </div>
        )}

        <div className="acciones-finales">
          <button
            className="btn-confirmar"
            onClick={handleConfirmarPago}
            disabled={cuotasSeleccionadas.size === 0 || Math.abs(diferenciaMontos) > 0.5}
          >
                Confirmar cobro
          </button>
        </div>
      </div>
    </div>
  );
};

const getNombreMes = (mesString: string) => {
  if (!mesString) return '-';
  const [año, mes] = mesString.split('-');
  const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
  return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
};

interface GenerarReciboParams {
  socio: Socio;
  medios: string;
  cuotas: Array<{
    mes: string;
    fechaLiquidacion: string;
    monto: number;
  }>;
  total: number;
}

const generarRecibo = ({ socio, medios, cuotas, total }: GenerarReciboParams) => {
  const doc = new jsPDF();
  const fechaHoy = new Date().toLocaleString('es-AR');

  dibujarEncabezadoConLogo(doc);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  doc.text(`Fecha de emisión: ${fechaHoy}`, 20, 55);
  doc.text(`Socio: ${socio.apellido}, ${socio.nombre}`, 20, 63);
  doc.text(`Número de socio: ${socio.numeroSocio}`, 20, 71);

  doc.setFont('helvetica', 'bold');
      doc.text('Medios de cobro:', 20, 83);
  doc.setFont('helvetica', 'normal');
  doc.text(medios, 20, 90, { maxWidth: 170 });

  let y = 106;
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de cuotas canceladas', 20, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(20, y, 170, 10, 3, 3, 'F');
  doc.setFontSize(10);
  doc.text('Mes', 27, y + 7);
  doc.text('Fecha liquidación', 72, y + 7);
  doc.text('Monto', 150, y + 7, { align: 'right' });
  y += 14;

  doc.setFontSize(10);
  cuotas.forEach((cuota) => {
    doc.text(getNombreMes(cuota.mes), 27, y);
    doc.text(cuota.fechaLiquidacion || '-', 95, y, { align: 'center' });
    doc.text(`$${cuota.monto.toFixed(2)}`, 150, y, { align: 'right' });
    y += 7;
    if (y > 260) {
      doc.addPage();
      dibujarEncabezadoConLogo(doc);
      y = 106;
    }
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total abonado: $${total.toFixed(2)}`, 150, y + 6, { align: 'right' });

  doc.setDrawColor(200);
  doc.line(20, y + 20, 190, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Firma y sello', 150, y + 26, { align: 'center' });

  const filename = `Recibo-${socio.numeroSocio}-${Date.now()}.pdf`;
  doc.save(filename);

  const blobUrl = doc.output('bloburl') as string | URL;
  const urlString = typeof blobUrl === 'string' ? blobUrl : blobUrl.toString();
  return { url: urlString, nombre: filename };
};

const dibujarEncabezadoConLogo = (doc: jsPDF) => {
  // Fondo beige claro
  doc.setFillColor(250, 248, 245);
  doc.rect(0, 0, 210, 40, 'F');

  // Posición del logo
  const logoX = 30;
  const logoY = 22;
  const logoRadius = 14;

  // Dibujar círculo punteado (borde con puntos cuadrados)
  doc.setDrawColor(60, 60, 60); // Gris oscuro
  doc.setLineWidth(0.5);
  
  // Dibujar puntos alrededor del círculo para simular borde punteado
  const numPoints = 40;
  const angleStep = (2 * Math.PI) / numPoints;
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep;
    const x = logoX + Math.cos(angle) * logoRadius;
    const y = logoY + Math.sin(angle) * logoRadius;
    // Dibujar punto cuadrado pequeño
    doc.setFillColor(60, 60, 60);
    doc.rect(x - 0.3, y - 0.3, 0.6, 0.6, 'F');
  }

  // Texto "CLUB SOCIAL" en arco superior
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60); // Gris oscuro
  
  const topText = 'CLUB SOCIAL';
  const topRadius = logoRadius - 2;
  const topStartAngle = Math.PI * 0.35; // Ajuste para posición superior
  const topAngleStep = (Math.PI * 0.9) / (topText.length - 1);
  
  for (let i = 0; i < topText.length; i++) {
    const angle = topStartAngle + (i * topAngleStep);
    const x = logoX + Math.cos(angle) * topRadius;
    const y = logoY + Math.sin(angle) * topRadius;
    doc.text(topText[i], x, y, { align: 'center', angle: (angle * 180 / Math.PI) - 90 });
  }

  // Texto "REALICÓ" en arco inferior (ligeramente itálico)
  const bottomText = 'REALICÓ';
  const bottomRadius = logoRadius - 2;
  const bottomStartAngle = Math.PI * 1.15; // Ajuste para posición inferior
  const bottomAngleStep = (Math.PI * 0.9) / (bottomText.length - 1);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  
  for (let i = 0; i < bottomText.length; i++) {
    const angle = bottomStartAngle + (i * bottomAngleStep);
    const x = logoX + Math.cos(angle) * bottomRadius;
    const y = logoY + Math.sin(angle) * bottomRadius;
    doc.text(bottomText[i], x, y, { align: 'center', angle: (angle * 180 / Math.PI) - 90 });
  }

  // Letras "C" y "S" superpuestas en el centro (fuente serif, gris medio)
  doc.setFont('times', 'bold'); // Fuente serif
  doc.setFontSize(20);
  doc.setTextColor(120, 120, 120); // Gris medio
  
  // Letra "C" (ligeramente arriba y a la izquierda)
  doc.text('C', logoX - 3, logoY + 2, { align: 'center' });
  
  // Letra "S" (ligeramente abajo y a la derecha, superpuesta)
  doc.text('S', logoX + 3, logoY - 2, { align: 'center' });

  // Título del club a la derecha del logo
  doc.setTextColor(45, 55, 72);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CLUB SOCIAL REALICÓ', 70, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Recibo oficial de cobro de cuotas sociales', 70, 30);
};




