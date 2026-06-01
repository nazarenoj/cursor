const express = require('express');
const nodePath = require('path');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria } = require('../middleware/auditoria');
const backupService = require('../utils/backup');

router.use(authenticateToken);
// Auditoría DESPUÉS de autenticación para que req.user esté disponible
router.use(registrarAuditoria);

// Obtener configuración de backup
router.get(
  '/backup/config',
  requirePermission('backup.configurar'),
  asyncHandler(async (req, res) => {
    const config = backupService.getConfig();
    const winrar = await backupService.verificarWinRAR();
    const mysqldump = await backupService.verificarMySQLDump();
    let compresion = { disponible: false, metodo: null, extension: null, mensaje: null };
    try {
      const m = await backupService.obtenerMetodoCompresion();
      compresion = { disponible: true, metodo: m.tipo, extension: m.extension, mensaje: null };
    } catch (e) {
      compresion = {
        disponible: false,
        metodo: null,
        extension: null,
        mensaje: e.message || String(e),
      };
    }

    res.json({
      config,
      /** WinRAR solo aplica en servidor Windows; en Linux/Hostinger se usa ZIP vía Node. */
      servidorWindows: process.platform === 'win32',
      herramientas: {
        winrar,
        mysqldump,
        compresion,
      },
    });
  })
);

// Listar carpetas existentes para facilitar selección de ruta de backups
router.get(
  '/backup/directorios',
  requirePermission('backup.configurar'),
  asyncHandler(async (_req, res) => {
    const directorios = await backupService.listarDirectoriosExistentes();
    res.json({ directorios });
  })
);

router.get(
  '/backup/explorador',
  requirePermission('backup.configurar'),
  asyncHandler(async (req, res) => {
    const roots = await backupService.listarRaicesExplorador();
    const current = req.query.path ? String(req.query.path) : null;
    const vista = await backupService.listarSubdirectoriosExplorador(current);
    res.json({
      roots,
      ...vista,
    });
  })
);

// Actualizar configuración de backup
router.put(
  '/backup/config',
  requirePermission('backup.configurar'),
  asyncHandler(async (req, res) => {
    const { rutaBackup, frecuencia, rutaWinRAR, mantenerBackups, formatoBackup } = req.body;

    const nuevaConfig = {};
    if (rutaBackup !== undefined) nuevaConfig.rutaBackup = rutaBackup;
    if (frecuencia !== undefined) nuevaConfig.frecuencia = frecuencia;
    if (rutaWinRAR !== undefined) nuevaConfig.rutaWinRAR = rutaWinRAR;
    if (mantenerBackups !== undefined) nuevaConfig.mantenerBackups = mantenerBackups;
    if (formatoBackup !== undefined) {
      if (formatoBackup !== 'auto' && formatoBackup !== 'zip_portable') {
        return res.status(400).json({ message: 'formatoBackup debe ser "auto" o "zip_portable"' });
      }
      nuevaConfig.formatoBackup = formatoBackup;
    }
    
    await backupService.saveConfig(nuevaConfig);
    
    // Reiniciar tarea programada si cambió la frecuencia
    if (frecuencia !== undefined) {
      const backupScheduler = require('../utils/backupScheduler');
      await backupScheduler.reiniciarTareaProgramada();
    }
    
    res.json({
      message: 'Configuración de backup actualizada exitosamente',
      config: backupService.getConfig(),
    });
  })
);

// Ejecutar backup manualmente (en segundo plano para evitar ERR_CONNECTION_RESET)
router.post(
  '/backup/ejecutar',
  requirePermission('backup.ejecutar'),
  (req, res, next) => {
    let respuestaEnviada = false;

    const enviarRespuesta = (exito, mensaje, resultado = null, error = null) => {
      if (respuestaEnviada || res.headersSent) return;
      respuestaEnviada = true;
      try {
        if (exito && resultado) {
          res.status(201).json({ message: mensaje || 'Backup realizado exitosamente', resultado });
        } else {
          res.status(200).json({
            message: mensaje || 'Error al ejecutar el backup',
            error: error || 'Error desconocido',
            resultado: resultado || {
              exito: false,
              errores: [error || 'Error desconocido'],
              pasos: error ? [`ERROR: ${error}`] : [],
              fecha: new Date().toISOString(),
              nombre: '',
              ruta: '',
            },
          });
        }
      } catch (e) {
        console.error('[BACKUP ROUTE] Error al enviar respuesta:', e);
      }
    };

    // Responder INMEDIATAMENTE para evitar timeout/conexión cerrada
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=60');
    res.status(202).json({
      message: 'Backup iniciado. El proceso continuará en segundo plano. Refresque la lista en unos minutos.',
      resultado: {
        exito: true,
        enProceso: true,
        fecha: new Date().toISOString(),
        nombre: '',
        ruta: '',
        pasos: ['Backup en proceso...'],
        errores: [],
      },
    });
    respuestaEnviada = true;

    // Ejecutar backup en segundo plano
    setImmediate(async () => {
      try {
        console.log('[BACKUP ROUTE] Iniciando backup en segundo plano...');
        const resultado = await backupService.realizarBackup();
        if (resultado.exito) {
          console.log('[BACKUP ROUTE] ✅ Backup completado:', resultado.nombre);
        } else {
          console.error('[BACKUP ROUTE] Backup completado con errores:', resultado.errores);
        }
      } catch (error) {
        console.error('[BACKUP ROUTE] ❌ Error al ejecutar backup en segundo plano:', error.message);
      }
    });
  }
);

