# Solstice

**桌面 3D 场景搭建游戏**：用风格统一的元素组合出随昼夜/天气/季节变化的活场景，宠物相伴；
内含**壁纸模式**（把你的场景设为桌面）与**图片素材库**等功能模块。
运行时零 AI 调用；素材 = 程序化 + CC0 双源 + 图片素材库（无图元素路线）。

- **设计文档（唯一开发依据）**：[docs/DESIGN.md](docs/DESIGN.md)
- **素材制作/来源**：[docs/PACKS_GUIDE.md](docs/PACKS_GUIDE.md)（官方双源：Quaternius + Kenney，全 CC0）
- 路线：**M1 简笔画自然场景（进行中）** → M2 工程化 → M3 场景搭建器 → M4 宠物 → T1 桌面化（Tauri + Steam + 壁纸模式）

## 运行

本地：`python -m http.server 8642 --directory .` 后访问 `/app/index.html`，
或直接双击 `app/index.html`（零构建，经典 `<script>` 加载）。

调试参数：`?hour=21.5`（强制时辰）`?debug=1`（详细信息）`?nohid=1`（测试推帧）`?ui=0`（纯净画面）

## 目录结构

```
solstice/
├─ docs/                  # DESIGN.md（设计定稿）· PACKS_GUIDE.md（素材指南）
├─ index.html             # 落地页（GitHub Pages）
├─ app/                   # 游戏客户端（TS 全栈，零构建）
│  ├─ index.html          # 入口：样式 + 画布宿主 + 脚本装配
│  ├─ js/
│  │  ├─ kernel.js        # 微内核：i18n / 存储 / 上下文总线 / 注册表+卡槽仲裁
│  │  ├─ icons.js         # 图标库（Lucide, ISC）
│  │  ├─ core/            # 渲染后端（StyleSystem 挂钩）
│  │  │  ├─ composer.js   # 程序化 WebGL 后端 + 主循环指挥
│  │  │  └─ sketch.js     # 简笔画 2D 后端（M1 开发中）
│  │  ├─ ui/              # 交互组件
│  │  │  ├─ panel.js      # 设置中心（插件 schema 生成，双语）
│  │  │  └─ editor.js     # 场景编辑器（选中/圆盘/菜单/工具）
│  │  ├─ plugins/         # 内容插件（官方自举）
│  │  │  ├─ base.js mountains.js weather.js trees.js presets.js info.js
│  │  └─ main.js          # 装配启动 + 属性桥
│  └─ assets/
│     ├─ models/          # GLTF 低模（树等）
│     ├─ images/          # 图片素材库（F5）
│     └─ packs/           # 主题素材包
└─ tools/                 # 脚本
   ├─ assets/             # 资产生成（asset_image.py / asset_tree_glb.py）
   ├─ spike/              # 已验证机制留档（workerw_embed.ps1）
   └─ spike_babylon.html  # 双画布验证页
```

## 开发环境与协作约定

本项目**零构建**：没有 `package.json`、没有打包器、没有后端，本地只需要一个支持 WebGL2 的浏览器。

- **AI 协作规则**：`.codebuddy/rules/`
  - `solstice-core`（`alwaysApply`）——每次会话必读：技术栈锁定、微内核架构红线、性能功耗预算、非目标清单。
  - `solstice-workflow`（按需加载）——路线图、风险优先级、资产管线与验收指标。
  - 改动代码前请先读 `docs/DESIGN.md`；**设计与实现冲突时以设计文档为准**，并在同一次改动中回写文档。
- **本地预览**（三种任选）
  1. 双击 `src/wallpaper/index.html`（`file://` 直开，最快）
  2. 编辑器里用 Live Server 打开（默认 `127.0.0.1:5500`，带热重载）
  3. `npx -y http-server . -p 8000`
- **远程开发（可选）**：主力机可运行 CodeBuddy Web 工作台
  `codebuddy --serve --port 9000 --base-path /solstice --agent cli`
  再用出站隧道（cloudflared）暴露给另一台机器用浏览器接入；**所有任务、文件与终端都执行在主力机上**。
  链接与访问口令属于私密凭据，**不要提交进仓库**。
- **提交信息**：英文、简短祈使句。
- **不要引入依赖**：仓库当前没有 `package.json`，不要新增它，也不要新增 npm 依赖。
