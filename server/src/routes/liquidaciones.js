const express = require('express');
const { query, withTransaction } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { mapLiquidacionMensual, mapLiquidacionCuota } = require('../utils/format');
const { distribuirPartesEnCuotas } = require('../utils/pagosDistribucion');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, checkPermission } = require('../middleware/permissions');
const { registrarAuditoria } = require('../middleware/auditoria');

const router = express.Router();

const LIQ_MENSUALES_COLUMNS = 'id, mes, fecha_liquidacion, created_at, updated_at';
const LIQ_CUOTAS_COLUMNS = 'id, liquidacion_mensual_id, socio_id, numero_socio, apellido, nombre, categoria_id, categoria_nombre, monto, pagado, fecha_pago, medio_pago, numero_recibo, created_at, updated_at';

// Todas las rutas requieren autenticación
router.use(authenticateToken);
// Auditoría DESPUÉS de autenticación para que req.user esté disponible
router.use(registrarAuditoria);

const hoyISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

router.get(
  '/liquidaciones-mensuales',
  requirePermission('liquidaciones.ver'),
  asyncHandler(async (_req, res) => {
    const rows = await query(`SELECT ${LIQ_MENSUALES_COLUMNS} FROM liquidaciones_mensuales ORDER BY mes DESC`);
    res.json(rows.map(mapLiquidacionMensual));
  }),
);

