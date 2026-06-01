# 💾 CREAR BACKUP COMPLETO DEL CHECKPOINT V1.0.0
## Guía para crear backup completo del proyecto antes de futuras actualizaciones

---

## 📋 OBJETIVO

Crear un backup completo del proyecto en el estado actual (Versión 1.0.0) para poder:
- Restaurar el proyecto completo si es necesario
- Comparar cambios en futuras versiones
- Tener un punto de referencia estable

---

## 🔧 REQUISITOS

- WinRAR instalado (o herramienta de compresión similar)
- Espacio suficiente en disco (aproximadamente 500MB-1GB)
- Acceso a la base de datos MySQL

---

## 📦 PASO 1: BACKUP DE BASE DE DATOS

### Opción 1: Desde la Aplicación (Recomendado)

1. Abrir la aplicación
2. Ir a **Gestión de Backups**
3. Click en **Ejecutar Backup Manual**
4. Esperar a que se complete
5. El backup se guardará en: `C:\Clubsocial\server\backups\Backup-YYYY-MM-DD\`

### Opción 2: Desde Línea de Comandos

```powershell
# Navegar al directorio de MySQL
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"

# Crear backup
.\mysqldump.exe -u root -p club_social > "C:\backups\checkpoint-v1.0.0-$(Get-Date -Format 'yyyy-MM-dd').sql"

# Ingresar contraseña cuando se solicite
```

---

## 📁 PASO 2: BACKUP DE CÓDIGO FUENTE

### Crear Carpeta de Backup

```powershell
# Crear carpeta para el checkpoint
New-Item -ItemType Directory -Force -Path "C:\backups\checkpoint-v1.0.0-2026-01-07"
```

### Copiar Archivos del Backend

```powershell
# Copiar código fuente del backend
Copy-Item -Path "C:\Clubsocial\server\src" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\server-src" -Recurse

# Copiar archivos de configuración
Copy-Item -Path "C:\Clubsocial\server\package.json" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\"
Copy-Item -Path "C:\Clubsocial\server\ecosystem.config.js" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\"
Copy-Item -Path "C:\Clubsocial\server\backup-config.json" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\" -ErrorAction SilentlyContinue

# Copiar archivo .env (sin contraseñas en texto plano, solo estructura)
Get-Content "C:\Clubsocial\server\.env" | ForEach-Object { $_ -replace '=.*', '=***' } | Out-File "C:\backups\checkpoint-v1.0.0-2026-01-07\.env.example"
```

### Copiar Archivos del Frontend

```powershell
# Copiar frontend compilado
Copy-Item -Path "C:\inetpub\wwwroot\club-social" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\frontend" -Recurse

# Copiar web.config si existe
Copy-Item -Path "C:\inetpub\wwwroot\club-social\web.config" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\" -ErrorAction SilentlyContinue
```

### Copiar Archivos de Desarrollo (Opcional)

Si tienes acceso al código fuente de desarrollo:

```powershell
# Desde tu máquina de desarrollo
# Copiar código fuente completo
Copy-Item -Path "C:\Users\jnazareno\Desktop\Cursor\server\src" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\desarrollo-server-src" -Recurse
Copy-Item -Path "C:\Users\jnazareno\Desktop\Cursor\src" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\desarrollo-frontend-src" -Recurse
Copy-Item -Path "C:\Users\jnazareno\Desktop\Cursor\package.json" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\"
Copy-Item -Path "C:\Users\jnazareno\Desktop\Cursor\server\package.json" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\server-package.json"
Copy-Item -Path "C:\Users\jnazareno\Desktop\Cursor\vite.config.ts" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\" -ErrorAction SilentlyContinue
Copy-Item -Path "C:\Users\jnazareno\Desktop\Cursor\tsconfig.json" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\" -ErrorAction SilentlyContinue
```

---

## 📄 PASO 3: CREAR DOCUMENTACIÓN DEL CHECKPOINT

### Copiar Documentación

```powershell
# Copiar archivos de documentación
Copy-Item -Path "C:\Users\jnazareno\Desktop\Cursor\CHECKPOINT_V1.0.0.md" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\"
Copy-Item -Path "C:\Users\jnazareno\Desktop\Cursor\GUIA_ACTUALIZACION_PRODUCCION.md" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\"
Copy-Item -Path "C:\Users\jnazareno\Desktop\Cursor\GUIA_DESPLIEGUE_PRODUCCION.md" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\"
Copy-Item -Path "C:\Users\jnazareno\Desktop\Cursor\CONFIGURAR_CORS_PRODUCCION.md" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\"
```

---

## 🗜️ PASO 4: COMPRIMIR BACKUP

### Usando WinRAR (Recomendado)

```powershell
# Comprimir todo el checkpoint
& "C:\Program Files\WinRAR\WinRAR.exe" a -r -ep1 "C:\backups\CHECKPOINT-V1.0.0-2026-01-07.rar" "C:\backups\checkpoint-v1.0.0-2026-01-07\*"
```

### Usando PowerShell (Alternativa)

```powershell
# Comprimir usando Compress-Archive
Compress-Archive -Path "C:\backups\checkpoint-v1.0.0-2026-01-07\*" -DestinationPath "C:\backups\CHECKPOINT-V1.0.0-2026-01-07.zip" -Force
```

---

## 📋 PASO 5: VERIFICAR BACKUP

### Verificar Contenido

```powershell
# Listar contenido del backup
Get-ChildItem -Path "C:\backups\checkpoint-v1.0.0-2026-01-07" -Recurse | Select-Object FullName

