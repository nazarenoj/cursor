# Resumen Rápido: Pasar a Producción

## ⚡ Pasos Esenciales (5 minutos)

### 1. Compilar Frontend
```bash
# Crear .env con:
echo "VITE_API_URL=/api" > .env

# Compilar
npm run build
```

### 2. En el Servidor - Backend
```powershell
# Copiar carpeta server a C:\ClubSocial\server
# Crear server/.env con:
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=GL2025
DB_NAME=club_social
CORS_ORIGIN=*
JWT_SECRET=tu_clave_secreta_muy_segura

# Instalar y ejecutar
cd C:\ClubSocial\server
npm install --production
npm install -g pm2 pm2-windows-startup
pm2 start ecosystem.config.js
pm2 save
pm2-windows-startup install
```

### 3. En el Servidor - Frontend
```powershell
# Copiar contenido de dist/ a C:\inetpub\wwwroot\ClubSocial
# Copiar web.config también
```

### 4. En IIS
1. Instalar módulos: ARR 3.0 y URL Rewrite 2.1
2. Habilitar proxy en ARR (Server → ARR → Enable proxy)
3. Crear sitio: `ClubSocial` → `C:\inetpub\wwwroot\ClubSocial` → Puerto 80

### 5. Verificar
```powershell
# Backend
curl http://localhost:4000/api/health

# Proxy
curl http://localhost/api/health

# Frontend
# Abrir: http://tu-servidor
```

## 📚 Guía Completa

Para más detalles, ver: **`GUIA_PRODUCCION.md`**

## 🔧 Archivos Necesarios

- ✅ `dist/` (frontend compilado)
- ✅ `web.config` (configuración IIS)
- ✅ `server/` (backend completo)
- ✅ `server/.env` (variables de entorno - crear en servidor)
- ✅ `server/ecosystem.config.js` (configuración PM2)

## ⚠️ Importante

1. **Antes de compilar:** Crear `.env` con `VITE_API_URL=/api`
2. **En el servidor:** Crear `server/.env` con tus credenciales
3. **JWT_SECRET:** Cambiar por una clave segura
4. **Contraseña admin:** Cambiar después del primer login

