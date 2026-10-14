---
id: tech/STRUCTURE
title: 目录与命名唯一真源
version: 2.1
date: 2026-10-14
status: active
truth: subsystem
owner: ai
---

# 目录与命名唯一真源（STRUCTURE）

> **本文档是"新文件放哪、叫什么"的唯一真源。** 与 [`../charter/GDD.md`](../charter/GDD.md) 冲突时以 GDD 为准，并在同一次改动内同步修正本文。
> 版本 2.1（2026-10-14）：按 GDD v6.0 对齐；**为所有"计划中但尚未落地"的目录补状态列**，消除文档与仓库实际的矛盾。
> 旧稿（v1.0）的 `app/` `studio/` `shared/` 三分法已作废——`app/` 随旧形态删除；`studio/` 与 `shared/` **按本文重建（尚未落地）**。

---

## 0 分层原则与状态

| 层 | 定位 | 入 git | **状态** |
|---|---|---|---|
| `game/` | **进发行包**：UE 工程、源码、配置 | 源码 / 配置 **入**；二进制资产 **不入** | 🟡 **计划中**（随 M0 建立，当前只有被忽略的本地缓存目录） |
| `studio/` | **产出素材**：ComfyUI 生图线、生成产物、风格锚与预设 | 工作流 / 任务 / 预设 / manifest **入**；产物 **不入** | 🟡 **计划中**（当前不存在；生图能力在本机 `D:\ComfyUI`，见 [`../ops/ENV.md`](../ops/ENV.md) §3） |
| `shared/` | **双方共读的契约**：JSON Schema | **入** | 🟡 **计划中**（当前不存在） |
| `tools/` | **开发期脚本**：环境、工程生成、构建、基准 | **入** | ✅ **现状**（9 个 PowerShell + README） |
| `docs/` | 设计与约定文档 | **入** | ✅ **现状**（结构见 [`../INDEX.md`](../INDEX.md)） |
| `.vscode/` `.codebuddy/` | IDE 与项目数据配置 | **入** | ✅ **现状** |

**核心不变量**：`game/Content/` 的二进制资产**不入 git**，因此必须**可由"种子 + 生成器 + 契约 + manifest"完整重建**。这是全部目录设计的出发点。

---

## 1 仓库总览

```text
solstice/
├─ game/          🟡 计划中 —— 虚幻引擎工程（进发行包）
├─ studio/        🟡 计划中 —— 本地生图线 + 程序化资产产物
├─ shared/        🟡 计划中 —— 契约：JSON Schema（引擎与生图线共读）
├─ tools/         ✅ 现状  —— 开发期脚本：环境 / 工程生成 / 构建 / 基准
├─ docs/          ✅ 现状  —— 见 ../INDEX.md（charter / content / art / tech / plan / ops / archive）
├─ .vscode/       ✅ 现状  —— 构建任务 / 调试 / cpptools / 代码片段
├─ .codebuddy/    ✅ 现状  —— agents/ 与 rules/（项目数据，勿删）
├─ .clang-format  ✅ 现状
├─ .editorconfig  ✅ 现状
├─ .gitignore     ✅ 现状
└─ README.md      ✅ 现状  —— 入口页
```

> **规则**：凡本文出现 `🟡 计划中` 的目录，**不要按其存在去写代码或脚本**；建立目录时把状态列改为 `✅ 现状`。

---

## 2 `game/`（进发行包）🟡 计划中

