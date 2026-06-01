# Script de Actualización Segura para Producción
# Este script actualiza el codigo sin tocar los datos de produccion
# IMPORTANTE: No copia datos de desarrollo, solo actualiza codigo

param(
    [string]$FrontendPath = "",
    [string]$BackendPath = "",
    [string]$BackupDbPath = "C:\Backups\ClubSocial",
    [switch]$Backup = $true,
    [switch]$SkipBackend = $false,
    [switch]$SkipDatabase = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ACTUALIZACIÓN SEGURA DE PRODUCCIÓN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script actualizara SOLO el codigo." -ForegroundColor Yellow
Write-Host "NO se modificaran ni borraran datos existentes." -ForegroundColor Yellow
Write-Host "NO se copiaran datos de desarrollo." -ForegroundColor Yellow
Write-Host ""

# Verificar que se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host "Clic derecho en PowerShell -> Ejecutar como administrador" -ForegroundColor Yellow
    exit 1
}

# Configuracion
# Intentar detectar el nombre del sitio basado en la ruta
$SitePath = "C:\inetpub\wwwroot\ClubSocial"
# Si la ruta no existe, intentar con minusculas
if (-not (Test-Path $SitePath)) {
    $SitePath = "C:\inetpub\wwwroot\clubsocial"
}
# Detectar el nombre del sitio basado en la carpeta
$SiteFolderName = Split-Path $SitePath -Leaf
$SiteName = $SiteFolderName

