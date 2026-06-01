# 📋 Guía Paso a Paso: Actualización Automática en Producción

Esta guía te llevará paso a paso para actualizar el backend en producción y corregir el error de `tipoMovimiento`.

## 🎯 Objetivo

Actualizar el archivo `server/src/routes/mediosPago.js` en producción para corregir el error "tipoMovimiento is not defined".

---

## 📦 Preparación (En tu máquina de desarrollo)

### Paso 1: Verificar que el código está corregido

1. Abre el archivo `server/src/routes/mediosPago.js`
2. Verifica que en las líneas 71 y 129 aparezca `tipoMovimiento` en la desestructuración:
   ```javascript
   const { nombre, descripcion, cajaId, tipoMovimiento, activo } = req.body || {};
   ```
3. Si no está, el código ya fue corregido automáticamente.

### Paso 2: Preparar los archivos para copiar

Asegúrate de tener acceso a:
- ✅ La carpeta `server/` completa (con el código corregido)
- ✅ Opcional: La carpeta `dist/` del frontend compilado (si también quieres actualizar el frontend)

---

## 🚀 Actualización en el Servidor de Producción

### Paso 1: Conectar al servidor

1. **Accede al servidor de producción** (local o remoto)
2. **Abre PowerShell como Administrador**:
   - Clic derecho en PowerShell
   - Selecciona "Ejecutar como administrador"
   - Confirma el UAC si aparece

### Paso 2: Navegar a la carpeta del proyecto

```powershell
cd C:\Users\jnazareno\Desktop\Cursor
```

**Nota:** Si el script está en otra ubicación, navega a esa carpeta.

### Paso 3: Copiar archivos al servidor (si es necesario)

Si estás trabajando desde otra máquina, primero copia la carpeta `server/` al servidor:

**Opción A: USB/Red**
- Copia la carpeta `server/` completa al servidor
- Anota la ruta donde la copias (ej: `C:\Temp\server` o `D:\Actualizacion\server`)

**Opción B: Si ya está en el servidor**
- Si el código ya está en el servidor, anota la ruta completa

### Paso 4: Ejecutar el script de actualización

```powershell
.\actualizar-produccion-seguro.ps1
```

### Paso 5: Seguir las instrucciones del script

El script te pedirá información paso a paso:

#### 5.1: Ruta del Frontend (Puedes omitir)
```
Ingresa la ruta de la carpeta 'dist' del frontend compilado:
```
- **Si solo quieres actualizar el backend:** Presiona `Enter` (dejar vacío)
- **Si también quieres actualizar el frontend:** Ingresa la ruta completa, ejemplo:
  ```
  C:\Temp\dist
  ```
  o
  ```
  D:\Actualizacion\dist
  ```

#### 5.2: Ruta del Backend (OBLIGATORIO para este fix)
```
Ingresa la ruta de la carpeta 'server' del backend (Enter para omitir):
```
- **Ingresa la ruta completa** donde está tu carpeta `server/` con el código corregido, ejemplo:
  ```
  C:\Users\jnazareno\Desktop\Cursor\server
  ```
  o si la copiaste a otra ubicación:
  ```
  C:\Temp\server
  ```
  o
  ```
  D:\Actualizacion\server
  ```

#### 5.3: Confirmación
```
Estas seguro de continuar con la actualizacion?
Escribe 'SI' para continuar:
```
- Escribe exactamente: `SI` (en mayúsculas)
- Presiona `Enter`

---

## ⚙️ Lo que hace el script automáticamente

El script ejecutará estos pasos en orden:

### 🔄 PASO 1: Backup de Base de Datos
- Lee la configuración de `.env` de producción
- Crea un backup automático de la base de datos
- Guarda el backup en: `C:\Backups\ClubSocial\backup_YYYYMMDD_HHMMSS.sql`
- ⏱️ Tiempo: 10-30 segundos

