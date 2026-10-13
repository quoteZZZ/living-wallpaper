<#
.SYNOPSIS
  调用 UnrealBuildTool 生成 VSCode 所需的工程文件。

.DESCRIPTION
  -Mode Solution  → 生成 Solstice.sln（供 ms-vscode.cpptools）
  -Mode ClangDb   → 生成 compile_commands.json（供 vscode-clangd）
  自动在 Engine\Binaries\DotNET\UnrealBuildTool\ 与 Engine\Binaries\Win64\ 两处寻找 UnrealBuildTool.exe。
  幂等；失败时透传退出码。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\gen-projectfiles.ps1 -Mode Solution
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\gen-projectfiles.ps1 -Mode ClangDb
#>
[CmdletBinding()]
param(
    [ValidateSet('Solution', 'ClangDb')]
    [string]$Mode = 'Solution',
    [string]$EngineRoot,
    [string]$Project
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'find-ue.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($EngineRoot)) {
    $e = Find-UnrealEngine
    if ($e) { $EngineRoot = $e.Path }
}
if ([string]::IsNullOrWhiteSpace($EngineRoot) -or -not (Test-Path -LiteralPath $EngineRoot)) {
    Write-Host '✗ 未找到虚幻引擎，无法生成工程文件。先跑 tools\find-ue.ps1 排查。' -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Project)) {
    $cands = @(Get-ChildItem -LiteralPath (Join-Path $repoRoot 'game') -Filter '*.uproject' -File -ErrorAction SilentlyContinue)
    if ($cands.Count -gt 0) { $Project = $cands[0].FullName }
}
if ([string]::IsNullOrWhiteSpace($Project) -or -not (Test-Path -LiteralPath $Project)) {
    Write-Host '✗ 未找到 .uproject（期望 game\Solstice.uproject）。' -ForegroundColor Red
    exit 1
}

$ubtCandidates = @(
    (Join-Path $EngineRoot 'Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe'),
    (Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealBuildTool.exe'),
    (Join-Path $EngineRoot 'Engine\Binaries\DotNET\UnrealBuildTool.exe')
)
$ubt = $ubtCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $ubt) {
    Write-Host '✗ 未找到 UnrealBuildTool.exe。请确认引擎完整安装（含 DotNET 目录）。' -ForegroundColor Red
    Write-Host ("  已尝试：`n    " + ($ubtCandidates -join "`n    ")) -ForegroundColor DarkGray
    exit 1
}

Write-Host ("引擎：{0}" -f $EngineRoot) -ForegroundColor Cyan
Write-Host ("工程：{0}" -f $Project) -ForegroundColor Cyan
Write-Host ("UBT ：{0}" -f $ubt) -ForegroundColor Cyan

if ($Mode -eq 'Solution') {
    Write-Host '生成 Solstice.sln（cpptools）…' -ForegroundColor Green
    & $ubt '-projectfiles' "-project=$Project" '-game' '-rocket' '-progress'
} else {
    Write-Host '生成 compile_commands.json（clangd）…' -ForegroundColor Green
    & $ubt '-Mode=GenerateClangDatabase' "-project=$Project" '-game'
}
$code = $LASTEXITCODE

$workDir  = Split-Path -Parent $Project
$produced = if ($Mode -eq 'Solution') { Join-Path $workDir 'Solstice.sln' } else { Join-Path $workDir 'compile_commands.json' }

if ($code -eq 0) {
    if (Test-Path -LiteralPath $produced) { Write-Host ("✓ 完成：{0}" -f $produced) -ForegroundColor Green }
    else {
        Write-Host '✓ UBT 退出码 0，但未在预期位置找到产物，请检查日志。' -ForegroundColor Yellow
        Write-Host ("  预期：{0}" -f $produced) -ForegroundColor DarkGray
    }
} else {
    Write-Host ("✗ UBT 失败，退出码 {0}。" -f $code) -ForegroundColor Red
}
exit $code
