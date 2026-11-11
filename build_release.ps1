$ErrorActionPreference = 'Stop'

$manifest = Get-Content -Raw 'module.json' | ConvertFrom-Json
if ($manifest.id -ne 'pf1-skull-and-shackles') { throw 'Unexpected module ID.' }
if (-not $manifest.version) { throw 'Missing module version.' }

$dist = Join-Path $PSScriptRoot 'dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null

$zip = Join-Path $dist "pf1-skull-and-shackles-v$($manifest.version).zip"

$python = @'
from pathlib import Path
import json
import zipfile

root = Path.cwd()
manifest = json.loads((root / "module.json").read_text(encoding="utf-8"))
out = root / "dist" / f"pf1-skull-and-shackles-v{manifest['version']}.zip"

files = ["module.json", "README.md", "CHANGELOG.md"]
dirs = ["scripts", "templates", "styles", "macros", "lang"]

with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for name in files:
        p = root / name
        if p.exists() and p.is_file():
            zf.write(p, p.relative_to(root).as_posix())
    for d in dirs:
        base = root / d
        if not base.exists():
            continue
        for p in sorted(base.rglob("*")):
            if p.is_file():
                zf.write(p, p.relative_to(root).as_posix())

print(out)
'@

$python | python -
if ($LASTEXITCODE -ne 0) { throw 'Python ZIP build failed.' }
if (-not (Test-Path $zip)) { throw "ZIP was not created: $zip" }

Write-Host "Built $zip"
