# `shared/` — 契约（JSON Schema）

**双方共读的契约层**：`game/`（运行时读 JSON）与 `studio/`（生图线产素材）都按这里的 schema 校验数据。
定义与状态见 [`docs/tech/STRUCTURE.md`](../docs/tech/STRUCTURE.md) §5。

```text
shared/schema/
├─ species.schema.json   物种模板        —— docs/setting/SPECIES.md §1
├─ card.schema.json      干涉卡          —— docs/setting/CARDS.md
└─ world.schema.json     界（生成参数）   —— docs/setting/WORLD.md §2.1 / §2.2 / §3.3
```

## 规则

1. **契约是共同校验源**：改 schema 必须**同一次提交**改两边的数据
   （`game/Config/Solstice/Data/*.json` 与 `studio/presets/*.json`）。
2. **schema 里带出处**：每个文件的 `description` 都写清"真源是哪份文档的哪一节"，
   避免契约与设定集悄悄分叉。
3. **不在这里放数据**：本目录只有 schema。数据的两份落地位置见第 1 条。

## 校验

```powershell
# 需要 jsonschema（pip install jsonschema）
python tmp\validate-contracts.py
```

`tmp/validate-contracts.py` 把 `schema/` 与 `game/Config/Solstice/Data/` 逐对校验（当前 5 对：world、species、cards.earth / fire / metal）。
**2026-10-16 实测全部通过。** 改 schema 或改数据之后、提交之前跑一次。

> `tmp/` 不入库（`.gitignore`），这是开发机上的校验工具；真源始终是 `shared/schema/` 里的文件本身。

> **待 M1**：`style.schema.json`（风格主题参数）与 `save.schema.json`（存档：元数据 + 快照 + 卡池历史 + 年表）尚未建立，
> 见 [`docs/tech/STRUCTURE.md`](../docs/tech/STRUCTURE.md) §5。
