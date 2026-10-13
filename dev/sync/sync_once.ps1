# dev/sync/sync_once.ps1 — Solstice 双机 git 单次同步
# ------------------------------------------------------------
# 设计：git 仍是唯一真源；本脚本给两台机的计划任务周期调用。
#   代码机（本机）：默认 pull-only —— 不自动提交，避免把未完成的开发
#                   工作误提交；改动由每次对话收尾时显式 commit+push。
#   素材机：        -Push 开关 —— 有变更自动 commit+push（产出是素材，
#                   可以放心自动入库）。
# 注册（每台机各执行一次，路径按本机实际改）：
#   代码机：schtasks /Create /TN "SolsticeSync" /SC MINUTE /MO 5 /F ^
#             /TR "powershell -NoProfile -ExecutionPolicy Bypass -File e:\solstice\dev\sync\sync_once.ps1"
#   素材机：schtasks /Create /TN "SolsticeSync" /SC MINUTE /MO 5 /F ^
#             /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\GitCode\solstice\dev\sync\sync_once.ps1 -Push"
# 冲突处理：rebase 失败即停手退出（人工解决），绝不 force。
# ------------------------------------------------------------
param([switch]$Push)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # 仓库根
Set-Location $root

# 1. 拉取（autostash：本机有未提交改动时先暂存再恢复）
git pull --rebase --autostash
if ($LASTEXITCODE -ne 0) { Write-Host "[sync] pull 失败（可能冲突），请人工处理"; exit 1 }

# 2. -Push 模式：有变更则自动提交推送
if ($Push) {
  $dirty = git status --porcelain
  if ($dirty) {
    git add -A
    git commit -m "auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    git push
    if ($LASTEXITCODE -ne 0) {
      git pull --rebase --autostash          # 远端更新时重拉再推一次
      git push
    }
  }
}
Write-Host "[sync] ok $(Get-Date -Format 'HH:mm:ss')"
