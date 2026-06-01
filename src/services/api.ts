import type {
  ClubConfig,
  Categoria,
  FiltrosSocio,
  LiquidacionCuota,
  LiquidacionMensual,
  Localidad,
  WhatsAppTemplate,
  WhatsAppBaileysStatus,
  WhatsAppBaileysBatchItem,
  WhatsAppBaileysBatchResult,
  Socio,
  Usuario,
  LoginResponse,
  Permiso,
  Caja,
  MedioPagoDB,
  MovimientoCaja,
  Auditoria,
} from '../types';

// Localhost: puerto 4000 en desarrollo.
// Producción: mismo origen + /api (para deploy multi-instancia sin recompilar por puerto/dominio).
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;

  const portPart = port && port !== '80' && port !== '443' ? `:${port}` : '';

  // build único: en producción siempre apuntar al mismo origen donde corre el frontend.
  if (import.meta.env.PROD) {
    return `${protocol}//${hostname}${portPart}/api`;
  }

  // Desarrollo local
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000/api';
  }

  // Desarrollo contra otro host: permite override opcional
  if (import.meta.env.VITE_API_URL) {
    const url = (import.meta.env.VITE_API_URL as string).trim();
    return url.replace(/\/+$/, '') + (url.endsWith('/api') ? '' : '/api');
  }

  return `${protocol}//${hostname}${portPart}/api`;
};

const API_BASE_URL = getApiUrl();

/** Token en memoria (no localStorage) para reducir riesgo de robo por XSS. Tras recargar la página se pierde y el usuario debe volver a iniciar sesión. */
let inMemoryToken: string | null = null;

const getToken = () => inMemoryToken;

const setToken = (token: string) => {
  inMemoryToken = token;
};

const removeToken = () => {
  inMemoryToken = null;
};

interface RequestOptions extends RequestInit {
  parseJson?: boolean;
  requireAuth?: boolean;
}

