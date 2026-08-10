$ErrorActionPreference = "Stop"

$SCRIPT_DIR = $PSScriptRoot
# FIXED FOLDER NAMES: updated from 'ca-api' to your actual folder names 'ca-api'
$API_DIR = Join-Path $SCRIPT_DIR "ca-api"
$UI_DIR = Join-Path $SCRIPT_DIR "ca-ui"

Write-Host "==========================================="
Write-Host "  CandiAxis - Full Startup Flow"
Write-Host "==========================================="

# --- 1. MinIO Setup & Startup ---
Write-Host "`n--- Step 1: Starting MinIO (Storage) ---"
$MinioDir = "C:\minio"
$MinioExe = Join-Path $MinioDir "minio.exe"
$MinioDataDir = "C:\minio-data"

if (-not (Test-Path $MinioDir)) { New-Item -ItemType Directory -Path $MinioDir | Out-Null }
if (-not (Test-Path $MinioDataDir)) { New-Item -ItemType Directory -Path $MinioDataDir | Out-Null }

if (-not (Test-Path $MinioExe)) {
    Write-Host "Downloading MinIO server for Windows..."
    Invoke-WebRequest -Uri "https://dl.min.io/server/minio/release/windows-amd64/minio.exe" -OutFile $MinioExe
}

$env:MINIO_ROOT_USER = "ca-admin"
$env:MINIO_ROOT_PASSWORD = "ca-password-123"
# Spawns MinIO in a separate background window so it doesn't block the script
Start-Process -FilePath $MinioExe -ArgumentList "server $MinioDataDir --console-address `":9001`"" -WindowStyle Normal
Write-Host "  -> MinIO started in new window (API: 9000, Console: 9001)"

# --- 2. API Setup & Database Validation ---
Write-Host "`n--- Step 2: API Setup & Database Validation ---"
Set-Location $API_DIR
Write-Host "Checking Environment..."
npm run env:check
Write-Host "Running Migrations..."
npm run db:migrate
Write-Host "Running Seeds..."
npm run db:seed
Write-Host "Bootstrapping Admin..."
npm run db:bootstrap

# --- 3. Start API ---
Write-Host "`n--- Step 3: Starting Backend API ---"
# Spawns Backend in a separate background window
Start-Process -FilePath "npm.cmd" -ArgumentList "run start:dev" -WindowStyle Normal
Write-Host "  -> Backend starting in new window. Waiting 5s..."
Start-Sleep -Seconds 5

# --- 4. Start UI ---
Write-Host "`n--- Step 4: Starting Frontend UI ---"
Set-Location $UI_DIR
# Spawns Frontend in a separate background window
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WindowStyle Normal
Write-Host "  -> Frontend starting in new window."

Set-Location $SCRIPT_DIR
Write-Host "`n==========================================="
Write-Host "  CandiAxis is running!"
Write-Host "  Backend : http://localhost:3000"
Write-Host "  Frontend: http://localhost:3001"
Write-Host "  MinIO   : http://127.0.0.1:9001"
Write-Host "==========================================="
