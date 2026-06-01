# 📘 GUÍA COMPLETA DE DESPLIEGUE A PRODUCCIÓN
## Sistema de Gestión de Socios - Club Social Realico

---

## 📋 ÍNDICE

1. [Requisitos Previos](#requisitos-previos)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Archivos a Copiar](#archivos-a-copiar)
4. [Configuración del Servidor](#configuración-del-servidor)
5. [Instalación de Dependencias](#instalación-de-dependencias)
6. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
7. [Base de Datos](#base-de-datos)
8. [Compilación del Frontend](#compilación-del-frontend)
9. [Configuración del Backend](#configuración-del-backend)
10. [Configuración de IIS (Opcional)](#configuración-de-iis-opcional)
11. [Configuración con PM2](#configuración-con-pm2)
12. [Verificación y Pruebas](#verificación-y-pruebas)
13. [Mantenimiento y Actualizaciones](#mantenimiento-y-actualizaciones)

---

## 🔧 REQUISITOS PREVIOS

### Software Necesario en el Servidor de Producción:

1. **Node.js** (versión 18 o superior)
   - Descargar desde: https://nodejs.org/
   - Verificar instalación: `node --version`
   - Verificar npm: `npm --version`

2. **MySQL Server** (versión 8.0 o superior)
   - Instalado y ejecutándose
   - Acceso con usuario y contraseña

3. **WinRAR** (para backups)
   - Instalado en: `C:\Program Files\WinRAR\WinRAR.exe`
   - O configurar ruta personalizada en variables de entorno

4. **PM2** (para gestión de procesos - opcional pero recomendado)
   - Instalar: `npm install -g pm2`

5. **IIS** (si se usa para servir el frontend)
   - Con URL Rewrite Module instalado
   - Application Request Routing (ARR) para proxy reverso

---

## 📁 ESTRUCTURA DEL PROYECTO

```
PROYECTO/
├── dist/                          # Frontend compilado (generado)
├── server/                        # Backend Node.js
│   ├── src/                      # Código fuente del backend
│   │   ├── db.js                 # Configuración de base de datos
│   │   ├── index.js              # Punto de entrada del servidor
│   │   ├── middleware/           # Middlewares
│   │   │   ├── auth.js
│   │   │   ├── auditoria.js
│   │   │   ├── permissions.js
│   │   │   └── upload.js
│   │   ├── routes/               # Rutas de la API
│   │   │   ├── auth.js
│   │   │   ├── auditoria.js
│   │   │   ├── backup.js
│   │   │   ├── cajas.js
│   │   │   ├── categorias.js
│   │   │   ├── liquidaciones.js
│   │   │   ├── mediosPago.js
│   │   │   ├── permisos.js
│   │   │   ├── socios.js
│   │   │   └── usuarios.js
│   │   └── utils/                # Utilidades
│   │       ├── asyncHandler.js
│   │       ├── backup.js
│   │       ├── backupScheduler.js
│   │       └── format.js
│   ├── uploads/                  # Archivos subidos (fotos de socios)
│   │   └── fotos/
│   ├── backups/                  # Backups de la base de datos
│   ├── logs/                     # Logs de PM2 (se crea automáticamente)
│   ├── package.json
│   ├── ecosystem.config.js       # Configuración de PM2
│   └── .env                      # Variables de entorno (NO COPIAR, crear nuevo)
├── src/                          # Código fuente del frontend (NO copiar a producción)
├── public/                       # Archivos públicos del frontend (NO copiar a producción)
├── package.json                  # Dependencias del frontend (NO copiar a producción)
├── vite.config.ts               # Configuración de Vite (NO copiar a producción)
└── web.config                   # Configuración de IIS (copiar si se usa IIS)
```

---

## 📦 ARCHIVOS A COPIAR

### ✅ Archivos y Carpetas a Copiar al Servidor de Producción:

#### 1. **Frontend Compilado** (desde desarrollo)
```
DESARROLLO/dist/  →  PRODUCCION/C:\inetpub\wwwroot\club-social\ (o ruta de IIS)
```
**Ubicación en desarrollo:** `C:\Users\jnazareno\Desktop\Cursor\dist\`

**Contenido:**
- `index.html`
- `assets/` (todos los archivos JS y CSS compilados)
- `logo.svg` (si existe)

#### 2. **Backend Completo** (desde desarrollo)
```
DESARROLLO/server/  →  PRODUCCION/C:\club-social-api\ (o ruta elegida)
```
**Ubicación en desarrollo:** `C:\Users\jnazareno\Desktop\Cursor\server\`

**Carpetas y archivos a copiar:**
- ✅ `server/src/` (toda la carpeta)
- ✅ `server/package.json`
- ✅ `server/package-lock.json` (si existe)
- ✅ `server/ecosystem.config.js`
- ✅ `server/backup-config.json` (si existe y tiene configuración)
- ✅ `server/uploads/` (si tiene fotos de socios existentes)
- ✅ `server/backups/` (si tiene backups existentes)
- ❌ `server/node_modules/` (NO copiar, instalar en producción)
- ❌ `server/.env` (NO copiar, crear nuevo en producción)

#### 3. **Configuración de IIS** (si se usa IIS)
```
DESARROLLO/web.config  →  PRODUCCION/C:\inetpub\wwwroot\club-social\web.config
```
**Ubicación en desarrollo:** `C:\Users\jnazareno\Desktop\Cursor\web.config`

---

## 🖥️ CONFIGURACIÓN DEL SERVIDOR

### Paso 1: Crear Estructura de Directorios

En el servidor de producción, crear las siguientes carpetas:

```powershell
# Backend
C:\club-social-api\
C:\club-social-api\logs\          # Para logs de PM2

# Frontend (si se usa IIS)
C:\inetpub\wwwroot\club-social\

# Base de datos (si se necesita)
C:\club-social-data\
```

### Paso 2: Copiar Archivos

#### Copiar Backend:
```powershell
# Desde tu máquina de desarrollo, copiar:
# C:\Users\jnazareno\Desktop\Cursor\server\* 
# A: C:\club-social-api\
```

**Archivos específicos a copiar:**
- `server/src/` → `C:\club-social-api\src\`
- `server/package.json` → `C:\club-social-api\package.json`
- `server/package-lock.json` → `C:\club-social-api\package-lock.json`
- `server/ecosystem.config.js` → `C:\club-social-api\ecosystem.config.js`
- `server/backup-config.json` → `C:\club-social-api\backup-config.json` (si existe)
- `server/uploads/` → `C:\club-social-api\uploads\` (si tiene contenido)
- `server/backups/` → `C:\club-social-api\backups\` (si tiene backups)

#### Copiar Frontend Compilado:
```powershell
# Desde tu máquina de desarrollo, copiar:
# C:\Users\jnazareno\Desktop\Cursor\dist\*
# A: C:\inetpub\wwwroot\club-social\
```

**Archivos específicos:**
- `dist/index.html` → `C:\inetpub\wwwroot\club-social\index.html`
- `dist/assets/` → `C:\inetpub\wwwroot\club-social\assets\`
- `dist/logo.svg` → `C:\inetpub\wwwroot\club-social\logo.svg` (si existe)

#### Copiar Configuración IIS:
```powershell
# Desde tu máquina de desarrollo, copiar:
# C:\Users\jnazareno\Desktop\Cursor\web.config
# A: C:\inetpub\wwwroot\club-social\web.config
```

---

## 📥 INSTALACIÓN DE DEPENDENCIAS

### Paso 1: Instalar Dependencias del Backend

```powershell
# Navegar al directorio del backend
cd C:\club-social-api

# Instalar dependencias de producción
npm install --production
```

**Dependencias que se instalarán:**
- express
- mysql2
- jsonwebtoken
- bcryptjs
- cors
- dotenv
- morgan
- multer
- node-cron

### Paso 2: Verificar Instalación

```powershell
# Verificar que node_modules se creó correctamente
dir node_modules

# Verificar que las dependencias están instaladas
npm list --depth=0
```

---

## ⚙️ CONFIGURACIÓN DE VARIABLES DE ENTORNO

### Paso 1: Crear Archivo .env

En el servidor de producción, crear el archivo `.env` en:
```
C:\club-social-api\.env
```

### Paso 2: Configurar Variables

Copiar el contenido del archivo `server/env.sample` y ajustar los valores:

```env
# Puerto del servidor backend
PORT=4000

# Orígenes permitidos para CORS (separados por comas)
# Para producción, usar la URL real del servidor
CORS_ORIGIN=http://servidor-produccion,http://192.168.1.100
# O permitir todos (menos seguro):
# CORS_ORIGIN=*

# Configuración de Base de Datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=TU_CONTRASEÑA_MYSQL
DB_NAME=club_social

# Secret Key para JWT (CAMBIAR EN PRODUCCIÓN - usar una clave segura)
JWT_SECRET=clave-super-secreta-cambiar-en-produccion-2025

# Entorno
NODE_ENV=production
```

### Paso 3: Seguridad de Variables

**⚠️ IMPORTANTE:**
- El archivo `.env` NO debe estar en el repositorio Git
- Usar contraseñas seguras en producción
- Cambiar `JWT_SECRET` por una clave aleatoria segura
- Restringir `CORS_ORIGIN` a los dominios reales

**Generar JWT_SECRET seguro:**
```powershell
# En PowerShell, generar una clave aleatoria:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

## 🗄️ BASE DE DATOS

### Paso 1: Crear Base de Datos

Conectar a MySQL y ejecutar:

```sql
CREATE DATABASE IF NOT EXISTS club_social 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_spanish_ci;
```

### Paso 2: Importar Estructura y Datos

Si tienes un dump de la base de datos:

```powershell
# Importar desde archivo SQL
mysql -u root -p club_social < C:\ruta\al\archivo.sql
```

O desde MySQL Workbench:
1. Abrir MySQL Workbench
2. Conectar al servidor
3. Seleccionar base de datos `club_social`
4. File → Run SQL Script
5. Seleccionar el archivo SQL

### Paso 3: Verificar Conexión

El backend creará automáticamente las tablas necesarias al iniciar si no existen.

**Verificar que la conexión funciona:**
```powershell
# Probar conexión desde línea de comandos
mysql -u root -p -h localhost -P 3306 club_social
```

---

## 🏗️ COMPILACIÓN DEL FRONTEND

### Paso 1: Compilar en Desarrollo

**En tu máquina de desarrollo:**

```powershell
# Navegar al directorio raíz del proyecto
cd C:\Users\jnazareno\Desktop\Cursor

# Instalar dependencias (si no están instaladas)
npm install

# Compilar para producción
npm run build
```

Esto generará los archivos en `dist/`

### Paso 2: Verificar Compilación

```powershell
# Verificar que se creó la carpeta dist
dir dist

# Debe contener:
# - index.html
# - assets/ (con archivos JS y CSS)
```

### Paso 3: Copiar a Producción

Copiar todo el contenido de `dist/` al servidor de producción.

---

## 🔧 CONFIGURACIÓN DEL BACKEND

### Paso 1: Verificar Configuración de Backup

Editar `C:\club-social-api\backup-config.json` (si existe):

```json
{
  "rutaBackup": "C:\\club-social-api\\backups",
  "frecuencia": "diaria",
  "rutaWinRAR": "C:\\Program Files\\WinRAR\\WinRAR.exe",
  "mantenerBackups": {
    "horarios": 24,
    "diarios": 30,
    "semanales": 12,
    "mensuales": 12
  }
}
```

### Paso 2: Verificar Rutas de Archivos

Asegurarse de que las rutas en el código apunten a las ubicaciones correctas:

- **Backups:** `C:\club-social-api\backups\`
- **Uploads:** `C:\club-social-api\uploads\fotos\`
- **Logs:** `C:\club-social-api\logs\`

### Paso 3: Verificar Permisos

Asegurarse de que el usuario que ejecuta el servicio tenga permisos de:
- Lectura/escritura en `C:\club-social-api\backups\`
- Lectura/escritura en `C:\club-social-api\uploads\`
- Lectura/escritura en `C:\club-social-api\logs\`

---

## 🌐 CONFIGURACIÓN DE IIS (Opcional)

### Paso 1: Crear Sitio Web en IIS

1. Abrir **IIS Manager**
2. Click derecho en **Sites** → **Add Website**
3. Configurar:
   - **Site name:** `club-social`
   - **Physical path:** `C:\inetpub\wwwroot\club-social`
   - **Binding:**
     - Type: `http` o `https`
     - IP address: `All Unassigned` o IP específica
     - Port: `80` (o `443` para HTTPS)
     - Host name: (dejar vacío o poner dominio)

### Paso 2: Instalar URL Rewrite Module

1. Descargar desde: https://www.iis.net/downloads/microsoft/url-rewrite
2. Instalar en el servidor
3. Reiniciar IIS

### Paso 3: Verificar web.config

Asegurarse de que `web.config` está en:
```
C:\inetpub\wwwroot\club-social\web.config
```

**Configuración importante en web.config:**
- Proxy reverso para API apunta a: `http://localhost:4000`
- Rutas de React Router configuradas correctamente

### Paso 4: Configurar Application Request Routing (ARR)

Si no está instalado:
1. Descargar desde: https://www.iis.net/downloads/microsoft/application-request-routing
2. Instalar en el servidor
3. En IIS Manager → Server → Application Request Routing Cache
4. Habilitar proxy

---

## 🚀 CONFIGURACIÓN CON PM2

### Paso 1: Instalar PM2 Globalmente

```powershell
npm install -g pm2
```

### Paso 2: Verificar ecosystem.config.js

El archivo `C:\club-social-api\ecosystem.config.js` debe contener:

```javascript
const path = require('path');

module.exports = {
  apps: [{
    name: 'club-social-api',
    script: './src/index.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: path.join(__dirname, 'logs', 'err.log'),
    out_file: path.join(__dirname, 'logs', 'out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

### Paso 3: Iniciar Aplicación con PM2

```powershell
# Navegar al directorio del backend
cd C:\club-social-api

# Iniciar aplicación
pm2 start ecosystem.config.js

# Verificar que está corriendo
pm2 status

# Ver logs
pm2 logs club-social-api
```

### Paso 4: Configurar PM2 para Inicio Automático

```powershell
# Guardar configuración actual de PM2
pm2 save

# Configurar para iniciar al arrancar Windows
pm2 startup
# Seguir las instrucciones que aparecen en pantalla
```

### Paso 5: Comandos Útiles de PM2

```powershell
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs club-social-api

# Reiniciar aplicación
pm2 restart club-social-api

# Detener aplicación
pm2 stop club-social-api

# Eliminar aplicación de PM2
pm2 delete club-social-api

# Ver información detallada
pm2 describe club-social-api

# Monitoreo en tiempo real
pm2 monit
```

---

## ✅ VERIFICACIÓN Y PRUEBAS

### Paso 1: Verificar que el Backend Está Corriendo

```powershell
# Verificar que PM2 está ejecutando el proceso
pm2 status

# Verificar que el puerto 4000 está en uso
netstat -ano | findstr :4000

# Probar endpoint de health
curl http://localhost:4000/api/health
# O desde navegador: http://localhost:4000/api/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-07T..."
}
```

### Paso 2: Verificar que el Frontend Está Accesible

Desde un navegador, acceder a:
- `http://servidor-produccion/` (si está en IIS)
- O la URL configurada

### Paso 3: Probar Login

1. Abrir la aplicación en el navegador
2. Intentar hacer login con credenciales válidas
3. Verificar que se puede acceder al dashboard

### Paso 4: Verificar Funcionalidades Clave

- ✅ Login/Logout
- ✅ Ver lista de socios
- ✅ Crear/editar socio
- ✅ Ver liquidaciones
- ✅ Registrar pagos
- ✅ Ver auditoría
- ✅ Crear backup
- ✅ Restaurar backup

### Paso 5: Verificar Logs

```powershell
# Ver logs del backend
pm2 logs club-social-api

# Ver logs de IIS (si se usa)
# Event Viewer → Windows Logs → Application
```

---

## 🔄 MANTENIMIENTO Y ACTUALIZACIONES

### Actualizar Código

#### 1. Compilar Frontend en Desarrollo

```powershell
cd C:\Users\jnazareno\Desktop\Cursor
npm run build
```

#### 2. Copiar Archivos Actualizados

**Frontend:**
```powershell
# Copiar dist/ al servidor
# C:\Users\jnazareno\Desktop\Cursor\dist\* 
# → C:\inetpub\wwwroot\club-social\
```

**Backend:**
```powershell
# Copiar solo archivos modificados
# C:\Users\jnazareno\Desktop\Cursor\server\src\*
# → C:\club-social-api\src\
```

#### 3. Reiniciar Backend

```powershell
cd C:\club-social-api
pm2 restart club-social-api
```

### Backup Regular

El sistema tiene backup automático configurado. Verificar:

```powershell
# Ver backups creados
dir C:\club-social-api\backups

# Verificar configuración de backup
type C:\club-social-api\backup-config.json
```

### Actualizar Dependencias

```powershell
cd C:\club-social-api

# Verificar dependencias desactualizadas
npm outdated

# Actualizar (con cuidado)
npm update

# Reiniciar después de actualizar
pm2 restart club-social-api
```

---

## 📝 CHECKLIST DE DESPLIEGUE

### Pre-Despliegue
- [ ] Node.js instalado en producción
- [ ] MySQL instalado y ejecutándose
- [ ] WinRAR instalado
- [ ] PM2 instalado globalmente
- [ ] IIS configurado (si se usa)
- [ ] URL Rewrite Module instalado (si se usa IIS)

### Archivos
- [ ] Frontend compilado (`dist/`) copiado
- [ ] Backend (`server/src/`) copiado
- [ ] `package.json` del backend copiado
- [ ] `ecosystem.config.js` copiado
- [ ] `web.config` copiado (si se usa IIS)
- [ ] `backup-config.json` copiado (si existe)
- [ ] Carpeta `uploads/` copiada (si tiene contenido)

### Configuración
- [ ] Archivo `.env` creado y configurado
- [ ] Variables de entorno configuradas correctamente
- [ ] Base de datos creada
- [ ] Base de datos importada (si aplica)
- [ ] Rutas de archivos verificadas
- [ ] Permisos de carpetas configurados

### Instalación
- [ ] Dependencias del backend instaladas (`npm install --production`)
- [ ] Aplicación iniciada con PM2
- [ ] PM2 configurado para inicio automático

### Verificación
- [ ] Backend responde en `http://localhost:4000/api/health`
- [ ] Frontend accesible desde navegador
- [ ] Login funciona correctamente
- [ ] Funcionalidades principales probadas
- [ ] Logs sin errores críticos

---

## 🆘 SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "Cannot find module"
**Solución:** Ejecutar `npm install` en el directorio del backend

### Error: "Port 4000 already in use"
**Solución:** 
```powershell
# Ver qué proceso usa el puerto
netstat -ano | findstr :4000
# Detener proceso o cambiar PORT en .env
```

### Error: "Failed to connect to database"
**Solución:**
- Verificar que MySQL está ejecutándose
- Verificar credenciales en `.env`
- Verificar que la base de datos existe

### Error: "CORS policy"
**Solución:**
- Verificar `CORS_ORIGIN` en `.env`
- Agregar la URL del frontend a `CORS_ORIGIN`

### Frontend no carga
**Solución:**
- Verificar que `dist/` está en la ruta correcta de IIS
- Verificar que `web.config` está presente
- Verificar permisos de la carpeta

### PM2 no inicia al arrancar
**Solución:**
```powershell
pm2 startup
# Seguir instrucciones
pm2 save
```

---

## 📞 CONTACTO Y SOPORTE

Para problemas o dudas:
1. Revisar logs: `pm2 logs club-social-api`
2. Verificar configuración en `.env`
3. Verificar que todos los servicios están ejecutándose

---

## 📅 FECHA DE CREACIÓN

**Creado:** 2025-01-07  
**Versión:** 1.0.0  
**Última actualización:** 2025-01-07

---

**¡Despliegue exitoso! 🎉**

