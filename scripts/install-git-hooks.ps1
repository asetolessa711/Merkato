<#
 .SYNOPSIS
	Installs Git pre-commit hook from .githooks for Windows users (PowerShell).

 .USAGE
	Run from repo root (or any subfolder):
		powershell -ExecutionPolicy Bypass -File scripts/install-git-hooks.ps1

 .NOTES
	- Copies .githooks/pre-commit (shell) into .git/hooks/pre-commit for Git to execute.
	- Also drops a companion PowerShell hook .git/hooks/pre-commit.ps1 (optional) and the shell hook will prefer it on Windows if configured.
#>

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
	param([string]$Start = (Get-Location).Path)
	$dir = Get-Item -LiteralPath $Start
	while ($dir -and -not (Test-Path -LiteralPath (Join-Path $dir.FullName '.git'))) {
		$parent = $dir.Parent
		if (-not $parent) { break }
		$dir = $parent
	}
	if (-not $dir -or -not (Test-Path -LiteralPath (Join-Path $dir.FullName '.git'))) {
		throw 'Cannot find .git directory. Run this script inside a Git repository.'
	}
	return $dir.FullName
}

try {
	$repoRoot = Resolve-RepoRoot
	Set-Location -LiteralPath $repoRoot

	$hooksDir = Join-Path $repoRoot '.git/hooks'
	if (-not (Test-Path -LiteralPath $hooksDir)) {
		throw "Git hooks directory not found: $hooksDir"
	}

	$srcShell = Join-Path $repoRoot '.githooks/pre-commit'
	if (-not (Test-Path -LiteralPath $srcShell)) {
		throw 'Source shell hook not found: .githooks/pre-commit'
	}

	$dstShell = Join-Path $hooksDir 'pre-commit'
	Copy-Item -LiteralPath $srcShell -Destination $dstShell -Force

	# Optional: install PowerShell variant if present
	$srcPs = Join-Path $repoRoot '.githooks/pre-commit.ps1'
	if (Test-Path -LiteralPath $srcPs) {
		$dstPs = Join-Path $hooksDir 'pre-commit.ps1'
		Copy-Item -LiteralPath $srcPs -Destination $dstPs -Force
	}

	Write-Host '✅ Git pre-commit hook installed.' -ForegroundColor Green
	Write-Host '  Hook path:' $dstShell
	if (Test-Path -LiteralPath (Join-Path $hooksDir 'pre-commit.ps1')) {
		Write-Host '  PowerShell helper installed:' (Join-Path $hooksDir 'pre-commit.ps1')
	}
}
catch {
	Write-Error $_
	exit 1
}

