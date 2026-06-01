const express = require('express');
const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria } = require('../middleware/auditoria');

const router = express.Router();

/** Columnas para respuestas al cliente (sin password_hash) */
const USUARIOS_COLUMNS_PUBLIC = 'id, usuario, activo, oculto';

// Todas las rutas requieren autenticación
router.use(authenticateToken);
// Auditoría DESPUÉS de autenticación para que req.user esté disponible
router.use(registrarAuditoria);

const mapUsuario = (row) => ({
  id: row.id,
  usuario: row.usuario,
  activo: Boolean(row.activo),
});

router.get(
  '/usuarios',
  requirePermission('usuarios.ver'),
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT ${USUARIOS_COLUMNS_PUBLIC} FROM usuarios WHERE COALESCE(oculto, 0) = 0 ORDER BY usuario ASC`,
    );
    res.json(rows.map(mapUsuario));
  }),
);

router.get(
  '/usuarios/:id',
  requirePermission('usuarios.ver'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const rows = await query(`SELECT ${USUARIOS_COLUMNS_PUBLIC} FROM usuarios WHERE id = ? LIMIT 1`, [id]);

    if (rows.length === 0) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    if (Number(rows[0].oculto) === 1) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }

    res.json(mapUsuario(rows[0]));
  }),
);

router.post(
  '/usuarios',
  requirePermission('usuarios.crear'),
  asyncHandler(async (req, res) => {
    const { usuario, password, activo = true } = req.body || {};

    if (!usuario || !password) {
      const error = new Error('Usuario y contraseña son requeridos');
      error.status = 400;
      throw error;
    }

    if (usuario.length < 3) {
      const error = new Error('El usuario debe tener al menos 3 caracteres');
      error.status = 400;
      throw error;
    }

    if (password.length < 4) {
      const error = new Error('La contraseña debe tener al menos 4 caracteres');
      error.status = 400;
      throw error;
    }

    const result = await withTransaction(async (conn) => {
      const [existentes] = await conn.execute(
        'SELECT id FROM usuarios WHERE usuario = ? LIMIT 1',
        [usuario],
      );

      if (existentes.length > 0) {
        const error = new Error('El usuario ya existe');
        error.status = 409;
        throw error;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [insertResult] = await conn.execute(
        'INSERT INTO usuarios (usuario, password_hash, activo) VALUES (?, ?, ?)',
        [usuario, passwordHash, activo ? 1 : 0],
      );

      const [newRows] = await conn.execute(
        `SELECT ${USUARIOS_COLUMNS_PUBLIC} FROM usuarios WHERE id = ? LIMIT 1`,
        [insertResult.insertId],
      );

      return newRows[0];
    });

    res.status(201).json(mapUsuario(result));
  }),
);

router.put(
  '/usuarios/:id',
  requirePermission('usuarios.modificar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { usuario, password, activo } = req.body || {};

    const result = await withTransaction(async (conn) => {
      const [existentes] = await conn.execute(
        `SELECT ${USUARIOS_COLUMNS_PUBLIC} FROM usuarios WHERE id = ? LIMIT 1`,
        [id],
      );

      if (existentes.length === 0) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
      }
      if (Number(existentes[0].oculto) === 1) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
      }

      const updates = [];
      const values = [];

      if (usuario !== undefined) {
        if (usuario.length < 3) {
          const error = new Error('El usuario debe tener al menos 3 caracteres');
          error.status = 400;
          throw error;
        }

        const [duplicados] = await conn.execute(
          'SELECT id FROM usuarios WHERE usuario = ? AND id != ? LIMIT 1',
          [usuario, id],
        );

        if (duplicados.length > 0) {
          const error = new Error('El usuario ya existe');
          error.status = 409;
          throw error;
        }

        updates.push('usuario = ?');
        values.push(usuario);
      }

      if (password !== undefined) {
        if (password.length < 4) {
          const error = new Error('La contraseña debe tener al menos 4 caracteres');
          error.status = 400;
          throw error;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        updates.push('password_hash = ?');
        values.push(passwordHash);
      }

      if (activo !== undefined) {
        updates.push('activo = ?');
        values.push(activo ? 1 : 0);
      }

      if (updates.length === 0) {
        return existentes[0];
      }

      values.push(id);
      await conn.execute(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, values);

      const [updatedRows] = await conn.execute(
        `SELECT ${USUARIOS_COLUMNS_PUBLIC} FROM usuarios WHERE id = ? LIMIT 1`,
        [id],
      );
      return updatedRows[0];
    });

    res.json(mapUsuario(result));
  }),
);

router.delete(
  '/usuarios/:id',
  requirePermission('usuarios.eliminar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    await withTransaction(async (conn) => {
      const [existentes] = await conn.execute('SELECT usuario, oculto FROM usuarios WHERE id = ? LIMIT 1', [id]);

      if (existentes.length === 0) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
      }

      if (existentes[0].usuario === 'admin') {
        const error = new Error('No se puede eliminar el usuario administrador');
        error.status = 403;
        throw error;
      }
      if (Number(existentes[0].oculto) === 1) {
        const error = new Error('No se puede eliminar este usuario');
        error.status = 403;
        throw error;
      }

      const [deleteResult] = await conn.execute('DELETE FROM usuarios WHERE id = ?', [id]);

      if (deleteResult.affectedRows === 0) {
        const error = new Error('No se pudo eliminar el usuario');
        error.status = 500;
        throw error;
      }
    });

    res.status(204).send();
  }),
);

module.exports = router;

