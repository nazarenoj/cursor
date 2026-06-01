# Configurar Acceso desde la Red Local (LAN)

## Cambios Realizados

### 1. Servidor Backend (Express)
- ✅ Configurado para escuchar en `0.0.0.0` (todas las interfaces)
- ✅ Muestra la IP de la red en los logs al iniciar

### 2. Servidor Frontend (Vite)
- ✅ Configurado para aceptar conexiones desde la red (`host: '0.0.0.0'`)

## Pasos para Acceder desde Otra PC

### Paso 1: Obtener la IP de la PC Servidor

En la PC donde está corriendo el servidor, ejecuta en PowerShell:

```powershell
ipconfig
```

Busca la sección **"Adaptador de Ethernet"** o **"Adaptador de LAN inalámbrica"** y anota la **IPv4** (ejemplo: `192.168.1.50`)

### Paso 2: Verificar el Firewall de Windows

1. Abre **Windows Defender Firewall**
2. Ve a **Configuración avanzada**
3. Asegúrate de que las reglas permitan:
   - Puerto **4000** (Backend)
   - Puerto **5173** (Frontend Vite)

O ejecuta estos comandos en PowerShell como Administrador:

```powershell
# Permitir puerto 4000 (Backend)
New-NetFirewallRule -DisplayName "Club Social Backend" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow

# Permitir puerto 5173 (Frontend)
New-NetFirewallRule -DisplayName "Club Social Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

### Paso 3: Iniciar los Servidores

En la PC servidor, ejecuta:

```powershell
npm run dev
```

Deberías ver algo como:

```
Servidor API escuchando en:
  - Local:   http://localhost:4000
  - Red:     http://192.168.1.50:4000

VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.50:5173/
```

### Paso 4: Configurar la URL de la API en el Frontend

Crea un archivo `.env` en la raíz del proyecto (donde está `package.json`) con:

```env
VITE_API_URL=http://192.168.1.50:4000/api
```

**Importante:** Reemplaza `192.168.1.50` con la IP de TU PC servidor.

### Paso 5: Acceder desde Otra PC

En la otra PC de la red, abre el navegador y ve a:

```
http://192.168.1.50:5173
```

**Importante:** Reemplaza `192.168.1.50` con la IP de la PC servidor.

## Solución de Problemas

### ERR_CONNECTION_REFUSED

1. **Verifica que el servidor esté corriendo:**
   ```powershell
   # En la PC servidor
   netstat -an | findstr "4000"
   netstat -an | findstr "5173"
   ```

2. **Verifica el firewall:**
   - Asegúrate de que Windows Firewall permita los puertos 4000 y 5173
   - O desactiva temporalmente el firewall para probar

3. **Verifica que estés usando la IP correcta:**
   - Usa `ipconfig` para obtener la IP real
   - No uses `localhost` o `127.0.0.1` desde otra PC

4. **Verifica que ambas PCs estén en la misma red:**
   - Ambas deben estar en la misma red local (mismo router)

### CORS Error

Si ves errores de CORS, verifica que en `server/src/index.js` esté:

```javascript
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
```

O configura `CORS_ORIGIN` en `server/.env`:

```env
CORS_ORIGIN=http://192.168.1.50:5173
```

### La IP Cambia Cada Vez

Si la IP de tu PC cambia (DHCP), puedes:

1. **Configurar IP estática** en Windows
2. **Usar el nombre de la PC** (si el DNS de la red lo permite)
3. **Usar un servicio como ngrok** para desarrollo (no recomendado para producción)

## Nota de Seguridad

⚠️ **Solo para desarrollo:** Esta configuración permite acceso desde cualquier PC en la red local. Para producción, usa un servidor web apropiado (IIS, Nginx, etc.) con configuración de seguridad adecuada.


