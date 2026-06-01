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

// GET /api/localidades?provincia=La Pampa - Lista localidades agregadas por usuarios para esa provincia
router.get(
  '/',
  requirePermission('socios.ver'),
  asyncHandler(async (req, res) => {
    const { provincia } = req.query;
    if (!provincia || typeof provincia !== 'string') {
      return res.json([]);
    }
    const rows = await query(
      'SELECT id, nombre, provincia, codigo_postal FROM localidades WHERE provincia = ? ORDER BY nombre ASC',
      [provincia.trim()],
    );
    res.json(rows.map(toCamel));
  }),
);

// POST /api/localidades - Crear nueva localidad (cuando no existe en la lista)
router.post(
  '/',
  requirePermission('socios.crear'),
  asyncHandler(async (req, res) => {
    const { nombre, provincia, codigoPostal } = req.body || {};

    if (!nombre || !provincia) {
      const error = new Error('Nombre y provincia son obligatorios');
      error.status = 400;
      throw error;
    }

    const nombreTrim = nombre.trim();
    const provinciaTrim = provincia.trim();
    const cp = codigoPostal != null && String(codigoPostal).trim() !== '' ? String(codigoPostal).trim() : null;

    // Verificar si la localidad ya existe
    const existentes = await query(
      'SELECT id, nombre, provincia, codigo_postal FROM localidades WHERE nombre = ? AND provincia = ?',
      [nombreTrim, provinciaTrim],
    );

    if (existentes.length > 0) {
      const error = new Error('Localidad existente');
      error.status = 409;
      throw error;
    }

    const result = await execute(
      'INSERT INTO localidades (nombre, provincia, codigo_postal) VALUES (?, ?, ?)',
      [nombreTrim, provinciaTrim, cp],
    );

    const [inserted] = await query('SELECT id, nombre, provincia, codigo_postal FROM localidades WHERE id = ?', [
      result.insertId,
    ]);
    res.status(201).json(toCamel(inserted));
  }),
);

module.exports = router;