// Listar backups disponibles
router.get(
  '/backup/listar',
  requirePermission('backup.ver'),
  asyncHandler(async (req, res) => {
    const backups = await backupService.listarBackups();
    res.json({ backups });
  })
);

// Descargar archivo de backup (.zip / .rar) para copiar entre sistemas
router.get(
  '/backup/descargar/:nombre',
  requirePermission('backup.ver'),
  asyncHandler(async (req, res) => {
    const rutaAbs = await backupService.resolverRutaArchivoBackup(req.params.nombre);
    const filename = nodePath.basename(rutaAbs);
    res.download(rutaAbs, filename, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ message: 'Error al descargar el backup' });
      }
    });
  })
);

// Restaurar backup
router.post(
  '/backup/restaurar/:nombre',
  requirePermission('backup.restaurar'),
  (req, res, next) => {
    // NO usar asyncHandler aquí, manejar todo manualmente para tener control total
    const { nombre } = req.params;
    console.log(`[RESTAURAR ROUTE] Iniciando restauración de: ${nombre}`);
    
    // Configurar headers para mantener la conexión abierta
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=600');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // Variable para asegurar que solo se envíe una respuesta
    let respuestaEnviada = false;
    
    // Verificar si el cliente aún está conectado
    const verificarConexion = () => {
      if (req.aborted || req.destroyed) {
        console.warn('[RESTAURAR ROUTE] Cliente desconectado antes de completar');
        return false;
      }
      return true;
    };
    
    const enviarRespuesta = (exito, mensaje, resultadoCompleto = null, error = null) => {
      if (respuestaEnviada || res.headersSent) {
        console.log(`[RESTAURAR ROUTE] Respuesta ya enviada, ignorando`);
        return;
      }
      
      // Verificar que el cliente aún esté conectado
      if (!verificarConexion()) {
        console.warn('[RESTAURAR ROUTE] Cliente desconectado, no se puede enviar respuesta');
        return;
      }
      
      respuestaEnviada = true;
      
      try {
        if (exito && resultadoCompleto) {
          console.log(`[RESTAURAR ROUTE] Enviando respuesta de éxito`);
          console.log(`[RESTAURAR ROUTE] Método usado: ${resultadoCompleto.metodoNombre || 'Desconocido'} (${resultadoCompleto.metodoUsado || 'N/A'})`);
          const respuesta = {
            message: mensaje || 'Backup restaurado exitosamente',
            resultado: resultadoCompleto,
          };
          console.log(`[RESTAURAR ROUTE] Respuesta JSON:`, JSON.stringify(respuesta).substring(0, 200));
          
          // Verificar conexión antes de enviar
          if (!verificarConexion()) {
            console.warn('[RESTAURAR ROUTE] Cliente desconectado justo antes de enviar respuesta');
            return;
          }
          
          res.status(200).json(respuesta);
          console.log(`[RESTAURAR ROUTE] ✅ Respuesta enviada exitosamente, headers sent: ${res.headersSent}`);
        } else if (exito) {
          console.log(`[RESTAURAR ROUTE] Enviando respuesta de éxito (sin resultado completo)`);
          if (!verificarConexion()) {
            console.warn('[RESTAURAR ROUTE] Cliente desconectado justo antes de enviar respuesta');
            return;
          }
          res.status(200).json({
            message: mensaje || 'Backup restaurado exitosamente',
            resultado: {
              exito: true,
              nombre: nombre,
              fecha: new Date().toISOString(),
            },
          });
        } else {
          console.log(`[RESTAURAR ROUTE] Enviando respuesta de error: ${error}`);
          if (!verificarConexion()) {
            console.warn('[RESTAURAR ROUTE] Cliente desconectado justo antes de enviar respuesta');
            return;
          }
          res.status(200).json({
            message: 'Error al restaurar el backup',
            error: error || 'Error desconocido',
            resultado: {
              exito: false,
              nombre: nombre,
              fecha: new Date().toISOString(),
            },
          });
        }
      } catch (sendError) {
        console.error('[RESTAURAR ROUTE] Error al enviar respuesta:', sendError);
        console.error('[RESTAURAR ROUTE] Error stack:', sendError.stack);
        // Si aún no se enviaron headers, intentar enviar una respuesta básica
        if (!res.headersSent && verificarConexion()) {
          try {
            res.status(200).json({
              message: 'Error al procesar la restauración',
              error: error || 'Error desconocido',
              resultado: {
                exito: false,
                nombre: nombre,
                fecha: new Date().toISOString(),
              },
            });
          } catch (e) {
            console.error('[RESTAURAR ROUTE] Error crítico al enviar respuesta:', e);
          }
        }
      }
    };
    
    // Manejar cierre de conexión del cliente
    req.on('close', () => {
      console.warn('[RESTAURAR ROUTE] Cliente cerró la conexión antes de completar');
      if (!respuestaEnviada) {
        console.warn('[RESTAURAR ROUTE] La restauración continuará en segundo plano');
      }
    });
    
    req.on('aborted', () => {
      console.warn('[RESTAURAR ROUTE] Cliente abortó la conexión');
    });
    
    // Manejar errores de conexión
    res.on('error', (err) => {
      console.error('[RESTAURAR ROUTE] Error en la respuesta:', err);
    });
    
    // Enviar respuesta inmediata y ejecutar restauración en segundo plano
    // Esto evita que la conexión HTTP se cierre por timeout
    console.log(`[RESTAURAR ROUTE] Enviando respuesta inmediata y ejecutando restauración en segundo plano`);
    
    // Enviar respuesta inmediata
    if (!res.headersSent && verificarConexion()) {
      try {
        res.status(200).json({
          message: 'Restauración iniciada. El proceso continuará en segundo plano.',
          resultado: {
            exito: true,
            nombre: nombre,
            fecha: new Date().toISOString(),
            enProceso: true,
          },
        });
        respuestaEnviada = true;
        console.log(`[RESTAURAR ROUTE] ✅ Respuesta inmediata enviada`);
      } catch (e) {
        console.error('[RESTAURAR ROUTE] Error al enviar respuesta inmediata:', e);
      }
    }
    
    // Ejecutar restauración en segundo plano (no bloquea la respuesta)
    // Usar setImmediate para asegurar que la respuesta se envíe primero
    setImmediate(async () => {
      try {
        console.log(`[RESTAURAR ROUTE] Iniciando proceso de restauración en segundo plano...`);
        const resultado = await backupService.restaurarBackup(nombre);
        console.log(`[RESTAURAR ROUTE] ✅ Restauración completada exitosamente`);
        console.log(`[RESTAURAR ROUTE] Método exitoso: ${resultado.metodoNombre || 'Desconocido'} (Método ${resultado.metodoUsado || 'N/A'})`);
        // La restauración se completó exitosamente
        // El cliente ya recibió la respuesta, así que solo logueamos
      } catch (error) {
        console.error('[RESTAURAR ROUTE] ❌ Error al restaurar backup en segundo plano:', error);
        console.error('[RESTAURAR ROUTE] Stack:', error.stack);
        // El error se registra en los logs, el cliente ya recibió la respuesta
      }
    });
  }
);

// Eliminar backup
router.delete(
  '/backup/:nombre',
  requirePermission('backup.ejecutar'),
  asyncHandler(async (req, res) => {
    const { nombre } = req.params;
    const resultado = await backupService.eliminarBackup(nombre);
    res.json({
      message: 'Backup eliminado exitosamente',
      resultado,
    });
  })
);

// Verificar herramientas disponibles
router.get(
  '/backup/verificar',
  requirePermission('backup.configurar'),
  asyncHandler(async (req, res) => {
    const winrar = await backupService.verificarWinRAR();
    const mysqldump = await backupService.verificarMySQLDump();
    
    res.json({
      herramientas: {
        winrar,
        mysqldump,
      },
      listo: winrar.disponible && mysqldump.disponible,
    });
  })
);

module.exports = router;

