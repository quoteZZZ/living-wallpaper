---
id: INDEX
title: 文档索引与状态矩阵
version: 2.3
date: 2026-10-14
status: active
truth: nav
owner: ai
---

# 文档索引（INDEX）

> **全仓唯一的文档索引与状态矩阵。** 任何文档的新增 / 作废 / 迁移 / 版本或状态变化，必须在**同一次提交**内更新本表。
> **唯一设计真源**：[`charter/GDD.md`](charter/GDD.md)（`truth: owner`）——它只回答"**为什么做、做成什么、不做什么**"，设计细节在 `setting/` 与 `gameplay/`。

---

## 0 事务域划分（9 类 · 一类一域）

| # | 事务域 | 目录 | 管什么 | 明确不管 |
|---|---|---|---|---|
| 1 | **立项** | `charter/` | 为什么做、给谁、第一卖点、非目标、体验支柱、裁决沿革、待裁决 | 任何规格细节 |
| 2 | **设定集** | `setting/` | **世界是什么样**：世界 / 卡片 / 卡种清单 / 物种 / 风格主题的设定 | 玩家怎么玩、怎么实现 |
| 3 | **玩法** | `gameplay/` | **玩家怎么玩**：核心循环、时间、手牌与干涉、**经济数值**、自定义、界面 | 世界设定的内容 |
| 4 | **美术与资产** | `art/` | 风格执行参数、素材规格、资产生产与登记 | 风格的设计取舍（在 setting） |
| 5 | **技术与架构** | `tech/` | 引擎、模块依赖、性能预算、目录与命名 | 玩法与设定 |
| 6 | **计划** | `plan/` | 里程碑、验收、风险、执行计划 | 规格正文 |
| 7 | **环境与工具链** | `ops/` | 安装步骤、实测环境、编辑器配置 | 设计决策 |
| 8 | **协作与流程** | `ops/` | 分工、文档纪律、提交规范、评审闸门、双机同步 | 具体技术方案 |
| 9 | **归档** | `archive/` | 作废稿 + 作废时点与可继承清单 | 现行内容 |

**边界口诀**：**立项**说"为什么"、**设定集**说"世界是什么"、**玩法**说"玩家做什么"、**技术**说"程序怎么实现"、**流程**说"我们怎么协作"。

---

## 1 现行文档状态矩阵

| 路径 | 事务域 | 版本 | 状态 | truth | 一句话职责 |
|---|---|---|---|---|---|
| [`charter/GDD.md`](charter/GDD.md) | 立项 | 7.0 | active | **owner** | 立项决策、定位与卖点、非目标、体验支柱 + 文档地图 + 旧章节号对照 |
| [`charter/DECISIONS.md`](charter/DECISIONS.md) | 立项 | 1.3 | active | history | 形态沿革、**30 轮**需求裁决表、外部调研、参考稿清单 |
| [`charter/OPEN-QUESTIONS.md`](charter/OPEN-QUESTIONS.md) | 立项 | 1.2 | active | subsystem | 待用户裁决清单（38 条）与建议 |
| [`setting/WORLD.md`](setting/WORLD.md) | 设定集 | 2.2 | active | subsystem | 界 / 界外 / 七原质 / 环级（含超环）与禁物 / 规模 / 世界模型 / 年表 / 叙事与命名 |
| [`setting/CARDS.md`](setting/CARDS.md) | 设定集 | 3.1 | active | subsystem | 卡片**规则**：三轴、252 卡池矩阵、卡类与卡型、生克、字段、命名 |
| [`setting/CARD-LIST.md`](setting/CARD-LIST.md) | 设定集 | 1.2 | active | subsystem | 卡片**内容**：M0 36 格清单、价值表、240 功能位池、超环（21 张） |
| [`setting/SPECIES.md`](setting/SPECIES.md) | 设定集 | 1.0 | active | subsystem | 物种模板、M0 五物种、种群动力、因果可读性 |
| [`setting/STYLE.md`](setting/STYLE.md) | 设定集 | 1.0 | active | subsystem | 五个风格主题的定义、取舍、排期 |
| [`gameplay/LOOP.md`](gameplay/LOOP.md) | 玩法 | 1.0 | active | subsystem | 核心循环、五个尺度的节奏、支柱→机制映射、无失败红线 |
| [`gameplay/TIME.md`](gameplay/TIME.md) | 玩法 | 1.0 | active | subsystem | 现实的桥、双模式时间、昼夜形状、现实锚规格 |
| [`gameplay/INTERVENTION.md`](gameplay/INTERVENTION.md) | 玩法 | 2.1 | active | subsystem | **手牌 / 实体池 / 释放与回收**、余响规则、扰动值、卡包、接管、倒带 |
| [`gameplay/ECONOMY.md`](gameplay/ECONOMY.md) | 玩法 | 1.0 | active | subsystem | **全部经济数值**：三源产出、价值与回收返还、包价、掉落权重、六条红线验算 |
| [`gameplay/CUSTOMIZE.md`](gameplay/CUSTOMIZE.md) | 玩法 | 1.0 | active | subsystem | 界创建向导 9 步、出厂预设、创世面板、存档与导入导出 |
| [`gameplay/UI-UX.md`](gameplay/UI-UX.md) | 玩法 | 2.0 | active | subsystem | 界面区域、**手牌区与拖拽手势**、键位、极简原则 |
| [`art/ART-STYLE.md`](art/ART-STYLE.md) | 美术与资产 | 2.0 | active | subsystem | 渲染配方、色板、素材规格、QC、风格验收流程 |
| [`art/ASSETS.md`](art/ASSETS.md) | 美术与资产 | 1.0 | active | subsystem | 资产去向、生产线、规模预算、manifest 登记、合规 |
| [`tech/ARCHITECTURE.md`](tech/ARCHITECTURE.md) | 技术与架构 | 1.0 | active | subsystem | 性能预算、模块划分与硬约束 |
| [`tech/STRUCTURE.md`](tech/STRUCTURE.md) | 技术与架构 | 2.2 | active | subsystem | 目录与命名（含 🟡/✅ 状态列与归位决策表） |
| [`plan/ROADMAP.md`](plan/ROADMAP.md) | 计划 | 1.0 | active | subsystem | 三阶段切分、M0 验收、前置条件、风险、执行计划 |
| [`ops/ENV.md`](ops/ENV.md) | 环境与工具链 | 1.2 | active | nav | 环境安装步骤与本机实测 |
| [`ops/VSCODE.md`](ops/VSCODE.md) | 环境与工具链 | 1.1 | active | nav | VSCode 工作区配置（真源是 `.vscode/` 实文件） |
| [`ops/WORKFLOW.md`](ops/WORKFLOW.md) | 协作与流程 | 1.0 | active | nav | 分工、文档纪律、提交规范、评审闸门、AI 进入清单 |
| [`ops/SYNC.md`](ops/SYNC.md) | 协作与流程 | 1.1 | active | nav | 双机 git 同步约定 |
| [`INDEX.md`](INDEX.md) | 导航 | 2.3 | active | nav | 本文件 |

