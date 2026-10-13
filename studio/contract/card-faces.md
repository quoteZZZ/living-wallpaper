# 卡面生产合同（Card Faces Contract）·《牌语四季》

> **总原则**：风格锚先行 → 分批量产 → 逐张留档退回。素材只画**画芯**，边框/角饰/卡名文字一律由引擎绘制。
> **风格锚**：`studio/frames/selected/S1.png`（新海诚/吉卜力，2026-10-13 已裁决锁定）——所有卡面垫 S1 或其局部裁片（img2img / IP-Adapter）。

## 1. 规格

| 项 | 要求 |
|---|---|
| 画布 | **竖版 3:4，1024×1365**（引擎按 3:4 框裁切显示，画芯留 24px 安全边） |
| 构图 | 单主体居中偏下，主体占画面 55–75%，上部留气口（引擎叠卡名） |
| 光照 | 均匀平光，无方向性阴影、无自带时辰（季节=色调段，昼夜=引擎） |
| 禁止 | 文字/水印/边框/人脸特写/多主体堆砌/出画裁切 |

**季节色调段**（写进每张 prompt）：
- spring：`fresh spring greens, soft pink blossoms, gentle morning light tones`
- summer：`deep lush greens, bright clear summer tones, cicada haze`
- autumn：`crimson and golden maple tones, harvest warmth`
- winter：`quiet snow whites and cool blue-grey, ink-wash stillness`

## 2. 批次与产量

| 批次 | 内容 | 数量 |
|---|---|---|
| **CF-M1**（当前） | rank1 基础卡：4 季 × 15 张（mountain2 / water2 / plant3 / bird2 / beast2 / person1 / sky2 / artifact1） | 60 |
| CF-M2 | rank2 合成卡 24 + 节气限定 24 | 48 |
| CF-M3 | rank3 压卷卡 8 + 图鉴成就卡 | ~16 |

## 3. 执行步骤（每张）

1. 从 jobs 批单取 prompt（`studio/jobs/cards-cf-m1.json`，代码机维护，含逐张完整提示词与 seed）
2. 垫 S1 局部裁片 img2img（或 IP-Adapter）+ 季节色调段 → 1024×1365，每张 2–3 候选
3. 自检（§5 清单）→ 选中落 `studio/frames/cards/<card-id>.png`（id 去掉 `card.` 前缀）
4. `studio/frames/cards/credits.txt` 追加一行：`<card-id> | <模型> | jobs/cards-cf-m1 | <日期>`

gen.py 用法（素材机现成工具）：
```powershell
D:\ComfyUI\python_embeded\python.exe studio\tools\gen.py --batch studio\jobs\cards-cf-m1.json
```

## 4. 提示词模板（批单内逐张给出，此处为骨架）

```
[风格段 S1：breathtaking anime film background art, Makoto Shinkai and Studio Ghibli style],
single <主体描述>, centered composition, <季节色调段>,
vertical tarot-card artwork, clean negative space at top,
flat even lighting, no text, no border, masterpiece, best quality, ultra detailed
```
负面词通用：`text, watermark, border, frame, face closeup, multiple subjects, blurry, lowres, oversaturated`

## 5. 验收清单（逐张，不过即退回）

- [ ] 竖版 3:4、1024×1365、无文字/水印/边框
- [ ] 单主体居中、主体占比 55–75%、上部留气口
- [ ] 季节色调正确（同季 15 张放一起色调和谐）
- [ ] 与 S1 风格一致（垫图生效）
- [ ] 平光、无自带时辰氛围
- [ ] credits 留档完整

## 6. 分工

- **素材机**：跑批单出图 → 自检 → 落盘命名 → 提交 git（`studio: CF-M1 card faces batch 1/4`）
- **代码机**：批单/合同维护、卡数据 JSON（cardpack）对接、图鉴验收
- **用户**：批量裁决（每季 15 张一次看完，挑图/退回）
