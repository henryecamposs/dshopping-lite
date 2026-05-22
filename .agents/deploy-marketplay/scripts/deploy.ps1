# ==========================================
# Deploy to Cloud Run - marketplay-back-v1
# ==========================================
# Usage: .\scripts\deploy.ps1
# ==========================================

$ErrorActionPreference = "Stop"

# Config
$SERVICE_NAME = "marketplay-back-v1"
$PROJECT_ID = "core-synthesis-487923-i2"
$REGION = "us-east1"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploying $SERVICE_NAME to Cloud Run" -ForegroundColor Cyan
Write-Host "  Project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "  Region:  $REGION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Versioning Logic
$currentVersion = (Get-Content package.json | ConvertFrom-Json).version
Write-Host "Current Version (Package): $currentVersion" -ForegroundColor Magenta

# Release X.YYYY Logic
$incrementX = Read-Host "Increment MINOR version X? [y/N]"
$syncArgs = ""
if ($incrementX -eq "y") {
    $syncArgs = "--new-version"
}

# Sync DB Version and Generate X.YYYY
Write-Host "Syncing DB version and generating release ID..." -ForegroundColor Yellow
npx ts-node scripts/sync-db-version.ts $syncArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: DB Sync failed." -ForegroundColor Red
    exit 1
}

# Read the generated release
$releaseName = Get-Content .last_release
Write-Host "New Release ID: $releaseName" -ForegroundColor Green

# Update Changelog
Write-Host "Updating Changelog..." -ForegroundColor Yellow
powershell -ExecutionPolicy Bypass -File .\scripts\generate-changelog.ps1 -Version "$currentVersion" -ReleaseName "$releaseName"


# Ensure gcloud is in PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# Verify gcloud auth
Write-Host "[1/3] Verifying authentication..." -ForegroundColor Yellow
$account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $account) {
    Write-Host "ERROR: Not authenticated. Run 'gcloud auth login' first." -ForegroundColor Red
    exit 1
}
Write-Host "  Authenticated as: $account" -ForegroundColor Green

# Set project
Write-Host "[2/3] Setting project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID --quiet 2>$null
Write-Host "  Project set to: $PROJECT_ID" -ForegroundColor Green

# Deploy
Write-Host "[3/3] Deploying from source..." -ForegroundColor Yellow
Write-Host "  This will build the Docker image in Cloud Build and deploy to Cloud Run." -ForegroundColor DarkGray
Write-Host ""

gcloud run deploy $SERVICE_NAME `
    --source=. `
    --region=$REGION `
    --platform=managed `
    --allow-unauthenticated `
    --memory=512Mi `
    --cpu=1 `
    --min-instances=1 `
    --max-instances=15 `
    --timeout=300 `
    --concurrency=80 `
    --cpu-boost `
    --session-affinity `
    --port=8080 `
    --network=default `
    --subnet=default `
    --vpc-egress=private-ranges-only `
    --set-env-vars="NODE_ENV=production,DB_HOST=34.151.203.75,DB_PORT=5432,DB_USER=postgres,DB_NAME=marketplay-db,GCS_PROJECT_ID=core-synthesis-487923-i2,GCS_BUCKET=marketplay-storage,PROTECTED_ENTITY_ID=2e4ac41d-d4cd-43e4-823d-1e60c64515a3,REDIS_HOST=10.171.53.107,REDIS_PORT=6379,RISK_LUA_VERSION=v2" `
    --set-env-vars="DB_PASS=(<e6f?qy/c6qIa)k" `
    --set-env-vars="JWT_SECRET=8f9e2b1c3d4e5f6a9b8c7d6e5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b" `
    --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  DEPLOY SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    
    $url = gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" 2>$null
    Write-Host "  URL: $url" -ForegroundColor Cyan
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "  DEPLOY FAILED. Check logs above." -ForegroundColor Red
    Write-Host "  Logs: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/logs?project=$PROJECT_ID" -ForegroundColor Yellow
    exit 1
}
