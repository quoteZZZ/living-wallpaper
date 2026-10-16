---
id: tech/STRUCTURE
title: 目录与命名唯一真源
version: 3.5
date: 2026-10-17
status: active
truth: subsystem
owner: ai
---

# 目录与命名唯一真源（STRUCTURE）

> **本文档是"新文件放哪、叫什么"的唯一真源。** 与 [`../charter/GDD.md`](../charter/GDD.md) 冲突时以 GDD 为准，并在同一次改动内同步修正本文。
> 版本 3.0（2026-10-16）：M0 工程落地，`game/` `studio/` `shared/` 三个目录由"计划中"转为"现状"，**全文状态列据实改写**；`Source/` 结构按实际编译通过的工程修正（`.Target.cs` 在 `Source/` 下，不在工程根）。
> 版本 3.1（2026-10-16）：提交前自检脚本入库 `tools/checks/`（INDEX §5 命令同步）；`Content/` 子目录树对齐实际；§3 依赖清单按 Build.cs 瘦身修正；登记 §10.7 打包 stage 待办。
> 版本 3.2（2026-10-16）：自检自动执行两道闸门入库——`tools/hooks/` pre-commit + `tools/install-hooks.ps1`（本地）、`.github/workflows/checks.yml`（CI，无需引擎）；validate-contracts 扩展本地化 key 对齐校验。
> 版本 3.3（2026-10-16）：修复 cards 数据 `mat`→`material` 键名（DataLoader `ReadParams` 只认 `material`，原字符串被 `Atof` 解析成 0 = Paper 材质）；`card.schema.json` params 收紧为 key 白名单 + material/weather 枚举；新增 `save.schema.json` 信封骨架 + `shared/fixtures/save.sample.json`，validate-contracts 扩为 6 对契约。
> 版本 3.4（2026-10-16）：双机协作废止、回归单机开发——§9 改写为「git 与 Content 重建」（可重建性保证对单机 / 重装 / 换机同样成立）；`ops/SYNC.md` 归档（`archive/SYNC-v1.1.md`），§11 更新触发同步；头部版本号与沿革对齐（3.3 曾漏记）。
> 旧稿（v1.0）的 `app/` `studio/` `shared/` 三分法已作废——`app/` 随旧形态删除。

---

## 0 分层原则与状态

| 层 | 定位 | 入 git | **状态** |
|---|---|---|---|
| `game/` | **进发行包**：UE 工程、源码、配置 | 源码 / 配置 **入**；二进制资产 **不入** | ✅ **现状**（`.uproject` + 2 个 Target + 主模块 `Solstice` + 编辑器模块 `SolsticeEditor`；M0 目标已编译通过并实测运行） |
| `studio/` | **产出素材**：ComfyUI 生图线、生成产物、风格锚与预设 | 工作流 / 任务 / 预设 / manifest **入**；产物 **不入** | ✅ **现状**（工作流 / jobs / 预设 / 驱动脚本已落地；`out/` 产物尚未生成，`manifest.jsonl` 仅表头） |
| `shared/` | **双方共读的契约**：JSON Schema | **入** | ✅ **现状**（`schema/` 4 个：`card` / `species` / `world` / `save`（信封骨架）+ `fixtures/` 1 个；`style` 待 M1） |
| `tools/` | **开发期脚本**：环境、工程生成、构建、内容生成、基准、提交前自检、提交钩子 | **入** | ✅ **现状**（12 个 PowerShell + `checks/` 2 个 Python + `hooks/` pre-commit + README） |
| `docs/` | 设计与约定文档 | **入** | ✅ **现状**（结构见 [`../INDEX.md`](../INDEX.md)） |
| `.github/` | **CI**：GitHub Actions 跑 `tools/checks/` 两条自检（无需引擎） | **入** | ✅ **现状**（`workflows/checks.yml`） |
| `.vscode/` `.codebuddy/` `.workbuddy/` | IDE 与项目数据配置 | **入** | ✅ **现状** |

