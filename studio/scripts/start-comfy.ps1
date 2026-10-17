<#
.SYNOPSIS
  Start the local ComfyUI image pipeline headlessly (no cmd window).

.DESCRIPTION
  ComfyUI ships a run_nvidia_gpu.bat that opens a console window and, worse, ends in
  `pause` - so a hidden launch through the .bat leaves an invisible process sitting on
  that pause. This script starts the interpreter directly instead:

    python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build

  launched with -WindowStyle Hidden, which means no cmd window, no stray pause, and the
  console output is redirected to a log file instead of a window you have to keep open.

  Idempotent: if the API is already answering on the port it exits 0 without starting a
  second instance.

.PARAMETER ComfyUIRoot
  ComfyUI install root. Default: $env:SOLSTICE_COMFYUI_ROOT, else D:\ComfyUI.

.PARAMETER Port
  API port to probe and wait for. Default 8188.

.PARAMETER TimeoutSeconds
  How long to wait for the API. Default 180 (a cold start loads torch and the models).

.PARAMETER Stop
  Stop a running instance started from this root instead of starting one.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File studio\scripts\start-comfy.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File studio\scripts\start-comfy.ps1 -CheckOnly
#>
[CmdletBinding()]
param(
    [string]$ComfyUIRoot,
    [int]$Port = 8188,
    [int]$TimeoutSeconds = 180,
    [switch]$CheckOnly,
    [switch]$Stop
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ComfyUIRoot)) {
    if ($env:SOLSTICE_COMFYUI_ROOT) { $ComfyUIRoot = $env:SOLSTICE_COMFYUI_ROOT } else { $ComfyUIRoot = 'D:\ComfyUI' }
}
if (-not (Test-Path -LiteralPath $ComfyUIRoot)) {
    Write-Host ("[start-comfy] root not found: {0}" -f $ComfyUIRoot) -ForegroundColor Red
    Write-Host '             set SOLSTICE_COMFYUI_ROOT or pass -ComfyUIRoot.' -ForegroundColor Yellow
    exit 1
}

$python = Join-Path $ComfyUIRoot 'python_embeded\python.exe'
$main   = Join-Path $ComfyUIRoot 'ComfyUI\main.py'
if (-not (Test-Path -LiteralPath $python)) {
    Write-Host ("[start-comfy] embedded python not found: {0}" -f $python) -ForegroundColor Red
    exit 1
}
if (-not (Test-Path -LiteralPath $main)) {
    Write-Host ("[start-comfy] main.py not found: {0}" -f $main) -ForegroundColor Red
    exit 1
}

function Test-ComfyApi {
    param([int]$TimeoutSec = 3)
    try {
        $r = Invoke-WebRequest -Uri ("http://127.0.0.1:{0}/system_stats" -f $Port) -TimeoutSec $TimeoutSec -UseBasicParsing
        return ($r.StatusCode -eq 200)
    } catch { return $false }
}

# ---- stop ---------------------------------------------------------------
if ($Stop) {
    $victims = @(Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*ComfyUI*main.py*" })
    if ($victims.Count -eq 0) { Write-Host '[start-comfy] nothing to stop.' -ForegroundColor DarkGray; exit 0 }
    foreach ($v in $victims) {
        Write-Host ("[start-comfy] stopping pid {0}" -f $v.ProcessId) -ForegroundColor Yellow
        Stop-Process -Id $v.ProcessId -Force -ErrorAction SilentlyContinue
    }
    exit 0
}

# ---- already up ---------------------------------------------------------
if (Test-ComfyApi) {
    Write-Host ("[start-comfy] already running on port {0} - nothing to do." -f $Port) -ForegroundColor Green
    exit 0
}

if ($CheckOnly) {
    Write-Host ("[start-comfy] not running on port {0}." -f $Port) -ForegroundColor Yellow
    exit 1
}

# ---- start, hidden ------------------------------------------------------
$logDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'out'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'comfyui.log'

Write-Host ("[start-comfy] {0}" -f $python) -ForegroundColor Green
Write-Host ("             --windows-standalone-build  (hidden, log -> {0})" -f $log) -ForegroundColor DarkGray

# -WindowStyle Hidden is the whole point: no cmd window, no .bat, no pause.
Start-Process -FilePath $python `
    -ArgumentList @('-s', $main, '--windows-standalone-build') `
    -WorkingDirectory $ComfyUIRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $log `
    -RedirectStandardError (Join-Path $logDir 'comfyui.err.log')

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    if (Test-ComfyApi) {
        Write-Host ("[start-comfy] ready on http://127.0.0.1:{0} (log: {1})" -f $Port, $log) -ForegroundColor Green
        exit 0
    }
}

Write-Host ("[start-comfy] not ready after {0}s - check {1}" -f $TimeoutSeconds, $log) -ForegroundColor Red
exit 1
