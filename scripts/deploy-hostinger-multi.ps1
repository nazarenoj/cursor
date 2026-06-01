param(
  [switch]$DoFtpUpload = $false,
  [string]$FtpConfigPath = "scripts\\hostinger-instances-ftp.json"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DeployOutputDir = Join-Path $ProjectRoot "deploy-output"

if (!(Test-Path $DeployOutputDir)) {
  New-Item -ItemType Directory -Force -Path $DeployOutputDir | Out-Null
}

function New-Timestamp {
  return (Get-Date -Format "yyyyMMdd-HHmmss")
}

function Copy-FrontendToServerPublic {
  $serverPublicDir = Join-Path $ProjectRoot "server\\public"
  if (!(Test-Path $serverPublicDir)) {
    New-Item -ItemType Directory -Force -Path $serverPublicDir | Out-Null
  }

  $distDir = Join-Path $ProjectRoot "dist"
  if (!(Test-Path $distDir)) {
    throw "No existe carpeta dist. Ejecuta primero: npm run build"
  }

  Copy-Item -Path (Join-Path $distDir "*") -Destination $serverPublicDir -Recurse -Force
}

function Ensure-NodeModulesProduction {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Dir
  )

  Set-Location $Dir
  npm install --production | Out-Host
}

function Zip-Folder {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FolderToZip,
    [Parameter(Mandatory = $true)]
    [string]$ZipPath
  )

  if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
  }

  Compress-Archive -Path $FolderToZip -DestinationPath $ZipPath -Force
}

function Upload-FtpFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Host,
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [Parameter(Mandatory = $true)]
    [string]$User,
    [Parameter(Mandatory = $true)]
    [string]$Password,
    [Parameter(Mandatory = $true)]
    [string]$RemoteDir,
    [Parameter(Mandatory = $true)]
    [string]$LocalFilePath,
    [Parameter(Mandatory = $true)]
    [string]$RemoteFileName
  )

  # RemoteDir puede venir como "/carpeta" o "carpeta". Normalizamos a sin barra final.
  $remoteDirNormalized = $RemoteDir.Trim().TrimEnd('/')
  if ([string]::IsNullOrWhiteSpace($remoteDirNormalized)) {
    $remoteDirNormalized = ""
  }

  $remoteUri = "ftp://$Host`:$Port/"
  if ($remoteDirNormalized -ne "") {
    $remoteUri += "$remoteDirNormalized/"
  }
  $remoteUri += $RemoteFileName

  $uri = [Uri]$remoteUri

  $request = [System.Net.FtpWebRequest]::Create($uri)
  $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
  $request.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
  $request.UseBinary = $true
  $request.KeepAlive = $false

  $fileStream = [System.IO.File]::OpenRead($LocalFilePath)
  try {
    $request.ContentLength = $fileStream.Length
    $requestStream = $request.GetRequestStream()
    try {
      $buffer = New-Object byte[] 8192
      while (($read = $fileStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
        $requestStream.Write($buffer, 0, $read)
      }
    } finally {
      $requestStream.Close()
    }
    $response = $request.GetResponse()
    $response.Close()
  } finally {
    $fileStream.Close()
  }
}

$ts = New-Timestamp
$serverZipPath = Join-Path $DeployOutputDir ("hostinger-server-$ts.zip")
$whatsappZipPath = Join-Path $DeployOutputDir ("hostinger-whatsapp-service-$ts.zip")

Write-Host "== Build una sola vez (frontend) ==" -ForegroundColor Cyan
Set-Location $ProjectRoot
npm run build | Out-Host

Write-Host "== Copiar dist a server/public ==" -ForegroundColor Cyan
Copy-FrontendToServerPublic

Write-Host "== Instalar dependencias production (server) ==" -ForegroundColor Cyan
Ensure-NodeModulesProduction -Dir (Join-Path $ProjectRoot "server")

Write-Host "== Instalar dependencias production (whatsapp-service) ==" -ForegroundColor Cyan
Ensure-NodeModulesProduction -Dir (Join-Path $ProjectRoot "whatsapp-service")

Write-Host "== Generar ZIP (server) ==" -ForegroundColor Cyan
Zip-Folder -FolderToZip (Join-Path $ProjectRoot "server") -ZipPath $serverZipPath

Write-Host "== Generar ZIP (whatsapp-service) ==" -ForegroundColor Cyan
Zip-Folder -FolderToZip (Join-Path $ProjectRoot "whatsapp-service") -ZipPath $whatsappZipPath

Write-Host ""
Write-Host "Zips generados:" -ForegroundColor Green
Write-Host " - $serverZipPath"
Write-Host " - $whatsappZipPath"

if ($DoFtpUpload) {
  if (!(Test-Path $FtpConfigPath)) {
    throw "DoFtpUpload activado pero no existe el archivo de config FTP: $FtpConfigPath"
  }

  Write-Host ""
  Write-Host "== Subir por FTP (config) ==" -ForegroundColor Cyan
  $cfgRaw = Get-Content -Path $FtpConfigPath -Raw
  $cfg = $cfgRaw | ConvertFrom-Json

  if ($null -eq $cfg.instances) {
    throw "El JSON debe tener la clave 'instances'"
  }

  foreach ($inst in $cfg.instances) {
    Write-Host ("Subiendo para instancia: " + $inst.name) -ForegroundColor Yellow

    if ($null -ne $inst.ftpServer) {
      $s = $inst.ftpServer
      Upload-FtpFile -Host $s.host -Port $s.port -User $s.user -Password $s.password -RemoteDir $s.remoteDir -LocalFilePath $serverZipPath -RemoteFileName $s.remoteFileName
    }

    if ($null -ne $inst.ftpWhatsapp) {
      $w = $inst.ftpWhatsapp
      Upload-FtpFile -Host $w.host -Port $w.port -User $w.user -Password $w.password -RemoteDir $w.remoteDir -LocalFilePath $whatsappZipPath -RemoteFileName $w.remoteFileName
    }
  }
}

Write-Host ""
Write-Host "Nota:" -ForegroundColor Green
Write-Host "El deploy/redeploy en Hostinger puede requerir seleccionar el ZIP dentro del panel. Este script solo genera (y opcionalmente sube) los artefactos." -ForegroundColor Green

