# Diagnóstico: Error al comunicarse con el servidor

## Posibles Causas

1. **Backend no está corriendo**
2. **Frontend no está configurado para usar el proxy**
3. **Proxy de IIS no está configurado correctamente**
4. **ARR (Application Request Routing) no está habilitado**
5. **Puerto incorrecto o bloqueado**

## Pasos de Diagnóstico

### 1. Verificar que el Backend está corriendo

En PowerShell del servidor:

```powershell
# Verificar procesos de PM2
pm2 list

# Si no está corriendo, iniciarlo:
cd C:\Clubsocial\server
pm2 start ecosystem.config.js

# Ver logs para verificar errores
pm2 logs
```

**Verificar directamente:**
```powershell
# Probar si el backend responde
curl http://localhost:4000/api/health

# O en el navegador:
# http://localhost:4000/api/health
```

### 2. Verificar configuración del Frontend

El frontend debe estar compilado con `VITE_API_URL=/api` para usar el proxy de IIS.

**En tu máquina de desarrollo, antes de compilar:**

Crea o edita el archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=/api
```

Luego recompila:

```powershell
npm run build
```

**IMPORTANTE:** Copia nuevamente los archivos de `dist` al servidor después de recompilar.

### 3. Verificar configuración del Proxy en IIS

#### A. Verificar que ARR está habilitado

1. Abre IIS Manager
2. Selecciona el **servidor** (no el sitio)
3. Haz doble clic en "Application Request Routing Cache"
4. Clic en "Server Proxy Settings" (en el panel derecho)
5. Verifica que "Enable proxy" está marcado
6. Aplica los cambios

#### B. Verificar que URL Rewrite está instalado

1. En IIS Manager, selecciona el servidor
2. Verifica que "URL Rewrite" aparece en la lista de módulos
3. Si no está, descárgalo e instálalo desde: https://www.iis.net/downloads/microsoft/url-rewrite

#### C. Verificar web.config

El archivo `web.config` debe estar en `C:\inetpub\wwwroot\clubsocial\` y debe contener:

```xml
<rule name="API Proxy" stopProcessing="true">
  <match url="^api/(.*)" />
  <action type="Rewrite" url="http://localhost:4000/api/{R:1}" />
</rule>
```

### 4. Verificar CORS en el Backend

En `C:\Clubsocial\server\.env`, verifica:

```env
CORS_ORIGIN=http://localhost:88
# O si accedes desde otra IP:
# CORS_ORIGIN=http://tu-ip-servidor:88
```

Luego reinicia PM2:

```powershell
pm2 restart all
```

### 5. Verificar Firewall

Asegúrate de que el puerto 4000 no está bloqueado:

```powershell
# Verificar reglas de firewall
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*4000*"}

# Si necesitas abrir el puerto (solo para localhost, no es necesario exponerlo):
New-NetFirewallRule -DisplayName "Node.js Backend" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

### 6. Probar el Proxy Manualmente

Desde el servidor, prueba si el proxy funciona:

```powershell
# Probar el proxy desde el servidor
curl http://localhost:88/api/health

# Debería devolver: {"status":"ok","timestamp":"..."}
```

### 7. Verificar Logs de IIS

1. Abre IIS Manager
2. Selecciona el sitio "clubsocial"
3. Haz doble clic en "Logging"
4. Verifica la ubicación de los logs
5. Revisa los logs más recientes para ver errores

## Solución Rápida - Checklist

- [ ] Backend corriendo: `pm2 list` muestra el proceso
- [ ] Backend responde: `http://localhost:4000/api/health` funciona
- [ ] Frontend compilado con `VITE_API_URL=/api`
- [ ] Archivos de `dist` copiados al servidor
- [ ] `web.config` está en `C:\inetpub\wwwroot\clubsocial\`
- [ ] ARR habilitado en IIS
- [ ] URL Rewrite instalado
- [ ] Proxy funciona: `http://localhost:88/api/health` responde
- [ ] CORS configurado en `.env` del backend

## Comandos de Verificación Rápida

```powershell
# 1. Verificar backend
pm2 list
pm2 logs --lines 50

# 2. Probar backend directamente
curl http://localhost:4000/api/health

# 3. Probar proxy
curl http://localhost:88/api/health

# 4. Verificar que el sitio está corriendo
# Abre en navegador: http://localhost:88
```

## Si el Proxy no Funciona

Si `http://localhost:88/api/health` no funciona pero `http://localhost:4000/api/health` sí:

1. **Verifica que ARR está habilitado** (paso 3.A)
2. **Verifica que URL Rewrite está instalado** (paso 3.B)
3. **Reinicia IIS:**
   ```powershell
   iisreset
   ```
4. **Verifica que el web.config está correcto** (paso 3.C)

## Si el Frontend no se Conecta

1. **Abre la consola del navegador** (F12)
2. **Ve a la pestaña Network**
3. **Intenta hacer login o cargar datos**
4. **Revisa las peticiones fallidas:**
   - ¿A qué URL está intentando conectarse?
   - ¿Qué código de error devuelve?
   - ¿Hay errores de CORS?

## Configuración Alternativa (Sin Proxy)

Si el proxy no funciona, puedes configurar el frontend para conectarse directamente al backend:

1. **En el servidor, abre el puerto 4000 en el firewall** (solo si es necesario)
2. **Compila el frontend con:**
   ```env
   VITE_API_URL=http://tu-servidor:4000/api
   ```
3. **Actualiza CORS en el backend:**
   ```env
   CORS_ORIGIN=http://tu-servidor:88
   ```

Pero **recomendamos usar el proxy** porque es más seguro y no requiere exponer el puerto 4000.

