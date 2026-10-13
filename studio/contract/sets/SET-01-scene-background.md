# SET-01 · 远景主视觉整图 + 深度图（pack.mountains）

> **前置**：SET-00 已完成，TF01 已锁定。所有生成**必须垫 TF01**（参考图 / IP-Adapter），锁构图锁风格。
> **产出**：`app/assets/packs/mountains/`（scene.png + depth.png + manifest + credits）——整个画面的底图，深度视差用。

## 1. 机器与模型

| 档 | 模型 | 参数要点 |
|---|---|---|
| **本地（主档）** | ComfyUI · FLUX.2-klein 4B **fp8**（8GB 显存档） | 1920×1080 生成 → 放大到 ≥4K；IP-Adapter 垫 TF01；快速初筛可用 Z-Image-Turbo 6B（8 步） |
| 云端（备用） | Nano Banana 2 / Seedream 5.0 Pro | 仅当本地整图质量不达标时补刀 |

- 张数：出 2–4 张候选 → 用户挑 1 张成包（raw 不入库）
- 分辨率：**16:9，长边 ≥3840**（宁大勿小）

## 2. 提示词（固定拼接格式，风格段按 SET-00 锁定结果替换）

```
[风格段 S?]（SET-00 锁定的风格段原样引用）
golden sunrise light, soft mist over lake, long soft shadows, fresh green tones,
a crystal-clear alpine lake reflecting the sky, wildflower meadow foreground,
horses grazing midground, snow-capped mountains on the horizon, cumulus clouds,
strong foreground-midground-background layering, key light from upper left,
cinematic wide shot 16:9, masterpiece, best quality, ultra detailed, 4k wallpaper
```

负面词（通用，见 `../target-frames.md` §0）。

**构图红线**：
- 地平线偏下（≤ 画面 50%），三层分明
- 马只出现在**中景远景**作氛围（近景地面留空，近景马由 Actor sprite 承担，运行时叠加）
- 避免人脸/人物、文字、建筑、道路、电线

## 3. 后处理

1. **深度图**：选中成图丢 HF Spaces **Depth-Anything V2**（免费网页版；本地可用 Depth Anything 3）
2. 导出灰度深度图，**近白远黑**，resize 到与 scene.png 完全同尺寸 → `depth.png`
3. 单图 > 15MB 先无损级压缩（pngquant / tinypng）

## 4. 打包（素材机本机执行）

```powershell
python studio/tools/pack.py --out app/assets/packs/mountains `
  --id pack.mountains --name-zh "远景主视觉" --name-en "Scene Background" --slot mid `
  --image scene.png --depth depth.png `
  --credit "<模型名> | prompt: studio/contract/sets/SET-01 | <日期>"
```

打包器自动校验：PNG 格式、长边 ≥2048、深度图与原图尺寸一致（不一致会告警，必须处理后再提交）。

## 5. 提交

```
git add app/assets/packs/mountains studio/frames/selected/TF01.png
git commit -m "assets: SET-01 background pack (TF01 style)"
git push
```

## 6. 验收清单

- [ ] 与 TF01 风格一致（垫图生效，构图不漂移）
- [ ] 16:9、长边 ≥3840、PNG
- [ ] depth.png 与 scene.png 同尺寸，近白远黑，层带（天/远山/湖/近岸）肉眼可分
- [ ] 裁决 6 条全过（`../target-frames.md` §0）
- [ ] 近景无马、无人脸、无文字水印
- [ ] credits.txt 含模型名 / prompt 出处 / 日期
