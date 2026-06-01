const { execute } = require('../db');
const os = require('os');

/**
 * Obtiene la IP de la interfaz de red del servidor (no localhost)
 */
const obtenerIPServidor = () => {
  try {
    const interfaces = os.networkInterfaces();
    
    // Priorizar interfaces Ethernet/WiFi sobre loopback
    const prioridad = ['Ethernet', 'Wi-Fi', 'WiFi', 'eth0', 'wlan0', 'en0'];
    
    for (const nombrePrioritario of prioridad) {
      for (const nombre in interfaces) {
        if (nombre.toLowerCase().includes(nombrePrioritario.toLowerCase())) {
          const addrs = interfaces[nombre];
          for (const addr of addrs) {
            if (addr.family === 'IPv4' && !addr.internal) {
              return addr.address;
            }
          }
        }
      }
    }
    
    // Si no encuentra, buscar cualquier IPv4 no interna
    for (const nombre in interfaces) {
      const addrs = interfaces[nombre];
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          return addr.address;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener IP del servidor:', error);
    return null;
  }
};

/**
 * Obtiene la IP pública del cliente que accede a la aplicación
 * Prioriza headers de proxy para obtener la IP real del cliente
 */
const obtenerIPPublicaCliente = (req) => {
  let ip = null;
  
  // 1. Headers de proxy/load balancer (más confiable para IP pública)
  // x-forwarded-for contiene la IP original del cliente cuando hay proxy
  if (req.headers['x-forwarded-for']) {
    const forwarded = req.headers['x-forwarded-for'];
    // Puede venir como: "client-ip, proxy1-ip, proxy2-ip"
    // La primera es la IP original del cliente
    ip = forwarded.split(',')[0].trim();
  }
  
  // 2. Otros headers comunes de proxies
  if (!ip && req.headers['x-real-ip']) {
    ip = req.headers['x-real-ip'].trim();
  }
  
  // 3. Cloudflare
  if (!ip && req.headers['cf-connecting-ip']) {
    ip = req.headers['cf-connecting-ip'].trim();
  }
  
  // 4. Otros headers de proxy
  if (!ip && req.headers['x-client-ip']) {
    ip = req.headers['x-client-ip'].trim();
  }
  
  // 5. Si Express tiene trust proxy configurado, usar req.ip
  if (!ip && req.ip) {
    ip = req.ip;
  }
  
  // 6. Fallback a connection info
  if (!ip) {
    if (req.connection && req.connection.remoteAddress) {
      ip = req.connection.remoteAddress;
    } else if (req.socket && req.socket.remoteAddress) {
      ip = req.socket.remoteAddress;
    }
  }
  
  // Limpiar y normalizar IP
  if (ip) {
    // Remover prefijo IPv6 si existe (::ffff:192.168.1.1 -> 192.168.1.1)
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    
    // Remover puerto si existe (192.168.1.1:12345 -> 192.168.1.1)
    // Solo si tiene formato IP:PUERTO (no confundir con IPv6)
    if (ip.includes(':') && !ip.includes('::')) {
      const parts = ip.split(':');
      const lastPart = parts[parts.length - 1];
      if (parts.length === 2 && !isNaN(parseInt(lastPart))) {
        ip = parts[0];
      }
    }
    
    ip = ip.trim();
    
    // Si la IP es localhost (::1, 127.0.0.1, localhost), intentar obtener IP del servidor
    const esLocalhost = ip === '::1' || 
                       ip === '127.0.0.1' || 
                       ip === 'localhost' ||
                       ip === '::ffff:127.0.0.1' ||
                       ip.startsWith('127.') ||
                       ip.startsWith('::ffff:127.');
    
    if (esLocalhost) {
      // Si es localhost, obtener la IP de la interfaz de red del servidor
      const ipServidor = obtenerIPServidor();
      if (ipServidor) {
        // Debug
        if (process.env.NODE_ENV !== 'production') {
          console.log('[IP DEBUG] Localhost detectado, usando IP del servidor:', ipServidor);
        }
        return ipServidor;
      }
      // Si no se puede obtener IP del servidor, usar la IP localhost pero indicarlo
      if (process.env.NODE_ENV !== 'production') {
        console.log('[IP DEBUG] Localhost detectado pero no se pudo obtener IP del servidor');
      }
      return 'localhost (::1)';
    }
    
    // Debug
    if (process.env.NODE_ENV !== 'production') {
      console.log('[IP DEBUG] IP final capturada:', ip);
    }
    
    return ip;
  }
  
  // Si no se pudo obtener IP, intentar obtener IP del servidor como fallback
  const ipServidor = obtenerIPServidor();
  if (ipServidor) {
    console.warn('[AUDITORIA] No se pudo obtener IP del cliente, usando IP del servidor:', ipServidor);
    return ipServidor;
  }
  
  console.warn('[AUDITORIA] No se pudo obtener IP del cliente');
  return 'Desconocida';
};

/**
 * Determina si una acción debe ser registrada en auditoría
 * No registramos acciones de listar (GET sin ID) para evitar que la tabla crezca demasiado
 */
const debeRegistrar = (metodo, ruta) => {
  // No registrar auditoría para rutas de auditoría (evitar recursión) y health check
  if (ruta.includes('/auditoria') || ruta === '/health') {
    return false;
  }
  
  // Siempre registrar acciones de modificación (POST, PUT, DELETE)
  if (metodo === 'POST' || metodo === 'PUT' || metodo === 'PATCH' || metodo === 'DELETE') {
    return true;
  }
  
  // Para GET, solo registrar acciones importantes:
  // - Login (siempre importante)
  // - Consultar (GET con ID específico, como ver detalle de un socio)
  // - Exportaciones (PDF, Excel, etc.)
  // - NO registrar Listar (GET sin ID, como listar todos los socios)
  if (metodo === 'GET') {
    // Registrar login
    if (ruta.includes('/auth/login')) {
      return true;
    }
    
    // Registrar exportaciones (PDF, Excel, etc.)
    if (ruta.includes('/exportar') || ruta.includes('/export') || ruta.includes('/imprimir') || ruta.includes('/pdf') || ruta.includes('/excel')) {
      return true;
    }
    
    // NO registrar listar (GET sin ID en la ruta)
    // Si la ruta tiene un ID (número), es una consulta específica y sí se registra
    if (ruta.match(/\/\d+(\?|$)/)) {
      return true; // Es una consulta específica (ej: /api/socios/123)
    }
    
    // NO registrar listar (GET sin ID)
    return false;
  }
  
  // Para otros métodos, registrar por defecto
  return true;
};

/**
 * Middleware de auditoría - Registra todas las acciones del sistema
 * DEBE ejecutarse DESPUÉS de authenticateToken para que req.user esté disponible
 * Registra: usuario de la aplicación, acción, módulo, IP pública, fecha/hora, datos
 * NO registra acciones de listar (GET sin ID) para evitar que la tabla crezca demasiado
 */
const registrarAuditoria = async (req, res, next) => {
  // Información de la petición (capturar ANTES de que se ejecute la ruta)
  const metodo = req.method;
  // Usar req.baseUrl + req.path para obtener la ruta completa sin query string
  // req.path puede no estar disponible en todas las versiones de Express
  // req.originalUrl puede incluir query params que interfieren con la detección
  let ruta = '';
  if (req.path) {
    ruta = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
  } else if (req.originalUrl) {
    ruta = req.originalUrl.split('?')[0];
  } else if (req.url) {
    ruta = req.url.split('?')[0];
  }
  
  // Asegurar que la ruta comience con /api para consistencia
  if (!ruta.startsWith('/api') && req.baseUrl) {
    ruta = req.baseUrl + ruta;
  }
  
  // Debug: Log para verificar la ruta capturada
  if (process.env.NODE_ENV !== 'production' && (ruta.includes('exportar') || metodo === 'POST')) {
    console.log('[AUDITORIA DEBUG]', {
      path: req.path,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      url: req.url,
      rutaUsada: ruta,
      metodo: metodo
    });
  }
  
  // Verificar si esta acción debe ser registrada
  if (!debeRegistrar(metodo, ruta)) {
    return next(); // Saltar el registro de auditoría
  }
  
  // Si ya se interceptó res.json en este request, no hacerlo de nuevo
  // Esto evita que el middleware se ejecute múltiples veces para la misma petición
  if (res._auditoriaInterceptado) {
    return next();
  }
  res._auditoriaInterceptado = true;
  
  // Guardar la función original de res.json para interceptar respuestas
  const originalJson = res.json.bind(res);
  
  // Obtener IP pública del cliente (desde donde accede a la aplicación)
  const ipAddress = obtenerIPPublicaCliente(req);
  const userAgent = req.headers['user-agent'] || 'Desconocido';
  
  // Datos de la petición (sin información sensible) - capturar ANTES de extraer módulo
  const datosNuevos = sanitizarDatos(req.body);
  
  // Extraer módulo y acción de la ruta
  // IMPORTANTE: Verificar exportación ANTES de extraer acción para evitar que se detecte como "Crear"
  // IMPORTANTE: Pasar datosNuevos a extraerModulo para que pueda determinar correctamente Pagos vs Liquidaciones
  const esExportacion = ruta.includes('/exportar') || ruta.includes('/export') || ruta.includes('/imprimir') || ruta.includes('/pdf') || ruta.includes('/excel');
  const modulo = extraerModulo(ruta, datosNuevos);
  const accion = esExportacion ? 'Exportar' : extraerAccion(metodo, ruta);
  
  // Guardar req.params para usar en generarDescripcion
  const paramsBackup = req.params || {};
  let datosAnteriores = null;
  
  // Obtener datos anteriores solo para PUT/PATCH/DELETE
  // Si la ruta ya proporcionó datos de auditoría (req.auditData), usarlos
  if (req.auditData?.datosAnteriores) {
    datosAnteriores = req.auditData.datosAnteriores;
    // Si también hay datos nuevos en auditData, usarlos
    if (req.auditData.datosNuevos !== undefined) {
      datosNuevos = req.auditData.datosNuevos;
    }
  } else if ((metodo === 'PUT' || metodo === 'PATCH' || metodo === 'DELETE') && req.body?.id) {
    datosAnteriores = await obtenerDatosAnteriores(modulo, req.body.id);
  } else if (req.params?.id && (metodo === 'PUT' || metodo === 'PATCH' || metodo === 'DELETE')) {
    datosAnteriores = await obtenerDatosAnteriores(modulo, req.params.id);
  }
  
  // Flag para evitar registros duplicados - usar una propiedad en el objeto res
  // Esta propiedad persiste durante toda la vida de la respuesta
  if (!res._auditoriaRegistrada) {
    res._auditoriaRegistrada = false;
  }
  
  // Función auxiliar para registrar auditoría
  const registrarAuditoriaEnRespuesta = (data = null) => {
    // Evitar registros duplicados
    if (res._auditoriaRegistrada) {
      return;
    }
    res._auditoriaRegistrada = true;
    
    // IMPORTANTE: Verificar req.auditData DESPUÉS de que la ruta se ejecute
    // La ruta puede haber guardado datos en req.auditData que necesitamos usar
    let datosAnterioresFinales = datosAnteriores;
    let datosNuevosFinales = datosNuevos;
    
    if (req.auditData?.datosAnteriores) {
      datosAnterioresFinales = req.auditData.datosAnteriores;
    }
    if (req.auditData?.datosNuevos !== undefined) {
      datosNuevosFinales = req.auditData.datosNuevos;
    }
    
    // Capturar usuario DESPUÉS de que se ejecute la ruta (cuando req.user ya está disponible)
    const usuarioId = req.user?.id || null;
    const usuarioNombre = req.user?.usuario || 'No autenticado';
    
    const resultado = res.statusCode >= 200 && res.statusCode < 300 ? 'exitoso' : 'error';
    const mensajeError = resultado === 'error' ? (data?.message || 'Error desconocido') : null;
    
    // Debug: Log para verificar que se está capturando correctamente
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUDITORIA]', {
        usuario: usuarioNombre,
        usuarioId: usuarioId,
        ip: ipAddress,
        ruta: ruta,
        accion: accion,
        modulo: modulo,
        statusCode: res.statusCode,
        tieneAuditData: !!req.auditData,
        datosAnteriores: datosAnterioresFinales,
      });
    }
    
    // Registrar en auditoría de forma asíncrona (no bloquea la respuesta)
    registrarEnAuditoria({
      usuarioId,
      usuarioNombre,
      accion,
      modulo,
      descripcion: generarDescripcion(accion, modulo, datosNuevosFinales, datosAnterioresFinales, ruta, data, metodo, paramsBackup),
      metodoHttp: metodo,
      ruta,
      ipAddress: ipAddress || 'Desconocida',
      userAgent,
      datosAnteriores: datosAnterioresFinales ? JSON.stringify(datosAnterioresFinales) : null,
      datosNuevos: datosNuevosFinales ? JSON.stringify(datosNuevosFinales) : null,
      resultado,
      mensajeError,
    }).catch(err => {
      console.error('Error al registrar auditoría:', err);
    });
  };
  
  // Guardar la función original de send
  const originalSend = res.send.bind(res);
  
  // Interceptar res.send() para capturar respuestas 204 (No Content)
  res.send = function(body) {
    // Registrar auditoría antes de enviar la respuesta
    // El statusCode ya debería estar establecido si se llamó res.status() antes
    registrarAuditoriaEnRespuesta(null);
    // Llamar a la función original
    return originalSend.call(this, body);
  };
  
  // Interceptar la respuesta para registrar el resultado
  // En este punto req.user ya debería estar disponible (después de authenticateToken)
  res.json = function(data) {
    // Evitar registros duplicados (res.json puede llamarse múltiples veces)
    if (res._auditoriaRegistrada) {
      return originalJson(data);
    }
    
    // Registrar auditoría
    registrarAuditoriaEnRespuesta(data);
    
    // Llamar a la función original
    return originalJson(data);
  };
  
  next();
};

