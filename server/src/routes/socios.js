const express = require('express');
const { query, withTransaction, execute } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { mapSocio, mapAdherente } = require('../utils/format');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const upload = require('../middleware/upload');
const { validate, socioCreateSchema, socioUpdateSchema } = require('../middleware/validators');
const path = require('path');
const fs = require('fs').promises;

async function unlinkFotoIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

const router = express.Router();
const { registrarAuditoria } = require('../middleware/auditoria');

// Todas las rutas requieren autenticación
router.use(authenticateToken);
// Auditoría DESPUÉS de autenticación para que req.user esté disponible
router.use(registrarAuditoria);

const buildFilters = (params = {}) => {
  const clauses = [];
  const values = [];

  if (params.numeroSocio) {
    clauses.push('numero_socio LIKE ?');
    values.push(`%${params.numeroSocio}%`);
  }
  if (params.apellido) {
    clauses.push('LOWER(apellido) LIKE ?');
    values.push(`%${params.apellido.toLowerCase()}%`);
  }
  if (params.nombre) {
    clauses.push('LOWER(nombre) LIKE ?');
    values.push(`%${params.nombre.toLowerCase()}%`);
  }
  if (params.dni) {
    clauses.push('dni LIKE ?');
    values.push(`%${params.dni}%`);
  }
  if (params.categoriaId) {
    clauses.push('categoria_id = ?');
    values.push(Number(params.categoriaId));
  } else if (params.categoriaIds) {
    const raw = String(params.categoriaIds);
    const ids = raw
      .split(/[,;]+/)
      .map((x) => Number(String(x).trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length > 0) {
      const ph = ids.map(() => '?').join(',');
      clauses.push(`categoria_id IN (${ph})`);
      values.push(...ids);
    }
  }
  if (params.activo !== undefined) {
    if (params.activo === 'true') {
      clauses.push('fecha_baja IS NULL');
    } else if (params.activo === 'false') {
      clauses.push('fecha_baja IS NOT NULL');
    }
  }
  if (params.provincia) {
    clauses.push('LOWER(provincia) LIKE ?');
    values.push(`%${params.provincia.toLowerCase()}%`);
  }
  if (params.localidad) {
    clauses.push('LOWER(localidad) LIKE ?');
    values.push(`%${params.localidad.toLowerCase()}%`);
  }

  return {
    where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

const ORDER_BY_MAP = {
  numero_socio: 'numero_socio',
  apellido: 'apellido',
  nombre: 'nombre',
  dni: 'dni',
  telefono: 'telefono',
  email: 'email',
  localidad: 'localidad',
  provincia: 'provincia',
};

const buildSociosOrderBy = (params = {}) => {
  const sortBy = params.sortBy && String(params.sortBy);
  const sortDir = params.sortDir === 'desc' ? 'DESC' : 'ASC';
  if (sortBy === 'categoria') {
    return `ORDER BY (SELECT c.nombre FROM categorias c WHERE c.id = socios.categoria_id) ${sortDir}, numero_socio ASC`;
  }
  const col = sortBy && ORDER_BY_MAP[sortBy];
  if (col) {
    return `ORDER BY ${col} ${sortDir}, numero_socio ASC`;
  }
  return 'ORDER BY numero_socio ASC';
};

const SOCIOS_COLUMNS = 'id, numero_socio, apellido, nombre, dni, fecha_nacimiento, calle, numero_casa, localidad, provincia, codigo_postal, telefono, email, categoria_id, obra_social, numero_afiliado, fecha_alta, fecha_baja, foto, created_at, updated_at';
const ADHERENTES_COLUMNS = 'id, socio_id, apellido, nombre, dni, fecha_nacimiento, parentesco';

router.get(
  '/proximo-numero',
  requirePermission('socios.ver'),
  asyncHandler(async (_req, res) => {
    const rows = await query('SELECT COALESCE(MAX(numero_socio), 0) + 1 AS siguiente FROM socios');
    const siguiente = Number(rows[0]?.siguiente ?? 1);
    res.json({ siguiente });
  }),
);

router.get(
  '/',
  requirePermission('socios.ver'),
  asyncHandler(async (req, res) => {
    const { where, values } = buildFilters(req.query);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const orderBy = buildSociosOrderBy(req.query);

    const countResult = await query(`SELECT COUNT(*) AS total FROM socios ${where}`, values);
    const totalCount = Number(countResult[0].total);
    const pages = Math.ceil(totalCount / limit) || 1;

    const rows = await query(
      `SELECT ${SOCIOS_COLUMNS} FROM socios ${where} ${orderBy} LIMIT ? OFFSET ?`,
      [...values, String(limit), String(offset)]
    );
    const socios = await Promise.all(
      rows.map(async (row) => {
        const socio = mapSocio(row);
        const adherentesRows = await query(
          `SELECT ${ADHERENTES_COLUMNS} FROM adherentes WHERE socio_id = ? ORDER BY apellido, nombre`,
          [socio.id]
        );
        socio.adherentes = adherentesRows.map((adherente) => ({
          id: adherente.id,
          apellido: adherente.apellido,
          nombre: adherente.nombre,
          dni: adherente.dni,
          fechaNacimiento: adherente.fecha_nacimiento,
          parentesco: adherente.parentesco,
        }));
        return socio;
      })
    );
    res.json({
      data: socios,
      meta: { total: totalCount, pages, currentPage: page },
    });
  }),
);

// IMPORTANTE: La ruta /exportar debe ir ANTES de la ruta POST / para evitar conflictos
// POST /api/socios/exportar - Registrar exportación (PDF, Excel, etc.)
router.post(
  '/exportar',
  requirePermission('socios.ver'),
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

router.get(
  '/:id',
  requirePermission('socios.ver'),
  asyncHandler(async (req, res) => {
    const rows = await query(`SELECT ${SOCIOS_COLUMNS} FROM socios WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) {
      const error = new Error('Socio no encontrado');
      error.status = 404;
      throw error;
    }
    const socio = mapSocio(rows[0]);
    
    // Cargar adherentes
    const adherentes = await query(`SELECT ${ADHERENTES_COLUMNS} FROM adherentes WHERE socio_id = ? ORDER BY apellido, nombre`, [req.params.id]);
    socio.adherentes = adherentes.map((row) => ({
      id: row.id,
      apellido: row.apellido,
      nombre: row.nombre,
      dni: row.dni,
      fechaNacimiento: row.fecha_nacimiento,
      parentesco: row.parentesco,
    }));
    
    res.json(socio);
  }),
);

const existeNumeroSocio = async (numeroSocio, excluirId) => {
  const params = [numeroSocio];
  let sql = 'SELECT COUNT(*) AS total FROM socios WHERE numero_socio = ?';
  if (excluirId) {
    sql += ' AND id <> ?';
    params.push(excluirId);
  }
  const [{ total }] = await query(sql, params);
  return Number(total) > 0;
};

router.post(
  '/',
  requirePermission('socios.crear'),
  upload.single('foto'),
  validate(socioCreateSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;
    const fotoPath = req.file ? `/api/uploads/fotos/${req.file.filename}` : null;

    const result = await withTransaction(async (conn) => {
      let numeroSocio;
      if (data.numeroSocio && Number(data.numeroSocio) > 0) {
        numeroSocio = Number(data.numeroSocio);
      } else {
        const [maxRow] = await conn.execute(
          'SELECT COALESCE(MAX(numero_socio), 0) AS maxNumero FROM socios',
        );
        numeroSocio = Number(maxRow[0].maxNumero) + 1;
      }
      const [countRow] = await conn.execute(
        'SELECT COUNT(*) AS total FROM socios WHERE numero_socio = ?',
        [numeroSocio],
      );
      if (Number(countRow[0].total) > 0) {
        const error = new Error('Ya existe un socio con ese número.');
        error.status = 409;
        throw error;
      }

      const [insertResult] = await conn.execute(
        `INSERT INTO socios (
          numero_socio,
          apellido,
          nombre,
          dni,
          fecha_nacimiento,
          calle,
          numero_casa,
          localidad,
          provincia,
          codigo_postal,
          telefono,
          email,
          categoria_id,
          obra_social,
          numero_afiliado,
          fecha_alta,
          fecha_baja,
          foto
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          numeroSocio,
          data.apellido,
          data.nombre,
          data.dni && String(data.dni).trim() ? data.dni.trim() : null,
          data.fechaNacimiento && String(data.fechaNacimiento).trim() ? data.fechaNacimiento : null,
          data.calle && String(data.calle).trim() ? data.calle.trim() : null,
          data.numeroCasa && String(data.numeroCasa).trim() ? data.numeroCasa.trim() : null,
          data.localidad && String(data.localidad).trim() ? data.localidad.trim() : null,
          data.provincia && String(data.provincia).trim() ? data.provincia.trim() : null,
          (data.codigoPostal && String(data.codigoPostal).trim()) || null,
          (data.telefono && String(data.telefono).trim()) || null,
          (data.email && String(data.email).trim()) || null,
          data.categoriaId,
          data.obraSocial && String(data.obraSocial).trim() ? data.obraSocial.trim() : null,
          data.numeroAfiliado && String(data.numeroAfiliado).trim() ? data.numeroAfiliado.trim() : null,
          data.fechaAlta,
          (data.fechaBaja && String(data.fechaBaja).trim()) || null,
          fotoPath,
        ],
      );

      const socioId = insertResult.insertId;

      // Insertar adherentes si existen (apellido, nombre y parentesco obligatorios; DNI y fecha nac. opcionales)
      if (data.adherentes && Array.isArray(data.adherentes) && data.adherentes.length > 0) {
        for (const adherente of data.adherentes) {
          if (adherente.apellido && adherente.nombre && adherente.parentesco) {
            const dni = adherente.dni && String(adherente.dni).trim() ? adherente.dni.trim() : null;
            const fechaNac = adherente.fechaNacimiento && String(adherente.fechaNacimiento).trim() ? adherente.fechaNacimiento : null;
            await conn.execute(
              `INSERT INTO adherentes (socio_id, apellido, nombre, dni, fecha_nacimiento, parentesco)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                socioId,
                adherente.apellido,
                adherente.nombre,
                dni,
                fechaNac,
                adherente.parentesco,
              ],
            );
          }
        }
      }

      return insertResult;
    });

    const inserted = await query(`SELECT ${SOCIOS_COLUMNS} FROM socios WHERE id = ?`, [result.insertId]);
    const socio = mapSocio(inserted[0]);
    
    // Cargar adherentes
    const adherentes = await query(`SELECT ${ADHERENTES_COLUMNS} FROM adherentes WHERE socio_id = ? ORDER BY apellido, nombre`, [result.insertId]);
    socio.adherentes = adherentes.map((row) => ({
      id: row.id,
      apellido: row.apellido,
      nombre: row.nombre,
      dni: row.dni,
      fechaNacimiento: row.fecha_nacimiento,
      parentesco: row.parentesco,
    }));
    
    res.status(201).json(socio);
  }),
);

router.put(
  '/:id',
  requirePermission('socios.modificar'),
  upload.single('foto'),
  validate(socioUpdateSchema),
  asyncHandler(async (req, res) => {
    const socioId = Number(req.params.id);
    const rows = await query(`SELECT ${SOCIOS_COLUMNS} FROM socios WHERE id = ?`, [socioId]);
    if (rows.length === 0) {
      const error = new Error('Socio no encontrado');
      error.status = 404;
      throw error;
    }
    const existing = mapSocio(rows[0]);
    const data = { ...existing, ...req.body };

    const numeroSocio =
      data.numeroSocio != null && Number(data.numeroSocio) > 0
        ? Number(data.numeroSocio)
        : rows[0].numero_socio;

    if (await existeNumeroSocio(numeroSocio, socioId)) {
      const error = new Error('Ya existe un socio con ese número.');
      error.status = 409;
      throw error;
    }

    // Si hay nueva foto, eliminar la anterior
    let fotoPath = rows[0].foto;
    if (req.file) {
      if (fotoPath) {
        const oldFotoPath = path.join(__dirname, '../../uploads/fotos', path.basename(fotoPath));
        await unlinkFotoIfExists(oldFotoPath);
      }
      fotoPath = `/api/uploads/fotos/${req.file.filename}`;
    } else if (data.foto === null || data.foto === '') {
      if (fotoPath) {
        const oldFotoPath = path.join(__dirname, '../../uploads/fotos', path.basename(fotoPath));
        await unlinkFotoIfExists(oldFotoPath);
      }
      fotoPath = null;
    }

    await withTransaction(async (conn) => {
      // No permitir modificar fecha_baja desde el formulario - solo mediante endpoints específicos
      const [socioActual] = await conn.execute('SELECT fecha_baja FROM socios WHERE id = ?', [socioId]);
      const fechaBajaActual = socioActual[0]?.fecha_baja || null;
      
      await conn.execute(
        `UPDATE socios SET
          numero_socio = ?,
          apellido = ?,
          nombre = ?,
          dni = ?,
          fecha_nacimiento = ?,
          calle = ?,
          numero_casa = ?,
          localidad = ?,
          provincia = ?,
          codigo_postal = ?,
          telefono = ?,
          email = ?,
          categoria_id = ?,
          obra_social = ?,
          numero_afiliado = ?,
          fecha_alta = ?,
          fecha_baja = ?,
          foto = ?
        WHERE id = ?`,
        [
          numeroSocio,
          data.apellido,
          data.nombre,
          data.dni && String(data.dni).trim() ? data.dni.trim() : null,
          data.fechaNacimiento && String(data.fechaNacimiento).trim() ? data.fechaNacimiento : null,
          data.calle && String(data.calle).trim() ? data.calle.trim() : null,
          data.numeroCasa && String(data.numeroCasa).trim() ? data.numeroCasa.trim() : null,
          data.localidad && String(data.localidad).trim() ? data.localidad.trim() : null,
          data.provincia && String(data.provincia).trim() ? data.provincia.trim() : null,
          (data.codigoPostal && String(data.codigoPostal).trim()) || null,
          (data.telefono && String(data.telefono).trim()) || null,
          (data.email && String(data.email).trim()) || null,
          data.categoriaId,
          data.obraSocial && String(data.obraSocial).trim() ? data.obraSocial.trim() : null,
          data.numeroAfiliado && String(data.numeroAfiliado).trim() ? data.numeroAfiliado.trim() : null,
          data.fechaAlta,
          fechaBajaActual,
          fotoPath,
          socioId,
        ],
      );

      // Actualizar numero_socio en liquidaciones_cuotas donde fue referenciado
      await conn.execute(
        'UPDATE liquidaciones_cuotas SET numero_socio = ? WHERE socio_id = ?',
        [numeroSocio, socioId]
      );

      // Gestionar adherentes
      if (data.adherentes !== undefined) {
        // Eliminar todos los adherentes existentes
        await conn.execute('DELETE FROM adherentes WHERE socio_id = ?', [socioId]);
        
        // Insertar nuevos adherentes (apellido, nombre y parentesco obligatorios; DNI y fecha nac. opcionales)
        if (Array.isArray(data.adherentes) && data.adherentes.length > 0) {
          for (const adherente of data.adherentes) {
            if (adherente.apellido && adherente.nombre && adherente.parentesco) {
              const dni = adherente.dni && String(adherente.dni).trim() ? adherente.dni.trim() : null;
              const fechaNac = adherente.fechaNacimiento && String(adherente.fechaNacimiento).trim() ? adherente.fechaNacimiento : null;
              await conn.execute(
                `INSERT INTO adherentes (socio_id, apellido, nombre, dni, fecha_nacimiento, parentesco)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  socioId,
                  adherente.apellido,
                  adherente.nombre,
                  dni,
                  fechaNac,
                  adherente.parentesco,
                ],
              );
            }
          }
        }
      }
    });

    const updated = await query(`SELECT ${SOCIOS_COLUMNS} FROM socios WHERE id = ?`, [socioId]);
    const socio = mapSocio(updated[0]);
    
    // Cargar adherentes
    const adherentes = await query(`SELECT ${ADHERENTES_COLUMNS} FROM adherentes WHERE socio_id = ? ORDER BY apellido, nombre`, [socioId]);
    socio.adherentes = adherentes.map((row) => ({
      id: row.id,
      apellido: row.apellido,
      nombre: row.nombre,
      dni: row.dni,
      fechaNacimiento: row.fecha_nacimiento,
      parentesco: row.parentesco,
    }));
    
    res.json(socio);
  }),
);

