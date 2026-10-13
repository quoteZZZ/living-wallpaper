# 仓库结构与命名（STRUCTURE）

> **本文件是目录与命名的唯一真源。** 与 `DESIGN.md` §8 保持一致；冲突时以 `DESIGN.md` 为准并同步修正本文档。
> 新增文件前先读本文件的「归位决策表」。

---

## 1. 目录树

```
solstice/
├─ README.md                      # 项目门面与快速开始
├─ .gitignore                     # 忽略规则（策略见 §5）
├─ .editorconfig                  # 跨编辑器编码/换行/缩进（.ps1 强制 utf-8-bom）
├─ .clang-format                  # C++ 格式化风格（UE 基调，cpptools 内置 clang-format 使用）
│
├─ game/                          # 虚幻引擎工程 —— 进发行包
│  ├─ Solstice.uproject
│  ├─ README.md                   # 工程说明与 M0 验收步骤
│  ├─ BLUEPRINT-GUIDE.md          # 需人工在编辑器连线的蓝图说明书
│  ├─ Config/                     # DefaultEngine.ini / DefaultGame.ini / DefaultInput.ini
│  ├─ Content/                    # 编辑器产出资产（大部分不入 git）
│  ├─ Plugins/
│  └─ Source/
│     ├─ Solstice.Target.cs
│     ├─ SolsticeEditor.Target.cs
│     └─ Solstice/
│        ├─ Solstice.Build.cs
│        ├─ Solstice.h / Solstice.cpp
│        ├─ Core/     GameInstance · SaveGame · EventBus · DataSubsystem · GameMode
│        ├─ Data/     SolsticeTypes · Warden/Card/Node/Synergy/Keyword/Story 定义 · ElementChart
│        ├─ Battle/   双相回合状态机（布阵期 / 交兵期）—— 纯逻辑
│        ├─ Board/    岁盘：2×6 布阵区、站位、寻敌
│        ├─ Run/      岁局：地图生成、节点推进、经济、天时
│        ├─ Meta/     局外：岁印、解锁树、岁劫难度
│        ├─ Sim/      离线自动对局模拟器（命令行可跑）
│        └─ UI/       UMG 的 C++ 基类（蓝图做表现层）
│
├─ studio/                        # 本地生图线（ComfyUI + FLUX.2 Klein）
│  ├─ README.md                   # 产线总览与三步跑通
│  ├─ comfy/workflows/            # ComfyUI API 格式工作流 JSON
│  ├─ prompts/                    # 风格锚 C1 / 系修饰词 / 季节色板 / 主题模板 / 硬规则
│  ├─ jobs/                       # 批单（JSONL）
│  ├─ scripts/                    # PowerShell：启动 / 体检 / 批量生成
│  └─ out/                        # 产出 + manifest.jsonl（大图不入 git）
│
├─ shared/                        # 引擎与生图线共读的契约
│  ├─ README.md
│  ├─ validate.ps1                # schema 校验 + 交叉引用完整性
│  ├─ schema/                     # common / warden / card / synergy / keyword / node / story / manifest
│  └─ examples/                   # 样例数据（自洽、可校验）
│
├─ tools/                         # 开发期脚本
│  ├─ README.md
│  ├─ check-env.ps1               # 只读体检
│  ├─ find-ue.ps1                 # 探测引擎安装路径（导出可复用函数）
│  ├─ install-epic-launcher.ps1   # 安装 Epic Launcher（用户主动执行）
│  ├─ install-vs-buildtools.ps1   # 安装 VS2022 生成工具 + C++ 工作负载（用户主动执行）
│  ├─ configure-vscode.ps1        # 把引擎路径写入 .vscode
│  ├─ gen-projectfiles.ps1        # 生成 Solstice.sln / compile_commands.json
│  ├─ build.ps1                   # 编译 SolsticeEditor
│  ├─ launch-editor.ps1           # 启动虚幻编辑器
│  └─ vscode-extensions.ps1       # VSCode 扩展体检 / 安装推荐 / 卸载无关
│
├─ docs/
│  ├─ DESIGN.md                   # 唯一真源
│  ├─ STORY.md                    # 世界观与叙事骨架
│  ├─ ART-STYLE.md                # 美术风格规范（C1「纸墨卡通」）
│  ├─ STRUCTURE.md                # 本文件
│  ├─ ENV.md                      # 开发环境
│  ├─ VSCODE.md                   # VSCode 工作区配置与扩展分析
│  ├─ SYNC.md                     # 双机同步
│  └─ BALANCE.md                  # 数值与模拟器结论（M3 后建立）
│
├─ .vscode/
│  ├─ settings.json               # 主配置（编码/缩进/排除/C++/PS/终端）
│  ├─ extensions.json             # 扩展唯一真源（recommendations / unwanted）
│  ├─ tasks.json                  # 构建 / 工程文件 / 契约校验 / 生图 / Git
│  ├─ launch.json                 # cppvsdbg attach·launch + PowerShell 调试
│  ├─ c_cpp_properties.json       # IntelliSense（含 __UE_ENGINE_ROOT__ 占位）
│  ├─ solstice.code-workspace     # 工作区文件（单根 = 仓库根，见 VSCODE.md §5）
│  └─ solstice.code-snippets      # C++ 片段（uclass / ustruct / uenum / ulog …）
│
└─ .codebuddy/                    # CodeBuddy 项目数据（**不可删除**；进 git 以随双机同步）
   └─ agents/                     # 自定义 subagent（见 §1.1）
```

