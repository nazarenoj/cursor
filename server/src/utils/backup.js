const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { getPool, query, execute } = require('../db');

const execAsync = promisify(exec);

/** Deriva la ruta del cliente `mysql` a partir de la de `mysqldump` (Windows y Unix). */
function comandoMysqlDesdeMysqldump(comandoMysqldump) {
  if (!comandoMysqldump || comandoMysqldump === 'mysqldump') return 'mysql';
  return comandoMysqldump
    .replace(/mysqldump\.exe$/i, 'mysql.exe')
    .replace(/mysqldump$/i, 'mysql');
}

// Configuración por defecto
const DEFAULT_CONFIG = {
  rutaBackup: path.join(process.cwd(), 'backups'),
  frecuencia: 'diaria',
  /** 'auto': WinRAR si existe (.rar), si no cadena ZIP. 'zip_portable': siempre ZIP (compartir Linux/Windows/Hostinger). */
  formatoBackup: 'auto',
  rutaWinRAR: 'C:\\Program Files\\WinRAR\\WinRAR.exe',
  mantenerBackups: {
    horarios: 24,
    diarios: 30,
    semanales: 12,
    mensuales: 12,
  },
};

// Cargar configuración desde archivo o BD
let backupConfig = { ...DEFAULT_CONFIG };

// Función para cargar configuración
async function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), 'backup-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    backupConfig = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
  } catch (error) {
    // Si no existe el archivo, usar configuración por defecto
    console.log('Usando configuración por defecto de backup');
  }
  
  // Intentar cargar desde BD
  try {
    const rows = await query('SELECT config FROM backup_config WHERE id = 1 LIMIT 1');
    if (rows.length > 0) {
      const dbConfig = typeof rows[0].config === 'string' 
        ? JSON.parse(rows[0].config) 
        : rows[0].config;
      backupConfig = { ...backupConfig, ...dbConfig };
    }
  } catch (error) {
    // Tabla no existe aún, se creará en la migración
  }
}

// Guardar configuración
async function saveConfig(config) {
  backupConfig = { ...backupConfig, ...config };
  
  // Guardar en archivo
  try {
    const configPath = path.join(process.cwd(), 'backup-config.json');
    await fs.writeFile(configPath, JSON.stringify(backupConfig, null, 2), 'utf8');
  } catch (error) {
    console.error('Error al guardar configuración en archivo:', error);
  }
  
  // Guardar en BD
  try {
    await execute(
      `INSERT INTO backup_config (id, config, updated_at) 
       VALUES (1, ?, NOW()) 
       ON DUPLICATE KEY UPDATE config = ?, updated_at = NOW()`,
      [JSON.stringify(backupConfig), JSON.stringify(backupConfig)]
    );
  } catch (error) {
    console.error('Error al guardar configuración en BD:', error);
  }
}

// Obtener configuración
function getConfig() {
  return { ...backupConfig };
}

/**
 * Ruta absoluta del directorio raíz de backups. Llamar después de loadConfig().
 * Las rutas relativas se resuelven contra process.cwd() (donde se inició Node).
 */
function resolverRutaRaizBackup() {
  const raw = String(backupConfig.rutaBackup || '').trim();
  const fallback = path.join(process.cwd(), 'backups');
  const base = raw || fallback;
  return path.isAbsolute(base) ? path.normalize(base) : path.resolve(process.cwd(), base);
}

/** Crea la carpeta raíz de backups si no existe (evita ENOENT al listar). */
async function asegurarDirectorioRutaBackup() {
  const raiz = resolverRutaRaizBackup();
  await fs.mkdir(raiz, { recursive: true });
  return raiz;
}

/** Lista carpetas candidatas para usar como ruta de backups. */
async function listarDirectoriosExistentes() {
  await loadConfig();
  const raizActual = await asegurarDirectorioRutaBackup();
  const basePadre = path.dirname(raizActual);
  const candidatos = [basePadre, process.cwd()];
  const vistos = new Set();
  const resultado = [];

  for (const base of candidatos) {
    const baseNorm = path.normalize(base);
    if (vistos.has(baseNorm)) continue;
    vistos.add(baseNorm);

    let entries = [];
    try {
      entries = await fs.readdir(base, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const ruta = path.normalize(path.join(base, e.name));
      const low = e.name.toLowerCase();
      if (low.startsWith('temp_')) continue;
      if (vistos.has(ruta)) continue;
      vistos.add(ruta);
      resultado.push(ruta);
    }
  }

  const inicio = path.normalize(raizActual);
  return [inicio, ...resultado.filter((r) => r !== inicio)].slice(0, 200);
}

async function listarRaicesExplorador() {
  if (process.platform === 'win32') {
    const roots = [];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const l of letters) {
      const drive = `${l}:\\`;
      try {
        await fs.access(drive);
        roots.push(drive);
      } catch {
        // ignorar unidades no disponibles
      }
    }
    return roots;
  }
  return ['/'];
}

async function listarSubdirectoriosExplorador(pathActual) {
  const fallback = await asegurarDirectorioRutaBackup();
  const base = String(pathActual || '').trim();
  const actual = path.normalize(base || fallback);
  const padre = path.dirname(actual);
  let entries = [];
  try {
    entries = await fs.readdir(actual, { withFileTypes: true });
  } catch (e) {
    throw new Error(`No se pudo leer la carpeta "${actual}": ${e.message}`);
  }

  const subdirectorios = entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(actual, e.name))
    .filter((d) => !path.basename(d).toLowerCase().startsWith('temp_'))
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const esRaizWindows = process.platform === 'win32' && /^[a-zA-Z]:\\?$/.test(actual);
  const puedeSubir = process.platform === 'win32' ? !esRaizWindows : actual !== '/';
  return { actual, padre, puedeSubir, subdirectorios };
}

// Verificar si WinRAR está disponible
async function verificarWinRAR() {
  const rutaWinRAR = backupConfig.rutaWinRAR;
  
  try {
    await fs.access(rutaWinRAR);
    return { disponible: true, ruta: rutaWinRAR };
  } catch (error) {
    // Buscar en ubicaciones comunes
    const rutasComunes = [
      'C:\\Program Files\\WinRAR\\WinRAR.exe',
      'C:\\Program Files (x86)\\WinRAR\\WinRAR.exe',
    ];
    
    for (const ruta of rutasComunes) {
      try {
        await fs.access(ruta);
        return { disponible: true, ruta };
      } catch (e) {
        continue;
      }
    }
    
    return { disponible: false, ruta: null };
  }
}

// Verificar si mysqldump está disponible
async function verificarMySQLDump() {
  try {
    await execAsync('mysqldump --version');
    console.log('[BACKUP] mysqldump encontrado en PATH');
    return { disponible: true, comando: 'mysqldump' };
  } catch (error) {
    console.log('[BACKUP] mysqldump no encontrado en PATH, buscando en ubicaciones comunes...');
    // Buscar en ubicaciones comunes
    const rutasComunes = [
      'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.1\\bin\\mysqldump.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.2\\bin\\mysqldump.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.3\\bin\\mysqldump.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\mysqldump.exe',
      'C:\\xampp\\mysql\\bin\\mysqldump.exe',
      'C:\\wamp64\\bin\\mysql\\mysql8.0.xx\\bin\\mysqldump.exe',
      'C:\\wamp\\bin\\mysql\\mysql8.0.xx\\bin\\mysqldump.exe',
      '/usr/bin/mysqldump',
      '/usr/local/bin/mysqldump',
      '/bin/mysqldump',
    ];
    
    for (const ruta of rutasComunes) {
      try {
        await fs.access(ruta);
        console.log(`[BACKUP] mysqldump encontrado en: ${ruta}`);
        return { disponible: true, comando: ruta };
      } catch (e) {
        continue;
      }
    }
    
    console.error('[BACKUP] mysqldump no encontrado en ninguna ubicación común');
    return { disponible: false, comando: null };
  }
}

