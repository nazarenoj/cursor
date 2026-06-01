/**
 * Versión de la aplicación (misma que src/version.ts en el repo).
 * En producción: server/public/app-version.json (generado en npm run build).
 * En desarrollo: parseo de ../../src/version.ts si existe.
 * Override: variable de entorno APP_VERSION.
 */
const fs = require('fs');
const path = require('path');

function readFromPublic() {
  try {
    const filePath = path.join(__dirname, '../public/app-version.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const j = JSON.parse(raw);
    if (j && typeof j.version === 'string' && j.version.trim()) return j.version.trim();
  } catch (_) {
    /* sin archivo o JSON inválido */
  }
  return null;
}

function readFromSrcVersionTs() {
  try {
    const filePath = path.join(__dirname, '../../src/version.ts');
    const raw = fs.readFileSync(filePath, 'utf8');
    const m = raw.match(/APP_VERSION\s*=\s*['"]([0-9]+(?:\.[0-9]+)*)['"]/);
    return m ? m[1] : null;
  } catch (_) {
    return null;
  }
}

function getAppVersion() {
  const fromEnv = process.env.APP_VERSION;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).trim();
  }
  return readFromPublic() || readFromSrcVersionTs() || '0.0.0';
}

module.exports = { getAppVersion };