### 1.1 自定义 subagent（`.codebuddy/agents/`）

| 文件 | 何时委派 |
|---|---|
| `ue-code-guard.md` | 新增/改动 `game/Source/**` 的 C++：命名、模块依赖方向、反射宏、`.clang-format` 风格 |
| `build-doctor.md` | 编译失败、IntelliSense 报红、找不到引擎、Live Coding 还是全量重编拿不准 |
| `blueprint-guide-writer.md` | 需要人工在 UE 编辑器里连蓝图/建资产 → 产出逐条说明书追加到 `game/BLUEPRINT-GUIDE.md` |

> 项目级（`.codebuddy/agents/`）优先级高于用户级（`~/.codebuddy/agents/`）；组件注册在会话初始化时发生，**新建后需新开会话**才生效。
> 定义格式：YAML frontmatter（`name` / `description` / `model` / `color`）+ 正文即 system prompt；`description` 决定主 Agent 何时自动委派。

---

## 2. 归位决策表

新增一个文件时，按下表判定归属：

| 该文件是… | 放这里 | 例 |
|---|---|---|
| 进游戏发行包的运行时代码 / 配置 | `game/` | C++ 模块、`Config/*.ini` |
| 引擎里做出来的资产（关卡/材质/蓝图/DataAsset） | `game/Content/` | `BP_*.uasset`、`M_*.uasset` |
| 产出素材、生图工作流、图像产物 | `studio/` | prompt、批单、卡面 PNG、manifest |
| **双方共读**的字段定义（引擎与生图线） | `shared/` | JSON Schema、枚举、id 规则 |
| 开发期一次性/可重复运行的脚本工具 | `tools/` | PS 脚本 |
| 说明性文档 | `docs/` | 设计 / 环境 / 结构 |
| 编辑器 / IDE 配置 | `.vscode/` | tasks / launch / settings |

**冲突判定**：
- 同时像 `game/` 与 `studio/` → 看"是否进发行包"；进包 → `game/`，否则 → `studio/`。
- 一个口径同时被引擎和生图线引用 → 提炼进 `shared/schema/`。
- 一句说明写在代码注释够用 → 不要新建文档。

---

## 3. 命名规则

### 3.1 C++（UE 约定）

