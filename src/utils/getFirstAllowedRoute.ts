import type { Permiso } from '../types';

// Orden de prioridad de las rutas
const ROUTES_ORDER = [
  { path: '/socios', permiso: 'socios' },
  { path: '/categorias', permiso: 'categorias' },
  { path: '/liquidaciones', permiso: 'liquidaciones' },
  { path: '/pagos', permiso: 'pagos' },
  { path: '/pagos/listado', permiso: 'listado_pagos' },
  { path: '/usuarios', permiso: 'usuarios' },
];

export const getFirstAllowedRoute = (
  permisos: Permiso[],
  esAdmin: boolean,
): string => {
  // Si es admin, siempre puede ir a socios
  if (esAdmin) {
    return '/socios';
  }

  // Buscar la primera ruta para la cual el usuario tiene permiso
  for (const route of ROUTES_ORDER) {
    if (permisos.some((p) => p.codigo === route.permiso)) {
      return route.path;
    }
  }

  // Si no tiene ningún permiso, redirigir a socios por defecto
  // (en lugar de mostrar error, permitir acceso y el backend validará)
  return '/socios';
};

