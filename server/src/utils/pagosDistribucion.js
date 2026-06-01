const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

/**
 * Distribuye montos de medios de pago entre cuotas sin superar el saldo individual.
 * @param {{ nombreMedio: string, montoTotal: number }[]} partes
 * @param {number[]} montosCuotas
 * @returns {number[][]} matriz [parteIdx][cuotaIdx] con monto asignado
 */
function distribuirPartesEnCuotas(partes, montosCuotas) {
  const saldos = montosCuotas.map((m) => round2(m));
  const n = saldos.length;
  const matriz = [];

  for (const parte of partes) {
    let restanteParte = round2(parte.montoTotal);
    const fila = new Array(n).fill(0);
    const totalSaldoInicial = round2(saldos.reduce((sum, s) => sum + s, 0));

    if (restanteParte - totalSaldoInicial > 0.009) {
      const error = new Error(
        `El monto asignado a ${parte.nombreMedio} ($${restanteParte.toFixed(2)}) excede el saldo disponible de las cuotas ($${totalSaldoInicial.toFixed(2)}).`,
      );
      error.status = 400;
      throw error;
    }

    const totalSaldo = round2(saldos.reduce((sum, s) => sum + s, 0));
    if (totalSaldo > 0 && restanteParte > 0) {
      for (let i = 0; i < n; i++) {
        if (saldos[i] <= 0) continue;
        const proporcion = saldos[i] / totalSaldo;
        const tentativo = round2(restanteParte * proporcion);
        const asignado = Math.min(saldos[i], tentativo);
        fila[i] = round2(asignado);
        saldos[i] = round2(saldos[i] - fila[i]);
      }
    }

    const totalAsignado = round2(fila.reduce((sum, x) => sum + x, 0));
    let centavosRestantes = Math.round((restanteParte - totalAsignado) * 100);

    while (centavosRestantes > 0) {
      const idx = saldos.findIndex((s) => s >= 0.01);
      if (idx === -1) break;
      fila[idx] = round2(fila[idx] + 0.01);
      saldos[idx] = round2(saldos[idx] - 0.01);
      centavosRestantes -= 1;
    }

    if (centavosRestantes > 0) {
      const error = new Error(`No se pudo distribuir totalmente ${parte.nombreMedio} sin exceder montos por cuota.`);
      error.status = 400;
      throw error;
    }

    matriz.push(fila);
  }

  return matriz;
}

module.exports = {
  distribuirPartesEnCuotas,
};
