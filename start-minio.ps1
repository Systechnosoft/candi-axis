$ErrorActionPreference = "Stop"

$MinioDir = "C:\minio"
$MinioExe = Join-Path $MinioDir "minio.exe"
$MinioDataDir = "C:\minio-data"

# Create directories if they don't exist
if (-not (Test-Path $MinioDir)) {
    New-Item -ItemType Directory -Path $MinioDir | Out-Null
}
if (-not (Test-Path $MinioDataDir)) {
    New-Item -ItemType Directory -Path $MinioDataDir | Out-Null
}

# Download MinIO if it's not already downloaded
if (-not (Test-Path $MinioExe)) {
    Write-Host "Downloading MinIO server for Windows..."
    Invoke-WebRequest -Uri "https://dl.min.io/server/minio/release/windows-amd64/minio.exe" -OutFile $MinioExe
    Write-Host "Download complete!"
}

# Set environment variables for credentials
$env:MINIO_ROOT_USER = "ats-admin"
$env:MINIO_ROOT_PASSWORD = "ats-password-123"

Write-Host "Starting MinIO Server..."
Write-Host "Console will be available at http://127.0.0.1:9001"
Write-Host "API will be available at http://127.0.0.1:9000"

# Start the MinIO server
& $MinioExe server $MinioDataDir --console-address ":9001"
