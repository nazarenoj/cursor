const express = require('express');
const NodeCache = require('node-cache');
const { query } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { mapCategoria } = require('../utils/format');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria } = require('../middleware/auditoria');

const router = express.Router();
const cache = new NodeCache({ stdTTL: 60 * 60 });
const CACHE_KEY_CATEGORIAS = 'todas_categorias';

// Todas las rutas requieren autenticación
router.use(authenticateToken);
// Auditoría DESPUÉS de autenticación para que req.user esté disponible
router.use(registrarAuditoria);

router.get(
  '/',
  requirePermission('categorias.ver'),
  asyncHandler(async (_req, res) => {
    let categorias = cache.get(CACHE_KEY_CATEGORIAS);
    if (categorias == null) {
      const rows = await query('SELECT id, nombre, costo_cuota, created_at, updated_at FROM categorias ORDER BY nombre ASC');
      categorias = rows.map(mapCategoria);
      cache.set(CACHE_KEY_CATEGORIAS, categorias);
    }
    res.json(categorias);
  }),
);

// IMPORTANTE: La ruta /exportar debe ir ANTES de la ruta POST / para evitar conflictos
// POST /api/categorias/exportar - Registrar exportación (PDF, Excel, etc.)
router.post(
  '/exportar',
  requirePermission('categorias.ver'),
  asyncHandler(async (req, res) => {
    // Esta ruta solo registra la exportación en auditoría
    // La exportación real se hace en el frontend
    const { tipo, filtros } = req.body || {};
    res.json({ 
      message: 'Exportación registrada',
      tipo: tipo || 'PDF',
      filtros: filtros || {}
    });
  }),
);

router.post(
  '/',
  requirePermission('categorias.crear'),
  asyncHandler(async (req, res) => {
    const { nombre, costoCuota } = req.body || {};

    if (!nombre || Number.isNaN(Number(costoCuota))) {
      const error = new Error('Nombre y costoCuota son obligatorios');
      error.status = 400;
      throw error;
    }

    const result = await query(
      'INSERT INTO categorias (nombre, costo_cuota) VALUES (?, ?)',
      [nombre.trim(), Number(costoCuota)],
    );
    cache.del(CACHE_KEY_CATEGORIAS);

    const inserted = await query('SELECT id, nombre, costo_cuota, created_at, updated_at FROM categorias WHERE id = ?', [result.insertId]);
    res.status(201).json(mapCategoria(inserted[0]));
  }),
);

router.put(
  '/:id',
  requirePermission('categorias.modificar'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, costoCuota } = req.body || {};

    if (!nombre || Number.isNaN(Number(costoCuota))) {
      const error = new Error('Nombre y costoCuota son obligatorios');
      error.status = 400;
      throw error;
    }

    await query('UPDATE categorias SET nombre = ?, costo_cuota = ? WHERE id = ?', [
      nombre.trim(),
      Number(costoCuota),
      id,
    ]);
    cache.del(CACHE_KEY_CATEGORIAS);

    const updated = await query('SELECT id, nombre, costo_cuota, created_at, updated_at FROM categorias WHERE id = ?', [id]);
    if (updated.length === 0) {
      const error = new Error('Categoría no encontrada');
      error.status = 404;
      throw error;
    }

    res.json(mapCategoria(updated[0]));
  }),
);

router.delete(
  '/:id',
  requirePermission('categorias.eliminar'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [{ count }] = await query(
      'SELECT COUNT(*) AS count FROM socios WHERE categoria_id = ?',
      [id],
    );

    if (Number(count) > 0) {
      const error = new Error(
        'No se puede eliminar la categoría porque hay socios asociados a la misma.',
      );
      error.status = 409;
      throw error;
    }

    const result = await query('DELETE FROM categorias WHERE id = ?', [id]);
    if (result.affectedRows > 0) cache.del(CACHE_KEY_CATEGORIAS);

    if (result.affectedRows === 0) {
      const error = new Error('Categoría no encontrada');
      error.status = 404;
      throw error;
    }

    res.status(204).send();
  }),
);

module.exports = router;


