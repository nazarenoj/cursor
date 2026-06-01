/**
 * ENTRYPOINT: primera escritura en log para confirmar que Hostinger ejecutó este archivo.
 * Solo usa módulos built-in; si este archivo no existe tras redeploy, el entrypoint no se está ejecutando.
 */
const fs = require('fs');
const path = require('path');
const entrypointLogDir = path.join(__dirname, '../logs');
const entrypointLogFile = path.join(entrypointLogDir, 'startup.log');
try {
  if (!fs.existsSync(entrypointLogDir)) fs.mkdirSync(entrypointLogDir, { recursive: true });
  fs.appendFileSync(entrypointLogFile, `[ENTRYPOINT] ${new Date().toISOString()} index.js ejecutado (Hostinger)\n`);
} catch (_) {}

require('dotenv').config();

// --- LOG DE ARRANQUE en archivo server/logs/startup.log (Hostinger no muestra consola) ---
const { startupLog, logError } = require('./utils/startupLogger');
startupLog('01', 'Script iniciado, dotenv cargado');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
startupLog('02', 'Express/cors/morgan/helmet/compression requeridos');

const { initDb } = require('./db');
startupLog('03', 'db (initDb) requerido');
const categoriasRouter = require('./routes/categorias');
const sociosRouter = require('./routes/socios');
const liquidacionesRouter = require('./routes/liquidaciones');
const authRouter = require('./routes/auth');
const usuariosRouter = require('./routes/usuarios');
const permisosRouter = require('./routes/permisos');
const cajasRouter = require('./routes/cajas');
const mediosPagoRouter = require('./routes/mediosPago');
const localidadesRouter = require('./routes/localidades');
const whatsappTemplatesRouter = require('./routes/whatsappTemplates');
const backupRouter = require('./routes/backup');
const auditoriaRouter = require('./routes/auditoria');
const clubConfigRouter = require('./routes/clubConfig');
const preferenciasRouter = require('./routes/preferencias');
const whatsappBaileysRouter = require('./routes/whatsappBaileys');
const { registrarAuditoria } = require('./middleware/auditoria');
const { getAppVersion } = require('./appVersion');
startupLog('04', 'Todos los routers requeridos');

const PORT = Number(process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 4000));
// Hostinger usa 3000; en desarrollo local usamos 4000 por defecto (compatible con server/.env)
startupLog('05', `PORT=${PORT} NODE_ENV=${process.env.NODE_ENV || 'undefined'}`);

const app = express();

// Configurar trust proxy para obtener IP real cuando hay proxies/load balancers
app.set('trust proxy', true);

app.use(helmet());