**核心不变量**：`game/Content/` 的二进制资产**不入 git**，因此必须**可由"种子 + 生成器 + 契约 + manifest"完整重建**。这是全部目录设计的出发点。

M0 的两个纸材质主材质（`/Game/Core/M_Paper`、`M_Ink`）是这条不变量的第一个真实样本：它们不存在于 git，由 `tools\gen-assets.ps1` 调 `SolsticeEditor` 的生成器按代码建图后写出。

---

## 1 仓库总览

```text
solstice/
├─ game/          ✅ 现状  —— 虚幻引擎工程（进发行包）
├─ studio/        ✅ 现状  —— 本地生图线 + 程序化资产产物
├─ shared/        ✅ 现状  —— 契约：JSON Schema（引擎与生图线共读）
├─ tools/         ✅ 现状  —— 开发期脚本：环境 / 工程生成 / 构建 / 内容生成 / 基准 / 自检（checks/）/ 提交钩子（hooks/）
├─ docs/          ✅ 现状  —— 见 ../INDEX.md（charter / setting / gameplay / art / tech / plan / ops / archive）
├─ .github/       ✅ 现状  —— CI：GitHub Actions 跑 checks/ 两条自检（无需引擎）
├─ .vscode/       ✅ 现状  —— 构建任务 / 调试 / cpptools / 代码片段
├─ .codebuddy/    ✅ 现状  —— agents/ 与 rules/（项目数据，勿删）
├─ .workbuddy/    ✅ 现状  —— memory/：工作日志与长期项目笔记（项目数据，勿删）
├─ .clang-format  ✅ 现状
├─ .editorconfig  ✅ 现状
├─ .gitignore     ✅ 现状
└─ README.md      ✅ 现状  —— 入口页
```

> **规则**：凡本文出现 `🟡 计划中` 的目录，**不要按其存在去写代码或脚本**；建立目录时把状态列改为 `✅ 现状`。

---

## 2 `game/`（进发行包）✅ 现状

```text
game/
├─ Solstice.uproject
├─ Config/
│  ├─ DefaultEngine.ini  DefaultGame.ini  DefaultInput.ini
│  └─ Solstice/
│     ├─ Data/                  ★ 运行时契约 JSON（cards.earth / cards.fire / cards.metal / species / world）
│     └─ Localization/          ★ 中英双语文本（zh-Hans.json / en.json）
├─ Content/                     ⚠ 二进制资产不入 git；目录骨架（每子目录 .gitkeep）入 git
│  ├─ Core/                     M_Paper.uasset / M_Ink.uasset（由 gen-assets.ps1 生成）
│  └─ World/ Cards/ UI/ Data/ Levels/   目前均为占位；用途与生成方见 game/Content/README.md
├─ Source/
│  ├─ Solstice.Target.cs            游戏目标（无编辑器依赖，产出 Solstice.exe）
│  ├─ SolsticeEditor.Target.cs      编辑器目标（产出 UnrealEditor-SolsticeEditor.dll）
│  ├─ Solstice/                 ★ 主模块
│  │  ├─ Core/   启动（GameInstance）、现实锚、数据加载、本地化
│  │  ├─ Sim/    世界钟（双模式）+ 地形 / 生态域 / 天气 / 生态 / 卡指令 / 余响 / 编年史（纯逻辑，零渲染依赖）
│  │  ├─ Gen/    程序化几何生成器（纸板层 / 描边卡 / 轮廓带）
│  │  ├─ World/  分块网格构建与脏标记重建（`ASolsticeRealm`）
│  │  ├─ God/    观察者、玩家控制器、游戏模式
│  │  ├─ UI/     HUD（纯 Slate，无 UMG 资产）
│  │  └─ Render/ 纸雕渲染：主材质解析、Cel 分带、天空调色
│  └─ SolsticeEditor/           编辑器模块：Commandlet（资产生成 / 无头基准）
└─ (无 Plugins/ —— 尚未需要；ProceduralMeshComponent 直接启用引擎自带插件)
```

