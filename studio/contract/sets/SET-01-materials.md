# SET-01 · 地形无接缝材质包（v5.4 参数化地形用）

> **v5.4 裁决**：整图方案废除（与"用户搭建自己的场景"冲突）。地形 = 程序化几何（用户可编辑控制点，DESIGN §2.9）+ **本任务书的材质填充**。
> **前置**：S1 已锁定（`studio/frames/selected/S1.png`，所有生成垫它/其局部裁片）。
> **产出**：`studio/frames/materials/<材质id>.png` ×5 + credits（pack schema v2 出来后由代码机打包进 `app/assets/packs/`）。

## 1. 机器与模型

| 档 | 模型 | 说明 |
|---|---|---|
| **本地（主档）** | ComfyUI · FLUX.2-klein 4B **fp8** | 1024×1024 直出 + Make Seamless 节点 |

## 2. 材质清单（5 张，1024×1024 无接缝 tile）

| 材质 id | 内容 | 引擎用途 |
|---|---|---|
| `rock-cliff` | 裸岩峭壁（层理感、碎石细节） | 山体陡坡（坡向混合） |
| `grass-slope` | 草坡（短草 + 裸土过渡） | 山体缓坡 / 地形基面 |
| `snow` | 雪面（细颗粒 + 风蚀纹） | 雪线以上 |
| `water` | 水面（波纹高光、清透） | 湖泊 / 河流水面叠加 |
| `ground-cover` | 草地地被（草叶 + 小花点缀，俯视 45°） | 草原近景细节层 |

## 3. 执行步骤（每材质）

1. **垫图**：从 S1.png 裁对应材质区域的局部（如山体岩壁部分）作 img2img 参考，锁风格。
2. 文生图/img2img 1024×1024，每材质出 2–4 张候选（raw 留 `studio/work/raw/` 不入库）。
3. **Make Seamless**（ComfyUI offset/环绕节点）→ 处理接缝。
4. 四边接缝自检：图块平铺 2×2 目视无缝隙、无重复感过强的图案。
5. 用户/代码机挑 1 张 → 落 `studio/frames/materials/<id>.png`。

## 4. 提示词模板（替换 `<材质描述>`）

```
seamless tileable texture, <材质描述>,
[风格段 S1：anime film background art, Makoto Shinkai and Studio Ghibli style],
flat even lighting, no directional shadows, top-down orthographic view,
uniform detail density, neutral white balance, masterpiece, best quality, ultra detailed
```

各材质 `<材质描述>`：
- rock-cliff：`weathered granite cliff rock face with subtle strata and small scree`
- grass-slope：`alpine grass slope with short grass and patches of bare soil`
- snow：`clean snow surface with fine grain and gentle wind ripples`
- water：`clear lake water surface with soft ripples and gentle highlights`
- ground-cover：`lush meadow ground seen from above, short grass with tiny wildflowers`

负面词通用 + `seams, tiling artifacts, border objects, harsh shadows, lens flare, vignette, text, watermark`。

**关键约束**：
- **均匀平光**：无方向性阴影/高光（时辰光照由引擎承担）——出图自带夕阳感 = 退回
- 四边无被裁切的物体（石头/花不跨边）
- 色彩与 S1 对应区域一致（垫图生效）

## 5. 落盘与提交

```
studio/frames/materials/rock-cliff.png grass-slope.png snow.png water.png ground-cover.png
studio/frames/materials/credits.txt    # 模型 | prompt: studio/contract/sets/SET-01 | 日期
```

```
git add studio/frames/materials
git commit -m "studio: SET-01 terrain materials (5 seamless tiles, S1 style)"
git push
```

## 6. 验收清单

- [ ] 5 张 1024×1024 PNG，2×2 平铺目视无缝
- [ ] 无方向性光影（平光）、无 vignette
- [ ] 风格与 S1 一致（垫图生效）
- [ ] 无文字/水印；四边无裁切物体
- [ ] credits.txt 留档完整
- [ ] （代码机）pack schema v2 落地后打包进 `app/assets/packs/`，与 §2.9 坡向混合联调

## 7. 代码侧待办（素材机不用管）

- `shared/pack.schema.json` v2：`materials[]` 定义
- 引擎：地形控制点几何 + 坡向/海拔材质混合 + 法线光照（机制已在 51ceea4 验证）
- 编辑器"地形模式"：山脊/河流/湖泊控制点编辑（复用 Gizmo 框架）