**状态取值**：`active` · `reference` · `deprecated` · `draft`。
**truth 取值**：`owner`（唯一真源，全仓只允许一个）· `subsystem`（子系统真源）· `nav`（导航/说明）· `history`（仅沿革）。

---

## 2 真源链

```text
charter/GDD.md  (truth: owner) —— 立项书 + 文档地图
├─ setting/WORLD.md       世界设定      （界 / 原质 / 环级 / 规模 / 世界模型 / 年表 / 命名）
├─ setting/CARDS.md       卡片规则      （三轴 / 矩阵 / 生克 / 字段 / 命名）
├─ setting/CARD-LIST.md   卡片内容      （清单 / 价值表 / 功能位池）
├─ setting/SPECIES.md     物种设定
├─ setting/STYLE.md       美术设定      （主题定义；执行参数在 art/ART-STYLE.md）
├─ gameplay/LOOP.md       玩法总纲
├─ gameplay/TIME.md       时间与现实耦合
├─ gameplay/INTERVENTION.md 手牌 / 释放与回收 / 余响规则
├─ gameplay/ECONOMY.md    经济数值      （产出 / 价值 / 价格 / 红线）
├─ gameplay/CUSTOMIZE.md  自定义
├─ gameplay/UI-UX.md      界面与交互
├─ art/ART-STYLE.md       美术执行参数   = setting/STYLE.md 的执行层
├─ art/ASSETS.md          资产生产与登记
├─ tech/ARCHITECTURE.md   技术架构与性能
├─ plan/ROADMAP.md        计划与里程碑
├─ charter/DECISIONS.md   裁决沿革      （truth: history，不构成规格）
├─ charter/OPEN-QUESTIONS.md 开放问题
└─ tech/STRUCTURE.md      目录与命名     （独立真源，受 GDD 约束）
```

**规则**：子系统真源与 GDD 冲突时以 GDD 为准，并在**同一次改动**内修正子系统文档与本文档。

---

## 3 新会话阅读顺序（约 3 分钟）

1. 本文件（30 秒：现状、状态矩阵、硬规则）
2. [`charter/GDD.md`](charter/GDD.md)（立项 + §4 文档地图）
3. [`plan/ROADMAP.md`](plan/ROADMAP.md) §1 三阶段切分 + §5 执行计划
4. [`ops/WORKFLOW.md`](ops/WORKFLOW.md) §6（禁止事项清单）
5. 按任务域读对应文档；"新东西放哪"读 [`tech/STRUCTURE.md`](tech/STRUCTURE.md) §8

---

## 4 更新触发矩阵（改动 → 必须同次更新的文档）

