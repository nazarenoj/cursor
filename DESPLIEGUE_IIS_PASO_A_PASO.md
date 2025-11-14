# Guía Paso a Paso - Despliegue en IIS

## Resumen Rápido

Esta aplicación tiene dos partes:
1. **Frontend (React)**: Se compila y se sirve como archivos estáticos desde IIS
2. **Backend (Node.js/Express)**: Se ejecuta como servicio de Windows y se accede mediante proxy reverso desde IIS

## Pasos de Despliegue

### 1. En tu máquina de desarrollo

**IMPORTANTE:** Antes de compilar, configura la variable de entorno para que el frontend use el proxy de IIS.

**Opción 1: Crear archivo .env (Recomendado)**

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=/api
```

**Opción 2: Compilar con variable de entorno**

```bash
# Windows PowerShell
$env:VITE_API_URL="/api"; npm run build

# Linux/Mac
VITE_API_URL=/api npm run build
```

Luego compila:

```bash
# 1. Compilar el frontend
npm run build

# Esto crea la carpeta "dist" con los archivos listos para producción
# Los archivos estarán configurados para usar /api como URL base
```

### 2. En el servidor IIS

#### A. Verificar/Instalar Node.js

**IMPORTANTE:** Si PowerShell no reconoce `npm`, primero debes instalar o configurar Node.js:

```powershell
# Verificar si Node.js está instalado
where.exe node

# Si no aparece nada, instala Node.js desde: https://nodejs.org/
# Durante la instalación, asegúrate de marcar "Add to PATH"

# Si Node.js está instalado pero no en el PATH, usa la ruta completa:
& "C:\Program Files\nodejs\npm.cmd" install --production
```

**Ver más detalles en:** `SOLUCION_NPM_NO_RECONOCIDO.md`

#### B. Preparar el backend

```bash
# 1. Copiar la carpeta "server" al servidor (ej: C:\ClubSocial\server)

# 2. Instalar dependencias
cd C:\ClubSocial\server
npm install --production

# 3. Crear archivo .env
# Copia el contenido de env.sample y crea .env con tus valores
```

#### C. Instalar y Configurar PM2 (recomendado)

**IMPORTANTE:** En Windows, `pm2 startup` NO funciona. Usa una de estas opciones:

**Opción 1: pm2-windows-startup (Recomendado)**

```powershell
# 1. Instalar PM2
npm install -g pm2

# 2. Instalar pm2-windows-startup
npm install -g pm2-windows-startup

# 3. Iniciar el backend
cd C:\Clubsocial\server
pm2 start ecosystem.config.js

# 4. Guardar la configuración
pm2 save

# 5. Configurar inicio automático en Windows
pm2-windows-startup install
```

**Opción 2: Sin inicio automático (para pruebas)**

```powershell
# 1. Instalar PM2
npm install -g pm2

# 2. Iniciar el backend
cd C:\Clubsocial\server
pm2 start ecosystem.config.js

# 3. Guardar la configuración
pm2 save

# NOTA: Tendrás que iniciar PM2 manualmente después de cada reinicio:
# pm2 resurrect
```

**Ver más detalles en:** `PM2_WINDOWS_SETUP.md`

#### D. Configurar IIS

1. **Crear el sitio:**
   - Abre IIS Manager
   - Clic derecho en "Sites" → "Add Website"
   - Nombre: `ClubSocial`
   - Ruta física: `C:\inetpub\wwwroot\ClubSocial`
   - Puerto: `80`

2. **Copiar archivos del frontend:**
   - Copia TODO el contenido de la carpeta `dist` a `C:\inetpub\wwwroot\ClubSocial`
   - Copia también el archivo `web.config` (está en la raíz del proyecto)

3. **Instalar módulos de IIS:**
   - Application Request Routing (ARR) 3.0
   - URL Rewrite Module 2.1

4. **Habilitar proxy en ARR:**
   - En IIS Manager, selecciona el servidor (no el sitio)
   - Abre "Application Request Routing Cache"
   - Clic en "Server Proxy Settings"
   - Marca "Enable proxy"
   - Aplica los cambios

### 3. Verificar

**Verificar Backend:**
```powershell
# Desde el servidor, verificar que el backend responde
curl http://localhost:4000/api/health
# Debería devolver: {"status":"ok","timestamp":"..."}
```

**Verificar Proxy de IIS:**
```powershell
# Desde el servidor, verificar que el proxy funciona
curl http://localhost:88/api/health
# Debería devolver lo mismo que el backend
```

**Verificar Frontend:**
- Abre en navegador: `http://localhost:88` o `http://tu-servidor:88`
- Debería cargar la aplicación
- Intenta hacer login

**Si hay errores de conexión, ver:** `DIAGNOSTICO_ERROR_CONEXION.md`

## Archivos Importantes

- `web.config`: Configuración de IIS (ya está creado)
- `server/ecosystem.config.js`: Configuración de PM2 (ya está creado)
- `server/.env`: Variables de entorno del backend (debes crearlo)

## Notas Importantes

1. El backend debe estar corriendo en el puerto 4000 (configurado en `server/.env`)
2. El `web.config` hace proxy de `/api/*` a `http://localhost:4000/api/*`
3. El frontend debe tener `VITE_API_URL=/api` para usar el proxy
4. Si cambias el puerto del backend, actualiza `web.config` también


