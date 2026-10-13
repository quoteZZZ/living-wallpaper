# SET-01 · 地形材质候选与自检报告

> 生成机：素材机（RTX 5060 8GB，ComfyUI + FLUX.2-klein 4B fp8，本地离线）
> 日期：2026-10-13 ｜ 依据：`studio/contract/sets/SET-01-materials.md`、`../target-frames.md`（S1 已锁定）
> 状态：**候选就绪，等待用户/代码机逐材质挑图**（本报告不做审美裁决）

## 1. 这一轮做了什么

按 SET-01 任务书生产 5 张地形无接缝材质（1024×1024 tile），每材质 3–5 张候选；
raw 候选全部留在 `studio/work/raw/`（gitignore），本目录只放通过自检的候选。

原始需求每材质 2–4 张候选；rock-cliff / water / ground-cover / grass-slope 因首轮出现
植被混入、花带条纹、陆影等**内容不符**问题，按「同一素材最多 3 次」预算补出 v4/v5。

## 2. 生产链路（可复现）

任务书 §3 要求 img2img 垫图 + Make Seamless 节点；本机 ComfyUI 核心里**没有无缝节点**，
因此把无缝保障做成三段确定性流程（工具均为纯标准库，零依赖）：

```powershell
# ① 出图（1024×1024，蒸馏 4 步，垫 S1 局部裁片锁风格 —— gen.py 的 FLUX.2 edit 分支）
D:\ComfyUI\python_embeded\python.exe studio\tools\gen.py --batch studio\jobs\set-01-materials.json

# ② 无缝化：环形错位 + 接缝带局部重绘 + 光照压平 + 接缝/平光质检 + 2×2 平铺预览
D:\ComfyUI\python_embeded\python.exe studio\tools\finish.py `
  --batch studio\jobs\set-01-materials.json --dir studio\work\raw

# ③ 逐材质评审图（每张候选 2×2 平铺并排，供挑图；纯本地像素运算，不占用 GPU）
D:\ComfyUI\python_embeded\python.exe studio\tools\seamless.py `
  --sheet studio\work\raw\sheet_rock-cliff.png `
  --from studio\work\raw\mat-rock-cliff_v1_seamless.png `
         studio\work\raw\mat-rock-cliff_v4_seamless.png `
         studio\work\raw\mat-rock-cliff_v5_seamless.png --tile-side 512
