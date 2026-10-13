# Solstice 素材制作指南（PACKS_GUIDE）

> **工作流（v5.1 定稿）：混合分层路线**——2026-10-13 用户裁决：CC0 双源 + 元素级 AI 生图产出"简陋难看"，素材生产切换为混合分层。
> 三层分工：**远景整图分层**（云端顶级模型直出）/ **前景 sprite**（本地 FLUX + 参考图锁风格）/ **天气昼夜**（渲染叠加，不重绘素材）。
> **总入口：`tools/prompts/target-frames.md`（目标帧合同）——没有锁定目标帧，不开工任何优美线素材。**
> CC0 双源（Quaternius/Kenney）**降级为开发期占位与工具资产**，不再作官方画面主力。

---

## 0. 生产总流程

1. **目标帧合同**：按 `tools/prompts/target-frames.md` 出 11 张（3 风格裁决 + 8 关键帧）→ 用户裁决锁定 → TF01 兼作黄金帧基准
2. **远景/主视觉**：以 TF01 为参考图出 16:9 ≥4K 整图 → 深度带拆层（3–5 层：天空/远山/中景/近岸/前景）→ HF Spaces **Depth-Anything V2** 生成深度图
3. **前景/交互元素**：本地 FLUX klein 4B（5060 8GB fp8 可跑）+ **TF01 垫图/IP-Adapter** + 统一中性顶光 → **BiRefNet** 抠图 → 透明 PNG
4. **打包**：`tools/pack_builder.py` → pack 目录（manifest.json + credits.txt）
5. **验收**：与目标帧比对，显著偏离退回；素材留档 prompt+来源（Steam AI 披露）

## 1. pack 目录结构（一个素材包 = 一个文件夹）

```
src/wallpaper/assets/packs/
└─ mountains/                    # 包 id（小写字母/数字/点/横线）
   ├─ manifest.json
   ├─ scene.png                  # 整图层（远景主视觉）
   ├─ depth.png                  # 深度图（近白远黑，与 scene 同尺寸）
   └─ credits.txt                # 模型/提示词/日期 留档
```

变体类包（如四季树 sprite）：

```
└─ trees/
   ├─ manifest.json
   ├─ spring.png  summer.png  autumn.png  winter.png   # 透明背景 sprite
```

`manifest.json` 示例（整图层 + 变体两种）：

```json
{
  "id": "pack.mountains",
  "api": 1,
  "name": { "zh": "中景山峦", "en": "Mountains" },
  "slot": "mid",
  "scene": { "image": "scene.png", "depth": "depth.png" }
}
```

```json
{
  "id": "pack.trees",
  "api": 1,
  "name": { "zh": "前景树 · 四季", "en": "Trees · Seasons" },
  "slot": "near",
  "variants": [
    { "id": "spring", "image": "spring.png" },
    { "id": "summer", "image": "summer.png" }
  ]
}
```

## 2. 贴图规格

| 项 | 要求 |
|---|---|
| 格式 | PNG；远景整图可不透明，前景 sprite 必须**透明背景** |
| 分辨率 | 长边 **≥2048px**（整图 4K 起更佳）；引擎按包围盒缩放，宁大勿小 |
| 构图 | 整图：强前/中/远三层、地平线偏下；sprite：主体居中、底部贴边、四周留隙 |
| 光照 | **统一左上 45° 中性顶光**（目标帧合同约定）；避免画面自带强烈夕阳感（时辰由引擎调色） |
| 一致性 | **所有生成必须带 TF01 作参考图**（垫图/IP-Adapter/多参考图）；季节变体以基准图 img2img 锁构图 |
| 避免 | 人脸/人物（深度估计易崩）、纯白背景假装透明、水印、自带 HDR 过饱和 |

## 3. 深度图

1. 成图丢 HF Spaces **Depth-Anything V2**（免费、无本地安装；本地可用 Depth Anything 3）
2. 导出灰度深度图（近白远黑），命名 `depth.png` 与原图同目录
3. `tools/pack_builder.py` 打包时校验尺寸一致

## 4. 打包器

```
python tools/pack_builder.py --out src/wallpaper/assets/packs/mountains ^
  --id pack.mountains --name-zh "中景山峦" --name-en "Mountains" --slot mid ^
  --image scene.png --depth depth.png ^
  --credit "Seedream 5.0 Pro | prompt: see tools/prompts | 2026-10-13"
```

自动校验 PNG 格式、长边 ≥2048（警告）、深度图尺寸一致；生成 `manifest.json` + `credits.txt` 并拷贝文件。

## 5. 留档要求（Steam AI 披露用）

每个包的 `credits.txt` 记录：模型名 / 提示词 / 生成日期。商店页如实勾选 AI 生成内容披露。

## 6. 分工

- **AI**：提示词工程（target-frames.md）、参考图规范、`pack_builder.py`、黄金帧 diff 验收脚本、引擎侧包加载/变体切换/时辰调色
- **用户**：只在两个节点动手——① 跑生成按钮（云端或本地 ComfyUI）；② 目标帧与成包的审美裁决
