param(
  [string]$ProjectName = "mi-aplicacion",
  [string]$SiteUrl = "",
  [switch]$SkipBuild = $false,
  # Si Hostinger ejecuta npm install en el deploy, NO uses esto (comportamiento por defecto).
  # Activá solo si tu panel no instala dependencias y necesitás subir node_modules en el ZIP.
  [switch]$BundleNodeModules = $false
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "== $msg ==" -ForegroundColor Cyan
}

function Get-AppVersion {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RootDir
  )

  $versionFile = Join-Path $RootDir "src\version.ts"
  if (Test-Path $versionFile) {
    $content = Get-Content -Path $versionFile -Raw
    $match = [regex]::Match($content, "APP_VERSION\s*=\s*'([^']+)'")
    if ($match.Success) {
      return $match.Groups[1].Value
    }
  }

  $pkgFile = Join-Path $RootDir "package.json"
  if (Test-Path $pkgFile) {
    $pkg = Get-Content -Path $pkgFile -Raw | ConvertFrom-Json
    if ($pkg.version) {
      return [string]$pkg.version
    }
  }

  return "0.0.0"
}

function New-DirIfMissing([string]$PathToCreate) {
  if (!(Test-Path $PathToCreate)) {
    New-Item -ItemType Directory -Path $PathToCreate -Force | Out-Null
  }
}

function Remove-IfExists([string]$TargetPath) {
  if (Test-Path $TargetPath) {
    Remove-Item -Path $TargetPath -Recurse -Force
  }
}

