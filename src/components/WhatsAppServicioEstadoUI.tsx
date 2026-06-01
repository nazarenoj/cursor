import { Link } from 'react-router-dom';
import type { WhatsAppBaileysStatus } from '../types';
import './WhatsAppServicioEstadoUI.css';

interface Props {
  modoServicioBaileys: boolean;
  status: WhatsAppBaileysStatus | null;
  onRefresh: () => void;
  variant?: 'panel' | 'compact';
}

/** Estado del microservicio Baileys y QR (pantalla de envío o modal compacto). */
export function WhatsAppServicioEstadoUI({
  modoServicioBaileys,
  status,
  onRefresh,
  variant = 'panel',
}: Props) {
  if (!modoServicioBaileys) {
    return (
      <div className={`whatsapp-servicio-ui whatsapp-servicio-ui--wa-web whatsapp-servicio-ui--${variant}`}>
        <p className="whatsapp-servicio-ui-msg">
          Modo del club: <strong>WhatsApp Web</strong> (se abrirá <code>wa.me</code> en el navegador). Para usar el
          servicio con código QR, cambiá la opción en{' '}
          <Link to="/configuracion-club" className="whatsapp-servicio-ui-link">
            Configuración del club
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={`whatsapp-servicio-ui whatsapp-servicio-ui--baileys whatsapp-servicio-ui--${variant}`}>
      <div className="whatsapp-servicio-ui-toolbar">
        <p className="whatsapp-servicio-ui-msg">
          Modo del club: <strong>Servicio Baileys</strong> (envío desde el servidor, texto y PDF).
        </p>
        <button type="button" className="whatsapp-servicio-ui-refresh" onClick={() => void onRefresh()}>
          Actualizar estado / QR
        </button>
      </div>
      {status && (
        <div className="whatsapp-servicio-ui-body">
          {!status.reachable && (
            <p className="whatsapp-servicio-ui-msg whatsapp-servicio-ui-msg--error">
              {status.serviceError ||
                'No se alcanza el servicio. Ejecutá whatsapp-service y definí WHATSAPP_SERVICE_URL en el servidor.'}
            </p>
          )}
          {status.reachable && status.connected && (
            <p className="whatsapp-servicio-ui-msg whatsapp-servicio-ui-msg--ok">
              Conectado. Los mensajes se encolan con intervalo entre envíos.
              {typeof status.queueLength === 'number' ? ` Cola: ${status.queueLength}.` : ''}
            </p>
          )}
          {status.reachable && !status.connected && (
            <>
              <p className="whatsapp-servicio-ui-msg whatsapp-servicio-ui-msg--qr">
                <strong>WhatsApp no está conectado.</strong> Abrí WhatsApp en el teléfono → Dispositivos vinculados →
                Vincular dispositivo y escaneá el código.
              </p>
              {status.qrBase64 ? (
                <img src={status.qrBase64} alt="Código QR WhatsApp" className="whatsapp-servicio-ui-qr" />
              ) : (
                <p className="whatsapp-servicio-ui-msg">Generando QR… pulsá «Actualizar estado / QR».</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Bloque dentro de un modal de envío: muestra QR si hace falta conectar. */
export function WhatsAppServicioQrEnModal({
  modoServicioBaileys,
  status,
  onRefresh,
}: {
  modoServicioBaileys: boolean;
  status: WhatsAppBaileysStatus | null;
  onRefresh: () => void;
}) {
  if (!modoServicioBaileys || !status) return null;
  if (status.connected) return null;

  return (
    <div className="whatsapp-servicio-modal-qr">
      <p className="whatsapp-servicio-modal-qr-titulo">
        <strong>Conexión requerida</strong> — escaneá el QR para enviar por el servicio.
      </p>
      <button type="button" className="whatsapp-servicio-ui-refresh" onClick={() => void onRefresh()}>
        Actualizar QR
      </button>
      {!status.reachable && (
        <p className="whatsapp-servicio-ui-msg whatsapp-servicio-ui-msg--error">
          {status.serviceError || 'Servicio no disponible.'}
        </p>
      )}
      {status.reachable && status.qrBase64 && (
        <img src={status.qrBase64} alt="QR WhatsApp" className="whatsapp-servicio-modal-qr-img" />
      )}
      {status.reachable && !status.qrBase64 && !status.connected && (
        <p className="whatsapp-servicio-ui-msg">Esperando QR…</p>
      )}
    </div>
  );
}