### 💾 PASO 2: Backup de Archivos
- Crea una copia de seguridad del frontend actual
- Crea una copia de seguridad del backend actual
- Guarda los backups en:
  - Frontend: `C:\inetpub\wwwroot\ClubSocial_backup_YYYYMMDD_HHMMSS`
  - Backend: `C:\ClubSocial\server_backup_YYYYMMDD_HHMMSS`
- ⏱️ Tiempo: 1-2 minutos

### 🌐 PASO 3: Actualizar Frontend (si proporcionaste ruta)
- Detiene el sitio IIS temporalmente
- Copia los archivos nuevos del frontend
- Reinicia el sitio IIS
- ⏱️ Tiempo: 30 segundos

### 🔧 PASO 4: Actualizar Backend (LO IMPORTANTE PARA ESTE FIX)
- **Copia la carpeta `src/` completa** (incluye el archivo corregido)
- **NO toca** el archivo `.env` (mantiene tu configuración)
- **NO toca** la carpeta `uploads/` (mantiene tus archivos)
- Verifica dependencias en `package.json`
- Instala nuevas dependencias si es necesario
- **Reinicia PM2** automáticamente
- ⏱️ Tiempo: 1-2 minutos

### ✅ PASO 5: Verificación
- Verifica que el sitio IIS esté corriendo
- Verifica que el backend responda correctamente
- Muestra el estado de PM2

---

## 📊 Ejemplo de Salida del Script

```
========================================
  ACTUALIZACIÓN SEGURA DE PRODUCCIÓN
========================================

Este script actualizara SOLO el codigo.
NO se modificaran ni borraran datos existentes.
NO se copiaran datos de desarrollo.

Sitio IIS detectado: ClubSocial
Ingresa la ruta de la carpeta 'dist' del frontend compilado: [Enter]
Ingresa la ruta de la carpeta 'server' del backend (Enter para omitir): C:\Users\jnazareno\Desktop\Cursor\server

Configuración:
  Frontend: 
  Backend: C:\Users\jnazareno\Desktop\Cursor\server
  Sitio IIS: ClubSocial
  Ruta sitio: C:\inetpub\wwwroot\ClubSocial

Estas seguro de continuar con la actualizacion?
Escribe 'SI' para continuar: SI

=== PASO 1: BACKUP DE BASE DE DATOS ===
Creando backup de la base de datos...
Backup de base de datos creado: C:\Backups\ClubSocial\backup_club_social_20250120_143022.sql

=== PASO 2: BACKUP DE ARCHIVOS ===
Creando backup de la version actual...
Backup creado en: C:\inetpub\wwwroot\ClubSocial_backup_20250120_143025
Backup del backend creado en: C:\ClubSocial\server_backup_20250120_143025

=== PASO 4: ACTUALIZAR BACKEND (SOLO CODIGO) ===
IMPORTANTE: Solo se actualizara el codigo fuente
NO se tocara el archivo .env (mantiene configuracion de produccion)
NO se copiaran datos de desarrollo

Copiando codigo fuente del backend...
  Codigo fuente (src/) actualizado
  package.json sin cambios
  ecosystem.config.js actualizado
  .env de produccion preservado (NO se copio desde desarrollo)
  Archivos uploads/ de produccion preservados
Verificando dependencias...
  Dependencias verificadas
Reiniciando backend con PM2...
Backend actualizado y reiniciado

Estado de PM2:
┌─────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name        │ status  │ restart │ uptime   │
├─────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ clubsocial  │ online  │ 5       │ 2m       │
└─────┴─────────────┴─────────┴─────────┴──────────┘

=== PASO 5: VERIFICACIÓN ===
Sitio IIS: Corriendo
Verificando backend...
Backend: Respondiendo correctamente

========================================
  ACTUALIZACIÓN COMPLETADA
========================================

RESUMEN:
  Codigo actualizado
  Datos de produccion preservados
  Configuracion de produccion preservada (.env)
  Archivos de produccion preservados (uploads/)

Proximos pasos:
1. Abre el navegador: http://tu-servidor
2. Presiona Ctrl+F5 para forzar recarga sin cache
3. Verifica que la nueva version carga correctamente
4. Prueba las funcionalidades nuevas
5. Verifica que los datos existentes siguen presentes
```

