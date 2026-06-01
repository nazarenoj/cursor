/**
 * Logger de arranque que escribe en archivo para diagnosticar 503 en Hostinger
 * (donde la consola puede no capturarse). Los logs se guardan en server/logs/startup.log
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'startup.log');
const SHOULD_WRITE_FILE =
  process.env.NODE_ENV === 'production' || String(process.env.STARTUP_FILE_LOG || '') === '1';

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (e) {
    // Si no se puede crear la carpeta, escribir en el directorio actual
  }
}

/**
 * Escribe una línea en server/logs/startup.log y en console.
 * @param {string} prefix - Ej: 'STARTUP' o 'STARTUP][DB'
 * @param {string} step - Paso o identificador
 * @param {string} [detail] - Detalle opcional
 */
function write(prefix, step, detail = '') {
  const ts = new Date().toISOString();
  const line = detail
    ? `[${prefix}] ${ts} ${step} ${detail}`
    : `[${prefix}] ${ts} ${step}`;
  const withNewline = line + '\n';

  if (SHOULD_WRITE_FILE) {
    try {
      ensureLogDir();
      fs.appendFileSync(LOG_FILE, withNewline);
    } catch (err) {
      try {
        fs.appendFileSync(path.join(__dirname, 'startup.log'), withNewline);
      } catch (_) {
        // Si falla todo, solo consola
      }
    }
  }
  console.log(line);
}

/**
 * Log de pasos de arranque (index.js)
 */
function startupLog(step, detail = '') {
  write('STARTUP', step, detail);
}

/**
 * Log de pasos de base de datos (db.js)
 */
function dbLog(step, detail = '') {
  write('STARTUP][DB', step, detail);
}

/**
 * Escribir un error con stack en el archivo de log
 */
function logError(label, err) {
  const ts = new Date().toISOString();
  const msg = err && err.message ? err.message : String(err);
  const stack = err && err.stack ? err.stack : '';
  const line = `[${label}] ${ts} ERROR: ${msg}\n${stack}\n`;
  if (SHOULD_WRITE_FILE) {
    try {
      ensureLogDir();
      fs.appendFileSync(LOG_FILE, line);
    } catch (e) {
      // ignorar
    }
  }
  console.error(`[${label}]`, err);
}

module.exports = { startupLog, dbLog, logError, LOG_FILE };
