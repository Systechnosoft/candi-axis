$ErrorActionPreference = "Stop"

$SCRIPT_DIR = $PSScriptRoot
$API_DIR = Join-Path $SCRIPT_DIR "ats-api"
$UI_DIR = Join-Path $SCRIPT_DIR "ats-ui"

Set-Location $API_DIR
npm run env:check
npm run db:migrate
npm run db:seed
npm run db:bootstrap

Start-Process -FilePath "npm.cmd" -ArgumentList "run start:dev"

Start-Sleep -Seconds 5

Set-Location $UI_DIR
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev"

Set-Location $SCRIPT_DIR
