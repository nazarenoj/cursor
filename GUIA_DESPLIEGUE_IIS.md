# Guía de Despliegue en IIS - Club Social Realicó

Esta guía explica cómo desplegar la aplicación en un servidor IIS (Internet Information Services) de Windows.

## Requisitos Previos

1. **Windows Server** con IIS instalado
2. **Node.js** (versión 18 o superior) instalado en el servidor
3. **MySQL Server** instalado y configurado
4. **Application Request Routing (ARR)** para IIS (para hacer proxy reverso al backend Node.js)
5. **URL Rewrite Module** para IIS

## Paso 1: Preparar el Frontend

### 1.1 Compilar la aplicación React

En tu máquina de desarrollo, ejecuta:

```bash
npm run build
```

Esto generará una carpeta `dist` con los archivos estáticos compilados.

### 1.2 Configurar variables de entorno

Crea un archivo `.env.production` en la raíz del proyecto:

```env
VITE_API_URL=http://tu-servidor:4000/api
```

O si el backend está en el mismo servidor:

```env
VITE_API_URL=/api
```

Luego vuelve a compilar:

```bash
npm run build
```

## Paso 2: Preparar el Backend

### 2.1 Instalar dependencias en el servidor

En el servidor, navega a la carpeta `server` y ejecuta:

```bash
cd server
npm install --production
```

### 2.2 Configurar variables de entorno

Crea el archivo `server/.env` en el servidor:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=GL2025
DB_NAME=club_social
CORS_ORIGIN=http://tu-servidor
JWT_SECRET=tu_secret_key_muy_segura_aqui
```

**⚠️ IMPORTANTE:** Cambia `JWT_SECRET` por una clave secreta segura y única.

### 2.3 Verificar la base de datos

Asegúrate de que:
- MySQL está corriendo
- La base de datos `club_social` existe
- Las tablas están creadas (el backend las crea automáticamente si no existen)

## Paso 3: Instalar Módulos de IIS

### 3.1 Instalar Application Request Routing (ARR)

1. Descarga **Application Request Routing 3.0** desde: https://www.iis.net/downloads/microsoft/application-request-routing
2. Instala el módulo siguiendo el asistente
3. Reinicia IIS

### 3.2 Instalar URL Rewrite Module

1. Descarga **URL Rewrite Module 2.1** desde: https://www.iis.net/downloads/microsoft/url-rewrite
2. Instala el módulo
3. Reinicia IIS

## Paso 4: Configurar IIS

### 4.1 Crear el sitio web

1. Abre **IIS Manager**
2. Clic derecho en **Sites** → **Add Website**
3. Configura:
   - **Site name:** `ClubSocial`
   - **Physical path:** `C:\inetpub\wwwroot\ClubSocial` (o la ruta donde copiarás los archivos)
   - **Binding:** 
     - Type: `http`
     - IP address: `All Unassigned` o la IP específica
     - Port: `80` (o el puerto que prefieras)
     - Host name: (opcional) `club-social.tu-dominio.com`

### 4.2 Copiar archivos del frontend

1. Copia todo el contenido de la carpeta `dist` (generada en el paso 1.1) a la carpeta física del sitio IIS
2. Asegúrate de que el archivo `index.html` esté en la raíz

### 4.3 Crear web.config para el frontend

Crea un archivo `web.config` en la raíz del sitio (donde está `index.html`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Redirigir todas las rutas al index.html para React Router -->
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/api" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
        
        <!-- Proxy reverso para API -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:4000/api/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    
    <!-- Configuración de CORS si es necesario -->
    <httpProtocol>
      <customHeaders>
        <add name="Access-Control-Allow-Origin" value="*" />
        <add name="Access-Control-Allow-Methods" value="GET, POST, PUT, DELETE, OPTIONS" />
        <add name="Access-Control-Allow-Headers" value="Content-Type, Authorization" />
      </customHeaders>
    </httpProtocol>
    
    <!-- Manejar OPTIONS para CORS -->
    <handlers>
      <remove name="OPTIONSVerbHandler" />
      <add name="OPTIONSVerbHandler" path="*" verb="OPTIONS" modules="ProtocolSupportModule" requireAccess="None" responseBufferLimit="4194304" />
    </handlers>
  </system.webServer>
</configuration>
```

## Paso 5: Configurar Application Request Routing (ARR)

### 5.1 Habilitar Proxy

1. En IIS Manager, selecciona el servidor (no el sitio)
2. Abre **Application Request Routing Cache**
3. Clic en **Server Proxy Settings** en el panel derecho
4. Marca **Enable proxy**
5. Clic en **Apply**

### 5.2 Configurar el pool de servidores (opcional)

Si quieres configurar un pool de servidores para el backend:

1. Abre **Server Farms**
2. Clic derecho → **Create Server Farm**
3. Nombre: `NodeBackend`
4. Agrega el servidor: `localhost:4000`
5. Configura health check si es necesario

## Paso 6: Ejecutar el Backend como Servicio de Windows

### 6.1 Usar PM2 (Recomendado)

Instala PM2 globalmente:

```bash
npm install -g pm2
```

Crea un archivo `ecosystem.config.js` en la carpeta `server`:

```javascript
module.exports = {
  apps: [{
    name: 'club-social-api',
    script: './src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

Inicia el servicio:

**⚠️ IMPORTANTE:** En Windows, `pm2 startup` NO funciona. Usa `pm2-windows-startup`:

```powershell
# Instalar pm2-windows-startup
npm install -g pm2-windows-startup

