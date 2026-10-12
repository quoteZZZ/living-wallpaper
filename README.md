# 至日 Solstice

会"活着"的 Windows 动态壁纸：深度视差 + 真实时辰光照 + 天气同步 + 精灵宠物。
AI 仅用于离线生成素材，运行时零 AI 调用。

- **设计文档（必读）**：[docs/DESIGN.md](docs/DESIGN.md)
- 路线：T0 原型验证（已完成）→ T1 Steam 独立应用（Tauri + 创意工坊）→ T2 生态（代码插件沙箱）
- 当前状态：**T0.4 单一 UI 中枢 + 圆盘选择器 + 文件素材包管线**（见 DESIGN.md §4.8/§4.10/§5.6）
- **自制素材**：按 [docs/PACKS_GUIDE.md](docs/PACKS_GUIDE.md) 出图，放进 `src/wallpaper/assets/packs/` 即生效——该格式即 Steam 工坊包格式

## 运行 T0 原型

**在线预览（GitHub Pages）**：https://quoteZZZ.github.io/solstice/ —— 任何电脑的浏览器直接打开，无需本地环境。

本地运行：直接双击 `src/wallpaper/index.html`，或 `python -m http.server` 后访问。

调试参数（加到 URL 后）：

| 参数 | 说明 | 默认 |
|---|---|---|
| `?hour=21.5` | 强制时辰（0-24），绕过系统时钟 | 系统时钟 |
| `?lat=39.9` | 纬度（决定日出日落与光照曲线） | 39.9 |
| `?debug=1` | 信息卡显示详细信息，并自动展开设置面板 | 关 |
| `?fps=60` | 帧率上限 | 30（功耗预算） |
| `?par=150` | 视差强度 % | 100 |
| `?ui=0` | 壁纸模式：隐藏面板/编辑器，仅保留画面与信息卡 | 开 |
| `?nohid=1` | 缩短隐藏页降级渲染间隔（自动化测试用） | 关 |

交互：左上信息中枢是唯一悬浮组件——`⚙` 打开设置中心（按插件分区，中英双语），`✥` 开启编辑模式后可**点击选中卡片、拖拽移动、右下角手柄缩放、双击重置、右键卡片/天空呼出菜单**；更换变体/天气/预设/添加素材均为**圆盘选择器**（DESIGN.md §4.8/§4.10）。

若 `src/wallpaper/assets/scene.png` 与 `depth.png` 存在，自动切换为"图片+深度图"视差模式；否则显示程序化占位场景。

## 目录结构

```
solstice/
├─ docs/DESIGN.md                 # 完整设计文档
├─ docs/PACKS_GUIDE.md            # 素材制作指南（提示词模板/规格/深度图）
├─ index.html                     # GitHub Pages 落地页
└─ src/wallpaper/                 # 壁纸本体（零构建，经典 <script> 加载）
   ├─ index.html                  # 入口：样式 + DOM 宿主 + 脚本装配
   ├─ js/kernel.js                # 微内核：i18n / 存储 / 上下文总线 / 注册表+卡槽仲裁
   ├─ js/composer.js              # 合成器：双通道（全屏程序化 + 前景精灵贴图）
   ├─ js/panel.js                 # 设置中心：由插件 settingsGroups 自动生成（双语）
   ├─ js/editor.js                # 场景编辑器：选中/拖拽/缩放/右键/圆盘选择器
   ├─ js/main.js                  # 启动装配 + WE/Tauri 属性桥
   ├─ js/plugins/base.js          # official.base      天空光照 + 日月/星空卡 + 界面
   ├─ js/plugins/mountains.js     # official.mountains 山峦卡（程序化→声明式）
   ├─ js/plugins/weather.js       # official.weather   晴/多云/雨/雪/雾 + 手动天气
   ├─ js/plugins/trees.js         # pack.trees         前景树素材包（四季变体）
   ├─ js/plugins/presets.js       # official.presets   预设（极简/完整/深夜护眼）
   ├─ js/plugins/info.js          # official.info      信息中枢（唯一悬浮 UI）
   └─ assets/packs/               # 素材包目录（manifest.json + PNG，见 PACKS_GUIDE）
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
