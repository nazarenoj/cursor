const express = require('express');
const { query, execute, withTransaction } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria } = require('../middleware/auditoria');

const router = express.Router();

const CAJAS_COLUMNS = 'id, nombre, descripcion, saldo_inicial, activa, created_at, updated_at';

// Todas las rutas requieren autenticación
router.use(authenticateToken);
// Auditoría DESPUÉS de autenticación para que req.user esté disponible
router.use(registrarAuditoria);

// Mapear resultados de la BD
const mapCaja = (row) => ({
  id: row.id,
  nombre: row.nombre,
  descripcion: row.descripcion || null,
  saldoInicial: Number(row.saldo_inicial),
  activa: Boolean(row.activa),
});

// Calcular saldo actual de una caja
const calcularSaldo = async (cajaId) => {
  const movimientos = await query(
    `SELECT 
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
      COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) as total_egresos
    FROM movimientos_cajas 
    WHERE caja_id = ?`,
    [cajaId],
  );
  
  const caja = await query('SELECT saldo_inicial FROM cajas WHERE id = ?', [cajaId]);
  const saldoInicial = caja && caja.length > 0 ? Number(caja[0].saldo_inicial) : 0;
  
  const totalIngresos = Number(movimientos && movimientos[0] ? movimientos[0].total_ingresos : 0);
  const totalEgresos = Number(movimientos && movimientos[0] ? movimientos[0].total_egresos : 0);
  
  return saldoInicial + totalIngresos - totalEgresos;
};

// GET /api/cajas - Listar todas las cajas
router.get(
  '/',
  requirePermission('cajas.ver'),
  asyncHandler(async (_req, res) => {
    const rows = await query(`SELECT ${CAJAS_COLUMNS} FROM cajas ORDER BY nombre`);
    const cajas = rows.map(mapCaja);
    
    // Calcular saldo actual para cada caja
    const cajasConSaldo = await Promise.all(
      cajas.map(async (caja) => ({
        ...caja,
        saldoActual: await calcularSaldo(caja.id),
      })),
    );
    
    res.json(cajasConSaldo);
  }),
);

// GET /api/cajas/:id - Obtener una caja por ID
router.get(
  '/:id',
  requirePermission('cajas.ver'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const rows = await query(`SELECT ${CAJAS_COLUMNS} FROM cajas WHERE id = ?`, [id]);
    
    if (!rows || rows.length === 0) {
      const error = new Error('Caja no encontrada');
      error.status = 404;
      throw error;
    }
    
    const caja = mapCaja(rows[0]);
    caja.saldoActual = await calcularSaldo(caja.id);
    
    res.json(caja);
  }),
);

// POST /api/cajas - Crear una nueva caja
router.post(
  '/',
  requirePermission('cajas.crear'),
  asyncHandler(async (req, res) => {
    const { nombre, descripcion, saldoInicial, activa } = req.body || {};
    
    if (!nombre || nombre.trim() === '') {
      const error = new Error('El nombre es obligatorio');
      error.status = 400;
      throw error;
    }
    
    const saldo = Number(saldoInicial) || 0;
    const activaValue = activa !== undefined ? (activa ? 1 : 0) : 1;
    
    const result = await execute(
      'INSERT INTO cajas (nombre, descripcion, saldo_inicial, activa) VALUES (?, ?, ?, ?)',
      [nombre.trim(), descripcion || null, saldo, activaValue],
    );
    
    if (!result || !result.insertId) {
      const error = new Error('Error al crear la caja');
      error.status = 500;
      throw error;
    }
    
    const nuevaCaja = await query(`SELECT ${CAJAS_COLUMNS} FROM cajas WHERE id = ?`, [result.insertId]);
    if (!nuevaCaja || nuevaCaja.length === 0) {
      const error = new Error('Error al obtener la caja creada');
      error.status = 500;
      throw error;
    }
    
    const caja = mapCaja(nuevaCaja[0]);
    caja.saldoActual = await calcularSaldo(caja.id);
    
    res.status(201).json(caja);
  }),
);