> **`.Target.cs` 放在 `Source/` 下，不是工程根**：UE 5.8 的 `ProjectRulesAssembly` 只 glob `Source/*.Target.cs`，放根目录会报 `Couldn't find target rules file`。
> `Binaries/`、`Intermediate/`、`Saved/`、`DerivedDataCache/` 由引擎生成，已在 `.gitignore` 忽略。

---

## 3 `Source/` 模块约定

| 模块 | 依赖 | 说明 |
|---|---|---|
| `Solstice` | 公共 `Core` `CoreUObject` `Engine` `InputCore` `Json` `ProceduralMeshComponent`；私有 `Slate` `SlateCore` `HTTP`（**无** UMG / JsonUtilities / RenderCore / RHI / Niagara / Lumen / Nanite） | 主模块。`Sim/` 子目录**禁止** include 渲染 / 输入 / UObject 头 |
| `SolsticeEditor` | `Solstice` + `UnrealEd` `MaterialEditor` `AssetTools` `AssetRegistry` `RenderCore` `RHI` | 类型 `Editor`，`LoadingPhase: Default`。两个 Commandlet：`SolsticeGenAssets`（生成主材质）、`SolsticeBench`（无头确定性回归） |

**主材质是靠代码建图生成的**：`UnrealEd` 只在编辑器模块里，而运行模块不能链接它，所以运行模块把"怎么生成"这件事抽象成一个 `TFunction`（`Solstice::GBuildPaperMaterials`），编辑器模块在 `StartupModule` 里把它的实现塞进去。运行模块在 `/Game/Core/M_Paper` 缺失时才调它一次——这就是新克隆自愈的机制。

**`LoadingPhase` 必须是 `Default`，不能是 `PostEngineInit`**：`-run=XxxCommandlet` 的类解析发生在 `LaunchEngineLoop.cpp:3931`，而 `PostEngineInit` 阶段的项目模块加载在同文件 `4861` ——命令行解析时模块还没加载，会直接报 `looked like a commandlet, but we could not find the class`（实测踩过）。`Default` 阶段加载在 `3896`，早于解析。`-game` 下 `GIsEditor` 为假，`EHostType::Editor` 模块仍然不会加载（`ModuleDescriptor.cpp:730`），所以这条改动不影响发行路径。

**目标与模块同名不同物**：`.Target.cs` 是构建目标，`Source/Solstice/` 是模块。新增能力优先落在主模块的对应子目录，**不要新建模块**。M0 曾计划独立 `SolsticeSim` 模块 / 目标，实测下来 `Solstice` 目标本身就是无编辑器依赖的可执行文件，再加一个完全相同的 Game 目标只会让人困惑，故删除；无头回归改为 `SolsticeEditor` 的 `SolsticeBench` Commandlet（同样不碰 RHI / World / GameMode，足以证明 `Sim/` 可无头运行）。真正零引擎依赖的独立 Sim 模块留到 M1 存档格式需要它时再做。

---

## 4 `studio/`（产出素材）✅ 现状

```text
studio/
├─ README.md
├─ workflows/      ComfyUI 工作流 JSON（当前：paper-texture）
├─ jobs/           批量任务清单（jsonl）：模型、prompt、seed、尺寸、输出名（当前：paper-textures.jsonl）
├─ presets/        ★ 风格主题参数（入 git，当前：paper-diorama.json）
├─ tools/          ★ 驱动脚本：调 ComfyUI HTTP API 跑 jobs、写 manifest（当前：comfy_batch.py）
├─ out/            ⚠ 生成产物（不入 git，manifest 入 git）
│  ├─ cards/        卡面（3:4）
│  ├─ cutouts/      纸板立牌贴图（纯色底，供抠图）
│  ├─ textures/     纸纹 / 地表 / 水纹 / 苔藓
│  └─ manifest.jsonl  ★ 逐张留档：模型 / prompt / seed / 日期（Steam AI 披露用）
└─ work/           ⚠ 临时试验（不入 git）
```

