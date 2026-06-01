import type { SociosSort } from '../services/api';

/** Columnas de TablaSocios → parámetros sortBy de GET /socios (ver server ORDER_BY_MAP + categoria). */
export const columnaSociosASort = (columna: string): string | null => {
  if (columna === 'estado' || columna === 'acciones') return null;
  const map: Record<string, string> = {
    numeroSocio: 'numero_socio',
    apellido: 'apellido',
    nombre: 'nombre',
    dni: 'dni',
    telefono: 'telefono',
    email: 'email',
    categoria: 'categoria',
  };
  return map[columna] ?? null;
};

export const sortDesdeOrdenColumna = (
  orden: { columna: string; direccion: 'asc' | 'desc' } | null,
): SociosSort | undefined => {
  if (!orden || orden.columna === 'estado') return undefined;
  const sortBy = columnaSociosASort(orden.columna);
  if (!sortBy) return undefined;
  return { sortBy, sortDir: orden.direccion };
};