// PATCH /api/socios/:id/baja - Dar de baja un socio
router.patch(
  '/:id/baja',
  requirePermission('socios.modificar'),
  asyncHandler(async (req, res) => {
    const socioId = Number(req.params.id);
    const fechaBaja = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD

    const rows = await query('SELECT id FROM socios WHERE id = ?', [socioId]);
    if (rows.length === 0) {
      const error = new Error('Socio no encontrado');
      error.status = 404;
      throw error;
    }

    await execute('UPDATE socios SET fecha_baja = ? WHERE id = ?', [fechaBaja, socioId]);

    const updatedSocio = await query(`SELECT ${SOCIOS_COLUMNS} FROM socios WHERE id = ?`, [socioId]);
    const updatedAdherentes = await query(`SELECT ${ADHERENTES_COLUMNS} FROM adherentes WHERE socio_id = ?`, [socioId]);
    const socio = mapSocio(updatedSocio[0]);
    socio.adherentes = updatedAdherentes.map(mapAdherente);
    res.json(socio);
  }),
);

// PATCH /api/socios/:id/alta - Dar de alta un socio (eliminar fecha de baja)
router.patch(
  '/:id/alta',
  requirePermission('socios.modificar'),
  asyncHandler(async (req, res) => {
    const socioId = Number(req.params.id);

    const rows = await query('SELECT id FROM socios WHERE id = ?', [socioId]);
    if (rows.length === 0) {
      const error = new Error('Socio no encontrado');
      error.status = 404;
      throw error;
    }

    await execute('UPDATE socios SET fecha_baja = NULL WHERE id = ?', [socioId]);

    const updatedSocio = await query(`SELECT ${SOCIOS_COLUMNS} FROM socios WHERE id = ?`, [socioId]);
    const updatedAdherentes = await query(`SELECT ${ADHERENTES_COLUMNS} FROM adherentes WHERE socio_id = ?`, [socioId]);
    const socio = mapSocio(updatedSocio[0]);
    socio.adherentes = updatedAdherentes.map(mapAdherente);
    res.json(socio);
  }),
);

