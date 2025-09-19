<#
.SYNOPSIS
  Commit all changes with a versioned message and create an annotated tag.
.DESCRIPTION
  Prompts for a version (e.g., 0.5.0), commit message, and whether to push.
  Validates working tree state and prevents accidental empty commits.
.PARAMETER Version
  Version string without the leading 'v' (e.g., 0.5.0). If not provided, you'll be prompted.
.PARAMETER Message
  Commit message. If omitted, defaults to "chore: release v<version>".
.PARAMETER Push
  Switch to push commit and tag to origin.
.EXAMPLE
  ./commit-and-tag.ps1 -Version 0.5.0 -Message "feat: invoices access hardening" -Push
#>
[CmdletBinding()]
param(
  [string]$Version,
  [string]$Message,
  [switch]$Push
)

$ErrorActionPreference = 'Stop'

function Ensure-Git() {
  try {
    git --version | Out-Null
  } catch {
    throw "git is not available in PATH."
  }
}

function Get-Root() {
  $root = git rev-parse --show-toplevel 2>$null
  if (-not $root) { throw "Not inside a git repository." }
  return $root.Trim()
}

Ensure-Git
$root = Get-Root
Set-Location $root

# Version prompt
if (-not $Version -or [string]::IsNullOrWhiteSpace($Version)) {
  $Version = Read-Host "Enter version (e.g., 0.5.0)"
}
if (-not $Version -or -not ($Version -match '^[0-9]+\.[0-9]+\.[0-9]+$')) {
  throw "Invalid version. Use semantic versioning like 0.5.0"
}
$tag = "v$Version"

# Determine default commit message
if (-not $Message -or [string]::IsNullOrWhiteSpace($Message)) {
  $Message = "chore: release $tag"
}

# Show status and confirm
Write-Host "Preparing to commit and tag:" -ForegroundColor Cyan
Write-Host " - Root: $root"
Write-Host " - Commit message: $Message"
Write-Host " - Tag: $tag"

# Stage changes
$null = git add -A

# Check if there is anything to commit
$pending = git diff --cached --name-only
if (-not $pending) {
  Write-Host "No staged changes. Nothing to commit." -ForegroundColor Yellow
} else {
  git commit -m "$Message"
}

# Create or update annotated tag
# If tag exists, prompt to move it
$existingTag = git tag -l $tag
if ($existingTag) {
  $resp = Read-Host "Tag $tag exists. Move it to HEAD? (y/N)"
  if ($resp -match '^(y|yes)$') {
    git tag -a $tag -m "$Message" -f
  } else {
    Write-Host "Keeping existing tag."
  }
} else {
  git tag -a $tag -m "$Message"
}

# Optional push
if ($Push) {
  Write-Host "Pushing commit and tag to origin..." -ForegroundColor Green
  git push
  git push origin $tag
}

Write-Host "Done." -ForegroundColor Green
