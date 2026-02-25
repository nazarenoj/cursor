import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocios } from '../hooks/useSocios';
import { useCategorias } from '../hooks/useCategorias';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { FormularioSocio } from './FormularioSocio';
import { FiltrosSocios } from './FiltrosSocios';
import { TablaSocios } from './TablaSocios';
import { ImprimirSocios } from './ImprimirSocios';
import { LiquidacionesSocio } from './LiquidacionesSocio';
import { exportarSociosPdf, exportarSociosExcel } from '../utils/exportSociosPdf';
import { apiService } from '../services/api';
import type { Socio, FiltrosSocio, WhatsAppTemplate } from '../types';
import './ListaSocios.css';

export const ListaSocios = () => {
  const {
    socios,
    agregarSocio,
    modificarSocio,
    darBajaSocio,
    darAltaSocio,
    borrarSocio,
    listarSocios,
    obtenerProximoNumeroSocio,
    loading,
    error,
  } = useSocios();
  const { categorias } = useCategorias();
  const { nombreClub } = useClubConfig();
  const { listarLiquidaciones, liquidacionesMensuales } = useLiquidaciones();
  const { tienePermiso } = usePermissions();
  const navigate = useNavigate();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [socioEditando, setSocioEditando] = useState<Socio | undefined>(undefined);
  const [filtros, setFiltros] = useState<FiltrosSocio>({});
  const [mostrarImpresion, setMostrarImpresion] = useState(false);
  const [socioLiquidaciones, setSocioLiquidaciones] = useState<Socio | undefined>(undefined);
  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);
  const [mostrarModalMensaje, setMostrarModalMensaje] = useState(false);
  const [mensajeParaEnviar, setMensajeParaEnviar] = useState('');
  const [socioParaEnviar, setSocioParaEnviar] = useState<Socio | null>(null);
  const [archivoPdfAdjunto, setArchivoPdfAdjunto] = useState('');

  // Plantillas WhatsApp (BD)
  const STORAGE_KEY_SELECTED_TEMPLATE = 'whatsapp_socios_template_selected_v1';
  const [plantillas, setPlantillas] = useState<WhatsAppTemplate[]>([]);
  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState<number | ''>('');

  const cargarPlantillas = async () => {
    const list = await apiService.getWhatsAppTemplates();
    setPlantillas(list);
    return list;
  };

  useEffect(() => {
    (async () => {
      try {
        const list = await cargarPlantillas();
        const selectedRaw = localStorage.getItem(STORAGE_KEY_SELECTED_TEMPLATE);
        const selectedId = selectedRaw ? Number(selectedRaw) : NaN;
        const selected =
          Number.isFinite(selectedId) && list.some((t) => t.id === selectedId)
            ? selectedId
            : list[0]?.id;

        if (selected) {
          setPlantillaSeleccionadaId(selected);
          localStorage.setItem(STORAGE_KEY_SELECTED_TEMPLATE, String(selected));
        } else {
          setPlantillaSeleccionadaId('');
        }
      } catch {
        setPlantillas([]);
        setPlantillaSeleccionadaId('');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seleccionarPlantilla = (idRaw: string) => {
    const id = idRaw ? Number(idRaw) : NaN;
    if (!Number.isFinite(id)) {
      setPlantillaSeleccionadaId('');
      return;
    }
    setPlantillaSeleccionadaId(id);
    localStorage.setItem(STORAGE_KEY_SELECTED_TEMPLATE, String(id));
    const t = plantillas.find((p) => p.id === id);
    if (t) setMensajeParaEnviar(t.texto);
  };

  const guardarComoNueva = async () => {
    const nombre = window.prompt('Nombre para la nueva plantilla:', `Plantilla ${plantillas.length + 1}`);
    if (!nombre) return;
    try {
      const creada = await apiService.crearWhatsAppTemplate({ nombre: nombre.trim(), texto: mensajeParaEnviar });
      const list = await cargarPlantillas();
      setPlantillaSeleccionadaId(creada.id);
      localStorage.setItem(STORAGE_KEY_SELECTED_TEMPLATE, String(creada.id));
      // set texto por si el backend normaliza
      setMensajeParaEnviar(list.find((p) => p.id === creada.id)?.texto || mensajeParaEnviar);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo guardar la plantilla');
    }
  };

  const actualizarPlantilla = async () => {
    if (!plantillaSeleccionadaId) {
      alert('Seleccioná una plantilla para actualizar.');
      return;
    }
    const t = plantillas.find((p) => p.id === plantillaSeleccionadaId);
    if (!t) return;
    try {
      await apiService.actualizarWhatsAppTemplate(plantillaSeleccionadaId, { nombre: t.nombre, texto: mensajeParaEnviar });
      await cargarPlantillas();
      alert('Plantilla actualizada.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo actualizar la plantilla');
    }
  };

  const eliminarPlantilla = async () => {
    if (!plantillaSeleccionadaId) return;
    const t = plantillas.find((p) => p.id === plantillaSeleccionadaId);
    if (!t) return;
    if (!window.confirm(`¿Eliminar la plantilla "${t.nombre}"?`)) return;
    try {
      await apiService.eliminarWhatsAppTemplate(plantillaSeleccionadaId);
      const list = await cargarPlantillas();
      const nextSelected = list[0]?.id;
      if (nextSelected) {
        setPlantillaSeleccionadaId(nextSelected);
        localStorage.setItem(STORAGE_KEY_SELECTED_TEMPLATE, String(nextSelected));
        setMensajeParaEnviar(list.find((p) => p.id === nextSelected)?.texto || '');
      } else {
        setPlantillaSeleccionadaId('');
        localStorage.removeItem(STORAGE_KEY_SELECTED_TEMPLATE);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar la plantilla');
    }
  };

  const sociosFiltrados = listarSocios(filtros);

  // Aplicar ordenamiento (excluyendo la columna 'estado' que se usa para filtrar)
  const sociosOrdenados = [...sociosFiltrados].sort((a, b) => {
    if (!ordenColumna || ordenColumna.columna === 'estado') return 0;

    const { columna, direccion } = ordenColumna;
    let comparacion = 0;

    switch (columna) {
      case 'numeroSocio':
        comparacion = a.numeroSocio - b.numeroSocio;
        break;
      case 'apellido':
        comparacion = a.apellido.localeCompare(b.apellido);
        break;
      case 'nombre':
        comparacion = a.nombre.localeCompare(b.nombre);
        break;
      case 'dni':
        comparacion = (a.dni || '').localeCompare(b.dni || '');
        break;
      case 'telefono':
        comparacion = (a.telefono || '').localeCompare(b.telefono || '');
        break;
      case 'email':
        comparacion = (a.email || '').localeCompare(b.email || '');
        break;
      case 'categoria':
        const categoriaA = categorias.find(c => c.id === a.categoriaId)?.nombre || '';
        const categoriaB = categorias.find(c => c.id === b.categoriaId)?.nombre || '';
        comparacion = categoriaA.localeCompare(categoriaB);
        break;
      default:
        return 0;
    }

    return direccion === 'asc' ? comparacion : -comparacion;
  });

  const handleOrdenar = (columna: string) => {
    if (columna === 'estado') {
      // Para la columna Estado, filtrar cíclicamente en lugar de ordenar
      handleFiltrarPorEstado();
      return;
    }

    if (ordenColumna && ordenColumna.columna === columna) {
      // Si ya está ordenada, cambiar dirección
      setOrdenColumna({
        columna,
        direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc',
      });
    } else {
      // Nueva columna, ordenar ascendente por defecto
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const handleFiltrarPorEstado = () => {
    // Ciclo: activo -> inactivo -> todos -> activo...
    const estadoActual = filtros.activo;
    
    if (estadoActual === undefined) {
      // Todos -> Activos
      setFiltros(prev => ({ ...prev, activo: true }));
    } else if (estadoActual === true) {
      // Activos -> Inactivos
      setFiltros(prev => ({ ...prev, activo: false }));
    } else {
      // Inactivos -> Todos
      setFiltros(prev => {
        const nuevosFiltros = { ...prev };
        delete nuevosFiltros.activo;
        return nuevosFiltros;
      });
    }
  };

  const handleAgregar = () => {
    setSocioEditando(undefined);
    setMostrarFormulario(true);
  };

  const handleModificar = (socio: Socio) => {
    if (socio.fechaBaja) {
      alert('No se puede modificar un socio inactivo. Primero debe darlo de alta.');
      return;
    }
    setSocioEditando(socio);
    setMostrarFormulario(true);
  };

  const handleDarBaja = async (socio: Socio) => {
    if (socio.fechaBaja) {
      alert('Este socio ya está dado de baja.');
      return;
    }
    if (window.confirm(`¿Está seguro que desea dar de baja al socio ${socio.apellido}, ${socio.nombre}? Se establecerá la fecha de baja como la fecha actual.`)) {
      try {
        await darBajaSocio(socio.id);
      } catch (error) {
        const mensaje =
          error instanceof Error ? error.message : 'Ocurrió un error al dar de baja al socio.';
        alert(mensaje);
      }
    }
  };

  const handleDarAlta = async (socio: Socio) => {
    if (!socio.fechaBaja) {
      alert('Este socio ya está activo.');
      return;
    }
    if (window.confirm(`¿Está seguro que desea dar de alta al socio ${socio.apellido}, ${socio.nombre}? Se eliminará la fecha de baja.`)) {
      try {
        await darAltaSocio(socio.id);
      } catch (error) {
        const mensaje =
          error instanceof Error ? error.message : 'Ocurrió un error al dar de alta al socio.';
        alert(mensaje);
      }
    }
  };

  const handleBorrar = async (id: number) => {
    if (window.confirm('¿Está seguro que desea eliminar este socio?')) {
      try {
        await borrarSocio(id);
      } catch (error) {
        const mensaje =
          error instanceof Error ? error.message : 'Ocurrió un error al borrar el socio.';
        alert(mensaje);
      }
    }
  };

  const handleSubmit = async (socioData: Omit<Socio, 'id'>, foto?: File | null) => {
    try {
      if (socioEditando) {
        await modificarSocio(socioEditando.id, socioData, foto || undefined);
      } else {
        await agregarSocio(socioData, foto || undefined);
      }
      setMostrarFormulario(false);
      setSocioEditando(undefined);
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Ocurrió un error al guardar el socio.';
      alert(mensaje);
    }
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setSocioEditando(undefined);
  };

  const handleImprimir = () => {
    setMostrarImpresion(true);
  };

  const handleVerLiquidaciones = (socio: Socio) => {
    setSocioLiquidaciones(socio);
  };

  const handleVolverLiquidaciones = () => {
    setSocioLiquidaciones(undefined);
  };

  const handleRegistrarPago = (socio: Socio) => {
    navigate(`/pagos?socioId=${socio.id}`);
  };

  const handleExportPdf = async () => {
    try {
      await exportarSociosPdf(sociosFiltrados, categorias, nombreClub);
    } catch (error) {
      console.error(error);
      alert('No se pudo generar el PDF. Intentá nuevamente.');
    }
  };

  const handleExportExcel = (visibleColumnIds: string[]) => {
    try {
      exportarSociosExcel(sociosFiltrados, categorias, visibleColumnIds);
    } catch (error) {
      console.error(error);
      alert('No se pudo generar el Excel. Intentá nuevamente.');
    }
  };

  const generarMensajeLiquidaciones = (socio: Socio): string => {
    // Obtener liquidaciones del socio
    const cuotas = listarLiquidaciones().filter(l => l.socioId === socio.id);
    
    // Agregar información de mes y fecha de liquidación
    const liquidaciones = cuotas.map(cuota => {
      const liquidacionMensual = liquidacionesMensuales.find(lm => lm.id === cuota.liquidacionMensualId);
      return {
        ...cuota,
        mes: liquidacionMensual?.mes || '',
        fechaLiquidacion: liquidacionMensual?.fechaLiquidacion || '',
      };
    }).sort((a, b) => b.mes.localeCompare(a.mes));

    // Separar liquidaciones pendientes y pagadas
    const pendientes = liquidaciones.filter(l => !l.pagado);
    const pagadas = liquidaciones.filter(l => l.pagado).slice(-6); // Últimos 6 meses

    // Construir mensaje
    let mensaje = `*${nombreClub}*\n\n`;
    mensaje += `Hola ${socio.nombre} ${socio.apellido},\n\n`;
    mensaje += `Te enviamos el detalle de tus liquidaciones:\n\n`;

    if (pendientes.length > 0) {
      mensaje += `*📋 Liquidaciones Pendientes:*\n`;
      pendientes.forEach(l => {
        const [año, mes] = l.mes.split('-');
        const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
        const nombreMes = fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
        mensaje += `• ${nombreMes}: $${l.monto.toFixed(2)}\n`;
      });
      mensaje += `\n*Total Pendiente: $${pendientes.reduce((sum, l) => sum + l.monto, 0).toFixed(2)}*\n\n`;
    }

    if (pagadas.length > 0) {
      mensaje += `*✅ Liquidaciones Pagadas (últimos 6 meses):*\n`;
      pagadas.forEach(l => {
        const [año, mes] = l.mes.split('-');
        const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
        const nombreMes = fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
        mensaje += `• ${nombreMes}: $${l.monto.toFixed(2)}`;
        if (l.fechaPago) {
          const fechaPago = new Date(l.fechaPago);
          mensaje += ` (Pagado: ${fechaPago.toLocaleDateString('es-AR')})`;
        }
        mensaje += `\n`;
      });
      mensaje += `\n`;
    }

    if (pendientes.length === 0 && pagadas.length === 0) {
      mensaje += `No tienes liquidaciones registradas.\n\n`;
    }

    if (pendientes.length > 0) {
      mensaje += `Por favor, acércate a la secretaría para regularizar tus pagos pendientes.\n\n`;
    }

    mensaje += `Saludos cordiales,\n${nombreClub}`;

    return mensaje;
  };

  const handleEnviarLiquidacionesWhatsApp = (socio: Socio) => {
    if (!socio.telefono) {
      alert('Este socio no tiene teléfono registrado.');
      return;
    }

    const mensaje =
      plantillaSeleccionadaId
        ? (plantillas.find((p) => p.id === plantillaSeleccionadaId)?.texto ?? generarMensajeLiquidaciones(socio))
        : generarMensajeLiquidaciones(socio);
    setMensajeParaEnviar(mensaje);
    setSocioParaEnviar(socio);
    setMostrarModalMensaje(true);
  };

  const confirmarEnvioWhatsApp = () => {
    if (!socioParaEnviar) return;

    // Formatear teléfono para WhatsApp (solo dígitos, con prefijo 54)
    const telefonoLimpio = socioParaEnviar.telefono.replace(/\D/g, '');
    const telefonoWhatsApp = telefonoLimpio.startsWith('54') ? telefonoLimpio : `54${telefonoLimpio}`;

    // Abrir WhatsApp
    const url = `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensajeParaEnviar)}`;
    window.open(url, '_blank');

    if (archivoPdfAdjunto.trim()) {
      setTimeout(() => {
        alert(`Recordá adjuntar el PDF en el chat de WhatsApp:\n${archivoPdfAdjunto.trim()}`);
      }, 300);
    }
    setMostrarModalMensaje(false);
    setSocioParaEnviar(null);
    setMensajeParaEnviar('');
    setArchivoPdfAdjunto('');
  };

  if (socioLiquidaciones) {
    return (
      <div className="lista-socios">
        <LiquidacionesSocio
          socio={socioLiquidaciones}
          onVolver={handleVolverLiquidaciones}
        />
      </div>
    );
  }

  if (mostrarImpresion) {
    return (
      <ImprimirSocios
        socios={sociosFiltrados}
        categorias={categorias}
        filtros={filtros}
        onVolver={() => setMostrarImpresion(false)}
      />
    );
  }

  if (loading) {
    return (
      <div className="lista-socios">
        <p>Cargando socios...</p>
      </div>
    );
  }

  if (error && socios.length === 0 && !mostrarFormulario && !mostrarImpresion) {
    return (
      <div className="lista-socios">
        <p className="mensaje-error">{error}</p>
      </div>
    );
  }

  if (mostrarFormulario) {
    return (
      <div className="lista-socios">
        <FormularioSocio
          socio={socioEditando}
          numeroSocioSugerido={
            socioEditando ? socioEditando.numeroSocio : obtenerProximoNumeroSocio()
          }
          onSubmit={handleSubmit}
          onCancel={handleCancelar}
        />
      </div>
    );
  }

  return (
    <div className="lista-socios">
      <div className="lista-header">
        <h1>Gestión de Socios</h1>
        <span className="lista-total">Total de socios: {sociosOrdenados.length}</span>
      </div>

      <div className="lista-socios-card">
        <FiltrosSocios
          filtros={filtros}
          categorias={categorias}
          onChange={setFiltros}
        />

        <TablaSocios
        socios={sociosOrdenados}
        categorias={categorias}
        onModificar={handleModificar}
        onDarBaja={handleDarBaja}
        onDarAlta={handleDarAlta}
        onBorrar={handleBorrar}
        onVerLiquidaciones={handleVerLiquidaciones}
        onRegistrarPago={handleRegistrarPago}
        onEnviarLiquidacionesWhatsApp={handleEnviarLiquidacionesWhatsApp}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onAgregar={tienePermiso('socios.crear') ? handleAgregar : undefined}
        ordenColumna={ordenColumna}
        onOrdenar={handleOrdenar}
        filtroEstado={filtros.activo}
      />

      </div>

      {/* Modal para mostrar y editar mensaje antes de enviar */}
      {mostrarModalMensaje && socioParaEnviar && (
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
              <p><strong>Destinatario:</strong> {socioParaEnviar.nombre} {socioParaEnviar.apellido}</p>
              <p><strong>Teléfono:</strong> {socioParaEnviar.telefono}</p>
              <p><strong>N° Socio:</strong> {socioParaEnviar.numeroSocio}</p>
            </div>

            <div className="modal-mensaje-editor">
              <label htmlFor="archivo-pdf-adjunto-socio">Archivo PDF a adjuntar (recordatorio, opcional)</label>
              <input
                id="archivo-pdf-adjunto-socio"
                type="text"
                value={archivoPdfAdjunto}
                onChange={(e) => setArchivoPdfAdjunto(e.target.value)}
                placeholder="Ej: Resumen Juan Pérez.pdf"
                className="input-archivo-adjunto"
              />
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

              <label htmlFor="mensaje-editable-socio">Mensaje a enviar:</label>
              <textarea
                id="mensaje-editable-socio"
                value={mensajeParaEnviar}
                onChange={(e) => setMensajeParaEnviar(e.target.value)}
                rows={15}
                className="textarea-mensaje-editable"
              />
            </div>

            <div className="modal-mensaje-acciones">
              <button
                className="btn-cancelar-envio"
                onClick={() => {
                  setMostrarModalMensaje(false);
                  setSocioParaEnviar(null);
                  setMensajeParaEnviar('');
                  setArchivoPdfAdjunto('');
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-confirmar-envio"
                onClick={confirmarEnvioWhatsApp}
              >
                📱 Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


