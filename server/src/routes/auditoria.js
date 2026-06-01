const express = require('express');
const { query } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/auditoria - Listar registros de auditoría
router.get(
  '/auditoria',
  requirePermission('auditoria.ver'),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      usuario_id,
      modulo,
      accion,
      fecha_desde,
      fecha_hasta,
      resultado,
    } = req.query;

    // Asegurar que page y limit son números válidos
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit, 10) || 50)); // Máximo 1000 registros
    const offset = (pageNum - 1) * limitNum;
    
    const condiciones = [];
    const params = [];

    if (usuario_id) {
      const userId = parseInt(usuario_id, 10);
      if (!isNaN(userId)) {
        condiciones.push('a.usuario_id = ?');
        params.push(userId);
      }
    }

    if (modulo) {
      condiciones.push('a.modulo = ?');
      params.push(String(modulo).trim());
    }

    if (accion) {
      condiciones.push('a.accion = ?');
      params.push(String(accion).trim());
    }

    if (fecha_desde) {
      condiciones.push('DATE(a.created_at) >= ?');
      params.push(String(fecha_desde).trim());
    }

    if (fecha_hasta) {
      condiciones.push('DATE(a.created_at) <= ?');
      params.push(String(fecha_hasta).trim());
    }

    if (resultado) {
      condiciones.push('a.resultado = ?');
      params.push(String(resultado).trim());
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total (usar copia de params para no modificar el original)
    const countParams = [...params];
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM auditoria a ${whereClause}`,
      countParams
    );
    const total = countResult.total;

    // Obtener registros
    // Asegurar que limitNum y offset son números enteros válidos
    // NOTA: MySQL no acepta LIMIT y OFFSET como parámetros preparados en algunas versiones
    // Por lo tanto, usamos valores literales en lugar de placeholders
    const finalLimit = parseInt(String(limitNum), 10);
    const finalOffset = parseInt(String(offset), 10);
    
    // Validar que son números válidos
    if (isNaN(finalLimit) || finalLimit <= 0 || finalLimit > 1000) {
      throw new Error('Invalid limit parameter');
    }
    if (isNaN(finalOffset) || finalOffset < 0) {
      throw new Error('Invalid offset parameter');
    }
    
    // Construir SQL con LIMIT y OFFSET como valores literales (no parámetros preparados)
    // Esto evita el error "Incorrect arguments to mysqld_stmt_execute"
    // Solo los parámetros de filtros se pasan como parámetros preparados
    const sql = `SELECT 
        a.id,
        a.usuario_id as usuarioId,
        a.usuario_nombre as usuarioNombre,
        a.accion,
        a.modulo,
        a.descripcion,
        a.metodo_http as metodoHttp,
        a.ruta,
        a.ip_address as ipAddress,
        a.user_agent as userAgent,
        a.datos_anteriores as datosAnteriores,
        a.datos_nuevos as datosNuevos,
        a.resultado,
        a.mensaje_error as mensajeError,
        a.created_at as createdAt
      FROM auditoria a
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ${finalLimit} OFFSET ${finalOffset}`;
    
    // Debug: verificar que los parámetros son correctos
    console.log('[AUDITORIA] WHERE params:', params.length);
    console.log('[AUDITORIA] Limit:', finalLimit, 'Offset:', finalOffset);
    console.log('[AUDITORIA] SQL LIMIT/OFFSET como literales');
    
    // Ejecutar query solo con parámetros de filtros (sin LIMIT/OFFSET)
    const rows = await query(sql, params);

    // Parsear JSON si existe
    const registros = rows.map(row => {
      if (row.datosAnteriores && typeof row.datosAnteriores === 'string') {
        try {
          row.datosAnteriores = JSON.parse(row.datosAnteriores);
        } catch (e) {
          // Si no es JSON válido, dejarlo como está
        }
      }
      if (row.datosNuevos && typeof row.datosNuevos === 'string') {
        try {
          row.datosNuevos = JSON.parse(row.datosNuevos);
        } catch (e) {
          // Si no es JSON válido, dejarlo como está
        }
      }
      return row;
    });

    res.json({
      registros,
      paginacion: {
        pagina: pageNum,
        limite: limitNum,
        total,
        totalPaginas: Math.ceil(total / limitNum),
      },
    });
  })
);

// GET /api/auditoria/estadisticas - Obtener estadísticas de auditoría
router.get(
  '/auditoria/estadisticas',
  requirePermission('auditoria.ver'),
  asyncHandler(async (_req, res) => {
    // Acciones más frecuentes
    const accionesFrecuentes = await query(`
      SELECT accion, COUNT(*) as cantidad
      FROM auditoria
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY accion
      ORDER BY cantidad DESC
      LIMIT 10
    `);

    // Módulos más utilizados
    const modulosFrecuentes = await query(`
      SELECT modulo, COUNT(*) as cantidad
      FROM auditoria
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY modulo
      ORDER BY cantidad DESC
      LIMIT 10
    `);

    // Usuarios más activos
    const usuariosActivos = await query(`
      SELECT usuario_nombre, COUNT(*) as cantidad
      FROM auditoria
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND usuario_id IS NOT NULL
      GROUP BY usuario_id, usuario_nombre
      ORDER BY cantidad DESC
      LIMIT 10
    `);

    // Actividad por día (últimos 30 días)
    const actividadDiaria = await query(`
      SELECT 
        DATE(created_at) as fecha,
        COUNT(*) as cantidad
      FROM auditoria
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY fecha DESC
    `);

    // Errores recientes
    const errores = await query(`
      SELECT COUNT(*) as total
      FROM auditoria
      WHERE resultado = 'error'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({
      accionesFrecuentes,
      modulosFrecuentes,
      usuariosActivos,
      actividadDiaria,
      erroresRecientes: errores[0]?.total || 0,
    });
  })
);

