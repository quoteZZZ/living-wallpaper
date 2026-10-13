# 双机 git 同步（SYNC）

> 约定：**git 是唯一真源** + 计划任务定时 `pull` / `push`。大二进制资产不进 git（见 §4）。

---

## 1. 基本约定

- **唯一真源 = 远端仓库（origin）**。未 push 的本地改动视为"未落地"。
- 拉取用 **`git pull --rebase --autostash`**，避免无谓 merge commit 与脏工作树阻塞。
- **同一时间只允许一台机器改同一文件**；跨机改同名文件前先在群里对齐。
- 素材/产出**单独提交**（便于回溯与回退），不与代码混提。

---

## 2. 定时同步（注册计划任务）

### 方式一：`Register-ScheduledTask`（推荐）

```powershell
$repo = 'd:\GitCode\solstice'
$action  = New-ScheduledTaskAction -Execute 'cmd.exe' `
  -Argument "/c cd /d $repo && git pull --rebase --autostash && git push"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes 15)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable
Register-ScheduledTask -TaskName 'Solstice Git Sync' -Action $action -Trigger $trigger -Settings $settings -Force
```

### 方式二：`schtasks`（最简）

```powershell
schtasks /Create /TN "Solstice Git Sync" /SC MINUTE /MO 15 /TR "cmd /c cd /d d:\GitCode\solstice && git pull --rebase --autostash && git push"
```

### 取消与查看

```powershell
Unregister-ScheduledTask -TaskName 'Solstice Git Sync' -Confirm:$false
Get-ScheduledTask -TaskName 'Solstice Git Sync' | Get-ScheduledTaskInfo
```

- 运行身份用当前用户（复用凭据缓存）。无人值守需配 **SSH key** 或 **Git Credential Manager**。
- 手动兜底：

```powershell
cd d:\GitCode\solstice
git pull --rebase --autostash
git add -A; git commit -m "chore: sync"; git push
```

---

## 3. 避免冲突的实践

1. **目录归属分工**：素材机只动 `studio/`，代码机只动 `game/`、`tools/`、`shared/`。
2. **小步提交、频繁同步**：宁可多 push，不攒一整天。
3. **派生文件不入库**：`Intermediate`、`Binaries`、`*_generated.h`、`compile_commands.json`、`.sln` 一律忽略，跨机各自生成。
4. **遇分叉**：`git pull --rebase --autostash`；冲突解决后 `git rebase --continue`。
5. **不要 force push 共享分支**。

---

## 4. `Content/` 下大资产的处理

`game/Content/**` 的 `.uasset` / `.umap` 体积大且二进制不可合并，**默认不入 git**（见 `docs/STRUCTURE.md` §5）。三选一：

- **优先（当前策略）：本地再生 + 契约入库。** 只版本化 `Source/`、`Config/`、`shared/`、`studio/prompts`、`manifest.jsonl`。
- **可选：Git LFS**（仅跟踪少量确需共享的关键资产）：

```powershell
git lfs install
git lfs track "game/Content/**/*.uasset" "game/Content/**/*.umap"
git add .gitattributes game/Content
```

> ⚠ LFS 需远端配额（GitHub/GitLab 均有）；**不要**把 `Intermediate` / `DerivedDataCache` 塞进 LFS。

- **不同步**：两台机器各自持有编辑器生成的资产副本，靠 `Source/` + 脚本重建。**若两台机都改同一批资产，这是唯一不会冲突的方案。**
