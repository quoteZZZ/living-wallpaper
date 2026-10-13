# 双机协作与同步（SYNC）

> **背景**：双机模式——代码机（开发与 git 提交）+ 素材机（部署模型出图，跑 `studio/`）。
> 痛点：靠"每次对话手动 pull / commit / push"太慢。本方案 = **git 仍是唯一真源 + 计划任务自动同步**，5 分钟内两机互通。
> 目录归属与命名见 [`STRUCTURE.md`](STRUCTURE.md)。

## 1. 方案总览

| 层 | 载体 | 时效 | 说明 |
|---|---|---|---|
| **代码 / 文档 / 成包素材** | git（GitHub quoteZZZ/solstice） | ≤5 分钟 | 唯一真源；两台机各挂一个计划任务 |
| **raw 候选图**（不入库） | 本机磁盘，不共享 | — | 放 `studio/work/raw/`（已 gitignore），只有选中图才提交 |

不引入 Syncthing/网盘实时同步**工作区**：两台机同时改工作树 + 各自 `.git`，索引冲突是灾难。素材交付走 git（选中图体积可控），raw 走线下。

## 2. 一次性配置（每台机各执行一次）

脚本：`dev/sync/sync_once.ps1`（单次：pull --rebase --autostash；`-Push` 时自动 commit+push）。

**代码机（示例 `e:\solstice`，pull-only）**：
```powershell
schtasks /Create /TN "SolsticeSync" /SC MINUTE /MO 5 /F /TR "powershell -NoProfile -ExecutionPolicy Bypass -File e:\solstice\dev\sync\sync_once.ps1"
```

**素材机（本机实际为 `D:\GitCode\solstice`）**：
```powershell
schtasks /Create /TN "SolsticeSync" /SC MINUTE /MO 5 /F /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\GitCode\solstice\dev\sync\sync_once.ps1 -Push"
```

- 验证：`schtasks /Run /TN "SolsticeSync"` 后看仓库 `git log` 是否出现远端提交。
- 删除：`schtasks /Delete /TN "SolsticeSync" /F`。
- 跨网：Tailscale 直连时同样走 GitHub，无需额外配置。

## 3. 角色约定（防冲突的核心）

| 机 | 自动行为 | 不自动做的事 |
|---|---|---|
| **代码机** | 每 5 分钟 pull | **不自动 commit/push**——开发中的半成品绝不入库；改动在每次对话收尾时显式提交 |
| **素材机** | 每 5 分钟 pull + 自动 commit/push 本机变更 | 不改代码/文档（只按任务书落素材） |

- 两机**不同时改同一文件**：代码机管 `app/**`、`docs/**`、`shared/**`；素材机管 `studio/**` 与 `app/assets/packs/**` → rebase 基本无冲突。
- 万一冲突：脚本停手不推进，人工 `git status` 处理后正常 push。

## 4. 对话开场/收尾约定（AI 侧）

- **开场**：先 `git pull --rebase --autostash` 拿对方最新产出，再干活。
- **收尾**：有改动就 commit + push（英文祈使句提交信息），不留未推提交。
- 素材任务按 `studio/contract/sets/INDEX.md` 一套一套走，状态由 SET 文档验收清单勾选体现。

## 5. 素材机产出落位（git 内）

```
studio/contract/            # 任务书与合同（要什么；代码机维护）
studio/jobs/                # 生成作业单（怎么生成；素材机维护）
studio/frames/selected/     # 裁决入选帧（SET-00）
studio/frames/golden/       # 黄金帧 TF01（视觉回归基准）
studio/frames/candidates/   # 候选草案（裁决用，可清理）
app/assets/packs/<name>/    # 成包素材（SET-01/02/03，studio/tools/pack.py 产出）
studio/work/raw/            # raw 候选（gitignore，永不提交）
```
