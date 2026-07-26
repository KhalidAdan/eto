# The paperboy: prints the morning edition and carries it to the newsstand.
#
# Runs from Task Scheduler ("eto-morning-edition") daily at 5:30 with hourly
# retries until 11:30. Safe to fire any number of times: if today's edition
# already exists it exits immediately, and every pipeline stage resumes from
# the journal, so a retry only redoes the work that failed.
#
# Logs: logs\paperboy-YYYY-MM-DD.log (gitignored).

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repo
$today = Get-Date -Format yyyy-MM-dd
New-Item -ItemType Directory -Force (Join-Path $repo "logs") | Out-Null
$log = Join-Path $repo "logs\paperboy-$today.log"
function Write-Log($m) { "$(Get-Date -Format HH:mm:ss) $m" | Add-Content $log }

if (Test-Path (Join-Path $repo "archive\$today.md")) {
    Write-Log "edition already published; nothing to do"
    exit 0
}

Write-Log "=== paperboy run starting"

# The press needs its model server (models live on E:, NORTH-STAR section 10).
$env:OLLAMA_MODELS = "E:\ollama\models"
try {
    Invoke-RestMethod http://localhost:11434/api/version -TimeoutSec 5 | Out-Null
    Write-Log "ollama already up"
} catch {
    Write-Log "starting ollama serve"
    Start-Process -WindowStyle Hidden "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" -ArgumentList "serve"
    Start-Sleep -Seconds 15
}

Write-Log "running the press (npm run dev)"
& npm run dev *>> $log
if ($LASTEXITCODE -ne 0) { Write-Log "PRESS FAILED (exit $LASTEXITCODE)"; exit 1 }

Write-Log "rendering the site (npm run render)"
& npm run render *>> $log
if ($LASTEXITCODE -ne 0) { Write-Log "RENDER FAILED (exit $LASTEXITCODE)"; exit 1 }

Write-Log "carrying to the newsstand (git push)"
& git add -A *>> $log
& git commit -m "the $today edition (paperboy)" *>> $log
& git push origin *>> $log
if ($LASTEXITCODE -ne 0) { Write-Log "PUSH FAILED (exit $LASTEXITCODE)"; exit 1 }

Write-Log "emailing the edition (npm run email)"
& npm run email *>> $log
if ($LASTEXITCODE -ne 0) { Write-Log "EMAIL FAILED (non-fatal; paper is published)" }

Write-Log "published: archive/$today.md -> eto.news"
exit 0
