# Guía Completa: Pasar la Aplicación a Producción

Esta guía te llevará paso a paso para desplegar la aplicación del Club Social en un servidor de producción.

## 📋 Requisitos Previos

### En el Servidor:
- ✅ Windows Server con IIS instalado
- ✅ Node.js 18+ instalado
- ✅ MySQL Server instalado y configurado
- ✅ Application Request Routing (ARR) 3.0 para IIS
- ✅ URL Rewrite Module 2.1 para IIS

### En tu Máquina de Desarrollo:
- ✅ Git instalado (opcional, para transferir archivos)
- ✅ Acceso al servidor (RDP, FTP, o red compartida)

---

## 🚀 Paso 1: Preparar el Frontend (En tu máquina de desarrollo)

### 1.1 Configurar la URL de la API

**IMPORTANTE:** Antes de compilar, configura la variable de entorno para que el frontend use el proxy de IIS.

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=/api
```

Esto hará que el frontend use `/api` como ruta base, que será redirigida por IIS al backend.

### 1.2 Compilar el Frontend

```bash
npm run build
```

Esto creará la carpeta `dist` con todos los archivos estáticos listos para producción.

**Verifica que se creó la carpeta `dist` con los archivos compilados.**

---

## 🗄️ Paso 2: Preparar la Base de Datos

### 2.1 Verificar MySQL

En el servidor, verifica que MySQL esté corriendo:

```powershell
# Verificar servicio MySQL
Get-Service | Where-Object {$_.Name -like "*mysql*"}
```

### 2.2 Crear la Base de Datos (si no existe)

Conecta a MySQL y crea la base de datos:

```sql
CREATE DATABASE IF NOT EXISTS club_social 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_spanish_ci;
```

**Nota:** El backend creará las tablas automáticamente la primera vez que se ejecute.

---

## 🔧 Paso 3: Preparar el Backend (En el servidor)

### 3.1 Copiar la carpeta `server` al servidor

Copia toda la carpeta `server` al servidor, por ejemplo en:
```
C:\ClubSocial\server
```

### 3.2 Instalar Node.js (si no está instalado)

```powershell
# Verificar si Node.js está instalado
where.exe node

# Si no aparece nada, descarga e instala desde:
# https://nodejs.org/
# Durante la instalación, asegúrate de marcar "Add to PATH"
```

**Si PowerShell no reconoce `npm`, ver:** `SOLUCION_NPM_NO_RECONOCIDO.md`

### 3.3 Instalar dependencias del backend

```powershell
cd C:\ClubSocial\server
npm install --production
```

### 3.4 Configurar variables de entorno

Crea el archivo `server/.env` con el siguiente contenido:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=GL2025
DB_NAME=club_social
CORS_ORIGIN=*
JWT_SECRET=tu_clave_secreta_muy_segura_aqui_cambiala
```

**⚠️ IMPORTANTE:** 
- Cambia `JWT_SECRET` por una clave secreta segura (mínimo 32 caracteres)
- Cambia `DB_PASSWORD` si tu contraseña de MySQL es diferente
- Si el backend estará en otro servidor, cambia `DB_HOST`

### 3.5 Verificar que el backend funciona

```powershell
cd C:\ClubSocial\server
node src/index.js
```

Deberías ver: `Servidor API escuchando en http://localhost:4000`

Presiona `Ctrl+C` para detenerlo.

---

## 📦 Paso 4: Instalar y Configurar PM2 (En el servidor)

PM2 mantendrá el backend corriendo y lo reiniciará automáticamente si se cae.

### 4.1 Instalar PM2

```powershell
npm install -g pm2
```

### 4.2 Instalar pm2-windows-startup (para inicio automático)

```powershell
npm install -g pm2-windows-startup
```

### 4.3 Iniciar el backend con PM2

```powershell
cd C:\ClubSocial\server
pm2 start ecosystem.config.js
pm2 save
```

### 4.4 Configurar inicio automático

```powershell
pm2-windows-startup install
```

### 4.5 Verificar que PM2 está corriendo

```powershell
pm2 list
pm2 logs
```

Deberías ver el proceso del backend corriendo.

**Ver más detalles en:** `PM2_WINDOWS_SETUP.md`

---

## 🌐 Paso 5: Instalar Módulos de IIS

### 5.1 Instalar Application Request Routing (ARR)

1. Descarga desde: https://www.iis.net/downloads/microsoft/application-request-routing
2. Instala **Application Request Routing 3.0**
3. Reinicia IIS

### 5.2 Instalar URL Rewrite Module

1. Descarga desde: https://www.iis.net/downloads/microsoft/url-rewrite
2. Instala **URL Rewrite Module 2.1**
3. Reinicia IIS

### 5.3 Habilitar Proxy en ARR

1. Abre **IIS Manager**
2. Selecciona el **servidor** (no el sitio)
3. Abre **Application Request Routing Cache**
4. Clic en **Server Proxy Settings**
5. Marca **Enable proxy**
6. Clic en **Apply**

---

## 📁 Paso 6: Configurar IIS

### 6.1 Crear el sitio web

1. Abre **IIS Manager**
2. Clic derecho en **Sites** → **Add Website**
3. Configura:
   - **Site name:** `ClubSocial`
   - **Physical path:** `C:\inetpub\wwwroot\ClubSocial`
   - **Binding:**
     - **Type:** http
     - **IP address:** All Unassigned (o la IP del servidor)
     - **Port:** `80` (o el puerto que prefieras, ej: `88`)
     - **Host name:** (deja vacío o pon tu dominio)

### 6.2 Copiar archivos del frontend

1. Copia **TODO el contenido** de la carpeta `dist` (de tu máquina de desarrollo) a:
   ```
   C:\inetpub\wwwroot\ClubSocial
   ```

