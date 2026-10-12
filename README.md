# 至日 Solstice

会"活着"的 Windows 动态壁纸：深度视差 + 真实时辰光照 + 天气同步 + 精灵宠物。
AI 仅用于离线生成素材，运行时零 AI 调用。

- **设计文档（必读）**：[docs/DESIGN.md](docs/DESIGN.md)
- 路线：T0 原型验证 → T1 Wallpaper Engine 创意工坊 Lite（免费获客）→ T2 独立 Steam 应用（买断+DLC）

## 运行 T0 原型

**在线预览（GitHub Pages）**：https://quoteZZZ.github.io/solstice/ —— 任何电脑的浏览器直接打开，无需本地环境。

本地运行：直接双击 `src/wallpaper/index.html`，或 `python -m http.server` 后访问。

调试参数（加到 URL 后）：

| 参数 | 说明 | 默认 |
|---|---|---|
| `?hour=21.5` | 强制时辰（0-24），绕过系统时钟 | 系统时钟 |
| `?lat=39.9` | 纬度（决定日出日落与光照曲线） | 39.9 |
| `?debug=1` | 调试面板（时间/太阳高度角/帧率/模式） | 关 |
| `?fps=60` | 帧率上限 | 30（功耗预算） |
| `?par=150` | 视差强度 % | 100 |

示例：`index.html?hour=22&debug=1`

若 `src/wallpaper/assets/scene.png` 与 `depth.png` 存在，自动切换为"图片+深度图"视差模式；否则显示程序化占位场景。

## 目录结构

```
solstice/
├─ docs/DESIGN.md            # 完整设计文档
├─ src/wallpaper/index.html  # 壁纸本体（单文件 WebGL2）
├─ src/wallpaper/assets/     # 素材（scene.png / depth.png，见 DESIGN.md §5）
└─ assets/                   # 预留：风格包库
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