router.post(
  '/liquidaciones-mensuales',
  requirePermission('liquidaciones.crear'),
  asyncHandler(async (req, res) => {
    const { mes, socioId: socioIdBody, reemplazarSiNoPagada } = req.body || {};
    const soloUnSocio = socioIdBody != null && Number(socioIdBody) > 0;
    const socioId = soloUnSocio ? Number(socioIdBody) : null;

    if (!mes || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
      const error = new Error('El mes es obligatorio y debe tener el formato YYYY-MM.');
      error.status = 400;
      throw error;
    }

    const fechaActual = hoyISO();

    const result = await withTransaction(async (conn) => {
      let liquidacionMensualId;
      let liquidacionExistia = false;

      const [existentes] = await conn.execute(
        'SELECT id FROM liquidaciones_mensuales WHERE mes = ? LIMIT 1',
        [mes],
      );

      if (existentes.length > 0) {
        liquidacionMensualId = existentes[0].id;
        liquidacionExistia = true;
      } else {
        const fechaLiquidacion = hoyISO();
        const [insertResult] = await conn.execute(
          'INSERT INTO liquidaciones_mensuales (mes, fecha_liquidacion) VALUES (?, ?)',
          [mes, fechaLiquidacion],
        );
        liquidacionMensualId = insertResult.insertId;
      }

      const insertarCuotasParaSocios = async (lista) => {
        if (lista.length === 0) return;
        const values = lista.map((socio) => [
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
      };

      if (soloUnSocio) {
        // Generar solo para el socio indicado
        const [socioRows] = await conn.execute(
          `SELECT 
            s.id,
            s.numero_socio,
            s.apellido,
            s.nombre,
            s.categoria_id,
            COALESCE(c.nombre, 'Sin categoría') AS categoria_nombre,
            COALESCE(c.costo_cuota, 0) AS costo_cuota
          FROM socios s
          LEFT JOIN categorias c ON c.id = s.categoria_id
          WHERE s.id = ? AND (s.fecha_baja IS NULL OR s.fecha_baja > ?)`,
          [socioId, fechaActual],
        );

        if (socioRows.length === 0) {
          const error = new Error('El socio no existe o no está activo.');
          error.status = 400;
          throw error;
        }

        const [cuotaExistente] = await conn.execute(
          'SELECT id, pagado FROM liquidaciones_cuotas WHERE liquidacion_mensual_id = ? AND socio_id = ? LIMIT 1',
          [liquidacionMensualId, socioId],
        );

        if (cuotaExistente.length > 0) {
          const cuota = cuotaExistente[0];
          if (cuota.pagado === 1) {
            const [liquidacionRows] = await conn.execute(`SELECT ${LIQ_MENSUALES_COLUMNS} FROM liquidaciones_mensuales WHERE id = ?`, [liquidacionMensualId]);
            const [cuotasRows] = await conn.execute(`SELECT ${LIQ_CUOTAS_COLUMNS} FROM liquidaciones_cuotas WHERE liquidacion_mensual_id = ?`, [liquidacionMensualId]);
            return {
              liquidacionMensual: liquidacionRows[0],
              cuotas: cuotasRows,
              sociosNuevosIncluidos: 0,
              liquidacionExistia,
              yaTeníaCuotaPagada: true,
            };
          }
          if (!reemplazarSiNoPagada) {
            const [liquidacionRows] = await conn.execute(`SELECT ${LIQ_MENSUALES_COLUMNS} FROM liquidaciones_mensuales WHERE id = ?`, [liquidacionMensualId]);
            const [cuotasRows] = await conn.execute(`SELECT ${LIQ_CUOTAS_COLUMNS} FROM liquidaciones_cuotas WHERE liquidacion_mensual_id = ?`, [liquidacionMensualId]);
            return {
              liquidacionMensual: liquidacionRows[0],
              cuotas: cuotasRows,
              sociosNuevosIncluidos: 0,
              liquidacionExistia,
              yaExisteNoPagada: true,
            };
          }
          await conn.execute('DELETE FROM liquidaciones_cuotas WHERE id = ?', [cuota.id]);
        }

        await insertarCuotasParaSocios(socioRows);
        const [liquidacionRows] = await conn.execute(`SELECT ${LIQ_MENSUALES_COLUMNS} FROM liquidaciones_mensuales WHERE id = ?`, [liquidacionMensualId]);
        const [cuotasRows] = await conn.execute(`SELECT ${LIQ_CUOTAS_COLUMNS} FROM liquidaciones_cuotas WHERE liquidacion_mensual_id = ?`, [liquidacionMensualId]);
        return {
          liquidacionMensual: liquidacionRows[0],
          cuotas: cuotasRows,
          sociosNuevosIncluidos: 1,
          liquidacionExistia,
          soloParaUnSocio: true,
        };
      }

      // Todos los socios: socios activos que no tengan cuota en esta liquidación
      const [sociosSinCuota] = await conn.execute(
        `SELECT 
          s.id,
          s.numero_socio,
          s.apellido,
          s.nombre,
          s.categoria_id,
          COALESCE(c.nombre, 'Sin categoría') AS categoria_nombre,
          COALESCE(c.costo_cuota, 0) AS costo_cuota
        FROM socios s
        LEFT JOIN categorias c ON c.id = s.categoria_id
        WHERE (s.fecha_baja IS NULL OR s.fecha_baja > ?)
        AND NOT EXISTS (
          SELECT 1 FROM liquidaciones_cuotas lc
          WHERE lc.liquidacion_mensual_id = ? AND lc.socio_id = s.id
        )`,
        [fechaActual, liquidacionMensualId],
      );

      if (sociosSinCuota.length > 0) {
        await insertarCuotasParaSocios(sociosSinCuota);
      }

      const [liquidacionRows] = await conn.execute(
        `SELECT ${LIQ_MENSUALES_COLUMNS} FROM liquidaciones_mensuales WHERE id = ?`,
        [liquidacionMensualId],
      );
      const [cuotasRows] = await conn.execute(
        `SELECT ${LIQ_CUOTAS_COLUMNS} FROM liquidaciones_cuotas WHERE liquidacion_mensual_id = ?`,
        [liquidacionMensualId],
      );

      return {
        liquidacionMensual: liquidacionRows[0],
        cuotas: cuotasRows,
        sociosNuevosIncluidos: sociosSinCuota.length,
        liquidacionExistia,
      };
    });

    const status = result.liquidacionExistia ? 200 : 201;
    const payload = {
      liquidacionMensual: mapLiquidacionMensual(result.liquidacionMensual),
      cuotas: result.cuotas.map(mapLiquidacionCuota),
      sociosNuevosIncluidos: result.sociosNuevosIncluidos ?? 0,
      liquidacionExistia: result.liquidacionExistia ?? false,
    };
    if (result.yaExisteNoPagada) payload.yaExisteNoPagada = true;
    if (result.yaTeníaCuotaPagada) payload.yaTeníaCuotaPagada = true;
    if (result.soloParaUnSocio) payload.soloParaUnSocio = true;
    res.status(status).json(payload);
  }),
);

router.post(
  '/liquidaciones-mensuales/por-socios',
  requirePermission('liquidaciones'),
  asyncHandler(async (req, res) => {
    const { socioIds, meses } = req.body || {};
    
    if (!Array.isArray(socioIds) || socioIds.length === 0) {
      const error = new Error('Debe indicar al menos un socio.');
      error.status = 400;
      throw error;
    }

    if (!Array.isArray(meses) || meses.length === 0) {
      const error = new Error('Debe indicar al menos un mes.');
      error.status = 400;
      throw error;
    }

    // Validar formato de meses
    for (const mes of meses) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
        const error = new Error(`El mes ${mes} tiene un formato inválido. Debe ser YYYY-MM.`);
        error.status = 400;
        throw error;
      }
    }

    const fechaLiquidacion = hoyISO();
    const resultados = [];

    await withTransaction(async (conn) => {
      // Obtener información de los socios
      const placeholders = socioIds.map(() => '?').join(',');
      // Obtener fecha actual para comparar con fecha_baja
      const fechaActual = hoyISO();
      
      const [socios] = await conn.execute(
        `SELECT 
          s.id,
          s.numero_socio,
          s.apellido,
          s.nombre,
          s.categoria_id,
          COALESCE(c.nombre, 'Sin categoría') AS categoria_nombre,
          COALESCE(c.costo_cuota, 0) AS costo_cuota
        FROM socios s
        LEFT JOIN categorias c ON c.id = s.categoria_id
        WHERE s.id IN (${placeholders}) 
          AND (s.fecha_baja IS NULL OR s.fecha_baja > ?)`,
        [...socioIds, fechaActual],
      );

      if (socios.length === 0) {
        const error = new Error('No se encontraron socios activos con los IDs proporcionados.');
        error.status = 404;
        throw error;
      }

      // Para cada mes, crear o usar la liquidación mensual existente
      for (const mes of meses) {
        // Verificar si ya existe la liquidación mensual
        let [existentes] = await conn.execute(
          'SELECT id FROM liquidaciones_mensuales WHERE mes = ? LIMIT 1',
          [mes],
        );

        let liquidacionMensualId;
        if (existentes.length > 0) {
          liquidacionMensualId = existentes[0].id;
        } else {
          // Crear nueva liquidación mensual
          const [insertResult] = await conn.execute(
            'INSERT INTO liquidaciones_mensuales (mes, fecha_liquidacion) VALUES (?, ?)',
            [mes, fechaLiquidacion],
          );
          liquidacionMensualId = insertResult.insertId;
        }

        // Verificar cuotas existentes para estos socios en este mes
        const sociosPlaceholders = socios.map(() => '?').join(',');
        const [cuotasExistentes] = await conn.execute(
          `SELECT socio_id FROM liquidaciones_cuotas 
           WHERE liquidacion_mensual_id = ? AND socio_id IN (${sociosPlaceholders})`,
          [liquidacionMensualId, ...socios.map(s => s.id)],
        );

        const sociosIdsExistentes = new Set(cuotasExistentes.map(c => c.socio_id));
        const sociosParaCrear = socios.filter(s => !sociosIdsExistentes.has(s.id));

        if (sociosParaCrear.length > 0) {
          const values = sociosParaCrear.map((socio) => [
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

        // Solo crear cuotas para los socios indicados en la petición (no agregar otros socios activos)
        const [liquidacionRows] = await conn.execute(
          `SELECT ${LIQ_MENSUALES_COLUMNS} FROM liquidaciones_mensuales WHERE id = ?`,
          [liquidacionMensualId],
        );
        const [cuotasRows] = await conn.execute(
          `SELECT ${LIQ_CUOTAS_COLUMNS}
           FROM liquidaciones_cuotas
           WHERE liquidacion_mensual_id = ? AND socio_id IN (${sociosPlaceholders})`,
          [liquidacionMensualId, ...socios.map(s => s.id)],
        );

        resultados.push({
          mes,
          liquidacionMensual: mapLiquidacionMensual(liquidacionRows[0]),
          cuotas: cuotasRows.map(mapLiquidacionCuota),
          cuotasCreadas: sociosParaCrear.length,
          cuotasExistentes: cuotasExistentes.length,
        });
      }
    });

    res.status(201).json({
      resultados,
      totalMeses: resultados.length,
      totalCuotasCreadas: resultados.reduce((sum, r) => sum + r.cuotasCreadas, 0),
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
  requirePermission('pagos.ver'),
  asyncHandler(async (req, res) => {
    const { where, values } = buildCuotasFilters(req.query);
    const rows = await query(
      `SELECT ${LIQ_CUOTAS_COLUMNS} FROM liquidaciones_cuotas ${where} ORDER BY liquidacion_mensual_id DESC, id ASC`,
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

    let numeroRecibo;
    await withTransaction(async (conn) => {
      // Obtener próximo número de recibo correlativo
      await conn.execute('UPDATE secuencia_recibos SET ultimo_numero = ultimo_numero + 1 WHERE id = 1');
      const [[row]] = await conn.execute('SELECT ultimo_numero FROM secuencia_recibos WHERE id = 1');
      numeroRecibo = row?.ultimo_numero ?? 1;

      const [cuotasRows] = await conn.execute(
        `SELECT ${LIQ_CUOTAS_COLUMNS} FROM liquidaciones_cuotas WHERE id IN (${ids.map(() => '?').join(',')})`,
        [...ids],
      );

      const totalCuotas = cuotasRows.reduce((sum, c) => sum + Number(c.monto || 0), 0);
      if (totalCuotas <= 0) {
        const error = new Error('El total de las cuotas seleccionadas debe ser mayor a 0.');
        error.status = 400;
        throw error;
      }

      const partesMedio = descripcionMedio.split(',').map((p) => p.trim());
      const partes = [];
      for (const parte of partesMedio) {
        const match = parte.match(/^(.+?):\s*\$\s*([\d,]+\.?\d*)$/);
        if (match) {
          const nombreMedio = match[1].trim();
          const montoStr = match[2].replace(/,/g, '');
          const montoTotal = parseFloat(montoStr);
          if (!isNaN(montoTotal) && montoTotal > 0) {
            partes.push({ nombreMedio, montoTotal });
          }
        }
      }

      const montosCuotas = cuotasRows.map((c) => Number(c.monto || 0));
      const montosPorPartePorCuota = distribuirPartesEnCuotas(partes, montosCuotas);

      // medio_pago por cuota: "Efectivo: $500, Transferencia: $333.33"
      const medioPagoPorCuota = cuotasRows.map((_, cuotaIdx) =>
        partes
          .map((p, parteIdx) => `${p.nombreMedio}: $${(montosPorPartePorCuota[parteIdx][cuotaIdx] || 0).toFixed(2)}`)
          .join(', '),
      );

      for (let i = 0; i < cuotasRows.length; i++) {
        await conn.execute(
          `UPDATE liquidaciones_cuotas 
           SET pagado = 1, fecha_pago = ?, medio_pago = ?, numero_recibo = ?
           WHERE id = ?`,
          [pagoFecha, medioPagoPorCuota[i], numeroRecibo, cuotasRows[i].id],
        );
      }

      for (let parteIdx = 0; parteIdx < partes.length; parteIdx++) {
        const parte = partes[parteIdx];
        const [mediosRows] = await conn.execute(
          'SELECT id, caja_id FROM medios_pago WHERE nombre = ? AND activo = 1 LIMIT 1',
          [parte.nombreMedio],
        );
        if (mediosRows.length === 0 || !mediosRows[0].caja_id) continue;

        const medioPagoId = mediosRows[0].id;
        const cajaId = mediosRows[0].caja_id;

        for (let i = 0; i < cuotasRows.length; i++) {
          const montoMovimiento = montosPorPartePorCuota[parteIdx][i];
          if (montoMovimiento <= 0) continue;

          const cuota = cuotasRows[i];
          const concepto = `Cobro de cuota - Socio ${cuota.numero_socio}`;
          const descripcion = `Cobro de 1 cuota mediante ${parte.nombreMedio}`;

          await conn.execute(
            `INSERT INTO movimientos_cajas 
             (caja_id, tipo, monto, concepto, descripcion, medio_pago_id, liquidacion_cuota_id, fecha) 
             VALUES (?, 'ingreso', ?, ?, ?, ?, ?, ?)`,
            [cajaId, montoMovimiento, concepto, descripcion, medioPagoId, cuota.id, pagoFecha],
          );
        }
      }
    });

    const rows = await query(
      `SELECT ${LIQ_CUOTAS_COLUMNS} FROM liquidaciones_cuotas WHERE id IN (${ids.map(() => '?').join(',')})`,
      [...ids],
    );
    
    // Calcular total para incluir en la respuesta (útil para auditoría)
    const total = rows.reduce((sum, row) => sum + Number(row.monto || 0), 0);
    
    const cuotas = rows.map(mapLiquidacionCuota);
    
    // Devolver objeto con cuotas y numeroRecibo (JSON no serializa propiedades no indexadas en arrays)
    res.json({
      cuotas,
      numeroRecibo,
      total,
      cantidad: rows.length,
      medioPago: descripcionMedio,
    });
  }),
);

router.patch(
  '/liquidaciones-cuotas/:id/pagar',
  requirePermission('pagos'),
  asyncHandler(async (req, res) => {
    const cuotaId = Number(req.params.id);
    const { medioPago, fechaPago } = req.body || {};

    const numeroRecibo = await withTransaction(async (conn) => {
      await conn.execute('UPDATE secuencia_recibos SET ultimo_numero = ultimo_numero + 1 WHERE id = 1');
      const [[row]] = await conn.execute('SELECT ultimo_numero FROM secuencia_recibos WHERE id = 1');
      const num = row?.ultimo_numero ?? 1;
      await conn.execute(
        `UPDATE liquidaciones_cuotas 
         SET pagado = 1, fecha_pago = ?, medio_pago = ?, numero_recibo = ?
         WHERE id = ?`,
        [fechaPago || hoyISO(), medioPago || 'Efectivo', num, cuotaId],
      );
      return num;
    });

    const rows = await query(`SELECT ${LIQ_CUOTAS_COLUMNS} FROM liquidaciones_cuotas WHERE id = ?`, [cuotaId]);
    if (rows.length === 0) {
      const error = new Error('Liquidación de cuota no encontrada.');
      error.status = 404;
      throw error;
    }

    const cuota = mapLiquidacionCuota(rows[0]);
    cuota.numeroRecibo = numeroRecibo;
    res.json(cuota);
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

    const rows = await query(`SELECT ${LIQ_CUOTAS_COLUMNS} FROM liquidaciones_cuotas WHERE id = ?`, [cuotaId]);
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

// IMPORTANTE: Las rutas de exportar deben ir ANTES de cualquier ruta POST genérica
// POST /api/liquidaciones/exportar - Registrar exportación (PDF, Excel, etc.)
router.post(
  '/exportar',
  requirePermission('liquidaciones.ver'),
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

// POST /api/liquidaciones/exportar-tesoreria - Registrar exportación de tesorería
router.post(
  '/exportar-tesoreria',
  requirePermission('liquidaciones.ver'),
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


