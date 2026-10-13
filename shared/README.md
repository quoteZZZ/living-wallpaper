# shared/ —— 跨域契约（运行时 ⟷ 素材生产线）

这个目录只放**双方都要读的格式定义**。谁都不许在这里放业务逻辑或素材本体。

| 文件 | 内容 | 谁读 |
|---|---|---|
| `slots.json` | 图层类顺序（内核锁定）+ 卡槽 id 表 | `studio/tools/pack.py`（校验 slot 合法性）、运行时 T1.1 插件加载器、人 |
| `pack.schema.json` | pack manifest 结构（id/api/双语名/slot/scene/variants/settings） | `studio/tools/pack.py`（产出即校验）、运行时 T1.1 加载器、人 |

## 红线

1. **改这里 = 改接口**：必须同一改动里回写 `docs/PACKS_GUIDE.md`（素材侧）与 `docs/DESIGN.md`（运行时侧），并让 `pack.py` 校验通过。
2. **运行时不能 fetch 本地文件**：零构建 + `file://` 双击可用是硬约束，内核里内联的枚举（图层类/卡槽）与这里的 JSON 必须一致；T1.1 迁到 http 环境后改为直接读取。当前靠人审，M2 起加漂移校验脚本。
3. **只加不改**：字段只允许新增，删除/改名视为破坏性变更，需要 `api` 版本号提升（DESIGN §3.1）。
