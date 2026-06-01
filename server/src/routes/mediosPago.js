const express = require('express');
const { query, execute } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria } = require('../middleware/auditoria');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);
// Auditoría DESPUÉS de autenticación para que req.user esté disponible
router.use(registrarAuditoria);

// Mapear resultados de la BD con cajas asociadas
const mapMedioPago = async (row) => {
  // Obtener todas las cajas asociadas a este medio de pago
  const cajasAsociadas = await query(`
    SELECT c.id, c.nombre
    FROM medio_pago_cajas mpc
    INNER JOIN cajas c ON mpc.caja_id = c.id
    WHERE mpc.medio_pago_id = ?
    ORDER BY c.nombre
  `, [row.id]);

  const cajasIds = cajasAsociadas.map(c => c.id);
  const cajas = cajasAsociadas.map(c => ({ id: c.id, nombre: c.nombre }));

  // Mantener compatibilidad con el campo antiguo
  const primeraCaja = cajasAsociadas.length > 0 ? cajasAsociadas[0] : null;

  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion || null,
    cajaId: row.caja_id || primeraCaja?.id || null, // Compatibilidad hacia atrás
    cajaNombre: row.caja_nombre || primeraCaja?.nombre || null, // Compatibilidad hacia atrás
    cajasIds: cajasIds,
    cajas: cajas,
    tipoMovimiento: row.tipo_movimiento || 'ambos',
    activo: Boolean(row.activo),
  };
};

// GET /api/medios-pago - Listar todos los medios de pago
router.get(
  '/',
  requirePermission('medios_pago.ver'),
  asyncHandler(async (_req, res) => {
    const rows = await query(`
      SELECT 
        mp.*,
        c.nombre as caja_nombre
      FROM medios_pago mp
      LEFT JOIN cajas c ON mp.caja_id = c.id
      ORDER BY mp.nombre
    `);
    const mediosPago = await Promise.all(rows.map(row => mapMedioPago(row)));
    res.json(mediosPago);
  }),
);

// GET /api/medios-pago/:id - Obtener un medio de pago por ID
router.get(
  '/:id',
  requirePermission('medios_pago'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const rows = await query(
      `SELECT 
        mp.*,
        c.nombre as caja_nombre
      FROM medios_pago mp
      LEFT JOIN cajas c ON mp.caja_id = c.id
      WHERE mp.id = ?`,
      [id],
    );
    
    if (!rows || rows.length === 0) {
      const error = new Error('Medio de pago no encontrado');
      error.status = 404;
      throw error;
    }
    
    res.json(await mapMedioPago(rows[0]));
  }),
);

// POST /api/medios-pago - Crear un nuevo medio de pago
router.post(
  '/',
  requirePermission('medios_pago.crear'),
  asyncHandler(async (req, res) => {
    const { nombre, descripcion, cajaId, cajasIds, tipoMovimiento, activo } = req.body || {};
    
    if (!nombre || nombre.trim() === '') {
      const error = new Error('El nombre es obligatorio');
      error.status = 400;
      throw error;
    }
    
    // Usar cajasIds si está presente, sino usar cajaId (compatibilidad)
    const cajasParaAsociar = Array.isArray(cajasIds) ? cajasIds : (cajaId ? [cajaId] : []);
    
    // Verificar que todas las cajas existen
    if (cajasParaAsociar.length > 0) {
      const placeholders = cajasParaAsociar.map(() => '?').join(',');
      const cajasExistentes = await query(
        `SELECT id FROM cajas WHERE id IN (${placeholders})`,
        cajasParaAsociar
      );
      
      if (cajasExistentes.length !== cajasParaAsociar.length) {
        const error = new Error('Una o más cajas no fueron encontradas');
        error.status = 404;
        throw error;
      }
    }
    
    const activoValue = activo !== undefined ? (activo ? 1 : 0) : 1;
    const tipoMovimientoValue = tipoMovimiento || 'ambos';
    
    // Usar la primera caja para compatibilidad con el campo antiguo caja_id
    const primeraCajaId = cajasParaAsociar.length > 0 ? cajasParaAsociar[0] : null;
    
    const result = await execute(
      'INSERT INTO medios_pago (nombre, descripcion, caja_id, tipo_movimiento, activo) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), descripcion || null, primeraCajaId, tipoMovimientoValue, activoValue],
    );
    
    if (!result || !result.insertId) {
      const error = new Error('Error al crear el medio de pago');
      error.status = 500;
      throw error;
    }
    
    // Asociar todas las cajas seleccionadas
    if (cajasParaAsociar.length > 0) {
      // Generar placeholders dinámicamente: (?, ?), (?, ?), ...
      const placeholders = cajasParaAsociar.map(() => '(?, ?)').join(', ');
      const valores = cajasParaAsociar.flatMap(cajaId => [result.insertId, cajaId]);
      await query(
        `INSERT INTO medio_pago_cajas (medio_pago_id, caja_id) VALUES ${placeholders}`,
        valores
      );
    }
    
    const nuevoMedio = await query(
      `SELECT 
        mp.*,
        c.nombre as caja_nombre
      FROM medios_pago mp
      LEFT JOIN cajas c ON mp.caja_id = c.id
      WHERE mp.id = ?`,
      [result.insertId],
    );
    
    if (!nuevoMedio || nuevoMedio.length === 0) {
      const error = new Error('Error al obtener el medio de pago creado');
      error.status = 500;
      throw error;
    }
    
    res.status(201).json(await mapMedioPago(nuevoMedio[0]));
  }),
);

