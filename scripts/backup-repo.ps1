<#
.SYNOPSIS
  Fast local backup of the repo to a timestamped folder under a destination root.
.DESCRIPTION
  - Expands and excludes heavy folders (node_modules, coverage, .next, etc.)
  - Dynamically excludes frontend\build-e2e-* folders without using wildcards that break robocopy
  - Uses robocopy with sensible defaults and returns the robocopy exit code
.PARAMETER Source
  The repository root to copy. Defaults to the repo root (parent of this script folder).
.PARAMETER DestinationRoot
  The directory where timestamped backups will be created. Defaults to C:\Dev\Merkato-backups.
.PARAMETER ExtraExcludes
  Additional paths (relative to Source or absolute) to exclude.
.PARAMETER Stamp
  Optional custom timestamp string for the backup folder name.
.EXAMPLE
  ./backup-repo.ps1
.EXAMPLE
  ./backup-repo.ps1 -DestinationRoot D:\Backups
#>
[CmdletBinding()]
param(
  [string]$Source,
  [string]$DestinationRoot = 'C:\\Dev\\Merkato-backups',
  [string[]]$ExtraExcludes = @(),
  [string]$Stamp
)

$ErrorActionPreference = 'Stop'

# Resolve repo root relative to this script if Source not provided
if (-not $Source -or [string]::IsNullOrWhiteSpace($Source)) {
  $repoRoot = Split-Path -Parent $PSScriptRoot
  $Source = $repoRoot
}
$Source = (Resolve-Path -LiteralPath $Source).Path

# Compute destination folder path
if (-not $Stamp) {
  $Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
}
if (-not (Test-Path -LiteralPath $DestinationRoot)) {
  New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null
}
$Destination = Join-Path $DestinationRoot ("Merkato-" + $Stamp)
New-Item -ItemType Directory -Force -Path $Destination | Out-Null

# Build excludes
$excludes = @(
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  'frontend\\cypress-results'
)
if ($ExtraExcludes -and $ExtraExcludes.Count -gt 0) {
  $excludes += $ExtraExcludes
}

# Expand frontend\build-e2e-* directories explicitly so robocopy /XD accepts them
$fePath = Join-Path $Source 'frontend'
if (Test-Path -LiteralPath $fePath) {
  $buildDirs = Get-ChildItem -LiteralPath $fePath -Directory -Filter 'build-e2e-*' -ErrorAction SilentlyContinue
  foreach ($dir in $buildDirs) {
    $excludes += $dir.FullName
  }
}

# Map relative excludes to absolute paths where appropriate
$resolvedExcludes = @()
foreach ($item in $excludes) {
  if ([System.IO.Path]::IsPathRooted($item)) {
    $resolvedExcludes += $item
  } else {
    $resolvedExcludes += (Join-Path $Source $item)
  }
}

Write-Host "Backing up from: $Source"
Write-Host "To:             $Destination"
Write-Host "Excluding:" -ForegroundColor DarkGray
$resolvedExcludes | ForEach-Object { Write-Host " - $_" -ForegroundColor DarkGray }

# Prepare robocopy args
$roboArgs = @(
  $Source,
  $Destination,
  '/E',       # include subdirs, including empty
  '/MT:8',    # multithreaded copy
  '/R:1',     # retry 1 time
  '/W:1',     # wait 1 second between retries
  '/NP',      # no progress
  '/TEE'      # output to console
)

if ($resolvedExcludes.Count -gt 0) {
  $roboArgs += '/XD'
  $roboArgs += $resolvedExcludes
}

# Execute robocopy
& robocopy @roboArgs | Out-Host
$exitCode = $LASTEXITCODE
Write-Host ("robocopy exit code: $exitCode")

# 0-7 are success/warning; 8+ failure
if ($exitCode -ge 8) {
  Write-Error "Backup failed with robocopy exit code $exitCode"
  exit $exitCode
}

Write-Host "Backup complete." -ForegroundColor Green

# Print a concise top-level summary
try {
  Get-ChildItem -LiteralPath $Destination -Force | Select-Object Name,Mode,Length | Format-Table -AutoSize | Out-Host
} catch { }

exit $exitCode