const request = async <T = unknown>(path: string, options: RequestOptions = {}) => {
  const { parseJson = true, requireAuth = true, headers, body, ...rest } = options;
  const token = getToken();
  
  const requestHeaders: Record<string, string> = {};
  
  // Solo establecer Content-Type si no es FormData y hay body
  const isFormData = body instanceof FormData;
  if (!isFormData && body !== undefined && body !== null) {
    requestHeaders['Content-Type'] = 'application/json';
  }
  
  // Agregar headers personalizados
  if (headers) {
    Object.assign(requestHeaders, headers);
  }

  if (requireAuth && token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    ...rest,
    headers: requestHeaders,
  };
  
  // Solo agregar body si está definido
  if (body !== undefined && body !== null) {
    if (isFormData) {
      fetchOptions.body = body;
    } else if (typeof body === 'string') {
      // Si ya es un string (JSON.stringify ya aplicado), usarlo directamente
      fetchOptions.body = body;
    } else {
      // Si es un objeto, serializarlo
      fetchOptions.body = JSON.stringify(body);
    }
  }

  // Si hay un signal en las opciones, usarlo (para timeouts)
  if (options.signal) {
    fetchOptions.signal = options.signal;
  }

  const fullUrl = `${API_BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, fetchOptions);
  } catch (fetchError: unknown) {
    const err = fetchError as { name?: string; message?: string };
    // Si es un error de abort, lanzar un error más descriptivo
    if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
      throw new Error('La operación fue cancelada por timeout. Por favor, inténtalo de nuevo.');
    }
    // Si es un error de red, lanzar un error más descriptivo
    if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      throw new Error(
        'Error de conexión con el servidor. Verifica que el backend esté ejecutándose (en la raíz del proyecto: npm run dev, o en otra terminal: cd server && npm run dev).'
      );
    }
    throw fetchError;
  }

  if (!response.ok) {
    let message = 'Error al comunicarse con el servidor.';
    try {
      const payload = await response.json();
      message = payload?.message || payload?.error || message;
    } catch {
      // Ignorar error al parsear
    }
    throw new Error(message);
  }

  if (!parseJson || response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch (jsonError) {
    // Si hay error al parsear JSON pero la respuesta fue OK, puede ser que el servidor no envió JSON
    console.error('[API] Error al parsear respuesta JSON:', jsonError);
    throw new Error('El servidor respondió pero la respuesta no es válida. Verifica los logs del servidor.');
  }
};

export interface SociosResponse {
  data: Socio[];
  meta: { total: number; pages: number; currentPage: number };
}

export type SociosSort = { sortBy: string; sortDir: 'asc' | 'desc' };

const buildSociosQuery = (
  filtros?: FiltrosSocio,
  page?: number,
  limit?: number,
  sort?: SociosSort,
): string => {
  const params = new URLSearchParams();
  if (filtros) {
    Object.entries(filtros).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (key === 'categoriaIds' && Array.isArray(value)) {
        if (value.length === 0) return;
        params.set('categoriaIds', value.join(','));
        return;
      }
      if (typeof value === 'boolean') {
        params.append(key, value ? 'true' : 'false');
      } else {
        params.append(key, String(value));
      }
    });
  }
  if (page != null && page >= 1) params.set('page', String(page));
  if (limit != null && limit >= 1) params.set('limit', String(limit));
  if (sort?.sortBy) {
    params.set('sortBy', sort.sortBy);
    params.set('sortDir', sort.sortDir);
  }
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

  // Localidades (agregadas por usuarios cuando no existen)
  getLocalidades: (provincia: string) =>
    request<Localidad[]>(`/localidades?provincia=${encodeURIComponent(provincia)}`),
  crearLocalidad: (payload: { nombre: string; provincia: string; codigoPostal?: string | null }) =>
    request<Localidad>('/localidades', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Plantillas WhatsApp (compartidas)
  getWhatsAppTemplates: () => request<WhatsAppTemplate[]>('/whatsapp-templates'),
  crearWhatsAppTemplate: (payload: { nombre: string; texto: string }) =>
    request<WhatsAppTemplate>('/whatsapp-templates', { method: 'POST', body: JSON.stringify(payload) }),
  actualizarWhatsAppTemplate: (id: number, payload: { nombre: string; texto: string }) =>
    request<WhatsAppTemplate>(`/whatsapp-templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  eliminarWhatsAppTemplate: (id: number) =>
    request<void>(`/whatsapp-templates/${id}`, { method: 'DELETE', parseJson: false }),

  getWhatsAppBaileysStatus: () => request<WhatsAppBaileysStatus>('/whatsapp-baileys/status'),
  sendWhatsAppBaileysBatch: (items: WhatsAppBaileysBatchItem[]) =>
    request<WhatsAppBaileysBatchResult>('/whatsapp-baileys/send-batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  // Configuración del club (nombre, logo, color)
  getClubConfig: () => request<ClubConfig>('/club-config'),
  getClubConfigPublic: () =>
    request<Pick<ClubConfig, 'nombreClub' | 'logoUrl' | 'colorPrimario' | 'timezone' | 'appVersion'>>(
      '/club-config/public',
      {
        requireAuth: false,
      },
    ),
  updateClubConfig: (payload: {
    nombreClub?: string;
    colorPrimario?: string;
    timezone?: string;
    whatsappUsarServicio?: boolean;
    logo?: File | null;
  }) => {
    const formData = new FormData();
    if (payload.nombreClub != null) formData.append('nombreClub', payload.nombreClub);
    if (payload.colorPrimario != null) formData.append('colorPrimario', payload.colorPrimario);
    if (payload.timezone != null) formData.append('timezone', payload.timezone);
    if (payload.whatsappUsarServicio !== undefined) {
      formData.append('whatsappUsarServicio', payload.whatsappUsarServicio ? '1' : '0');
    }
    if (payload.logo !== undefined && payload.logo !== null) formData.append('logo', payload.logo);
    return request<ClubConfig>('/club-config', { method: 'PUT', body: formData });
  },

  // Socios (paginado; orden: sortBy= num_socio, apellido, nombre, dni, telefono, email, localidad, provincia, categoria; sortDir= asc|desc)
  getSocios: (filtros?: FiltrosSocio, page?: number, limit?: number, sort?: SociosSort) =>
    request<SociosResponse>(`/socios${buildSociosQuery(filtros, page ?? 1, limit ?? 20, sort)}`),
  getSociosTodasLasPaginas: async (filtros?: FiltrosSocio, sort?: SociosSort): Promise<Socio[]> => {
    const pageSize = 100;
    const first = await request<SociosResponse>(
      `/socios${buildSociosQuery(filtros, 1, pageSize, sort)}`,
    );
    const all: Socio[] = [...first.data];
    for (let p = 2; p <= first.meta.pages; p++) {
      const r = await request<SociosResponse>(`/socios${buildSociosQuery(filtros, p, pageSize, sort)}`);
      all.push(...r.data);
    }
    return all;
  },
  getProximoNumeroSocio: () => request<{ siguiente: number }>('/socios/proximo-numero'),
  getSocio: (id: number) => request<Socio>(`/socios/${id}`),
  crearSocio: (payload: Omit<Socio, 'id'>, foto?: File) => {
    const formData = new FormData();
    if (foto) {
      formData.append('foto', foto);
    }
    // Agregar todos los campos del payload al FormData
    Object.keys(payload).forEach((key) => {
      const value = payload[key as keyof typeof payload];
      if (key === 'adherentes' && Array.isArray(value)) {
        formData.append('adherentes', JSON.stringify(value));
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
    return request<Socio>('/socios', {
      method: 'POST',
      body: formData,
      headers: {}, // No establecer Content-Type, el navegador lo hará automáticamente con FormData
    });
  },
  actualizarSocio: (id: number, payload: Omit<Socio, 'id'>, foto?: File | null) => {
    const formData = new FormData();
    if (foto !== undefined) {
      if (foto === null) {
        formData.append('foto', '');
      } else {
        formData.append('foto', foto);
      }
    }
    // Agregar todos los campos del payload al FormData
    Object.keys(payload).forEach((key) => {
      const value = payload[key as keyof typeof payload];
      if (key === 'adherentes' && Array.isArray(value)) {
        formData.append('adherentes', JSON.stringify(value));
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
    return request<Socio>(`/socios/${id}`, {
      method: 'PUT',
      body: formData,
      headers: {}, // No establecer Content-Type, el navegador lo hará automáticamente con FormData
    });
  },
  darBajaSocio: (id: number) =>
    request<Socio>(`/socios/${id}/baja`, { method: 'PATCH' }),
  darAltaSocio: (id: number) =>
    request<Socio>(`/socios/${id}/alta`, { method: 'PATCH' }),
  eliminarSocio: (id: number) =>
    request<void>(`/socios/${id}`, { method: 'DELETE', parseJson: false }),

  // Liquidaciones
  getLiquidacionesMensuales: () =>
    request<LiquidacionMensual[]>('/liquidaciones-mensuales'),
  crearLiquidacionMensual: (
    mes: string,
    socioId?: number,
    reemplazarSiNoPagada?: boolean,
  ) =>
    request<{
      liquidacionMensual: LiquidacionMensual;
      cuotas: LiquidacionCuota[];
      sociosNuevosIncluidos?: number;
      liquidacionExistia?: boolean;
      yaExisteNoPagada?: boolean;
      yaTeníaCuotaPagada?: boolean;
      soloParaUnSocio?: boolean;
    }>('/liquidaciones-mensuales', {
      method: 'POST',
      body: JSON.stringify({
        mes,
        ...(socioId != null && { socioId }),
        ...(reemplazarSiNoPagada === true && { reemplazarSiNoPagada: true }),
      }),
    }),
  crearLiquidacionesPorSocios: (socioIds: number[], meses: string[]) =>
    request<{
      resultados: Array<{
        mes: string;
        liquidacionMensual: LiquidacionMensual;
        cuotas: LiquidacionCuota[];
        cuotasCreadas: number;
        cuotasExistentes: number;
        sociosNuevosIncluidos?: number;
      }>;
      totalMeses: number;
      totalCuotasCreadas: number;
      totalSociosNuevosIncluidos?: number;
    }>('/liquidaciones-mensuales/por-socios', {
      method: 'POST',
      body: JSON.stringify({ socioIds, meses }),
    }),
  eliminarLiquidacionMensual: (id: number) =>
    request<void>(`/liquidaciones-mensuales/${id}`, { method: 'DELETE', parseJson: false }),

  getLiquidacionesCuotas: () => request<LiquidacionCuota[]>('/liquidaciones-cuotas'),
  pagarCuotas: (ids: number[], medioPago: string, fechaPago?: string) =>
    request<{ cuotas: LiquidacionCuota[]; numeroRecibo: number; total?: number; cantidad?: number; medioPago?: string }>('/liquidaciones-cuotas/pagar', {
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

  // Cajas
  getCajas: () => request<Caja[]>('/cajas'),
  getCaja: (id: number) => request<Caja>(`/cajas/${id}`),
  crearCaja: (payload: { nombre: string; descripcion?: string; saldoInicial?: number; activa?: boolean }) =>
    request<Caja>('/cajas', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  actualizarCaja: (id: number, payload: Partial<{ nombre: string; descripcion: string; saldoInicial: number; activa: boolean }>) =>
    request<Caja>(`/cajas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  eliminarCaja: (id: number) =>
    request<void>(`/cajas/${id}`, { method: 'DELETE', parseJson: false }),
  getMovimientosCaja: (id: number, filtros?: { fechaDesde?: string; fechaHasta?: string; tipo?: 'ingreso' | 'egreso' }) => {
    const params = new URLSearchParams();
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    return request<MovimientoCaja[]>(`/cajas/${id}/movimientos?${params.toString()}`);
  },
  registrarMovimientoCaja: (id: number, payload: { tipo: 'ingreso' | 'egreso'; monto: number; concepto: string; descripcion?: string; medioPagoId?: number; fecha?: string }) =>
    request<MovimientoCaja>(`/cajas/${id}/movimientos`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  transferirEntreCajas: (cajaOrigenId: number, cajaDestinoId: number, payload: { monto: number; concepto: string; descripcion?: string; fecha?: string }) =>
    request<{ movimientoOrigen: MovimientoCaja; movimientoDestino: MovimientoCaja }>('/cajas/transferir', {
      method: 'POST',
      body: JSON.stringify({ cajaOrigenId, cajaDestinoId, ...payload }),
    }),

  // Medios de Pago
  getMediosPago: () => request<MedioPagoDB[]>('/medios-pago'),
  getMedioPago: (id: number) => request<MedioPagoDB>(`/medios-pago/${id}`),
  crearMedioPago: (payload: { nombre: string; descripcion?: string; cajaId?: number; cajasIds?: number[]; tipoMovimiento?: 'ingreso' | 'egreso' | 'ambos'; activo?: boolean }) =>
    request<MedioPagoDB>('/medios-pago', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  actualizarMedioPago: (id: number, payload: Partial<{ nombre: string; descripcion: string; cajaId: number | null; cajasIds: number[]; tipoMovimiento: 'ingreso' | 'egreso' | 'ambos'; activo: boolean }>) =>
    request<MedioPagoDB>(`/medios-pago/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  eliminarMedioPago: (id: number) =>
    request<void>(`/medios-pago/${id}`, { method: 'DELETE', parseJson: false }),

  // Backup
  getBackupConfig: () =>
    request<{
      config: {
        rutaBackup: string;
        frecuencia: string;
        formatoBackup?: 'auto' | 'zip_portable';
        rutaWinRAR: string;
        mantenerBackups: {
          horarios: number;
          diarios: number;
          semanales: number;
          mensuales: number;
        };
      };
      servidorWindows?: boolean;
      herramientas: {
        winrar: { disponible: boolean; ruta: string | null };
        mysqldump: { disponible: boolean; comando: string | null };
        compresion?: {
          disponible: boolean;
          metodo: string | null;
          extension: string | null;
          mensaje: string | null;
        };
      };
    }>('/backup/config'),
  listarDirectoriosBackup: () =>
    request<{
      directorios: string[];
    }>('/backup/directorios'),
  getBackupExplorer: (currentPath?: string) =>
    request<{
      roots: string[];
      actual: string;
      padre: string;
      puedeSubir: boolean;
      subdirectorios: string[];
    }>(`/backup/explorador${currentPath ? `?path=${encodeURIComponent(currentPath)}` : ''}`),
  updateBackupConfig: (config: {
    rutaBackup?: string;
    frecuencia?: string;
    formatoBackup?: 'auto' | 'zip_portable';
    rutaWinRAR?: string;
    mantenerBackups?: {
      horarios?: number;
      diarios?: number;
      semanales?: number;
      mensuales?: number;
    };
  }) =>
    request<{ message: string; config: Record<string, unknown> }>('/backup/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  ejecutarBackup: () =>
    request<{
      message: string;
      resultado: {
        fecha?: string;
        nombre?: string;
        ruta?: string;
        exito: boolean;
        enProceso?: boolean;
        pasos?: string[];
        errores?: string[];
      };
    }>('/backup/ejecutar', { method: 'POST' }),
  listarBackups: () =>
    request<{
      backups: Array<{
        nombre: string;
        ruta: string;
        tamaño: number;
        fechaCreacion: string;
        fechaModificacion: string;
      }>;
    }>('/backup/listar'),
  restaurarBackup: (nombre: string) => {
    // NO usar timeout en el frontend - el servidor maneja el timeout y siempre enviará una respuesta
    // Usar timeout en el frontend puede causar "Failed to fetch" si el proceso tarda más de lo esperado
    // El servidor tiene su propio timeout de 5 minutos y siempre enviará una respuesta válida
    return request<{ message: string; resultado?: { exito: boolean; nombre: string; fecha: string; metodoUsado?: number; metodoNombre?: string; enProceso?: boolean }; error?: string }>(`/backup/restaurar/${encodeURIComponent(nombre)}`, {
      method: 'POST',
      // NO usar signal aquí - dejar que el servidor maneje el timeout
    });
  },
  eliminarBackup: (nombre: string) =>
    request<{ message: string; resultado: { exito: boolean; nombre: string } }>(`/backup/${encodeURIComponent(nombre)}`, {
      method: 'DELETE',
    }),

  descargarBackup: async (nombre: string) => {
    const token = getToken();
    const requestHeaders: Record<string, string> = {};
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
    const fullUrl = `${API_BASE_URL}/backup/descargar/${encodeURIComponent(nombre)}`;
    const response = await fetch(fullUrl, { method: 'GET', headers: requestHeaders });
    if (!response.ok) {
      let msg = `Error ${response.status}`;
      try {
        const j = (await response.json()) as { message?: string };
        if (j.message) msg = j.message;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    const blob = await response.blob();
    const cd = response.headers.get('Content-Disposition');
    let filename = nombre;
    const m = cd && /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
    if (m) {
      filename = decodeURIComponent(m[1].trim());
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Auditoría
  getAuditoria: (filtros?: {
    page?: number;
    limit?: number;
    usuario_id?: number;
    modulo?: string;
    accion?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    resultado?: 'exitoso' | 'error';
  }) => {
    const params = new URLSearchParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    return request<{
      registros: Auditoria[];
      paginacion: {
        pagina: number;
        limite: number;
        total: number;
        totalPaginas: number;
      };
    }>(`/auditoria?${params.toString()}`);
  },
  getAuditoriaEstadisticas: () =>
    request<{
      accionesFrecuentes: Array<{ accion: string; cantidad: number }>;
      modulosFrecuentes: Array<{ modulo: string; cantidad: number }>;
      usuariosActivos: Array<{ usuario_nombre: string; cantidad: number }>;
      actividadDiaria: Array<{ fecha: string; cantidad: number }>;
      erroresRecientes: number;
    }>('/auditoria/estadisticas'),
  getAuditoriaDetalle: (id: number) => request<Auditoria>(`/auditoria/${id}`),
  getAuditoriaExportar: (filtros: {
    usuario_id?: number;
    modulo?: string;
    accion?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    resultado?: 'exitoso' | 'error';
  }) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    return request<{ registros: Auditoria[] }>(`/auditoria/exportar?${params.toString()}`);
  },
  eliminarAuditoria: (filtros: {
    usuario_id?: number;
    modulo?: string;
    accion?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    resultado?: 'exitoso' | 'error';
  }) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    return request<{ message: string; eliminados: number }>(`/auditoria?${params.toString()}`, {
      method: 'DELETE',
    });
  },

  // Preferencias de columnas por usuario y listado
  getColumnPreferences: (listKey: string) =>
    request<{ columnas: string[] | null }>(`/preferencias/columnas/${encodeURIComponent(listKey)}`),
  saveColumnPreferences: (listKey: string, columnas: string[]) =>
    request<{ columnas: string[] }>(`/preferencias/columnas/${encodeURIComponent(listKey)}`, {
      method: 'PUT',
      body: JSON.stringify({ columnas }),
    }),

  // Registrar exportación
  registrarExportacion: (modulo: string, tipo: string, filtros?: Record<string, unknown>) => {
    // Mapear nombres de módulos a rutas de API
    const rutasModulos: Record<string, string> = {
      'socios': 'socios/exportar',
      'categorias': 'categorias/exportar',
      'liquidaciones': 'exportar', // El router de liquidaciones está en /api, no /api/liquidaciones
      'pagos': 'exportar', // Los pagos se exportan desde liquidaciones (router en /api)
      'tesoreria': 'exportar-tesoreria', // El router de liquidaciones está en /api
      'cajas': 'cajas/exportar',
    };
    const ruta = rutasModulos[modulo] || `${modulo}/exportar`;
    return request<{ message: string }>(`/${ruta}`, {
      method: 'POST',
      body: JSON.stringify({ tipo, filtros: { ...filtros, tipoModulo: modulo } }),
    });
  },
};

export { getToken, setToken, removeToken };


