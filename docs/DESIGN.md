# 卡牌游戏设计文档

> 版本：**v0.1 骨架（2026-10-13）** · 状态：**方向转换期**
> **重大裁决（2026-10-13）**：项目由"Solstice 场景引擎/桌面游戏"**完全转向卡牌游戏**；Solstice 全部成果归档于分支 `archive/solstice-scene-engine` 与 `docs/archive/`（设计真源 v5.4 / PACKS_GUIDE / STRUCTURE 可随时取回）。
> **形态未定**：三套立项方案见 [PROPOSALS.md](PROPOSALS.md)（A 爬塔 / B 收集展示 / C 轻策略对战），**用户裁决后本文全量重写**。

## 1. 已锁定决策（不受形态选择影响）

| 决策 | 内容 |
|---|---|
| 技术底座 | **Vite + TypeScript** 正式工程（跳过零构建期） |
| 交付形态 | 单机离线买断制；无服务端/账号/内购（原非目标延续）；T1 桌面化 Tauri 2 + Steam |
| 开发模式 | AI 主力开发 + 用户节点裁决；文档先行；结论给可复现命令/URL |
| 双机协作 | git 唯一真源 + `dev/sync/` 计划任务自动同步（`docs/SYNC.md` 继续有效） |
| 素材合规 | AI 生成素材留档（prompt/模型/日期），Steam AI 披露；风格锚先锁定再量产 |
| 视觉方向 | 纸墨主题候选延续（最终随形态定稿） |

## 2. 归档索引

| 成果 | 位置 | 新项目可复用性 |
|---|---|---|
| 设计真源 v5.4（引擎/地形/素材线） | `docs/archive/DESIGN-solstice-v5.4.md` | 架构立场（微内核/元素资产化/params 面）仍有效 |
| 素材包规范 | `docs/archive/PACKS_GUIDE-solstice.md` | 卡牌包格式的参照 |
| 目录规范 | `docs/archive/STRUCTURE-solstice.md` | 分域思想（运行时/生产/契约）沿用 |
| 代码（kernel/composer/terrain/HUD…） | 分支 `archive/solstice-scene-engine` | kernel/i18n/存储/纸墨主题可移植 |
| 双机同步 | `dev/sync/` + `docs/SYNC.md` | **现役**，无需改动 |
| AI 素材管线 | `studio/` + `studio/tools/` | **转产卡面**（合同待形态定稿后重写） |

## 3. 待办（形态裁决后）

- [ ] `DESIGN.md` v1 全量重写
- [ ] 仓库结构改造（Vite+TS 工程落地）
- [ ] 素材机任务书改卡面生产合同；**暂停原 SET 生产**（SET-00 Phase 2 不再需要）
- [ ] `shared/` 卡牌 schema（card/effect/set）
- [ ] README 重写