// GET /api/auditoria/exportar - Obtener todos los registros que coincidan con filtros (para exportar antes de borrar)
router.get(
  '/auditoria/exportar',
  requirePermission('auditoria.ver'),
  asyncHandler(async (req, res) => {
    const {
      usuario_id,
      modulo,
      accion,
      fecha_desde,
      fecha_hasta,
      resultado,
    } = req.query;

    const condiciones = [];
    const params = [];

    if (usuario_id) {
      const userId = parseInt(usuario_id, 10);
      if (!isNaN(userId)) {
        condiciones.push('a.usuario_id = ?');
        params.push(userId);
      }
    }
    if (modulo) {
      condiciones.push('a.modulo = ?');
      params.push(String(modulo).trim());
    }
    if (accion) {
      condiciones.push('a.accion = ?');
      params.push(String(accion).trim());
    }
    if (fecha_desde) {
      condiciones.push('DATE(a.created_at) >= ?');
      params.push(String(fecha_desde).trim());
    }
    if (fecha_hasta) {
      condiciones.push('DATE(a.created_at) <= ?');
      params.push(String(fecha_hasta).trim());
    }
    if (resultado) {
      condiciones.push('a.resultado = ?');
      params.push(String(resultado).trim());
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const rows = await query(`
      SELECT 
        a.id,
        a.usuario_id as usuarioId,
        a.usuario_nombre as usuarioNombre,
        a.accion,
        a.modulo,
        a.descripcion,
        a.metodo_http as metodoHttp,
        a.ruta,
        a.ip_address as ipAddress,
        a.resultado,
        a.created_at as createdAt
      FROM auditoria a
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT 50000
    `, params);

    res.json({ registros: rows });
  })
);

// GET /api/auditoria/:id - Obtener un registro específico
router.get(
  '/auditoria/:id',
  requirePermission('auditoria.ver'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [row] = await query(
      `SELECT 
        a.id,
        a.usuario_id as usuarioId,
        a.usuario_nombre as usuarioNombre,
        a.accion,
        a.modulo,
        a.descripcion,
        a.metodo_http as metodoHttp,
        a.ruta,
        a.ip_address as ipAddress,
        a.user_agent as userAgent,
        a.datos_anteriores as datosAnteriores,
        a.datos_nuevos as datosNuevos,
        a.resultado,
        a.mensaje_error as mensajeError,
        a.created_at as createdAt,
        u.usuario as usuario_completo
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.id = ?`,
      [id]
    );

    if (!row) {
      const error = new Error('Registro de auditoría no encontrado');
      error.status = 404;
      throw error;
    }

    // Parsear JSON si existe
    if (row.datosAnteriores && typeof row.datosAnteriores === 'string') {
      try {
        row.datosAnteriores = JSON.parse(row.datosAnteriores);
      } catch (e) {
        // Si no es JSON válido, dejarlo como está
      }
    }

    if (row.datosNuevos && typeof row.datosNuevos === 'string') {
      try {
        row.datosNuevos = JSON.parse(row.datosNuevos);
      } catch (e) {
        // Si no es JSON válido, dejarlo como está
      }
    }

    res.json(row);
  })
);

// DELETE /api/auditoria - Eliminar registros de auditoría con filtros
router.delete(
  '/auditoria',
  requirePermission('auditoria.ver'), // Requiere permiso de ver para eliminar
  asyncHandler(async (req, res) => {
    const {
      usuario_id,
      modulo,
      accion,
      fecha_desde,
      fecha_hasta,
      resultado,
    } = req.query;

    const condiciones = [];
    const params = [];

    if (usuario_id) {
      condiciones.push('usuario_id = ?');
      params.push(usuario_id);
    }

    if (modulo) {
      condiciones.push('modulo = ?');
      params.push(modulo);
    }

    if (accion) {
      condiciones.push('accion = ?');
      params.push(accion);
    }

    if (fecha_desde) {
      condiciones.push('DATE(created_at) >= ?');
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      condiciones.push('DATE(created_at) <= ?');
      params.push(fecha_hasta);
    }

    if (resultado) {
      condiciones.push('resultado = ?');
      params.push(resultado);
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar registros que se van a eliminar
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM auditoria ${whereClause}`,
      params
    );
    const totalEliminados = countResult.total;

    if (totalEliminados === 0) {
      return res.json({
        message: 'No hay registros que coincidan con los filtros especificados',
        eliminados: 0,
      });
    }

    // Eliminar registros (con o sin filtros)
    await query(
      `DELETE FROM auditoria ${whereClause}`,
      params
    );

    res.json({
      message: `Se eliminaron ${totalEliminados} registro(s) de auditoría`,
      eliminados: totalEliminados,
    });
  })
);

module.exports = router;