// PUT /api/cajas/:id - Actualizar una caja
router.put(
  '/:id',
  requirePermission('cajas'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, saldoInicial, activa } = req.body || {};
    
    // Verificar que la caja existe
    const existentes = await query('SELECT id FROM cajas WHERE id = ?', [id]);
    if (existentes.length === 0) {
      const error = new Error('Caja no encontrada');
      error.status = 404;
      throw error;
    }
    
    if (!nombre || nombre.trim() === '') {
      const error = new Error('El nombre es obligatorio');
      error.status = 400;
      throw error;
    }
    
    const saldo = saldoInicial !== undefined ? Number(saldoInicial) : null;
    const activaValue = activa !== undefined ? (activa ? 1 : 0) : null;
    
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
    if (saldo !== null) {
      // Solo prohibir modificar el saldo inicial si hay movimientos Y el valor cambia
      const movimientos = await query('SELECT id FROM movimientos_cajas WHERE caja_id = ? LIMIT 1', [id]);
      const current = await query('SELECT saldo_inicial FROM cajas WHERE id = ?', [id]);
      const saldoActual = current && current[0] ? Number(current[0].saldo_inicial) : 0;
      if (movimientos && movimientos.length > 0 && saldo !== saldoActual) {
        const error = new Error('No se puede modificar el saldo inicial de una caja que ya tiene movimientos registrados');
        error.status = 400;
        throw error;
      }
      // Solo incluir saldo_inicial en el UPDATE si no tiene movimientos (si tiene movimientos, el valor no puede cambiar)
      if (!movimientos || movimientos.length === 0) {
        updates.push('saldo_inicial = ?');
        params.push(saldo);
      }
    }
    if (activaValue !== null) {
      updates.push('activa = ?');
      params.push(activaValue);
    }
    
    if (updates.length === 0) {
      const error = new Error('No hay campos para actualizar');
      error.status = 400;
      throw error;
    }
    
    params.push(id);
    await execute(`UPDATE cajas SET ${updates.join(', ')} WHERE id = ?`, params);
    
    const actualizada = await query(`SELECT ${CAJAS_COLUMNS} FROM cajas WHERE id = ?`, [id]);
    if (!actualizada || actualizada.length === 0) {
      const error = new Error('Error al obtener la caja actualizada');
      error.status = 500;
      throw error;
    }
    const caja = mapCaja(actualizada[0]);
    caja.saldoActual = await calcularSaldo(caja.id);
    
    res.json(caja);
  }),
);

// DELETE /api/cajas/:id - Eliminar una caja
router.delete(
  '/:id',
  requirePermission('cajas'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Obtener información de la caja antes de eliminarla (para auditoría)
    const existentes = await query('SELECT id, nombre, descripcion FROM cajas WHERE id = ?', [id]);
    if (existentes.length === 0) {
      const error = new Error('Caja no encontrada');
      error.status = 404;
      throw error;
    }
    const cajaToDelete = existentes[0];
    
    // Verificar si tiene movimientos
    const movimientos = await query('SELECT id FROM movimientos_cajas WHERE caja_id = ? LIMIT 1', [id]);
    if (movimientos && movimientos.length > 0) {
      const error = new Error('No se puede eliminar una caja que tiene movimientos registrados');
      error.status = 400;
      throw error;
    }
    
    // Verificar si tiene medios de pago asociados
    const medios = await query('SELECT id FROM medios_pago WHERE caja_id = ? LIMIT 1', [id]);
    if (medios && medios.length > 0) {
      const error = new Error('No se puede eliminar una caja que tiene medios de pago asociados');
      error.status = 400;
      throw error;
    }
    
    // Guardar datos para auditoría (se registrará automáticamente por el middleware)
    req.auditData = {
      datosAnteriores: {
        id: cajaToDelete.id,
        nombre: cajaToDelete.nombre,
        descripcion: cajaToDelete.descripcion,
      },
      datosNuevos: null, // Se eliminó, no hay datos nuevos
    };
    
    await execute('DELETE FROM cajas WHERE id = ?', [id]);
    res.status(204).send();
  }),
);

