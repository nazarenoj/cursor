const { query } = require('../db');

const PERMISOS_MAP = {
  '/api/categorias': 'categorias',
  '/api/socios': 'socios',
  '/api/liquidaciones-mensuales': 'liquidaciones',
  '/api/liquidaciones-cuotas': 'liquidaciones',
  '/api/usuarios': 'usuarios',
};

const getPermisoFromPath = (path, method) => {
  // Rutas de pagos
  if (path.includes('/pagos') || path.includes('/liquidaciones-cuotas/pagar')) {
    return 'pagos';
  }
  if (path.includes('/listado') || (path.includes('/liquidaciones-cuotas') && method === 'GET')) {
    return 'listado_pagos';
  }

  // Buscar en el mapa
  for (const [route, permiso] of Object.entries(PERMISOS_MAP)) {
    if (path.startsWith(route)) {
      return permiso;
    }
  }

  return null;
};

const checkPermission = async (usuarioId, permisoCodigo) => {
  // El usuario admin tiene todos los permisos
  const usuario = await query('SELECT usuario FROM usuarios WHERE id = ? LIMIT 1', [usuarioId]);
  if (usuario.length > 0 && usuario[0].usuario === 'admin') {
    return true;
  }

  // Verificar si el usuario tiene el permiso
  const rows = await query(
    `SELECT up.id 
     FROM usuario_permisos up
     INNER JOIN permisos p ON p.id = up.permiso_id
     WHERE up.usuario_id = ? AND p.codigo = ? LIMIT 1`,
    [usuarioId, permisoCodigo],
  );

  return rows.length > 0;
};

const requirePermission = (permisoCodigo) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const tienePermiso = await checkPermission(req.user.id, permisoCodigo);

    if (!tienePermiso) {
      return res.status(403).json({ message: 'No tiene permiso para acceder a esta funcionalidad' });
    }

    next();
  };
};

const autoRequirePermission = () => {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const permisoCodigo = getPermisoFromPath(req.path, req.method);

    if (!permisoCodigo) {
      // Si no hay permiso definido, permitir acceso (rutas públicas o sin restricción)
      return next();
    }

    const tienePermiso = await checkPermission(req.user.id, permisoCodigo);

    if (!tienePermiso) {
      return res.status(403).json({ message: 'No tiene permiso para acceder a esta funcionalidad' });
    }

    next();
  };
};

module.exports = {
  checkPermission,
  requirePermission,
  autoRequirePermission,
  getPermisoFromPath,
};

