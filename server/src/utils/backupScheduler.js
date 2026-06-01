const cron = require('node-cron');
const backupService = require('./backup');

let tareaProgramada = null;

// Iniciar tarea programada según la frecuencia
async function iniciarTareaProgramada() {
  await backupService.loadConfig();
  const config = backupService.getConfig();
  
  // Detener tarea existente si hay una
  if (tareaProgramada) {
    tareaProgramada.stop();
    tareaProgramada = null;
  }
  
  // Si no hay frecuencia configurada, no programar
  if (!config.frecuencia) {
    console.log('No hay frecuencia de backup configurada. Los backups deben ejecutarse manualmente.');
    return;
  }
  
  let cronExpression;
  
  switch (config.frecuencia) {
    case 'horaria':
      // Cada hora a los minutos 0
      cronExpression = '0 * * * *';
      break;
    case 'diaria':
      // Todos los días a las 02:00 AM
      cronExpression = '0 2 * * *';
      break;
    case 'semanal':
      // Todos los domingos a las 02:00 AM
      cronExpression = '0 2 * * 0';
      break;
    case 'mensual':
      // Día 1 de cada mes a las 02:00 AM
      cronExpression = '0 2 1 * *';
      break;
    default:
      console.log(`Frecuencia de backup no válida: ${config.frecuencia}`);
      return;
  }
  
  tareaProgramada = cron.schedule(cronExpression, async () => {
    console.log(`[${new Date().toISOString()}] Ejecutando backup programado (${config.frecuencia})...`);
    try {
      const resultado = await backupService.realizarBackup();
      if (resultado.exito) {
        console.log(`[${new Date().toISOString()}] Backup programado completado exitosamente: ${resultado.nombre}`);
      } else {
        console.error(`[${new Date().toISOString()}] Backup programado completado con errores:`, resultado.errores);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error al ejecutar backup programado:`, error);
    }
  }, {
    scheduled: true,
    timezone: 'America/Argentina/Buenos_Aires',
  });
  
  console.log(`Backup programado configurado: ${config.frecuencia} (${cronExpression})`);
}

// Detener tarea programada
function detenerTareaProgramada() {
  if (tareaProgramada) {
    tareaProgramada.stop();
    tareaProgramada = null;
    console.log('Tarea programada de backup detenida');
  }
}

// Reiniciar tarea programada (útil cuando se actualiza la configuración)
async function reiniciarTareaProgramada() {
  detenerTareaProgramada();
  await iniciarTareaProgramada();
}

module.exports = {
  iniciarTareaProgramada,
  detenerTareaProgramada,
  reiniciarTareaProgramada,
};

