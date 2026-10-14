---
id: INDEX
title: 文档索引与状态矩阵
version: 1.2
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

| 最终路径 | 事务域 | 版本 | 状态 | truth | 一句话职责 |
|---|---|---|---|---|---|
| [`charter/GDD.md`](charter/GDD.md) | 立项与定位 + 设计规格 | 6.1 | active | **owner** | 唯一真源：立项决策、定位、全部设计规格 |
| [`charter/DECISIONS.md`](charter/DECISIONS.md) | 计划与沿革 | 1.0 | active | history | 形态沿革、需求裁决表、外部调研、参考稿清单 |
| [`charter/OPEN-QUESTIONS.md`](charter/OPEN-QUESTIONS.md) | 计划与沿革 | 1.0 | active | subsystem | 待用户裁决清单与我的建议 |
| [`content/CARDS.md`](content/CARDS.md) | 世界与内容设定 | 1.0 | active | subsystem | 卡片子系统真源（= GDD §10 细化） |
| [`content/WORLD.md`](content/WORLD.md) | 世界与内容设定 | 1.0 | active | subsystem | 世界观叙事原则、术语与命名、文案本地化规范 |
| [`art/ART-STYLE.md`](art/ART-STYLE.md) | 美术与资产 | 2.0 | active | subsystem | 五主题细则、T1 配方、T3 基线、素材规格、风格定标流程 |
| [`art/ASSETS.md`](art/ASSETS.md) | 美术与资产 | 1.0 | active | subsystem | 资产类别与去向、manifest 登记、批次规范、QC 与合规 |
| [`tech/ARCHITECTURE.md`](tech/ARCHITECTURE.md) | 技术与架构 | 1.0 | active | subsystem | 性能预算、模块划分与硬约束（= 原 GDD §14 / §17） |
| [`tech/STRUCTURE.md`](tech/STRUCTURE.md) | 技术与架构 | 2.1 | active | subsystem | 目录与命名规则（含状态列与归位决策表） |
| [`plan/ROADMAP.md`](plan/ROADMAP.md) | 计划与里程碑 | 1.0 | active | subsystem | 三阶段切分、M0 验收、风险、执行计划（= 原 GDD §18–§20） |
| [`ops/ENV.md`](ops/ENV.md) | 环境与工具链 | 1.1 | active | nav | 环境安装步骤与本机实测 |
| [`ops/VSCODE.md`](ops/VSCODE.md) | 环境与工具链 | 1.0 | active | nav | VSCode 工作区配置（真源是 `.vscode/` 实文件） |
| [`ops/WORKFLOW.md`](ops/WORKFLOW.md) | 协作与流程 | 1.0 | active | nav | 分工、文档纪律、提交规范、评审闸门、AI 进入清单 |
| [`ops/SYNC.md`](ops/SYNC.md) | 协作与流程 | 1.1 | active | nav | 双机 git 同步约定 |
| [`INDEX.md`](INDEX.md) | 导航 | 1.2 | active | nav | 本文件 |

**状态取值**：`active`（现行，可依据）· `reference`（参考，仅背景）· `deprecated`（已作废，无约束力）· `draft`（草案，待裁决）。
**truth 取值**：`owner`（唯一真源，全仓只允许一个）· `subsystem`（子系统真源）· `nav`（导航/说明）· `history`（仅沿革）。

---

## 2 真源链

```text
charter/GDD.md  (truth: owner)
├─ content/CARDS.md          卡片子系统   = GDD §10 细化
├─ content/WORLD.md          世界观与叙事 = GDD §1.3 的叙事/命名细化
├─ art/ART-STYLE.md          风格细则     = GDD §8 的执行参数
├─ art/ASSETS.md             资产生产登记 = GDD §9 的执行层
├─ tech/ARCHITECTURE.md      技术架构     = 原 GDD §14 / §17
├─ plan/ROADMAP.md           计划与里程碑 = 原 GDD §18–§20
├─ charter/DECISIONS.md      裁决沿革     = 原 GDD §22（truth: history，不构成规格）
├─ charter/OPEN-QUESTIONS.md 开放问题     = 原 GDD §21
└─ tech/STRUCTURE.md         目录与命名   (独立真源，受 GDD 约束)
```

