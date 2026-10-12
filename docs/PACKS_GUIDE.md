# Solstice 素材制作指南（PACKS_GUIDE）

> **官方 v1 素材来源（定稿）：[Quaternius](https://quaternius.com) CC0 低模包**
> - 《Ultimate Nature Pack》：200+ 树/石/草 GLB —— 场景元素
> - 《Ultimate Animated Animals GLB》：自带骨骼动画（idle/走/跑/吃）—— 宠物 v0
> - CC0：免署名、可商用、上 Steam 零法律风险；下载后把 LICENSE 文件留档进仓库
> - 单源红线：v1 全部内容只用 Quaternius 家族，不混其他作者，风格由渲染器+单一来源双保证
>
> 其余路线（AI 3D / Blender 程序化 / 付费包）见文末梯子，v1 结束前不启用。

---

## 0. 接入步骤（Quaternius → 引擎）

1. quaternius.com 下载上述两包（zip）
2. 解压出 `.glb`，按用途挑入 `src/wallpaper/assets/models/`（重命名为语义名：`oak_a.glb`、`cat.glb`…）
3. Babylon `SceneLoader.ImportMeshAsync` 载入；flat-shading 材质工厂 + 调色板光照统一染色
4. 风摆：植被挂风顶点着色器；宠物：AnimationGroup 播状态机
5. 许可：把两包的 LICENSE/README 复制到 `assets/models/LICENSE-quaternius.txt` 留档

## 1. 目录结构（一个素材包 = 一个文件夹）

```
src/wallpaper/assets/packs/
└─ trees/                        # 包 id（小写字母/数字/点/横线）
   ├─ manifest.json              # 包描述（见下）
   ├─ spring.png                 # 变体贴图（透明背景 PNG）
   ├─ summer.png
   ├─ autumn.png
   └─ winter.png
```

`manifest.json` 示例（与 `js/plugins/trees.js` 内声明卡同构）：

```json
{
  "id": "pack.trees",
  "api": 1,
  "name": { "zh": "前景树 · 四季", "en": "Trees · Seasons" },
  "variants": [
    { "id": "spring", "image": "spring.png" },
    { "id": "summer", "image": "summer.png" },
    { "id": "autumn", "image": "autumn.png" },
    { "id": "winter", "image": "winter.png" }
  ]
}
```

放好后用本地服务器（`python -m http.server`）或 GitHub Pages 打开页面即可看到真实贴图；
直接双击 file:// 打开时浏览器禁止 fetch，会回退到程序化占位树（正常现象）。

## 2. 贴图规格

| 项 | 要求 |
|---|---|
| 格式 | PNG，**透明背景**（树/前景类）；山/全景类可不透明 |
| 分辨率 | 长边 **2048px** 起（4K 更佳）；引擎按包围盒缩放，宁大勿小 |
| 构图 | 主体居中、**底部贴边**（树干种在画面底边），四周留少量空隙 |
| 光照 | 中性光（引擎会按时辰自动调色/压暗），避免画面自带强烈夕阳感 |
| 风格一致性 | 四季变体**锁构图**：先出"夏"基准图，再 img2img / ControlNet 改季节 |
| 避免 | 人脸/人物（深度估计易崩）、纯白背景假装透明、水印 |

## 3. 提示词模板（可直接改用）

**前景树 · 夏（基准图）**
> a single majestic oak tree, full green foliage, side view, isolated on transparent
> background, centered composition, trunk at bottom edge, soft neutral daylight,
> highly detailed, game asset style, no ground, no shadow on ground --ar 3:4

**其余季节（以夏图为底 img2img，强度 0.45-0.6，锁构图）**
- 春：cherry blossom accents, fresh light green leaves, pink flowers
- 秋：autumn foliage, orange and red leaves
- 冬：bare branches, snow caps on branches, no leaves

**中景山峦（后续扩展 pack.mountains，可选深度图模式）**
> layered mountain ridges silhouettes, misty valley, dawn light, painterly,
> parallax game background, 3 distinct depth layers --ar 16:9

负面词（通用）：`people, face, text, watermark, frame, border, blurry, lowres`

## 4. 深度图（可选，用于图片+深度视差模式）

1. 把成图丢到 Hugging Face Spaces 的 **Depth-Anything V2**（免费、无本地安装）
2. 导出灰度深度图（近白远黑），命名 `depth.png` 与原图同目录
3. 双图放入 `assets/`（`scene.png` + `depth.png`）即为全局图片壁纸模式；
   包级深度视差在 T1.1 随 manifest `depth` 字段启用

## 5. 留档要求（Steam 披露用）

每个包建一个 `credits.txt`：记录 模型名 / 提示词 / 生成日期。
Steam 商店页需如实勾选 AI 生成内容披露（DESIGN.md §5.7），留档就是为这一刻准备的。

## 6. 我（AI）能做与不能做的

- ❌ 本开发环境无法调用生图工具——**高质量素材需要你按上面模板生成**（每月预算已定，见 DESIGN R8）
- ✅ 引擎侧全部就绪：包加载、变体切换、锚点缩放、时辰调色、季节跟随
- ✅ 你把图放进目录，刷新即生效；效果不满意只需换图，不动任何代码