// PUT /api/medios-pago/:id - Actualizar un medio de pago
router.put(
  '/:id',
  requirePermission('medios_pago'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, cajaId, cajasIds, tipoMovimiento, activo } = req.body || {};
    
    // Verificar que el medio de pago existe
    const existentes = await query('SELECT id FROM medios_pago WHERE id = ?', [id]);
    if (existentes.length === 0) {
      const error = new Error('Medio de pago no encontrado');
      error.status = 404;
      throw error;
    }
    
    if (!nombre || nombre.trim() === '') {
      const error = new Error('El nombre es obligatorio');
      error.status = 400;
      throw error;
    }
    
    // Usar cajasIds si está presente, sino usar cajaId (compatibilidad)
    const cajasParaAsociar = Array.isArray(cajasIds) ? cajasIds : (cajaId !== undefined && cajaId !== null ? [cajaId] : []);
    
    // Verificar que todas las cajas existen
    if (cajasParaAsociar.length > 0) {
      const placeholders = cajasParaAsociar.map(() => '?').join(',');
      const cajasExistentes = await query(
        `SELECT id FROM cajas WHERE id IN (${placeholders})`,
        cajasParaAsociar
      );
      
      if (cajasExistentes.length !== cajasParaAsociar.length) {
        const error = new Error('Una o más cajas no fueron encontradas');
        error.status = 404;
        throw error;
      }
    }
    
    const activoValue = activo !== undefined ? (activo ? 1 : 0) : null;
    
    const updates = [];
    const params = [];
    
    if (nombre) {
      updates.push('nombre = ?');
      params.push(nombre.trim());
    }
    if (descripcion !== undefined) {
      updates.push('descripcion = ?');
      params.push(descripcion || null);
    }
    
    // Actualizar caja_id con la primera caja para compatibilidad
    if (cajasIds !== undefined || cajaId !== undefined) {
      const primeraCajaId = cajasParaAsociar.length > 0 ? cajasParaAsociar[0] : null;
      updates.push('caja_id = ?');
      params.push(primeraCajaId);
    }
    
    if (tipoMovimiento !== undefined) {
      const tipoValido = ['ingreso', 'egreso', 'ambos'].includes(tipoMovimiento);
      if (!tipoValido) {
        const error = new Error('El tipo de movimiento debe ser: ingreso, egreso o ambos');
        error.status = 400;
        throw error;
      }
      updates.push('tipo_movimiento = ?');
      params.push(tipoMovimiento);
    }
    if (activoValue !== null) {
      updates.push('activo = ?');
      params.push(activoValue);
    }
    
    if (updates.length === 0 && cajasIds === undefined && cajaId === undefined) {
      const error = new Error('No hay campos para actualizar');
      error.status = 400;
      throw error;
    }
    
    // Actualizar campos del medio de pago
    if (updates.length > 0) {
      params.push(id);
      await execute(`UPDATE medios_pago SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    
    // Actualizar asociaciones de cajas si se proporcionó cajasIds
    if (cajasIds !== undefined || cajaId !== undefined) {
      // Eliminar todas las asociaciones existentes
      await execute('DELETE FROM medio_pago_cajas WHERE medio_pago_id = ?', [id]);
      
      // Crear nuevas asociaciones
      if (cajasParaAsociar.length > 0) {
        // Generar placeholders dinámicamente: (?, ?), (?, ?), ...
        const placeholders = cajasParaAsociar.map(() => '(?, ?)').join(', ');
        const valores = cajasParaAsociar.flatMap(cajaId => [id, cajaId]);
        await query(
          `INSERT INTO medio_pago_cajas (medio_pago_id, caja_id) VALUES ${placeholders}`,
          valores
        );
      }
    }
    
    const actualizado = await query(
      `SELECT 
        mp.*,
        c.nombre as caja_nombre
      FROM medios_pago mp
      LEFT JOIN cajas c ON mp.caja_id = c.id
      WHERE mp.id = ?`,
      [id],
    );
    
    if (!actualizado || actualizado.length === 0) {
      const error = new Error('Error al obtener el medio de pago actualizado');
      error.status = 500;
      throw error;
    }
    
    res.json(await mapMedioPago(actualizado[0]));
  }),
);

// DELETE /api/medios-pago/:id - Eliminar un medio de pago
router.delete(
  '/:id',
  requirePermission('medios_pago'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Obtener información del medio de pago antes de eliminarlo (para auditoría)
    const existentes = await query('SELECT id, nombre, descripcion FROM medios_pago WHERE id = ?', [id]);
    if (!existentes || existentes.length === 0) {
      const error = new Error('Medio de pago no encontrado');
      error.status = 404;
      throw error;
    }
    const medioPagoToDelete = existentes[0];
    
    // Verificar si tiene movimientos asociados
    const movimientos = await query(
      'SELECT id FROM movimientos_cajas WHERE medio_pago_id = ? LIMIT 1',
      [id],
    );
    if (movimientos && movimientos.length > 0) {
      const error = new Error('No se puede eliminar un medio de pago que tiene movimientos registrados');
      error.status = 400;
      throw error;
    }
    
    // Guardar datos para auditoría (se registrará automáticamente por el middleware)
    req.auditData = {
      datosAnteriores: {
        id: medioPagoToDelete.id,
        nombre: medioPagoToDelete.nombre,
        descripcion: medioPagoToDelete.descripcion,
      },
      datosNuevos: null, // Se eliminó, no hay datos nuevos
    };
    
    // Eliminar asociaciones de cajas (se eliminan automáticamente por CASCADE, pero lo hacemos explícito)
    await execute('DELETE FROM medio_pago_cajas WHERE medio_pago_id = ?', [id]);
    
    await execute('DELETE FROM medios_pago WHERE id = ?', [id]);
    res.status(204).send();
  }),
);

module.exports = router;

