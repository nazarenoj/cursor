/**
 * Recalcula todos los cobros ya registrados para que cada cuota tenga en medio_pago
 * el monto que le corresponde (no el total del batch) y que en movimientos_cajas
 * haya un movimiento por cuota con ese monto.
 *
 * Agrupa cuotas pagadas por (fecha_pago, medio_pago, socio_id) para no mezclar
 * pagos de distintos socios; en cada grupo reparte
 * el monto de cada medio entre las cuotas de forma proporcional y actualiza
 * liquidaciones_cuotas.medio_pago y reemplaza los movimientos de caja afectados.
 *
 * Requiere: variables DB_* en server/.env
 *
 * Uso (desde la carpeta server):
 *   node scripts/recalcular-cobros.js
 *   node scripts/recalcular-cobros.js --yes     (sin preguntar)
 *   node scripts/recalcular-cobros.js --dry-run (solo muestra qué haría)
 */

const path = require('path');
const readline = require('readline');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');

const dbConfig = () => ({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'club_social',
  charset: 'utf8mb4',
});

function parsePartesMedio(descripcionMedio) {
  const partes = [];
  const partesMedio = (descripcionMedio || '').split(',').map((p) => p.trim());
  for (const parte of partesMedio) {
    const match = parte.match(/^(.+?):\s*\$\s*([\d,]+\.?\d*)$/);
    if (match) {
      const nombreMedio = match[1].trim();
      const montoStr = match[2].replace(/,/g, '');
      const montoTotal = parseFloat(montoStr);
      if (!isNaN(montoTotal) && montoTotal > 0) {
        partes.push({ nombreMedio, montoTotal });
      }
    }
  }
  return partes;
}

// Total del medio dividido en la cantidad de cuotas
function computeMontosPorPartePorCuota(cuotasRows, partes) {
  const n = cuotasRows.length;
  return partes.map((parte) => {
    const fila = [];
    let acumulado = 0;
    const montoPorCuota = parte.montoTotal / n;
    for (let i = 0; i < n; i++) {
      let monto;
      if (i === n - 1) {
        monto = Math.round((parte.montoTotal - acumulado) * 100) / 100;
      } else {
        monto = Math.round(montoPorCuota * 100) / 100;
        acumulado += monto;
      }
      fila.push(monto);
    }
    return fila;
  });
}

