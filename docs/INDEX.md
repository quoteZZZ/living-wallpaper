---
id: INDEX
title: 文档索引与状态矩阵
version: 1.0
date: 2026-10-14
status: active
truth: nav
owner: ai
---

# 文档索引（INDEX）

> **全仓唯一的文档索引与状态矩阵。** 任何文档的新增 / 作废 / 迁移 / 版本或状态变化，必须在**同一次提交**内更新本表。
> **唯一设计真源**：[`charter/GDD.md`](charter/GDD.md)（`truth: owner`）。任何文档与它冲突时以它为准，并在同一次改动内同步修正对方。

---

## 0 事务域划分（8 类 · 一类一份主文档）

| # | 事务域 | 目录 | 管什么 | 明确不管 | 更新触发 |
|---|---|---|---|---|---|
| 1 | 立项与定位 | `charter/` | 为什么做、给谁、第一卖点、非目标、成功判据 | 任何实现细节 | 立项裁决变化（罕见） |
| 2 | 世界与内容设定 | `content/` | 世界模型、七原质、卡池、物种、叙事与命名 | 引擎与渲染实现 | 设定裁决变化 |
| 3 | 美术与资产 | `art/` | 风格规范、五大主题、资产生产管线、资产登记 | 引擎技术细节 | 风格或管线变化 |
| 4 | 技术与架构 | `tech/` | 引擎、模块依赖、性能预算、数据契约、目录与命名 | 玩法设定 | 架构裁决变化 |
| 5 | 计划与里程碑 | `plan/` | 里程碑、执行计划、风险、开放问题、裁决沿革 | 规格正文 | 每次推进 / 每次裁决 |
| 6 | 环境与工具链 | `ops/` | 安装步骤、实测环境、编辑器配置、脚本说明 | 设计决策 | 环境或脚本变化 |
| 7 | 协作与流程 | `ops/` | 分工比例、提交规范、双机同步、评审闸门、AI 规则 | 具体技术方案 | 协作方式变化 |
| 8 | 归档 | `archive/` | 作废稿 + 作废时点与可继承清单 | 现行内容 | 有文档作废时 |

---

## 1 现行文档状态矩阵

> 「最终路径」是本体系的目标位置；**P1 阶段被标记 `⏳` 的文件仍在 `docs/` 根目录**，由 P2 / P3 批次迁入。

| 最终路径 | 事务域 | 版本 | 状态 | truth | 一句话职责 | 迁移 |
|---|---|---|---|---|---|---|
| [`charter/GDD.md`](charter/GDD.md) | 立项与定位 + 设计规格 | 6.0 | active | **owner** | 唯一真源：立项决策、定位、全部设计规格 | ⏳ P2 瘦身 |
| [`content/CARDS.md`](content/CARDS.md) | 世界与内容设定 | 1.0 | active | subsystem | 卡片子系统真源（= GDD §10 细化） | ⏳ P2 迁入 |
| [`tech/STRUCTURE.md`](tech/STRUCTURE.md) | 技术与架构 | 2.0 | active | subsystem | 目录与命名规则（含归位决策表） | ⏳ P2 迁入 |
| [`ops/ENV.md`](ops/ENV.md) | 环境与工具链 | 1.0 | active | nav | 环境安装步骤与本机实测 | ⏳ P3 迁入 |
| [`ops/VSCODE.md`](ops/VSCODE.md) | 环境与工具链 | 1.0 | active | nav | VSCode 工作区配置（真源是 `.vscode/` 实文件） | ⏳ P3 迁入 |
| [`ops/SYNC.md`](ops/SYNC.md) | 协作与流程 | 1.0 | active | nav | 双机 git 同步约定 | ⏳ P3 迁入 |
| [`INDEX.md`](INDEX.md) | 导航 | 1.0 | active | nav | 本文件 | — |

**状态取值**：`active`（现行，可依据）· `reference`（参考，仅背景）· `deprecated`（已作废，无约束力）· `draft`（草案，待裁决）。
**truth 取值**：`owner`（唯一真源，全仓只允许一个）· `subsystem`（子系统真源）· `nav`（导航/说明）· `history`（仅沿革）。