```text
game/
├─ Solstice.uproject
├─ Config/
│  ├─ DefaultEngine.ini  DefaultGame.ini  DefaultInput.ini  DefaultEditor.ini
│  └─ Solstice/
│     ├─ Data/                  ★ 运行时契约 JSON（species / cards / world / style / preset）
│     └─ Localization/          ★ 中英双语文本（zh-Hans / en）
├─ Content/                     ⚠ 二进制资产，不入 git（可由管线重建）
│  ├─ Core/                     母材质、渲染管线参数、基础蓝图
│  ├─ Styles/                   ★ 风格主题资产：每个主题一个子目录（材质实例、后期、调色板）
│  ├─ World/                    地形纸板模板、岩石、水体、植被
│  ├─ Creatures/                动物部件集（几何生成器模板）
│  ├─ Cards/                    卡面贴图（游戏用；源与 manifest 在 studio/）
│  ├─ UI/                       UMG 控件蓝图、九宫格、图标
│  ├─ FX/                       Niagara 系统与粒子贴图
│  ├─ Data/                     生成的 DataTable / DataAsset（由脚本灌入）
│  └─ Levels/                   `L_Solstice`（单一空关卡）
├─ Source/
│  ├─ Solstice/                 ★ 主模块
│  │  ├─ Core/   启动、存档与多界、现实锚、事件总线、数据加载
│  │  ├─ Sim/    世界钟（双模式）+ 生态演化 + 模拟 LOD（纯逻辑，零渲染依赖）
│  │  ├─ World/  地形分块、水体、种群、生态域、脏标记重建
│  │  ├─ God/    卡池与指令系统、接管与释放
│  │  ├─ Gen/    程序化几何生成器（纸板层、岩石、植物、动物部件）
│  │  ├─ UI/     HUD（默认 C++ 构建控件树）
│  │  └─ Render/ 纸雕渲染管线：Cel LUT、描边、硬阴影、移轴、实例化
│  ├─ SolsticeEditor/           编辑器模块：Commandlet、资产生成、卡面导入
│  └─ SolsticeSim/              ★ headless 目标：基准与回归测试入口
├─ Plugins/
├─ Solstice.Target.cs          游戏目标
├─ SolsticeEditor.Target.cs    编辑器目标
└─ SolsticeSim.Target.cs       headless 目标（无渲染依赖）
```

> `Binaries/`、`Intermediate/`、`Saved/`、`DerivedDataCache/` 由引擎生成，已在 `.gitignore` 忽略。

---

## 3 `Source/` 模块约定

| 模块 | 依赖 | 说明 |
|---|---|---|
| `Solstice` | 引擎（Core / UMG / Niagara / **无** Lumen / Nanite 依赖） | 主模块，`Sim` 子目录**禁止** include 渲染相关头 |
| `SolsticeEditor` | `Solstice` + UnrealEd | Commandlet：生成材质、设置导入参数、灌 DataTable、批量导入卡面 |
| `SolsticeSim` | `Solstice` | **不带 UMG / Niagara / Render 依赖**，可在无窗口环境跑基准 |

**目标与模块同名不同物**：`.Target.cs` 是构建目标，`Source/Solstice/` 是模块。新增能力优先落在主模块的对应子目录，**不要新建模块**，除非确实有编辑器 / headless 隔离需求。

---

## 4 `studio/`（产出素材）🟡 计划中 —— 按本文重建

```text
studio/
├─ README.md
├─ workflows/      ComfyUI 工作流 JSON：卡面 / 纸板立牌 / 纸纹 / 粒子贴图 / 载入图
├─ jobs/           批量任务清单（jsonl）：模型、prompt、seed、尺寸、输出名
├─ refs/           ★ 风格锚图（入 git）：每个风格主题的对照基准
├─ presets/        ★ 风格主题参数（入 git，与 shared/schema/style.schema.json 对齐）
├─ out/            ⚠ 生成产物（不入 git，manifest 入 git）
│  ├─ cards/        卡面（3:4）
│  ├─ cutouts/      纸板立牌贴图（纯色底，供抠图）
│  ├─ textures/     纸纹 / 地表 / 水纹 / 苔藓
│  ├─ fx/           粒子贴图（雨滴、雪花、落叶、光斑）
│  └─ manifest.jsonl  ★ 逐张留档：模型 / prompt / seed / 日期（Steam AI 披露用）
└─ scripts/        ★ PowerShell：调 ComfyUI HTTP API 跑 jobs、写 manifest、导出到 game/Content
```

**脚本语言**：`studio/scripts/` 与 `tools/` 一律 **PowerShell**（调 ComfyUI API）；**编辑器内的资产批处理**用官方 **Python（ScriptPlugin）** 或 `SolsticeEditor` 的 Commandlet。**游戏逻辑不使用 Python**。
**登记规范**：manifest 字段、批次一致性、QC 与合规见 [`../art/ASSETS.md`](../art/ASSETS.md)。

---

## 5 `shared/`（契约）🟡 计划中 —— 按本文重建

```text
shared/
├─ README.md
└─ schema/
   ├─ species.schema.json   物种模板（[`../setting/SPECIES.md`](../setting/SPECIES.md) §1）
   ├─ card.schema.json      干涉卡（元素 / 级 / 卡类 / 类别 / 卡型 / 作用域 / 参数）
   ├─ world.schema.json     界：尺寸 / 地形算法与种子 / 生态域 / 水体 / 大气 / 法则
   ├─ style.schema.json     风格主题参数（调色板 / 着色 / 后期 / 几何处理）
   └─ save.schema.json      存档：元数据 + 快照 + 卡池历史 + 年表
```

