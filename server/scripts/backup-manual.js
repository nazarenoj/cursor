/**
 * Backup manual de la base de datos SIN necesidad de tener el backend corriendo.
 * Usa las variables de server/.env y escribe un .sql en server/backups/.
 *
 * Uso (desde la carpeta server):
 *   node scripts/backup-manual.js
 *
 * Requiere: MySQL instalado con mysqldump en el PATH o en una ruta común de Windows.
 * Variables en server/.env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
 */

const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'club_social',
};

const RUTAS_MYSQLDUMP = [
  'mysqldump',
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.1\\bin\\mysqldump.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.2\\bin\\mysqldump.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.3\\bin\\mysqldump.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\mysqldump.exe',
  'C:\\xampp\\mysql\\bin\\mysqldump.exe',
];

async function encontrarMysqldump() {
  const { execSync } = require('child_process');
  try {
    execSync('mysqldump --version', { stdio: 'pipe' });
    return 'mysqldump';
  } catch (_) {}
  for (const ruta of RUTAS_MYSQLDUMP) {
    if (ruta === 'mysqldump') continue;
    try {
      await fs.access(ruta);
      return ruta;
    } catch (_) {}
  }
  return null;
}

function formatearFecha() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}-${h}${min}${s}`;
}

async function main() {
  console.log('');
  console.log('=== BACKUP MANUAL (sin levantar el servidor) ===');
  console.log('');
  console.log('Base de datos:', dbConfig.database, `(${dbConfig.host}:${dbConfig.port})`);
  console.log('');

  const mysqldumpPath = await encontrarMysqldump();
  if (!mysqldumpPath) {
    console.error('No se encontró mysqldump. Instalá MySQL o agregá su carpeta bin al PATH.');
    process.exit(1);
  }
  console.log('mysqldump:', mysqldumpPath);
  console.log('');

  const backupDir = path.join(__dirname, '..', 'backups');
  await fs.mkdir(backupDir, { recursive: true });
  const nombreArchivo = `backup-manual-${formatearFecha()}.sql`;
  const archivoSQL = path.join(backupDir, nombreArchivo);

  const args = [
    '-h', dbConfig.host,
    '-P', String(dbConfig.port),
    '-u', dbConfig.user,
    `-p${dbConfig.password}`,
    '--single-transaction',
    '--routines',
    '--triggers',
    dbConfig.database,
  ];

  const proc = spawn(mysqldumpPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  const writeStream = require('fs').createWriteStream(archivoSQL);
  proc.stdout.pipe(writeStream);

  await new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      writeStream.end(() => {
        if (code !== 0 && code !== 2) {
          const msg = stderr.trim() || `mysqldump salió con código ${code}`;
          if (/Access denied|Unknown database|Can't connect|no se reconoce/i.test(msg)) {
            reject(new Error(msg));
          }
        }
        resolve();
      });
    });
    proc.on('error', reject);
  });

  const stat = await fs.stat(archivoSQL);
  if (stat.size === 0) {
    await fs.unlink(archivoSQL).catch(() => {});
    console.error('El archivo SQL quedó vacío. Revisá usuario, contraseña y nombre de la base.');
    if (stderr) console.error('stderr:', stderr.slice(0, 500));
    process.exit(1);
  }

  console.log('Backup guardado en:', archivoSQL);
  console.log('Tamaño:', (stat.size / 1024).toFixed(2), 'KB');
  console.log('');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
