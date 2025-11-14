const express = require('express');
const { query, withTransaction } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { mapLiquidacionMensual, mapLiquidacionCuota } = require('../utils/format');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, checkPermission } = require('../middleware/permissions');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

const hoyISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

router.get(
  '/liquidaciones-mensuales',
  requirePermission('liquidaciones'),
  asyncHandler(async (_req, res) => {
    const rows = await query('SELECT * FROM liquidaciones_mensuales ORDER BY mes DESC');
    res.json(rows.map(mapLiquidacionMensual));
  }),
);

router.post(
  '/liquidaciones-mensuales',
  requirePermission('liquidaciones'),
  asyncHandler(async (req, res) => {
    const { mes } = req.body || {};
    if (!mes || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
      const error = new Error('El mes es obligatorio y debe tener el formato YYYY-MM.');
      error.status = 400;
      throw error;
    }

    const result = await withTransaction(async (conn) => {
      const [existentes] = await conn.execute(
        'SELECT id FROM liquidaciones_mensuales WHERE mes = ? LIMIT 1',
        [mes],
      );
      if (existentes.length > 0) {
        const error = new Error(`Ya existe una liquidación para el mes ${mes}.`);
        error.status = 409;
        throw error;
      }

      const fechaLiquidacion = hoyISO();
      const [insertResult] = await conn.execute(
        'INSERT INTO liquidaciones_mensuales (mes, fecha_liquidacion) VALUES (?, ?)',
        [mes, fechaLiquidacion],
      );

      const liquidacionMensualId = insertResult.insertId;

      const [socios] = await conn.execute(
        `SELECT 
          s.id,
          s.numero_socio,
          s.apellido,
          s.nombre,
          s.categoria_id,
          c.nombre AS categoria_nombre,
          c.costo_cuota
        FROM socios s
        INNER JOIN categorias c ON c.id = s.categoria_id
        WHERE s.fecha_baja IS NULL`,
      );

      if (socios.length > 0) {
        const values = socios.map((socio) => [
          liquidacionMensualId,
          socio.id,
          socio.numero_socio,
          socio.apellido,
          socio.nombre,
          socio.categoria_id,
          socio.categoria_nombre,
          socio.costo_cuota,
        ]);

        await conn.query(
          `INSERT INTO liquidaciones_cuotas (
            liquidacion_mensual_id,
            socio_id,
            numero_socio,
            apellido,
            nombre,
            categoria_id,
            categoria_nombre,
            monto
          ) VALUES ?`,
          [values],
        );
      }

      const [liquidacionRows] = await conn.execute(
        'SELECT * FROM liquidaciones_mensuales WHERE id = ?',
        [liquidacionMensualId],
      );
      const [cuotasRows] = await conn.execute(
        'SELECT * FROM liquidaciones_cuotas WHERE liquidacion_mensual_id = ?',
        [liquidacionMensualId],
      );

      return {
        liquidacionMensual: liquidacionRows[0],
        cuotas: cuotasRows,
      };
    });

    res.status(201).json({
      liquidacionMensual: mapLiquidacionMensual(result.liquidacionMensual),
      cuotas: result.cuotas.map(mapLiquidacionCuota),
    });
  }),
);

router.delete(
  '/liquidaciones-mensuales/:id',
  requirePermission('liquidaciones'),
  asyncHandler(async (req, res) => {
    const liquidacionId = Number(req.params.id);

    await withTransaction(async (conn) => {
      const [pagadas] = await conn.execute(
        `SELECT COUNT(*) AS total FROM liquidaciones_cuotas 
         WHERE liquidacion_mensual_id = ? AND pagado = 1`,
        [liquidacionId],
      );

      if (Number(pagadas[0].total) > 0) {
        const error = new Error(
          'No se puede eliminar la liquidación mensual porque existen cuotas pagadas asociadas.',
        );
        error.status = 409;
        throw error;
      }

      const [deleteResult] = await conn.execute(
        'DELETE FROM liquidaciones_mensuales WHERE id = ?',
        [liquidacionId],
      );

      if (deleteResult.affectedRows === 0) {
        const error = new Error('Liquidación mensual no encontrada.');
        error.status = 404;
        throw error;
      }
    });

    res.status(204).send();
  }),
);

