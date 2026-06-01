/**
 * Script para VACIAR COMPLETAMENTE la base de datos (solo desarrollo/testing).
 *
 * NO ejecutar en producción. El script no está en package.json; debe ejecutarse
 * manualmente desde la carpeta server: node scripts/vaciar-todo-db.js
 *
 * Hace:
 *   1. DROP DATABASE
 *   2. CREATE DATABASE
 *   3. Ejecuta initDb() para recrear tablas, permisos y usuario admin
 *
 * Resultado: base de datos vacía con usuario admin (contraseña: admin).
 *
 * Uso (desde la carpeta server):
 *   node scripts/vaciar-todo-db.js
 *   node scripts/vaciar-todo-db.js --yes   (sin preguntar)
 *
 * Requiere: variables DB_* en server/.env
 *
 * IMPORTANTE: Hacer backup antes de ejecutar. Se pierden TODOS los datos.
 */

const path = require('path');
const readline = require('readline');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (process.env.NODE_ENV === 'production') {
  console.error('No se puede ejecutar vaciar-todo-db en producción.');
  process.exit(1);
}

const mysql = require('mysql2/promise');

const dbConfig = () => {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'club_social';
  return { host, port, user, password, database };
};

async function main() {
  const skipConfirm = process.argv.includes('--yes');
  const config = dbConfig();

  console.log('');
  console.log('=== VACIAR BASE DE DATOS COMPLETA (testing) ===');
  console.log('');
  console.log('Base de datos:', config.database, `(${config.host}:${config.port})`);
  console.log('');
  console.log('Se va a BORRAR TODO:');
  console.log('  - DROP DATABASE ' + config.database);
  console.log('  - CREATE DATABASE (vacía)');
  console.log('  - Recrear tablas y usuario admin (contraseña: admin)');
  console.log('');
  console.log('Se pierden: socios, categorías, usuarios, liquidaciones, cajas, todo.');
  console.log('');

  if (!skipConfirm) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => {
      rl.question('¿Estás seguro? Escribí BORRAR para ejecutar: ', resolve);
    });
    rl.close();
    if (answer.trim() !== 'BORRAR') {
      console.log('Cancelado. No se modificó la base de datos.');
      process.exit(0);
    }
  }

  let conn;
  try {
    conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      charset: 'utf8mb4',
    });
  } catch (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    console.error('Revisá server/.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).');
    process.exit(1);
  }

  try {
    console.log('Eliminando base de datos...');
    await conn.query(`DROP DATABASE IF EXISTS \`${config.database}\``);

    console.log('Creando base de datos vacía...');
    await conn.query(
      `CREATE DATABASE \`${config.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci`
    );

    await conn.end();

    console.log('Inicializando tablas y usuario admin...');
    const { initDb } = require('../src/db');
    await initDb();

    console.log('');
    console.log('Listo. Base de datos vacía. Usuario: admin, contraseña: admin');
    console.log('Si el servidor está corriendo, reinicialo para que use la BD nueva.');
    console.log('');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
