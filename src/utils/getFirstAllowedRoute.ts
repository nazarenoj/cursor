import type { Permiso } from '../types';

// Orden de prioridad de las rutas con permisos granulares
const ROUTES_ORDER = [
  { path: '/socios', permiso: 'socios.ver' },
  { path: '/categorias', permiso: 'categorias.ver' },
  { path: '/liquidaciones', permiso: 'liquidaciones.ver' },
  { path: '/pagos', permiso: 'pagos.registrar' },
  { path: '/pagos/listado', permiso: 'pagos.ver' },
  { path: '/tesoreria', permiso: 'tesoreria.ver' },
  { path: '/cajas', permiso: 'cajas.ver' },
  { path: '/medios-pago', permiso: 'medios_pago.ver' },
  { path: '/usuarios', permiso: 'usuarios.ver' },
  { path: '/backup', permiso: 'backup.ver' },
];

// Mapeo de permisos genéricos a rutas (para compatibilidad)
const PERMISOS_GENERICOS: Record<string, string> = {
  'usuarios': '/usuarios',
  'backup': '/backup',
  'socios': '/socios',
  'categorias': '/categorias',
  'liquidaciones': '/liquidaciones',
  'pagos': '/pagos',
  'tesoreria': '/tesoreria',
  'cajas': '/cajas',
  'medios_pago': '/medios-pago',
};

export const getFirstAllowedRoute = (
  permisos: Permiso[],
  esAdmin: boolean,
): string | null => {
  // Si es admin, siempre puede ir a socios (nunca mostrar sin-permisos)
  if (esAdmin) {
    return '/socios';
  }

  // Si no tiene permisos, devolver null para mostrar sin-permisos
  if (permisos.length === 0) {
    return null;
  }

  // Buscar la primera ruta para la cual el usuario tiene permiso
  for (const route of ROUTES_ORDER) {
    // Verificar permiso exacto
    if (permisos.some((p) => p.codigo === route.permiso)) {
      return route.path;
    }
    
    // Verificar permiso genérico (compatibilidad hacia atrás)
    // Si tiene el permiso genérico del módulo, también tiene acceso
    if (route.permiso.includes('.')) {
      const [modulo] = route.permiso.split('.');
      if (permisos.some((p) => p.codigo === modulo)) {
        return route.path;
      }
    }
  }

  // Si no encontró ninguna ruta específica, verificar permisos genéricos
  for (const [permisoGenerico, ruta] of Object.entries(PERMISOS_GENERICOS)) {
    if (permisos.some((p) => p.codigo === permisoGenerico)) {
      return ruta;
    }
  }

  // Si no tiene ningún permiso para ninguna ruta, devolver null
  return null;
};