| 改动类型 | 必须同次更新 |
|---|---|
| 立项 / 定位 / 非目标 / 支柱 | `charter/GDD.md` §0–§3 + `charter/DECISIONS.md` + 本文件 |
| 世界观 / 世界模型 / 规模 | `setting/WORLD.md` + 受影响文档 |
| 卡片规则（三轴 / 生克 / 字段） | `setting/CARDS.md` |
| 卡种清单 / 价值表 / 功能位 | `setting/CARD-LIST.md` + `gameplay/ECONOMY.md` §3 |
| **任何经济数值调整** | `gameplay/ECONOMY.md` + **重跑其 §6 红线验算** |
| 手牌 / 释放 / 回收规则 | `gameplay/INTERVENTION.md` + `gameplay/UI-UX.md` |
| 物种 | `setting/SPECIES.md` + `setting/WORLD.md` §2.2 |
| 风格主题定义 | `setting/STYLE.md` + `art/ART-STYLE.md` |
| 玩法机制（时间 / 自定义 / 界面） | 对应 `gameplay/*` + 受影响设定集 |
| 美术执行 / 资产管线 | `art/ART-STYLE.md` + `art/ASSETS.md` |
| 模块 / 依赖 / 性能预算 | `tech/ARCHITECTURE.md` |
| 目录 / 命名 | `tech/STRUCTURE.md` + `.gitignore` 注释 + 本文件 |
| 里程碑 / 计划 | `plan/ROADMAP.md` + `README.md` §三 |
| 环境 / 工具脚本 | `ops/ENV.md` + `tools/README.md` |
| 协作 / 提交规范 | `ops/WORKFLOW.md` + `.codebuddy/rules/` + `README.md` §五 |
| 双机同步 / git 策略 | `ops/SYNC.md` + `tech/STRUCTURE.md` §9 |
| 新增待裁决 / 完成裁决 | `charter/OPEN-QUESTIONS.md` + `charter/DECISIONS.md` |
| 文档作废 | 移入 `archive/` + `archive/README.md` 记时点与可继承项 + 本文件状态改 `deprecated` |

**四条硬规则**：
1. **真源唯一**：全仓只允许一个 `truth: owner`；出现第二个即视为缺陷。
2. **一种事务一份文档**：规格 / 计划 / 环境 / 流程不得混写。
3. **结构描述必须带状态**：目录树必须标 `现状` / `计划`，禁止把计划写成存在。
4. **引用要指到会动的文档**：不要引用"某文档的某章节号"，除非该章节确实存在（**GDD 已瘦身，旧的 §4–§16 引用一律改指对应域文档**）。

---

## 5 文档体系维护备忘

- **新增文档**：先确定事务域（§0）与 `truth` 取值，写统一文档头（`id/title/version/date/status/truth/owner`），再登记到 §1。
- **文档骨架**：正文首节写"本文件管什么 / 不管什么"，末节写"更新触发"与"沿革"。
- **作废文档**：`git mv` 进 `archive/`，改名带版本（`XXX-v1.md`），在 `archive/README.md` 记时点与可继承项。
- **拆分超长文档**：同时承载 ≥2 类事务、或超过约 600 行时按 §0 的事务域拆分，并在双方加"相关文档"指针（范例：`CARDS` ⟷ `CARD-LIST` 的**规则 vs 内容**；`INTERVENTION` ⟷ `ECONOMY` 的**规则 vs 数值**）。
- **提交前自检**：跑一遍链接校验（`tmp/check-links.py`，把所有相对链接解析一遍），**0 断链**才提交。

---

## 6 归档

作废稿与作废原因见 [`archive/README.md`](archive/README.md)。归档文档**无约束力**。

---

## 沿革

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0 | 2026-10-14 | 建立索引与状态矩阵；三份作废稿入 `archive/`；全部文档补统一 frontmatter |
| 1.1 | 2026-10-14 | P2：新增 4 份文档，GDD/CARDS/STRUCTURE 迁入子目录 |
| 1.2 | 2026-10-14 | P3：新增 WORLD / ART-STYLE(v2) / ASSETS / WORKFLOW，ENV/VSCODE/SYNC 迁入 `ops/` |
| 2.0 | 2026-10-14 | 按"设定集 / 玩法"二次分域：新增 `setting/` 与 `gameplay/`；GDD 瘦身为立项书（7.0）；事务域由 8 类改为 9 类 |
| 2.1 | 2026-10-14 | 手牌与回收机制落地：`INTERVENTION` 2.0、`UI-UX` 2.0、`CARDS` 3.0 + 新增 `CARD-LIST`（规则与内容分家） |
| 2.2 | 2026-10-14 | 超环定案（21 张）→ **单元素卡池下限 231 上修为 252**；0 环允许固化 |
| 2.3 | 2026-10-14 | **经济闭环定稿**：新增 `gameplay/ECONOMY.md`（三源产出、价值与回收返还、包价、掉落权重、六条红线验算）；卡的价值表定稿 |
