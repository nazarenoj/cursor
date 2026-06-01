import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocios } from '../hooks/useSocios';
import { useCategorias } from '../hooks/useCategorias';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { useFilterPreferences } from '../hooks/useFilterPreferences';
import { FormularioSocio } from './FormularioSocio';
import { FiltrosSocios, SOCIOS_FILTROS, SOCIOS_FILTROS_DEFAULT } from './FiltrosSocios';
import { SelectorFiltros } from './SelectorFiltros';
import { TablaSocios } from './TablaSocios';
import { ImprimirSocios } from './ImprimirSocios';
import { LiquidacionesSocio } from './LiquidacionesSocio';
import { apiService } from '../services/api';
import type { Socio, FiltrosSocio, WhatsAppTemplate, WhatsAppBaileysBatchItem } from '../types';
import { fileToBase64 } from '../utils/whatsappEnvio';
import { columnaSociosASort, sortDesdeOrdenColumna } from '../utils/sociosOrdenListado';
import { useWhatsAppBaileysStatus } from '../hooks/useWhatsAppBaileysStatus';
import { WhatsAppServicioEstadoUI, WhatsAppServicioQrEnModal } from './WhatsAppServicioEstadoUI';
import './ListaSocios.css';

const EnviarWhatsApp = lazy(() =>
  import('./EnviarWhatsApp').then((m) => ({ default: m.EnviarWhatsApp })),
);

