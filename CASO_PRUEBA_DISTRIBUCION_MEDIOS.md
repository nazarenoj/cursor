# Caso de prueba: distribución de medios en pago múltiple

## Objetivo
Validar que, al pagar varias cuotas con varios medios, el monto asignado a cada cuota **no supere** el monto de esa cuota.

## Datos del caso
- Cuotas seleccionadas:
  - Cuota A: `$1000.00`
  - Cuota B: `$500.00`
  - Cuota C: `$1500.00`
- Total cuotas: `$3000.00`
- Medios de pago:
  - Efectivo: `$1800.00`
  - Transferencia: `$1200.00`
- Total medios: `$3000.00`

## Resultado esperado (exacto)
La asignación por cuota debe quedar:

1. Cuota A (`$1000.00`)
   - Efectivo: `$600.00`
   - Transferencia: `$400.00`
   - Total cuota: `$1000.00`
2. Cuota B (`$500.00`)
   - Efectivo: `$300.00`
   - Transferencia: `$200.00`
   - Total cuota: `$500.00`
3. Cuota C (`$1500.00`)
   - Efectivo: `$900.00`
   - Transferencia: `$600.00`
   - Total cuota: `$1500.00`

Validaciones clave:
- Ninguna cuota supera su monto.
- La suma por medio coincide con lo ingresado:
  - Efectivo: `600 + 300 + 900 = 1800`
  - Transferencia: `400 + 200 + 600 = 1200`
- La suma total asignada es `$3000.00`.

---

## Prueba desde UI
1. Ir a `Registrar Pagos`.
2. Seleccionar 3 cuotas pendientes con montos: `1000`, `500`, `1500`.
3. Seleccionar medios y montos:
   - Efectivo `1800`
   - Transferencia `1200`
4. Confirmar pago.
5. Verificar en `Listado de Pagos` / detalle de recibo:
   - Cada cuota debe mostrar distribución equivalente al resultado esperado.
6. Verificar en `Tesorería`:
   - Deben existir movimientos por cuota y por medio con los mismos importes.

---

## Prueba directa por API (opcional)
Endpoint:
- `POST /api/liquidaciones-cuotas/pagar`

Payload de ejemplo:
```json
{
  "ids": [101, 102, 103],
  "medioPago": "Efectivo: $1800.00, Transferencia: $1200.00",
  "fechaPago": "2026-03-31"
}
```

Notas:
- Reemplazar `ids` por cuotas reales con montos `1000`, `500`, `1500`.
- Luego consultar esas cuotas y validar campo `medio_pago` + movimientos en caja.

---

## Caso negativo recomendado
Validar que el backend rechaza exceso por medio.

Ejemplo:
- Cuotas total: `$3000.00`
- Medio único: `Efectivo: $3500.00`

Resultado esperado:
- Respuesta HTTP `400` con mensaje de exceso de monto sobre saldo disponible.
