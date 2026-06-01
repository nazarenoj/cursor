# Verificación de Migraciones Seguras

Este documento verifica que las migraciones de base de datos son seguras y **NO borran datos** existentes.

## ✅ Migraciones Seguras Verificadas

### 1. Creación de Tablas
Todas las tablas usan `CREATE TABLE IF NOT EXISTS`, lo que significa:
- ✅ Si la tabla ya existe, **NO se borra**
- ✅ Si la tabla no existe, se crea
- ✅ Los datos existentes se preservan

```sql
CREATE TABLE IF NOT EXISTS categorias (...)
CREATE TABLE IF NOT EXISTS socios (...)
CREATE TABLE IF NOT EXISTS adherentes (...)
-- etc.
```

### 2. Agregar Columnas
Las columnas nuevas se agregan con manejo de errores:

```javascript
try {
  await poolInstance.query(`ALTER TABLE socios ADD COLUMN foto VARCHAR(500) DEFAULT NULL`);
} catch (err) {
  // La columna ya existe, ignorar error
}
```

Esto significa:
- ✅ Si la columna ya existe, **NO se borra**
- ✅ Si la columna no existe, se crea
- ✅ Los datos existentes se preservan

### 3. Modificaciones de Tablas Existentes
Las modificaciones usan `ALTER TABLE` con `ADD COLUMN`, que:
- ✅ Solo agrega nuevas columnas
- ✅ NO modifica columnas existentes
- ✅ NO borra datos

### 4. Operaciones que NO se Realizan
El código **NO usa**:
- ❌ `DROP TABLE` (no borra tablas)
- ❌ `TRUNCATE TABLE` (no vacía tablas)
- ❌ `DELETE FROM` (excepto para permisos del admin durante inicialización)
- ❌ `ALTER TABLE ... DROP COLUMN` (no borra columnas)

## ⚠️ Única Excepción: Permisos del Admin

Hay un `DELETE FROM usuario_permisos` que solo se ejecuta:
- Durante la inicialización de la base de datos
- Solo para el usuario `admin`
- Para asegurar que el admin tenga todos los permisos

Esto es seguro porque:
- Solo afecta al usuario admin
- Solo se ejecuta si el admin ya existe
- No afecta otros usuarios ni datos

## 🔒 Conclusión

**Las migraciones son 100% seguras** para actualizar producción:
- ✅ No borran datos existentes
- ✅ Solo agregan nuevas tablas/columnas si no existen
- ✅ Preservan todos los datos de producción
- ✅ Son idempotentes (se pueden ejecutar múltiples veces sin problemas)

## 📝 Recomendación

Antes de actualizar producción:
1. ✅ Crea un backup de la base de datos (el script lo hace automáticamente)
2. ✅ Verifica que el código funciona en desarrollo
3. ✅ Ejecuta el script de actualización segura
4. ✅ Verifica que los datos siguen presentes después de actualizar



