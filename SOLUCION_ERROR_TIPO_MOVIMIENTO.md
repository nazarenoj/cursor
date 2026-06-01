# 🔧 Solución: Error "Unknown column 'tipo_movimiento' in 'field list'"

Este error ocurre porque la columna `tipo_movimiento` no existe en la tabla `medios_pago` de tu base de datos de producción.

## 🎯 Solución Rápida (Recomendada)

### Opción 1: Ejecutar Script SQL Directo

1. **Abre MySQL** (puedes usar MySQL Workbench, phpMyAdmin, o la línea de comandos)

2. **Conéctate a tu base de datos de producción:**
   ```sql
   USE club_social;
   ```

3. **Ejecuta el script SQL:**
   - Abre el archivo `agregar-columna-tipo-movimiento.sql`
   - Copia y pega todo el contenido en tu cliente MySQL
   - Ejecuta el script

   O ejecuta directamente este comando:
   ```sql
   ALTER TABLE medios_pago 
   ADD COLUMN tipo_movimiento ENUM('ingreso', 'egreso', 'ambos') NOT NULL DEFAULT 'ambos';
   ```

4. **Verifica que se agregó correctamente:**
   ```sql
   DESCRIBE medios_pago;
   ```
   Deberías ver la columna `tipo_movimiento` en la lista.

5. **Reinicia el backend:**
   ```powershell
   cd C:\ClubSocial\server
   pm2 restart ecosystem.config.js
   ```

### Opción 2: Reiniciar el Backend (Migración Automática)

El código ya tiene la migración corregida. Si reinicias el backend, debería agregar la columna automáticamente:

1. **Reinicia PM2:**
   ```powershell
   cd C:\ClubSocial\server
   pm2 restart ecosystem.config.js
   ```

2. **Verifica los logs:**
   ```powershell
   pm2 logs clubsocial
   ```
   Deberías ver un mensaje: "Columna tipo_movimiento agregada a medios_pago"

3. **Si no aparece el mensaje**, ejecuta el script SQL de la Opción 1.

---

## 📋 Pasos Detallados

### Paso 1: Verificar si la columna existe

```sql
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'club_social'
AND TABLE_NAME = 'medios_pago' 
AND COLUMN_NAME = 'tipo_movimiento';
```

Si no devuelve resultados, la columna no existe y necesitas agregarla.

### Paso 2: Agregar la columna

```sql
ALTER TABLE medios_pago 
ADD COLUMN tipo_movimiento ENUM('ingreso', 'egreso', 'ambos') NOT NULL DEFAULT 'ambos';
```

### Paso 3: Actualizar registros existentes (opcional)

Si ya tienes medios de pago registrados, puedes actualizarlos:

```sql
-- Ver medios de pago actuales
SELECT id, nombre, tipo_movimiento FROM medios_pago;

-- Todos los existentes tendrán 'ambos' por defecto
-- Si quieres cambiar alguno específico:
-- UPDATE medios_pago SET tipo_movimiento = 'ingreso' WHERE id = 1;
```

### Paso 4: Reiniciar el backend

```powershell
cd C:\ClubSocial\server
pm2 restart ecosystem.config.js
pm2 logs clubsocial
```

---

## ✅ Verificación

Después de ejecutar la solución:

1. **Verifica la columna en la base de datos:**
   ```sql
   DESCRIBE medios_pago;
   ```

2. **Prueba agregar un medio de pago:**
   - Abre la aplicación
   - Ve a Medios de Pago
   - Intenta agregar uno nuevo
   - El error debería desaparecer

3. **Verifica los logs del backend:**
   ```powershell
   pm2 logs clubsocial
   ```
   No debería haber errores relacionados con `tipo_movimiento`.

---

## 🚨 Si el Error Persiste

### Verificar que el archivo se actualizó correctamente

```powershell
# Verificar que el código tiene la corrección
Get-Content C:\ClubSocial\server\src\routes\mediosPago.js | Select-String "tipoMovimiento"
```

Deberías ver `tipoMovimiento` en las líneas donde se desestructura `req.body`.

### Verificar que la columna existe

```sql
SHOW COLUMNS FROM medios_pago LIKE 'tipo_movimiento';
```

Debería mostrar la columna con sus características.

### Revisar logs detallados

```powershell
pm2 logs clubsocial --lines 50
```

Busca errores relacionados con `tipo_movimiento` o `medios_pago`.

---

## 📝 Notas Importantes

- ✅ La columna se crea con valor por defecto `'ambos'`
- ✅ Los medios de pago existentes automáticamente tendrán `'ambos'`
- ✅ No se perderán datos al agregar la columna
- ✅ El código del backend ya está corregido

---

## 🔄 Si Necesitas Revertir

Si por alguna razón necesitas eliminar la columna (no recomendado):

```sql
ALTER TABLE medios_pago DROP COLUMN tipo_movimiento;
```

Pero esto causará que el código falle, así que solo hazlo si es absolutamente necesario.