// GET /api/cajas/:id/movimientos - Obtener movimientos de una caja
router.get(
  '/:id/movimientos',
  requirePermission('cajas'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fechaDesde, fechaHasta, tipo } = req.query;
    
    let sql = `
      SELECT 
        mc.*,
        c.nombre as caja_nombre,
        mp.nombre as medio_pago_nombre,
        lc.apellido as socio_apellido,
        lc.nombre as socio_nombre
      FROM movimientos_cajas mc
      INNER JOIN cajas c ON mc.caja_id = c.id
      LEFT JOIN medios_pago mp ON mc.medio_pago_id = mp.id
      LEFT JOIN liquidaciones_cuotas lc ON mc.liquidacion_cuota_id = lc.id
      WHERE mc.caja_id = ?
    `;
    const params = [id];
    
    if (fechaDesde) {
      sql += ' AND mc.fecha >= ?';
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      sql += ' AND mc.fecha <= ?';
      params.push(fechaHasta);
    }
    if (tipo) {
      sql += ' AND mc.tipo = ?';
      params.push(tipo);
    }
    
    sql += ' ORDER BY mc.fecha DESC, mc.created_at DESC';
    
    const rows = await query(sql, params);
    
    const movimientos = rows.map((row) => ({
      id: row.id,
      cajaId: row.caja_id,
      cajaNombre: row.caja_nombre,
      tipo: row.tipo,
      monto: Number(row.monto),
      concepto: row.concepto,
      descripcion: row.descripcion || null,
      medioPagoId: row.medio_pago_id,
      medioPagoNombre: row.medio_pago_nombre || null,
      liquidacionCuotaId: row.liquidacion_cuota_id,
      socioNombre: row.socio_nombre || null,
      socioApellido: row.socio_apellido || null,
      fecha: row.fecha,
      createdAt: row.created_at,
    }));
    
    res.json(movimientos);
  }),
);