---

## ✅ Verificación Post-Actualización

### 1. Verificar que el backend está corriendo

```powershell
pm2 list
```

Deberías ver el proceso `clubsocial` con estado `online`.

### 2. Probar la funcionalidad corregida

1. **Abre el navegador** y accede a tu aplicación
2. **Presiona Ctrl+F5** para limpiar la caché
3. **Intenta agregar un medio de pago:**
   - Ve a la sección de Medios de Pago
   - Haz clic en "Agregar Medio de Pago"
   - Completa el formulario
   - Selecciona un tipo de movimiento
   - Guarda

4. **Verifica que NO aparezca el error:**
   - ❌ Antes: "tipoMovimiento is not defined"
   - ✅ Ahora: Debe guardar correctamente

### 3. Verificar logs si hay problemas

```powershell
pm2 logs clubsocial
```

Presiona `Ctrl+C` para salir de los logs.

---

## 🚨 Solución de Problemas

### Error: "Este script debe ejecutarse como Administrador"
**Solución:** 
- Cierra PowerShell
- Clic derecho → "Ejecutar como administrador"
- Vuelve a ejecutar el script

### Error: "No se encuentra la carpeta del backend"
**Solución:**
- Verifica que la ruta sea correcta
- Usa rutas absolutas: `C:\ruta\completa\server`
- Verifica que la carpeta `server` exista en esa ubicación

### Error: "PM2 no está instalado"
**Solución:**
```powershell
npm install -g pm2
pm2 startup
```

### El backend no responde después de actualizar
**Solución:**
```powershell
cd C:\ClubSocial\server
pm2 restart ecosystem.config.js
pm2 logs
```

### Error persiste después de actualizar
**Solución:**
1. Verifica que el archivo se copió correctamente:
   ```powershell
   Get-Content C:\ClubSocial\server\src\routes\mediosPago.js | Select-String "tipoMovimiento"
   ```
   Deberías ver `tipoMovimiento` en las líneas 71 y 129.

2. Si no está, copia manualmente el archivo:
   ```powershell
   Copy-Item "C:\ruta\desarrollo\server\src\routes\mediosPago.js" -Destination "C:\ClubSocial\server\src\routes\mediosPago.js" -Force
   pm2 restart ecosystem.config.js
   ```

---

## 🔄 Restaurar desde Backup (si algo sale mal)

### Restaurar Backend:
```powershell
# Detener PM2
pm2 stop clubsocial

# Restaurar carpeta
Remove-Item C:\ClubSocial\server -Recurse -Force
Copy-Item "C:\ClubSocial\server_backup_YYYYMMDD_HHMMSS" -Destination "C:\ClubSocial\server" -Recurse

# Reiniciar
cd C:\ClubSocial\server
pm2 restart ecosystem.config.js
```

### Restaurar Base de Datos:
```powershell
mysql -u root -p club_social < C:\Backups\ClubSocial\backup_club_social_YYYYMMDD_HHMMSS.sql
```

---

## 📝 Checklist Final

Antes de empezar:
- [ ] Código corregido verificado en desarrollo
- [ ] Acceso al servidor de producción
- [ ] Permisos de Administrador
- [ ] Carpeta `server/` disponible en el servidor

Durante la actualización:
- [ ] Script ejecutado como Administrador
- [ ] Ruta del backend ingresada correctamente
- [ ] Confirmación escrita: `SI`

Después de actualizar:
- [ ] Backend responde correctamente (`pm2 list`)
- [ ] Error "tipoMovimiento is not defined" desapareció
- [ ] Puedo agregar medios de pago sin errores
- [ ] Datos existentes siguen presentes

---

## 🎉 ¡Listo!

Una vez completados estos pasos, el error debería estar corregido y podrás agregar medios de pago sin problemas.

Si encuentras algún problema, revisa los logs con `pm2 logs` y verifica que el archivo se copió correctamente.

