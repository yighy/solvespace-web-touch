# Updates the SolveSpace copy from https://solvespace.com/webver/
# then regenerates index.html and bumps the cache version (so the installed app updates).
# Usage: powershell -ExecutionPolicy Bypass -File update.ps1   then git commit + push
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$files = 'solvespace.html', 'solvespace.js', 'solvespace.wasm', 'solvespace.data',
         'solvespaceui.js', 'solvespaceui.css', 'filemanagerui.js'
foreach ($f in $files) {
    $out = if ($f -eq 'solvespace.html') { 'upstream-solvespace.html' } else { $f }
    # -4: force IPv4 (IPv6 is unreliable on some connections)
    curl.exe -4 -sS -f -o $out "https://solvespace.com/webver/$f"
    if ($LASTEXITCODE) { throw "Failed to download $f" }
}

# index.html = official page + manifest, service worker and touch script
$html = Get-Content upstream-solvespace.html -Raw -Encoding UTF8
$html = $html -replace '<script[^>]*cloudflareinsights[^>]*></script>', ''
$head = '<meta name=theme-color content=#000000><link rel=manifest href=manifest.webmanifest>' +
        '<link rel=icon href=icon-192.png><script src=coi-sw.js></script>'
$load = '<script>if(window.crossOriginIsolated){var s=document.createElement("script");' +
        's.src="solvespace.js";s.async=true;document.body.appendChild(s)}' +
        'else Module.setStatus("Preparing... the page will reload")</script>' +
        '<script src=android.js></script>'
$n = 0
$html = [regex]::Replace($html, '<title>[^<]*</title>', { $script:n++; '<title>SolveSpace</title>' + $head })
$html = [regex]::Replace($html, '<script src=solvespace\.js async></script>', { $script:n++; $load })
if ($n -ne 2) { throw "The official page has changed: could not generate index.html ($n/2 replacements)." }
[IO.File]::WriteAllText("$PSScriptRoot\index.html", $html, (New-Object Text.UTF8Encoding $false))

# New cache version => the phone downloads the files again
$sw = Get-Content sw.js -Raw -Encoding UTF8
$sw = $sw -replace "const CACHE = 'solvespace-[^']*';", ("const CACHE = 'solvespace-" + (Get-Date -Format 'yyyyMMdd-HHmm') + "';")
[IO.File]::WriteAllText("$PSScriptRoot\sw.js", $sw, (New-Object Text.UTF8Encoding $false))

Write-Host "OK: files updated. Check with git status, then commit + push."