// POST /api/cajas/:id/movimientos - Registrar un movimiento (ingreso o egreso)
router.post(
  '/:id/movimientos',
  requirePermission('cajas'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { tipo, monto, concepto, descripcion, medioPagoId, fecha } = req.body || {};
    
    // Verificar que la caja existe
    const existentes = await query('SELECT id FROM cajas WHERE id = ?', [id]);
    if (existentes.length === 0) {
      const error = new Error('Caja no encontrada');
      error.status = 404;
      throw error;
    }
    
    if (!tipo || !['ingreso', 'egreso'].includes(tipo)) {
      const error = new Error('El tipo debe ser "ingreso" o "egreso"');
      error.status = 400;
      throw error;
    }
    
    if (!monto || Number(monto) <= 0) {
      const error = new Error('El monto debe ser mayor a 0');
      error.status = 400;
      throw error;
    }
    
    if (!concepto || concepto.trim() === '') {
      const error = new Error('El concepto es obligatorio');
      error.status = 400;
      throw error;
    }
    
    // Asegurar que la fecha esté en formato YYYY-MM-DD sin conversión de zona horaria
    let fechaMovimiento;
    if (fecha) {
      // Validar que la fecha esté en formato YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const error = new Error('Formato de fecha inválido. Debe ser YYYY-MM-DD');
        error.status = 400;
        throw error;
      }
      // Usar la fecha directamente del formulario
      fechaMovimiento = fecha;
    } else {
      // Si no viene fecha, usar la fecha actual local en formato YYYY-MM-DD
      const ahora = new Date();
      const año = ahora.getFullYear();
      const mes = String(ahora.getMonth() + 1).padStart(2, '0');
      const dia = String(ahora.getDate()).padStart(2, '0');
      fechaMovimiento = `${año}-${mes}-${dia}`;
    }
    
    // Insertar la fecha directamente como string YYYY-MM-DD
    // MySQL interpretará correctamente este formato sin conversión de zona horaria
    const result = await execute(
      `INSERT INTO movimientos_cajas 
       (caja_id, tipo, monto, concepto, descripcion, medio_pago_id, fecha) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, tipo, Number(monto), concepto.trim(), descripcion || null, medioPagoId || null, fechaMovimiento],
    );
    
    if (!result || !result.insertId) {
      const error = new Error('Error al registrar el movimiento');
      error.status = 500;
      throw error;
    }
    
    const movimiento = await query(
      `SELECT 
        mc.*,
        c.nombre as caja_nombre,
        mp.nombre as medio_pago_nombre
      FROM movimientos_cajas mc
      INNER JOIN cajas c ON mc.caja_id = c.id
      LEFT JOIN medios_pago mp ON mc.medio_pago_id = mp.id
      WHERE mc.id = ?`,
      [result.insertId],
    );
    
    if (!movimiento || movimiento.length === 0) {
      const error = new Error('Error al obtener el movimiento registrado');
      error.status = 500;
      throw error;
    }
    
    const mov = {
      id: movimiento[0].id,
      cajaId: movimiento[0].caja_id,
      cajaNombre: movimiento[0].caja_nombre,
      tipo: movimiento[0].tipo,
      monto: Number(movimiento[0].monto),
      concepto: movimiento[0].concepto,
      descripcion: movimiento[0].descripcion || null,
      medioPagoId: movimiento[0].medio_pago_id,
      medioPagoNombre: movimiento[0].medio_pago_nombre || null,
      liquidacionCuotaId: movimiento[0].liquidacion_cuota_id,
      fecha: movimiento[0].fecha,
      createdAt: movimiento[0].created_at,
    };
    
    res.status(201).json(mov);
  }),
);

// POST /api/cajas/transferir - Transferir dinero entre cajas
router.post(
  '/transferir',
  requirePermission('cajas.movimientos'),
  asyncHandler(async (req, res) => {
    const { cajaOrigenId, cajaDestinoId, monto, concepto, descripcion, fecha } = req.body || {};

    if (!cajaOrigenId || !cajaDestinoId) {
      const error = new Error('Debe especificar caja origen y destino');
      error.status = 400;
      throw error;
    }

    if (cajaOrigenId === cajaDestinoId) {
      const error = new Error('La caja origen y destino no pueden ser la misma');
      error.status = 400;
      throw error;
    }

    if (!monto || monto <= 0) {
      const error = new Error('El monto debe ser mayor a cero');
      error.status = 400;
      throw error;
    }

    if (!concepto || concepto.trim() === '') {
      const error = new Error('El concepto es obligatorio');
      error.status = 400;
      throw error;
    }

    // Verificar que ambas cajas existen y están activas
    const [cajaOrigen] = await query(`SELECT ${CAJAS_COLUMNS} FROM cajas WHERE id = ? AND activa = 1`, [cajaOrigenId]);
    if (!cajaOrigen) {
      const error = new Error('Caja origen no encontrada o inactiva');
      error.status = 404;
      throw error;
    }

    const [cajaDestino] = await query(`SELECT ${CAJAS_COLUMNS} FROM cajas WHERE id = ? AND activa = 1`, [cajaDestinoId]);
    if (!cajaDestino) {
      const error = new Error('Caja destino no encontrada o inactiva');
      error.status = 404;
      throw error;
    }

    // Calcular saldo actual de la caja origen
    const saldoOrigen = await calcularSaldo(cajaOrigenId);
    if (saldoOrigen < monto) {
      const error = new Error(`El saldo de la caja origen ($${saldoOrigen.toFixed(2)}) es insuficiente`);
      error.status = 400;
      throw error;
    }

    // Asegurar que la fecha esté en formato YYYY-MM-DD sin conversión de zona horaria
    let fechaMovimiento;
    if (fecha) {
      // Validar que la fecha esté en formato YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const error = new Error('Formato de fecha inválido. Debe ser YYYY-MM-DD');
        error.status = 400;
        throw error;
      }
      // Usar la fecha directamente del formulario
      fechaMovimiento = fecha;
    } else {
      // Si no viene fecha, usar la fecha actual local en formato YYYY-MM-DD
      const ahora = new Date();
      const año = ahora.getFullYear();
      const mes = String(ahora.getMonth() + 1).padStart(2, '0');
      const dia = String(ahora.getDate()).padStart(2, '0');
      fechaMovimiento = `${año}-${mes}-${dia}`;
    }
    const conceptoTransferencia = concepto.trim();
    const descripcionTransferencia = descripcion ? descripcion.trim() : null;

    // Realizar la transferencia en una transacción
    const resultado = await withTransaction(async (conn) => {
      // Registrar egreso en caja origen
      const conceptoOrigen = `Transferencia a ${cajaDestino.nombre} - ${conceptoTransferencia}`;
      const [resultOrigen] = await conn.execute(
        `INSERT INTO movimientos_cajas (caja_id, tipo, monto, concepto, descripcion, fecha)
         VALUES (?, 'egreso', ?, ?, ?, ?)`,
        [cajaOrigenId, monto, conceptoOrigen, descripcionTransferencia, fechaMovimiento],
      );

      // Registrar ingreso en caja destino
      const conceptoDestino = `Transferencia de ${cajaOrigen.nombre} - ${conceptoTransferencia}`;
      const [resultDestino] = await conn.execute(
        `INSERT INTO movimientos_cajas (caja_id, tipo, monto, concepto, descripcion, fecha)
         VALUES (?, 'ingreso', ?, ?, ?, ?)`,
        [cajaDestinoId, monto, conceptoDestino, descripcionTransferencia, fechaMovimiento],
      );

      // Obtener los movimientos creados
      const [movimientoOrigenRows] = await conn.execute(
        `SELECT 
          mc.*,
          c.nombre as caja_nombre
        FROM movimientos_cajas mc
        INNER JOIN cajas c ON mc.caja_id = c.id
        WHERE mc.id = ?`,
        [resultOrigen.insertId],
      );

      const [movimientoDestinoRows] = await conn.execute(
        `SELECT 
          mc.*,
          c.nombre as caja_nombre
        FROM movimientos_cajas mc
        INNER JOIN cajas c ON mc.caja_id = c.id
        WHERE mc.id = ?`,
        [resultDestino.insertId],
      );

      return {
        cajaOrigen: cajaOrigen.nombre,
        cajaDestino: cajaDestino.nombre,
        monto: monto,
        concepto: conceptoTransferencia,
        movimientoOrigen: {
          id: movimientoOrigenRows[0].id,
          cajaId: movimientoOrigenRows[0].caja_id,
          cajaNombre: movimientoOrigenRows[0].caja_nombre,
          tipo: movimientoOrigenRows[0].tipo,
          monto: Number(movimientoOrigenRows[0].monto),
          concepto: movimientoOrigenRows[0].concepto,
          descripcion: movimientoOrigenRows[0].descripcion || null,
          medioPagoId: movimientoOrigenRows[0].medio_pago_id,
          medioPagoNombre: null,
          liquidacionCuotaId: movimientoOrigenRows[0].liquidacion_cuota_id,
          socioNombre: null,
          socioApellido: null,
          fecha: movimientoOrigenRows[0].fecha,
          createdAt: movimientoOrigenRows[0].created_at,
        },
        movimientoDestino: {
          id: movimientoDestinoRows[0].id,
          cajaId: movimientoDestinoRows[0].caja_id,
          cajaNombre: movimientoDestinoRows[0].caja_nombre,
          tipo: movimientoDestinoRows[0].tipo,
          monto: Number(movimientoDestinoRows[0].monto),
          concepto: movimientoDestinoRows[0].concepto,
          descripcion: movimientoDestinoRows[0].descripcion || null,
          medioPagoId: movimientoDestinoRows[0].medio_pago_id,
          medioPagoNombre: null,
          liquidacionCuotaId: movimientoDestinoRows[0].liquidacion_cuota_id,
          socioNombre: null,
          socioApellido: null,
          fecha: movimientoDestinoRows[0].fecha,
          createdAt: movimientoDestinoRows[0].created_at,
        },
      };
    });

    res.status(201).json(resultado);
  }),
);

// IMPORTANTE: La ruta /exportar debe ir ANTES de cualquier ruta POST genérica
// POST /api/cajas/exportar - Registrar exportación (PDF, Excel, etc.)
router.post(
  '/exportar',
  requirePermission('cajas.ver'),
  asyncHandler(async (req, res) => {
    const { tipo, filtros } = req.body || {};
    res.json({ 
      message: 'Exportación registrada',
      tipo: tipo || 'PDF',
      filtros: filtros || {}
    });
  }),
);

module.exports = router;

