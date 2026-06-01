const path = require('path');
const fs = require('fs').promises;
const pino = require('pino');
const QRCode = require('qrcode');

let sock = null;
let currentQR = null;
let isConnected = false;
let authFolder = './auth_wa';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

function setAuthFolder(folder) {
  authFolder = folder || authFolder;
}

function getAuthFolder() {
  return path.resolve(authFolder);
}

function phoneToJid(phone) {
  const digits = String(phone).replace(/\D/g, '');
  let num = digits.startsWith('0') ? digits.slice(1) : digits;
  if (num.startsWith('15') && num.length > 10) num = num.slice(2);
  if (!num.startsWith('54')) num = '54' + num;
  if (num.length === 12 && num.startsWith('54') && !num.startsWith('549')) num = '54' + '9' + num.slice(2);
  return num + '@s.whatsapp.net';
}

async function getStatus() {
  const needsQR = !sock || !isConnected;
  let qrBase64 = null;
  if (currentQR) {
    try {
      qrBase64 = await QRCode.toDataURL(currentQR, { margin: 1, width: 280 });
    } catch (e) {
      logger.warn(e, 'QR to data URL');
    }
  }
  return {
    connected: isConnected,
    needsQR,
    qrBase64: qrBase64 || undefined,
  };
}

async function getQRImage() {
  if (!currentQR) return null;
  return await QRCode.toBuffer(currentQR, { margin: 1, width: 280, type: 'png' });
}

async function connect() {
  const Baileys = await import('@whiskeysockets/baileys');
  const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = Baileys;

  const dir = getAuthFolder();
  await fs.mkdir(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
  });

  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      currentQR = qr;
      logger.info('Nuevo QR generado');
    }
    if (connection === 'open') {
      isConnected = true;
      currentQR = null;
      logger.info('Conectado a WhatsApp');
    }
    if (connection === 'close') {
      isConnected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const mustRescan =
        code === DisconnectReason.loggedOut ||
        code === DisconnectReason.connectionReplaced ||
        code === DisconnectReason.badSession ||
        code === DisconnectReason.multideviceMismatch;
      if (mustRescan) {
        currentQR = null;
        const dirPath = getAuthFolder();
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          for (const e of entries) {
            const full = path.join(dirPath, e.name);
            await (e.isDirectory() ? fs.rm(full, { recursive: true }) : fs.unlink(full));
          }
          logger.info({ authFolder: dirPath }, 'Carpeta de auth borrada. Reinicia el servicio para ver el QR de nuevo.');
        } catch (e) {
          logger.warn(e, 'No se pudo borrar la carpeta auth. Eliminala manualmente y reinicia.');
        }
        logger.warn({ code, authFolder: dirPath }, 'Sesion invalida o cerrada. Reinicia el servicio para escanear el QR de nuevo.');
      } else {
        const delay = code === 515 ? 10000 : 5000;
        logger.warn({ code, delayMs: delay }, 'Conexion cerrada. Reconectando en unos segundos...');
        setTimeout(connect, delay);
      }
    }
  });

  socket.ev.on('creds.update', saveCreds);

  sock = socket;
  return socket;
}

async function sendText(phone, text) {
  if (!sock || !isConnected) throw new Error('WhatsApp no esta conectado. Escanea el QR primero.');
  const jid = phoneToJid(phone);
  const result = await sock.sendMessage(jid, { text: String(text) });
  return result;
}

async function sendDocument(phone, options) {
  if (!sock || !isConnected) throw new Error('WhatsApp no esta conectado. Escanea el QR primero.');
  const { caption, document, fileName } = options;
  if (!fileName) throw new Error('fileName es obligatorio');

  let docPayload;
  if (document.url) {
    docPayload = { url: document.url };
  } else if (document.path) {
    const buf = await fs.readFile(path.resolve(document.path));
    docPayload = buf;
  } else if (document.buffer) {
    const buf = Buffer.from(document.buffer, 'base64');
    docPayload = buf;
  } else {
    throw new Error('document debe tener url, path o buffer');
  }

  const jid = phoneToJid(phone);
  const mimetype = options.mimetype || 'application/pdf';
  const message = {
    document: docPayload,
    fileName,
    mimetype,
    caption: caption ? String(caption) : undefined,
  };
  const result = await sock.sendMessage(jid, message);
  return result;
}

module.exports = {
  setAuthFolder,
  getAuthFolder,
  getStatus,
  getQRImage,
  connect,
  sendText,
  sendDocument,
  phoneToJid,
  logger,
};