> **与 v2.4 的差异**：原定 `refs/`（风格锚图）与 `scripts/`（PowerShell）实测未按原计划建立——驱动脚本落在 `studio/tools/comfy_batch.py`。`refs/` 待第一批风格锚图产出时再建（留档要求仍见 [`../art/ASSETS.md`](../art/ASSETS.md)）。

**脚本语言**：`studio/tools/` 与 `tools/` 调外部 HTTP 服务用 **PowerShell 或 Python**均可（当前 `comfy_batch.py` 是 Python，因为要复用 ComfyUI 的 JSON 工作流结构）；**编辑器内的资产批处理**用 `SolsticeEditor` 的 Commandlet。**游戏逻辑不使用 Python**。
**登记规范**：manifest 字段、批次一致性、QC 与合规见 [`../art/ASSETS.md`](../art/ASSETS.md)。

---

## 5 `shared/`（契约）✅ 现状

```text
shared/
├─ README.md
├─ fixtures/
│  └─ save.sample.json     存档信封样例（validate-contracts 第 6 对契约的校验对象；M1 实装的真值参考）
└─ schema/
   ├─ species.schema.json   物种模板（[`../setting/SPECIES.md`](../setting/SPECIES.md) §1）
   ├─ card.schema.json      干涉卡（元素 / 级 / 卡型 / 持续性 / 作用域 / 参数白名单）
   ├─ world.schema.json     界：尺寸 / 地形算法与种子 / 生态域 / 水体 / 大气 / 法则
   └─ save.schema.json      存档信封：版本 + 元数据 + 快照 / 卡池历史 / 年表容器（载荷 M1 收紧）
```

**待 M1**：`style.schema.json`（风格主题参数）；`save.schema.json` 已落**信封骨架**（版本 + 元数据 + 三个载荷容器），snapshot / card_history / chronicle 的内部结构 M1 收紧（规划：元数据 + 快照 + 卡池历史 + 年表）。

契约是 `game/Config/Solstice/Data/` 与 `studio/presets/` 的**共同校验源**：改契约必须同步改两边数据。

---

## 6 运行时文件位置（发行版）

| 内容 | 位置 | 备注 |
|---|---|---|
| 契约数据 | `game/Config/Solstice/Data/*.json` | 运行时读 `FPaths::ProjectConfigDir()`；⚠ **打包 stage 未配置**（UAT 不带 Config 下非 ini 文件，见 §10.7） |
| 本地化 | `game/Config/Solstice/Localization/` | 中英双语（文案规范见 [`../setting/WORLD.md`](../setting/WORLD.md) §3）；打包同 §10.7 |
| 存档（每界一份） | `%LOCALAPPDATA%\Solstice\Saved\SaveGames\<realmId>.sav` | 键前缀 `solstice.save.v<n>` |
| 导出的界 | `%USERPROFILE%\Documents\Solstice\Exports\<realmId>.solstice` | 导入 / 导出用 |
| 日志 / 崩溃 | `Saved/Logs`、`Saved/Crashes` | 不入 git |
| 着色器缓存 DDC | `D:\UE-DDC`（环境变量 `UE-LocalDataCachePath`） | **必须外置**，否则吃 C 盘 |

---

## 7 命名规范

### 7.1 C++

| 类型 | 前缀 | 示例 |
|---|---|---|
| UObject / UActorComponent | `U` | `USolsticeGameInstance` |
| AActor | `A` | `ASolsticeRealm` |
| 结构体 | `F` | `FTile`、`FCatalog` |
| 枚举 | `E` | `ETimeMode`、`EBiome` |
| 接口 | `I` | `ISolsticeTickable` |
| 纯逻辑类（`Sim/` 内） | `F` + 无 UObject | `FSimKernel`、`FRngBank` |

