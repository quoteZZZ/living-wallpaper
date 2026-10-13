# 目标帧 Phase 1 · 风格候选（已出稿，待裁决）

> 状态：**Phase 1 三张已出，等待用户裁决风格（S1 / S2 / S3）**。
> 裁决后本目录继续放 TF01–TF08（Phase 2），并把 TF01 复制一份到 `tools/golden/`。

## 产出

| 文件 | 风格 | 规格 |
|---|---|---|
| `S1.png` | 唯美动画风（新海诚 / 吉卜力） | 3840×2160 |
| `S2.png` | 厚涂概念艺术风 | 3840×2160 |
| `S3.png` | 电影写实风 | 3840×2160 |

三张用**同一 seed（303）**、同一场景锚点，构图基本一致——可直接横向比较风格差异；风格锁定后这条构图基线沿用。

## 生成记录（Steam AI 披露留档）

- 模型：FLUX.2 [klein] 4B **fp8**（蒸馏 4 步，`cfg=1`）+ Qwen3-4B 文本编码器 + `flux2-vae`
- 硬件：素材机本机 RTX 5060 8GB（峰值显存 7456/8151 MB）
- 流程：1920×1080 出图 → `RealESRGAN_x2plus` → 3840×2160
- 日期：2026-10-13
- 提示词：`tools/gen/jobs/target-frames.json` 内 TF01 三风格条目（风格段 + TF01 光照段 + 场景锚点 + 画质锚点，按 `../target-frames.md` 固定拼接格式）
- 候选：每风格 3 张（seed 101 / 202 / 303），raw 留在 `tools/inbox/raw/set00-phase1/`（gitignore，不入库），本目录只放入选张

## 复现

```powershell
# 需要本机 ComfyUI 已在 127.0.0.1:8188 监听；系统 python 不可用时用 ComfyUI 内置解释器
D:\ComfyUI\python_embeded\python.exe tools\gen\local_flux.py --check
D:\ComfyUI\python_embeded\python.exe tools\gen\local_flux.py --prompt "<TF01 提示词>" `
  --out tmp/x.png --width 1920 --height 1080 --steps 4 --seed 303
D:\ComfyUI\python_embeded\python.exe tools\gen\local_flux.py --from tmp/x.png `
  --to tools/prompts/selected/S1.png --max-edge 3840
```

## 已知限制

1. **负面词不生效**：蒸馏版 `cfg=1`，负条件被 `ConditioningZeroOut` 零化；要负面词得下 base 权重走 `--cfg 5 --steps 20`。
2. **局部细节**：4 步蒸馏 + ESRGAN 在雾面与岩壁上偏软，S3 的岩壁有零星白点瑕疵。100% 放大的细节密度是当前本地管线的短板（验收清单第 ⑤ 条属勉强达标）。
3. **尚未接入**：TF01 垫图 / IP-Adapter 锁风格、BiRefNet 抠图、本地深度图——这三项是 SET-01/02/03 要用的下一段管线。

## 下一步（需要用户）

1. 从 `S1.png` / `S2.png` / `S3.png` 里**裁决一种风格**（用户唯一裁判权）。
2. 选定后：落 `tools/prompts/selected/TF01.png` → 按 `../sets/SET-00-target-frames.md` §2 出 TF02–TF08 → TF01 复制到 `tools/golden/`。
