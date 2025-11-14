import type {
  Categoria,
  FiltrosSocio,
  LiquidacionCuota,
  LiquidacionMensual,
  Socio,
  Usuario,
  LoginResponse,
  Permiso,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getToken = () => {
  return localStorage.getItem('auth_token');
};

const setToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

const removeToken = () => {
  localStorage.removeItem('auth_token');
};

interface RequestOptions extends RequestInit {
  parseJson?: boolean;
  requireAuth?: boolean;
}

const request = async <T = unknown>(path: string, options: RequestOptions = {}) => {
  const { parseJson = true, requireAuth = true, headers, ...rest } = options;
  const token = getToken();
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> || {}),
  };

  if (requireAuth && token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: requestHeaders,
    ...rest,
  });

  if (!response.ok) {
    let message = 'Error al comunicarse con el servidor.';
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch {
      // Ignorar error al parsear
    }
    throw new Error(message);
  }

  if (!parseJson || response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const buildSociosQuery = (filtros?: FiltrosSocio): string => {
  if (!filtros) return '';
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (typeof value === 'boolean') {
      params.append(key, value ? 'true' : 'false');
    } else {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const apiService = {
  // Categorías
  getCategorias: () => request<Categoria[]>('/categorias'),
  crearCategoria: (payload: Omit<Categoria, 'id'>) =>
    request<Categoria>('/categorias', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  actualizarCategoria: (id: number, payload: Omit<Categoria, 'id'>) =>
    request<Categoria>(`/categorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  eliminarCategoria: (id: number) =>
    request<void>(`/categorias/${id}`, { method: 'DELETE', parseJson: false }),

  // Socios
  getSocios: (filtros?: FiltrosSocio) =>
    request<Socio[]>(`/socios${buildSociosQuery(filtros)}`),
  crearSocio: (payload: Omit<Socio, 'id'>) =>
    request<Socio>('/socios', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  actualizarSocio: (id: number, payload: Omit<Socio, 'id'>) =>
    request<Socio>(`/socios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  eliminarSocio: (id: number) =>
    request<void>(`/socios/${id}`, { method: 'DELETE', parseJson: false }),

  // Liquidaciones
  getLiquidacionesMensuales: () =>
    request<LiquidacionMensual[]>('/liquidaciones-mensuales'),
  crearLiquidacionMensual: (mes: string) =>
    request<{ liquidacionMensual: LiquidacionMensual; cuotas: LiquidacionCuota[] }>(
      '/liquidaciones-mensuales',
      {
        method: 'POST',
        body: JSON.stringify({ mes }),
      },
    ),
  eliminarLiquidacionMensual: (id: number) =>
    request<void>(`/liquidaciones-mensuales/${id}`, { method: 'DELETE', parseJson: false }),

  getLiquidacionesCuotas: () => request<LiquidacionCuota[]>('/liquidaciones-cuotas'),
  pagarCuotas: (ids: number[], medioPago: string, fechaPago?: string) =>
    request<LiquidacionCuota[]>('/liquidaciones-cuotas/pagar', {
      method: 'POST',
      body: JSON.stringify({ ids, medioPago, fechaPago }),
    }),
  marcarCuotaPagada: (id: number, medioPago: string, fechaPago?: string) =>
    request<LiquidacionCuota>(`/liquidaciones-cuotas/${id}/pagar`, {
      method: 'PATCH',
      body: JSON.stringify({ medioPago, fechaPago }),
    }),
  marcarCuotaPendiente: (id: number) =>
    request<LiquidacionCuota>(`/liquidaciones-cuotas/${id}/pendiente`, {
      method: 'PATCH',
    }),
  eliminarLiquidacionCuota: (id: number) =>
    request<void>(`/liquidaciones-cuotas/${id}`, { method: 'DELETE', parseJson: false }),

  // Autenticación
  login: (usuario: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
      requireAuth: false,
    }),
  verificarToken: () => request<{ id: number; usuario: string }>('/auth/me', { requireAuth: true }),

  // Usuarios
  getUsuarios: () => request<Usuario[]>('/usuarios'),
  getUsuario: (id: number) => request<Usuario>(`/usuarios/${id}`),
  crearUsuario: (payload: { usuario: string; password: string; activo?: boolean }) =>
    request<Usuario>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  actualizarUsuario: (id: number, payload: Partial<{ usuario: string; password: string; activo: boolean }>) =>
    request<Usuario>(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  eliminarUsuario: (id: number) =>
    request<void>(`/usuarios/${id}`, { method: 'DELETE', parseJson: false }),

  // Permisos
  getPermisos: () => request<Permiso[]>('/permisos'),
  getPermisosUsuario: (usuarioId: number) => request<Permiso[]>(`/usuarios/${usuarioId}/permisos`),
  asignarPermisosUsuario: (usuarioId: number, permisoIds: number[]) =>
    request<Permiso[]>(`/usuarios/${usuarioId}/permisos`, {
      method: 'PUT',
      body: JSON.stringify({ permisoIds }),
    }),
};

export { getToken, setToken, removeToken };