export const ListaSocios = () => {
  const {
    socios,
    meta,
    loadSocios,
    agregarSocio,
    modificarSocio,
    darBajaSocio,
    darAltaSocio,
    borrarSocio,
    obtenerProximoNumeroSocio,
    loading,
    isFetching,
    error,
  } = useSocios();
  const { categorias } = useCategorias();
  const { nombreClub, whatsappUsarServicio } = useClubConfig();
  const modoServicioBaileys = whatsappUsarServicio !== false;
  const { tienePermiso } = usePermissions();
  const { visibleFilters, setVisibleFilters, toggleFilter } = useFilterPreferences(
    'socios',
    SOCIOS_FILTROS_DEFAULT,
  );
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
  const [pdfBaileysAdjunto, setPdfBaileysAdjunto] = useState<File | null>(null);
  const [enviandoBaileys, setEnviandoBaileys] = useState(false);
  const [sociosSeleccionados, setSociosSeleccionados] = useState<Set<number>>(new Set());
  const [sociosParaPantalla, setSociosParaPantalla] = useState<Socio[] | null>(null);
  const [tipoInicialPantalla, setTipoInicialPantalla] = useState<'liquidaciones' | 'generico'>('generico');

  // Plantillas WhatsApp (BD)
  const STORAGE_KEY_SELECTED_TEMPLATE = 'whatsapp_socios_template_selected_v1';
  const [plantillas, setPlantillas] = useState<WhatsAppTemplate[]>([]);
  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState<number | ''>('');

  const baileysPollingModal = mostrarModalMensaje && !!socioParaEnviar && modoServicioBaileys;
  const { status: baileysStatusModal, refrescar: refrescarBaileysModal } =
    useWhatsAppBaileysStatus(baileysPollingModal);

  const cargarPlantillas = async () => {
    const list = await apiService.getWhatsAppTemplates();
    setPlantillas(list);
    return list;
  };

  useEffect(() => {
    loadSocios(filtros, 1);
  }, [loadSocios, JSON.stringify(filtros)]);

  useEffect(() => {
    if (mostrarModalMensaje && socioParaEnviar) {
      setPdfBaileysAdjunto(null);
    }
  }, [mostrarModalMensaje, socioParaEnviar?.id]);

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

  const handleOrdenar = (columna: string) => {
    if (columna === 'estado') {
      // Para la columna Estado, filtrar cíclicamente en lugar de ordenar
      handleFiltrarPorEstado();
      return;
    }

    const next: { columna: string; direccion: 'asc' | 'desc' } =
      ordenColumna && ordenColumna.columna === columna
        ? { columna, direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc' }
        : { columna, direccion: 'asc' };
    setOrdenColumna(next);
    const sortBy = columnaSociosASort(next.columna);
    if (sortBy) {
      loadSocios(filtros, 1, { sortBy, sortDir: next.direccion });
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

  const handleVerLiquidaciones = (socio: Socio) => {
    setSocioLiquidaciones(socio);
  };

  const handleVolverLiquidaciones = () => {
    setSocioLiquidaciones(undefined);
  };

  const handleRegistrarPago = (socio: Socio) => {
    navigate(`/pagos?socioId=${socio.id}`);
  };

  const handleExportPdf = async (visibleColumnIds: string[]) => {
    try {
      const { exportarSociosPdf } = await import('../utils/exportSociosPdf');
      const sort = sortDesdeOrdenColumna(ordenColumna);
      const data = await apiService.getSociosTodasLasPaginas(filtros, sort);
      await exportarSociosPdf(data, categorias, nombreClub, visibleColumnIds);
    } catch (error) {
      console.error(error);
      alert('No se pudo generar el PDF. Intentá nuevamente.');
    }
  };

  const handleExportExcel = async (visibleColumnIds: string[]) => {
    try {
      const { exportarSociosExcel } = await import('../utils/exportSociosPdf');
      const sort = sortDesdeOrdenColumna(ordenColumna);
      const data = await apiService.getSociosTodasLasPaginas(filtros, sort);
      exportarSociosExcel(data, categorias, visibleColumnIds);
    } catch (error) {
      console.error(error);
      alert('No se pudo generar el Excel. Intentá nuevamente.');
    }
  };

  const handleEnviarLiquidacionesWhatsApp = (socio: Socio) => {
    setTipoInicialPantalla('liquidaciones');
    setSociosParaPantalla([socio]);
  };

  const aplicarVariablesSocio = (texto: string, socio: Socio, liquidacion?: { mes: string; monto: number }): string => {
    const cat = categorias.find((c) => c.id === socio.categoriaId);
    const [año, mes] = (liquidacion?.mes || '').split('-');
    const nombreMes = año && mes
      ? new Date(parseInt(año), parseInt(mes) - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })
      : '';
    return texto
      .replace(/{nombre}/g, socio.nombre || '')
      .replace(/{apellido}/g, socio.apellido || '')
      .replace(/{numeroSocio}/g, String(socio.numeroSocio))
      .replace(/{categoria}/g, cat?.nombre || '')
      .replace(/{mes}/g, nombreMes)
      .replace(/{monto}/g, liquidacion ? liquidacion.monto.toFixed(2) : '0.00');
  };

  const cerrarModalWhatsApp = () => {
    setMostrarModalMensaje(false);
    setSocioParaEnviar(null);
    setMensajeParaEnviar('');
    setArchivoPdfAdjunto('');
    setPdfBaileysAdjunto(null);
  };

  const confirmarEnvioWhatsApp = async () => {
    if (!socioParaEnviar?.telefono) return;

    const mensajeFinal = aplicarVariablesSocio(mensajeParaEnviar, socioParaEnviar);

    if (modoServicioBaileys) {
      setEnviandoBaileys(true);
      try {
        let status;
        try {
          status = await apiService.getWhatsAppBaileysStatus();
        } catch {
          alert('No se pudo consultar el servicio WhatsApp. ¿Está el backend y whatsapp-service en ejecución?');
          return;
        }
        if (!status.reachable) {
          alert(
            status.serviceError ||
              'No se alcanza el servicio Baileys. Revisá WHATSAPP_SERVICE_URL y ejecutá npm run dev:whatsapp.',
          );
          return;
        }
        if (!status.connected) {
          alert(
            'WhatsApp no está conectado. Escaneá el código QR que aparece abajo en este modal (o pulsá «Actualizar estado / QR»).',
          );
          return;
        }
        let documentBase64: string | undefined;
        let fileName: string | undefined;
        if (pdfBaileysAdjunto) {
          documentBase64 = await fileToBase64(pdfBaileysAdjunto);
          fileName = pdfBaileysAdjunto.name || 'adjunto.pdf';
        }
        const items: WhatsAppBaileysBatchItem[] = [
          {
            phone: socioParaEnviar.telefono,
            caption: mensajeFinal,
            documentBase64,
            fileName,
          },
        ];
        const data = await apiService.sendWhatsAppBaileysBatch(items);
        const failed = data.results.filter((r) => !r.success);
        if (failed.length) {
          alert(failed.map((f) => f.error || '?').join('; '));
        } else {
          alert('Mensaje encolado en el servicio WhatsApp (Baileys).');
        }
        cerrarModalWhatsApp();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error al enviar');
      } finally {
        setEnviandoBaileys(false);
      }
      return;
    }

    const telefonoLimpio = socioParaEnviar.telefono.replace(/\D/g, '');
    const telefonoWhatsApp = telefonoLimpio.startsWith('54') ? telefonoLimpio : `54${telefonoLimpio}`;
    const url = `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensajeFinal)}`;
    window.open(url, '_blank');

    if (archivoPdfAdjunto.trim()) {
      setTimeout(() => {
        alert(`Recordá adjuntar el PDF en el chat de WhatsApp:\n${archivoPdfAdjunto.trim()}`);
      }, 300);
    }
    cerrarModalWhatsApp();
  };

  if (sociosParaPantalla) {
    return (
      <Suspense fallback={<div className="lista-socios"><p>Cargando mensajes...</p></div>}>
        <EnviarWhatsApp
          sociosPreseleccionados={sociosParaPantalla}
          sociosFijos
          tipoInicial={tipoInicialPantalla}
          onVolver={() => setSociosParaPantalla(null)}
        />
      </Suspense>
    );
  }

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
        socios={socios}
        categorias={categorias}
        filtros={filtros}
        onVolver={() => setMostrarImpresion(false)}
      />
    );
  }

  if (loading && socios.length === 0) {
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
      <div className="lista-socios lista-socios-formulario">
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
        <span className="lista-total">Total de socios: {meta.total}</span>
        {isFetching && <span className="lista-cargando-inline">Actualizando...</span>}
        {meta.pages > 1 && (
          <div className="lista-paginacion">
            <span>Página {meta.currentPage} de {meta.pages}</span>
            <button
              type="button"
              className="btn-pag"
              disabled={meta.currentPage <= 1}
              onClick={() => loadSocios(filtros, meta.currentPage - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn-pag"
              disabled={meta.currentPage >= meta.pages}
              onClick={() => loadSocios(filtros, meta.currentPage + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      <div className="lista-socios-card">
        <TablaSocios
          filtros={
            <FiltrosSocios
              filtros={filtros}
              categorias={categorias}
              onChange={setFiltros}
              visibleFilters={visibleFilters}
              toggleFilter={toggleFilter}
            />
          }
          selectorFiltros={
            <SelectorFiltros
              filtros={SOCIOS_FILTROS}
              visibleIds={visibleFilters}
              onToggle={toggleFilter}
              onRestaurar={() => setVisibleFilters(SOCIOS_FILTROS_DEFAULT)}
              titulo="Filtros visibles"
            />
          }
        socios={socios}
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
        seleccionados={sociosSeleccionados}
        onToggleSeleccion={(id) => {
          setSociosSeleccionados((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
        onSeleccionarTodos={() => setSociosSeleccionados(new Set(socios.map((s) => s.id)))}
        onDeseleccionarTodos={() => setSociosSeleccionados(new Set())}
        onEnvioMasivo={tienePermiso('socios.whatsapp') ? () => {
          const seleccionados = socios.filter((s) => sociosSeleccionados.has(s.id));
          setTipoInicialPantalla('generico');
          setSociosParaPantalla(seleccionados.length > 0 ? seleccionados : socios);
        } : undefined}
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
              <WhatsAppServicioEstadoUI
                modoServicioBaileys={modoServicioBaileys}
                status={baileysStatusModal}
                onRefresh={refrescarBaileysModal}
                variant="compact"
              />
              {modoServicioBaileys && (
                <label className="lista-socios-baileys-file">
                  PDF opcional
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfBaileysAdjunto(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              {!modoServicioBaileys && (
                <>
                  <label htmlFor="archivo-pdf-adjunto-socio">Archivo PDF a adjuntar (recordatorio, opcional)</label>
                  <input
                    id="archivo-pdf-adjunto-socio"
                    type="text"
                    value={archivoPdfAdjunto}
                    onChange={(e) => setArchivoPdfAdjunto(e.target.value)}
                    placeholder="Ej: Resumen Juan Pérez.pdf"
                    className="input-archivo-adjunto"
                  />
                </>
              )}
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

              <div className="variables-ayuda-socios">
                <strong>Variables: </strong>
                <code>{'{nombre}'}</code>, <code>{'{apellido}'}</code>, <code>{'{numeroSocio}'}</code>, <code>{'{categoria}'}</code>, <code>{'{mes}'}</code>, <code>{'{monto}'}</code>
              </div>
              <label htmlFor="mensaje-editable-socio">Mensaje a enviar (con variables se reemplazan al enviar):</label>
              <textarea
                id="mensaje-editable-socio"
                value={mensajeParaEnviar}
                onChange={(e) => setMensajeParaEnviar(e.target.value)}
                rows={15}
                className="textarea-mensaje-editable"
              />
            </div>

            <WhatsAppServicioQrEnModal
              modoServicioBaileys={modoServicioBaileys}
              status={baileysStatusModal}
              onRefresh={refrescarBaileysModal}
            />

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
                onClick={() => void confirmarEnvioWhatsApp()}
                disabled={enviandoBaileys}
              >
                {enviandoBaileys
                  ? 'Enviando…'
                  : modoServicioBaileys
                    ? '📱 Enviar (servicio)'
                    : '📱 Enviar por WhatsApp Web'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


