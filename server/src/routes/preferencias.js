const express = require('express');
const { query } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/preferencias/columnas/:listKey
 * Devuelve las columnas visibles guardadas para el usuario y el listado.
 * listKey: ej. "socios", "categorias", "pagos", "usuarios", "cajas", "medios-pago", "auditoria", "backups"
 */
router.get(
  '/preferencias/columnas/:listKey',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const listKey = String(req.params.listKey || '').trim().replace(/[^a-z0-9_-]/gi, '') || 'default';

    const rows = await query(
      'SELECT preferencias FROM usuario_preferencias WHERE usuario_id = ? AND list_key = ? LIMIT 1',
      [userId, listKey],
    );

    if (rows.length === 0) {
      return res.json({ columnas: null });
    }

    const prefs = rows[0].preferencias;
    const columnas = typeof prefs === 'string' ? JSON.parse(prefs) : prefs;
    const arr = Array.isArray(columnas) ? columnas : (columnas && columnas.columnas ? columnas.columnas : null);
    return res.json({ columnas: arr });
  }),
);

/**
 * PUT /api/preferencias/columnas/:listKey
 * Guarda las columnas visibles para el usuario y el listado.
 * Body: { columnas: string[] }
 */
router.put(
  '/preferencias/columnas/:listKey',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const listKey = String(req.params.listKey || '').trim().replace(/[^a-z0-9_-]/gi, '') || 'default';
    const { columnas } = req.body || {};

    if (!Array.isArray(columnas)) {
      const error = new Error('Se requiere un array "columnas"');
      error.status = 400;
      throw error;
    }

    const preferencias = JSON.stringify({ columnas });

    await query(
      `INSERT INTO usuario_preferencias (usuario_id, list_key, preferencias)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE preferencias = VALUES(preferencias)`,
      [userId, listKey, preferencias],
    );

    return res.json({ columnas });
  }),
);

module.exports = router;
