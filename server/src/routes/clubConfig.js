const express = require('express');
const path = require('path');
const fs = require('fs');
const { query, execute } = require('../db');
const { getAppVersion } = require('../appVersion');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria } = require('../middleware/auditoria');
const uploadLogo = require('../middleware/uploadLogo');

const router = express.Router();
const ALLOWED_TIMEZONES = [
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Argentina/Salta',
  'America/Santiago',
  'America/Asuncion',
  'America/Montevideo',
  'America/Sao_Paulo',
  'America/Lima',
  'UTC',
];

const toCamel = (row) => {
  if (!row || typeof row !== 'object') return row;
  const result = {};
  Object.keys(row).forEach((key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = row[key];
  });
  return result;
};

const DEFAULT_PUBLIC_CONFIG = {
  nombreClub: 'Club Social Realico',
  logoUrl: null,
  colorPrimario: '#667eea',
  timezone: 'America/Argentina/Buenos_Aires',
};

/** BDs antiguas sin columna `timezone` rompían el login (500). Reintento sin esa columna. */
const getConfigPublic = async () => {
  try {
    const rows = await query(
      'SELECT nombre_club, logo_url, color_primario, timezone FROM club_config WHERE id = 1 LIMIT 1',
    );
    if (rows.length === 0) {
      return { ...DEFAULT_PUBLIC_CONFIG };
    }
    return toCamel(rows[0]);
  } catch (err) {
    const code = err && err.code;
    const msg = err && err.message ? String(err.message) : '';
    const missingTimezone =
      code === 'ER_BAD_FIELD_ERROR' || /Unknown column ['`]?timezone['`]?/i.test(msg);
    if (!missingTimezone) throw err;
    const rows = await query(
      'SELECT nombre_club, logo_url, color_primario FROM club_config WHERE id = 1 LIMIT 1',
    );
    if (rows.length === 0) {
      return { ...DEFAULT_PUBLIC_CONFIG };
    }
    const row = toCamel(rows[0]);
    return {
      ...DEFAULT_PUBLIC_CONFIG,
      ...row,
      timezone: DEFAULT_PUBLIC_CONFIG.timezone,
    };
  }
};

// GET /api/club-config/public — Público (sin auth), para login y portada
router.get(
  '/public',
  asyncHandler(async (_req, res) => {
    const config = await getConfigPublic();
    res.json({ ...config, appVersion: getAppVersion() });
  }),
);

// GET /api/club-config — Cualquier usuario autenticado puede leer
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const rows = await query(
      'SELECT id, nombre_club, logo_url, color_primario, timezone, whatsapp_usar_servicio, updated_at FROM club_config WHERE id = 1 LIMIT 1',
    );
    if (rows.length === 0) {
      return res.json({
        nombreClub: 'Club Social Realico',
        logoUrl: null,
        colorPrimario: '#667eea',
        timezone: 'America/Argentina/Buenos_Aires',
        whatsappUsarServicio: true,
        appVersion: getAppVersion(),
      });
    }
    res.json({ ...toCamel(rows[0]), appVersion: getAppVersion() });
  }),
);

// PUT /api/club-config — Solo con permiso club.configurar; acepta multipart (nombreClub, colorPrimario, logo)
router.put(
  '/',
  authenticateToken,
  registrarAuditoria,
  requirePermission('club.configurar'),
  uploadLogo.single('logo'),
  asyncHandler(async (req, res) => {
    const nombreClub = req.body.nombreClub != null ? String(req.body.nombreClub).trim() : null;
    const colorPrimario = req.body.colorPrimario != null ? String(req.body.colorPrimario).trim() : null;
    const timezone = req.body.timezone != null ? String(req.body.timezone).trim() : null;
    const whatsappUsarServicioRaw = req.body.whatsappUsarServicio;
    if (timezone && !ALLOWED_TIMEZONES.includes(timezone)) {
      return res.status(400).json({ message: 'Zona horaria inválida.' });
    }

    const [current] = await query(
      'SELECT nombre_club, logo_url, color_primario, timezone, whatsapp_usar_servicio FROM club_config WHERE id = 1 LIMIT 1',
    );
    let logoUrl = current?.[0]?.logo_url ?? null;

    if (req.file) {
      const oldPath = current?.[0]?.logo_url;
      if (oldPath) {
        const base = path.join(__dirname, '../../uploads/logo');
        const oldFile = path.basename(oldPath);
        const fullOld = path.join(base, oldFile);
        if (fs.existsSync(fullOld)) {
          fs.unlinkSync(fullOld);
        }
      }
      logoUrl = `/api/uploads/logo/${req.file.filename}`;
    }

    const nombreFinal = nombreClub || (current?.[0]?.nombre_club ?? 'Club Social Realico');
    const colorFinal = colorPrimario || (current?.[0]?.color_primario ?? '#667eea');
    const timezoneFinal = timezone || (current?.[0]?.timezone ?? 'America/Argentina/Buenos_Aires');
    const prevWa = current?.[0]?.whatsapp_usar_servicio;
    let whatsappServicio =
      prevWa === undefined || prevWa === null ? 1 : Number(prevWa) === 1 ? 1 : 0;
    if (
      whatsappUsarServicioRaw !== undefined &&
      whatsappUsarServicioRaw !== null &&
      String(whatsappUsarServicioRaw).trim() !== ''
    ) {
      const s = String(whatsappUsarServicioRaw).toLowerCase();
      whatsappServicio = s === '1' || s === 'true' || s === 'on' ? 1 : 0;
    }

    await execute(
      'UPDATE club_config SET nombre_club = ?, logo_url = ?, color_primario = ?, timezone = ?, whatsapp_usar_servicio = ? WHERE id = 1',
      [nombreFinal, logoUrl, colorFinal, timezoneFinal, whatsappServicio],
    );

    const rows = await query(
      'SELECT id, nombre_club, logo_url, color_primario, timezone, whatsapp_usar_servicio, updated_at FROM club_config WHERE id = 1 LIMIT 1',
    );
    const row = rows[0];
    if (!row) {
      return res.status(500).json({ message: 'No se pudo leer la configuración guardada.' });
    }
    res.json({ ...toCamel(row), appVersion: getAppVersion() });
  }),
);

module.exports = router;
