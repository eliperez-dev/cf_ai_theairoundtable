# Simple deployment script
param(
    [string]$Target = "all"
)

if ($Target -eq "pages" -or $Target -eq "all") {
    Write-Host "Deploying Pages..." -ForegroundColor Cyan
    wrangler pages deploy pages --project-name=ai-roundtable
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Pages deployed: https://ai-roundtable.pages.dev" -ForegroundColor Green
    }
}

if ($Target -eq "worker" -or $Target -eq "all") {
    Write-Host "Deploying Worker..." -ForegroundColor Cyan
    Set-Location "aipodcast-worker"
    npm run deploy
    Set-Location ".."
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Worker deployed: https://aipodcast-worker.eliperez0024.workers.dev" -ForegroundColor Green
    }
}