// Configurar CORS para permitir acceso desde cualquier origen en desarrollo
// En producción, deberías especificar los orígenes permitidos
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, SIEMPRE permitir cualquier origen (ignorar CORS_ORIGIN si existe)
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Permitir peticiones sin origin (Postman, aplicaciones móviles, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // En producción, usar la configuración de CORS_ORIGIN si existe
    if (process.env.CORS_ORIGIN) {
      if (process.env.CORS_ORIGIN === '*') {
        return callback(null, true);
      }
      // Si en producción CORS_ORIGIN es solo localhost, permitir todos (evita error tras deploy con .env de desarrollo)
      if (process.env.NODE_ENV === 'production') {
        const trimmed = process.env.CORS_ORIGIN.trim();
        if (/^https?:\/\/localhost(:\d+)?\/?$/i.test(trimmed) || /^https?:\/\/127\.0\.0\.1(:\d+)?\/?$/i.test(trimmed)) {
          return callback(null, true);
        }
      }
      const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
      // Verificar si el origin está en la lista (comparación flexible)
      const originMatches = allowedOrigins.some(allowed => {
        // Comparación exacta
        if (allowed === origin) return true;
        // Comparación sin protocolo (http/https)
        const originWithoutProtocol = origin.replace(/^https?:\/\//, '');
        const allowedWithoutProtocol = allowed.replace(/^https?:\/\//, '');
        if (allowedWithoutProtocol === originWithoutProtocol) return true;
        // Comparación con wildcard
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*').replace(/\./g, '\\.');
          const regex = new RegExp(`^${pattern}$`);
          if (regex.test(origin) || regex.test(originWithoutProtocol)) return true;
        }
        return false;
      });
      
      if (originMatches) {
        return callback(null, true);
      }
      
      // Log para debugging
      console.warn(`[CORS] Origen rechazado: ${origin}. Orígenes permitidos: ${allowedOrigins.join(', ')}`);
      return callback(new Error('No permitido por CORS'), false);
    }
    
    // En producción sin CORS_ORIGIN: rechazar para forzar configuración explícita
    return callback(new Error('CORS no configurado: defina CORS_ORIGIN en producción'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));
app.use(compression());

// Servir archivos estáticos (fotos de socios)
app.use('/api/uploads/fotos', express.static(path.join(__dirname, '../uploads/fotos')));
app.use('/api/uploads/logo', express.static(path.join(__dirname, '../uploads/logo')));

// Estado de la BD (declarado antes de health para usarlo en /api/health)
let dbReady = false;
let dbError = null;

// Health checks públicos (antes de cualquier auth, para que no requieran token)
app.get('/api/health/ping', (_req, res) => {
  res.json({ status: 'pong', appVersion: getAppVersion(), timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
  const ts = new Date().toISOString();
  const ver = { appVersion: getAppVersion(), timestamp: ts };
  if (dbError) {
    return res.status(503).json({
      status: 'error',
      message: 'Base de datos no disponible',
      detail: dbError.message,
      ...ver,
    });
  }
  if (!dbReady) {
    return res.status(503).json({
      status: 'initializing',
      message: 'Inicializando base de datos...',
      ...ver,
    });
  }
  res.json({ status: 'ok', ...ver });
});

// Rutas públicas (sin autenticación)
app.use('/api', authRouter);
// Configuración pública del club (login/portada) debe ir antes de cualquier router que use auth en /api
app.use('/api/club-config', clubConfigRouter);

// Rutas protegidas (requieren autenticación)
// El middleware de auditoría se aplica dentro de cada router después de authenticateToken
app.use('/api/categorias', categoriasRouter);
app.use('/api/socios', sociosRouter);
app.use('/api', liquidacionesRouter);
app.use('/api', usuariosRouter);
app.use('/api', permisosRouter);
app.use('/api/cajas', cajasRouter);
app.use('/api/medios-pago', mediosPagoRouter);
app.use('/api/localidades', localidadesRouter);
app.use('/api/whatsapp-templates', whatsappTemplatesRouter);
app.use('/api/whatsapp-baileys', whatsappBaileysRouter);
app.use('/api', backupRouter);
app.use('/api', auditoriaRouter);
app.use('/api', preferenciasRouter);

// En producción: servir el frontend (React) desde server/public (para deploy en Hostinger u otro hosting Node)
const publicPath = path.join(__dirname, '../public');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(publicPath));
  // Express 5 / path-to-regexp: '*' no válido; usar regex para catch-all
  app.get(/(.*)/, (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

// Middleware de manejo de errores (en producción no exponer err.details)
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  const payload = { message: err.message || 'Error interno del servidor' };
  if (process.env.NODE_ENV !== 'production' && err.details != null) {
    payload.details = err.details;
  }
  res.status(status).json(payload);
});

// Exponer estado para que otros módulos sepan si la BD está lista (opcional)
const setDbReady = (ready, err = null) => {
  dbReady = ready;
  dbError = err;
};

const startServer = () => {
  startupLog('06', 'startServer() llamado, llamando a app.listen()');
  // 1) Escuchar INMEDIATAMENTE. No ejecutar NADA async antes (ni initDb ni await).
  const server = app.listen(PORT, '0.0.0.0', () => {
    startupLog('08', `Servidor ESCUCHANDO en puerto ${PORT} (0.0.0.0). Iniciando initDb en segundo plano...`);

    const waEmbedded =
      String(process.env.WHATSAPP_EMBEDDED || '').toLowerCase() === 'true' ||
      process.env.WHATSAPP_EMBEDDED === '1';
    if (waEmbedded) {
      try {
        const { setAuthFolder, connect } = require('./whatsappEmbedded/baileys');
        const waAuth =
          process.env.WHATSAPP_AUTH_FOLDER || path.join(__dirname, '../whatsapp_auth');
        setAuthFolder(waAuth);
        startupLog('WA_EMBED', `WHATSAPP_EMBEDDED: iniciando Baileys, AUTH_FOLDER=${waAuth}`);
        connect().catch((e) => logError('WHATSAPP_EMBEDDED', e));
      } catch (e) {
        logError('WHATSAPP_EMBEDDED', e);
      }
    }

    // 2) Solo DESPUÉS de que el servidor está escuchando, inicializar BD (sin bloquear el listen)
    initDb()
      .then(() => {
        setDbReady(true);
        startupLog('09', 'Base de datos inicializada correctamente.');
        const backupScheduler = require('./utils/backupScheduler');
        return backupScheduler.iniciarTareaProgramada();
      })
      .then(() => {
        startupLog('10', 'Backup scheduler iniciado.');
      })
      .catch((error) => {
        logError('STARTUP', error);
        setDbReady(false, error);
      });
  });

  server.on('error', (err) => {
    logError('STARTUP', err);
    process.exit(1);
  });
};

startupLog('06', 'Iniciando startServer()');
startServer();
startupLog('07', 'startServer() retornó (listen en curso)');


