/**
 * Analiza por qué difiere el saldo de la caja "Inicio de Sistema 2025"
 * respecto a los movimientos del medio de pago "Carga inicial".
 *
 * Usa la configuración de BD de server/.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).
 *
 * Uso:
 *   cd server
 *   node scripts/analizar-carga-inicial.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { query, getPool } = require('../src/db');

async function main() {
  console.log('=== ANALISIS: Caja "Inicio de Sistema 2025" vs Medio "Carga inicial" ===');
  console.log('');

  try {
    // 1) Buscar caja y medio por nombre
    const cajas = await query('SELECT id, nombre FROM cajas WHERE nombre = ?', ['Inicio de Sistema 2025']);
    if (cajas.length === 0) {
      console.log('No se encontró la caja "Inicio de Sistema 2025". Cajas disponibles:');
      const todas = await query('SELECT id, nombre FROM cajas ORDER BY id');
      console.table(todas);
      return;
    }
    const caja = cajas[0];

    const medios = await query(
      'SELECT id, nombre, caja_id FROM medios_pago WHERE nombre = ?',
      ['Carga inicial'],
    );
    if (medios.length === 0) {
      console.log('No se encontró el medio de pago "Carga inicial". Medios disponibles:');
      const todosMedios = await query('SELECT id, nombre, caja_id FROM medios_pago ORDER BY id');
      console.table(todosMedios);
      return;
    }
    const medio = medios[0];

    console.log('Caja encontrada:', caja);
    console.log('Medio de pago encontrado:', medio);
    if (medio.caja_id !== caja.id) {
      console.log('');
      console.log('⚠ ATENCION: El medio de pago "Carga inicial" NO apunta a la caja "Inicio de Sistema 2025".');
      console.log(`  medio.caja_id = ${medio.caja_id}, caja.id = ${caja.id}`);
      console.log('  Esto ya puede generar diferencias si el medio se usa en otra caja.');
      console.log('');
    }

    // 2) Totales de la caja
    const [totCaja] = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto END), 0) AS ingresos_caja,
         COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto END), 0) AS egresos_caja,
         COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto END), 0)
           - COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto END), 0) AS neto_caja
       FROM movimientos_cajas
       WHERE caja_id = ?`,
      [caja.id],
    );

    // 3) Totales del medio
    const [totMedio] = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto END), 0) AS ingresos_medio,
         COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto END), 0) AS egresos_medio,
         COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto END), 0)
           - COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto END), 0) AS neto_medio
       FROM movimientos_cajas
       WHERE medio_pago_id = ?`,
      [medio.id],
    );

    console.log('');
    console.log('Totales de la caja "Inicio de Sistema 2025":');
    console.table([totCaja]);
    console.log('');
    console.log('Totales del medio de pago "Carga inicial":');
    console.table([totMedio]);

    // 4) Movimientos que están en la caja pero no usan ese medio
    const extrasCaja = await query(
      `SELECT id, fecha, tipo, monto, concepto, descripcion, medio_pago_id, liquidacion_cuota_id
       FROM movimientos_cajas
       WHERE caja_id = ?
         AND (medio_pago_id IS NULL OR medio_pago_id <> ?)
       ORDER BY fecha, created_at`,
      [caja.id, medio.id],
    );

    console.log('');
    console.log(
      `Movimientos que afectan la caja "${caja.nombre}" pero NO usan el medio "Carga inicial" (cuentan para saldo de caja, pero no para el medio):`,
    );
    console.log(`Cantidad: ${extrasCaja.length}`);
    if (extrasCaja.length > 0) {
      console.table(extrasCaja.slice(0, 50));
      if (extrasCaja.length > 50) {
        console.log(`... (${extrasCaja.length - 50} filas más no mostradas)`);
      }
    }

    // 5) Movimientos del medio "Carga inicial" en otras cajas (si los hay)
    const medioOtrasCajas = await query(
      `SELECT mc.id, mc.fecha, mc.tipo, mc.monto, mc.concepto, c.id AS caja_id, c.nombre AS caja_nombre
       FROM movimientos_cajas mc
       JOIN cajas c ON mc.caja_id = c.id
       WHERE mc.medio_pago_id = ?
         AND mc.caja_id <> ?
       ORDER BY mc.fecha, mc.created_at`,
      [medio.id, caja.id],
    );

    console.log('');
    console.log(
      'Movimientos con medio "Carga inicial" en OTRAS cajas (cuentan para el medio, pero no para el saldo de "Inicio del sistema"):',
    );
    console.log(`Cantidad: ${medioOtrasCajas.length}`);
    if (medioOtrasCajas.length > 0) {
      console.table(medioOtrasCajas.slice(0, 50));
      if (medioOtrasCajas.length > 50) {
        console.log(`... (${medioOtrasCajas.length - 50} filas más no mostradas)`);
      }
    }

    console.log('');
    console.log('Resumen:');
    console.log(
      '- El saldo de la caja se calcula con TODOS los movimientos de esa caja (ingresos y egresos).',
    );
    console.log(
      '- El total del medio de pago solo considera movimientos con medio_pago_id = id de "Carga inicial".',
    );
    console.log(
      '- La diferencia se explica por los movimientos listados arriba (extrasCaja y medioOtrasCajas).',
    );
  } catch (err) {
    console.error('Error al analizar diferencia:', err.message);
  } finally {
    try {
      await getPool().end();
    } catch {
      // ignorar
    }
  }
}

main();