```

无缝原理（`studio/tools/seamless.py` + `gen.py --seam-fix`）：

1. **按半幅环形错位**：对边像素变成原图中间原本相邻的像素 → 平铺接缝在构造上消失；
2. **接缝带局部重绘**：错位后原边框落在中线上形成硬棱，用 ComfyUI 掩膜 + 完整调度重绘该
   128px 十字带并**只贴回该带** → 边框像素一动未动，无缝不被破坏，也没有镜像/涂抹的伪影；
3. **光照压平**：低频亮度场按环形采样（周期场）做增益归一，压掉出图自带的方向性渐变
   （任务书：均匀平光，时辰光照由引擎承担），不破坏细节与接缝。

## 3. 自检结果（任务书 §6 逐条）

| 验收项 | 结果 | 依据 |
|---|---|---|
| 5 张 1024×1024 PNG | ✅ 达成 | 全部 1024×1024，见下表 |
| 2×2 平铺目视无缝 | ✅ 达成 | 接缝/自然梯度比 0.6–1.2（≈1.0 即不可见），另有 2×2 平铺预览逐张目视确认 |
| 无方向性光影（平光）、无 vignette | ✅ 达成 | 压平后上下半均值差 |dY| ≤ 1.9（压平前最高 29.3） |
| 风格与 S1 一致（垫图生效） | ⚠️ 待用户确认 | 全部走 S1 局部裁片垫图；产出为 S1 的柔和淡彩调，但岩石局部线条感强于 S1 整图，**审美归用户** |
| 无文字/水印；四边无裁切物体 | ✅/部分 | 无文字水印；首轮有裁切物体/植被/花带的候选已弃用（见 §4） |
| credits.txt 留档完整 | ✅ | 见 `studio/frames/materials/credits.txt`（挑图后随入选图一起落盘） |
| （代码机）schema v2 打包联调 | ⏸ 阻塞 | `shared/pack.schema.json` 已有 `materials[]`，但 `studio/tools/pack.py` 尚无 `--material` 支持，见 §6 |

## 4. 候选清单（本目录 = 通过自检，可挑）

| 材质 | 候选 | 接缝比 L\|R / T\|B | 平光 dY | 内容自检 |
|---|---|---|---|---|
| `rock-cliff` | `mat-rock-cliff_v1.png` | 0.6 / 0.8 | +0.14 | ✅ 板状层理岩壁（偏深灰） |
| `rock-cliff` | `mat-rock-cliff_v4.png` | 0.6 / 1.1 | −0.98 | ✅ 裸岩碎石场，无植被 |
| `rock-cliff` | `mat-rock-cliff_v5.png` | 1.1 / 0.9 | +0.61 | ✅ 裸岩碎石场（颗粒更细） |
| `grass-slope` | `mat-grass-slope_v2.png` | 0.7 / 0.8 | +0.58 | ✅ 短草 + 裸土斑块 |
| `grass-slope` | `mat-grass-slope_v4.png` | 1.2 / 1.2 | −0.18 | ✅ 均匀短草（裸土少） |
| `grass-slope` | `mat-grass-slope_v5.png` | 0.7 / 1.1 | +0.21 | ✅ 短草 + 均匀裸土 |
| `snow` | `mat-snow_v1.png` | 0.9 / 1.0 | −0.05 | ✅ 细颗粒雪面 + 风蚀纹（整体偏素） |
| `snow` | `mat-snow_v2.png` | 1.0 / 1.0 | −0.15 | ✅ 同上，纹路更浅 |
| `water` | `mat-water_v4.png` | 1.0 / 0.9 | −0.01 | ✅ 均匀青蓝水面 + 波纹高光 |
| `water` | `mat-water_v5.png` | 1.1 / 0.8 | +0.02 | ✅ 同上，波纹更密 |
| `ground-cover` | `mat-ground-cover_v4.png` | 0.9 / 1.1 | +1.85 | ✅ 俯视草地 + 均匀小花 |
| `ground-cover` | `mat-ground-cover_v5.png` | 1.0 / 1.0 | +0.00 | ✅ 同上，花色更淡 |

**弃用（未入库，仅留 `studio/work/raw/`）**：

- `rock-cliff_v2/v3`：长出绿色植被/苔藓条带，非裸岩，且跨边裁切；
- `grass-slope_v1`：顶部一条白/蓝花带，平铺呈明显重复条纹；`grass-slope_v3`：耕地垄沟状斜纹；
- `water_v1/v2/v3`：湖面反射把远山烘成米色斜带，平铺读作"沙洲"而非水面；
- `ground-cover_v1/v2/v3`：一条粉/橙花带横贯画面，花在四边被裁切，平铺重复感强；
- 补轮入口（v4/v5）见 `studio/jobs/set-01-materials.json`，逐张提示词即 AI 披露留档。

## 5. 挑图 → 落盘（下一步，等裁决）

挑定后每材质执行一次，即得到任务书 §5 要求的落盘物：

```powershell
Copy-Item studio\frames\candidates\S1\mat-snow_v1.png studio\frames\materials\snow.png
# 5 个槽位：rock-cliff / grass-slope / snow / water / ground-cover
```

`studio/frames/materials/credits.txt` 需含「模型名 | prompt 出处 | 日期」：
`FLUX.2-klein 4B fp8 + ComfyUI mask inpaint | prompt: studio/contract/sets/SET-01 | 2026-10-13`

## 6. 阻塞与交接

- **卡在用户/代码机**：逐材质挑 1 张（审美裁决，素材机不代选）。
- **卡在代码机（工具缺口）**：`studio/tools/pack.py` 只支持 `--image/--variant`，未支持
  `materials[]`，因此"打包进 `app/assets/packs/`"目前没有可执行路径；schema 侧已就绪
  （`shared/pack.schema.json` 含 `materials`）。需要谁提供 `--material` 参数请代码机裁决
  （`pack.py` 位于素材机域内，若要素材机补，下一轮可做）。
- 素材入库内容：`studio/frames/candidates/S1/*.png`（12 张） + `studio/jobs/set-01-materials.json`
  + `studio/tools/{gen,seamless,finish}.py` + `studio/tools/README.md`。