async function main() {
  const skipConfirm = process.argv.includes('--yes');
  const dryRun = process.argv.includes('--dry-run');
  const config = dbConfig();

  console.log('');
  console.log('=== RECALCULAR COBROS (medio_pago y movimientos por cuota) ===');
  console.log('');
  if (dryRun) {
    console.log('Modo --dry-run: no se modificará la base de datos.');
    console.log('');
  }
  console.log('Base de datos:', config.database, `(${config.host}:${config.port})`);
  console.log('');

  let conn;
  try {
    conn = await mysql.createConnection(config);
  } catch (err) {
    console.error('Error al conectar:', err.message);
    process.exit(1);
  }

  try {
    const [paid] = await conn.execute(
      `SELECT id, liquidacion_mensual_id, socio_id, numero_socio, apellido, nombre, categoria_id, categoria_nombre,
              monto, pagado, fecha_pago, medio_pago
       FROM liquidaciones_cuotas
       WHERE pagado = 1 AND fecha_pago IS NOT NULL AND medio_pago IS NOT NULL AND TRIM(medio_pago) != ''`,
    );

    if (paid.length === 0) {
      console.log('No hay cuotas pagadas con medio_pago. Nada que recalcular.');
      await conn.end();
      return;
    }

    const byKey = new Map();
    for (const row of paid) {
      const key = `${row.fecha_pago}\0${(row.medio_pago || '').trim()}\0${row.socio_id || 0}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(row);
    }

    let gruposRecalculados = 0;
    let cuotasActualizadas = 0;
    let movimientosEliminados = 0;
    let movimientosCreados = 0;

    if (!dryRun) {
      if (!skipConfirm) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise((resolve) => {
          rl.question(
            `Se encontraron ${paid.length} cuotas pagadas en ${byKey.size} grupo(s). ¿Continuar? (escribí SI para ejecutar): `,
            resolve,
          );
        });
        rl.close();
        if (answer.trim() !== 'SI') {
          console.log('Cancelado.');
          await conn.end();
          return;
        }
      }
      console.log('');
    }

    if (dryRun) {
      for (const [key, cuotasRows] of byKey) {
        const totalCuotas = cuotasRows.reduce((s, c) => s + Number(c.monto || 0), 0);
        const partes = parsePartesMedio(cuotasRows[0].medio_pago);
        const totalPartes = partes.reduce((s, p) => s + p.montoTotal, 0);
        console.log(
          `Grupo fecha_pago=${cuotasRows[0].fecha_pago} (${cuotasRows.length} cuotas, total cuotas=${totalCuotas.toFixed(2)}, total medios=${totalPartes.toFixed(2)}):`,
        );
        cuotasRows.forEach((c, i) => {
          console.log(`  Cuota ${i + 1} id=${c.id} monto=${c.monto} medio_pago=${c.medio_pago}`);
        });
        console.log('');
      }
      await conn.end();
      return;
    }

    await conn.beginTransaction();

    for (const [, cuotasRows] of byKey) {
      const totalCuotas = cuotasRows.reduce((s, c) => s + Number(c.monto || 0), 0);
      if (totalCuotas <= 0) continue;

      const descripcionMedio = cuotasRows[0].medio_pago;
      const partes = parsePartesMedio(descripcionMedio);
      if (partes.length === 0) continue;

      const montosPorPartePorCuota = computeMontosPorPartePorCuota(cuotasRows, partes);
      const medioPagoPorCuota = cuotasRows.map((_, cuotaIdx) =>
        partes
          .map((p, parteIdx) => `${p.nombreMedio}: $${(montosPorPartePorCuota[parteIdx][cuotaIdx] || 0).toFixed(2)}`)
          .join(', '),
      );

      const ids = cuotasRows.map((c) => c.id);

      for (let i = 0; i < cuotasRows.length; i++) {
        await conn.execute(
          `UPDATE liquidaciones_cuotas SET medio_pago = ? WHERE id = ?`,
          [medioPagoPorCuota[i], cuotasRows[i].id],
        );
        cuotasActualizadas++;
      }

      const [del] = await conn.execute(
        `DELETE FROM movimientos_cajas WHERE liquidacion_cuota_id IN (${ids.map(() => '?').join(',')})`,
        ids,
      );
      movimientosEliminados += del.affectedRows;

      for (let parteIdx = 0; parteIdx < partes.length; parteIdx++) {
        const parte = partes[parteIdx];
        const [mediosRows] = await conn.execute(
          'SELECT id, caja_id FROM medios_pago WHERE nombre = ? AND activo = 1 LIMIT 1',
          [parte.nombreMedio],
        );
        if (mediosRows.length === 0 || !mediosRows[0].caja_id) continue;

        const medioPagoId = mediosRows[0].id;
        const cajaId = mediosRows[0].caja_id;
        const pagoFecha = cuotasRows[0].fecha_pago;

        for (let i = 0; i < cuotasRows.length; i++) {
          const montoMovimiento = montosPorPartePorCuota[parteIdx][i];
          if (montoMovimiento <= 0) continue;

          const cuota = cuotasRows[i];
          const concepto = `Cobro de cuota - Socio ${cuota.numero_socio}`;
          const descripcion = `Cobro de 1 cuota mediante ${parte.nombreMedio}`;

          await conn.execute(
            `INSERT INTO movimientos_cajas 
             (caja_id, tipo, monto, concepto, descripcion, medio_pago_id, liquidacion_cuota_id, fecha) 
             VALUES (?, 'ingreso', ?, ?, ?, ?, ?, ?)`,
            [cajaId, montoMovimiento, concepto, descripcion, medioPagoId, cuota.id, pagoFecha],
          );
          movimientosCreados++;
        }
      }
      gruposRecalculados++;
    }

    await conn.commit();

    console.log('Listo.');
    console.log('  Grupos recalculados:', gruposRecalculados);
    console.log('  Cuotas actualizadas (medio_pago):', cuotasActualizadas);
    console.log('  Movimientos de caja eliminados:', movimientosEliminados);
    console.log('  Movimientos de caja creados:', movimientosCreados);
    console.log('');
  } catch (err) {
    await conn.rollback();
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