// Crear backup de la base de datos
async function backupBaseDatos(rutaDestino) {
  const pool = getPool();
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'GL2025',
    database: process.env.DB_NAME || 'club_social',
  };
  
  const mysqldumpInfo = await verificarMySQLDump();
  if (!mysqldumpInfo.disponible) {
    throw new Error('mysqldump no está disponible. No se puede hacer backup de la base de datos.');
  }
  
  const archivoSQL = path.join(rutaDestino, 'database_backup.sql');
  
  const args = [
    '-h', dbConfig.host,
    '-P', dbConfig.port.toString(),
    '-u', dbConfig.user,
    `-p${dbConfig.password}`,
    '--single-transaction',
    '--routines',
    '--triggers',
    dbConfig.database,
  ];
  
  // Construir comando de mysqldump
  // Nota: mysqldump requiere que la contraseña esté en el comando o en un archivo
  // Usar spawn en lugar de exec para mejor manejo de streams grandes
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const mysqldumpPath = mysqldumpInfo.comando;
    const mysqldumpArgs = [
      '-h', dbConfig.host,
      '-P', dbConfig.port.toString(),
      '-u', dbConfig.user,
      `-p${dbConfig.password}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      dbConfig.database,
    ];
    
    console.log(`[BACKUP BD] Ejecutando mysqldump desde: ${mysqldumpPath}`);
    console.log(`[BACKUP BD] Argumentos: ${mysqldumpArgs.join(' ').replace(/-p\S+/, '-p***')}`);
    console.log(`[BACKUP BD] Destino: ${archivoSQL}`);
    
    const mysqldumpProcess = spawn(mysqldumpPath, mysqldumpArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    let stdout = '';
    let stderr = '';
    
    mysqldumpProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    mysqldumpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    mysqldumpProcess.on('close', async (code) => {
      console.log(`[BACKUP BD] mysqldump terminó con código: ${code}`);
      console.log(`[BACKUP BD] Tamaño de stdout: ${stdout.length} bytes`);
      console.log(`[BACKUP BD] Tamaño de stderr: ${stderr.length} bytes`);
      
      // Verificar si hay contenido válido en stdout
      const tieneContenidoValido = stdout && stdout.trim().length > 0 && stdout.includes('MySQL dump');
      
      // Errores críticos que impiden el backup
      const erroresCriticos = [
        'Access denied',
        'Unknown database',
        'Can\'t connect',
        'command not found',
        'no se reconoce',
      ];
      
      const stderrLower = stderr.toLowerCase();
      const tieneErrorCritico = erroresCriticos.some(err => stderrLower.includes(err.toLowerCase()));
      
      // Si hay un error crítico, rechazar el backup
      if (tieneErrorCritico) {
        const errorMsg = stderr.trim();
        let mensajeDescriptivo = errorMsg;
        
        if (errorMsg.includes('Access denied')) {
          mensajeDescriptivo = `Acceso denegado. Verifique el usuario y contraseña de MySQL. Error: ${errorMsg}`;
        } else if (errorMsg.includes('Unknown database')) {
          mensajeDescriptivo = `Base de datos no encontrada. Verifique el nombre de la base de datos en la configuración. Error: ${errorMsg}`;
        } else if (errorMsg.includes('Can\'t connect')) {
          mensajeDescriptivo = `No se puede conectar al servidor MySQL. Verifique el host y puerto. Error: ${errorMsg}`;
        } else if (errorMsg.includes('command not found') || errorMsg.includes('no se reconoce')) {
          mensajeDescriptivo = `mysqldump no se encontró. Verifique que MySQL esté instalado y en el PATH. Error: ${errorMsg}`;
        }
        
        console.error(`[BACKUP BD] Error crítico en mysqldump: ${errorMsg}`);
        reject(new Error(mensajeDescriptivo));
        return;
      }
      
      // Si no hay contenido válido, rechazar
      if (!tieneContenidoValido) {
        const errorMsg = stderr.trim() || `mysqldump terminó con código ${code} sin generar contenido`;
        console.error(`[BACKUP BD] mysqldump no generó contenido válido`);
        console.error(`[BACKUP BD] stderr: ${stderr}`);
        reject(new Error(`El backup de la base de datos está vacío o no es válido. ${errorMsg}`));
        return;
      }
      
      // Si hay contenido válido pero hay advertencias (código 2 es común para advertencias)
      if (code !== 0 && tieneContenidoValido) {
        console.warn(`[BACKUP BD] mysqldump completó con advertencias (código ${code}) pero el backup es válido`);
        console.warn(`[BACKUP BD] Advertencias: ${stderr.substring(0, 500)}`);
        // Continuar con el backup ya que tiene contenido válido
      }
      
      try {
        console.log(`[BACKUP BD] Escribiendo archivo SQL en: ${archivoSQL}`);
        await fs.writeFile(archivoSQL, stdout, 'utf8');
        const stats = await fs.stat(archivoSQL);
        
        console.log(`[BACKUP BD] Backup SQL creado exitosamente: ${archivoSQL} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        
        resolve({
          exito: true,
          archivo: archivoSQL,
          tamaño: stats.size,
        });
      } catch (error) {
        console.error(`[BACKUP BD] Error al escribir archivo SQL: ${error.message}`);
        console.error(`[BACKUP BD] Stack: ${error.stack}`);
        reject(new Error(`Error al escribir archivo SQL: ${error.message}`));
      }
    });
    
    mysqldumpProcess.on('error', (error) => {
      console.error(`[BACKUP BD] Error al ejecutar mysqldump: ${error.message}`);
      console.error(`[BACKUP BD] Stack: ${error.stack}`);
      console.error(`[BACKUP BD] Path intentado: ${mysqldumpPath}`);
      
      let mensajeError = `Error al ejecutar mysqldump: ${error.message}`;
      
      // Errores comunes de spawn
      if (error.code === 'ENOENT') {
        mensajeError = `mysqldump no se encontró en la ruta: ${mysqldumpPath}. Verifique que MySQL esté instalado y que la ruta sea correcta.`;
      } else if (error.code === 'EACCES') {
        mensajeError = `No tiene permisos para ejecutar mysqldump en: ${mysqldumpPath}`;
      }
      
      reject(new Error(mensajeError));
    });
  });
}

