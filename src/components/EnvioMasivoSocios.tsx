import { useState, useEffect } from 'react';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { apiService } from '../services/api';
import type { Socio, Categoria, WhatsAppTemplate, WhatsAppBaileysBatchItem } from '../types';
import { fileToBase64 } from '../utils/whatsappEnvio';
import { useWhatsAppBaileysStatus } from '../hooks/useWhatsAppBaileysStatus';
import { WhatsAppServicioEstadoUI, WhatsAppServicioQrEnModal } from './WhatsAppServicioEstadoUI';
import './EnvioMasivoSocios.css';

/** Tipos de mensaje disponibles en el modal (socios seleccionados) */
type TipoMensajeSocios = 'generico' | 'cumpleaños' | 'al_dia' | 'datos_faltantes';

const CAMPOS_DATOS_FALTANTES: { key: keyof Socio; label: string }[] = [
  { key: 'telefono', label: 'Teléfono' },
  { key: 'email', label: 'Email' },
  { key: 'dni', label: 'DNI' },
  { key: 'calle', label: 'Calle' },
  { key: 'numeroCasa', label: 'Número' },
  { key: 'localidad', label: 'Localidad' },
  { key: 'codigoPostal', label: 'Código postal' },
];

const VARIABLES_SOCIOS = [
  { id: 'nombre', desc: 'Nombre del socio' },
  { id: 'apellido', desc: 'Apellido del socio' },
  { id: 'numeroSocio', desc: 'Número de socio' },
  { id: 'categoria', desc: 'Categoría del socio' },
  { id: 'datosFaltantes', desc: 'Lista de datos faltantes (solo tipo "Datos faltantes")' },
  { id: 'email', desc: 'Email del socio' },
  { id: 'telefono', desc: 'Teléfono del socio' },
];

interface EnvioMasivoSociosProps {
  sociosSeleccionados: Socio[];
  categorias: Categoria[];
  onCerrar: () => void;
}

function getDatosFaltantes(socio: Socio): string {
  const faltantes: string[] = [];
  for (const { key, label } of CAMPOS_DATOS_FALTANTES) {
    const val = socio[key];
    if (val === undefined || val === null || String(val).trim() === '') {
      faltantes.push(label);
    }
  }
  return faltantes.join(', ');
}

