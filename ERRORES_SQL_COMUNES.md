# Errores SQL Comunes - Guía de Referencia

## ⚠️ Error: INSERT con múltiples valores usando `VALUES ?`

### Error que aparece:
```
You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '?' at line 1
```

### ❌ Código INCORRECTO:
```javascript
// Esto NO funciona en MySQL/MariaDB
const valores = [[id1, caja1], [id2, caja2], [id3, caja3]];
await query(
  'INSERT INTO tabla (col1, col2) VALUES ?',
  [valores]
);
```

### ✅ Código CORRECTO:
```javascript
// Generar placeholders dinámicamente
const valores = [[id1, caja1], [id2, caja2], [id3, caja3]];
const placeholders = valores.map(() => '(?, ?)').join(', ');
const valoresFlat = valores.flatMap(v => [v[0], v[1]]);

await query(
  `INSERT INTO tabla (col1, col2) VALUES ${placeholders}`,
  valoresFlat
);
```

### Ejemplo completo:
```javascript
// Insertar múltiples asociaciones en medio_pago_cajas
if (cajasParaAsociar.length > 0) {
  // Generar placeholders dinámicamente: (?, ?), (?, ?), ...
  const placeholders = cajasParaAsociar.map(() => '(?, ?)').join(', ');
  const valores = cajasParaAsociar.flatMap(cajaId => [medioPagoId, cajaId]);
  
  await query(
    `INSERT INTO medio_pago_cajas (medio_pago_id, caja_id) VALUES ${placeholders}`,
    valores
  );
}
```

### ¿Por qué ocurre?
- **`conn.query()` de mysql2** SÍ acepta `VALUES ?` con arrays de arrays
- **`conn.execute()` de mysql2** NO acepta `VALUES ?` con arrays de arrays
- **Nuestro wrapper `query()`** usa internamente `execute()`, por lo que NO acepta arrays
- Necesita placeholders explícitos: `VALUES (?, ?), (?, ?), (?, ?)`
- El número de placeholders debe coincidir con el número de valores

### Diferencia importante:
```javascript
// ✅ Esto funciona (pool.query o conn.query - método directo de mysql2)
await poolInstance.query('INSERT INTO tabla (col1, col2) VALUES ?', [valores]);
await conn.query('INSERT INTO tabla (col1, col2) VALUES ?', [valores]);

// ❌ Esto NO funciona (nuestro wrapper query/execute que usa execute internamente)
await query('INSERT INTO tabla (col1, col2) VALUES ?', [valores]);
await execute('INSERT INTO tabla (col1, col2) VALUES ?', [valores]);
```

**Nota:** 
- `pool.query()` y `conn.query()` de mysql2 **SÍ aceptan** arrays de arrays con `VALUES ?`
- `pool.execute()` y `conn.execute()` de mysql2 **NO aceptan** arrays de arrays
- Nuestro wrapper `query()` y `execute()` usan `pool.execute()` internamente, por eso **NO aceptan** arrays
- **Solución:** Usar placeholders dinámicos cuando usamos nuestros wrappers `query()` o `execute()`

### Lugares donde se corrigió:
1. `server/src/routes/mediosPago.js` - Línea ~141 (crear medio de pago)
2. `server/src/routes/mediosPago.js` - Línea ~263 (modificar medio de pago)

### Lugares que usan el patrón correcto (con `conn.query` de mysql2):
- `server/src/routes/liquidaciones.js` - Línea ~103 y ~241 (usa `conn.query` que acepta arrays directamente)
- `server/src/routes/permisos.js` - Línea ~98 (usa `conn.query` que acepta arrays directamente)

**Nota:** `conn.query()` de mysql2 SÍ acepta `VALUES ?` con arrays, pero `query()` y `execute()` de nuestro wrapper NO lo aceptan.

### Regla de oro:
**NUNCA usar `VALUES ?` con arrays de arrays. Siempre generar placeholders dinámicamente.**

---

## Otros errores comunes a evitar

### Error: ALTER TABLE con IF NOT EXISTS
MySQL no soporta `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` directamente.

**Solución:** Verificar primero con `INFORMATION_SCHEMA`:
```sql
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'tabla' 
AND COLUMN_NAME = 'columna';
```

---

## Checklist antes de hacer INSERT con múltiples valores:

- [ ] ¿Estoy insertando múltiples filas?
- [ ] ¿Estoy usando `VALUES ?` con un array?
- [ ] **SI** → Cambiar a placeholders dinámicos
- [ ] Verificar que el número de placeholders coincida con los valores
- [ ] Usar `flatMap()` para aplanar el array de valores

---

**Última actualización:** Después de corregir error en `mediosPago.js` (segunda vez)

