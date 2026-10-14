# Solstice

> 一盒**会自己活起来的纸雕微缩世界**——你可以让它与真实时间同频（天气、昼夜、季节皆真），也可以把时间握在手里；你攒下的「余响」开出的元素包决定这次能怎样改写它；而它永远不输。
>
> 形态：**永续运行的上帝沙盒（生态界）** · **全 3D 程序化几何（纸板块面）** · 干涉卡 = 七元素 × 11 级 × 3 类（**卡种 ≥ 231**）· 无失败、无数值成长 · Steam 单机买断（Windows）。
> 工程与模块名沿用 `Solstice`；中文名可后补。

---

## 一、当前状态（2026-10-14）

| 项 | 真实情况 |
|---|---|
| 设计 | ✅ **立项已定稿**，细化到规格级 —— 唯一真源 [`docs/charter/GDD.md`](docs/charter/GDD.md) v6.1 |
| 文档体系 | ✅ 已按"一种事务一份文档"重建，入口：[`docs/INDEX.md`](docs/INDEX.md)（含状态矩阵与更新触发矩阵） |
| 环境脚本 | ✅ `tools/` 9 个 PowerShell + `tools/README.md` |
| IDE 配置 | ✅ `.vscode/` 7 份 + `.clang-format` + `.editorconfig` |
| 项目数据 | ✅ `.codebuddy/agents/`（3 个子代理）与 `.codebuddy/rules/`（核心约束） |
| **游戏代码** | ❌ **无** —— `game/` 尚未建立（无 `.uproject`、无 `Source/`），见 [`docs/plan/ROADMAP.md`](docs/plan/ROADMAP.md) §5 的 P3 |
| **可编译性** | ❌ **当前无法编译** —— 虚幻引擎与 VS2022 C++ 生成工具均未安装 |

---

## 二、立刻上手（三条）

1. **读文档**：先 [`docs/INDEX.md`](docs/INDEX.md)（3 分钟看懂现状、状态矩阵与硬规则），再 [`docs/charter/GDD.md`](docs/charter/GDD.md) §0–§3。
2. **看计划**：[`docs/plan/ROADMAP.md`](docs/plan/ROADMAP.md) §1（三阶段切分）+ §5（P0–P5 执行计划）。
3. **查环境**：`powershell -ExecutionPolicy Bypass -File tools\check-env.ps1`（只读体检，看清缺什么）。

---

## 三、环境补齐（需用户主动执行）

```powershell
# 只读体检
powershell -ExecutionPolicy Bypass -File tools\check-env.ps1

# 安装 VS2022 生成工具 + "使用 C++ 的桌面开发"
#   winget 默认装 C 盘；C 盘紧张时用官方 bootstrapper 指定 --installPath D:\VS2022
powershell -ExecutionPolicy Bypass -File tools\install-vs-buildtools.ps1

# Epic Games Launcher 已安装（无需再跑 install-epic-launcher.ps1）
```

**引擎现状**：`D:\Epic Games\UE_5.8` 是 15.67 GB **未登记下载残件**（无 `Engine/`、无 `UnrealEditor.exe`，Launcher 清单为空），**建议删除后重装**到 `D:\Epic Games\`。
**磁盘结论**：**不需要清理 C 盘**（实测需求约 10–15 GB；`check-env.ps1` 的 120 GB 只是保守阈值）。
**缓存外置**：设环境变量 `UE-LocalDataCachePath=D:\UE-DDC`。

完整步骤与本机实测见 [`docs/ops/ENV.md`](docs/ops/ENV.md)；前置条件与磁盘结论见 [`docs/plan/ROADMAP.md`](docs/plan/ROADMAP.md) §3。

引擎与生成工具就绪后（**前提是工程骨架已存在**）：

```powershell
powershell -ExecutionPolicy Bypass -File tools\configure-vscode.ps1   # 写入引擎路径到 .vscode
powershell -ExecutionPolicy Bypass -File tools\gen-projectfiles.ps1   # 生成 Solstice.sln
powershell -ExecutionPolicy Bypass -File tools\build.ps1              # 编译
powershell -ExecutionPolicy Bypass -File tools\launch-editor.ps1      # 启动编辑器
```

VSCode 中 `Ctrl+Shift+B` 运行构建任务，`F5` 用 `cppvsdbg` 调试（配置说明见 [`docs/ops/VSCODE.md`](docs/ops/VSCODE.md)）。

---

## 四、仓库结构

```text
solstice/
├─ docs/        ✅ 文档体系（charter / content / art / tech / plan / ops / archive）→ 入口 docs/INDEX.md
├─ tools/       ✅ 环境与构建脚本（PowerShell）
├─ .vscode/     ✅ 构建任务 / 调试 / cpptools / 代码片段
├─ .codebuddy/  ✅ agents/ 与 rules/（项目数据，勿删）
├─ game/        🟡 计划中 —— UE 工程（进发行包）
├─ studio/      🟡 计划中 —— 生图线与资产产物
└─ shared/      🟡 计划中 —— JSON 契约
```

> 🟡 = **尚未落地**，不要按存在去写代码或脚本。定义与状态列见 [`docs/tech/STRUCTURE.md`](docs/tech/STRUCTURE.md) §0。

---

## 五、协作约定（速查，全文见 [`docs/ops/WORKFLOW.md`](docs/ops/WORKFLOW.md)）

- **提交信息**：英文、简短祈使句；文档与代码同次提交。
- **文档纪律**：文档先行；任何文档增删改必须同次更新 [`docs/INDEX.md`](docs/INDEX.md)。
- **分工**：AI ≈ 85%（代码 / 脚本 / 文档 / 数据 / 生图调度）；用户 ≈ 15%（安装、GUI 操作、审美裁决）。
- **逻辑在 C++、表现层在蓝图**：确定性内核（模拟 / 时间 / 存档）不得依赖蓝图。
- **双机同步**：git 是唯一真源，未 push 视为未落地（见 [`docs/ops/SYNC.md`](docs/ops/SYNC.md)）。
- **素材合规**：AI 生成素材逐张留档（模型 / prompt / seed / 日期），满足 Steam AI 披露（见 [`docs/art/ASSETS.md`](docs/art/ASSETS.md) §2、§5）。

---

## 六、形态沿革

动态壁纸 → 场景引擎 → 卡牌收集 → 自走棋卡牌（**均已作废**）→ **当前：纸雕微缩永续生态界**。
完整裁定记录见 [`docs/charter/DECISIONS.md`](docs/charter/DECISIONS.md)；作废稿见 [`docs/archive/`](docs/archive/README.md)。
