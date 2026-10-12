# Living Wallpaper（工作代号）

会"活着"的 Windows 动态壁纸：深度视差 + 真实时辰光照 + 天气同步 + 精灵宠物。
AI 仅用于离线生成素材，运行时零 AI 调用。

- **设计文档（必读）**：[docs/DESIGN.md](docs/DESIGN.md)
- 路线：T0 原型验证 → T1 Wallpaper Engine 创意工坊 Lite（免费获客）→ T2 独立 Steam 应用（买断+DLC）

## 运行 T0 原型

**在线预览（GitHub Pages）**：https://quoteZZZ.github.io/living-wallpaper/ —— 任何电脑的浏览器直接打开，无需本地环境。

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
living-wallpaper/
├─ docs/DESIGN.md            # 完整设计文档
├─ src/wallpaper/index.html  # 壁纸本体（单文件 WebGL2）
├─ src/wallpaper/assets/     # 素材（scene.png / depth.png，见 DESIGN.md §5）
└─ assets/                   # 预留：风格包库
```