规则：**`Sim/` 内不出现 `UObject` 派生**（保持零引擎依赖可测）。
**跨 DLL 可见的公共类型必须标 `SOLSTICE_API`**：`UnrealEditor-Solstice.dll` 与 `UnrealEditor-SolsticeEditor.dll` 是两个 DLL，未标注的符号不会导出，编辑器模块会在链接期报 `LNK2019`（实测踩过两次：`FPaperMaterials`、`FSimKernel`/`FDataLoader`）。

### 7.2 资产

| 类型 | 前缀 | 示例 |
|---|---|---|
| 静态网格 | `SM_` | `SM_PaperRock_A` |
| 材质 / 实例 | `M_` / `MI_` | `M_Paper` / `MI_Style_Woodcut` |
| 贴图 | `T_` | `T_Card_WeatherRain` |
| Niagara | `NS_` | `NS_Rain_Light` |
| 控件蓝图 | `WBP_` | `WBP_RealmHud` |
| 蓝图类 | `BP_` | `BP_RealmPawn` |
| DataAsset / DataTable | `DA_` / `DT_` | `DA_StyleTheme` / `DT_Cards` |
| 关卡 | `L_` | `L_Solstice` |

### 7.3 数据与目录

- JSON 文件：小写下划线，`species.json`、`cards.earth.json`、`styles.paper.json`
- **卡 id**：**唯一真源见 [`../setting/CARDS.md`](../setting/CARDS.md) §11**（示例 `card.water.3.rite.rain`、`card.fire+wood.4.rite.wildfire`；禁物 = `ban`，超环 = `over`）
- **物种 id**：`sp.<名>` → `sp.moss-grass`
- **界 id**：`realm.<slug>-<yyyymmdd>` → `realm.valley-20261016`
- **风格主题 id**：`style.<名>` → `style.paper-diorama`
- **预设 id**：`preset.<名>` → `preset.eternal-winter`
- **C++ 文件**：`Solstice<Xxx>.h/.cpp`，与类名一致
- **文档 id**：与 `docs/` 下的相对路径一致（`charter/GDD`、`tech/STRUCTURE`…），见 [`../INDEX.md`](../INDEX.md)

> 术语与命名的**语言层**规范（中英对照、文案禁忌）见 [`../setting/WORLD.md`](../setting/WORLD.md) §2。

---

## 8 归位决策表（新增东西放哪）

| 我要新增 | 放哪 | 入 git | 状态 |
|---|---|---|---|
| 一段游戏逻辑 | `game/Source/Solstice/<对应子目录>/` | ✅ | ✅ |
| 新干涉卡 | 数据 `game/Config/Solstice/Data/cards.*.json` + 卡面走 `studio/jobs/` | ✅ / 产物 ❌ | ✅ |
| 新物种 | `game/Config/Solstice/Data/species.json` + 几何生成器 `Source/Solstice/Gen/` | ✅ | ✅ |
| 新风格主题 | `shared/schema/style.schema.json` 参数（待 M1）+ `studio/presets/style.*.json` + `Content/Styles/<名>/` | 参数 ✅ / 资产 ❌ | 🟡 |
| 美术素材（贴图 / 立牌 / 卡面） | 源与参数 `studio/`，产物 `Content/` 对应子目录 | 源 ✅ / 产物 ❌ | 🟡 |
| 新控件 | C++ 优先（`Source/Solstice/UI/` Slate）；可视化打磨放 `Content/UI/` | ✅ / ❌ | ✅ |
| 新的无头检查 / 批处理 | `Source/SolsticeEditor/` 增 Commandlet，并在 `tools/` 加同名薄包装脚本 | ✅ | ✅ |
| 环境或构建脚本 | `tools/` | ✅ | ✅ |
| 文档 / 契约自检脚本 | `tools/checks/`（Python，标准库） | ✅ | ✅ |
| 提交钩子 / CI 工作流 | `tools/hooks/` + `.github/workflows/`（只包 checks/ 现有两条，不新增逻辑） | ✅ | ✅ |
| 设计文档 | `docs/`（先读 [`../INDEX.md`](../INDEX.md) 的事务域表） | ✅ | ✅ |
| 存档 / 日志 / 缓存 | `Saved/`、`D:\UE-DDC` | ❌ | ✅ |
| 临时试验 | `studio/work/`（已忽略）或仓库根 `tmp/`（已忽略） | ❌ | ✅ |