**规则**：子系统真源与 GDD 冲突时，以 GDD 为准，并在**同一次改动**内修正子系统文档与本文档。

---

## 3 新会话阅读顺序（约 3 分钟）

1. 本文件（30 秒：现状、状态矩阵、硬规则）
2. [`charter/GDD.md`](charter/GDD.md) §0 立项决策 + §1 定位 + §2 非目标
3. [`plan/ROADMAP.md`](plan/ROADMAP.md) §1 三阶段切分 + §5 执行计划
4. [`ops/WORKFLOW.md`](ops/WORKFLOW.md) §6（禁止事项清单）
5. 按任务域读对应文档；需要"新东西放哪"时读 [`tech/STRUCTURE.md`](tech/STRUCTURE.md) §8 归位决策表

---

## 4 更新触发矩阵（改动 → 必须同次更新的文档）

| 改动类型 | 必须同次更新 |
|---|---|
| 立项 / 定位裁决 | `charter/GDD.md` §0 + `charter/DECISIONS.md` + 本文件 |
| 世界 / 卡 / 物种设定 | `content/*` + `charter/GDD.md` 对应规格节 + 本文件 |
| 叙事 / 术语 / 命名 | `content/WORLD.md` + 受影响的 `charter/GDD.md` / `content/CARDS.md` 章节 |
| 风格规范 / 资产管线 | `art/ART-STYLE.md` + `art/ASSETS.md` + 本文件 |
| 模块 / 依赖 / 性能预算 | `tech/ARCHITECTURE.md` + `charter/GDD.md` 的相关指针 |
| 目录 / 命名 | `tech/STRUCTURE.md` + `.gitignore` 注释 + 本文件 |
| 里程碑 / 计划 | `plan/ROADMAP.md` + `README.md` §五 |
| 环境 / 工具脚本 | `ops/ENV.md` + `tools/README.md` |
| 协作 / 提交规范 | `ops/WORKFLOW.md` + `.codebuddy/rules/` + `README.md` §六 |
| 双机同步 / git 策略 | `ops/SYNC.md` + `tech/STRUCTURE.md` §9 |
| 新增待裁决问题 / 完成裁决 | `charter/OPEN-QUESTIONS.md` + `charter/DECISIONS.md` |
| 文档作废 | 移入 `archive/` + `archive/README.md` 记时点与可继承项 + 本文件状态改 `deprecated` |

**三条硬规则**：
1. **真源唯一**：全仓只允许一个 `truth: owner`；出现第二个即视为缺陷。
2. **结构描述必须带状态**：凡写目录树，必须标注 `现状` / `计划`，禁止把计划写成存在。
3. **一种事务一份文档**：规格 / 计划 / 环境 / 流程不得混写在同一份文件里。

---

## 5 文档体系维护备忘

- **新增文档**：先确定事务域（§0）与 `truth` 取值，写统一文档头，再登记到 §1。
- **作废文档**：`git mv` 进 `archive/`，改名带版本（`XXX-v1.md`），在 `archive/README.md` 记时点与可继承项，本表状态改 `deprecated`。
- **拆分超长文档**：当一份文档同时承载 ≥2 类事务、或超过约 600 行时，按 §0 的事务域拆分，并在双方加"相关文档"指针（GDD 的拆分是范例，见其文末）。
- **frontmatter 骨架**：`id` / `title` / `version` / `date` / `status` / `truth` / `owner`；正文首节写"本文件管什么 / 不管什么"，末节写"更新触发"与"沿革"。

---

## 6 归档

作废稿与作废原因见 [`archive/README.md`](archive/README.md)。归档文档**无约束力**，不得作为任何实现依据。

---

## 沿革

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0 | 2026-10-14 | 建立索引与状态矩阵；三份作废稿 `git mv` 入 `archive/`；全部文档补统一 frontmatter |
| 1.1 | 2026-10-14 | P2：新增 4 份文档，GDD/CARDS/STRUCTURE 迁入子目录 |
| 1.2 | 2026-10-14 | P3：新增 WORLD / ART-STYLE(v2) / ASSETS / WORKFLOW，ENV/VSCODE/SYNC 迁入 `ops/`；补"维护备忘" |
