# 牌语四季 · Cards of Four Seasons

**收集展示型卡牌游戏**：收集/合成四季纸墨卡牌，摆上卡桌触发节气事件；单机离线买断，T1 桌面化（卡桌可作壁纸）。
前身 Solstice 场景引擎已归档：分支 `archive/solstice-scene-engine`，文档在 `docs/archive/`。

- **设计真源**：[docs/DESIGN.md](docs/DESIGN.md)（v1.0，方案 B 定稿）
- **卡面生产**：[studio/contract/card-faces.md](studio/contract/card-faces.md)（风格锚 S1 已锁定）

## 运行（M0 起为 Vite+TS 工程）

```powershell
npm install
npm run dev        # http://localhost:5173
npm run build
```

## 目录

```
solstice/
├─ src/            # 游戏（Vite+TS：core 领域逻辑 / ui 视图 / data 内容包）
├─ shared/         # 契约：card.schema.json / combos.schema.json
├─ studio/         # 卡面生产线（contract / tools/gen.py / frames）
├─ dev/            # 双机 git 同步（dev/sync/sync_once.ps1）
└─ docs/           # DESIGN · PROPOSALS · SYNC · archive/
```

## 协作约定

- **提交信息**：英文、简短祈使句；素材单独提交。
- **双机同步**：git 唯一真源 + 计划任务每 5 分钟自动 pull/push（[docs/SYNC.md](docs/SYNC.md)）。
- **分工**：AI 主力开发 + 用户节点裁决（立项/审美/卡面批量挑图）。
- **合规**：AI 素材逐张留档 prompt/模型/日期（Steam AI 披露）。