export const EnvioMasivoSocios = ({
  sociosSeleccionados,
  categorias,
  onCerrar,
}: EnvioMasivoSociosProps) => {
  const { nombreClub, whatsappUsarServicio } = useClubConfig();
  const modoServicioBaileys = whatsappUsarServicio !== false;
  const [seleccionTipoOPlantilla, setSeleccionTipoOPlantilla] = useState<string>('tipo:generico');
  const [tipoMensaje, setTipoMensaje] = useState<TipoMensajeSocios>('generico');
  const [plantillas, setPlantillas] = useState<WhatsAppTemplate[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [canal, setCanal] = useState<'whatsapp' | 'email'>('whatsapp');
  const [enviandoBaileys, setEnviandoBaileys] = useState(false);
  const [pdfOpcionalMasivo, setPdfOpcionalMasivo] = useState<File | null>(null);
  const baileysPolling = canal === 'whatsapp' && modoServicioBaileys;
  const { status: baileysStatus, refrescar: refrescarBaileys } = useWhatsAppBaileysStatus(baileysPolling);

  const sociosConTelefono = sociosSeleccionados.filter((s) => s.telefono);
  const sociosConEmail = sociosSeleccionados.filter((s) => s.email);

  const getPlantillaPorDefecto = (tipo: TipoMensajeSocios): string => {
    switch (tipo) {
      case 'cumpleaños':
        return `Hola {nombre} {apellido}!\n\n¡Te deseamos un muy feliz cumpleaños de parte de ${nombreClub}!\n\nQue tengas un excelente día.\n\nSaludos cordiales.`;
      case 'al_dia':
        return `Hola {nombre} {apellido}!\n\nTe informamos que tu situación de cuotas está al día. ¡Gracias por tu compromiso con ${nombreClub}!\n\nSaludos cordiales.`;
      case 'datos_faltantes':
        return `Hola {nombre} {apellido}!\n\nTe contactamos para pedirte que completes los siguientes datos en tu ficha de socio: {datosFaltantes}.\n\nEs importante para mantener nuestra base actualizada.\n\nSaludos cordiales,\n${nombreClub}`;
      case 'generico':
      default:
        return `Hola {nombre} {apellido}!\n\nTe saludamos desde ${nombreClub}.\n\nSaludos cordiales.`;
    }
  };

  const handleCambioTipoOPlantilla = (valor: string) => {
    setSeleccionTipoOPlantilla(valor);
    if (valor.startsWith('tipo:')) {
      const tipo = valor.slice(5) as TipoMensajeSocios;
      setTipoMensaje(tipo);
      setMensaje(getPlantillaPorDefecto(tipo));
    } else if (valor.startsWith('plantilla:')) {
      const id = Number(valor.slice(9));
      if (Number.isFinite(id)) {
        const p = plantillas.find((x) => x.id === id);
        if (p) setMensaje(p.texto);
      }
    }
  };

  useEffect(() => {
    apiService.getWhatsAppTemplates().then((list) => {
      setPlantillas(list);
      const saved = localStorage.getItem('whatsapp_plantilla_liquidaciones_seleccion_v1');
      const savedId = saved ? Number(saved) : NaN;
      const tienePlantilla = Number.isFinite(savedId) && list.some((t) => t.id === savedId);
      if (tienePlantilla && savedId) {
        const p = list.find((t) => t.id === savedId)!;
        setSeleccionTipoOPlantilla(`plantilla:${savedId}`);
        setMensaje(p.texto);
      } else {
        setSeleccionTipoOPlantilla('tipo:generico');
        setTipoMensaje('generico');
        setMensaje(getPlantillaPorDefecto('generico'));
      }
    });
  }, []);

  const aplicarVariables = (texto: string, socio: Socio, datosFaltantes?: string): string => {
    const cat = categorias.find((c) => c.id === socio.categoriaId);
    return texto
      .replace(/{nombre}/g, socio.nombre || '')
      .replace(/{apellido}/g, socio.apellido || '')
      .replace(/{numeroSocio}/g, String(socio.numeroSocio))
      .replace(/{categoria}/g, cat?.nombre || '')
      .replace(/{datosFaltantes}/g, datosFaltantes ?? '')
      .replace(/{email}/g, socio.email || '')
      .replace(/{telefono}/g, socio.telefono || '');
  };

  const formatearTelefono = (t: string): string => {
    let n = t.replace(/\D/g, '');
    if (n.startsWith('0')) n = n.substring(1);
    if (!n.startsWith('54')) n = '54' + n;
    return n;
  };

  const guardarComoNueva = async () => {
    const nombre = window.prompt('Nombre para la nueva plantilla:', `Plantilla ${plantillas.length + 1}`);
    if (!nombre) return;
    try {
      const creada = await apiService.crearWhatsAppTemplate({ nombre: nombre.trim(), texto: mensaje });
      setPlantillas((prev) => [...prev, creada]);
      setSeleccionTipoOPlantilla(`plantilla:${creada.id}`);
      setMensaje(creada.texto);
      localStorage.setItem('whatsapp_plantilla_liquidaciones_seleccion_v1', String(creada.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo guardar');
    }
  };

  const iniciarEnvio = async () => {
    const destinatarios = canal === 'whatsapp' ? sociosConTelefono : sociosConEmail;
    if (destinatarios.length === 0) {
      alert(
        canal === 'whatsapp'
          ? 'Ningún socio seleccionado tiene teléfono registrado.'
          : 'Ningún socio seleccionado tiene email registrado.',
      );
      return;
    }

    if (canal === 'whatsapp' && modoServicioBaileys) {
      if (!baileysStatus?.connected) {
        alert(
          'El servicio WhatsApp no está conectado. Revisá el panel, pulsá «Actualizar estado» o escaneá el QR.',
        );
        return;
      }
      if (!baileysStatus?.reachable) {
        alert(
          baileysStatus?.serviceError ||
            'No se alcanza el servicio. Configurá WHATSAPP_SERVICE_URL y ejecutá whatsapp-service.',
        );
        return;
      }
      setEnviandoBaileys(true);
      try {
        let documentBase64: string | undefined;
        let fileName: string | undefined;
        if (pdfOpcionalMasivo) {
          documentBase64 = await fileToBase64(pdfOpcionalMasivo);
          fileName = pdfOpcionalMasivo.name || 'adjunto.pdf';
        }
        const items: WhatsAppBaileysBatchItem[] = sociosConTelefono.map((socio) => {
          const datosFaltantes = tipoMensaje === 'datos_faltantes' ? getDatosFaltantes(socio) : undefined;
          const caption = aplicarVariables(mensaje, socio, datosFaltantes);
          return {
            phone: socio.telefono!,
            caption,
            documentBase64,
            fileName,
          };
        });
        const LOTE = 80;
        let totalOk = 0;
        const errores: string[] = [];
        for (let i = 0; i < items.length; i += LOTE) {
          const slice = items.slice(i, i + LOTE);
          const data = await apiService.sendWhatsAppBaileysBatch(slice);
          totalOk += data.ok;
          data.results
            .filter((r) => !r.success)
            .forEach((r) => errores.push(r.error || '?'));
        }
        if (errores.length) {
          alert(
            `Encolados: ${totalOk} de ${items.length}. Algunos fallaron: ${errores.slice(0, 5).join('; ')}${
              errores.length > 5 ? '…' : ''
            }`,
          );
        } else {
          alert(
            `Listo: ${totalOk} mensaje(s) encolado(s) en el servicio WhatsApp (intervalo automático entre envíos).`,
          );
        }
        onCerrar();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error al enviar');
      } finally {
        setEnviandoBaileys(false);
      }
      return;
    }

    destinatarios.forEach((socio, i) => {
      setTimeout(() => {
        const datosFaltantes = tipoMensaje === 'datos_faltantes' ? getDatosFaltantes(socio) : undefined;
        const textoFinal = aplicarVariables(mensaje, socio, datosFaltantes);
        if (canal === 'whatsapp') {
          const num = formatearTelefono(socio.telefono);
          window.open(`https://wa.me/${num}?text=${encodeURIComponent(textoFinal)}`, '_blank');
        } else {
          const asunto = encodeURIComponent(`Mensaje de ${nombreClub}`);
          const body = encodeURIComponent(textoFinal);
          window.open(`mailto:${socio.email}?subject=${asunto}&body=${body}`, '_blank');
        }
      }, i * 1200);
    });

    alert(
      `Se abrirán ${destinatarios.length} ventana(s) de ${canal === 'whatsapp' ? 'WhatsApp' : 'correo'}. Aceptá las ventanas emergentes si el navegador las bloquea.`,
    );
    onCerrar();
  };

  const previewSocio = sociosSeleccionados[0];
  const previewDatosFaltantes = previewSocio && tipoMensaje === 'datos_faltantes' ? getDatosFaltantes(previewSocio) : undefined;
  const previewTexto = previewSocio ? aplicarVariables(mensaje, previewSocio, previewDatosFaltantes) : '';

  return (
    <div className="modal-overlay envio-masivo-overlay" onClick={onCerrar}>
      <div className="envio-masivo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="envio-masivo-header">
          <h2>Envío masivo a socios seleccionados</h2>
          <button type="button" className="btn-cerrar-envio-masivo" onClick={onCerrar} title="Cerrar">
            ×
          </button>
        </div>

        <div className="envio-masivo-body">
          <p className="envio-masivo-resumen">
            {sociosSeleccionados.length} socio(s) seleccionados.
            {canal === 'whatsapp' && (
              <span>
                {' '}
                Con teléfono: {sociosConTelefono.length}. Sin teléfono:{' '}
                {sociosSeleccionados.length - sociosConTelefono.length}
              </span>
            )}
            {canal === 'email' && (
              <span>
                {' '}
                Con email: {sociosConEmail.length}. Sin email:{' '}
                {sociosSeleccionados.length - sociosConEmail.length}
              </span>
            )}
          </p>

          <div className="envio-masivo-canal">
            <label>
              <input
                type="radio"
                checked={canal === 'whatsapp'}
                onChange={() => setCanal('whatsapp')}
              />
              WhatsApp
            </label>
            <label>
              <input
                type="radio"
                checked={canal === 'email'}
                onChange={() => setCanal('email')}
              />
              Email
            </label>
          </div>

          {canal === 'whatsapp' && (
            <>
              <WhatsAppServicioEstadoUI
                modoServicioBaileys={modoServicioBaileys}
                status={baileysStatus}
                onRefresh={refrescarBaileys}
                variant="compact"
              />
              {modoServicioBaileys && (
                <label className="envio-masivo-baileys-file">
                  PDF opcional (mismo archivo para todos los destinatarios)
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfOpcionalMasivo(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </>
          )}

          <div className="envio-masivo-tipo">
            <label>Tipo de mensaje o plantilla</label>
            <select
              className="envio-masivo-tipo-select"
              value={seleccionTipoOPlantilla}
              onChange={(e) => handleCambioTipoOPlantilla(e.target.value)}
            >
              <option value="tipo:generico">Mensaje genérico (saludo)</option>
              <option value="tipo:cumpleaños">Cumpleaños</option>
              <option value="tipo:al_dia">Al día (sin deuda)</option>
              <option value="tipo:datos_faltantes">Datos faltantes</option>
              <option value="" disabled>——— Plantillas guardadas ———</option>
              {plantillas.map((p) => (
                <option key={p.id} value={`plantilla:${p.id}`}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="envio-masivo-plantillas">
            <div className="envio-masivo-plantillas-row">
              <button type="button" onClick={guardarComoNueva}>
                Guardar como nueva
              </button>
            </div>
          </div>

          <div className="envio-masivo-variables">
            <strong>Variables:</strong>{' '}
            {VARIABLES_SOCIOS.map((v) => (
              <code key={v.id} title={v.desc}>{`{${v.id}}`}</code>
            ))}
          </div>

          <div className="envio-masivo-mensaje">
            <label>Mensaje</label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={6}
              placeholder="Usá {nombre}, {apellido}, etc."
            />
          </div>

          {previewSocio && (
            <div className="envio-masivo-preview">
              <strong>Vista previa ({previewSocio.apellido}, {previewSocio.nombre}):</strong>
              <pre>{previewTexto}</pre>
            </div>
          )}

          <WhatsAppServicioQrEnModal
            modoServicioBaileys={canal === 'whatsapp' && modoServicioBaileys}
            status={baileysStatus}
            onRefresh={refrescarBaileys}
          />

          <div className="envio-masivo-acciones">
            <button type="button" onClick={onCerrar}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-iniciar-envio"
              onClick={() => void iniciarEnvio()}
              disabled={
                enviandoBaileys ||
                (canal === 'whatsapp' && sociosConTelefono.length === 0) ||
                (canal === 'email' && sociosConEmail.length === 0)
              }
            >
              {enviandoBaileys
                ? 'Enviando…'
                : `${canal === 'whatsapp' ? '📱' : '✉️'} Iniciar envío (${
                    canal === 'whatsapp' ? sociosConTelefono.length : sociosConEmail.length
                  } destinatarios)${canal === 'whatsapp' && modoServicioBaileys ? ' — servicio' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
