const express = require('express');
const { query, withTransaction } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { mapSocio } = require('../utils/format');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

// Todas las rutas requieren autenticación y permiso de socios
router.use(authenticateToken);
router.use(requirePermission('socios'));

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

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { where, values } = buildFilters(req.query);
    const rows = await query(`SELECT * FROM socios ${where} ORDER BY numero_socio ASC`, values);
    res.json(rows.map(mapSocio));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM socios WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      const error = new Error('Socio no encontrado');
      error.status = 404;
      throw error;
    }
    res.json(mapSocio(rows[0]));
  }),
);

const obtenerSiguienteNumeroSocio = async () => {
  const [{ maxNumero }] = await query(
    'SELECT COALESCE(MAX(numero_socio), 0) AS maxNumero FROM socios',
  );
  return Number(maxNumero) + 1;
};

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
  asyncHandler(async (req, res) => {
    const data = req.body || {};

    if (!data.apellido || !data.nombre || !data.dni || !data.fechaNacimiento || !data.fechaAlta) {
      const error = new Error('Faltan datos obligatorios del socio.');
      error.status = 400;
      throw error;
    }

    const numeroSocio =
      data.numeroSocio && Number(data.numeroSocio) > 0
        ? Number(data.numeroSocio)
        : await obtenerSiguienteNumeroSocio();

    if (await existeNumeroSocio(numeroSocio)) {
      const error = new Error('Ya existe un socio con ese número.');
      error.status = 409;
      throw error;
    }

    const result = await query(
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
        telefono,
        email,
        categoria_id,
        obra_social,
        numero_afiliado,
        fecha_alta,
        fecha_baja
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numeroSocio,
        data.apellido,
        data.nombre,
        data.dni,
        data.fechaNacimiento,
        data.calle,
        data.numeroCasa,
        data.localidad,
        data.provincia,
        data.telefono || null,
        data.email || null,
        Number(data.categoriaId),
        data.obraSocial || null,
        data.numeroAfiliado || null,
        data.fechaAlta,
        data.fechaBaja || null,
      ],
    );

    const inserted = await query('SELECT * FROM socios WHERE id = ?', [result.insertId]);
    res.status(201).json(mapSocio(inserted[0]));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = req.body || {};
    const socioId = Number(req.params.id);

    const rows = await query('SELECT * FROM socios WHERE id = ?', [socioId]);
    if (rows.length === 0) {
      const error = new Error('Socio no encontrado');
      error.status = 404;
      throw error;
    }

    const numeroSocio =
      data.numeroSocio && Number(data.numeroSocio) > 0
        ? Number(data.numeroSocio)
        : rows[0].numero_socio;

    if (await existeNumeroSocio(numeroSocio, socioId)) {
      const error = new Error('Ya existe un socio con ese número.');
      error.status = 409;
      throw error;
    }

    await query(
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
        telefono = ?,
        email = ?,
        categoria_id = ?,
        obra_social = ?,
        numero_afiliado = ?,
        fecha_alta = ?,
        fecha_baja = ?
      WHERE id = ?`,
      [
        numeroSocio,
        data.apellido,
        data.nombre,
        data.dni,
        data.fechaNacimiento,
        data.calle,
        data.numeroCasa,
        data.localidad,
        data.provincia,
        data.telefono || null,
        data.email || null,
        Number(data.categoriaId),
        data.obraSocial || null,
        data.numeroAfiliado || null,
        data.fechaAlta,
        data.fechaBaja || null,
        socioId,
      ],
    );

    const updated = await query('SELECT * FROM socios WHERE id = ?', [socioId]);
    res.json(mapSocio(updated[0]));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const socioId = Number(req.params.id);

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute('SELECT id FROM socios WHERE id = ?', [socioId]);
      if (rows.length === 0) {
        const error = new Error('Socio no encontrado');
        error.status = 404;
        throw error;
      }

      await conn.execute('DELETE FROM socios WHERE id = ?', [socioId]);
    });

    res.status(204).send();
  }),
);

module.exports = router;