2. Copia también el archivo `web.config` (está en la raíz del proyecto) a:
   ```
   C:\inetpub\wwwroot\ClubSocial\web.config
   ```

### 6.3 Verificar permisos

Asegúrate de que el usuario `IIS_IUSRS` tenga permisos de lectura en:
- `C:\inetpub\wwwroot\ClubSocial`

---

## ✅ Paso 7: Verificar el Despliegue

### 7.1 Verificar Backend

```powershell
# Desde el servidor
curl http://localhost:4000/api/health
```

Debería devolver: `{"status":"ok","timestamp":"..."}`

### 7.2 Verificar Proxy de IIS

```powershell
# Desde el servidor
curl http://localhost/api/health
# O si usaste puerto 88:
curl http://localhost:88/api/health
```

Debería devolver lo mismo que el backend.

### 7.3 Verificar Frontend

1. Abre en navegador: `http://tu-servidor` (o `http://tu-servidor:88` si usaste puerto 88)
2. Debería cargar la aplicación
3. Intenta hacer login con:
   - Usuario: `admin`
   - Contraseña: `admin`

---

## 🔄 Paso 8: Actualizar la Aplicación (Cuando hagas cambios)

### 8.1 Actualizar Frontend

1. En tu máquina de desarrollo:
   ```bash
   npm run build
   ```

2. Copia el contenido de `dist` a `C:\inetpub\wwwroot\ClubSocial` (reemplazando los archivos)

3. Copia también `web.config` si lo modificaste

### 8.2 Actualizar Backend

1. Copia los archivos modificados de `server/src` al servidor

2. Reinicia PM2:
   ```powershell
   cd C:\ClubSocial\server
   pm2 restart ecosystem.config.js
   ```

O si cambiaste dependencias:
```powershell
cd C:\ClubSocial\server
npm install --production
pm2 restart ecosystem.config.js
```

---

## 🛠️ Solución de Problemas

### Error: "npm no se reconoce"

Ver: `SOLUCION_NPM_NO_RECONOCIDO.md`

### Error: "Failed to fetch" en el navegador

1. Verifica que el backend está corriendo:
   ```powershell
   pm2 list
   ```

2. Verifica que el proxy funciona:
   ```powershell
   curl http://localhost/api/health
   ```

3. Verifica que `VITE_API_URL=/api` está configurado en el `.env` antes de compilar

4. Ver: `DIAGNOSTICO_ERROR_CONEXION.md`

### Error: "PM2 startup no funciona"

En Windows, usa `pm2-windows-startup` en lugar de `pm2 startup`:
```powershell
npm install -g pm2-windows-startup
pm2-windows-startup install
```

Ver: `PM2_WINDOWS_SETUP.md`

### Error HTTP 500.19 en IIS

Verifica que:
- Los módulos ARR y URL Rewrite están instalados
- El archivo `web.config` está en la carpeta del sitio
- No hay errores de sintaxis en `web.config`

### El backend no inicia automáticamente

```powershell
pm2-windows-startup uninstall
pm2-windows-startup install
pm2 save
```

---

## 📝 Checklist de Despliegue

- [ ] Frontend compilado con `VITE_API_URL=/api` en `.env`
- [ ] Carpeta `dist` copiada a `C:\inetpub\wwwroot\ClubSocial`
- [ ] Archivo `web.config` copiado al sitio IIS
- [ ] Backend copiado a `C:\ClubSocial\server`
- [ ] Archivo `server/.env` creado con las variables correctas
- [ ] Dependencias del backend instaladas (`npm install --production`)
- [ ] PM2 instalado y configurado
- [ ] Backend corriendo con PM2 (`pm2 list`)
- [ ] Inicio automático configurado (`pm2-windows-startup install`)
- [ ] Módulos ARR y URL Rewrite instalados en IIS
- [ ] Proxy habilitado en ARR
- [ ] Sitio IIS creado y configurado
- [ ] Backend responde en `http://localhost:4000/api/health`
- [ ] Proxy responde en `http://localhost/api/health`
- [ ] Frontend carga correctamente en el navegador
- [ ] Login funciona correctamente

---

## 🔐 Seguridad en Producción

### Cambios Recomendados:

1. **Cambiar contraseña del usuario admin:**
   - Inicia sesión como admin
   - Ve a Usuarios → Modificar admin
   - Cambia la contraseña

2. **Cambiar JWT_SECRET:**
   - Genera una clave segura (mínimo 32 caracteres)
   - Actualiza `server/.env`
   - Reinicia PM2: `pm2 restart ecosystem.config.js`

3. **Configurar HTTPS:**
   - Instala un certificado SSL en IIS
   - Configura binding HTTPS en el sitio
   - Actualiza `CORS_ORIGIN` en `server/.env` con la URL HTTPS

4. **Restringir acceso a MySQL:**
   - No uses el usuario `root` en producción
   - Crea un usuario específico para la aplicación
   - Limita el acceso desde `localhost` únicamente

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de PM2: `pm2 logs`
2. Revisa los logs de IIS en el Event Viewer
3. Verifica los archivos de diagnóstico:
   - `SOLUCION_NPM_NO_RECONOCIDO.md`
   - `PM2_WINDOWS_SETUP.md`
   - `DIAGNOSTICO_ERROR_CONEXION.md`
   - `DESPLIEGUE_IIS_PASO_A_PASO.md`

---

## 🎉 ¡Listo!

Tu aplicación debería estar funcionando en producción. Accede desde:
- `http://tu-servidor` (o el puerto que configuraste)
- Usuario: `admin`
- Contraseña: `admin` (cámbiala después del primer login)