router.delete(
  '/:id',
  requirePermission('socios.eliminar'),
  asyncHandler(async (req, res) => {
    const socioId = Number(req.params.id);

    await withTransaction(async (conn) => {
      // Obtener información del socio antes de eliminarlo (para auditoría)
      const [rows] = await conn.execute(
        'SELECT id, numero_socio, apellido, nombre, foto FROM socios WHERE id = ?',
        [socioId]
      );
      if (rows.length === 0) {
        const error = new Error('Socio no encontrado');
        error.status = 404;
        throw error;
      }
      const socioToDelete = rows[0];

      // Verificar si el socio tiene liquidaciones asociadas
      const [liquidaciones] = await conn.execute(
        'SELECT COUNT(*) as count FROM liquidaciones_cuotas WHERE socio_id = ?',
        [socioId]
      );
      if (liquidaciones[0].count > 0) {
        const error = new Error(
          `No se puede eliminar el socio porque tiene ${liquidaciones[0].count} liquidación(es) asociada(s). Primero debe eliminar o anular las liquidaciones.`
        );
        error.status = 400;
        throw error;
      }

      // Verificar si el socio tiene movimientos en cajas asociados
      const [movimientos] = await conn.execute(
        'SELECT COUNT(*) as count FROM movimientos_cajas WHERE liquidacion_cuota_id IN (SELECT id FROM liquidaciones_cuotas WHERE socio_id = ?)',
        [socioId]
      );
      if (movimientos[0].count > 0) {
        const error = new Error(
          `No se puede eliminar el socio porque tiene ${movimientos[0].count} movimiento(s) en cajas asociado(s). Primero debe eliminar o anular los movimientos.`
        );
        error.status = 400;
        throw error;
      }

      // Verificar también movimientos directos (si existen en el futuro)
      // Por ahora solo verificamos los relacionados con liquidaciones

      if (socioToDelete.foto) {
        const fotoPath = path.join(__dirname, '../../uploads/fotos', path.basename(socioToDelete.foto));
        await unlinkFotoIfExists(fotoPath);
      }

      // La eliminación de adherentes se maneja por CASCADE DELETE en la DB
      await conn.execute('DELETE FROM socios WHERE id = ?', [socioId]);
      
      // Guardar datos para auditoría (se registrará automáticamente por el middleware)
      req.auditData = {
        datosAnteriores: {
          id: socioToDelete.id,
          numero_socio: socioToDelete.numero_socio,
          apellido: socioToDelete.apellido,
          nombre: socioToDelete.nombre,
        },
        datosNuevos: null, // Se eliminó, no hay datos nuevos
      };
    });

    res.status(204).send();
  }),
);

module.exports = router;


