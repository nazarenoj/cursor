# 🔄 GUÍA DE ACTUALIZACIÓN A PRODUCCIÓN
## Sistema de Gestión de Socios - Club Social Realico
### Para aplicaciones ya instaladas y funcionando en IIS

---

## 📋 ÍNDICE

1. [Preparación Pre-Actualización](#preparación-pre-actualización)
2. [Backup de Seguridad](#backup-de-seguridad)
3. [Archivos a Actualizar](#archivos-a-actualizar)
4. [Proceso de Actualización](#proceso-de-actualización)
5. [Verificación Post-Actualización](#verificación-post-actualización)
6. [Rollback (Si es Necesario)](#rollback-si-es-necesario)
7. [Checklist de Actualización](#checklist-de-actualización)

> **Actualizar sin perder datos:** Si tu prioridad es no perder los datos ya cargados en la base de datos, sigue además la guía [ACTUALIZAR_PRODUCCION_SIN_PERDER_DATOS.md](ACTUALIZAR_PRODUCCION_SIN_PERDER_DATOS.md). El backend aplica las migraciones de schema (tablas nuevas, columnas nuevas) automáticamente al reiniciar, sin borrar datos.

---

## 🔍 PREPARACIÓN PRE-ACTUALIZACIÓN

### Paso 1: Identificar Versión Actual

Antes de actualizar, verificar qué versión está en producción:

```powershell
# Verificar fecha de última modificación de archivos clave
Get-ChildItem "C:\club-social-api\src\index.js" | Select-Object LastWriteTime
Get-ChildItem "C:\inetpub\wwwroot\club-social\index.html" | Select-Object LastWriteTime
```

### Paso 2: Verificar Estado Actual

```powershell
# Verificar que la aplicación está corriendo
pm2 status

# Verificar que IIS está funcionando
Get-Service W3SVC

# Verificar que el backend responde
curl http://localhost:4000/api/health
```

### Paso 3: Notificar a Usuarios (Opcional)

Si es posible, notificar a los usuarios sobre el mantenimiento programado.

---

## 💾 BACKUP DE SEGURIDAD

### Paso 1: Backup de Base de Datos

**Desde el servidor de producción:**

```powershell
# Crear backup manual de la base de datos
# Opción 1: Desde la aplicación (recomendado)
# Ir a la aplicación → Gestión de Backups → Ejecutar Backup Manual

# Opción 2: Desde línea de comandos
cd C:\Program Files\MySQL\MySQL Server 8.0\bin
.\mysqldump.exe -u root -p club_social > C:\backups\backup-pre-actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm').sql
```

### Paso 2: Backup de Archivos del Backend

```powershell
# Crear carpeta de backup
New-Item -ItemType Directory -Force -Path "C:\backups\actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm')"

# Copiar archivos del backend
Copy-Item -Path "C:\club-social-api\src" -Destination "C:\backups\actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm')\src" -Recurse
Copy-Item -Path "C:\club-social-api\package.json" -Destination "C:\backups\actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm')\package.json"
Copy-Item -Path "C:\club-social-api\ecosystem.config.js" -Destination "C:\backups\actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm')\ecosystem.config.js"
```

### Paso 3: Backup del Frontend

```powershell
# Copiar frontend actual
Copy-Item -Path "C:\inetpub\wwwroot\club-social" -Destination "C:\backups\actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm')\frontend" -Recurse
```

### Paso 4: Backup de Configuración

```powershell
# Copiar archivo .env (importante: contiene credenciales)
Copy-Item -Path "C:\club-social-api\.env" -Destination "C:\backups\actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm')\.env.backup"

# Copiar backup-config.json si existe
if (Test-Path "C:\club-social-api\backup-config.json") {
    Copy-Item -Path "C:\club-social-api\backup-config.json" -Destination "C:\backups\actualizacion-$(Get-Date -Format 'yyyy-MM-dd-HHmm')\backup-config.json"
}
```

---

## 📦 ARCHIVOS A ACTUALIZAR

### Ubicaciones en Desarrollo

**Desarrollo (tu máquina):**
```
C:\Users\jnazareno\Desktop\Cursor\
```

**Producción (servidor):**
```
Backend:  C:\club-social-api\
Frontend: C:\inetpub\wwwroot\club-social\
```

### Archivos del Backend a Actualizar

#### 1. Código Fuente (src/)
**Desde desarrollo:**
```
C:\Users\jnazareno\Desktop\Cursor\server\src\
```

**A producción:**
```
C:\club-social-api\src\
```

**Archivos específicos que pueden haber cambiado:**
- `src/index.js` - Punto de entrada del servidor
- `src/db.js` - Configuración de base de datos
- `src/middleware/` - Todos los middlewares
  - `auth.js`
  - `auditoria.js`
  - `permissions.js`
  - `upload.js`
- `src/routes/` - Todas las rutas
  - `auth.js`
  - `auditoria.js`
  - `backup.js`
  - `cajas.js`
  - `categorias.js`
  - `liquidaciones.js`
  - `mediosPago.js`
  - `permisos.js`
  - `socios.js`
  - `usuarios.js`
- `src/utils/` - Utilidades
  - `asyncHandler.js`
  - `backup.js` ⚠️ **Importante: cambios recientes en restauración**
  - `backupScheduler.js`
  - `format.js`

#### 2. Archivos de Configuración
**Desde desarrollo:**
```
C:\Users\jnazareno\Desktop\Cursor\server\package.json
C:\Users\jnazareno\Desktop\Cursor\server\ecosystem.config.js
C:\Users\jnazareno\Desktop\Cursor\server\backup-config.json (si existe)
```

**A producción:**
```
C:\club-social-api\package.json
C:\club-social-api\ecosystem.config.js
C:\club-social-api\backup-config.json
```

**⚠️ IMPORTANTE:** NO copiar `.env` - mantener el existente en producción

### Archivos del Frontend a Actualizar

#### 1. Frontend Compilado (dist/)
**Desde desarrollo:**
```
C:\Users\jnazareno\Desktop\Cursor\dist\
```

**A producción:**
```
C:\inetpub\wwwroot\club-social\
```

**Archivos a copiar:**
- `dist/index.html` → `C:\inetpub\wwwroot\club-social\index.html`
- `dist/assets/` → `C:\inetpub\wwwroot\club-social\assets\` (reemplazar todo)
- `dist/logo.svg` → `C:\inetpub\wwwroot\club-social\logo.svg` (si existe)

#### 2. Configuración IIS (si cambió)
**Desde desarrollo:**
```
C:\Users\jnazareno\Desktop\Cursor\web.config
```

**A producción:**
```
C:\inetpub\wwwroot\club-social\web.config
```

**⚠️ IMPORTANTE:** Solo actualizar si hubo cambios en la configuración de IIS

---

## 🔄 PROCESO DE ACTUALIZACIÓN

### Paso 1: Compilar Frontend en Desarrollo

**En tu máquina de desarrollo:**

```powershell
# Navegar al directorio del proyecto
cd C:\Users\jnazareno\Desktop\Cursor

# Verificar que estás en la rama correcta (si usas Git)
# git status

# Instalar dependencias si es necesario (solo si package.json cambió)
npm install

# Compilar frontend para producción
npm run build

# Verificar que la compilación fue exitosa
dir dist
```

**Verificar que se generaron los archivos:**
- ✅ `dist/index.html`
- ✅ `dist/assets/` (con archivos JS y CSS)

### Paso 2: Detener Servicios en Producción

**En el servidor de producción:**

```powershell
# Detener backend (PM2)
cd C:\club-social-api
pm2 stop club-social-api

# Verificar que se detuvo
pm2 status
```

**⚠️ NOTA:** IIS puede seguir corriendo, el frontend seguirá accesible pero sin funcionalidad de API.

### Paso 3: Actualizar Backend

**En el servidor de producción:**

#### 3.1. Copiar Archivos del Backend

```powershell
# Opción 1: Copiar desde red compartida o USB
# Copiar manualmente desde tu máquina de desarrollo:
# C:\Users\jnazareno\Desktop\Cursor\server\src\*
# A: C:\club-social-api\src\

# Opción 2: Si tienes acceso remoto, usar PowerShell remoto o SCP
```

**Archivos específicos a copiar:**
```powershell
# Copiar toda la carpeta src (reemplazar)
# Desde: C:\Users\jnazareno\Desktop\Cursor\server\src\
# A: C:\club-social-api\src\

# Copiar package.json (solo si cambió)
# Desde: C:\Users\jnazareno\Desktop\Cursor\server\package.json
# A: C:\club-social-api\package.json

# Copiar ecosystem.config.js (solo si cambió)
# Desde: C:\Users\jnazareno\Desktop\Cursor\server\ecosystem.config.js
# A: C:\club-social-api\ecosystem.config.js
```

#### 3.2. Actualizar Dependencias (Si package.json cambió)

```powershell
cd C:\club-social-api

# Verificar si hay nuevas dependencias
# Comparar package.json anterior con el nuevo

# Instalar nuevas dependencias
npm install --production

# Verificar instalación
npm list --depth=0
```

#### 3.3. Verificar Archivo .env

```powershell
# Asegurarse de que .env existe y tiene la configuración correcta
# NO reemplazar .env - mantener el existente
type C:\club-social-api\.env
```

### Paso 4: Actualizar Frontend

#### 4.0. Regenerar la carpeta dist (en tu máquina de desarrollo)

**Antes de copiar**, hay que compilar el frontend para generar una nueva `dist/`:

```powershell
cd C:\Users\jnazareno\Desktop\Cursor
npm run build
dir dist
```

Solo después de tener `dist/` actualizada se copia al servidor.

#### 4.1. Copiar Archivos del Frontend

**En el servidor de producción:**

```powershell
# Detener IIS (opcional, para evitar conflictos)
# iisreset /stop

# Copiar archivos compilados (de la dist que acabas de generar)
# Desde: C:\Users\jnazareno\Desktop\Cursor\dist\*
# A: C:\inetpub\wwwroot\club-social\

# Específicamente:
# - dist/index.html → C:\inetpub\wwwroot\club-social\index.html
# - dist/assets\* → C:\inetpub\wwwroot\club-social\assets\
```

**Comandos específicos (si copias desde red compartida):**
```powershell
# Copiar index.html
Copy-Item -Path "\\ruta-red\dist\index.html" -Destination "C:\inetpub\wwwroot\club-social\index.html" -Force

# Eliminar assets antiguos
Remove-Item -Path "C:\inetpub\wwwroot\club-social\assets\*" -Recurse -Force

# Copiar nuevos assets
Copy-Item -Path "\\ruta-red\dist\assets\*" -Destination "C:\inetpub\wwwroot\club-social\assets\" -Recurse -Force
```

#### 4.2. Actualizar web.config (Solo si cambió)

```powershell
# Solo si hubo cambios en la configuración de IIS
# Desde: C:\Users\jnazareno\Desktop\Cursor\web.config
# A: C:\inetpub\wwwroot\club-social\web.config
```

### Paso 5: Reiniciar Servicios

**En el servidor de producción:**

```powershell
# Reiniciar backend
cd C:\club-social-api
pm2 restart club-social-api

# Verificar que inició correctamente
pm2 status
pm2 logs club-social-api --lines 50

# Reiniciar IIS (si lo detuviste)
# iisreset /start

# O simplemente recargar
iisreset
```

**Base de datos:** Al reiniciar, el backend ejecuta `initDb()` y aplica de forma automática las migraciones (tablas `localidades`, `whatsapp_templates`, columna `codigo_postal` en `socios`, permisos nuevos) **sin borrar datos**. No hace falta ejecutar scripts SQL a mano. Ver [ACTUALIZAR_PRODUCCION_SIN_PERDER_DATOS.md](ACTUALIZAR_PRODUCCION_SIN_PERDER_DATOS.md).

---

## ✅ VERIFICACIÓN POST-ACTUALIZACIÓN

### Paso 1: Verificar Backend

```powershell
# Verificar que PM2 está corriendo
pm2 status

# Verificar que el puerto 4000 está en uso
netstat -ano | findstr :4000

# Probar endpoint de health
curl http://localhost:4000/api/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-07T..."
}
```

### Paso 2: Verificar Frontend

1. Abrir navegador en: `http://servidor-produccion/`
2. Verificar que la página carga sin errores
3. Abrir consola del navegador (F12) y verificar que no hay errores

### Paso 3: Probar Funcionalidades Clave

#### 3.1. Login
- [ ] Abrir aplicación
- [ ] Hacer login con credenciales válidas
- [ ] Verificar que se redirige al dashboard

#### 3.2. Funcionalidades Principales
- [ ] Ver lista de socios
- [ ] Crear/editar socio
- [ ] Ver liquidaciones
- [ ] Registrar pago
- [ ] Ver auditoría
- [ ] Exportar a PDF (socios, liquidaciones, etc.)

#### 3.3. Funcionalidades de Backup (Cambios Recientes)
- [ ] Ver lista de backups
- [ ] Crear backup manual
- [ ] Restaurar backup ⚠️ **Probar especialmente - cambios recientes**
- [ ] Eliminar backup
- [ ] Verificar que no aparece "Failed to fetch" al restaurar

#### 3.4. Auditoría (Cambios Recientes)
- [ ] Verificar que se registran eliminaciones de cajas
- [ ] Verificar que se registran eliminaciones de medios de pago
- [ ] Verificar que las descripciones incluyen nombres correctamente

### Paso 4: Verificar Logs

```powershell
# Ver logs del backend
pm2 logs club-social-api --lines 100

# Buscar errores
pm2 logs club-social-api --err

# Ver logs de IIS (si hay problemas)
# Event Viewer → Windows Logs → Application
```

**Buscar:**
- ✅ "Server running on port 4000"
- ✅ "Database connected"
- ❌ Errores de conexión
- ❌ Errores de módulos no encontrados
- ❌ Errores de rutas

### Paso 5: Verificar Base de Datos

```powershell
# Conectar a MySQL y verificar que las tablas existen
mysql -u root -p club_social

# En MySQL:
SHOW TABLES;
SELECT COUNT(*) FROM socios;
SELECT COUNT(*) FROM usuarios;
```

---

## 🔙 ROLLBACK (SI ES NECESARIO)

Si algo sale mal, seguir estos pasos para revertir:

### Paso 1: Detener Servicios

```powershell
pm2 stop club-social-api
iisreset /stop
```

### Paso 2: Restaurar Backend

```powershell
# Restaurar desde backup
$backupFolder = "C:\backups\actualizacion-YYYY-MM-DD-HHmm"  # Usar la carpeta de backup creada

# Restaurar src
Remove-Item -Path "C:\club-social-api\src" -Recurse -Force
Copy-Item -Path "$backupFolder\src" -Destination "C:\club-social-api\src" -Recurse

# Restaurar package.json
Copy-Item -Path "$backupFolder\package.json" -Destination "C:\club-social-api\package.json" -Force

# Restaurar ecosystem.config.js
Copy-Item -Path "$backupFolder\ecosystem.config.js" -Destination "C:\club-social-api\ecosystem.config.js" -Force
```

### Paso 3: Restaurar Frontend

```powershell
# Restaurar frontend
Remove-Item -Path "C:\inetpub\wwwroot\club-social\*" -Recurse -Force
Copy-Item -Path "$backupFolder\frontend\*" -Destination "C:\inetpub\wwwroot\club-social\" -Recurse
```

### Paso 4: Restaurar Base de Datos (Si es Necesario)

```powershell
# Restaurar desde backup SQL
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
.\mysql.exe -u root -p club_social < C:\backups\backup-pre-actualizacion-YYYY-MM-DD-HHmm.sql
```

### Paso 5: Reiniciar Servicios

```powershell
cd C:\club-social-api
pm2 restart club-social-api
iisreset /start
```

---

## 📋 CHECKLIST DE ACTUALIZACIÓN

### Pre-Actualización
- [ ] Backup de base de datos creado
- [ ] Backup de archivos del backend creado
- [ ] Backup del frontend creado
- [ ] Backup de configuración (.env) creado
- [ ] Estado actual de la aplicación verificado
- [ ] Frontend compilado en desarrollo

### Actualización Backend
- [ ] Backend detenido (PM2 stop)
- [ ] Archivos src/ copiados
- [ ] package.json actualizado (si cambió)
- [ ] ecosystem.config.js actualizado (si cambió)
- [ ] Dependencias instaladas (si package.json cambió)
- [ ] .env verificado (NO reemplazado)

### Actualización Frontend
- [ ] dist regenerada en desarrollo (`npm run build`) antes de copiar
- [ ] IIS detenido o en modo mantenimiento (opcional)
- [ ] index.html copiado
- [ ] assets/ reemplazado completamente
- [ ] web.config actualizado (solo si cambió)

### Post-Actualización
- [ ] Backend reiniciado (PM2 restart)
- [ ] IIS reiniciado
- [ ] Health check del backend exitoso
- [ ] Frontend carga sin errores
- [ ] Login funciona
- [ ] Funcionalidades principales probadas
- [ ] Backup/restore probado (especialmente restauración)
- [ ] Auditoría verificada (eliminaciones)
- [ ] Logs sin errores críticos

---

## 🎯 CAMBIOS RECIENTES IMPORTANTES

### Última Actualización (2025-01-07)

#### 1. Sistema de Backup y Restauración
- ✅ **Mejora:** Restauración ahora envía respuesta inmediata y ejecuta en segundo plano
- ✅ **Fix:** Eliminado error "Failed to fetch" al restaurar backups
- ✅ **Mejora:** Mejor manejo de conexiones HTTP durante restauración
- 📁 **Archivos modificados:**
  - `server/src/routes/backup.js`
  - `server/src/utils/backup.js`

#### 2. Sistema de Auditoría
- ✅ **Nuevo:** Auditoría para eliminación de cajas
- ✅ **Nuevo:** Auditoría para eliminación de medios de pago
- ✅ **Mejora:** Descripciones mejoradas con nombres de elementos eliminados
- ✅ **Fix:** Interceptación de respuestas 204 (No Content) para auditoría
- 📁 **Archivos modificados:**
  - `server/src/routes/cajas.js`
  - `server/src/routes/mediosPago.js`
  - `server/src/middleware/auditoria.js`

#### 3. Frontend
- ✅ **Mejora:** Mejor manejo de respuestas de restauración de backup
- ✅ **Mejora:** Timeout eliminado del frontend para operaciones de backup
- 📁 **Archivos modificados:**
  - `src/services/api.ts`
  - `src/components/ListaBackups.tsx`

---

## 📝 NOTAS IMPORTANTES

### ⚠️ ADVERTENCIAS

1. **NO reemplazar .env** - Mantener el archivo existente en producción
2. **Verificar backups** - Siempre crear backup antes de actualizar
3. **Probar restauración** - Especialmente importante después de esta actualización
4. **Verificar permisos** - Asegurarse de que las carpetas tienen permisos correctos
5. **Horario de actualización** - Preferible hacerlo en horario de bajo uso

### 💡 TIPS

- Mantener un registro de actualizaciones con fechas
- Probar en un entorno de staging si es posible
- Tener un plan de rollback listo antes de actualizar
- Comunicar a los usuarios sobre mantenimiento programado

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "Cannot find module"
**Solución:**
```powershell
cd C:\club-social-api
npm install --production
pm2 restart club-social-api
```

### Error: "Failed to fetch" al restaurar backup
**Solución:** Verificar que se actualizaron los archivos:
- `server/src/routes/backup.js`
- `server/src/utils/backup.js`
- Reiniciar backend: `pm2 restart club-social-api`

### Frontend no carga después de actualizar
**Solución:**
```powershell
# Verificar que los archivos están en la ruta correcta
dir C:\inetpub\wwwroot\club-social\

# Verificar permisos
icacls C:\inetpub\wwwroot\club-social

# Reiniciar IIS
iisreset
```

### Backend no inicia
**Solución:**
```powershell
# Ver logs detallados
pm2 logs club-social-api --err

# Verificar .env
type C:\club-social-api\.env

# Verificar que MySQL está corriendo
Get-Service MySQL*
```

---

## 📞 SOPORTE

Si encuentras problemas durante la actualización:

1. **Revisar logs:**
   ```powershell
   pm2 logs club-social-api --lines 200
   ```

2. **Verificar backups:**
   - Asegurarse de que los backups se crearon correctamente
   - Ubicación: `C:\backups\actualizacion-YYYY-MM-DD-HHmm\`

3. **Rollback:**
   - Seguir la sección de Rollback si es necesario

---

## 📅 REGISTRO DE ACTUALIZACIONES

**Fecha:** _______________  
**Versión:** _______________  
**Actualizado por:** _______________  
**Resultado:** ☐ Exitoso  ☐ Con problemas  ☐ Rollback necesario  
**Notas:**  
_________________________________________________  
_________________________________________________  

---

**¡Actualización completada! 🎉**
