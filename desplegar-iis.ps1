# Script de despliegue para IIS
# Ejecutar como Administrador

Write-Host "=== Script de Despliegue - Club Social Realicó ===" -ForegroundColor Green
Write-Host ""

# Verificar que se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host "Clic derecho en PowerShell -> Ejecutar como administrador" -ForegroundColor Yellow
    exit 1
}

# Variables de configuración
$SiteName = "ClubSocial"
$SitePath = "C:\inetpub\wwwroot\ClubSocial"
$ServerPath = "C:\ClubSocial\server"
$BackendPort = 4000

Write-Host "Configuración:" -ForegroundColor Cyan
Write-Host "  Nombre del sitio: $SiteName"
Write-Host "  Ruta del sitio: $SitePath"
Write-Host "  Ruta del backend: $ServerPath"
Write-Host "  Puerto del backend: $BackendPort"
Write-Host ""

# Verificar si IIS está instalado
Write-Host "Verificando IIS..." -ForegroundColor Yellow
$iisFeature = Get-WindowsFeature -Name Web-Server
if (-not $iisFeature.Installed) {
    Write-Host "IIS no está instalado. Instalando..." -ForegroundColor Yellow
    Install-WindowsFeature -Name Web-Server -IncludeManagementTools
    Write-Host "IIS instalado correctamente" -ForegroundColor Green
} else {
    Write-Host "IIS ya está instalado" -ForegroundColor Green
}

# Verificar si Node.js está instalado
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js no está instalado" -ForegroundColor Red
    Write-Host "Descarga Node.js desde: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Crear carpetas si no existen
Write-Host "Creando carpetas..." -ForegroundColor Yellow
if (-not (Test-Path $SitePath)) {
    New-Item -ItemType Directory -Path $SitePath -Force | Out-Null
    Write-Host "Carpeta del sitio creada: $SitePath" -ForegroundColor Green
}

if (-not (Test-Path $ServerPath)) {
    New-Item -ItemType Directory -Path $ServerPath -Force | Out-Null
    Write-Host "Carpeta del backend creada: $ServerPath" -ForegroundColor Green
}

# Verificar si el sitio existe
Write-Host "Verificando sitio IIS..." -ForegroundColor Yellow
$site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue

if ($site) {
    Write-Host "El sitio '$SiteName' ya existe" -ForegroundColor Yellow
    $response = Read-Host "¿Deseas eliminarlo y recrearlo? (S/N)"
    if ($response -eq "S" -or $response -eq "s") {
        Remove-Website -Name $SiteName
        Write-Host "Sitio eliminado" -ForegroundColor Green
    } else {
        Write-Host "Manteniendo el sitio existente" -ForegroundColor Yellow
    }
}

# Crear el sitio si no existe
if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
    Write-Host "Creando sitio IIS..." -ForegroundColor Yellow
    New-Website -Name $SiteName -PhysicalPath $SitePath -Port 80
    Write-Host "Sitio creado correctamente" -ForegroundColor Green
}

# Verificar módulos de IIS
Write-Host "Verificando módulos de IIS..." -ForegroundColor Yellow
$modules = @("ApplicationRequestRouting", "RewriteModule")

foreach ($module in $modules) {
    $modulePath = "C:\Windows\System32\inetsrv\$module.dll"
    if (-not (Test-Path $modulePath)) {
        Write-Host "ADVERTENCIA: Módulo $module no encontrado" -ForegroundColor Yellow
        Write-Host "  Descarga desde:" -ForegroundColor Yellow
        if ($module -eq "ApplicationRequestRouting") {
            Write-Host "  https://www.iis.net/downloads/microsoft/application-request-routing" -ForegroundColor Cyan
        } elseif ($module -eq "RewriteModule") {
            Write-Host "  https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Cyan
        }
    } else {
        Write-Host "Módulo $module encontrado" -ForegroundColor Green
    }
}

# Verificar PM2
Write-Host "Verificando PM2..." -ForegroundColor Yellow
try {
    $pm2Version = pm2 --version
    Write-Host "PM2 instalado: v$pm2Version" -ForegroundColor Green
} catch {
    Write-Host "PM2 no está instalado. Instalando..." -ForegroundColor Yellow
    npm install -g pm2
    Write-Host "PM2 instalado correctamente" -ForegroundColor Green
}

# Verificar archivo .env del backend
Write-Host "Verificando configuración del backend..." -ForegroundColor Yellow
$envFile = Join-Path $ServerPath ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "ADVERTENCIA: Archivo .env no encontrado en $ServerPath" -ForegroundColor Yellow
    Write-Host "Crea el archivo .env con las siguientes variables:" -ForegroundColor Yellow
    Write-Host "  PORT=$BackendPort" -ForegroundColor Cyan
    Write-Host "  CORS_ORIGIN=http://tu-servidor" -ForegroundColor Cyan
    Write-Host "  DB_HOST=localhost" -ForegroundColor Cyan
    Write-Host "  DB_PORT=3306" -ForegroundColor Cyan
    Write-Host "  DB_USER=root" -ForegroundColor Cyan
    Write-Host "  DB_PASSWORD=tu_password" -ForegroundColor Cyan
    Write-Host "  DB_NAME=club_social" -ForegroundColor Cyan
    Write-Host "  JWT_SECRET=tu_secret_key_segura" -ForegroundColor Cyan
} else {
    Write-Host "Archivo .env encontrado" -ForegroundColor Green
}

# Resumen
Write-Host ""
Write-Host "=== Resumen ===" -ForegroundColor Green
Write-Host "Sitio IIS: $SiteName"
Write-Host "Ruta física: $SitePath"
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Copia los archivos compilados (dist) a: $SitePath" -ForegroundColor Cyan
Write-Host "2. Copia la carpeta 'server' a: $ServerPath" -ForegroundColor Cyan
Write-Host "3. Instala dependencias del backend: cd $ServerPath && npm install --production" -ForegroundColor Cyan
Write-Host "4. Crea el archivo .env en $ServerPath" -ForegroundColor Cyan
Write-Host "5. Inicia el backend: cd $ServerPath && pm2 start ecosystem.config.js" -ForegroundColor Cyan
Write-Host "6. Verifica el sitio: http://localhost" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para más detalles, consulta: GUIA_DESPLIEGUE_IIS.md" -ForegroundColor Green

