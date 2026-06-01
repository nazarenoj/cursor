const express = require('express');
const { query, execute } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria } = require('../middleware/auditoria');

const router = express.Router();

router.use(authenticateToken);
router.use(registrarAuditoria);

const toCamel = (row) => {
  if (!row || typeof row !== 'object') return row;
  const result = {};
  Object.keys(row).forEach((key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    result[camelKey] = row[key];
  });
  return result;
};

// GET /api/whatsapp-templates
router.get(
  '/',
  requirePermission('whatsapp_templates.ver'),
  asyncHandler(async (_req, res) => {
    const rows = await query(
      'SELECT id, nombre, texto, created_at, updated_at FROM whatsapp_templates ORDER BY nombre ASC',
    );
    res.json(rows.map(toCamel));
  }),
);

// POST /api/whatsapp-templates
router.post(
  '/',
  requirePermission('whatsapp_templates.crear'),
  asyncHandler(async (req, res) => {
    const { nombre, texto } = req.body || {};
    if (!nombre || !texto) {
      const error = new Error('Nombre y texto son obligatorios');
      error.status = 400;
      throw error;
    }
    const nombreTrim = String(nombre).trim();
    const textoStr = String(texto);

    // Duplicado por nombre
    const existe = await query('SELECT id FROM whatsapp_templates WHERE nombre = ? LIMIT 1', [nombreTrim]);
    if (existe.length > 0) {
      const error = new Error('Plantilla existente');
      error.status = 409;
      throw error;
    }

    const result = await execute('INSERT INTO whatsapp_templates (nombre, texto) VALUES (?, ?)', [
      nombreTrim,
      textoStr,
    ]);
    const rows = await query(
      'SELECT id, nombre, texto, created_at, updated_at FROM whatsapp_templates WHERE id = ?',
      [result.insertId],
    );
    res.status(201).json(toCamel(rows[0]));
  }),
);

// PUT /api/whatsapp-templates/:id
router.put(
  '/:id',
  requirePermission('whatsapp_templates.modificar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { nombre, texto } = req.body || {};
    if (!id || Number.isNaN(id)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }
    if (!nombre || !texto) {
      const error = new Error('Nombre y texto son obligatorios');
      error.status = 400;
      throw error;
    }
    const nombreTrim = String(nombre).trim();
    const textoStr = String(texto);

    const rowsExist = await query('SELECT id FROM whatsapp_templates WHERE id = ? LIMIT 1', [id]);
    if (rowsExist.length === 0) {
      const error = new Error('Plantilla no encontrada');
      error.status = 404;
      throw error;
    }

    const dup = await query('SELECT id FROM whatsapp_templates WHERE nombre = ? AND id <> ? LIMIT 1', [
      nombreTrim,
      id,
    ]);
    if (dup.length > 0) {
      const error = new Error('Plantilla existente');
      error.status = 409;
      throw error;
    }

    await execute('UPDATE whatsapp_templates SET nombre = ?, texto = ? WHERE id = ?', [nombreTrim, textoStr, id]);
    const rows = await query(
      'SELECT id, nombre, texto, created_at, updated_at FROM whatsapp_templates WHERE id = ?',
      [id],
    );
    res.json(toCamel(rows[0]));
  }),
);

// DELETE /api/whatsapp-templates/:id
router.delete(
  '/:id',
  requirePermission('whatsapp_templates.eliminar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }
    const rowsExist = await query('SELECT id FROM whatsapp_templates WHERE id = ? LIMIT 1', [id]);
    if (rowsExist.length === 0) {
      const error = new Error('Plantilla no encontrada');
      error.status = 404;
      throw error;
    }
    await execute('DELETE FROM whatsapp_templates WHERE id = ?', [id]);
    res.status(204).send();
  }),
);

module.exports = router;

