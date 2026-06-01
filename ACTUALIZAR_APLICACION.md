# Guía Rápida: Actualizar la Aplicación en Producción

Esta guía te muestra cómo actualizar la aplicación cuando ya está corriendo en el servidor.

## 🔄 Proceso de Actualización

### Paso 1: Actualizar el Frontend

#### 1.1 En tu máquina de desarrollo

```bash
# Asegúrate de tener el .env configurado
echo "VITE_API_URL=/api" > .env

# Compilar la nueva versión
npm run build
```

#### 1.2 En el servidor

1. **Detener el sitio IIS temporalmente (opcional, para evitar errores durante la actualización):**
   ```powershell
   # En IIS Manager: Stop el sitio "ClubSocial"
   # O desde PowerShell:
   Stop-Website -Name "ClubSocial"
   ```

2. **Hacer backup de la versión actual (recomendado):**
   ```powershell
   # Crear backup
   $backupPath = "C:\inetpub\wwwroot\ClubSocial_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
   Copy-Item "C:\inetpub\wwwroot\ClubSocial" -Destination $backupPath -Recurse
   Write-Host "Backup creado en: $backupPath"
   ```

3. **Copiar los nuevos archivos:**
   - Copia **TODO el contenido** de la carpeta `dist` (de tu máquina) a:
     ```
     C:\inetpub\wwwroot\ClubSocial
     ```
   - **Reemplaza** todos los archivos existentes
   - Asegúrate de copiar también `web.config` si lo modificaste

4. **Reiniciar el sitio IIS:**
   ```powershell
   Start-Website -Name "ClubSocial"
   ```

### Paso 2: Actualizar el Backend (si hay cambios)

#### 2.1 Si solo cambiaste código (sin nuevas dependencias)

1. **Copiar archivos modificados:**
   - Copia los archivos modificados de `server/src` al servidor:
     ```
     C:\ClubSocial\server\src
     ```

2. **Reiniciar PM2:**
   ```powershell
   cd C:\ClubSocial\server
   pm2 restart ecosystem.config.js
   ```

3. **Verificar que está corriendo:**
   ```powershell
   pm2 list
   pm2 logs --lines 20
   ```

#### 2.2 Si agregaste nuevas dependencias o tablas de base de datos

1. **Copiar archivos:**
   - Copia toda la carpeta `server` actualizada al servidor

2. **Instalar nuevas dependencias:**
   ```powershell
   cd C:\ClubSocial\server
   npm install --production
   ```

3. **Reiniciar PM2:**
   ```powershell
   pm2 restart ecosystem.config.js
   ```

4. **Verificar logs:**
   ```powershell
   pm2 logs --lines 50
   ```
   
   **Nota:** Si agregaste nuevas tablas (como `cajas` y `medios_pago`), el backend las creará automáticamente al iniciar.

### Paso 3: Verificar la Actualización

#### 3.1 Verificar Backend

```powershell
# Verificar que responde
curl http://localhost:4000/api/health

# Ver logs recientes
pm2 logs --lines 20
```

#### 3.2 Verificar Frontend

1. Abre el navegador: `http://tu-servidor` (o el puerto que uses)
2. Presiona `Ctrl + F5` para forzar recarga sin caché
3. Verifica que la nueva versión carga correctamente
4. Prueba las funcionalidades nuevas

#### 3.3 Verificar Funcionalidades Nuevas

Si agregaste nuevas funcionalidades (como Cajas, Medios de Pago, WhatsApp):
- Verifica que aparecen en el menú
- Prueba crear/editar/eliminar registros
- Verifica que los permisos funcionan correctamente

---

## 📋 Checklist de Actualización

- [ ] Frontend compilado con `VITE_API_URL=/api` en `.env`
- [ ] Backup de la versión actual creado
- [ ] Archivos de `dist/` copiados al servidor
- [ ] `web.config` actualizado (si hubo cambios)
- [ ] Archivos del backend copiados (si hubo cambios)
- [ ] Nuevas dependencias instaladas (si las hay)
- [ ] PM2 reiniciado
- [ ] Backend responde correctamente
- [ ] Frontend carga la nueva versión
- [ ] Funcionalidades nuevas probadas

---

## 🔧 Comandos Útiles

### Ver estado de PM2
```powershell
pm2 list
pm2 status
```

### Ver logs en tiempo real
```powershell
pm2 logs
```

### Reiniciar backend
```powershell
cd C:\ClubSocial\server
pm2 restart ecosystem.config.js
```

### Detener/Iniciar sitio IIS
```powershell
Stop-Website -Name "ClubSocial"
Start-Website -Name "ClubSocial"
```

### Verificar que el backend responde
```powershell
curl http://localhost:4000/api/health
```

### Limpiar caché del navegador
- Presiona `Ctrl + Shift + Delete` y limpia la caché
- O presiona `Ctrl + F5` para recargar sin caché

---

## ⚠️ Si algo sale mal

### Restaurar versión anterior

```powershell
# Detener sitio
Stop-Website -Name "ClubSocial"

# Restaurar desde backup
$backupPath = "C:\inetpub\wwwroot\ClubSocial_backup_YYYYMMDD_HHMMSS"
Remove-Item "C:\inetpub\wwwroot\ClubSocial" -Recurse -Force
Copy-Item $backupPath -Destination "C:\inetpub\wwwroot\ClubSocial" -Recurse

# Reiniciar sitio
Start-Website -Name "ClubSocial"
```

### Si el backend no inicia

```powershell
# Ver logs detallados
cd C:\ClubSocial\server
pm2 logs --err --lines 100

# Reiniciar desde cero
pm2 delete ecosystem.config.js
pm2 start ecosystem.config.js
pm2 save
```

### Si hay errores de base de datos

- Verifica que MySQL está corriendo
- Verifica las credenciales en `server/.env`
- Revisa los logs de PM2 para ver el error específico

---

## 🎯 Actualización Rápida (1 minuto)

Si solo actualizaste el frontend:

```powershell
# 1. En tu máquina: npm run build
# 2. Copiar dist/ al servidor
# 3. En el servidor:
Stop-Website -Name "ClubSocial"
# (copiar archivos)
Start-Website -Name "ClubSocial"
```

Si solo actualizaste el backend:

```powershell
# 1. Copiar archivos server/src al servidor
# 2. En el servidor:
cd C:\ClubSocial\server
pm2 restart ecosystem.config.js
```

---

## 📝 Notas Importantes

1. **Siempre haz backup** antes de actualizar
2. **Verifica los logs** después de actualizar
3. **Prueba las funcionalidades** nuevas antes de considerar la actualización completa
4. **Si agregaste nuevas tablas**, el backend las creará automáticamente
5. **Si cambiaste variables de entorno**, actualiza `server/.env` y reinicia PM2

---

¡Listo! Tu aplicación debería estar actualizada. 🚀