/**
 * Registra un evento en la tabla de auditoría
 */
const registrarEnAuditoria = async (datos) => {
  try {
    await execute(
      `INSERT INTO auditoria (
        usuario_id, usuario_nombre, accion, modulo, descripcion,
        metodo_http, ruta, ip_address, user_agent,
        datos_anteriores, datos_nuevos, resultado, mensaje_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.usuarioId,
        datos.usuarioNombre,
        datos.accion,
        datos.modulo,
        datos.descripcion,
        datos.metodoHttp,
        datos.ruta,
        datos.ipAddress,
        datos.userAgent,
        datos.datosAnteriores,
        datos.datosNuevos,
        datos.resultado,
        datos.mensajeError,
      ]
    );
  } catch (error) {
    console.error('Error al insertar en auditoría:', error);
  }
};

/**
 * Extrae el módulo de la ruta
 */
const extraerModulo = (ruta, datosNuevos = null) => {
  // Detectar tesorería en rutas de exportación (debe ir primero)
  if (ruta.includes('/exportar-tesoreria')) {
    return 'Tesorería';
  }
  
  // Detectar exportaciones específicas por módulo (debe ir antes de la detección genérica)
  if (ruta.includes('/socios/exportar')) {
    return 'Socios';
  }
  if (ruta.includes('/categorias/exportar')) {
    return 'Categorías';
  }
  if (ruta.includes('/cajas/exportar')) {
    return 'Cajas';
  }
  
  // Detectar exportaciones de liquidaciones/pagos
  // IMPORTANTE: Solo verificar /api/exportar (ruta genérica) o rutas de liquidaciones
  // NO incluir rutas específicas como /socios/exportar, /categorias/exportar, etc. (ya detectadas arriba)
  if ((ruta === '/api/exportar' || (ruta.includes('/exportar') && ruta.includes('/liquidaciones'))) 
      && !ruta.includes('/socios') && !ruta.includes('/categorias') && !ruta.includes('/cajas')) {
    // Intentar obtener tipoModulo de los datos para determinar si es Pagos o Liquidaciones
    let tipoModulo = null;
    if (datosNuevos) {
      const datos = datosNuevos && typeof datosNuevos === 'string' ? JSON.parse(datosNuevos) : datosNuevos;
      tipoModulo = datos?.filtros?.tipoModulo || datos?.tipoModulo;
    }
    
    if (tipoModulo === 'pagos') {
      return 'Pagos';
    } else if (tipoModulo === 'liquidaciones') {
      return 'Liquidaciones';
    }
    // Si no hay tipoModulo, por defecto es Liquidaciones (comportamiento anterior)
    return 'Liquidaciones';
  }
  
  const partes = ruta.split('/').filter(p => p && p !== 'api');
  if (partes.length === 0) return 'sistema';
  
  const modulo = partes[0];
  const modulos = {
    'socios': 'Socios',
    'categorias': 'Categorías',
    'liquidaciones': 'Liquidaciones',
    'liquidaciones-mensuales': 'Liquidaciones',
    'liquidaciones-cuotas': 'Liquidaciones',
    'pagos': 'Pagos',
    'usuarios': 'Usuarios',
    'permisos': 'Permisos',
    'cajas': 'Cajas',
    'medios-pago': 'Medios de Pago',
    'backup': 'Backup',
    'tesoreria': 'Tesorería',
    'auth': 'Autenticación',
    'club-config': 'Config. Club',
  };
  
  return modulos[modulo] || modulo;
};

/**
 * Extrae la acción del método HTTP y la ruta
 */
const extraerAccion = (metodo, ruta) => {
  // IMPORTANTE: Verificar acciones especiales ANTES de las acciones genéricas
  // Esto evita que las exportaciones se detecten como "Crear"
  
  // Exportaciones (debe ir ANTES de verificar POST)
  if (ruta.includes('/exportar') || ruta.includes('/export') || ruta.includes('/imprimir') || ruta.includes('/pdf') || ruta.includes('/excel')) {
    return 'Exportar';
  }
  
  // Otras acciones especiales
  if (ruta.includes('/login')) return 'Iniciar Sesión';
  if (ruta.includes('/logout')) return 'Cerrar Sesión';
  if (ruta.includes('/registrar-pago') || ruta.includes('/pagar') || ruta.includes('/liquidaciones-cuotas/pagar')) return 'Registrar Pago';
  if (ruta.includes('/marcar-pagado')) return 'Marcar como Pagado';
  if (ruta.includes('/anular-pago')) return 'Anular Pago';
  if (ruta.includes('/cerrar-caja')) return 'Cerrar Caja';
  if (ruta.includes('/transferir')) return 'Transferir entre Cajas';
  if (ruta.includes('/backup/restaurar') || ruta.includes('/restaurar')) return 'Restaurar Backup';
  if (ruta.includes('/backup/ejecutar')) return 'Ejecutar Backup';
  if (ruta.includes('/backup') && metodo === 'DELETE') return 'Eliminar Backup';
  if (ruta.includes('/backup')) return 'Backup';
  if (ruta.includes('/restore')) return 'Restaurar';
  if (ruta.includes('/movimientos') && metodo === 'POST') return 'Registrar Movimiento';
  
  // Acciones genéricas por método HTTP
  const acciones = {
    'GET': ruta.includes('/:id') ? 'Consultar' : 'Listar',
    'POST': 'Crear',
    'PUT': 'Modificar',
    'PATCH': 'Modificar',
    'DELETE': 'Eliminar',
  };
  
  return acciones[metodo] || metodo;
};

/**
 * Genera una descripción legible y específica de la acción
 */
const generarDescripcion = (accion, modulo, datosNuevos, datosAnteriores, ruta, respuesta, metodo = 'GET', params = {}) => {
  let descripcion = '';
  
  // Parsear datos si vienen como string
  const datos = datosNuevos && typeof datosNuevos === 'string' ? JSON.parse(datosNuevos) : datosNuevos;
  const resp = respuesta && typeof respuesta === 'object' ? respuesta : null;
  
  // Descripciones específicas según el módulo y acción
  if (ruta.includes('/transferir')) {
    // Transferencia entre cajas
    if (datos) {
      const monto = datos.monto ? `$${Number(datos.monto).toFixed(2)}` : '';
      const concepto = datos.concepto || '';
      const cajaOrigen = datos.cajaOrigenId || '';
      const cajaDestino = datos.cajaDestinoId || '';
      descripcion = `Transferir entre Cajas${monto ? `: ${monto}` : ''}${concepto ? ` - ${concepto}` : ''}${cajaOrigen && cajaDestino ? ` (Caja ${cajaOrigen} → Caja ${cajaDestino})` : ''}`;
    } else if (resp && resp.cajaOrigen && resp.cajaDestino) {
      const monto = resp.monto ? `$${Number(resp.monto).toFixed(2)}` : '';
      descripcion = `Transferir entre Cajas: ${resp.cajaOrigen} → ${resp.cajaDestino}${monto ? ` - ${monto}` : ''}`;
    } else {
      descripcion = 'Transferir dinero entre cajas';
    }
  } else if (ruta.includes('/movimientos')) {
    // Movimientos de caja
    if (datos) {
      const tipo = datos.tipo === 'ingreso' ? 'Ingreso' : 'Egreso';
      const monto = datos.monto ? `$${Number(datos.monto).toFixed(2)}` : '';
      const concepto = datos.concepto || '';
      const cajaId = ruta.match(/\/cajas\/(\d+)\/movimientos/)?.[1];
      descripcion = `Registrar ${tipo} en Caja${cajaId ? ` (ID: ${cajaId})` : ''}: ${concepto}${monto ? ` - ${monto}` : ''}`;
    } else {
      descripcion = `Registrar movimiento en Caja`;
    }
  } else if (ruta.includes('/auth/login')) {
    const usuario = datos?.usuario || resp?.user?.usuario || '';
    descripcion = usuario ? `Iniciar sesión: ${usuario}` : 'Iniciar sesión en el sistema';
  } else if (ruta.includes('/registrar-pago') || ruta.includes('/marcar-pagado') || ruta.includes('/liquidaciones-cuotas/pagar') || ruta.includes('/pagar')) {
    // Registro de pagos de cuotas
    if (datos) {
      const ids = datos.ids || (Array.isArray(datos) ? datos : []);
      const cantidadCuotas = Array.isArray(ids) ? ids.length : (ids ? 1 : 0);
      const medioPago = datos.medioPago || resp?.medioPago || '';
      const total = resp?.total || (resp && Array.isArray(resp) ? resp.reduce((sum, c) => sum + (Number(c.monto) || 0), 0) : (datos.total || 0));
      
      // Calcular total si hay cuotas en la respuesta
      let montoTotal = '';
      if (resp && Array.isArray(resp) && resp.length > 0) {
        // Si resp es un array, calcular total
        const suma = resp.reduce((sum, c) => sum + (Number(c.monto) || 0), 0);
        if (suma > 0) montoTotal = `$${suma.toFixed(2)}`;
      } else if (resp && resp.cuotas && Array.isArray(resp.cuotas)) {
        const suma = resp.cuotas.reduce((sum, c) => sum + (Number(c.monto) || 0), 0);
        if (suma > 0) montoTotal = `$${suma.toFixed(2)}`;
      } else if (total && Number(total) > 0) {
        montoTotal = `$${Number(total).toFixed(2)}`;
      }
      
      descripcion = `Registrar Pago${cantidadCuotas > 0 ? ` de ${cantidadCuotas} cuota${cantidadCuotas !== 1 ? 's' : ''}` : ''}${montoTotal ? ` - Total: ${montoTotal}` : ''}${medioPago ? ` - Medio: ${medioPago.split(',')[0].split(':')[0].trim()}` : ''}`;
    } else if (resp) {
      // La respuesta puede ser un array o un objeto
      const cuotas = Array.isArray(resp) ? resp : (resp.cuotas || []);
      const cantidadCuotas = Array.isArray(cuotas) ? cuotas.length : 0;
      const total = resp.total || (Array.isArray(resp) ? resp.reduce((sum, c) => sum + (Number(c.monto) || 0), 0) : 0);
      const medioPago = resp.medioPago || '';
      descripcion = `Registrar Pago${cantidadCuotas > 0 ? ` de ${cantidadCuotas} cuota${cantidadCuotas !== 1 ? 's' : ''}` : ''}${total ? ` - Total: $${Number(total).toFixed(2)}` : ''}${medioPago ? ` - Medio: ${medioPago.split(',')[0].split(':')[0].trim()}` : ''}`;
    } else {
      descripcion = 'Registrar pago de cuota';
    }
  } else if (ruta.includes('/cerrar-caja')) {
    if (resp && resp.cajaNombre) {
      descripcion = `Cerrar caja: ${resp.cajaNombre}`;
    } else {
      descripcion = 'Cerrar caja';
    }
  } else if (ruta.includes('/club-config') && metodo === 'PUT') {
    const nombreClub = datos?.nombreClub || '';
    descripcion = nombreClub ? `Modificar configuración del club: ${nombreClub}` : 'Modificar configuración del club (nombre, logo, color)';
  } else if (modulo === 'Socios') {
    // Verificar exportación PRIMERO para evitar que se detecte como "Crear"
    if (accion === 'Exportar' || ruta.includes('/socios/exportar')) {
      const tipo = datos?.tipo || 'PDF';
      const filtros = datos?.filtros || {};
      const total = filtros?.total || datos?.total || '';
      descripcion = `Exportar Socios a ${tipo}${total ? ` (${total} socios)` : ''}`;
    } else if (accion === 'Crear') {
      if (datos) {
        const nombre = datos.nombre || datos.apellido || '';
        const apellido = datos.apellido || '';
        const numeroSocio = datos.numeroSocio || resp?.numeroSocio || '';
        descripcion = `Crear nuevo socio${numeroSocio ? ` #${numeroSocio}` : ''}${apellido ? `: ${apellido}${nombre ? `, ${nombre}` : ''}` : ''}`;
      } else {
        descripcion = 'Crear nuevo socio';
      }
    } else if (accion === 'Modificar') {
      if (datos) {
        const nombre = datos.nombre || datos.apellido || '';
        const apellido = datos.apellido || '';
        const id = datos.id || '';
        descripcion = `Modificar socio${id ? ` (ID: ${id})` : ''}${apellido ? `: ${apellido}${nombre ? `, ${nombre}` : ''}` : ''}`;
      } else {
        descripcion = 'Modificar socio';
      }
    } else if (accion === 'Eliminar') {
      // Usar datos anteriores si están disponibles (para DELETE)
      const datosEliminar = datosAnteriores || datos;
      if (datosEliminar) {
        const numeroSocio = datosEliminar.numero_socio || datosEliminar.numeroSocio;
        const apellido = datosEliminar.apellido || '';
        const nombre = datosEliminar.nombre || '';
        if (numeroSocio && apellido && nombre) {
          descripcion = `Eliminar socio: ${apellido}, ${nombre} (N° ${numeroSocio})`;
        } else if (numeroSocio) {
          descripcion = `Eliminar socio (N° ${numeroSocio})`;
        } else if (datosEliminar.id) {
          descripcion = `Eliminar socio (ID: ${datosEliminar.id})`;
        } else {
          descripcion = 'Eliminar socio';
        }
      } else {
        descripcion = 'Eliminar socio';
      }
    } else {
      descripcion = `${accion} en ${modulo}`;
    }
  } else if (modulo === 'Categorías') {
    // Verificar exportación PRIMERO para evitar que se detecte como "Crear"
    if (accion === 'Exportar' || ruta.includes('/exportar')) {
      const tipo = datos?.tipo || 'PDF';
      const filtros = datos?.filtros || {};
      const total = filtros?.total || datos?.total || '';
      descripcion = `Exportar Categorías a ${tipo}${total ? ` (${total} categorías)` : ''}`;
    } else if (accion === 'Crear') {
      descripcion = datos?.nombre ? `Crear categoría: ${datos.nombre}` : 'Crear nueva categoría';
    } else if (accion === 'Modificar') {
      descripcion = datos?.nombre ? `Modificar categoría: ${datos.nombre}` : 'Modificar categoría';
    } else if (accion === 'Eliminar') {
      descripcion = datos?.id ? `Eliminar categoría (ID: ${datos.id})` : 'Eliminar categoría';
    } else {
      descripcion = `${accion} en ${modulo}`;
    }
  } else if (modulo === 'Cajas') {
    if (accion === 'Crear') {
      descripcion = datos?.nombre ? `Crear caja: ${datos.nombre}` : 'Crear nueva caja';
    } else if (accion === 'Modificar') {
      descripcion = datos?.nombre ? `Modificar caja: ${datos.nombre}` : 'Modificar caja';
    } else if (accion === 'Eliminar') {
      // Usar datos anteriores si están disponibles (para DELETE)
      const datosEliminar = datosAnteriores || datos;
      if (datosEliminar) {
        const nombre = datosEliminar.nombre || '';
        if (nombre) {
          descripcion = `Eliminar caja: ${nombre}`;
        } else if (datosEliminar.id) {
          descripcion = `Eliminar caja (ID: ${datosEliminar.id})`;
        } else {
          descripcion = 'Eliminar caja';
        }
      } else {
        descripcion = 'Eliminar caja';
      }
    } else if (accion === 'Registrar Movimiento') {
      const tipo = datos?.tipo || '';
      const monto = datos?.monto || '';
      const concepto = datos?.concepto || '';
      if (tipo && monto && concepto) {
        descripcion = `Registrar ${tipo} en caja: ${concepto} ($${Number(monto).toFixed(2)})`;
      } else {
        descripcion = `Registrar movimiento en caja`;
      }
    } else {
      descripcion = `${accion} en ${modulo}`;
    }
  } else if (modulo === 'Medios de Pago') {
    if (accion === 'Crear') {
      descripcion = datos?.nombre ? `Crear medio de pago: ${datos.nombre}` : 'Crear nuevo medio de pago';
    } else if (accion === 'Modificar') {
      descripcion = datos?.nombre ? `Modificar medio de pago: ${datos.nombre}` : 'Modificar medio de pago';
    } else if (accion === 'Eliminar') {
      // Usar datos anteriores si están disponibles (para DELETE)
      const datosEliminar = datosAnteriores || datos;
      if (datosEliminar) {
        const nombre = datosEliminar.nombre || '';
        if (nombre) {
          descripcion = `Eliminar medio de pago: ${nombre}`;
        } else if (datosEliminar.id) {
          descripcion = `Eliminar medio de pago (ID: ${datosEliminar.id})`;
        } else {
          descripcion = 'Eliminar medio de pago';
        }
      } else {
        descripcion = 'Eliminar medio de pago';
      }
    } else {
      descripcion = `${accion} en ${modulo}`;
    }
  } else if (modulo === 'Usuarios') {
    if (accion === 'Crear') {
      descripcion = datos?.usuario ? `Crear usuario: ${datos.usuario}` : 'Crear nuevo usuario';
    } else if (accion === 'Modificar') {
      descripcion = datos?.usuario ? `Modificar usuario: ${datos.usuario}` : 'Modificar usuario';
    } else if (accion === 'Eliminar') {
      descripcion = datos?.id ? `Eliminar usuario (ID: ${datos.id})` : 'Eliminar usuario';
    } else {
      descripcion = `${accion} en ${modulo}`;
    }
  } else if (modulo === 'Liquidaciones') {
    if (ruta.includes('/generar')) {
      descripcion = datos?.mes ? `Generar liquidación mensual: ${datos.mes}` : 'Generar liquidación mensual';
    } else {
      descripcion = `${accion} en ${modulo}`;
    }
  } else if (modulo === 'Backup') {
    if (accion === 'Ejecutar Backup' || ruta.includes('/ejecutar')) {
      descripcion = 'Ejecutar backup del sistema';
    } else if (accion === 'Eliminar Backup' || (ruta.includes('/backup') && metodo === 'DELETE')) {
      const nombreBackup = params?.nombre || datosNuevos?.nombre || datosAnteriores?.nombre || '';
      descripcion = nombreBackup ? `Eliminar backup: ${nombreBackup}` : 'Eliminar backup';
    } else if (accion === 'Restaurar Backup' || ruta.includes('/restaurar')) {
      const nombreBackup = params?.nombre || datosNuevos?.nombre || '';
      descripcion = nombreBackup ? `Restaurar backup: ${nombreBackup}` : 'Restaurar backup';
    } else {
      descripcion = `${accion} en ${modulo}`;
    }
  } else if (accion === 'Exportar' || ruta.includes('/exportar')) {
    // Exportaciones (PDF, Excel, etc.)
    const tipo = datos?.tipo || 'PDF';
    const filtros = datos?.filtros || {};
    const total = filtros?.total || datos?.total || '';
    
    // Descripciones específicas por tipo de exportación
    if (ruta.includes('/exportar-tesoreria')) {
      const fechaDesde = filtros?.fechaDesde ? ` desde ${filtros.fechaDesde}` : '';
      const fechaHasta = filtros?.fechaHasta ? ` hasta ${filtros.fechaHasta}` : '';
      const medioPago = filtros?.medioPago ? ` - Medio: ${filtros.medioPago}` : '';
      descripcion = `Exportar Tesorería a ${tipo}${fechaDesde}${fechaHasta}${medioPago}${total ? ` (${total} registros)` : ''}`;
    } else if (ruta.includes('/cajas/exportar')) {
      const cajaId = filtros?.cajaId ? ` (Caja ID: ${filtros.cajaId})` : '';
      const fechaDesde = filtros?.fechaDesde ? ` desde ${filtros.fechaDesde}` : '';
      const fechaHasta = filtros?.fechaHasta ? ` hasta ${filtros.fechaHasta}` : '';
      const tipoMov = filtros?.tipo ? ` - Tipo: ${filtros.tipo}` : '';
      descripcion = `Exportar Resumen de Caja a ${tipo}${cajaId}${fechaDesde}${fechaHasta}${tipoMov}${total ? ` (${total} movimientos)` : ''}`;
    } else if (ruta.includes('/categorias/exportar')) {
      descripcion = `Exportar Categorías a ${tipo}${total ? ` (${total} categorías)` : ''}`;
    } else if (modulo === 'Pagos') {
      // Exportaciones de listado de cobros
      descripcion = `Exportar Listado de Cobros a ${tipo}${total ? ` (${total} cobros)` : ''}`;
    } else if (modulo === 'Liquidaciones' || (ruta.includes('/exportar') && !ruta.includes('/cajas') && !ruta.includes('/categorias') && !ruta.includes('/socios'))) {
      // Exportaciones de liquidaciones mensuales (router montado en /api)
      const mes = filtros?.mes || '';
      const mesTexto = mes ? ` - Mes: ${mes}` : '';
      descripcion = `Exportar Liquidaciones Mensuales a ${tipo}${mesTexto}${total ? ` (${total} registros)` : ''}`;
    } else if (filtros?.tipo === 'recibo' || datos?.tipo === 'recibo') {
      // Recibos de pago
      const numeroRecibo = filtros?.numeroRecibo ?? datos?.numeroRecibo ?? '';
      const numeroSocio = filtros?.numeroSocio || datos?.numeroSocio || '';
      const cuotas = filtros?.cuotas || datos?.cuotas || '';
      descripcion = `Generar Recibo de Pago${numeroRecibo ? ` Nº ${numeroRecibo}` : ''}${numeroSocio ? ` - Socio #${numeroSocio}` : ''}${cuotas ? ` (${cuotas} cuota${cuotas !== 1 ? 's' : ''})` : ''}${total ? ` - Total: $${Number(total).toFixed(2)}` : ''}`;
    } else {
      const filtrosTexto = Object.keys(filtros).length > 0 ? ` con filtros` : '';
      descripcion = `Exportar ${modulo} a ${tipo}${filtrosTexto}${total ? ` (${total} registros)` : ''}`;
    }
  } else {
    // Descripción genérica
    descripcion = `${accion} en ${modulo}`;
    if (datos) {
      if (datos.nombre) descripcion += `: ${datos.nombre}`;
      else if (datos.usuario) descripcion += `: ${datos.usuario}`;
      else if (datos.id) descripcion += ` (ID: ${datos.id})`;
    }
  }
  
  return descripcion || `${accion} en ${modulo}`;
};

/**
 * Sanitiza datos para no incluir información sensible
 */
const sanitizarDatos = (datos) => {
  if (!datos || typeof datos !== 'object') return null;
  
  const sanitizado = { ...datos };
  
  // Eliminar campos sensibles
  delete sanitizado.password;
  delete sanitizado.password_hash;
  delete sanitizado.token;
  
  // Limitar tamaño de datos grandes
  if (sanitizado.descripcion && sanitizado.descripcion.length > 500) {
    sanitizado.descripcion = sanitizado.descripcion.substring(0, 500) + '...';
  }
  
  return sanitizado;
};

/**
 * Obtiene los datos anteriores de un registro (para comparación)
 */
const obtenerDatosAnteriores = async (modulo, id) => {
  try {
    const { query } = require('../db');
    
    const tablas = {
      'Socios': 'socios',
      'Categorías': 'categorias',
      'Liquidaciones': 'liquidaciones_mensuales',
      'Usuarios': 'usuarios',
      'Cajas': 'cajas',
      'Medios de Pago': 'medios_pago',
    };
    
    const tabla = tablas[modulo];
    if (!tabla) return null;
    
    const [registro] = await query(`SELECT * FROM ${tabla} WHERE id = ?`, [id]);
    if (registro) {
      return sanitizarDatos(registro);
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener datos anteriores:', error);
    return null;
  }
};

module.exports = { registrarAuditoria, registrarEnAuditoria };

