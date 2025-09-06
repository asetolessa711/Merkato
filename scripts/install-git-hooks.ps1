Param()
# Installs pre-commit hooks for both POSIX and Windows environments

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$gitDir = Join-Path $repoRoot '.git'
$hooksDir = Join-Path $gitDir 'hooks'
$customHooks = Join-Path $repoRoot '.githooks'

if (-not (Test-Path $gitDir)) {
  Write-Error ".git directory not found. Run this from a cloned repo."
  exit 1
}

if (-not (Test-Path $hooksDir)) { New-Item -ItemType Directory -Path $hooksDir | Out-Null }

Copy-Item (Join-Path $customHooks 'pre-commit') (Join-Path $hooksDir 'pre-commit') -Force
Copy-Item (Join-Path $customHooks 'pre-commit.ps1') (Join-Path $hooksDir 'pre-commit.ps1') -Force

# Make POSIX hook executable on WSL/Git Bash if present
try {
  & bash -lc "chmod +x .git/hooks/pre-commit" 2>$null
} catch { }

Write-Host "Git hooks installed. Windows uses pre-commit.ps1; POSIX uses pre-commit."
