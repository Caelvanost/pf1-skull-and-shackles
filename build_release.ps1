$ErrorActionPreference = 'Stop'

$manifest = Get-Content -Raw 'module.json' | ConvertFrom-Json
if ($manifest.id -ne 'pf1-skull-and-shackles') { throw 'Unexpected module ID.' }
if (-not $manifest.version) { throw 'Missing module version.' }

$dist = Join-Path $PSScriptRoot 'dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null

$staging = Join-Path $dist 'staging'
New-Item -ItemType Directory -Path $staging | Out-Null

$files = @('module.json','README.md','CHANGELOG.md')
$dirs = @('scripts','templates','styles','macros','lang')

foreach ($file in $files) {
  if (Test-Path $file) { Copy-Item $file $staging -Force }
}
foreach ($dir in $dirs) {
  if (Test-Path $dir) { Copy-Item $dir $staging -Recurse -Force }
}

$zip = Join-Path $dist "pf1-skull-and-shackles-v$($manifest.version).zip"
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zip -CompressionLevel Optimal -Force
Remove-Item $staging -Recurse -Force

Write-Host "Built $zip"
