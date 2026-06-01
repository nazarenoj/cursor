# Script de Actualización para Producción
# Ejecutar en el servidor como Administrador

param(
    [string]$FrontendPath = "",
    [string]$BackendPath = "",
    [switch]$Backup = $true,
    [switch]$SkipBackend = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ACTUALIZAR APLICACIÓN EN PRODUCCIÓN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host "Clic derecho en PowerShell -> Ejecutar como administrador" -ForegroundColor Yellow
    exit 1
}

# Configuración
$SiteName = "ClubSocial"
$SitePath = "C:\inetpub\wwwroot\ClubSocial"
$ServerPath = "C:\ClubSocial\server"
$BackendPort = 4000

# Verificar rutas
if ($FrontendPath -eq "") {
    $FrontendPath = Read-Host "Ingresa la ruta de la carpeta 'dist' del frontend compilado"
}

if (-not (Test-Path $FrontendPath)) {
    Write-Host "ERROR: No se encuentra la carpeta del frontend: $FrontendPath" -ForegroundColor Red
    exit 1
}

if (-not $SkipBackend) {
    if ($BackendPath -eq "") {
        $BackendPath = Read-Host "Ingresa la ruta de la carpeta 'server' del backend (Enter para omitir)"
    }
    
    if ($BackendPath -ne "" -and -not (Test-Path $BackendPath)) {
        Write-Host "ERROR: No se encuentra la carpeta del backend: $BackendPath" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Configuración:" -ForegroundColor Cyan
Write-Host "  Frontend: $FrontendPath" -ForegroundColor White
if (-not $SkipBackend) {
    Write-Host "  Backend: $BackendPath" -ForegroundColor White
}
Write-Host "  Sitio IIS: $SiteName" -ForegroundColor White
Write-Host "  Ruta sitio: $SitePath" -ForegroundColor White
Write-Host ""

# Crear backup si está habilitado
if ($Backup) {
    Write-Host "Creando backup de la versión actual..." -ForegroundColor Yellow
    $backupPath = "$SitePath_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    if (Test-Path $SitePath) {
        Copy-Item $SitePath -Destination $backupPath -Recurse -Force
        Write-Host "Backup creado en: $backupPath" -ForegroundColor Green
    } else {
        Write-Host "ADVERTENCIA: No se encontró el sitio para hacer backup" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Actualizar Frontend
Write-Host "=== ACTUALIZANDO FRONTEND ===" -ForegroundColor Cyan
Write-Host ""

# Detener sitio temporalmente
Write-Host "Deteniendo sitio IIS..." -ForegroundColor Yellow
try {
    Stop-Website -Name $SiteName -ErrorAction SilentlyContinue
    Write-Host "Sitio detenido" -ForegroundColor Green
} catch {
    Write-Host "ADVERTENCIA: No se pudo detener el sitio (puede que no esté corriendo)" -ForegroundColor Yellow
}

# Verificar que existe la carpeta del sitio
if (-not (Test-Path $SitePath)) {
    Write-Host "Creando carpeta del sitio..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $SitePath -Force | Out-Null
}

# Copiar archivos del frontend
Write-Host "Copiando archivos del frontend..." -ForegroundColor Yellow
$items = Get-ChildItem -Path $FrontendPath
foreach ($item in $items) {
    $destPath = Join-Path $SitePath $item.Name
    if (Test-Path $destPath) {
        Remove-Item $destPath -Recurse -Force
    }
    Copy-Item $item.FullName -Destination $destPath -Recurse -Force
    Write-Host "  Copiado: $($item.Name)" -ForegroundColor Green
}

# Verificar web.config
$webConfigSource = Join-Path (Split-Path $FrontendPath -Parent) "web.config"
if (-not (Test-Path $webConfigSource)) {
    $webConfigSource = Join-Path $PSScriptRoot "web.config"
}

if (Test-Path $webConfigSource) {
    Copy-Item $webConfigSource -Destination (Join-Path $SitePath "web.config") -Force
    Write-Host "  web.config actualizado" -ForegroundColor Green
} else {
    Write-Host "  ADVERTENCIA: No se encontró web.config" -ForegroundColor Yellow
}

# Reiniciar sitio
Write-Host "Reiniciando sitio IIS..." -ForegroundColor Yellow
Start-Website -Name $SiteName
Write-Host "Frontend actualizado correctamente" -ForegroundColor Green
Write-Host ""

# Actualizar Backend (si se especificó)
if (-not $SkipBackend -and $BackendPath -ne "") {
    Write-Host "=== ACTUALIZANDO BACKEND ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar PM2
    try {
        $pm2Check = pm2 list 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ADVERTENCIA: PM2 no está instalado o no está en el PATH" -ForegroundColor Yellow
            Write-Host "El backend no se actualizará automáticamente" -ForegroundColor Yellow
        } else {
            # Copiar archivos del backend
            Write-Host "Copiando archivos del backend..." -ForegroundColor Yellow
            
            # Copiar solo src (no node_modules ni .env)
            $srcSource = Join-Path $BackendPath "src"
            $srcDest = Join-Path $ServerPath "src"
            
            if (Test-Path $srcSource) {
                if (Test-Path $srcDest) {
                    Remove-Item $srcDest -Recurse -Force
                }
                Copy-Item $srcSource -Destination $srcDest -Recurse -Force
                Write-Host "  Código fuente actualizado" -ForegroundColor Green
            }
            
            # Copiar package.json si cambió
            $packageSource = Join-Path $BackendPath "package.json"
            $packageDest = Join-Path $ServerPath "package.json"
            if (Test-Path $packageSource) {
                Copy-Item $packageSource -Destination $packageDest -Force
                Write-Host "  package.json actualizado" -ForegroundColor Green
            }
            
            # Verificar si hay nuevas dependencias
            Write-Host "Verificando dependencias..." -ForegroundColor Yellow
            Set-Location $ServerPath
            npm install --production
            Write-Host "  Dependencias actualizadas" -ForegroundColor Green
            
            # Reiniciar PM2
            Write-Host "Reiniciando backend con PM2..." -ForegroundColor Yellow
            pm2 restart ecosystem.config.js
            pm2 save
            Write-Host "Backend actualizado y reiniciado" -ForegroundColor Green
            Write-Host ""
            
            # Mostrar estado
            Write-Host "Estado de PM2:" -ForegroundColor Cyan
            pm2 list
        }
    } catch {
        Write-Host "ADVERTENCIA: Error al actualizar el backend: $_" -ForegroundColor Yellow
        Write-Host "Actualiza manualmente ejecutando:" -ForegroundColor Yellow
        Write-Host "  cd $ServerPath" -ForegroundColor White
        Write-Host "  npm install --production" -ForegroundColor White
        Write-Host "  pm2 restart ecosystem.config.js" -ForegroundColor White
    }
}

# Verificación
Write-Host ""
Write-Host "=== VERIFICACIÓN ===" -ForegroundColor Cyan
Write-Host ""

# Verificar sitio IIS
$site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if ($site) {
    $status = if ($site.State -eq "Started") { "Corriendo" } else { "Detenido" }
    Write-Host "Sitio IIS: $status" -ForegroundColor $(if ($site.State -eq "Started") { "Green" } else { "Yellow" })
} else {
    Write-Host "ADVERTENCIA: Sitio IIS no encontrado" -ForegroundColor Yellow
}

# Verificar backend
Write-Host "Verificando backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "Backend: Respondiendo correctamente" -ForegroundColor Green
    } else {
        Write-Host "Backend: Error en la respuesta" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Backend: No responde (puede estar iniciando)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ACTUALIZACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Abre el navegador: http://tu-servidor" -ForegroundColor White
Write-Host "2. Presiona Ctrl+F5 para forzar recarga sin caché" -ForegroundColor White
Write-Host "3. Verifica que la nueva versión carga correctamente" -ForegroundColor White
Write-Host "4. Prueba las funcionalidades nuevas" -ForegroundColor White
Write-Host ""
Write-Host "Si hay problemas, revisa los logs:" -ForegroundColor Yellow
Write-Host "  pm2 logs" -ForegroundColor White
Write-Host ""

