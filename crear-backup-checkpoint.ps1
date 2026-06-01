# Script PowerShell para crear backup completo del Checkpoint V1.0.0
# Ejecutar desde el directorio del proyecto o desde el servidor de producción

param(
    [string]$BackupPath = "C:\backups",
    [string]$Version = "1.0.0",
    [string]$Fecha = (Get-Date -Format 'yyyy-MM-dd')
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CREAR BACKUP CHECKPOINT V$Version" -ForegroundColor Cyan
Write-Host "Fecha: $Fecha" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Crear directorio de backup
$CheckpointDir = Join-Path $BackupPath "checkpoint-v$Version-$Fecha"
Write-Host "[1/7] Creando directorio de backup: $CheckpointDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $CheckpointDir | Out-Null

# Verificar si estamos en desarrollo o producción
$isDevelopment = Test-Path "C:\Users\jnazareno\Desktop\Cursor\server\src"
$isProduction = Test-Path "C:\Clubsocial\server\src"

if ($isDevelopment) {
    Write-Host "[2/7] Modo: DESARROLLO" -ForegroundColor Green
    $devPath = "C:\Users\jnazareno\Desktop\Cursor"
    $prodPath = $null
} elseif ($isProduction) {
    Write-Host "[2/7] Modo: PRODUCCIÓN" -ForegroundColor Green
    $devPath = $null
    $prodPath = "C:\Clubsocial"
} else {
    Write-Host "[ERROR] No se encontró el proyecto en desarrollo ni en producción" -ForegroundColor Red
    exit 1
}

# BACKUP DE CÓDIGO FUENTE
Write-Host "[3/7] Copiando código fuente..." -ForegroundColor Yellow

if ($isDevelopment) {
    # Copiar desde desarrollo
    Write-Host "  - Copiando backend (desarrollo)..." -ForegroundColor Gray
    Copy-Item -Path "$devPath\server\src" -Destination "$CheckpointDir\desarrollo-server-src" -Recurse -Force
    
    Write-Host "  - Copiando frontend (desarrollo)..." -ForegroundColor Gray
    Copy-Item -Path "$devPath\src" -Destination "$CheckpointDir\desarrollo-frontend-src" -Recurse -Force
    
    Write-Host "  - Copiando archivos de configuración..." -ForegroundColor Gray
    Copy-Item -Path "$devPath\package.json" -Destination "$CheckpointDir\" -Force
    Copy-Item -Path "$devPath\server\package.json" -Destination "$CheckpointDir\server-package.json" -Force
    Copy-Item -Path "$devPath\server\ecosystem.config.js" -Destination "$CheckpointDir\" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$devPath\server\backup-config.json" -Destination "$CheckpointDir\" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$devPath\vite.config.ts" -Destination "$CheckpointDir\" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$devPath\tsconfig.json" -Destination "$CheckpointDir\" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$devPath\web.config" -Destination "$CheckpointDir\" -Force -ErrorAction SilentlyContinue
    
    # Copiar frontend compilado si existe
    if (Test-Path "$devPath\dist") {
        Write-Host "  - Copiando frontend compilado..." -ForegroundColor Gray
        Copy-Item -Path "$devPath\dist" -Destination "$CheckpointDir\frontend-dist" -Recurse -Force
    }
}

if ($isProduction) {
    # Copiar desde producción
    Write-Host "  - Copiando backend (producción)..." -ForegroundColor Gray
    Copy-Item -Path "$prodPath\server\src" -Destination "$CheckpointDir\produccion-server-src" -Recurse -Force
    
    Write-Host "  - Copiando frontend (producción)..." -ForegroundColor Gray
    if (Test-Path "C:\inetpub\wwwroot\club-social") {
        Copy-Item -Path "C:\inetpub\wwwroot\club-social" -Destination "$CheckpointDir\produccion-frontend" -Recurse -Force
    }
    
    Write-Host "  - Copiando archivos de configuración..." -ForegroundColor Gray
    Copy-Item -Path "$prodPath\server\package.json" -Destination "$CheckpointDir\server-package.json" -Force
    Copy-Item -Path "$prodPath\server\ecosystem.config.js" -Destination "$CheckpointDir\" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$prodPath\server\backup-config.json" -Destination "$CheckpointDir\" -Force -ErrorAction SilentlyContinue
    
    # Crear .env.example (sin contraseñas)
    if (Test-Path "$prodPath\server\.env") {
        Write-Host "  - Creando .env.example..." -ForegroundColor Gray
        Get-Content "$prodPath\server\.env" | ForEach-Object { 
            if ($_ -match '^([^=]+)=(.+)$') {
                "$($matches[1])=***"
            } else {
                $_
            }
        } | Out-File "$CheckpointDir\.env.example" -Encoding UTF8
    }
}

# BACKUP DE DOCUMENTACIÓN
Write-Host "[4/7] Copiando documentación..." -ForegroundColor Yellow

$docFiles = @(
    "CHECKPOINT_V1.0.0.md",
    "GUIA_ACTUALIZACION_PRODUCCION.md",
    "GUIA_DESPLIEGUE_PRODUCCION.md",
    "CONFIGURAR_CORS_PRODUCCION.md",
    "CREAR_BACKUP_CHECKPOINT.md"
)

foreach ($doc in $docFiles) {
    $docPath = if ($isDevelopment) { "$devPath\$doc" } else { ".\$doc" }
    if (Test-Path $docPath) {
        Copy-Item -Path $docPath -Destination "$CheckpointDir\" -Force -ErrorAction SilentlyContinue
        Write-Host "  - $doc copiado" -ForegroundColor Gray
    }
}

# CREAR ARCHIVO INFO
Write-Host "[5/7] Creando archivo de información..." -ForegroundColor Yellow

$info = @"
CHECKPOINT VERSIÓN $Version
============================
Fecha de creación: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Ubicación: $CheckpointDir

CONTENIDO DEL BACKUP:
- Código fuente del backend
- Frontend compilado (si está disponible)
- Código fuente de desarrollo (si está disponible)
- Archivos de configuración
- Documentación completa

NOTAS:
- Este backup representa el estado estable de la Versión $Version
- Usar para restaurar el proyecto completo si es necesario
- Ver CHECKPOINT_V$Version.md para más detalles

BASE DE DATOS:
- El backup de BD debe crearse por separado
- Usar la funcionalidad de backup de la aplicación o mysqldump

RESTAURACIÓN:
- Ver CREAR_BACKUP_CHECKPOINT.md para instrucciones de restauración
"@

$info | Out-File "$CheckpointDir\INFO-BACKUP.txt" -Encoding UTF8

# COMPRIMIR BACKUP
Write-Host "[6/7] Comprimiendo backup..." -ForegroundColor Yellow

$rarPath = "C:\Program Files\WinRAR\WinRAR.exe"
$zipFile = Join-Path $BackupPath "CHECKPOINT-V$Version-$Fecha.rar"

if (Test-Path $rarPath) {
    Write-Host "  - Usando WinRAR..." -ForegroundColor Gray
    & $rarPath a -r -ep1 -y $zipFile "$CheckpointDir\*" | Out-Null
    Write-Host "  - Backup comprimido: $zipFile" -ForegroundColor Green
} else {
    Write-Host "  - WinRAR no encontrado, usando Compress-Archive..." -ForegroundColor Gray
    $zipFile = Join-Path $BackupPath "CHECKPOINT-V$Version-$Fecha.zip"
    Compress-Archive -Path "$CheckpointDir\*" -DestinationPath $zipFile -Force
    Write-Host "  - Backup comprimido: $zipFile" -ForegroundColor Green
}

# VERIFICAR BACKUP
Write-Host "[7/7] Verificando backup..." -ForegroundColor Yellow

if (Test-Path $zipFile) {
    $size = (Get-Item $zipFile).Length / 1MB
    $sizeRounded = [math]::Round($size, 2)
    $mensajeSize = '  - Tamaño del backup: ' + $sizeRounded.ToString() + ' MB'
    Write-Host $mensajeSize -ForegroundColor Green
    Write-Host "  - Ubicación: $zipFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ BACKUP COMPLETADO EXITOSAMENTE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Archivo creado: $zipFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "PRÓXIMOS PASOS:" -ForegroundColor Cyan
    Write-Host "1. Verificar que el backup se creó correctamente" -ForegroundColor White
    Write-Host "2. Crear backup de base de datos por separado" -ForegroundColor White
    Write-Host "3. Guardar el backup en ubicación segura (disco externo, cloud, etc.)" -ForegroundColor White
    Write-Host "4. Documentar la ubicación del backup" -ForegroundColor White
} else {
    Write-Host "  - ERROR: No se pudo crear el archivo comprimido" -ForegroundColor Red
    exit 1
}

# Preguntar si desea crear backup de BD
Write-Host ""
$crearBD = Read-Host "¿Desea crear backup de base de datos ahora? (S/N)"
if ($crearBD -eq "S" -or $crearBD -eq "s") {
    Write-Host ""
    Write-Host "Creando backup de base de datos..." -ForegroundColor Yellow
    
    $mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
    if (Test-Path $mysqlPath) {
        $dbBackupFile = Join-Path $BackupPath "checkpoint-v$Version-db-$Fecha.sql"
        Write-Host "  - Ejecutando mysqldump..." -ForegroundColor Gray
        Write-Host "  - Ingrese la contraseña de MySQL cuando se solicite" -ForegroundColor Yellow
        
        & $mysqlPath -u root -p club_social | Out-File $dbBackupFile -Encoding UTF8
        
        if (Test-Path $dbBackupFile) {
            $dbSize = (Get-Item $dbBackupFile).Length / 1MB
            $dbSizeRounded = [math]::Round($dbSize, 2)
            $mensaje = '  - Backup de BD creado: ' + $dbBackupFile + ' (' + $dbSizeRounded.ToString() + ' MB)'
            Write-Host $mensaje -ForegroundColor Green
        } else {
            Write-Host "  - ADVERTENCIA: No se pudo crear el backup de BD" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  - ADVERTENCIA: mysqldump no encontrado. Crear backup manualmente." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Proceso completado!" -ForegroundColor Green
