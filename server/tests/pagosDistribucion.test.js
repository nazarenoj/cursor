const test = require('node:test');
const assert = require('node:assert/strict');
const { distribuirPartesEnCuotas } = require('../src/utils/pagosDistribucion');

const suma = (arr) => arr.reduce((s, x) => s + Number(x || 0), 0);
const round2 = (v) => Math.round(Number(v || 0) * 100) / 100;

test('distribuye medios proporcionalmente sin exceder cada cuota', () => {
  const partes = [
    { nombreMedio: 'Efectivo', montoTotal: 1800 },
    { nombreMedio: 'Transferencia', montoTotal: 1200 },
  ];
  const cuotas = [1000, 500, 1500];

  const matriz = distribuirPartesEnCuotas(partes, cuotas);

  assert.deepEqual(matriz[0], [600, 300, 900]);
  assert.deepEqual(matriz[1], [400, 200, 600]);
});

test('nunca supera monto individual por cuota', () => {
  const partes = [
    { nombreMedio: 'Tarjeta', montoTotal: 1000 },
    { nombreMedio: 'QR', montoTotal: 500 },
  ];
  const cuotas = [750, 250, 500];
  const matriz = distribuirPartesEnCuotas(partes, cuotas);

  for (let i = 0; i < cuotas.length; i++) {
    const totalCuota = round2(suma(matriz.map((fila) => fila[i])));
    assert.ok(totalCuota <= round2(cuotas[i]));
  }
});

test('rechaza cuando un medio excede el saldo disponible', () => {
  const partes = [{ nombreMedio: 'Efectivo', montoTotal: 3500 }];
  const cuotas = [1000, 500, 1500];

  assert.throws(
    () => distribuirPartesEnCuotas(partes, cuotas),
    /excede el saldo disponible/i,
  );
});

test('conserva sumas por medio y total con centavos', () => {
  const partes = [
    { nombreMedio: 'Efectivo', montoTotal: 100.01 },
    { nombreMedio: 'Transferencia', montoTotal: 50.02 },
  ];
  const cuotas = [60.01, 40.01, 50.01];
  const matriz = distribuirPartesEnCuotas(partes, cuotas);

  assert.equal(round2(suma(matriz[0])), 100.01);
  assert.equal(round2(suma(matriz[1])), 50.02);
  assert.equal(round2(suma(matriz.flat())), 150.03);
});
