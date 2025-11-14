const express = require('express');
const { query } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { mapCategoria } = require('../utils/format');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

// Todas las rutas requieren autenticación y permiso de categorías
router.use(authenticateToken);
router.use(requirePermission('categorias'));

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await query('SELECT * FROM categorias ORDER BY nombre ASC');
    res.json(rows.map(mapCategoria));
  }),
);

router.post(
  '/',
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

    const inserted = await query('SELECT * FROM categorias WHERE id = ?', [result.insertId]);
    res.status(201).json(mapCategoria(inserted[0]));
  }),
);

router.put(
  '/:id',
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

    const updated = await query('SELECT * FROM categorias WHERE id = ?', [id]);
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

    if (result.affectedRows === 0) {
      const error = new Error('Categoría no encontrada');
      error.status = 404;
      throw error;
    }

    res.status(204).send();
  }),
);

module.exports = router;


