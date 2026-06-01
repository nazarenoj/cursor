# Actualizar producción sin perder datos

Esta guía asegura que al actualizar el servidor de producción **no se pierdan los datos** ya cargados en la base de datos (socios, liquidaciones, usuarios, cajas, etc.).

---

## Por qué es seguro

- El backend **no borra ni reemplaza** tablas con datos. Al iniciar ejecuta `initDb()`, que:
  - Crea **solo** tablas nuevas si no existen: `localidades`, `whatsapp_templates`.
  - Añade la columna `codigo_postal` a `socios` solo si aún no existe.
  - Inserta permisos nuevos (p. ej. plantillas WhatsApp) si no están.
- No se usa `DROP TABLE` ni `TRUNCATE` sobre tablas con datos de negocio.

---

## Pasos recomendados

### 1. Backup de la base de datos (obligatorio)

En el servidor de producción:

```powershell
# Opción A: Desde la aplicación
# Ir a Gestión de Backups → Ejecutar backup manual

# Opción B: Línea de comandos
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
.\mysqldump.exe -u root -p club_social > C:\backups\backup-antes-actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm').sql
```

Guarda el archivo en un lugar seguro. Si algo falla, puedes restaurar con:

```powershell
.\mysql.exe -u root -p club_social < C:\backups\backup-antes-actualizacion-YYYY-MM-DD-HHmm.sql
```

### 2. Backup de archivos (recomendado)

Sigue la sección **BACKUP DE SEGURIDAD** de [GUIA_ACTUALIZACION_PRODUCCION.md](GUIA_ACTUALIZACION_PRODUCCION.md): backend (`src`, `package.json`, `ecosystem.config.js`), frontend y `.env` (copia, no reemplazar en producción).

### 3. Actualizar backend

1. Copiar los archivos actualizados de `server/src` (y si cambió, `package.json`, `ecosystem.config.js`) a `C:\club-social-api\` en el servidor.
2. **No reemplazar** el archivo `.env` de producción.
3. Si cambió `package.json`:  
   `cd C:\club-social-api` y ejecutar `npm install --production`.
4. Reiniciar el backend:  
   `pm2 restart club-social-api`.

Al arrancar, el servidor ejecutará `initDb()` y aplicará de forma automática:

- Tabla `localidades` (si no existe).
- Tabla `whatsapp_templates` (si no existe).
- Columna `codigo_postal` en `socios` (si no existe).
- Nuevos permisos (p. ej. `whatsapp_templates.*`).

**No hace falta ejecutar ningún script SQL a mano** para esta migración; el código ya lo hace sin tocar datos existentes.

### 4. Actualizar frontend

1. En tu máquina de desarrollo: `npm run build`.
2. Copiar el contenido de `dist/` a `C:\inetpub\wwwroot\club-social\` en el servidor (reemplazar archivos).
3. Si cambió la configuración de IIS, actualizar `web.config`.
4. Reiniciar IIS si lo detuviste: `iisreset`.

### 5. Verificación

- Backend: `curl http://localhost:4000/api/health`
- Login en la aplicación y revisar: socios, liquidaciones, localidades, plantillas WhatsApp.
- Comprobar que los datos anteriores siguen (socios, usuarios, liquidaciones, etc.).

---

## Migración SQL manual (opcional)

Si prefieres aplicar solo el cambio de base de datos **antes** de actualizar el código, puedes ejecutar el script:

- `migracion-localidades-whatsapp.sql`

En MySQL (en el servidor):

```powershell
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
.\mysql.exe -u root -p club_social < ruta\a\migracion-localidades-whatsapp.sql
```

- Si la columna `codigo_postal` ya existe en `socios`, aparecerá un error "Duplicate column name"; puedes ignorarlo.
- Las sentencias `CREATE TABLE IF NOT EXISTS` son seguras: no borran datos.

Luego puedes actualizar backend y frontend como en los pasos 3 y 4.

---

## Resumen

| Acción                         | ¿Afecta datos existentes? |
|--------------------------------|----------------------------|
| Backup BD                      | No                         |
| Copiar nuevo backend y reiniciar | No (solo añade tablas/columnas/permisos) |
| Ejecutar `migracion-localidades-whatsapp.sql` | No (solo ADD COLUMN y CREATE TABLE IF NOT EXISTS) |
| Copiar nuevo frontend         | No                         |

Siempre hacer **backup de la base de datos** antes de actualizar. Con eso y siguiendo estos pasos, la actualización en producción se hace sin perder los datos ya cargados.