---

## 9 git 与 Content 重建

**入 git**：`game/Source`、`game/Config`、`game/Solstice.uproject`、`game/Content/README.md` 与 `.gitkeep`、`shared/`、`studio/{workflows,jobs,presets,tools,README.md}`、`studio/out/manifest.jsonl`、`tools/`、`docs/`、`.vscode/`、`.github/`、`.codebuddy/`、`.workbuddy/`、`.gitattributes`。

**不入 git**：`game/{Binaries,Intermediate,Saved,DerivedDataCache}`、`game/Content/**` 的二进制（含生成的 `M_Paper.uasset` / `M_Ink.uasset`）、`studio/out/**`（除 manifest）、`studio/work/**`、`.vs/`、`*.sln`、`*.slnx`、`.vsconfig`、`tmp/`。

**可重建性的保证**（对单机开发、重装系统、更换机器同样成立）：Content 不入 git ⇒ **同一套"种子 + 生成器 + 契约 + manifest"**可完整重建产物。因此：
1. 生成器与契约的改动必须与产物**同一次提交**；
2. manifest 是产物的"身份证明"，缺 manifest 的素材视为**不可复现**，不得进游戏；
3. 卡面 / 立绘类素材**单独提交**，先过用户裁决。

> **操作细节**：提交规范见 [`../ops/WORKFLOW.md`](../ops/WORKFLOW.md) §3 / §5。本节只定义**哪些目录入 git**。旧的双机同步约定（`SYNC` v1.1）已随双机协作废止而归档。

---

## 10 由本文带来的待办

1. ~~重建 `studio/`~~ ✅ 已落地（工作流 / jobs / 预设 / 驱动脚本）。
2. ~~重建 `shared/schema/`~~ ✅ 已落地 4 个（`save` 为信封骨架）；`style` 待 M1。
3. ~~`game/` 工程骨架~~ ✅ 已落地（`.uproject` + 2 个 Target + 2 个模块，编译并运行通过）。
4. ~~`tools/` 新增 headless 基准脚本入口~~ ✅ `tools/bench.ps1`；另加 `tools/gen-assets.ps1`。
5. ~~落地后回来改状态列~~ ✅ 本文 v3.0 已改。
6. **待 M1**：`studio/refs/`（风格锚图）、`shared/schema/style.schema.json`、`save.schema.json` 载荷收紧（信封已落地）、独立零依赖 Sim 模块。
7. **待 P5**：**运行时 JSON 打包 stage**——`game/Config/Solstice/{Data,Localization}/*.json` 走 `FPaths::ProjectConfigDir()`，UAT 默认只 stage `Default*.ini`，打包版读不到。方案：迁 `game/Content/Solstice/` + `DefaultGame.ini` 加 `+DirectoriesToAlwaysStageAsUFS`，同步改 `FDataLoader` 路径与本文 §2/§6，并实测一次打包。

---

## 11 更新触发