// Comprimir con WinRAR
async function comprimirConWinRAR(rutaOrigen, archivoDestino) {
  const winrarInfo = await verificarWinRAR();
  if (!winrarInfo.disponible) {
    throw new Error('WinRAR no está disponible. No se puede comprimir el backup.');
  }

  const args = [
    'a',
    '-r',
    '-ep1',
    '-m5',
    '-df',
    '-y',
    `"${archivoDestino}"`,
    `"${path.join(rutaOrigen, '*')}"`,
  ];

  const comando = `"${winrarInfo.ruta}" ${args.join(' ')}`;

  try {
    await execAsync(comando, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 600000,
    });

    const stats = await fs.stat(archivoDestino);
    return {
      exito: true,
      archivo: archivoDestino,
      tamaño: stats.size,
    };
  } catch (error) {
    const msg = error.stderr || error.stdout || error.message;
    console.error('[BACKUP] WinRAR error:', msg);
    throw new Error(`Error al comprimir con WinRAR: ${msg}`);
  }
}

/** Tar con formato automático por extensión (.zip); disponible en Linux/macOS y Windows 10+. */
async function comprimirConTarZip(rutaOrigen, archivoDestino) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const p = spawn('tar', ['-a', '-c', '-f', archivoDestino, '-C', rutaOrigen, '.'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let err = '';
    p.stderr.on('data', (d) => {
      err += d.toString();
    });
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar falló (código ${code}): ${err || 'sin detalle'}`));
    });
    p.on('error', (e) => reject(new Error(`No se pudo ejecutar tar: ${e.message}`)));
  });
}

async function comprimirConZipCmd(rutaOrigen, archivoDestino) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const p = spawn('zip', ['-r', '-q', archivoDestino, '.'], {
      cwd: rutaOrigen,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let err = '';
    p.stderr.on('data', (d) => {
      err += d.toString();
    });
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`zip falló (código ${code}): ${err || 'sin detalle'}`));
    });
    p.on('error', (e) => reject(new Error(`No se pudo ejecutar zip: ${e.message}`)));
  });
}

async function comprimirConPowerShellZip(rutaOrigen, archivoDestino) {
  const o = rutaOrigen.replace(/'/g, "''");
  const d = archivoDestino.replace(/'/g, "''");
  const cmd = `powershell -NoProfile -Command "Compress-Archive -Path '${o}\\*' -DestinationPath '${d}' -CompressionLevel Optimal -Force"`;
  await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024, timeout: 600000 });
}

/** archiver + unzipper en package.json; sin binarios (Hostinger, Linux sin unzip). */
function nodeZipDisponible() {
  try {
    require.resolve('archiver');
    require.resolve('unzipper');
    return true;
  } catch {
    return false;
  }
}

/**
 * Comprime el contenido de rutaOrigen (archivos en la raíz) en un .zip vía archiver.
 * No borra rutaOrigen (lo hace el flujo caller tras éxito).
 */
async function comprimirConNodeZip(rutaOrigen, archivoDestino) {
  const fsSync = require('fs');
  const archiver = require('archiver');
  const dirDest = path.dirname(archivoDestino);
  await fs.mkdir(dirDest, { recursive: true });

  return new Promise((resolve, reject) => {
    const output = fsSync.createWriteStream(archivoDestino);
    const archive = archiver('zip', { zlib: { level: 6 } });
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    output.on('error', fail);
    archive.on('error', fail);
    output.on('close', async () => {
      if (settled) return;
      try {
        const st = await fs.stat(archivoDestino);
        settled = true;
        resolve({
          exito: true,
          archivo: archivoDestino,
          tamaño: st.size,
        });
      } catch (e) {
        fail(e);
      }
    });

    archive.pipe(output);
    archive.directory(rutaOrigen, false);
    archive.finalize();
  });
}

/** Extrae .zip con unzipper (sin comando unzip del sistema). */
async function extraerZipConNode(archivoPath, rutaExtraccion) {
  const fsSync = require('fs');
  const unzipper = require('unzipper');
  await fs.mkdir(rutaExtraccion, { recursive: true });

  return new Promise((resolve, reject) => {
    const extract = unzipper.Extract({ path: rutaExtraccion });
    extract.on('error', reject);
    extract.on('close', () => resolve());
    const rs = fsSync.createReadStream(archivoPath);
    rs.on('error', reject);
    rs.pipe(extract);
  });
}

async function verificarTarSoportaZip() {
  try {
    await execAsync('tar --version', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function verificarZipCmd() {
  try {
    await execAsync('zip -v', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function verificarUnzipCmd() {
  try {
    await execAsync('unzip -v', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Elige compresor: WinRAR (si existe), luego ZIP en Node (Hostinger/Linux sin unzip),
 * después tar / zip CLI / PowerShell.
 * Con formatoBackup 'zip_portable' no se usa WinRAR (solo ZIP intercambiable entre sistemas).
 */
async function obtenerMetodoCompresion() {
  await loadConfig();
  const zipPortable = backupConfig.formatoBackup === 'zip_portable';

  if (!zipPortable) {
    const winrar = await verificarWinRAR();
    if (winrar.disponible) {
      return { tipo: 'winrar', winrar, extension: '.rar' };
    }
  }
  if (nodeZipDisponible()) {
    return { tipo: 'node_zip', extension: '.zip' };
  }
  if (await verificarTarSoportaZip()) {
    return { tipo: 'tar', extension: '.zip' };
  }
  if (process.platform !== 'win32' && (await verificarZipCmd())) {
    return { tipo: 'zip', extension: '.zip' };
  }
  if (process.platform === 'win32') {
    return { tipo: 'powershell', extension: '.zip' };
  }
  throw new Error(
    'No hay herramienta de compresión disponible. Instalá dependencias npm (archiver/unzipper) en server o en Linux zip/tar; en Windows WinRAR o PowerShell (Compress-Archive).',
  );
}

/** Extrae .rar (WinRAR) o .zip (unzip / PowerShell / Node unzipper) hacia rutaExtraccion. */
async function extraerBackupArchivo(archivoPath, rutaExtraccion) {
  const ext = path.extname(archivoPath).toLowerCase();
  if (ext === '.rar') {
    const winrarInfo = await verificarWinRAR();
    if (!winrarInfo.disponible) {
      throw new Error(
        'WinRAR no está disponible. No se puede extraer un backup .rar en este servidor. En Linux/Hostinger usá backups .zip o restaurá el .rar en Windows con WinRAR.',
      );
    }
    const destArg = process.platform === 'win32' ? `${rutaExtraccion}\\` : rutaExtraccion;
    const comando = `"${winrarInfo.ruta}" x -y "${archivoPath}" "${destArg}"`;
    await execAsync(comando, { maxBuffer: 50 * 1024 * 1024, timeout: 30 * 60 * 1000 });
    return;
  }
  if (ext === '.zip') {
    if (await verificarUnzipCmd()) {
      await execAsync(`unzip -o -q "${archivoPath}" -d "${rutaExtraccion}"`, {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 30 * 60 * 1000,
      });
      return;
    }
    if (process.platform === 'win32') {
      try {
        const z = archivoPath.replace(/'/g, "''");
        const dest = rutaExtraccion.replace(/'/g, "''");
        await execAsync(
          `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${z}' -DestinationPath '${dest}' -Force"`,
          { maxBuffer: 50 * 1024 * 1024, timeout: 30 * 60 * 1000 },
        );
        return;
      } catch (e) {
        console.warn('[BACKUP] Expand-Archive falló, probando extracción con Node:', e.message);
      }
    }
    if (nodeZipDisponible()) {
      await extraerZipConNode(archivoPath, rutaExtraccion);
      return;
    }
    throw new Error(
      'No se pudo extraer el .zip: falta unzip/PowerShell y no están disponibles archiver/unzipper en el proyecto.',
    );
  }
  throw new Error(`Formato de backup no soportado: ${ext || '(sin extensión)'}`);
}

