[CmdletBinding()]
param(
    [switch]$NoBuild,
    [switch]$Down
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ComposeFile = Join-Path $RepoRoot "infra\docker\docker-compose.local.yml"
$ProjectName = "orbit"

function Assert-DockerReady {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker CLI was not found in PATH. Install Docker Desktop first."
        exit 1
    }

    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker daemon is not running. Start Docker Desktop and retry."
        exit 1
    }

    docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker Compose v2 is not available."
        exit 1
    }
}

function Open-LogTerminal {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][string]$ServiceName
    )

    $escapedCompose = $ComposeFile.Replace("'", "''")
    $command = @(
        "`$Host.UI.RawUI.WindowTitle = '$Title'",
        "Write-Host 'Streaming logs for $ServiceName (Ctrl+C to stop viewing)...' -ForegroundColor Green",
        "docker compose -f '$escapedCompose' --project-name $ProjectName logs -f --tail=100 $ServiceName"
    ) -join "; "

    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoExit",
        "-NoProfile",
        "-Command",
        $command
    ) | Out-Null
}

if (-not (Test-Path $ComposeFile)) {
    Write-Error "Compose file not found: $ComposeFile"
    exit 1
}

Assert-DockerReady

if ($Down) {
    Write-Host "[Orbit] Stopping and removing Docker containers..." -ForegroundColor Yellow
    docker compose -f $ComposeFile --project-name $ProjectName down
    exit $LASTEXITCODE
}

$upArgs = @("compose", "-f", $ComposeFile, "--project-name", $ProjectName, "up", "-d")
if (-not $NoBuild) {
    $upArgs += "--build"
}

Write-Host "[Orbit] Starting PostgreSQL, Redis, Backend, and Frontend in Docker..." -ForegroundColor Green
& docker @upArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start Orbit stack. Check the Docker output above."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[Orbit] Stack is running:" -ForegroundColor Green
Write-Host "  Frontend:   http://localhost:5173"
Write-Host "  Backend:    http://localhost:8080"
Write-Host "  Swagger UI: http://localhost:8080/swagger-ui.html"
Write-Host "  PostgreSQL: localhost:5432"
Write-Host "  Redis:      localhost:6379"
Write-Host ""
Write-Host "[Orbit] Opening log terminals for backend and frontend..." -ForegroundColor Green

Open-LogTerminal -Title "Orbit - Backend Logs" -ServiceName "backend"
Open-LogTerminal -Title "Orbit - Frontend Logs" -ServiceName "frontend"
