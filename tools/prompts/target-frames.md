# Solstice · 目标帧合同（Target Frames Contract）

> **用途**：优美风格线素材（远景整图/前景 sprite）的美术基准。先裁决风格 → 再出 8 张目标帧 → 锁定后作为生成参考与验收比对对象。
> **原则**：没有锁定的目标帧不开工任何优美线素材；成图与目标帧显著偏离 = 退回。
> **生成端**：素材机部署模型（FLUX.2-klein 4B fp8 主力 / Z-Image-Turbo 6B 初筛，2026-10-13 起全本地）；云端 Nano Banana 2 / Seedream 5.0 Pro / 即梦降为备用补刀。中文模型可直接用中文描述相同要素。
> **规格**：16:9、≥4K、每帧多出 2–4 张挑最好。**场景设定**：高山·湖泊·草原·马·云。

## 0. 流程与裁决标准

```
Phase 1 风格裁决：S1/S2/S3 各出 1 张「清晨·晴」→ 你选定 1 种
Phase 2 目标帧：选定风格 + Phase 1 选图作参考图（垫图锁风格）→ 出 8 张 → 你逐张裁决
```

**裁决 6 条**（任一不过即退回）：① 三层分明（前景主体/中景湖岸草原/远景雪山）② 光源统一左上 45°（全帧一致）③ 不看标题能说出几点+天气 ④ 无文字/水印/人脸/马畸形 ⑤ 100% 放大局部有细节密度 ⑥ 你想住进去（你是唯一裁判）。

**负面词（通用，每张都带）**：
```
people, person, face, text, watermark, signature, logo, frame, border, blurry, lowres,
jpeg artifacts, oversaturated, deformed horse, extra limbs, bad anatomy, buildings, roads, power lines
```

**固定拼接格式**：`[风格段 S?] + [场景锚点] + [帧专属光照段 TF??] + [画质锚点] + [负面词]`
- 场景锚点：`a crystal-clear alpine lake reflecting the sky, wildflower meadow foreground, horses grazing midground, snow-capped mountains on the horizon, cumulus clouds`
- 画质锚点：`strong foreground-midground-background layering, key light from upper left, cinematic wide shot 16:9, masterpiece, best quality, ultra detailed, 4k wallpaper`

## 1. Phase 1 · 风格裁决（各出 1 张 清晨·晴）

**S1 唯美动画风（新海诚/吉卜力，推荐——"优美"市场验证最稳，与自然场景契合度最高）**
```
breathtaking anime film background art, Makoto Shinkai and Studio Ghibli style,
golden sunrise light, soft mist over the water, god rays, fresh green tones,
```

**S2 厚涂概念艺术风（上限高，笔触感强）**
```
epic fantasy landscape concept art, painterly oil brushwork, rich color grading,
golden morning glow, mist over water, dramatic clouds,
```

**S3 电影写实风（壁纸市场主流，与其他素材统一难度最大）**
```
award-winning landscape photography, cinematic color grading, thin golden mist,
layered atmospheric perspective, shot on ARRI Alexa 35mm, deep depth of field,
```

## 2. Phase 2 · 目标帧 8 张（风格定稿后，只换光照段）

| 帧 | 时辰/天气 | 光照段（拼进固定格式） |
|---|---|---|
| TF01 | 清晨·晴（**基准帧**） | `golden sunrise light, soft mist over lake, long soft shadows, fresh green tones` |
| TF02 | 正午·晴 | `bright midday sun, vivid blue sky, crisp shadows, vivid greens` |
| TF03 | 黄昏·晴 | `golden hour, orange and pink sky, sun low on horizon, long dramatic shadows, warm rim light` |
| TF04 | 夜·晴 | `deep blue night, starry sky with milky way, full moon, moonlight path on the lake, cool tones` |
| TF05 | 晨·雾 | `thick morning fog, ethereal atmosphere, muted desaturated colors, soft diffused light` |
| TF06 | 日·雨 | `overcast rain, dark heavy clouds, rain streaks, wet reflective surfaces, moody grey-green palette` |
| TF07 | 冬·雪 | `heavy snowfall, snow-covered meadow, partially frozen lake, cold blue tones, soft overcast light` |
| TF08 | 夜·雷暴（可选戏剧帧） | `thunderstorm at dusk, lightning bolt, wind-blown grass, dark dramatic clouds, high contrast` |

示例完整提示词（S1 + TF01）：
```
breathtaking anime film background art, Makoto Shinkai and Studio Ghibli style,
golden sunrise light, soft mist over lake, long soft shadows, fresh green tones,
a crystal-clear alpine lake reflecting the sky, wildflower meadow foreground,
horses grazing midground, snow-capped mountains on the horizon, cumulus clouds,
strong foreground-midground-background layering, key light from upper left,
cinematic wide shot 16:9, masterpiece, best quality, ultra detailed, 4k wallpaper
```

## 3. 裁决后做什么

1. 选定图存 `tools/prompts/selected/TF01.png … TF08.png`，告知我风格编号（S1/S2/S3）
2. 此后**所有**前景元素生成必须带 TF01 作参考图（垫图 / IP-Adapter / 多参考图），统一中性顶光
3. TF01 另存一份为黄金帧基准 → `tools/golden/TF01.png`（视觉回归比对用）
