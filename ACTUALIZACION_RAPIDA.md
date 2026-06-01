# Actualización Rápida - Aplicación en Producción

## 🚀 Actualización en 3 Pasos

### Paso 1: Compilar Frontend (En tu máquina)

```bash
# Asegúrate de tener .env con VITE_API_URL=/api
echo "VITE_API_URL=/api" > .env

# Compilar
npm run build
```

### Paso 2: Copiar Archivos al Servidor

**Opción A: Usar el script automatizado (Recomendado)**

En el servidor, ejecuta:
```powershell
# Ejecutar como Administrador
.\actualizar-produccion.ps1
```

El script te pedirá:
- Ruta de la carpeta `dist` compilada
- Ruta de la carpeta `server` (si actualizaste el backend)

**Opción B: Manual**

1. **Frontend:**
   - Copia TODO el contenido de `dist/` a `C:\inetpub\wwwroot\ClubSocial`
   - Reemplaza todos los archivos
   - Copia también `web.config` si lo modificaste

2. **Backend (solo si hay cambios):**
   - Copia los archivos modificados de `server/src` a `C:\ClubSocial\server\src`
   - O copia toda la carpeta `server` si agregaste dependencias

### Paso 3: Reiniciar Servicios

**Frontend:**
```powershell
# Reiniciar sitio IIS (opcional, generalmente no es necesario)
Restart-WebAppPool -Name "ClubSocial"
```

**Backend (solo si actualizaste):**
```powershell
cd C:\ClubSocial\server
pm2 restart ecosystem.config.js
```

---

## ⚡ Comandos Rápidos

### Solo Frontend
```powershell
# 1. Compilar en tu máquina: npm run build
# 2. Copiar dist/ al servidor
# 3. Listo (no necesita reinicio)
```

### Solo Backend
```powershell
# 1. Copiar server/src al servidor
# 2. En el servidor:
cd C:\ClubSocial\server
pm2 restart ecosystem.config.js
```

### Frontend + Backend
```powershell
# Usar el script: .\actualizar-produccion.ps1
```

---

## ✅ Verificación Rápida

```powershell
# Verificar backend
curl http://localhost:4000/api/health

# Ver estado PM2
pm2 list

# Ver logs
pm2 logs --lines 20
```

Luego abre el navegador y presiona `Ctrl + F5` para forzar recarga.

---

## 📝 Notas

- **Nuevas tablas:** Se crean automáticamente al iniciar el backend
- **Nuevas dependencias:** Ejecuta `npm install --production` en `C:\ClubSocial\server`
- **Caché del navegador:** Presiona `Ctrl + F5` para limpiar
- **Backup:** El script crea backup automáticamente

---

## 🔧 Si algo falla

### Restaurar desde backup
```powershell
# El script crea backups en: C:\inetpub\wwwroot\ClubSocial_backup_YYYYMMDD_HHMMSS
# Restaurar:
Stop-Website -Name "ClubSocial"
Remove-Item "C:\inetpub\wwwroot\ClubSocial" -Recurse -Force
Copy-Item "C:\inetpub\wwwroot\ClubSocial_backup_YYYYMMDD_HHMMSS" -Destination "C:\inetpub\wwwroot\ClubSocial" -Recurse
Start-Website -Name "ClubSocial"
```

### Ver logs de errores
```powershell
# Backend
pm2 logs --err --lines 50

# IIS
# Ver Event Viewer -> Windows Logs -> Application
```

---

**Para más detalles, ver:** `ACTUALIZAR_APLICACION.md`