---

## 2 真源链

```text
charter/GDD.md  (truth: owner)
├─ content/CARDS.md       卡片子系统   = GDD §10 细化
├─ tech/ARCHITECTURE.md   技术架构     = GDD §14 / §17 拆出
├─ plan/ROADMAP.md        计划与里程碑 = GDD §18–§20 拆出
├─ charter/DECISIONS.md   裁决沿革     = GDD §22 拆出
├─ charter/OPEN-QUESTIONS.md 开放问题  = GDD §21 拆出
└─ tech/STRUCTURE.md      目录与命名   (独立真源，受 GDD 约束)
```

**规则**：子系统真源与 GDD 冲突时，以 GDD 为准，并在**同一次改动**内修正子系统文档与本文档。

---

## 3 新会话阅读顺序（约 3 分钟）

1. 本文件（30 秒：现状、状态矩阵、禁止事项）
2. [`charter/GDD.md`](charter/GDD.md) §0 立项决策 + §1 定位 + §2 非目标
3. [`plan/ROADMAP.md`](plan/ROADMAP.md) 当前里程碑与执行计划
4. 按任务域读对应文档；需要"新东西放哪"时读 [`tech/STRUCTURE.md`](tech/STRUCTURE.md) §8 归位决策表

---

## 4 更新触发矩阵（改动 → 必须同次更新的文档）

| 改动类型 | 必须同次更新 |
|---|---|
| 立项 / 定位裁决 | `charter/GDD.md` §0 + `charter/DECISIONS.md` + 本文件 |
| 世界 / 卡 / 物种设定 | `content/*` + `charter/GDD.md` 对应规格节 + 本文件 |
| 风格规范 / 资产管线 | `art/ART-STYLE.md` + `art/ASSETS.md` + 本文件 |
| 模块 / 依赖 / 性能预算 | `tech/ARCHITECTURE.md` + `charter/GDD.md` §14 / §17 |
| 目录 / 命名 | `tech/STRUCTURE.md` + `.gitignore` 注释 + 本文件 |
| 里程碑 / 计划 | `plan/ROADMAP.md` + `README.md` §五 |
| 环境 / 工具脚本 | `ops/ENV.md` + `tools/README.md` |
| 协作 / 提交规范 | `ops/WORKFLOW.md` + `.codebuddy/rules/` + `README.md` §六 |
| 文档作废 | 移入 `archive/` + `archive/README.md` 记时点与可继承项 + 本文件状态改 `deprecated` |

**两条硬规则**：
1. **真源唯一**：全仓只允许一个 `truth: owner`；出现第二个即视为缺陷。
2. **结构描述必须带状态**：凡写目录树，必须标注 `现状` / `计划`，禁止把计划写成存在。

---

## 5 规划中（由后续批次落地）

| 文件 | 来源 | 批次 |
|---|---|---|
| `charter/DECISIONS.md` | GDD §22 沿革与裁决记录 | P2 |
| `charter/OPEN-QUESTIONS.md` | GDD §21 开放问题 | P2 |
| `content/WORLD.md` | 新建（吸收 `archive/STORY-v1.md` 的语料与叙事原则） | P2 |
| `tech/ARCHITECTURE.md` | GDD §14 性能 + §17 技术架构 | P2 |
| `plan/ROADMAP.md` | GDD §18 里程碑 + §19 风险 + §20 执行计划 | P2 |
| `art/ART-STYLE.md` | 重写（仅保留 `archive/ART-STYLE-v1.md` 的墨线/平涂/纸颗粒） | P3 |
| `art/ASSETS.md` | 新建（资产生产管线、manifest、命名、合规） | P3 |
| `ops/WORKFLOW.md` | 新建（分工、提交、评审闸门、AI 规则） | P3 |

---

## 6 归档

作废稿与作废原因见 [`archive/README.md`](archive/README.md)。归档文档**无约束力**，不得作为任何实现依据。