// Generar nombre del backup con fecha y hora para evitar sobrescritura el mismo día
function generarNombreBackup(frecuencia) {
  const fecha = new Date();
  const base = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  const hora = `${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}${String(fecha.getSeconds()).padStart(2, '0')}`;

  switch (frecuencia) {
    case 'horaria':
      return `Backup-${base}-${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}`;
    case 'diaria':
    case 'semanal':
    case 'mensual':
      // Siempre incluir hora para no sobrescribir si hay otro backup el mismo día
      return `Backup-${base}-${hora}`;
    default:
      return `Backup-${base}-${hora}`;
  }
}

// Realizar backup completo
async function realizarBackup() {
  await loadConfig();
  const raizBackup = await asegurarDirectorioRutaBackup();
  
  const fecha = new Date();
  const nombreBackup = generarNombreBackup(backupConfig.frecuencia);
  const rutaBackupDir = path.join(raizBackup, nombreBackup);
  const metodoCompresion = await obtenerMetodoCompresion();
  const archivoFinal = path.join(raizBackup, `${nombreBackup}${metodoCompresion.extension}`);
  
  // Crear directorio de backup
  await fs.mkdir(rutaBackupDir, { recursive: true });
  
  const resultados = {
    fecha: fecha.toISOString(),
    nombre: nombreBackup,
    ruta: archivoFinal,
    pasos: [],
    errores: [],
  };
  
  try {
    // 1. Backup de la base de datos (OBLIGATORIO)
    let dbBackup = null;
    try {
      resultados.pasos.push('Iniciando backup de base de datos...');
      dbBackup = await backupBaseDatos(rutaBackupDir);
      resultados.pasos.push(`Backup de BD completado: ${(dbBackup.tamaño / 1024 / 1024).toFixed(2)} MB`);
      resultados.baseDatos = dbBackup;
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      console.error(`[BACKUP] Error en backup de BD: ${errorMsg}`);
      console.error(`[BACKUP] Stack: ${error.stack}`);
      resultados.errores.push(`Error en backup de BD: ${errorMsg}`);
      resultados.pasos.push(`ERROR CRÍTICO: ${errorMsg}`);
      // El backup de BD es obligatorio, no continuar sin él
      // Limpiar el directorio creado
      try {
        await fs.rm(rutaBackupDir, { recursive: true, force: true });
        console.log(`[BACKUP] Directorio de backup limpiado debido a error`);
      } catch (cleanupError) {
        console.error(`[BACKUP] Error al limpiar directorio: ${cleanupError.message}`);
      }
      throw new Error(`No se pudo crear el backup de la base de datos: ${errorMsg}`);
    }
    
    // Verificar que el archivo SQL existe y no está vacío antes de continuar
    const archivoSQL = path.join(rutaBackupDir, 'database_backup.sql');
    try {
      await fs.access(archivoSQL);
      const stats = await fs.stat(archivoSQL);
      if (stats.size === 0) {
        throw new Error('El archivo SQL está vacío. El backup no puede continuar.');
      }
      resultados.pasos.push(`Archivo SQL verificado (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`[BACKUP] Archivo SQL verificado: ${archivoSQL} (${stats.size} bytes)`);
    } catch (error) {
      console.error(`[BACKUP] Error al verificar archivo SQL: ${error.message}`);
      throw new Error(`El archivo SQL no se creó correctamente o está vacío: ${error.message}. El backup no puede continuar.`);
    }
    
    // 2. Crear archivo de información
    const infoBackup = {
      fecha: fecha.toISOString(),
      frecuencia: backupConfig.frecuencia,
      nombre: nombreBackup,
      sistema: 'Sistema de Gestión de Socios - Club Social Realico',
      tieneBaseDatos: true,
    };
    
    await fs.writeFile(
      path.join(rutaBackupDir, 'BACKUP-INFO.json'),
      JSON.stringify(infoBackup, null, 2),
      'utf8'
    );
    resultados.pasos.push('Archivo de información creado');
    
    // 3. Comprimir (WinRAR .rar, o tar/zip/PowerShell → .zip)
    try {
      const etiqueta =
        metodoCompresion.tipo === 'winrar'
          ? 'WinRAR'
          : metodoCompresion.tipo === 'node_zip'
            ? 'Node.js (zip)'
            : metodoCompresion.tipo === 'tar'
              ? 'tar (zip)'
              : metodoCompresion.tipo === 'zip'
                ? 'zip'
                : 'PowerShell';
      resultados.pasos.push(`Iniciando compresión (${etiqueta})...`);
      let compresion;
      if (metodoCompresion.tipo === 'winrar') {
        compresion = await comprimirConWinRAR(rutaBackupDir, archivoFinal);
      } else if (metodoCompresion.tipo === 'node_zip') {
        compresion = await comprimirConNodeZip(rutaBackupDir, archivoFinal);
      } else if (metodoCompresion.tipo === 'tar') {
        await comprimirConTarZip(rutaBackupDir, archivoFinal);
        const st = await fs.stat(archivoFinal);
        compresion = { exito: true, archivo: archivoFinal, tamaño: st.size };
      } else if (metodoCompresion.tipo === 'zip') {
        await comprimirConZipCmd(rutaBackupDir, archivoFinal);
        const st = await fs.stat(archivoFinal);
        compresion = { exito: true, archivo: archivoFinal, tamaño: st.size };
      } else {
        await comprimirConPowerShellZip(rutaBackupDir, archivoFinal);
        const st = await fs.stat(archivoFinal);
        compresion = { exito: true, archivo: archivoFinal, tamaño: st.size };
      }
      resultados.pasos.push(`Compresión completada: ${(compresion.tamaño / 1024 / 1024).toFixed(2)} MB`);
      resultados.archivo = compresion;
      
      try {
        await fs.access(archivoFinal);
        console.log(`[BACKUP] Archivo de backup creado: ${archivoFinal}`);
      } catch (error) {
        throw new Error(`El archivo comprimido no se creó correctamente: ${error.message}`);
      }

      resultados.exito = true;

      // Eliminar la carpeta del backup (ya vacía o con residuos tras -df); el RAR está en el directorio padre
      try {
        const archivosEnDir = await fs.readdir(rutaBackupDir);
        const soloRar = archivosEnDir.length === 1 && archivosEnDir[0].endsWith('.rar');
        if (!soloRar) {
          for (const archivo of archivosEnDir) {
            const rutaArchivo = path.join(rutaBackupDir, archivo);
            const statsArchivo = await fs.stat(rutaArchivo);
            if (statsArchivo.isFile()) {
              await fs.unlink(rutaArchivo);
              console.log(`[BACKUP] Archivo residual eliminado: ${archivo}`);
            }
          }
        }
        await fs.rm(rutaBackupDir, { recursive: true, force: true });
        resultados.pasos.push('Carpeta de backup temporal eliminada');
      } catch (e) {
        console.warn(`[BACKUP] Error al eliminar carpeta temporal: ${e.message}`);
        resultados.pasos.push(`ADVERTENCIA: No se pudo eliminar la carpeta temporal`);
      }
    } catch (error) {
      resultados.errores.push(`Error en compresión: ${error.message}`);
      resultados.pasos.push(`ERROR en compresión: ${error.message}`);
      resultados.exito = false;
      throw error; // Lanzar el error para que se maneje en el catch externo
    }
    
    // 4. Limpiar backups antiguos (solo si el backup fue exitoso)
    if (resultados.exito) {
      try {
        await limpiarBackupsAntiguos();
        resultados.pasos.push('Limpieza de backups antiguos completada');
      } catch (error) {
        resultados.errores.push(`Error al limpiar backups antiguos: ${error.message}`);
        resultados.pasos.push(`ADVERTENCIA al limpiar backups: ${error.message}`);
        // No afecta el éxito del backup principal
      }
    }
    
  } catch (error) {
    resultados.exito = false;
    resultados.errores.push(error.message);
    resultados.pasos.push(`ERROR CRÍTICO: ${error.message}`);
  }
  
  // Siempre devolver resultados, incluso si hay errores
  return resultados;
}

// Limpiar backups antiguos
async function limpiarBackupsAntiguos() {
  try {
    await loadConfig();
    const raizBackup = await asegurarDirectorioRutaBackup();
    const mantener = backupConfig.mantenerBackups;
    const frecuencia = backupConfig.frecuencia;
    const limite = mantener[frecuencia] || 30;
    
    const archivos = await fs.readdir(raizBackup);
    const backups = [];
    
    // Buscar backups en directorios y en el directorio raíz
    for (const archivo of archivos) {
      const ruta = path.join(raizBackup, archivo);
      try {
        const stats = await fs.stat(ruta);
        if (stats.isDirectory()) {
          // Buscar RAR dentro del directorio
          try {
            const archivosDir = await fs.readdir(ruta);
            for (const archivoDir of archivosDir) {
              if (archivoDir.endsWith('.rar') || archivoDir.endsWith('.zip')) {
                const rutaRAR = path.join(ruta, archivoDir);
                const statsRAR = await fs.stat(rutaRAR);
                backups.push({
                  nombre: archivoDir,
                  ruta: rutaRAR,
                  fecha: statsRAR.mtime,
                });
              }
            }
          } catch (e) {
            continue;
          }
        } else if (archivo.endsWith('.rar') || archivo.endsWith('.zip')) {
          backups.push({
            nombre: archivo,
            ruta: ruta,
            fecha: stats.mtime,
          });
        }
      } catch (e) {
        continue;
      }
    }
    
    backups.sort((a, b) => b.fecha - a.fecha);
    
    const backupsAEliminar = backups.slice(limite);
    for (const backup of backupsAEliminar) {
      try {
        await fs.unlink(backup.ruta);
        // Si el directorio queda vacío, eliminarlo también
        const dirBackup = path.dirname(backup.ruta);
        if (dirBackup !== raizBackup) {
          try {
            const archivosEnDir = await fs.readdir(dirBackup);
            if (archivosEnDir.length === 0) {
              await fs.rmdir(dirBackup);
            }
          } catch (e) {
            // Ignorar errores al eliminar directorio
          }
        }
      } catch (e) {
        console.error(`Error al eliminar backup ${backup.nombre}: ${e.message}`);
      }
    }
    
    return { eliminados: backupsAEliminar.length };
  } catch (error) {
    console.error('Error al limpiar backups antiguos:', error);
    return { eliminados: 0, error: error.message };
  }
}

// Validar backup (verificar que contiene archivo SQL)
async function validarBackup(nombreBackup) {
  await loadConfig();
  const raizBackup = await asegurarDirectorioRutaBackup();
  
  const archivoBackup = path.isAbsolute(nombreBackup)
    ? nombreBackup
    : path.join(raizBackup, nombreBackup);
  
  try {
    await fs.access(archivoBackup);
  } catch {
    return { valido: false, razon: 'Archivo no encontrado' };
  }
  
  const ext = path.extname(archivoBackup).toLowerCase();
  if (ext === '.rar' && !(await verificarWinRAR()).disponible) {
    return { valido: null, razon: 'No se puede validar (WinRAR no disponible para .rar)' };
  }
  // .zip: sin unzip en Linux se puede validar con extracción Node (unzipper)
  
  const rutaExtraccion = path.join(raizBackup, 'temp_validate');
  try {
    await fs.rm(rutaExtraccion, { recursive: true, force: true });
    await fs.mkdir(rutaExtraccion, { recursive: true });
    
    await extraerBackupArchivo(archivoBackup, rutaExtraccion);
    
    const buscarSQL = async (dir) => {
      const archivos = await fs.readdir(dir, { withFileTypes: true });
      for (const archivo of archivos) {
        const rutaCompleta = path.join(dir, archivo.name);
        if (archivo.isDirectory()) {
          const encontrado = await buscarSQL(rutaCompleta);
          if (encontrado) return encontrado;
        } else if (archivo.isFile() && archivo.name.endsWith('.sql')) {
          return rutaCompleta;
        }
      }
      return null;
    };
    
    const archivoSQL = await buscarSQL(rutaExtraccion);
    
    await fs.rm(rutaExtraccion, { recursive: true, force: true });
    
    return {
      valido: !!archivoSQL,
      razon: archivoSQL ? 'Válido' : 'No contiene archivo SQL',
    };
  } catch (error) {
    try {
      await fs.rm(rutaExtraccion, { recursive: true, force: true });
    } catch {}
    return { valido: false, razon: `Error al validar: ${error.message}` };
  }
}

// Listar backups disponibles
async function listarBackups() {
  await loadConfig();
  
  try {
    const raizBackup = await asegurarDirectorioRutaBackup();
    const archivos = await fs.readdir(raizBackup);
    const backups = [];
    
    for (const archivo of archivos) {
      // Evitar carpetas temporales internas de validación/restauración.
      if (archivo === 'temp_validate' || archivo === 'temp_restore') continue;
      const ruta = path.join(raizBackup, archivo);
      let stats;
      try {
        stats = await fs.stat(ruta);
      } catch {
        // Si se borra entre readdir/stat, ignorar y continuar.
        continue;
      }
      
      if (stats.isDirectory()) {
        // Si es un directorio, buscar archivos RAR dentro
        try {
          const archivosDir = await fs.readdir(ruta);
          for (const archivoDir of archivosDir) {
            if (archivoDir.endsWith('.rar') || archivoDir.endsWith('.zip')) {
              const rutaRAR = path.join(ruta, archivoDir);
              const statsRAR = await fs.stat(rutaRAR);
              backups.push({
                nombre: archivoDir,
                ruta: rutaRAR,
                tamaño: statsRAR.size,
                fechaCreacion: statsRAR.birthtime.toISOString(),
                fechaModificacion: statsRAR.mtime.toISOString(),
                valido: null,
                razonInvalido: null,
              });
            }
          }
        } catch (e) {
          // Ignorar errores al leer subdirectorios
          continue;
        }
      } else if (archivo.endsWith('.rar') || archivo.endsWith('.zip')) {
        // Validar backup (solo verificar, no bloquear si falla)
        let validacion = { valido: null, razon: null };
        try {
          validacion = await validarBackup(archivo);
        } catch (error) {
          // Si falla la validación, continuar de todos modos
          console.error(`Error al validar backup ${archivo}:`, error);
          validacion = { valido: null, razon: `Error al validar: ${error.message}` };
        }
        
        backups.push({
          nombre: archivo,
          ruta: ruta,
          tamaño: stats.size,
          fechaCreacion: stats.birthtime.toISOString(),
          fechaModificacion: stats.mtime.toISOString(),
          valido: validacion.valido,
          razonInvalido: validacion.valido === false ? validacion.razon : null,
        });
      }
    }
    
    backups.sort((a, b) => b.fechaModificacion - a.fechaModificacion);
    
    return backups;
  } catch (error) {
    throw new Error(`Error al listar backups: ${error.message}`);
  }
}

// ============================================
// FUNCIONES AUXILIARES PARA RESTAURAR BACKUP
// ============================================

// MÉTODO 1: Usar mysql2 directamente (más confiable)
async function restaurarConMySQL2(archivoSQL, dbConfig) {
  const mysql = require('mysql2/promise');
  
  console.log(`[RESTAURAR MySQL2] Leyendo archivo SQL...`);
  const contenidoSQL = await fs.readFile(archivoSQL, 'utf8');
  
  if (!contenidoSQL || contenidoSQL.trim().length === 0) {
    throw new Error('El archivo SQL está vacío');
  }
  
  console.log(`[RESTAURAR MySQL2] Archivo SQL leído (${contenidoSQL.length} caracteres)`);
  
  // Crear conexión sin base de datos primero para crearla si no existe
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true, // Permitir múltiples statements
  });
  
  try {
    // Crear base de datos si no existe
    console.log(`[RESTAURAR MySQL2] Creando/verificando base de datos...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci`);
    await connection.query(`USE \`${dbConfig.database}\``);
    
    // Ejecutar el SQL completo usando multipleStatements
    // Esto es más seguro que dividir por punto y coma
    console.log(`[RESTAURAR MySQL2] Ejecutando SQL (esto puede tardar varios minutos)...`);
    
    try {
      // Ejecutar todo el SQL de una vez
      const [results] = await connection.query(contenidoSQL);
      
      // results puede ser un array de resultados si hay múltiples statements
      const numResults = Array.isArray(results) ? results.length : 1;
      console.log(`[RESTAURAR MySQL2] SQL ejecutado exitosamente (${numResults} resultados)`);
    } catch (err) {
      // Algunos errores pueden ser ignorados (ej: tabla ya existe, constraint duplicado)
      const errorMsg = err.message.toLowerCase();
      const erroresIgnorables = [
        'already exists',
        'duplicate entry',
        'unknown table',
        'duplicate key',
        'cannot add foreign key constraint', // Puede ocurrir si las tablas ya existen
      ];
      
      const esErrorIgnorable = erroresIgnorables.some(patron => errorMsg.includes(patron));
      
      if (esErrorIgnorable) {
        console.warn(`[RESTAURAR MySQL2] Advertencia (ignorada): ${err.message}`);
      } else {
        throw err; // Re-lanzar errores críticos
      }
    }
    
    console.log(`[RESTAURAR MySQL2] Restauración completada exitosamente`);
  } finally {
    await connection.end();
  }
}

// MÉTODO 2: Usar spawn con stdin
async function restaurarConSpawn(archivoSQL, dbConfig) {
  const { spawn } = require('child_process');
  const mysqldumpInfo = await verificarMySQLDump();
  
  if (!mysqldumpInfo.disponible) {
    throw new Error('mysqldump no disponible');
  }
  
  const mysqlPath = comandoMysqlDesdeMysqldump(mysqldumpInfo.comando);
  
  // Leer el archivo SQL
  const contenidoSQL = await fs.readFile(archivoSQL, 'utf8');
  
  // Construir argumentos
  const args = [];
  if (dbConfig.host !== 'localhost' && dbConfig.host !== '127.0.0.1') {
    args.push('-h', dbConfig.host);
  }
  if (dbConfig.port !== 3306) {
    args.push('-P', dbConfig.port.toString());
  }
  args.push('-u', dbConfig.user);
  args.push(`-p${dbConfig.password}`);
  args.push(dbConfig.database);
  
  return new Promise((resolve, reject) => {
    const mysqlProcess = spawn(mysqlPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });
    
    let stdout = '';
    let stderr = '';
    
    mysqlProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    mysqlProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    mysqlProcess.on('close', (code) => {
      // Filtrar warnings
      const stderrFiltrado = stderr
        .split('\n')
        .filter(line => {
          const lowerLine = line.toLowerCase().trim();
          return !lowerLine.includes('using a password on the command line interface can be insecure') &&
                 !lowerLine.startsWith('warning:') &&
                 !lowerLine.includes('[warning]') &&
                 line.trim().length > 0;
        })
        .join('\n').trim();
      
      if (code === 0 || (code !== 0 && stderrFiltrado.length === 0)) {
        resolve();
      } else {
        reject(new Error(`MySQL spawn falló: ${stderrFiltrado || stdout}`));
      }
    });
    
    mysqlProcess.on('error', (err) => {
      reject(new Error(`Error al ejecutar mysql: ${err.message}`));
    });
    
    // Escribir el SQL al stdin
    mysqlProcess.stdin.write(contenidoSQL, 'utf8');
    mysqlProcess.stdin.end();
  });
}