契约是 `game/Config/Solstice/Data/` 与 `studio/presets/` 的**共同校验源**：改契约必须同步改两边数据。

---

## 6 运行时文件位置（发行版）

| 内容 | 位置 | 备注 |
|---|---|---|
| 契约数据 | `game/Config/Solstice/Data/*.json` | 随包发布，运行时直接读 |
| 本地化 | `game/Config/Solstice/Localization/` | 中英双语（文案规范见 [`../setting/WORLD.md`](../setting/WORLD.md) §3） |
| 存档（每界一份） | `%LOCALAPPDATA%\Solstice\Saved\SaveGames\<realmId>.sav` | 键前缀 `solstice.save.v<n>` |
| 导出的界 | `%USERPROFILE%\Documents\Solstice\Exports\<realmId>.solstice` | 导入 / 导出用 |
| 日志 / 崩溃 | `Saved/Logs`、`Saved/Crashes` | 不入 git |
| 着色器缓存 DDC | `D:\UE-DDC`（环境变量 `UE-LocalDataCachePath`） | **必须外置**，否则吃 C 盘 |

---

## 7 命名规范

### 7.1 C++

| 类型 | 前缀 | 示例 |
|---|---|---|
| UObject / UActorComponent | `U` | `USolsticeSimSubsystem` |
| AActor | `A` | `ASolsticeTerrainChunk` |
| 结构体 | `F` | `FSolsticeTile` |
| 枚举 | `E` | `ESolsticeTimeMode` |
| 接口 | `I` | `ISolsticeTickable` |
| 纯逻辑类（`Sim/` 内） | `F` + 无 UObject | `FWorldClock`、`FEcoStep` |

规则：`Solstice` 作为名词中缀；**`Sim/` 内不出现 `UObject` 派生**（保持零引擎依赖可测）。

### 7.2 资产

| 类型 | 前缀 | 示例 |
|---|---|---|
| 静态网格 | `SM_` | `SM_PaperRock_A` |
| 材质 / 实例 | `M_` / `MI_` | `M_Paper_Base` / `MI_Style_Woodcut` |
| 贴图 | `T_` | `T_Card_WeatherRain` |
| Niagara | `NS_` | `NS_Rain_Light` |
| 控件蓝图 | `WBP_` | `WBP_RealmHud` |
| 蓝图类 | `BP_` | `BP_RealmPawn` |
| DataAsset / DataTable | `DA_` / `DT_` | `DA_StyleTheme` / `DT_Cards` |
| 关卡 | `L_` | `L_Solstice` |

### 7.3 数据与目录

- JSON 文件：小写下划线，`species.json`、`cards.terrain.json`、`styles.paper.json`
- **卡 id**：`card.<元素>.<级>.<卡类>.<名>` → `card.water.3.rite.rain`、`card.earth.9.matter.mountain-range`（**多元素**用 `+`：`card.fire+wood.4.rite.wildfire`；**禁物**级 = `ban`）
- **物种 id**：`sp.<名>` → `sp.moss-grass`
- **界 id**：`realm.<slug>-<yyyymmdd>` → `realm.valley-20261014`
- **风格主题 id**：`style.<名>` → `style.paper-diorama`
- **预设 id**：`preset.<名>` → `preset.eternal-winter`
- **C++ 文件**：`Solstice<Xxx>.h/.cpp`，与类名一致；`Sim/` 内允许 `WorldClock.h/.cpp` 形态
- **文档 id**：与 `docs/` 下的相对路径一致（`charter/GDD`、`tech/STRUCTURE`…），见 [`../INDEX.md`](../INDEX.md)

> 术语与命名的**语言层**规范（中英对照、文案禁忌）见 [`../setting/WORLD.md`](../setting/WORLD.md) §2。

---

## 8 归位决策表（新增东西放哪）

