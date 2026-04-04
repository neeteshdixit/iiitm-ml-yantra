param(
    [int]$IntervalMinutes = 10,
    [string]$CommitMessage = "Auto update: code changes",
    [string]$Remote = "origin",
    [string]$Branch = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$targets = @(
    "backend",
    "frontend/src",
    "frontend/public",
    "package.json",
    "package-lock.json",
    "README.md",
    ".gitignore",
    "frontend/.gitignore"
)

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
}

Write-Log "Auto-sync started. Interval: $IntervalMinutes minute(s)."

while ($true) {
    try {
        $status = git status --porcelain -- $targets

        if (-not $status) {
            Write-Log "No relevant changes. Skipping."
        } else {
            Write-Log "Files to commit:"
            $status | ForEach-Object { Write-Host "  $_" }

            git add -A -- $targets
            git restore --staged -- .env backend/.env frontend/.env 2>$null

            git diff --cached --quiet
            if ($LASTEXITCODE -eq 0) {
                Write-Log "No staged changes after safety checks. Skipping."
            } else {
                $finalMessage = "$CommitMessage ($(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))"
                git commit -m $finalMessage
                Write-Log "Commit created: $finalMessage"

                if ([string]::IsNullOrWhiteSpace($Branch)) {
                    git push $Remote HEAD
                } else {
                    git push $Remote "HEAD:$Branch"
                }
                Write-Log "Push succeeded."
            }
        }
    } catch {
        Write-Log "Push failed: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds ($IntervalMinutes * 60)
}
