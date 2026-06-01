const express = require('express');
const { query, withTransaction } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, checkPermission } = require('../middleware/permissions');
const { registrarAuditoria } = require('../middleware/auditoria');

const router = express.Router();

const PERMISOS_COLUMNS = 'id, codigo, nombre, descripcion, created_at';

// Todas las rutas requieren autenticación
router.use(authenticateToken);
// Auditoría DESPUÉS de autenticación para que req.user esté disponible
router.use(registrarAuditoria);

const mapPermiso = (row) => ({
  id: row.id,
  codigo: row.codigo,
  nombre: row.nombre,
  descripcion: row.descripcion,
});

// Obtener todos los permisos
router.get(
  '/permisos',
  requirePermission('usuarios.permisos'),
  asyncHandler(async (_req, res) => {
    const rows = await query(`SELECT ${PERMISOS_COLUMNS} FROM permisos ORDER BY nombre ASC`);
    res.json(rows.map(mapPermiso));
  }),
);

// Obtener permisos de un usuario
router.get(
  '/usuarios/:id/permisos',
  asyncHandler(async (req, res) => {
    // Permitir que un usuario vea sus propios permisos, o que admin/jnazareno vean cualquier permiso
    const usuarioId = Number(req.params.id);
    const esAdminOJnazareno = req.user?.usuario === 'admin' || req.user?.usuario === 'jnazareno';
    const esSuPropioUsuario = req.user?.id === usuarioId;
    
    if (!esAdminOJnazareno && !esSuPropioUsuario) {
      // Si no es admin/jnazareno ni está consultando sus propios permisos, verificar permiso
      const tienePermiso = await checkPermission(req.user.id, 'usuarios.permisos');
      if (!tienePermiso) {
        return res.status(403).json({ message: 'No tiene permiso para acceder a esta funcionalidad' });
      }
    }
    
    const rows = await query(
      `SELECT p.id, p.codigo, p.nombre, p.descripcion
       FROM permisos p
       INNER JOIN usuario_permisos up ON up.permiso_id = p.id
       WHERE up.usuario_id = ?
       ORDER BY p.nombre ASC`,
      [usuarioId],
    );
    res.json(rows.map(mapPermiso));
  }),
);

// Asignar permisos a un usuario
router.put(
  '/usuarios/:id/permisos',
  requirePermission('usuarios.permisos'),
  asyncHandler(async (req, res) => {
    const usuarioId = Number(req.params.id);
    const { permisoIds } = req.body || {};

    if (!Array.isArray(permisoIds)) {
      const error = new Error('permisoIds debe ser un array');
      error.status = 400;
      throw error;
    }

    await withTransaction(async (conn) => {
      // Verificar que el usuario existe
      const [usuario] = await conn.execute('SELECT usuario FROM usuarios WHERE id = ? LIMIT 1', [usuarioId]);
      if (usuario.length === 0) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
      }

      // No permitir modificar los permisos del usuario admin
      if (usuario[0].usuario === 'admin') {
        const error = new Error('No se pueden modificar los permisos del usuario administrador');
        error.status = 403;
        throw error;
      }

      // Eliminar todos los permisos actuales del usuario
      await conn.execute('DELETE FROM usuario_permisos WHERE usuario_id = ?', [usuarioId]);

      // Insertar los nuevos permisos
      if (permisoIds.length > 0) {
        const values = permisoIds.map((permisoId) => [usuarioId, Number(permisoId)]);
        await conn.query(
          'INSERT INTO usuario_permisos (usuario_id, permiso_id) VALUES ?',
          [values],
        );
      }
    });

    // Obtener los permisos actualizados
    const rows = await query(
      `SELECT p.id, p.codigo, p.nombre, p.descripcion
       FROM permisos p
       INNER JOIN usuario_permisos up ON up.permiso_id = p.id
       WHERE up.usuario_id = ?
       ORDER BY p.nombre ASC`,
      [usuarioId],
    );

    res.json(rows.map(mapPermiso));
  }),
);

module.exports = router;