function Test-RequiredFiles {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RootDir
  )

  $required = @(
    "server\start.js",
    "server\package.json",
    "server\src\index.js"
  )

  $missing = @()
  foreach ($rel in $required) {
    $full = Join-Path $RootDir $rel
    if (!(Test-Path $full)) {
      $missing += $rel
    }
  }

  if ($missing.Count -gt 0) {
    throw "Faltan archivos obligatorios para deploy: $($missing -join ', ')"
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $projectRoot "server"
$distDir = Join-Path $projectRoot "dist"
$serverPublicDir = Join-Path $serverDir "public"
$deployOutputDir = Join-Path $projectRoot "deploy-output"
$tempBuildRoot = Join-Path $projectRoot ".tmp-hostinger-package"

Test-RequiredFiles -RootDir $projectRoot
New-DirIfMissing -PathToCreate $deployOutputDir

$version = Get-AppVersion -RootDir $projectRoot
$safeProjectName = ($ProjectName -replace '[^a-zA-Z0-9\-_]+', '-').Trim('-')
if ([string]::IsNullOrWhiteSpace($safeProjectName)) {
  $safeProjectName = "proyecto"
}
$zipFileName = "$safeProjectName-v$version-hostinger.zip"
$zipPath = Join-Path $deployOutputDir $zipFileName
$zipBaseName = [System.IO.Path]::GetFileNameWithoutExtension($zipFileName)
$checklistFileName = "$zipBaseName-checklist.md"
$checklistPath = Join-Path $deployOutputDir $checklistFileName
$envTemplateFileName = "$zipBaseName.env.hostinger.template"
$envTemplatePath = Join-Path $deployOutputDir $envTemplateFileName

Write-Step "Preparando deploy Hostinger"
Write-Host "Proyecto: $safeProjectName" -ForegroundColor Green
Write-Host "Version:  $version" -ForegroundColor Green

if (-not $SkipBuild) {
  Write-Step "Build frontend (npm run build)"
  Push-Location $projectRoot
  try {
    npm run build | Out-Host
  } finally {
    Pop-Location
  }
} else {
  Write-Step "Build frontend omitido (SkipBuild)"
}

if (!(Test-Path $distDir)) {
  throw "No existe dist. Ejecuta sin -SkipBuild o verifica el build."
}

Write-Step "Copiando dist a server/public"
New-DirIfMissing -PathToCreate $serverPublicDir
Copy-Item -Path (Join-Path $distDir "*") -Destination $serverPublicDir -Recurse -Force

if ($BundleNodeModules) {
  Write-Step "Instalando dependencias de produccion en server (BundleNodeModules)"
  Push-Location $serverDir
  try {
    npm install --omit=dev | Out-Host
  } finally {
    Pop-Location
  }
} else {
  Write-Step "Omitiendo npm install local (Hostinger instala dependencias en el deploy)"
}

Write-Step "Armando carpeta temporal para ZIP"
Remove-IfExists -TargetPath $tempBuildRoot
New-DirIfMissing -PathToCreate $tempBuildRoot
$tempServerDir = Join-Path $tempBuildRoot "server"
New-DirIfMissing -PathToCreate $tempServerDir

# Copiamos por allowlist para no subir basura (tests, scripts, backups, etc.)
$includeDirs = @(
  "src",
  "public",
  "uploads"
)
if ($BundleNodeModules) {
  $includeDirs += "node_modules"
}

$includeFiles = @(
  "start.js",
  "package.json",
  "package-lock.json",
  "ecosystem.config.js",
  "env.sample"
)

foreach ($dir in $includeDirs) {
  $sourceDir = Join-Path $serverDir $dir
  if (Test-Path $sourceDir) {
    Copy-Item -Path $sourceDir -Destination $tempServerDir -Recurse -Force
  }
}

foreach ($file in $includeFiles) {
  $sourceFile = Join-Path $serverDir $file
  if (Test-Path $sourceFile) {
    Copy-Item -Path $sourceFile -Destination $tempServerDir -Force
  }
}

New-DirIfMissing -PathToCreate (Join-Path $tempServerDir "uploads")
New-DirIfMissing -PathToCreate (Join-Path $tempServerDir "uploads\fotos")
New-DirIfMissing -PathToCreate (Join-Path $tempServerDir "uploads\logo")

Write-Step "Generando ZIP final"
if (Test-Path $zipPath) {
  Remove-Item -Path $zipPath -Force
}
Compress-Archive -Path (Join-Path $tempBuildRoot "server\*") -DestinationPath $zipPath -Force

Write-Step "Generando checklist de deploy"
$corsOriginValue = if ([string]::IsNullOrWhiteSpace($SiteUrl)) { "<tu URL https://...>" } else { $SiteUrl }
if ($BundleNodeModules) {
  $packagingNote = @(
    '- Este ZIP **incluye** la carpeta **node_modules** (parametro -BundleNodeModules). Hostinger puede arrancar sin paso de install si el panel no lo exige.'
  ) -join "`n"
} else {
  $packagingNote = @(
    '- Este ZIP **no incluye** **node_modules**. En la app Node.js de Hostinger configurá el paso de instalación, por ejemplo:',
    '  - **Install command**: npm install --production',
    '  - (Si el panel usa otro nombre, equivalente: instalar dependencias antes de arrancar.)',
    '- Archivo de entrada: start.js (sin cambios).'
  ) -join "`n"
}
$checklistLines = @(
  "# Checklist Deploy Hostinger - $safeProjectName v$version",
  '',
  "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
  '',
  '## Archivo para subir',
  '',
  "- ZIP: $zipFileName",
  "- Ruta local: $zipPath",
  '',
  $packagingNote,
  '',
  '## Configuracion Node.js App (Hostinger)',
  '',
  '- Root directory: server',
  '- Archivo de entrada: start.js',
  '',
  '## Variables obligatorias (copiar y completar)',
  '',
  '```env',
  'NODE_ENV=production',
  'PORT=<puerto asignado por Hostinger>',
  'DB_HOST=<host MySQL Hostinger>',
  'DB_PORT=3306',
  'DB_USER=<usuario>',
  'DB_PASSWORD=<password>',
  'DB_NAME=<base de datos>',
  'JWT_SECRET=<secreto largo>',
  "CORS_ORIGIN=$corsOriginValue",
  '```',
  '',
  '## Variables opcionales (si aplican)',
  '',
  '```env',
  'WHATSAPP_EMBEDDED=true',
  'WHATSAPP_AUTH_FOLDER=<ruta persistente>',
  'WHATSAPP_SERVICE_URL=<si usas microservicio separado>',
  '```',
  '',
  '## Verificacion rapida post deploy',
  '',
  '- [ ] La app inicia sin 502.',
  '- [ ] Responde GET /api/health.',
  '- [ ] Login funciona.',
  '- [ ] Carga datos desde MySQL.',
  '- [ ] Subidas de logo/fotos funcionan (si aplica).',
  '',
  '## Notas',
  '',
  '- No se requieren variables globales del sistema operativo en Windows.',
  '- Todas las variables se configuran dentro de Hostinger (Node.js App).'
)
$checklistContent = $checklistLines -join "`n"

Set-Content -Path $checklistPath -Value $checklistContent -Encoding UTF8

Write-Step "Generando template de variables (.env)"
$envTemplateContent = @"
# Template de variables para Hostinger
# Proyecto: $safeProjectName
# Version: $version
# Generado: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

NODE_ENV=production
PORT=
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
CORS_ORIGIN=$corsOriginValue

# Opcionales (activar segun necesidad)
WHATSAPP_EMBEDDED=true
WHATSAPP_AUTH_FOLDER=
WHATSAPP_SERVICE_URL=
"@
Set-Content -Path $envTemplatePath -Value $envTemplateContent -Encoding UTF8

Write-Step "Checklist para Hostinger"
Write-Host "Subir este archivo ZIP:" -ForegroundColor Yellow
Write-Host "  $zipPath" -ForegroundColor White
Write-Host "Checklist generado:" -ForegroundColor Yellow
Write-Host "  $checklistPath" -ForegroundColor White
Write-Host "Template .env generado:" -ForegroundColor Yellow
Write-Host "  $envTemplatePath" -ForegroundColor White
Write-Host ""
Write-Host "Configurar en Hostinger Node.js App:" -ForegroundColor Yellow
Write-Host "  Root directory: server"
Write-Host "  Archivo de entrada: start.js"
if (-not $BundleNodeModules) {
  Write-Host "  Install command (si el panel lo pide): npm install --production" -ForegroundColor Cyan
} else {
  Write-Host "  Modo BundleNodeModules: el ZIP ya trae node_modules" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Variables de entorno obligatorias:" -ForegroundColor Yellow
$requiredEnv = @(
  "NODE_ENV=production",
  "PORT=<puerto asignado por Hostinger>",
  "DB_HOST=<host MySQL Hostinger>",
  "DB_PORT=3306",
  "DB_USER=<usuario>",
  "DB_PASSWORD=<password>",
  "DB_NAME=<base de datos>",
  "JWT_SECRET=<secreto largo>",
  "CORS_ORIGIN=<tu URL https://...>"
)
$requiredEnv | ForEach-Object { Write-Host "  - $_" }

Write-Host ""
Write-Host "Variables opcionales (solo si aplican):" -ForegroundColor Yellow
$optionalEnv = @(
  "WHATSAPP_EMBEDDED=true",
  "WHATSAPP_AUTH_FOLDER=<ruta persistente>",
  "WHATSAPP_SERVICE_URL=<si usas microservicio separado>"
)
$optionalEnv | ForEach-Object { Write-Host "  - $_" }

if ([string]::IsNullOrWhiteSpace($SiteUrl)) {
  Write-Host ""
  Write-Host "Pendiente: definir SiteUrl para CORS_ORIGIN (ejemplo: https://tudominio.com)." -ForegroundColor Red
} else {
  Write-Host ""
  Write-Host "Sugerencia para CORS_ORIGIN: $SiteUrl" -ForegroundColor Green
}

Write-Host ""
Write-Host "Variables globales del sistema operativo: NO necesarias para este deploy." -ForegroundColor Green
Write-Host "Todo se configura como variables de entorno dentro de Hostinger." -ForegroundColor Green

Write-Step "Limpieza"
Remove-IfExists -TargetPath $tempBuildRoot

Write-Host ""
Write-Host "Deploy package listo." -ForegroundColor Green
