# SET-03 · 马群 sprite（优美线 Actor，pack.horses）

> **前置**：SET-00 已完成（TF01 锁定）。**可后置**：在 SET-01/02 完成后再做。
> **为什么需要**：当前马群是简笔画程序化绘制（`app/js/plugins/horses.js`），叠在写实/动漫底图上会违和；优美线需要真 sprite。引擎侧动画（位移/翻转/浮动）由代码机负责，**本任务书只管静态素材**。
> **产出**：`app/assets/packs/horses/` 透明 PNG ×3 毛色。

## 1. 机器与模型

| 档 | 模型 | 说明 |
|---|---|---|
| **本地（主档）** | ComfyUI · FLUX.2-klein 4B **fp8** | 前景交互元素按定稿路线走本地 |

- 文生图分辨率：1024×1024 起 → 放大到**长边 ≥2048** 再抠图
- 张数：每种毛色出 2–4 张候选，挑 1；3 毛色共 3 张成包

## 2. 执行步骤

1. 垫 TF01 / IP-Adapter 文生图「基准马」（棕色，侧面站姿）→ 用户裁决。
2. 以基准马 img2img（同 seed，denoise 0.35–0.5）出另外两种毛色，**姿态/轮廓不变**只换毛色：
   - 深棕（基准）· 黑 · 白
3. 每张过 **BiRefNet** 抠图 → 透明 PNG。
4. 三张叠图比对：轮廓偏移明显（>10%）的重出。

## 3. 提示词模板

```
breathtaking anime film background art element, [风格段 S? 对应风格，与 TF01 一致],
a single horse standing in full profile, entire body in frame, side view facing left,
soft brown coat, black mane and tail, relaxed standing pose, all four legs visible,
neutral top-down daylight from upper left, clean plain light-grey background,
correct horse anatomy, crisp silhouette, masterpiece, best quality, ultra detailed
```

负面词通用 + `deformed horse, extra limbs, bad anatomy, rider, saddle, cut-off legs, motion blur`。

**关键约束**：
- **全部侧面同一朝向**（统一朝左，引擎负责水平翻转）
- 四蹄完整落地、不裁边；主体居中、底部贴地、四周留隙
- 背景干净纯色利于抠图；禁止纯白背景假装透明
- 中性顶光，无自带时辰氛围
- 站姿即可；**不要**让模型画奔跑/抬腿动作（腿部动画由引擎后续方案承担，静态抬腿姿态反而难抠难对位）

## 4. 打包（素材机本机执行）

```powershell
python tools/pack_builder.py --out app/assets/packs/horses `
  --id pack.horses --name-zh "马群 sprite" --name-en "Horse Sprites" --slot near `
  --variant brown:brown.png --variant black:black.png --variant white:white.png `
  --credit "FLUX.2-klein 4B fp8 + BiRefNet | prompt: tools/prompts/sets/SET-03 | <日期>"
```

## 5. 提交

```
git add app/assets/packs/horses
git commit -m "assets: SET-03 horse sprites (3 coat colors)"
git push
```

## 6. 验收清单

- [ ] 三张透明 PNG，长边 ≥2048，透明通道干净
- [ ] 三张轮廓一致（同姿态同体型，只差毛色）
- [ ] 侧面同一朝向、四蹄完整、无畸形（重点查四肢与关节）
- [ ] 光照统一左上 45°，无自带时辰氛围
- [ ] 与 TF01 风格一致
- [ ] 无人脸/文字/水印；无骑手/鞍具
- [ ] credits.txt 留档完整

## 7. 代码侧待办（素材机不用管，留档给代码机）

- `pack.horses` 的引擎加载 + Actor 协议对接（sprite 替换 sketch 绘制、毛色随机/选择）
- 动画方案：位移 + 水平翻转 + 轻微纵向浮动模拟步态；腿部帧动画（多帧 sprite）另立 SET 再议