| 我要新增 | 放哪 | 入 git | 状态 |
|---|---|---|---|
| 一段游戏逻辑 | `game/Source/Solstice/<对应子目录>/` | ✅ | 🟡 |
| 新干涉卡 | 数据 `game/Config/Solstice/Data/cards.*.json` + 卡面走 `studio/jobs/` | ✅ / 产物 ❌ | 🟡 |
| 新物种 | `game/Config/Solstice/Data/species.json` + 几何生成器 `Source/Solstice/Gen/` | ✅ | 🟡 |
| 新风格主题 | `shared/schema/style.schema.json` 参数 + `studio/presets/style.*.json` + `Content/Styles/<名>/` | 参数 ✅ / 资产 ❌ | 🟡 |
| 美术素材（贴图 / 立牌 / 卡面） | 源与参数 `studio/`，产物 `Content/` 对应子目录 | 源 ✅ / 产物 ❌ | 🟡 |
| 新控件 | C++ 优先（`Source/Solstice/UI/`）；可视化打磨放 `Content/UI/` | ✅ / ❌ | 🟡 |
| 环境或构建脚本 | `tools/` | ✅ | ✅ |
| 设计文档 | `docs/`（先读 [`../INDEX.md`](../INDEX.md) 的事务域表） | ✅ | ✅ |
| 存档 / 日志 / 缓存 | `Saved/`、`D:\UE-DDC` | ❌ | 🟡 |
| 临时试验 | `studio/work/`（已忽略）或仓库根 `tmp/`（已忽略） | ❌ | ✅ |

---

## 9 git 与双机同步

**入 git**：`game/Source`、`game/Config`、`game/*.uproject`、`game/*.Target.cs`、`shared/`、`studio/{workflows,jobs,refs,presets,scripts,README.md}`、`studio/out/manifest.jsonl`、`tools/`、`docs/`、`.vscode/`、`.codebuddy/`。

**不入 git**：`game/{Binaries,Intermediate,Saved,DerivedDataCache}`、`game/Content/**` 的二进制、`studio/out/**`（除 manifest）、`studio/work/**`、`.vs/`、`*.sln`、`tmp/`。

**双机一致性的保证**：Content 不入 git ⇒ 两台机器用**同一套"种子 + 生成器 + 契约 + manifest"**独立重建。因此：
1. 生成器与契约的改动必须与产物**同一次提交**；
2. manifest 是产物的"身份证明"，缺 manifest 的素材视为**不可复现**，不得进游戏；
3. 卡面 / 立绘类素材**单独提交**，先过用户裁决。

> **操作细节已移交**：[`../ops/SYNC.md`](../ops/SYNC.md)（定时同步、冲突处理、LFS 选项）与 [`../ops/WORKFLOW.md`](../ops/WORKFLOW.md) §3（提交规范）。本节只定义**哪些目录入 git**。

---

## 10 由本文带来的待办（随 M0 建立）

1. **重建 `studio/`**：目录骨架 + README + 工作流与 job 占位（`.gitignore` 里 `studio/out`、`studio/work` 的规则仍然有效）。
2. **重建 `shared/schema/`**：5 个 schema 占位。
3. **`game/` 工程骨架**：`.uproject` + 三个 Target + 主模块（对应 [`../plan/ROADMAP.md`](../plan/ROADMAP.md) §5 的 P3）。
4. `tools/` 脚本按新结构复核：`gen-projectfiles.ps1`、`build.ps1`、`launch-editor.ps1` 已按 `Solstice` 命名，**无需改名**；新增 headless 基准脚本入口。
5. **落地后回来改状态列**：§0 / §1 / §2 / §4 / §5 / §8 的 🟡 改为 ✅。

---

## 11 更新触发

| 改动类型 | 必须同次更新 |
|---|---|
| 新增 / 移动目录、改命名 | 本文件对应章节（含 §8 归位表）+ `.gitignore` 注释 + [`../INDEX.md`](../INDEX.md) |
| 目录从"计划"变为"现状" | 本文件所有 🟡 状态列 + 相关文档的存在性描述 |
| 入 git 策略变化 | 本文件 §9 + [`../ops/SYNC.md`](../ops/SYNC.md) §3 / §4 |
| 命名规范变化 | 本文件 §7 + [`../setting/WORLD.md`](../setting/WORLD.md) §2（如涉及文案用词） |

---

## 沿革

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0 | 2026-10-13 | 旧三分法（`app/` / `studio/` / `shared/`）——**已作废** |
| 2.0 | 2026-10-14 | 按 GDD 重写：`game/` / `studio/` / `shared/` 三分，模块约定、命名规范、归位决策表 |
| 2.1 | 2026-10-14 | 补 🟡/✅ **状态列**（消除"文档说有、实际没有"）；git 操作细节移交 `ops/`；补文档 id 约定与更新触发；迁入 `docs/tech/` |
