# 目标帧候选（本地 FLUX.2 [klein] 4B 草案）

> **这些不是正式素材。**
> 按 `docs/PACKS_GUIDE.md` §0 与 `tools/prompts/target-frames.md`，正式目标帧要求
> **16:9 / ≥4K / 云端顶级模型**产出。本目录是**本地 FLUX 快速草案**，用途是在花钱跑云端之前
> 先完成两件便宜的事：**Phase 1 风格裁决**、**Phase 2 光照/天气方向预览**。
> 目标帧一旦锁定，按 §0 重走云端正式产出，本目录即可清理。

## 复现方式

```powershell
# 需要本机 ComfyUI 已在 8188 监听（桌面 comfyui.bat）
python tools/gen/local_flux.py --check
python tools/gen/local_flux.py --batch tools/gen/jobs/target-frames.json
```

- 作业单 `tools/gen/jobs/target-frames.json` 内含**逐张完整提示词**（风格段 + 光照段 + 场景锚点 + 画质锚点），
  按 `target-frames.md` 的固定拼接格式生成，可直接作为 Steam AI 披露的提示词留档。
- 工具 `tools/gen/local_flux.py` 为 stdlib-only，无第三方依赖。

## 生成规格（实测）

| 项 | 值 |
|---|---|
| 后端 | 本机 ComfyUI 0.39.0 + FLUX.2 [klein] 4B **fp8**（蒸馏 4 步），RTX 5060 8GB |
| 精度 | fp8 扩散权重 + Qwen3-4B 文本编码器 + flux2-vae |
| 分辨率 | 1344×768（16:9，像素量 ≈1024²，8GB 安全线内） |
| 采样 | `euler` + `Flux2Scheduler`，4 步，`cfg=1` |
| 种子 | TF01 三变体 = 101 / 202 / 303；其余帧 = 101（固定可复现） |
| 显存峰值 | **7456 MiB / 8151 MiB**（30 张批量，无 OOM） |
| 单张耗时 | 4–6 秒 |

## 目录

```
candidates/
├─ S1/   TF01_v1..v3   TF02..TF08      # 唯美动画风（新海诚/吉卜力）
├─ S2/   TF01_v1..v3   TF02..TF08      # 厚涂概念艺术风
└─ S3/   TF01_v1..v3   TF02..TF08      # 电影写实风
```

- **S1 / S2 / S3** = `target-frames.md` §1 的三种风格候选。
- **TF01–TF08** = §2 的八个时辰/天气关键帧；TF01（清晨·晴）为基准帧，故多出 2 个变体。
- 共 30 张：3 风格 × (TF01 三变体 + TF02–TF08 各一张)。

## 已知限制（重要）

1. **负面词无效**：蒸馏版跑 `cfg=1`，负条件是 `ConditioningZeroOut`，`target-frames.md` 的通用负面词
   在本批草案里**不会生效**。需要负面词时改用 base 权重：
   ```powershell
   python tools/gen/local_flux.py --model flux-2-klein-base-4b-fp8.safetensors `
     --cfg 5 --steps 20 --negative "people, face, text, watermark, ..." --prompt "..." --out tmp/x.png
   ```
   （base 权重尚未下载）
2. **分辨率低于规格**：1344×768 远低于 §2 要求的 ≥2048 长边 / 4K 整图，放大后局部细节密度不足，
   不能直接当成品用。
3. **尚未接入**：TF01 垫图 / IP-Adapter（风格锁定）、BiRefNet 抠图（透明 sprite）、本地深度图节点。
   这三项是 §0 流程里下一步要补的管线。
4. **9B 不可用**：`FLUX.2-klein-9B` 为 gated 且需约 29GB 显存，8GB 卡排除。

## 下一步

1. 你从 30 张里裁决出一种风格（S1 / S2 / S3），存 `tools/prompts/selected/S?-TF01.png`。
2. 我按锁定风格补管线：IP-Adapter 锁风格 + BiRefNet 抠图 + 本地深度图。
3. 风格锁定后，正式目标帧按 §0 走云端 16:9 ≥4K 重出。