| 类别 | 规则 | 例 |
|---|---|---|
| UObject 派生类 | `U` 前缀 | `USolsticeDataSubsystem` |
| AActor 派生类 | `A` 前缀 | `ASolsticeBoardActor` |
| 纯结构体 | `F` 前缀 | `FCardDefinition` |
| 枚举 | `E` 前缀 | `ESolsticeElement` |
| 布尔成员 | `b` 前缀 | `bIsMerged` |
| 文件 / 头文件名 | 与主类名一致（去掉类型前缀） | `BattleSubsystem.h` 内定义 `USolsticeBattleSubsystem` |
| 模块 / 目标 | `Solstice` / `SolsticeEditor` | `Solstice.Build.cs` |

### 3.2 数据 id（与 `shared/schema/` 一致）

| 对象 | 规则 | 例 |
|---|---|---|
| 值守者 Warden | `wd.<slug>` | `wd.tingshou` |
| 卡牌 Card | `card.<slug>` | `card.pine-bulwark` |
| 羁绊 Synergy | `syn.<slug>` | `syn.wood-4` |
| 词条 Keyword | `kw.<slug>` | `kw.bulwark` |
| 节点 Node | `node.<termIndex>.<kind>` | `node.07.shop` |
| 剧情事件 StoryEvent | `ev.<slug>` | `ev.first-thaw` |
| 素材 Manifest | `img.<slug>` | `img.card-pine-bulwark` |

- `element` 取值：`wood|fire|earth|water|metal|sun|moon|spirit`
- `origin` 取值：`court|sea|ridge|palace`
- `kind`（卡）：`familiar|rite`；`kind`（节点）：`encounter|shop|event|elite|boss`；`rarity`：`common|rare|epic|legend`
- `<slug>` 统一：小写字母开头，仅含 `[a-z0-9-]`

### 3.3 studio 产出文件名

| 产物 | 规则 | 位置 |
|---|---|---|
| 卡面 | `<card.id>.png`（1024×1365，画芯无文字无边框） | `studio/out/card/` |
| 立绘 | `<card.id>.sprite.png`（1024×1024，纯色底） | `studio/out/sprite/` |
| 产出留档 | 每行一条 JSON | `studio/out/manifest.jsonl` |
| 批单 | `<batch-id>.jsonl` | `studio/jobs/` |

### 3.4 文档命名

全大写 + 连字符分段（`ART-STYLE.md`、`BLUEPRINT-GUIDE.md`）。`DESIGN.md` 是唯一真源。

---

## 4. 模块依赖方向（不可逆）

```
UI  ──→  Run  ──→  Battle  ──→  Board  ──→  Data
                  Battle  ──→  Sim（单向，Sim 只读 Battle/Board）
Core/Data 不依赖以上任何模块
```

- **`Data` 与 `Core` 不得反向依赖 `Battle` / `Run` / `UI`。**
- **`Battle` / `Board` 不得依赖渲染、Tick、玩家输入**（这是离线模拟器的前提，见 `DESIGN.md` §5.8）。

---

## 5. 什么进 git / 什么不进（策略）

**进 git**：`docs/**`、`README.md`、`tools/**`、`.vscode/**`、`.codebuddy/agents/**`、`game/Source/**`、`game/Config/**`、`game/*.uproject`、`shared/**`、`studio/{prompts,jobs,scripts,comfy,README.md}`、`studio/out/manifest.jsonl`。

**不进 git**：`game/Content/**` 下的二进制资产（`.uasset/.umap`）、`game/{Binaries,Intermediate,Saved,DerivedDataCache}/**`、`game/*.sln`、`compile_commands.json`、`.vs/**`、`studio/out/**` 的大图、`*.log`。

**大资产策略**：默认由管线和编辑器本地再生；确需跨机共享少量关键资产时启用 **Git LFS**（限定路径，见 `SYNC.md`）。

> 具体忽略规则由仓库根 `.gitignore` 维护；本文件只描述策略。