| 改动类型 | 必须同次更新 |
|---|---|
| 新增 / 移动目录、改命名 | 本文件对应章节（含 §8 归位表）+ `.gitignore` 注释 + [`../INDEX.md`](../INDEX.md) |
| 目录从"计划"变为"现状" | 本文件所有 🟡 状态列 + 相关文档的存在性描述 |
| 入 git 策略变化 | 本文件 §9 + [`../ops/WORKFLOW.md`](../ops/WORKFLOW.md) §5 |
| 模块 / Target / Commandlet 增删 | 本文件 §2 / §3 + [`../ops/ENV.md`](../ops/ENV.md) §2.6 |
| 命名规范变化 | 本文件 §7 + [`../setting/WORLD.md`](../setting/WORLD.md) §2（如涉及文案用词） |

---

## 沿革

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0 | 2026-10-13 | 旧三分法（`app/` / `studio/` / `shared/`）——**已作废** |
| 2.0 | 2026-10-14 | 按 GDD 重写：`game/` / `studio/` / `shared/` 三分，模块约定、命名规范、归位决策表 |
| 2.1 | 2026-10-14 | 补 🟡/✅ **状态列**（消除"文档说有、实际没有"）；git 操作细节移交 `ops/`；补文档 id 约定与更新触发；迁入 `docs/tech/` |
| 2.2 | 2026-10-14 | 版本号对齐（内容无变更记录） |
| 2.3 | 2026-10-15 | `card.schema.json` 注记去「类别」（第 42 轮：类别维度删除） |
| 2.4 | 2026-10-15 | `card.schema.json` 注记「卡型」改「持续性」（第 43 轮） |
| 3.0 | 2026-10-16 | M0 落地：`game/` `studio/` `shared/` 转 ✅；`Source/` 结构按实测修正（`.Target.cs` 在 `Source/` 下）；`SolsticeSim` 模块与目标取消，无头回归改 `SolsticeBench` Commandlet；补 `SOLSTICE_API` 跨 DLL 导出规则与 `LoadingPhase: Default` 的成因；`.workbuddy/`（工具侧项目数据）按 `.codebuddy/` 同一约定入库 |
| 3.1 | 2026-10-16 | 提交前自检脚本入库 `tools/checks/`（check-links / validate-contracts，标准库实现）；`Content/` 子目录树对齐实际（6 子目录）；§3 依赖清单按 Build.cs 实测瘦身（去 UMG / JsonUtilities / RenderCore / RHI）；§6/§10.7 登记运行时 JSON 打包 stage 待办（P5 前必须） |
| 3.2 | 2026-10-16 | 自检自动执行两道闸门：`tools/hooks/pre-commit` + `tools/install-hooks.ps1`（本地，`core.hooksPath`）、`.github/workflows/checks.yml`（CI，无需引擎）；validate-contracts 扩展 Localization 双语言 key 对齐 + 占位符校验；新增 `.gitattributes`（钩子 LF 锁定） |
| 3.3 | 2026-10-16 | 修复 cards 数据 `mat`→`material` 键名（6 处；`ReadParams` 只认 `material`，原值被 `Atof` 解析成 0 = Paper 材质）；`card.schema.json` params 收紧为 key 白名单 + material / weather 枚举（堵静默漂移）；新增 `save.schema.json` 信封骨架 + `shared/fixtures/save.sample.json`；validate-contracts 扩为 6 对契约（PAIRS 携带各自数据目录） |
| 3.4 | 2026-10-16 | 双机协作废止、回归单机开发：§9 改写为「git 与 Content 重建」（单机 / 重装 / 换机均可重建）；`ops/SYNC.md` 归档 `archive/SYNC-v1.1.md`；§11 触发行改指 WORKFLOW §5；frontmatter 版本号对齐沿革（3.3 曾漏记） |
| 3.5 | 2026-10-17 | §9「不入 git」补 `*.slnx`（VS2026 起 UBT 亦生成）与 `.vsconfig`（UBT 生成的 VS 组件清单），`.gitignore` 同步；同批修复 `tools/configure-vscode.ps1` 把 `.vscode` 三份配置中文写成乱码的 UTF-8 读取缺陷 |