// MÉTODO 3: Usar CMD con type
async function restaurarConCMD(archivoSQL, dbConfig) {
  const mysqldumpInfo = await verificarMySQLDump();
  
  if (!mysqldumpInfo.disponible) {
    throw new Error('mysqldump no disponible');
  }
  
  const mysqlPath = comandoMysqlDesdeMysqldump(mysqldumpInfo.comando);
  
  // Escapar la ruta del archivo SQL para CMD
  const archivoSQLEscapado = archivoSQL.replace(/"/g, '""');
  
  // Construir argumentos
  let mysqlArgs = [];
  if (dbConfig.host !== 'localhost' && dbConfig.host !== '127.0.0.1') {
    mysqlArgs.push('-h', dbConfig.host);
  }
  if (dbConfig.port !== 3306) {
    mysqlArgs.push('-P', dbConfig.port.toString());
  }
  mysqlArgs.push('-u', dbConfig.user);
  mysqlArgs.push(`-p${dbConfig.password}`);
  mysqlArgs.push(dbConfig.database);
  
  const mysqlArgsStr = mysqlArgs.map(arg => `"${arg}"`).join(' ');
  const mysqlPathEscapado = mysqlPath.includes(' ') ? `"${mysqlPath}"` : mysqlPath;
  
  // Usar CMD con type
  const comando = `cmd /c type "${archivoSQLEscapado}" | ${mysqlPathEscapado} ${mysqlArgsStr}`;
  
  console.log(`[RESTAURAR CMD] Ejecutando: ${comando.replace(/-p\S+/, '-p***')}`);
  
  const { stdout, stderr } = await execAsync(comando, {
    maxBuffer: 50 * 1024 * 1024,
    timeout: 30 * 60 * 1000,
  });
  
  // Filtrar warnings
  const stderrFiltrado = stderr
    ? stderr
        .split('\n')
        .filter(line => {
          const lowerLine = line.toLowerCase().trim();
          return !lowerLine.includes('using a password on the command line interface can be insecure') &&
                 !lowerLine.startsWith('warning:') &&
                 !lowerLine.includes('[warning]') &&
                 line.trim().length > 0;
        })
        .join('\n').trim()
    : '';
  
  if (stderrFiltrado && stderrFiltrado.length > 0) {
    throw new Error(`MySQL reportó errores: ${stderrFiltrado}`);
  }
}

// MÉTODO 4: Usar PowerShell con Get-Content (método original)
async function restaurarConPowerShell(archivoSQL, dbConfig) {
  const mysqldumpInfo = await verificarMySQLDump();
  
  if (!mysqldumpInfo.disponible) {
    throw new Error('mysqldump no disponible');
  }
  
  let mysqlPath = comandoMysqlDesdeMysqldump(mysqldumpInfo.comando);
  let mysqlEnPath = false;
  
  try {
    await execAsync('mysql --version');
    mysqlEnPath = true;
    mysqlPath = 'mysql';
  } catch (error) {
    mysqlPath = comandoMysqlDesdeMysqldump(mysqldumpInfo.comando);
  }
  
  const archivoSQLEscapado = archivoSQL.replace(/'/g, "''");
  
  let mysqlArgs = [];
  if (dbConfig.host !== 'localhost' && dbConfig.host !== '127.0.0.1') {
    mysqlArgs.push('-h', dbConfig.host);
  }
  if (dbConfig.port !== 3306) {
    mysqlArgs.push('-P', dbConfig.port.toString());
  }
  mysqlArgs.push('-u', dbConfig.user);
  mysqlArgs.push(`-p${dbConfig.password}`);
  
  const mysqlArgsStr = mysqlArgs.join(' ');
  
  let mysqlPathParaComando;
  if (mysqlEnPath) {
    mysqlPathParaComando = 'mysql';
  } else if (mysqlPath.includes(' ')) {
    mysqlPathParaComando = `& "${mysqlPath}"`;
  } else {
    mysqlPathParaComando = `"${mysqlPath}"`;
  }
  
  const comando = `powershell -Command "Get-Content '${archivoSQLEscapado}' | ${mysqlPathParaComando} ${mysqlArgsStr} ${dbConfig.database}"`;
  
  console.log(`[RESTAURAR PowerShell] Ejecutando: ${comando.replace(/-p\S+/, '-p***')}`);
  
  const { stdout, stderr } = await execAsync(comando, {
    maxBuffer: 50 * 1024 * 1024,
    timeout: 30 * 60 * 1000,
    shell: false,
  });
  
  const stderrFiltrado = stderr
    ? stderr
        .split('\n')
        .filter(line => {
          const lowerLine = line.toLowerCase().trim();
          return !lowerLine.includes('using a password on the command line interface can be insecure') &&
                 !lowerLine.startsWith('warning:') &&
                 !lowerLine.includes('[warning]') &&
                 line.trim().length > 0;
        })
        .join('\n').trim()
    : '';
  
  if (stderrFiltrado && stderrFiltrado.length > 0) {
    throw new Error(`MySQL reportó errores: ${stderrFiltrado}`);
  }
}

/**
 * Resuelve la ruta absoluta de un archivo .zip/.rar bajo la carpeta de backups (anti path traversal).
 */
async function resolverRutaArchivoBackup(nombreParam) {
  if (!nombreParam || typeof nombreParam !== 'string') {
    throw new Error('Nombre de backup inválido');
  }
  let decoded = nombreParam;
  try {
    decoded = decodeURIComponent(nombreParam);
  } catch {
    // usar valor original
  }
  const base = path.basename(decoded);
  if (base !== decoded || decoded.includes('..')) {
    throw new Error('Nombre de backup inválido');
  }
  const ext = path.extname(decoded).toLowerCase();
  if (ext !== '.zip' && ext !== '.rar') {
    throw new Error('Solo se permiten archivos .zip o .rar');
  }

  await loadConfig();
  const raizBackup = path.resolve(await asegurarDirectorioRutaBackup());

  let archivo = null;
  const rutaDirecta = path.resolve(path.join(raizBackup, decoded));
  const relDirecta = path.relative(raizBackup, rutaDirecta);
  if (!relDirecta.startsWith('..') && !path.isAbsolute(relDirecta)) {
    try {
      await fs.access(rutaDirecta);
      const stats = await fs.stat(rutaDirecta);
      if (stats.isFile()) {
        archivo = rutaDirecta;
      }
    } catch {
      // buscar en subcarpetas
    }
  }

  if (!archivo) {
    try {
      const entries = await fs.readdir(raizBackup);
      for (const item of entries) {
        const ruta = path.join(raizBackup, item);
        try {
          const stats = await fs.stat(ruta);
          if (!stats.isDirectory()) continue;
          const rutaAnidada = path.resolve(path.join(ruta, decoded));
          const rel = path.relative(raizBackup, rutaAnidada);
          if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
          try {
            await fs.access(rutaAnidada);
            const st = await fs.stat(rutaAnidada);
            if (st.isFile()) {
              archivo = rutaAnidada;
              break;
            }
          } catch {
            continue;
          }
        } catch {
          continue;
        }
      }
    } catch (e) {
      throw new Error(`Error al buscar el backup: ${e.message}`);
    }
  }

  if (!archivo) {
    throw new Error(`El archivo de backup no existe: ${decoded}`);
  }

  const resolvedFile = path.resolve(archivo);
  const relFinal = path.relative(raizBackup, resolvedFile);
  if (relFinal.startsWith('..') || path.isAbsolute(relFinal)) {
    throw new Error('Ruta de backup fuera del directorio permitido');
  }

  return resolvedFile;
}

// Restaurar backup
async function restaurarBackup(nombreBackup) {
  await loadConfig();
  const raizBackup = path.resolve(await asegurarDirectorioRutaBackup());
  const archivoRAR = await resolverRutaArchivoBackup(nombreBackup);
  console.log(`[RESTAURAR] Archivo encontrado: ${archivoRAR}`);

  const rutaExtraccion = path.join(raizBackup, 'temp_restore');
  await fs.rm(rutaExtraccion, { recursive: true, force: true });
  await fs.mkdir(rutaExtraccion, { recursive: true });
  
  try {
    await extraerBackupArchivo(archivoRAR, rutaExtraccion);
  } catch (error) {
    throw new Error(`Error al extraer el backup: ${error.message}`);
  }
  
  // Buscar el archivo SQL (puede estar en el directorio raíz o en una subcarpeta)
  let archivoSQL = null;
  const archivosEncontrados = [];
  
  const buscarArchivoSQL = async (dir) => {
    const archivos = await fs.readdir(dir, { withFileTypes: true });
    
    for (const archivo of archivos) {
      const rutaCompleta = path.join(dir, archivo.name);
      
      if (archivo.isDirectory()) {
        // Buscar recursivamente en subdirectorios
        const encontrado = await buscarArchivoSQL(rutaCompleta);
        if (encontrado) {
          return encontrado;
        }
      } else if (archivo.isFile()) {
        // Registrar todos los archivos encontrados para debugging
        archivosEncontrados.push(rutaCompleta.replace(rutaExtraccion, ''));
        
        if (archivo.name.endsWith('.sql')) {
          // Priorizar database_backup.sql, luego cualquier archivo .sql que contenga 'backup' o 'database'
          if (archivo.name === 'database_backup.sql') {
            return rutaCompleta;
          } else if (!archivoSQL && (archivo.name.toLowerCase().includes('backup') || archivo.name.toLowerCase().includes('database'))) {
            archivoSQL = rutaCompleta;
          } else if (!archivoSQL) {
            // Si no hay otro candidato, usar este
            archivoSQL = rutaCompleta;
          }
        }
      }
    }
    
    return archivoSQL;
  };
  
  archivoSQL = await buscarArchivoSQL(rutaExtraccion);
  
  if (!archivoSQL) {
    // Limpiar y lanzar error con información útil
    const listaArchivos = archivosEncontrados.length > 0 
      ? `\nArchivos encontrados en el backup:\n${archivosEncontrados.slice(0, 20).join('\n')}${archivosEncontrados.length > 20 ? `\n... y ${archivosEncontrados.length - 20} más` : ''}`
      : '\nNo se encontraron archivos en el backup.';
    await fs.rm(rutaExtraccion, { recursive: true, force: true });
    throw new Error(`El backup no es válido: no contiene el archivo database_backup.sql necesario para restaurar la base de datos. Este backup probablemente se creó con errores.${listaArchivos}\n\nSugerencia: Verifique los logs del backup para ver qué salió mal durante la creación.`);
  }
  
  // Verificar que el archivo SQL no esté vacío
  const stats = await fs.stat(archivoSQL);
  if (stats.size === 0) {
    await fs.rm(rutaExtraccion, { recursive: true, force: true });
    throw new Error('El archivo database_backup.sql está vacío. El backup no es válido.');
  }
  
  // Restaurar la base de datos usando múltiples métodos como fallback
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'GL2025',
    database: process.env.DB_NAME || 'club_social',
  };
  
  const archivoSQLCompleto = path.resolve(archivoSQL);
  console.log(`[RESTAURAR] Archivo SQL: ${archivoSQLCompleto}`);
  
  // Verificar que el archivo existe
  try {
    await fs.access(archivoSQLCompleto);
    const stats = await fs.stat(archivoSQLCompleto);
    console.log(`[RESTAURAR] Archivo SQL existe (tamaño: ${stats.size} bytes)`);
  } catch (accessError) {
    await fs.rm(rutaExtraccion, { recursive: true, force: true });
    throw new Error(`El archivo SQL no existe o no es accesible: ${archivoSQLCompleto}`);
  }
  
  // Variable para capturar qué método funcionó
  let metodoExitoso = null;
  const nombreMetodos = {
    1: 'mysql2 directo',
    2: 'spawn con stdin',
    3: 'CMD con type',
    4: 'PowerShell con Get-Content',
  };
  
  // MÉTODO 1: Usar mysql2 directamente (más confiable)
  console.log(`[RESTAURAR] Intentando MÉTODO 1: mysql2 directo...`);
  try {
    await restaurarConMySQL2(archivoSQLCompleto, dbConfig);
    metodoExitoso = 1;
    console.log(`[RESTAURAR] ✅ Restauración exitosa con MÉTODO 1: ${nombreMetodos[1]}`);
  } catch (error1) {
    console.log(`[RESTAURAR] ❌ Método 1 falló: ${error1.message}`);
    console.log(`[RESTAURAR] Intentando MÉTODO 2: spawn con stdin...`);
    
    // MÉTODO 2: Usar spawn con stdin
    try {
      await restaurarConSpawn(archivoSQLCompleto, dbConfig);
      metodoExitoso = 2;
      console.log(`[RESTAURAR] ✅ Restauración exitosa con MÉTODO 2: ${nombreMetodos[2]}`);
    } catch (error2) {
      console.log(`[RESTAURAR] ❌ Método 2 falló: ${error2.message}`);
      console.log(`[RESTAURAR] Intentando MÉTODO 3: CMD con type...`);
      
      // MÉTODO 3: Usar CMD con type
      try {
        await restaurarConCMD(archivoSQLCompleto, dbConfig);
        metodoExitoso = 3;
        console.log(`[RESTAURAR] ✅ Restauración exitosa con MÉTODO 3: ${nombreMetodos[3]}`);
      } catch (error3) {
        console.log(`[RESTAURAR] ❌ Método 3 falló: ${error3.message}`);
        console.log(`[RESTAURAR] Intentando MÉTODO 4: PowerShell con Get-Content...`);
        
        // MÉTODO 4: PowerShell con Get-Content (método original)
        try {
          await restaurarConPowerShell(archivoSQLCompleto, dbConfig);
          metodoExitoso = 4;
          console.log(`[RESTAURAR] ✅ Restauración exitosa con MÉTODO 4: ${nombreMetodos[4]}`);
        } catch (error4) {
          console.error(`[RESTAURAR] ❌ Todos los métodos fallaron`);
          await fs.rm(rutaExtraccion, { recursive: true, force: true });
          throw new Error(`Error al restaurar: Todos los métodos fallaron. Último error: ${error4.message}`);
        }
      }
    }
  }
  
  // Mostrar claramente qué método funcionó
  if (metodoExitoso) {
    console.log(`[RESTAURAR] ========================================`);
    console.log(`[RESTAURAR] MÉTODO EXITOSO: ${metodoExitoso} - ${nombreMetodos[metodoExitoso]}`);
    console.log(`[RESTAURAR] ========================================`);
  }
  
  console.log(`[RESTAURAR] Base de datos restaurada exitosamente`);
  
  // Limpiar directorio temporal
  await fs.rm(rutaExtraccion, { recursive: true, force: true });
  
  return {
    exito: true,
    nombre: nombreBackup,
    fecha: new Date().toISOString(),
    metodoUsado: metodoExitoso,
    metodoNombre: nombreMetodos[metodoExitoso] || 'Desconocido',
  };
}

// Eliminar backup
async function eliminarBackup(nombreBackup) {
  await loadConfig();
  const raizBackup = path.resolve(await asegurarDirectorioRutaBackup());
  const archivoRAR = await resolverRutaArchivoBackup(nombreBackup);

  // Eliminar el archivo
  try {
    await fs.unlink(archivoRAR);
    console.log(`[BACKUP] Archivo eliminado: ${archivoRAR}`);
    
    // Si el directorio queda vacío, eliminarlo también
    const dirBackup = path.dirname(archivoRAR);
    if (dirBackup !== raizBackup) {
      try {
        const archivosEnDir = await fs.readdir(dirBackup);
        if (archivosEnDir.length === 0) {
          await fs.rmdir(dirBackup);
          console.log(`[BACKUP] Directorio vacío eliminado: ${dirBackup}`);
        }
      } catch (e) {
        // Ignorar errores al eliminar directorio
      }
    }
  } catch (error) {
    throw new Error(`Error al eliminar el backup: ${error.message}`);
  }
  
  return {
    exito: true,
    nombre: nombreBackup,
    fecha: new Date().toISOString(),
    mensaje: 'Backup eliminado exitosamente',
  };
}

// Inicializar configuración
loadConfig();

module.exports = {
  realizarBackup,
  getConfig,
  saveConfig,
  loadConfig,
  listarDirectoriosExistentes,
  listarBackups,
  restaurarBackup,
  eliminarBackup,
  resolverRutaArchivoBackup,
  verificarWinRAR,
  verificarMySQLDump,
  obtenerMetodoCompresion,
  listarRaicesExplorador,
  listarSubdirectoriosExplorador,
};

