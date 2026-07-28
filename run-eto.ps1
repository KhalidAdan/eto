# The paperboy: prints the morning edition and carries it to the newsstand.
#
# Runs from Task Scheduler ("eto-morning-edition") daily at 5:30 with hourly
# retries until 11:30, plus at logon so a missed morning (overnight update
# reboot, machine asleep) catches up as soon as someone is back at the desk.
# Safe to fire any number of times: if today's edition already exists it exits
# immediately, and every pipeline stage resumes from the journal, so a retry
# only redoes the work that failed.
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

# The logon trigger fires whenever someone signs in; before 5:30 that would
# print the morning edition on last night's news.
if ((Get-Date).TimeOfDay -lt [TimeSpan]"05:30") {
    Write-Log "before 5:30; too early to print the morning edition"
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

# npm is invoked via cmd /c on purpose: PowerShell resolves bare `npm` to
# the npm.ps1 shim, which mangles arguments in scheduled, non-interactive
# sessions ("Unknown command: pm" — the 2026-07-27 missed edition). cmd
# resolves npm.cmd, which is reliable everywhere.
function Invoke-Npm($npmArgs) {
    & cmd /c "npm $npmArgs >> `"$log`" 2>&1"
    return $LASTEXITCODE
}

Write-Log "running the press (npm run dev)"
if ((Invoke-Npm "run dev") -ne 0) { Write-Log "PRESS FAILED"; exit 1 }

Write-Log "rendering the site (npm run render)"
if ((Invoke-Npm "run render") -ne 0) { Write-Log "RENDER FAILED"; exit 1 }

Write-Log "exporting durable journal tables (npm run export)"
Invoke-Npm "run export" | Out-Null

Write-Log "carrying to the newsstand (git push)"
& cmd /c "git add -A >> `"$log`" 2>&1"
& cmd /c "git commit -m `"the $today edition (paperboy)`" >> `"$log`" 2>&1"
& cmd /c "git push origin >> `"$log`" 2>&1"
if ($LASTEXITCODE -ne 0) { Write-Log "PUSH FAILED (exit $LASTEXITCODE)"; exit 1 }

Write-Log "emailing the edition (npm run email)"
if ((Invoke-Npm "run email") -ne 0) { Write-Log "EMAIL FAILED (non-fatal; paper is published)" }

Write-Log "backing up the journal (npm run backup)"
if ((Invoke-Npm "run backup") -ne 0) { Write-Log "BACKUP FAILED (non-fatal)" }

Write-Log "published: archive/$today.md -> eto.news"
exit 0