# Verificar tamaño
$size = (Get-ChildItem -Path "C:\backups\checkpoint-v1.0.0-2026-01-07" -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Host "Tamaño total: $([math]::Round($size/1MB, 2)) MB"
```

### Verificar Archivos Críticos

Asegurarse de que existen:
- ✅ `server-src/` (código fuente del backend)
- ✅ `frontend/` (frontend compilado)
- ✅ `package.json` (dependencias)
- ✅ `ecosystem.config.js` (configuración PM2)
- ✅ `CHECKPOINT_V1.0.0.md` (documentación)
- ✅ Backup de base de datos (si se incluyó)

---

## 📦 ESTRUCTURA DEL BACKUP

```
CHECKPOINT-V1.0.0-2026-01-07.rar
├── server-src/              # Código fuente del backend
│   ├── index.js
│   ├── db.js
│   ├── middleware/
│   ├── routes/
│   └── utils/
├── frontend/                 # Frontend compilado
│   ├── index.html
│   └── assets/
├── desarrollo-server-src/    # Código fuente de desarrollo (opcional)
├── desarrollo-frontend-src/  # Código fuente frontend (opcional)
├── package.json              # Dependencias frontend
├── server-package.json       # Dependencias backend
├── ecosystem.config.js       # Configuración PM2
├── backup-config.json        # Configuración de backups
├── .env.example              # Ejemplo de variables de entorno
├── web.config                # Configuración IIS
├── CHECKPOINT_V1.0.0.md     # Documentación del checkpoint
├── GUIA_ACTUALIZACION_PRODUCCION.md
├── GUIA_DESPLIEGUE_PRODUCCION.md
└── CONFIGURAR_CORS_PRODUCCION.md
```

---

## 🔄 PASO 6: BACKUP ADICIONAL (OPCIONAL)

### Backup de Base de Datos Separado

```powershell
# Crear backup SQL adicional con timestamp
$timestamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
.\mysqldump.exe -u root -p club_social > "C:\backups\checkpoint-v1.0.0-db-$timestamp.sql"
```

### Backup de Archivos Subidos

```powershell
# Si hay fotos de socios importantes
Copy-Item -Path "C:\Clubsocial\server\uploads" -Destination "C:\backups\checkpoint-v1.0.0-2026-01-07\uploads" -Recurse -ErrorAction SilentlyContinue
```

---

## 📝 PASO 7: DOCUMENTAR EL BACKUP

Crear un archivo `INFO-BACKUP.txt` en el backup:

```powershell
$info = @"
CHECKPOINT VERSIÓN 1.0.0
Fecha de creación: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Ubicación: C:\backups\CHECKPOINT-V1.0.0-2026-01-07.rar

CONTENIDO:
- Código fuente del backend (server-src/)
- Frontend compilado (frontend/)
- Código fuente de desarrollo (opcional)
- Configuraciones (package.json, ecosystem.config.js, etc.)
- Documentación completa

NOTAS:
- Este backup representa el estado estable de la Versión 1.0.0
- Usar para restaurar el proyecto completo si es necesario
- Ver CHECKPOINT_V1.0.0.md para más detalles

BASE DE DATOS:
- Backup de BD debe crearse por separado
- Verificar que el backup de BD esté actualizado
"@

$info | Out-File "C:\backups\checkpoint-v1.0.0-2026-01-07\INFO-BACKUP.txt"
```

---

## ✅ CHECKLIST DE BACKUP

- [ ] Backup de base de datos creado
- [ ] Código fuente del backend copiado
- [ ] Frontend compilado copiado
- [ ] Archivos de configuración copiados
- [ ] Documentación copiada
- [ ] Código fuente de desarrollo copiado (opcional)
- [ ] Backup comprimido creado
- [ ] Backup verificado
- [ ] Archivo INFO-BACKUP.txt creado
- [ ] Backup guardado en ubicación segura

---

## 📍 UBICACIÓN RECOMENDADA DEL BACKUP

Guardar el backup en múltiples ubicaciones:

1. **Servidor local**: `C:\backups\CHECKPOINT-V1.0.0-2026-01-07.rar`
2. **Disco externo/USB**: Copiar el archivo .rar
3. **Servidor remoto/Cloud**: Subir el archivo .rar
4. **Repositorio Git**: Si usas Git, crear un tag: `git tag v1.0.0`

---

## 🔄 RESTAURAR DESDE BACKUP

Para restaurar el proyecto desde este backup:

1. **Extraer el archivo RAR/ZIP**
2. **Restaurar código fuente**:
   ```powershell
   Copy-Item -Path "checkpoint-v1.0.0-2026-01-07\server-src\*" -Destination "C:\Clubsocial\server\src\" -Recurse -Force
   ```
3. **Restaurar frontend**:
   ```powershell
   Copy-Item -Path "checkpoint-v1.0.0-2026-01-07\frontend\*" -Destination "C:\inetpub\wwwroot\club-social\" -Recurse -Force
   ```
4. **Restaurar configuraciones**:
   ```powershell
   Copy-Item -Path "checkpoint-v1.0.0-2026-01-07\ecosystem.config.js" -Destination "C:\Clubsocial\server\" -Force
   ```
5. **Restaurar base de datos** (si se incluyó):
   ```powershell
   cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
   .\mysql.exe -u root -p club_social < "ruta\al\backup.sql"
   ```
6. **Reiniciar servicios**:
   ```powershell
   pm2 restart club-social-api
   iisreset
   ```

---

## 📅 FECHA DE CREACIÓN

**Checkpoint creado**: 2026-01-07  
**Versión**: 1.0.0  
**Estado**: ✅ Estable y probado

---

**¡Backup del Checkpoint V1.0.0 completado! 💾**