const buildCuotasFilters = (params = {}) => {
  const clauses = [];
  const values = [];

  if (params.liquidacionMensualId) {
    clauses.push('liquidacion_mensual_id = ?');
    values.push(Number(params.liquidacionMensualId));
  }
  if (params.socioId) {
    clauses.push('socio_id = ?');
    values.push(Number(params.socioId));
  }
  if (params.pagado !== undefined) {
    clauses.push('pagado = ?');
    values.push(params.pagado === 'true' ? 1 : 0);
  }
  if (params.mes) {
    clauses.push(
      'liquidacion_mensual_id IN (SELECT id FROM liquidaciones_mensuales WHERE mes = ?)',
    );
    values.push(params.mes);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

router.get(
  '/liquidaciones-cuotas',
  requirePermission('listado_pagos'),
  asyncHandler(async (req, res) => {
    const { where, values } = buildCuotasFilters(req.query);
    const rows = await query(
      `SELECT * FROM liquidaciones_cuotas ${where} ORDER BY liquidacion_mensual_id DESC, id ASC`,
      values,
    );
    res.json(rows.map(mapLiquidacionCuota));
  }),
);

router.post(
  '/liquidaciones-cuotas/pagar',
  requirePermission('pagos'),
  asyncHandler(async (req, res) => {
    const { ids, medioPago, fechaPago } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      const error = new Error('Debe indicar los IDs de las cuotas a actualizar.');
      error.status = 400;
      throw error;
    }

    const pagoFecha = fechaPago || hoyISO();
    const descripcionMedio = medioPago || 'Efectivo';

    await query(
      `UPDATE liquidaciones_cuotas 
       SET pagado = 1, fecha_pago = ?, medio_pago = ?
       WHERE id IN (${ids.map(() => '?').join(',')})`,
      [pagoFecha, descripcionMedio, ...ids],
    );

    const rows = await query(
      `SELECT * FROM liquidaciones_cuotas WHERE id IN (${ids.map(() => '?').join(',')})`,
      [...ids],
    );
    res.json(rows.map(mapLiquidacionCuota));
  }),
);

router.patch(
  '/liquidaciones-cuotas/:id/pagar',
  requirePermission('pagos'),
  asyncHandler(async (req, res) => {
    const cuotaId = Number(req.params.id);
    const { medioPago, fechaPago } = req.body || {};

    await query(
      `UPDATE liquidaciones_cuotas 
       SET pagado = 1, fecha_pago = ?, medio_pago = ?
       WHERE id = ?`,
      [fechaPago || hoyISO(), medioPago || 'Efectivo', cuotaId],
    );

    const rows = await query('SELECT * FROM liquidaciones_cuotas WHERE id = ?', [cuotaId]);
    if (rows.length === 0) {
      const error = new Error('Liquidación de cuota no encontrada.');
      error.status = 404;
      throw error;
    }

    res.json(mapLiquidacionCuota(rows[0]));
  }),
);

router.patch(
  '/liquidaciones-cuotas/:id/pendiente',
  requirePermission('liquidaciones'),
  asyncHandler(async (req, res) => {
    const cuotaId = Number(req.params.id);

    await query(
      `UPDATE liquidaciones_cuotas 
       SET pagado = 0, fecha_pago = NULL, medio_pago = NULL
       WHERE id = ?`,
      [cuotaId],
    );

    const rows = await query('SELECT * FROM liquidaciones_cuotas WHERE id = ?', [cuotaId]);
    if (rows.length === 0) {
      const error = new Error('Liquidación de cuota no encontrada.');
      error.status = 404;
      throw error;
    }

    res.json(mapLiquidacionCuota(rows[0]));
  }),
);

router.delete(
  '/liquidaciones-cuotas/:id',
  requirePermission('liquidaciones'),
  asyncHandler(async (req, res) => {
    const cuotaId = Number(req.params.id);

    const result = await query('DELETE FROM liquidaciones_cuotas WHERE id = ?', [cuotaId]);
    if (result.affectedRows === 0) {
      const error = new Error('Liquidación de cuota no encontrada.');
      error.status = 404;
      throw error;
    }

    res.status(204).send();
  }),
);

module.exports = router;


