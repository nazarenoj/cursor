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
  if (path.includes('/liquidaciones-cuotas/pagar') && method === 'POST') {
    return 'pagos.registrar';
  }
  if (path.includes('/liquidaciones-cuotas/anular') && method === 'POST') {
    return 'pagos.anular';
  }
  if (path.includes('/pagos') || (path.includes('/liquidaciones-cuotas') && method === 'GET')) {
    return 'pagos.ver';
  }

  // Rutas de socios
  if (path.startsWith('/api/socios')) {
    if (method === 'GET') return 'socios.ver';
    if (method === 'POST') return 'socios.crear';
    if (method === 'PUT') return 'socios.modificar';
    if (method === 'DELETE') return 'socios.eliminar';
    return 'socios.ver';
  }

  // Rutas de categorías
  if (path.startsWith('/api/categorias')) {
    if (method === 'GET') return 'categorias.ver';
    if (method === 'POST') return 'categorias.crear';
    if (method === 'PUT') return 'categorias.modificar';
    if (method === 'DELETE') return 'categorias.eliminar';
    return 'categorias.ver';
  }

  // Rutas de liquidaciones
  if (path.startsWith('/api/liquidaciones-mensuales')) {
    if (method === 'GET') return 'liquidaciones.ver';
    if (method === 'POST') {
      if (path.includes('/por-socios')) return 'liquidaciones.crear_anuales';
      return 'liquidaciones.crear';
    }
    if (method === 'DELETE') return 'liquidaciones.eliminar';
    return 'liquidaciones.ver';
  }
  if (path.startsWith('/api/liquidaciones-cuotas')) {
    if (method === 'GET') return 'liquidaciones.ver';
    if (method === 'DELETE') return 'liquidaciones.eliminar';
    return 'liquidaciones.ver';
  }

  // Rutas de usuarios
  if (path.startsWith('/api/usuarios')) {
    if (method === 'GET') return 'usuarios.ver';
    if (method === 'POST') return 'usuarios.crear';
    if (method === 'PUT') return 'usuarios.modificar';
    if (method === 'DELETE') return 'usuarios.eliminar';
    return 'usuarios.ver';
  }

  // Rutas de permisos
  if (path.startsWith('/api/permisos')) {
    return 'usuarios.permisos';
  }

  // Rutas de cajas
  if (path.startsWith('/api/cajas')) {
    if (method === 'GET') return 'cajas.ver';
    if (method === 'POST') {
      if (path.includes('/cerrar')) return 'cajas.cerrar';
      return 'cajas.crear';
    }
    if (method === 'PUT') return 'cajas.modificar';
    return 'cajas.ver';
  }

  // Rutas de medios de pago
  if (path.startsWith('/api/medios-pago')) {
    if (method === 'GET') return 'medios_pago.ver';
    if (method === 'POST') return 'medios_pago.crear';
    if (method === 'PUT') return 'medios_pago.modificar';
    if (method === 'DELETE') return 'medios_pago.eliminar';
    return 'medios_pago.ver';
  }

  // Rutas de backup
  if (path.startsWith('/api/backup')) {
    if (path.includes('/ejecutar') && method === 'POST') return 'backup.ejecutar';
    if (path.includes('/restaurar') && method === 'POST') return 'backup.restaurar';
    if (path.includes('/config') && method === 'PUT') return 'backup.configurar';
    return 'backup.ver';
  }

  // Configuración del club
  if (path.startsWith('/api/club-config')) {
    if (method === 'GET') return null;
    if (method === 'PUT') return 'club.configurar';
    return null;
  }

  // Rutas de plantillas WhatsApp (compartidas)
  if (path.startsWith('/api/whatsapp-templates')) {
    if (method === 'GET') return 'whatsapp_templates.ver';
    if (method === 'POST') return 'whatsapp_templates.crear';
    if (method === 'PUT') return 'whatsapp_templates.modificar';
    if (method === 'DELETE') return 'whatsapp_templates.eliminar';
    return 'whatsapp_templates.ver';
  }

  // Buscar en el mapa (compatibilidad con código antiguo)
  for (const [route, permiso] of Object.entries(PERMISOS_MAP)) {
    if (path.startsWith(route)) {
      return permiso;
    }
  }

  return null;
};

const checkPermission = async (usuarioId, permisoCodigo) => {
  const usuario = await query('SELECT es_superadmin FROM usuarios WHERE id = ? LIMIT 1', [usuarioId]);
  if (usuario.length > 0 && Number(usuario[0].es_superadmin) === 1) {
    return true;
  }

  // Verificar si el usuario tiene el permiso exacto
  const rows = await query(
    `SELECT up.id 
     FROM usuario_permisos up
     INNER JOIN permisos p ON p.id = up.permiso_id
     WHERE up.usuario_id = ? AND p.codigo = ? LIMIT 1`,
    [usuarioId, permisoCodigo],
  );

  if (rows.length > 0) {
    return true;
  }

  // Si el permiso tiene formato "modulo.accion", verificar también el permiso genérico "modulo"
  // Esto permite que un permiso genérico (ej: "socios") otorgue acceso a todos los permisos del módulo
  if (permisoCodigo.includes('.')) {
    const [modulo] = permisoCodigo.split('.');
    const rowsGenerico = await query(
      `SELECT up.id 
       FROM usuario_permisos up
       INNER JOIN permisos p ON p.id = up.permiso_id
       WHERE up.usuario_id = ? AND p.codigo = ? LIMIT 1`,
      [usuarioId, modulo],
    );
    
    if (rowsGenerico.length > 0) {
      return true;
    }
  }

  return false;
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

