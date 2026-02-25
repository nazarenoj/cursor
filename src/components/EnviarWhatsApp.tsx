import { useEffect, useMemo, useState } from 'react';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useSocios } from '../hooks/useSocios';
import { apiService } from '../services/api';
import './EnviarWhatsApp.css';

interface EnviarWhatsAppProps {
  liquidacionMensualId?: number;
  onVolver?: () => void;
}

export const EnviarWhatsApp = ({ liquidacionMensualId, onVolver }: EnviarWhatsAppProps) => {
  const { nombreClub } = useClubConfig();
  const { liquidacionesCuotas, liquidacionesMensuales } = useLiquidaciones();
  const { socios } = useSocios();
  const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState<Set<number>>(new Set());
  const [soloPendientes, setSoloPendientes] = useState(true);
  const STORAGE_KEY_SELECTED = 'whatsapp_plantilla_liquidaciones_seleccion_v1'; // solo selección local

  // Obtener cuotas según filtros
  const cuotasDisponibles = useMemo(() => {
    let cuotas = liquidacionesCuotas;

    // Filtrar por liquidación mensual si se especifica
    if (liquidacionMensualId) {
      cuotas = cuotas.filter((c) => c.liquidacionMensualId === liquidacionMensualId);
    }

    // Filtrar solo pendientes si está activo
    if (soloPendientes) {
      cuotas = cuotas.filter((c) => !c.pagado);
    }

    // Agregar información de mes y teléfono del socio
    return cuotas.map((cuota) => {
      const liquidacionMensual = liquidacionesMensuales.find(
        (lm) => lm.id === cuota.liquidacionMensualId,
      );
      const socio = socios.find((s) => s.id === cuota.socioId);
      return {
        ...cuota,
        mes: liquidacionMensual?.mes || '',
        telefono: socio?.telefono || '',
      };
    });
  }, [liquidacionesCuotas, liquidacionesMensuales, socios, liquidacionMensualId, soloPendientes]);

  type CuotaDisponible = (typeof cuotasDisponibles)[number];

  const plantillaPorDefecto = () =>
    `Hola {nombre} {apellido}!\n\n` +
    `Te recordamos que tenés pendiente el pago de la cuota correspondiente a {mes}.\n\n` +
    `📋 Detalle:\n` +
    `• Socio N°: {numeroSocio}\n` +
    `• Categoría: {categoria}\n` +
    `• Mes: {mes}\n` +
    `• Monto: $${'{monto}'}\n\n` +
    `Por favor, acercate a realizar el pago.\n\n` +
    `Saludos cordiales,\n${nombreClub}`;

  type PlantillaWhatsApp = { id: number; nombre: string; texto: string };

  const [plantillas, setPlantillas] = useState<PlantillaWhatsApp[]>([]);
  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState<number | ''>('');
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [archivoPdfAdjunto, setArchivoPdfAdjunto] = useState('');

  const cargarPlantillas = async () => {
    const list = await apiService.getWhatsAppTemplates();
    // Normalizar: la API devuelve texto, pero nuestro state usa texto
    setPlantillas(list.map((t) => ({ id: t.id, nombre: t.nombre, texto: t.texto })));
    return list;
  };

  // Cargar plantillas desde BD
  useEffect(() => {
    (async () => {
      try {
        const list = await cargarPlantillas();
        const selectedRaw = localStorage.getItem(STORAGE_KEY_SELECTED);
        const selectedId = selectedRaw ? Number(selectedRaw) : NaN;
        const selected =
          Number.isFinite(selectedId) && list.some((t) => t.id === selectedId)
            ? selectedId
            : list[0]?.id;

        if (selected) {
          setPlantillaSeleccionadaId(selected);
          setMensajePersonalizado(list.find((t) => t.id === selected)?.texto || plantillaPorDefecto());
          localStorage.setItem(STORAGE_KEY_SELECTED, String(selected));
        } else {
          // Si no hay plantillas aún, usar la default (sin persistir acá; se crea con "Guardar como nueva")
          setPlantillaSeleccionadaId('');
          setMensajePersonalizado(plantillaPorDefecto());
        }
      } catch (e) {
        setPlantillas([]);
        setPlantillaSeleccionadaId('');
        setMensajePersonalizado(plantillaPorDefecto());
      }
    })();
  }, []);

  const seleccionarPlantilla = (idRaw: string) => {
    const id = idRaw ? Number(idRaw) : NaN;
    if (!Number.isFinite(id)) {
      setPlantillaSeleccionadaId('');
      return;
    }
    setPlantillaSeleccionadaId(id);
    const encontrada = plantillas.find((p) => p.id === id);
    if (encontrada) setMensajePersonalizado(encontrada.texto);
    localStorage.setItem(STORAGE_KEY_SELECTED, String(id));
  };

  const guardarComoNueva = async () => {
    const nombre = window.prompt('Nombre para la nueva plantilla:', `Plantilla ${plantillas.length + 1}`);
    if (!nombre) return;
    try {
      const creada = await apiService.crearWhatsAppTemplate({ nombre: nombre.trim(), texto: mensajePersonalizado });
      await cargarPlantillas();
      setPlantillaSeleccionadaId(creada.id);
      localStorage.setItem(STORAGE_KEY_SELECTED, String(creada.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo guardar la plantilla');
    }
  };

  const actualizarPlantilla = async () => {
    if (!plantillaSeleccionadaId) {
      alert('Seleccioná una plantilla para actualizar.');
      return;
    }
    const p = plantillas.find((x) => x.id === plantillaSeleccionadaId);
    if (!p) return;
    try {
      await apiService.actualizarWhatsAppTemplate(plantillaSeleccionadaId, { nombre: p.nombre, texto: mensajePersonalizado });
      await cargarPlantillas();
      alert('Plantilla actualizada.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo actualizar la plantilla');
    }
  };

  const eliminarPlantilla = async () => {
    if (!plantillaSeleccionadaId) return;
    const p = plantillas.find((x) => x.id === plantillaSeleccionadaId);
    if (!p) return;
    if (!window.confirm(`¿Eliminar la plantilla "${p.nombre}"?`)) return;
    try {
      await apiService.eliminarWhatsAppTemplate(plantillaSeleccionadaId);
      const list = await cargarPlantillas();
      const nextSelected = list[0]?.id;
      if (nextSelected) {
        setPlantillaSeleccionadaId(nextSelected);
        setMensajePersonalizado(list.find((t) => t.id === nextSelected)?.texto || plantillaPorDefecto());
        localStorage.setItem(STORAGE_KEY_SELECTED, String(nextSelected));
      } else {
        setPlantillaSeleccionadaId('');
        setMensajePersonalizado(plantillaPorDefecto());
        localStorage.removeItem(STORAGE_KEY_SELECTED);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar la plantilla');
    }
  };

  // Modal individual (permite editar el texto final a enviar)
  const [mostrarModalMensaje, setMostrarModalMensaje] = useState(false);
  const [mensajeParaEnviar, setMensajeParaEnviar] = useState('');
  const [cuotaParaEnviar, setCuotaParaEnviar] = useState<CuotaDisponible | null>(null);

  // Modal masivo (editar UNA vez la plantilla)
  const [mostrarModalMasivo, setMostrarModalMasivo] = useState(false);
  const [plantillaMasiva, setPlantillaMasiva] = useState('');
  const [cuotasMasivas, setCuotasMasivas] = useState<CuotaDisponible[]>([]);
  const [cuotaPreviewMasiva, setCuotaPreviewMasiva] = useState<CuotaDisponible | null>(null);

  // Generar mensaje para una cuota
  const generarMensaje = (cuota: CuotaDisponible): string => {
    const nombreMes = getNombreMes(cuota.mes);
    
    if (mensajePersonalizado.trim()) {
      // Reemplazar variables en el mensaje personalizado
      return mensajePersonalizado
        .replace(/{nombre}/g, cuota.nombre)
        .replace(/{apellido}/g, cuota.apellido)
        .replace(/{numeroSocio}/g, cuota.numeroSocio.toString())
        .replace(/{categoria}/g, cuota.categoriaNombre)
        .replace(/{mes}/g, nombreMes)
        .replace(/{monto}/g, cuota.monto.toFixed(2));
    }
    
    const mensajeBase = 
      `Hola ${cuota.nombre} ${cuota.apellido}!\n\n` +
      `Te recordamos que tenés pendiente el pago de la cuota correspondiente a ${nombreMes}.\n\n` +
      `📋 Detalle:\n` +
      `• Socio N°: ${cuota.numeroSocio}\n` +
      `• Categoría: ${cuota.categoriaNombre}\n` +
      `• Mes: ${nombreMes}\n` +
      `• Monto: $${cuota.monto.toFixed(2)}\n\n` +
      `Por favor, acercate a realizar el pago.\n\n` +
      `Saludos cordiales,\n${nombreClub}`;

    return mensajeBase;
  };

  const aplicarPlantilla = (plantilla: string, cuota: CuotaDisponible): string => {
    const nombreMes = getNombreMes(cuota.mes);
    return plantilla
      .replace(/{nombre}/g, cuota.nombre)
      .replace(/{apellido}/g, cuota.apellido)
      .replace(/{numeroSocio}/g, cuota.numeroSocio.toString())
      .replace(/{categoria}/g, cuota.categoriaNombre)
      .replace(/{mes}/g, nombreMes)
      .replace(/{monto}/g, cuota.monto.toFixed(2));
  };

  const getNombreMes = (mesString: string): string => {
    if (!mesString) return '';
    const [año, mes] = mesString.split('-');
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  // Formatear teléfono para WhatsApp (eliminar espacios, guiones, etc.)
  const formatearTelefono = (telefono: string): string => {
    if (!telefono) return '';
    // Eliminar espacios, guiones, paréntesis
    let numero = telefono.replace(/[\s\-\(\)]/g, '');
    // Si no empieza con +, agregar código de país de Argentina (54)
    if (!numero.startsWith('+')) {
      // Si empieza con 0, quitarlo
      if (numero.startsWith('0')) {
        numero = numero.substring(1);
      }
      // Si no empieza con 54, agregarlo
      if (!numero.startsWith('54')) {
        numero = '54' + numero;
      }
      numero = '+' + numero;
    }
    return numero;
  };

  // Abrir modal para mostrar y editar mensaje antes de enviar
  const prepararEnvioIndividual = (cuota: CuotaDisponible) => {
    if (!cuota.telefono) {
      return;
    }

    const mensaje = generarMensaje(cuota);
    setMensajeParaEnviar(mensaje);
    setCuotaParaEnviar(cuota);
    setMostrarModalMensaje(true);
  };

  // Enviar mensaje después de confirmar en el modal
  const confirmarEnvio = () => {
    if (!cuotaParaEnviar) return;

    const telefonoFormateado = formatearTelefono(cuotaParaEnviar.telefono);
    const numeroSinPlus = telefonoFormateado.replace('+', '');
    const url = `https://wa.me/${numeroSinPlus}?text=${encodeURIComponent(mensajeParaEnviar)}`;
    
    window.open(url, '_blank');

    if (archivoPdfAdjunto.trim()) {
      setTimeout(() => {
        alert(`Recordá adjuntar el PDF en el chat de WhatsApp:\n${archivoPdfAdjunto.trim()}`);
      }, 300);
    }
    
    setMostrarModalMensaje(false);
    setCuotaParaEnviar(null);
    setMensajeParaEnviar('');
    setArchivoPdfAdjunto('');
  };

  // Enviar mensaje individual - ahora muestra modal primero
  const enviarMensaje = (cuota: CuotaDisponible) => {
    prepararEnvioIndividual(cuota);
  };

  const getCuotasConTelefono = (): CuotaDisponible[] => {
    return cuotasSeleccionadas.size > 0
      ? cuotasDisponibles.filter((c) => cuotasSeleccionadas.has(c.id) && c.telefono)
      : cuotasDisponibles.filter((c) => c.telefono);
  };

  // Enviar mensajes masivos - editar UNA VEZ la plantilla
  const enviarMasivo = () => {
    const cuotasConTelefono = getCuotasConTelefono();

    if (cuotasConTelefono.length === 0) {
      alert('No hay cuotas seleccionadas con teléfono registrado.');
      return;
    }

    setCuotasMasivas(cuotasConTelefono);
    setCuotaPreviewMasiva(cuotasConTelefono[0]);
    setPlantillaMasiva(mensajePersonalizado.trim() ? mensajePersonalizado : plantillaPorDefecto());
    setMostrarModalMasivo(true);
  };

  const confirmarEnvioMasivo = () => {
    if (cuotasMasivas.length === 0) return;

    // Usar la plantilla actual (mensajePersonalizado) como base del masivo
    setPlantillaMasiva(mensajePersonalizado);
    setMostrarModalMasivo(false);

    // Enviar todos usando la MISMA plantilla (sin volver a pedir edición por cada uno)
    cuotasMasivas.forEach((cuota, index) => {
      setTimeout(() => {
        const telefonoFormateado = formatearTelefono(cuota.telefono);
        const numeroSinPlus = telefonoFormateado.replace('+', '');
        const mensaje = aplicarPlantilla(plantillaMasiva, cuota);
        const url = `https://wa.me/${numeroSinPlus}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
      }, index * 1500);
    });

    // limpiar
    setCuotasMasivas([]);
    setCuotaPreviewMasiva(null);
   };

  const toggleSeleccion = (id: number) => {
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

  const seleccionarTodos = () => {
    setCuotasSeleccionadas(new Set(cuotasDisponibles.map((c) => c.id)));
  };

  const deseleccionarTodos = () => {
    setCuotasSeleccionadas(new Set());
  };

  const cuotasConTelefono = cuotasDisponibles.filter((c) => c.telefono);
  const cuotasSinTelefono = cuotasDisponibles.filter((c) => !c.telefono);

  return (
    <div className="enviar-whatsapp">
      <div className="enviar-whatsapp-header">
        <h1>Enviar Liquidaciones por WhatsApp</h1>
        {onVolver && (
          <button onClick={onVolver} className="btn-volver">
            ← Volver
          </button>
        )}
      </div>

      <div className="enviar-whatsapp-filtros">
        <label>
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(e) => setSoloPendientes(e.target.checked)}
          />
          Solo cuotas pendientes
        </label>
      </div>

      <div className="enviar-whatsapp-mensaje">
        <label>Plantillas guardadas</label>
        <div className="whatsapp-plantillas-row">
          <select
            value={plantillaSeleccionadaId}
            onChange={(e) => seleccionarPlantilla(e.target.value)}
            className="whatsapp-plantillas-select"
          >
            <option value="">(Sin selección)</option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <button type="button" className="whatsapp-plantillas-btn" onClick={guardarComoNueva}>
            Guardar como nueva
          </button>
          <button
            type="button"
            className="whatsapp-plantillas-btn"
            onClick={actualizarPlantilla}
            disabled={!plantillaSeleccionadaId}
          >
            Actualizar
          </button>
          <button
            type="button"
            className="whatsapp-plantillas-btn whatsapp-plantillas-btn-danger"
            onClick={eliminarPlantilla}
            disabled={!plantillaSeleccionadaId}
          >
            Eliminar
          </button>
        </div>

        <label htmlFor="mensaje-personalizado" style={{ marginTop: '0.75rem' }}>
          Mensaje / plantilla a usar en este envío
        </label>
        <textarea
          id="mensaje-personalizado"
          value={mensajePersonalizado}
          onChange={(e) => setMensajePersonalizado(e.target.value)}
          placeholder="Puedes usar {nombre}, {apellido}, {numeroSocio}, {categoria}, {mes}, {monto} como variables."
          rows={4}
        />
        <small>
          Variables disponibles: {'{nombre}'}, {'{apellido}'}, {'{numeroSocio}'}, {'{categoria}'}, {'{mes}'}, {'{monto}'}
        </small>
      </div>

      <div className="enviar-whatsapp-acciones">
        <button onClick={seleccionarTodos} className="btn-seleccionar">
          Seleccionar Todos
        </button>
        <button onClick={deseleccionarTodos} className="btn-deseleccionar">
          Deseleccionar Todos
        </button>
        <button
          onClick={enviarMasivo}
          className="btn-enviar-masivo"
          disabled={cuotasConTelefono.length === 0}
        >
          📱 Enviar Masivo ({cuotasSeleccionadas.size > 0 ? cuotasSeleccionadas.size : cuotasConTelefono.length} mensajes)
        </button>
      </div>

      {cuotasSinTelefono.length > 0 && (
        <div className="enviar-whatsapp-alerta">
          <p>⚠️ {cuotasSinTelefono.length} socio(s) no tienen teléfono registrado y no podrán recibir mensajes.</p>
        </div>
      )}

      <div className="enviar-whatsapp-info">
        <p>
          Total de cuotas: {cuotasDisponibles.length} | 
          Con teléfono: {cuotasConTelefono.length} | 
          Sin teléfono: {cuotasSinTelefono.length}
        </p>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-enviar-whatsapp">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={cuotasSeleccionadas.size === cuotasDisponibles.length && cuotasDisponibles.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      seleccionarTodos();
                    } else {
                      deseleccionarTodos();
                    }
                  }}
                />
              </th>
              <th>N° Socio</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Mes</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {cuotasDisponibles.length === 0 ? (
              <tr>
                <td colSpan={9} className="sin-datos">
                  No hay cuotas disponibles para enviar.
                </td>
              </tr>
            ) : (
              cuotasDisponibles.map((cuota) => (
                <tr key={cuota.id} className={!cuota.telefono ? 'sin-telefono' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={cuotasSeleccionadas.has(cuota.id)}
                      onChange={() => toggleSeleccion(cuota.id)}
                      disabled={!cuota.telefono}
                    />
                  </td>
                  <td>{cuota.numeroSocio}</td>
                  <td>{cuota.apellido}</td>
                  <td>{cuota.nombre}</td>
                  <td>{cuota.telefono || <span className="sin-telefono-text">Sin teléfono</span>}</td>
                  <td>{getNombreMes(cuota.mes)}</td>
                  <td>${cuota.monto.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${cuota.pagado ? 'badge-pagado' : 'badge-pendiente'}`}>
                      {cuota.pagado ? 'Pagado' : 'Pendiente'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => enviarMensaje(cuota)}
                      className="btn-enviar-individual"
                      disabled={!cuota.telefono}
                      title={!cuota.telefono ? 'Sin teléfono registrado' : 'Enviar mensaje individual'}
                    >
                      📱 Enviar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para mostrar y editar mensaje antes de enviar */}
      {mostrarModalMensaje && cuotaParaEnviar && (
        <div className="modal-overlay" onClick={() => setMostrarModalMensaje(false)}>
          <div className="modal-mensaje-whatsapp" onClick={(e) => e.stopPropagation()}>
            <div className="modal-mensaje-header">
              <h2>Vista previa del mensaje WhatsApp</h2>
              <button 
                className="btn-cerrar-modal" 
                onClick={() => setMostrarModalMensaje(false)}
                title="Cerrar"
              >
                ×
              </button>
            </div>
            
            <div className="modal-mensaje-info">
              <p><strong>Destinatario:</strong> {cuotaParaEnviar.nombre} {cuotaParaEnviar.apellido}</p>
              <p><strong>Teléfono:</strong> {cuotaParaEnviar.telefono}</p>
              <p><strong>Mes:</strong> {getNombreMes(cuotaParaEnviar.mes)}</p>
            </div>

            <div className="modal-mensaje-editor">
              <label htmlFor="archivo-pdf-adjunto">Archivo PDF a adjuntar (recordatorio, opcional)</label>
              <input
                id="archivo-pdf-adjunto"
                type="text"
                value={archivoPdfAdjunto}
                onChange={(e) => setArchivoPdfAdjunto(e.target.value)}
                placeholder="Ej: Liquidación Juan Pérez.pdf"
                className="input-archivo-adjunto"
              />
              <label htmlFor="mensaje-editable">Mensaje a enviar:</label>
              <textarea
                id="mensaje-editable"
                value={mensajeParaEnviar}
                onChange={(e) => setMensajeParaEnviar(e.target.value)}
                rows={12}
                className="textarea-mensaje-editable"
              />
            </div>

            <div className="modal-mensaje-acciones">
              <button
                className="btn-cancelar-envio"
                onClick={() => {
                  setMostrarModalMensaje(false);
                  setCuotaParaEnviar(null);
                  setMensajeParaEnviar('');
                  setArchivoPdfAdjunto('');
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-confirmar-envio"
                onClick={confirmarEnvio}
              >
                📱 Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal masivo: editar una sola vez la plantilla */}
      {mostrarModalMasivo && cuotaPreviewMasiva && (
        <div className="modal-overlay" onClick={() => setMostrarModalMasivo(false)}>
          <div className="modal-mensaje-whatsapp" onClick={(e) => e.stopPropagation()}>
            <div className="modal-mensaje-header">
              <h2>Envío masivo - editar mensaje (una sola vez)</h2>
              <button
                className="btn-cerrar-modal"
                onClick={() => setMostrarModalMasivo(false)}
                title="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="modal-mensaje-info">
              <p>
                <strong>Se enviará a:</strong> {cuotasMasivas.length} socio(s)
              </p>
              <p className="modo-masivo-info">
                Podés editar el texto UNA sola vez. Se aplicará a todos los envíos (reemplazando variables).
              </p>
              <p>
                <strong>Vista previa (primer socio):</strong> {cuotaPreviewMasiva.nombre} {cuotaPreviewMasiva.apellido}
              </p>
            </div>

            <div className="modal-mensaje-editor">
              <label htmlFor="plantilla-masiva">Plantilla del mensaje:</label>
              <textarea
                id="plantilla-masiva"
                value={plantillaMasiva}
                onChange={(e) => setPlantillaMasiva(e.target.value)}
                rows={10}
                className="textarea-mensaje-editable"
              />
              <small>
                Variables: {'{nombre}'}, {'{apellido}'}, {'{numeroSocio}'}, {'{categoria}'}, {'{mes}'}, {'{monto}'}
              </small>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontWeight: 600, color: '#2d3748' }}>Vista previa:</label>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                  {aplicarPlantilla(plantillaMasiva, cuotaPreviewMasiva)}
                </pre>
              </div>
            </div>

            <div className="modal-mensaje-acciones">
              <button
                className="btn-cancelar-masivo"
                onClick={() => setMostrarModalMasivo(false)}
              >
                Cancelar
              </button>
              <button className="btn-confirmar-envio" onClick={confirmarEnvioMasivo}>
                📱 Iniciar envío masivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

