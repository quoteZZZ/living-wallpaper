# SET-02 · 前景树 · 四季 sprite（pack.trees）

> **前置**：SET-00 已完成（TF01 锁定）。所有生成**必须垫 TF01 / IP-Adapter** 锁风格。
> **产出**：`app/assets/packs/trees/` 的 spring/summer/autumn/winter 四张透明 PNG（**替换现有占位图**——当前四季全指向同一张 summer 占位）。

## 1. 机器与模型

| 档 | 模型 | 用途 |
|---|---|---|
| **本地（主档）** | ComfyUI · FLUX.2-klein 4B **fp8**（8GB 档） | ① 基准树文生图；② 四季 img2img |
| 云端 | 不用 | 前景元素按定稿路线走本地（云端只买目标帧/远景） |

- 文生图分辨率：1024×1024 起（8GB 档稳妥值），出图后放大到**长边 ≥2048** 再抠图
- img2img 去噪强度：**0.45–0.60**（低于 0.45 季节感不够，高于 0.6 构图漂移），**固定同一 seed**

## 2. 执行步骤

1. **基准树（summer）**文生图，出 2–4 张候选，用户挑 1 张为基准（构图即四季共同模板）。
2. **春/秋/冬**：以基准树作 img2img（垫图 + 同 seed + denoise 0.45–0.6），只换季节要素：
   - spring：fresh spring green leaves, pink blossoms
   - summer：（基准，不用重出）
   - autumn：orange and golden foliage
   - winter：snow-laden bare branches, snow mound at roots
3. 每张过 **BiRefNet**（ComfyUI 节点或 HF Spaces）抠图 → **透明背景 PNG**。
4. 四季两两叠图目视比对：树冠轮廓/主干位置偏移明显（>10%）的重出。

## 3. 提示词模板

**基准树（summer）**：

```
breathtaking anime film background art element, [风格段 S? 对应风格，与 TF01 一致],
a single majestic oak tree in full green leaf, centered, whole tree in frame,
standing on a small grass mound, neutral top-down daylight from upper left,
soft even lighting, clean plain light-grey background, crisp silhouette,
masterpiece, best quality, ultra detailed
```

负面词通用 + `multiple trees, cut-off branches, deformed trunk, busy background, buildings`。

**关键约束**：
- 整树入画、树冠不裁边；主体居中、**底部贴边**（树根落地）、四周留隙
- 背景必须干净纯色（利于抠图），**禁止纯白背景假装透明**（必须真抠）
- 中性顶光，不带夕阳/夜景感（时辰由引擎调色）

## 4. 打包（素材机本机执行）

```powershell
python tools/pack_builder.py --out app/assets/packs/trees `
  --id pack.trees --name-zh "前景树 · 四季" --name-en "Trees · Seasons" --slot near `
  --variant spring:spring.png --variant summer:summer.png `
  --variant autumn:autumn.png --variant winter:winter.png `
  --credit "FLUX.2-klein 4B fp8 + BiRefNet | prompt: tools/prompts/sets/SET-02 | <日期>"
```

（覆盖现有 `app/assets/packs/trees/` 占位包；manifest 会按四变体重写。）

## 5. 提交

```
git add app/assets/packs/trees
git commit -m "assets: SET-02 seasonal tree sprites"
git push
```

## 6. 验收清单

- [ ] 四张透明 PNG，长边 ≥2048，透明通道干净（无白边/背景残留）
- [ ] 四季构图一致（叠图比对树冠/主干不漂移）
- [ ] 光照统一左上 45°，无自带时辰氛围
- [ ] 与 TF01 风格一致（同一画面里树与底图不违和）
- [ ] 无人脸/文字/水印；树形无畸形（断枝/歪干）
- [ ] credits.txt 留档完整