# Intentar encontrar el sitio en IIS
$iisSite = Get-Website | Where-Object { $_.PhysicalPath -eq $SitePath -or $_.PhysicalPath -eq $SitePath.Replace('\', '/') } | Select-Object -First 1
if ($iisSite) {
    $SiteName = $iisSite.Name
    Write-Host "Sitio IIS detectado: $SiteName" -ForegroundColor Cyan
} else {
    Write-Host "ADVERTENCIA: No se encontro sitio IIS para la ruta: $SitePath" -ForegroundColor Yellow
    Write-Host "  Usando nombre por defecto: $SiteName" -ForegroundColor Yellow
    Write-Host "  Si el sitio tiene otro nombre, actualiza la variable `$SiteName en el script" -ForegroundColor Yellow
}

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

# Confirmación
Write-Host "Estas seguro de continuar con la actualizacion?" -ForegroundColor Yellow
$confirmacion = Read-Host "Escribe 'SI' para continuar"
if ($confirmacion -ne "SI") {
    Write-Host "Actualizacion cancelada." -ForegroundColor Yellow
    exit 0
}

# ============================================
# PASO 1: BACKUP DE BASE DE DATOS
# ============================================
if (-not $SkipDatabase -and $Backup) {
    Write-Host "=== PASO 1: BACKUP DE BASE DE DATOS ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Leer configuracion de base de datos desde .env de produccion
    $envFile = Join-Path $ServerPath ".env"
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile
        $dbConfig = @{}
        foreach ($line in $envContent) {
            if ($line -match "^([^=]+)=(.*)$") {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                $dbConfig[$key] = $value
            }
        }
        
        $dbName = $dbConfig["DB_NAME"]
        $dbUser = $dbConfig["DB_USER"]
        $dbPassword = $dbConfig["DB_PASSWORD"]
        $dbHost = if ($dbConfig["DB_HOST"]) { $dbConfig["DB_HOST"] } else { "localhost" }
        $dbPort = if ($dbConfig["DB_PORT"]) { $dbConfig["DB_PORT"] } else { "3306" }
        
        if ($dbName -and $dbUser -and $dbPassword) {
            Write-Host "Creando backup de la base de datos..." -ForegroundColor Yellow
            
            # Crear carpeta de backups si no existe
            if (-not (Test-Path $BackupDbPath)) {
                New-Item -ItemType Directory -Path $BackupDbPath -Force | Out-Null
            }
            
            $backupFileName = "backup_$dbName_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
            $backupFilePath = Join-Path $BackupDbPath $backupFileName
            
            # Verificar si mysqldump está disponible
            $mysqldumpPath = "mysqldump"
            try {
                $null = Get-Command mysqldump -ErrorAction Stop
            } catch {
                Write-Host "ADVERTENCIA: mysqldump no está en el PATH" -ForegroundColor Yellow
                Write-Host "Buscaré en ubicaciones comunes..." -ForegroundColor Yellow
                
                $commonPaths = @(
                    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
                    "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysqldump.exe",
                    "C:\Program Files\MySQL\MySQL Server 8.2\bin\mysqldump.exe",
                    "C:\xampp\mysql\bin\mysqldump.exe"
                )
                
                $found = $false
                foreach ($path in $commonPaths) {
                    if (Test-Path $path) {
                        $mysqldumpPath = $path
                        $found = $true
                        break
                    }
                }
                
                if (-not $found) {
                    Write-Host "ERROR: No se encontro mysqldump" -ForegroundColor Red
                    Write-Host "El backup de base de datos se omitira" -ForegroundColor Yellow
                    $SkipDatabase = $true
                }
            }
            
            if (-not $SkipDatabase) {
                try {
                    $env:Path = $env:Path
                    & $mysqldumpPath -h $dbHost -P $dbPort -u $dbUser -p"$dbPassword" --single-transaction --routines --triggers $dbName | Out-File -FilePath $backupFilePath -Encoding UTF8
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "Backup de base de datos creado: $backupFilePath" -ForegroundColor Green
                    } else {
                        Write-Host "ADVERTENCIA: Error al crear backup de base de datos" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "ADVERTENCIA: Error al crear backup: $_" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "ADVERTENCIA: No se pudo leer la configuracion de base de datos" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ADVERTENCIA: No se encontro archivo .env en produccion" -ForegroundColor Yellow
    }
    Write-Host ""
}

# ============================================
# PASO 2: BACKUP DE ARCHIVOS
# ============================================
if ($Backup) {
    Write-Host "=== PASO 2: BACKUP DE ARCHIVOS ===" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Creando backup de la version actual..." -ForegroundColor Yellow
    $backupPath = "${SitePath}_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    if (Test-Path $SitePath) {
        Copy-Item $SitePath -Destination $backupPath -Recurse -Force
        Write-Host "Backup creado en: $backupPath" -ForegroundColor Green
    } else {
        Write-Host "ADVERTENCIA: No se encontro el sitio para hacer backup" -ForegroundColor Yellow
    }
    
    if (-not $SkipBackend -and (Test-Path $ServerPath)) {
        $backupBackendPath = "${ServerPath}_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item $ServerPath -Destination $backupBackendPath -Recurse -Force -Exclude "node_modules"
        Write-Host "Backup del backend creado en: $backupBackendPath" -ForegroundColor Green
    }
    Write-Host ""
}

# ============================================
# PASO 3: ACTUALIZAR FRONTEND
# ============================================
Write-Host "=== PASO 3: ACTUALIZAR FRONTEND ===" -ForegroundColor Cyan
Write-Host ""

# Detener sitio temporalmente
Write-Host "Deteniendo sitio IIS..." -ForegroundColor Yellow
try {
    $site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
    if ($site) {
        if ($site.State -eq "Started") {
            Stop-Website -Name $SiteName -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Write-Host "Sitio detenido" -ForegroundColor Green
        } else {
            Write-Host "Sitio ya estaba detenido" -ForegroundColor Green
        }
    } else {
        Write-Host "ADVERTENCIA: El sitio '$SiteName' no existe en IIS" -ForegroundColor Yellow
        Write-Host "  Continuando sin detener el sitio..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "ADVERTENCIA: No se pudo detener el sitio (puede que no este corriendo)" -ForegroundColor Yellow
}

# Verificar que existe la carpeta del sitio
if (-not (Test-Path $SitePath)) {
    Write-Host "Creando carpeta del sitio..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $SitePath -Force | Out-Null
}

# Copiar archivos del frontend (SOLO codigo, NO datos)
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
    $webConfigDest = Join-Path $SitePath "web.config"
    # Solo copiar si el archivo origen es diferente al destino
    if ($webConfigSource -ne $webConfigDest) {
        Copy-Item $webConfigSource -Destination $webConfigDest -Force
        Write-Host "  web.config actualizado" -ForegroundColor Green
    } else {
        Write-Host "  web.config ya esta en su ubicacion correcta" -ForegroundColor Green
    }
} else {
    Write-Host "  ADVERTENCIA: No se encontro web.config" -ForegroundColor Yellow
}

# Reiniciar sitio
Write-Host "Reiniciando sitio IIS..." -ForegroundColor Yellow
try {
    $site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
    if ($site) {
        if ($site.State -eq "Stopped") {
            Start-Website -Name $SiteName
            Write-Host "Sitio iniciado" -ForegroundColor Green
        } else {
            Write-Host "Sitio ya esta corriendo" -ForegroundColor Green
        }
    } else {
        Write-Host "ADVERTENCIA: El sitio '$SiteName' no existe en IIS" -ForegroundColor Yellow
        Write-Host "  Puede que el sitio tenga un nombre diferente" -ForegroundColor Yellow
        Write-Host "  Verifica el nombre del sitio en el Administrador de IIS" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ADVERTENCIA: Error al reiniciar el sitio: $_" -ForegroundColor Yellow
    Write-Host "  Inicia el sitio manualmente desde el Administrador de IIS" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2
Write-Host "Frontend actualizado correctamente" -ForegroundColor Green
Write-Host ""

# ============================================
# PASO 4: ACTUALIZAR BACKEND (SOLO CODIGO)
# ============================================
if (-not $SkipBackend -and $BackendPath -ne "") {
    Write-Host "=== PASO 4: ACTUALIZAR BACKEND (SOLO CODIGO) ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANTE: Solo se actualizara el codigo fuente" -ForegroundColor Yellow
    Write-Host "NO se tocara el archivo .env (mantiene configuracion de produccion)" -ForegroundColor Yellow
    Write-Host "NO se copiaran datos de desarrollo" -ForegroundColor Yellow
    Write-Host ""
    
    # Verificar PM2
    try {
        pm2 list 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ADVERTENCIA: PM2 no está instalado o no está en el PATH" -ForegroundColor Yellow
            Write-Host "El backend no se actualizará automáticamente" -ForegroundColor Yellow
        } else {
            # Copiar SOLO codigo fuente (no .env, no node_modules, no uploads)
            Write-Host "Copiando codigo fuente del backend..." -ForegroundColor Yellow
            
            # Copiar src
            $srcSource = Join-Path $BackendPath "src"
            $srcDest = Join-Path $ServerPath "src"
            
            if (Test-Path $srcSource) {
                if (Test-Path $srcDest) {
                    Remove-Item $srcDest -Recurse -Force
                }
                Copy-Item $srcSource -Destination $srcDest -Recurse -Force
                Write-Host "  Codigo fuente (src/) actualizado" -ForegroundColor Green
            }
            
            # Copiar package.json (para verificar dependencias)
            $packageSource = Join-Path $BackendPath "package.json"
            $packageDest = Join-Path $ServerPath "package.json"
            if (Test-Path $packageSource) {
                # Leer package.json de desarrollo
                $devPackage = Get-Content $packageSource | ConvertFrom-Json
                # Leer package.json de producción
                if (Test-Path $packageDest) {
                    $prodPackage = Get-Content $packageDest | ConvertFrom-Json
                    
                    # Comparar dependencias
                    $depsChanged = $false
                    foreach ($dep in $devPackage.dependencies.PSObject.Properties) {
                        if (-not $prodPackage.dependencies -or 
                            -not $prodPackage.dependencies.$($dep.Name) -or 
                            $prodPackage.dependencies.$($dep.Name) -ne $dep.Value) {
                            $depsChanged = $true
                            break
                        }
                    }
                    
                    if ($depsChanged) {
                        Write-Host "  Detectadas nuevas dependencias, actualizando package.json..." -ForegroundColor Yellow
                        Copy-Item $packageSource -Destination $packageDest -Force
                    } else {
                        Write-Host "  package.json sin cambios" -ForegroundColor Green
                    }
                } else {
                    Copy-Item $packageSource -Destination $packageDest -Force
                    Write-Host "  package.json actualizado" -ForegroundColor Green
                }
            }
            
            # Copiar ecosystem.config.js si existe
            $ecosystemSource = Join-Path $BackendPath "ecosystem.config.js"
            $ecosystemDest = Join-Path $ServerPath "ecosystem.config.js"
            if (Test-Path $ecosystemSource) {
                Copy-Item $ecosystemSource -Destination $ecosystemDest -Force
                Write-Host "  ecosystem.config.js actualizado" -ForegroundColor Green
            }
            
            # NO copiar .env (mantener el de producción)
            Write-Host "  .env de produccion preservado (NO se copio desde desarrollo)" -ForegroundColor Green
            
            # NO copiar uploads (mantener archivos de produccion)
            Write-Host "  Archivos uploads/ de produccion preservados" -ForegroundColor Green
            
            # Verificar si hay nuevas dependencias
            Write-Host "Verificando dependencias..." -ForegroundColor Yellow
            Set-Location $ServerPath
            npm install --production --no-save
            Write-Host "  Dependencias verificadas" -ForegroundColor Green
            
            # Reiniciar PM2
            Write-Host "Reiniciando backend con PM2..." -ForegroundColor Yellow
            pm2 restart ecosystem.config.js
            pm2 save
            Start-Sleep -Seconds 3
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

# ============================================
# PASO 5: VERIFICACIÓN
# ============================================
Write-Host ""
Write-Host "=== PASO 5: VERIFICACIÓN ===" -ForegroundColor Cyan
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
if (-not $SkipBackend) {
    Write-Host "Verificando backend..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/auth/me" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 401) {
            Write-Host "Backend: Respondiendo correctamente" -ForegroundColor Green
        } else {
            Write-Host "Backend: Error en la respuesta (Status: $($response.StatusCode))" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Backend: No responde aún (puede estar iniciando, espera unos segundos)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ACTUALIZACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "RESUMEN:" -ForegroundColor Cyan
Write-Host "  Codigo actualizado" -ForegroundColor Green
Write-Host "  Datos de produccion preservados" -ForegroundColor Green
Write-Host "  Configuracion de produccion preservada (.env)" -ForegroundColor Green
Write-Host "  Archivos de produccion preservados (uploads/)" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Abre el navegador: http://tu-servidor" -ForegroundColor White
Write-Host "2. Presiona Ctrl+F5 para forzar recarga sin cache" -ForegroundColor White
Write-Host "3. Verifica que la nueva version carga correctamente" -ForegroundColor White
Write-Host "4. Prueba las funcionalidades nuevas" -ForegroundColor White
Write-Host "5. Verifica que los datos existentes siguen presentes" -ForegroundColor White
Write-Host ""
Write-Host "Si hay problemas:" -ForegroundColor Yellow
Write-Host "  - Revisa los logs: pm2 logs" -ForegroundColor White
Write-Host "  - Restaura el backup si es necesario" -ForegroundColor White
Write-Host ""