# Iniciar el servicio
cd server
pm2 start ecosystem.config.js
pm2 save

# Configurar inicio automático en Windows
pm2-windows-startup install
```

**Ver más detalles en:** `PM2_WINDOWS_SETUP.md`

### 6.2 Alternativa: Servicio de Windows con node-windows

Si prefieres un servicio nativo de Windows:

```bash
npm install -g node-windows
```

Crea un script `install-service.js`:

```javascript
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Club Social API',
  description: 'API del Club Social Realicó',
  script: path.join(__dirname, 'src', 'index.js'),
  nodeOptions: []
});

svc.on('install', () => {
  svc.start();
});

svc.install();
```

Ejecuta:

```bash
node install-service.js
```

## Paso 7: Configurar Firewall

Abre los puertos necesarios en el Firewall de Windows:

1. Puerto **80** (HTTP) - para IIS
2. Puerto **4000** (o el que uses para el backend) - solo si accedes directamente
3. Puerto **3306** (MySQL) - solo si MySQL está en otro servidor

## Paso 8: Configurar HTTPS (Opcional pero Recomendado)

### 8.1 Obtener certificado SSL

Puedes usar:
- **Let's Encrypt** (gratis) con `win-acme`
- Certificado comercial
- Certificado interno de tu organización

### 8.2 Configurar HTTPS en IIS

1. En el sitio, agrega un nuevo binding:
   - Type: `https`
   - Port: `443`
   - SSL certificate: Selecciona tu certificado

2. Actualiza `web.config` para forzar HTTPS (opcional):

```xml
<rule name="HTTP to HTTPS redirect" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" ignoreCase="true" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

## Paso 9: Verificar la Configuración

### 9.1 Verificar el frontend

1. Abre el navegador y ve a `http://tu-servidor`
2. Deberías ver la página de login

### 9.2 Verificar el backend

1. Abre `http://tu-servidor/api/health`
2. Deberías recibir: `{"status":"ok","timestamp":"..."}`

### 9.3 Verificar la conexión a la base de datos

Revisa los logs del backend para asegurarte de que se conecta correctamente a MySQL.

## Paso 10: Configuración de Producción Adicional

### 10.1 Actualizar CORS_ORIGIN

En `server/.env`, asegúrate de que `CORS_ORIGIN` apunte a la URL correcta:

```env
CORS_ORIGIN=http://tu-servidor
# O si usas HTTPS:
CORS_ORIGIN=https://tu-servidor
```

### 10.2 Configurar variables de entorno del frontend

Si el backend está en el mismo servidor y usas proxy, puedes usar:

```env
VITE_API_URL=/api
```

Si está en otro servidor:

```env
VITE_API_URL=http://backend-servidor:4000/api
```

Luego recompila el frontend.

### 10.3 Optimizaciones de rendimiento

En `web.config`, agrega compresión:

```xml
<urlCompression doStaticCompression="true" doDynamicCompression="true" />
```

## Estructura de Carpetas en el Servidor

```
C:\inetpub\wwwroot\ClubSocial\
├── index.html
├── assets\
│   ├── index-[hash].js
│   └── index-[hash].css
├── web.config
└── logo.svg (si existe)

C:\ClubSocial\server\
├── src\
│   ├── index.js
│   └── ...
├── node_modules\
├── .env
├── package.json
└── ecosystem.config.js (si usas PM2)
```

## Comandos Útiles

### Reiniciar el backend (PM2)
```bash
pm2 restart club-social-api
pm2 logs club-social-api
```

### Reiniciar IIS
```bash
iisreset
```

### Ver logs de IIS
- Abre **Event Viewer** → **Windows Logs** → **Application**

## Solución de Problemas

### Error: "Failed to fetch"
- Verifica que el backend esté corriendo: `pm2 list`
- Verifica que el puerto 4000 esté abierto
- Revisa la configuración de CORS en el backend
- Verifica que `web.config` tenga la regla de proxy correcta

### Error: "Cannot GET /ruta"
- Verifica que `web.config` tenga la regla de rewrite para React Router
- Asegúrate de que `index.html` esté en la raíz

### El backend no inicia
- Verifica las variables de entorno en `server/.env`
- Verifica la conexión a MySQL
- Revisa los logs: `pm2 logs club-social-api`

### Problemas de permisos
- Asegúrate de que el usuario `IIS_IUSRS` tenga permisos de lectura en la carpeta del sitio
- Para el backend, el usuario que ejecuta el servicio necesita permisos de lectura/escritura

## Seguridad

1. **Cambia el JWT_SECRET** por una clave segura y única
2. **Usa HTTPS** en producción
3. **Restringe el acceso a MySQL** solo desde localhost si está en el mismo servidor
4. **Configura un firewall** adecuado
5. **Mantén Node.js y las dependencias actualizadas**
6. **No expongas el archivo `.env`** públicamente

## Mantenimiento

### Actualizar la aplicación

1. Compila el frontend: `npm run build`
2. Copia los archivos nuevos a IIS
3. Reinicia el backend: `pm2 restart club-social-api`
4. Limpia la caché del navegador si es necesario

### Backup

- Configura backups regulares de la base de datos MySQL
- Guarda copias de los archivos `.env` de forma segura

