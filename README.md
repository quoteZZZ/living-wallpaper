# Solstice

> ⚠️ **方向转换（2026-10-13）**：本仓库转向**卡牌游戏**开发，方案对比见 [docs/PROPOSALS.md](docs/PROPOSALS.md)。
> Solstice 场景引擎已归档：分支 `archive/solstice-scene-engine`，文档在 `docs/archive/`。下文为 Solstice 时期内容，待重写。

**桌面 2.5D 场景搭建游戏**：用风格统一的元素组合出随昼夜/天气/季节变化的活场景，宠物相伴；
内含**壁纸模式**（把你的场景设为桌面）与**图片素材库**等功能模块。
运行时零 AI 调用；素材 = 程序化占位 + 离线部署模型 2D 生成（v5.3 起 3D 线移出主线）。

- **设计文档（唯一开发依据）**：[docs/DESIGN.md](docs/DESIGN.md)
- **目录与命名（唯一真源）**：[docs/STRUCTURE.md](docs/STRUCTURE.md)
- **素材制作/规格**：[docs/PACKS_GUIDE.md](docs/PACKS_GUIDE.md)（混合分层路线：目标帧合同锁风格 → 远景整图分层 + 前景 sprite）
- **素材生产线**：[studio/README.md](studio/README.md)（任务书 → 生成 → 打包）
- **双机协作**：[docs/SYNC.md](docs/SYNC.md)
- 路线：**M1 简笔画自然场景（进行中）** → M2 工程化 → M3 场景搭建器 → M4 宠物 → T1 桌面化（Tauri + Steam + 壁纸模式）

## 运行

本地：`python -m http.server 8642 --directory .` 后访问 `/app/index.html`，
或直接双击 `app/index.html`（零构建，经典 `<script>` 加载）。

调试参数：`?hour=21.5`（强制时辰）`?debug=1`（详细信息）`?nohid=1`（测试推帧）`?ui=0`（纯净画面）

## 目录结构

```
solstice/
├─ app/                   # ① 运行时（发布物）：游戏本体 + 壁纸模式
│  ├─ index.html          #    入口：纸墨主题令牌 + 画布宿主 + 脚本装配
│  ├─ js/
│  │  ├─ kernel.js        #    微内核：i18n / 存储 / 上下文总线 / 注册表+卡槽仲裁 / 场景簿
│  │  ├─ icons.js         #    图标库（Lucide, ISC）
│  │  ├─ core/            #    渲染后端：composer(WebGL) · sketch(2D 简笔画)
│  │  ├─ ui/              #    交互：hud(Dock/纸签) · panel(设置中心) · editor(场景编辑器)
│  │  ├─ plugins/         #    内容插件（官方自举）：base · mountains · weather · trees · horses · presets · info
│  │  └─ main.js          #    装配启动 + 属性桥
│  └─ assets/             #    运行时素材：packs(成包) · models(低模) · images(图片素材库 F5)
├─ shared/                # ② 跨域契约：pack.schema.json + slots.json（运行时与生产线共读）
├─ studio/                # ③ 素材生产线（离线，不随游戏发布）
│  ├─ contract/           #    要什么：target-frames.md（目标帧合同）+ sets/（SET 任务书）
│  ├─ jobs/               #    怎么生成：作业单 JSON（提示词 + 参数 + AI 披露留档）
│  ├─ tools/              #    怎么跑：gen.py（出图+放大） · pack.py（打包）
│  ├─ frames/             #    跑出什么：candidates(候选) · selected(入选) · golden(黄金帧)
│  └─ work/               #    中间产物（gitignore，永不入库）
├─ dev/                   # ④ 工程基建：sync(双机同步) · spikes(机制验证留档)
├─ docs/                  # ⑤ 文档：DESIGN · STRUCTURE · PACKS_GUIDE · SYNC
├─ site/                  # ⑥ 落地页资源（截图）
└─ index.html             #   落地页（GitHub Pages 入口，必须在根目录）
```

> 每个目录放什么、加新文件该归哪个位，看 [`docs/STRUCTURE.md`](docs/STRUCTURE.md) 的归位决策表。

## 开发环境与协作约定

本项目**零构建**：没有 `package.json`、没有打包器、没有后端，本地只需要一个支持 WebGL2 的浏览器。

- **AI 协作规则**：`.codebuddy/rules/`
  - `solstice-core`（`alwaysApply`）——每次会话必读：技术栈锁定、微内核架构红线、性能功耗预算、非目标清单。
  - `solstice-workflow`（按需加载）——路线图、风险优先级、资产管线与验收指标。
  - 改动代码前请先读 `docs/DESIGN.md`；**设计与实现冲突时以设计文档为准**，并在同一次改动中回写文档。
  - 新增文件前先读 `docs/STRUCTURE.md`；**目录/命名冲突时以 STRUCTURE 为准**。
- **本地预览**（三种任选）
  1. 双击 `app/index.html`（`file://` 直开，最快）
  2. 编辑器里用 Live Server 打开（默认 `127.0.0.1:5500`，带热重载）
  3. `npx -y http-server . -p 8000`
- **远程开发（可选）**：主力机可运行 CodeBuddy Web 工作台
  `codebuddy --serve --port 9000 --base-path /solstice --agent cli`
  再用出站隧道（cloudflared）暴露给另一台机器用浏览器接入；**所有任务、文件与终端都执行在主力机上**。
  链接与访问口令属于私密凭据，**不要提交进仓库**。
- **提交信息**：英文、简短祈使句。
- **不要引入依赖**：仓库当前没有 `package.json`，不要新增它，也不要新增 npm 依赖。
