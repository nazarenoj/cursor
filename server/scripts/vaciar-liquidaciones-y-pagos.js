/**
 * Script para VACIAR liquidaciones, pagos y movimientos de caja manteniendo usuarios y socios.
 *
 * Borra (en este orden):
 *   - TODOS los movimientos de caja (movimientos_cajas)
 *   - Todas las cuotas de liquidación (liquidaciones_cuotas)
 *   - Todas las liquidaciones mensuales (liquidaciones_mensuales)
 *   - Pone el saldo inicial de todas las cajas en 0 (UPDATE cajas SET saldo_inicial = 0)
 *
 * NO toca: usuarios, usuario_permisos, socios, adherentes, categorías,
 *          definición de cajas y medios_pago (solo se vacían movimientos y saldos).
 *
 * Uso (desde la carpeta server):
 *   node scripts/vaciar-liquidaciones-y-pagos.js
 *   node scripts/vaciar-liquidaciones-y-pagos.js --yes   (sin preguntar)
 *
 * Desde la raíz del proyecto:
 *   npm run vaciar-liquidaciones --prefix server
 *
 * Requiere: variables DB_* en server/.env
 *
 * Uso en producción: ver VACIAR_LIQUIDACIONES_PRODUCCION.md en la raíz del proyecto.
 */

const path = require('path');
const readline = require('readline');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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
  console.log('=== VACIAR LIQUIDACIONES Y PAGOS ===');
  console.log('');
  console.log('Base de datos:', config.database, `(${config.host}:${config.port})`);
  console.log('');
  console.log('Se van a BORRAR:');
  console.log('  - TODOS los movimientos de caja (movimientos_cajas)');
  console.log('  - Todas las cuotas de liquidación (liquidaciones_cuotas)');
  console.log('  - Todas las liquidaciones mensuales (liquidaciones_mensuales)');
  console.log('  - Saldo inicial de todas las cajas se pondrá en 0');
  console.log('');
  console.log('NO se borran: socios, usuarios, categorías, definición de cajas ni medios de pago.');
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
      database: config.database,
      charset: 'utf8mb4',
    });
  } catch (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    console.error('Revisá server/.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).');
    process.exit(1);
  }

  try {
    await conn.beginTransaction();

    const [mov] = await conn.execute('DELETE FROM movimientos_cajas');
    const movCount = mov.affectedRows;

    const [cuotas] = await conn.execute('DELETE FROM liquidaciones_cuotas');
    const cuotasCount = cuotas.affectedRows;

    const [liq] = await conn.execute('DELETE FROM liquidaciones_mensuales');
    const liqCount = liq.affectedRows;

    const [cajas] = await conn.execute('UPDATE cajas SET saldo_inicial = 0');
    const cajasCount = cajas.affectedRows;

    await conn.commit();

    console.log('');
    console.log('Listo.');
    console.log('  - Movimientos de caja eliminados:', movCount);
    console.log('  - Cuotas de liquidación eliminadas:', cuotasCount);
    console.log('  - Liquidaciones mensuales eliminadas:', liqCount);
    console.log('  - Cajas puestas a saldo inicial 0:', cajasCount);
    console.log('');
  } catch (err) {
    await conn.rollback();
    console.error('Error al ejecutar:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
