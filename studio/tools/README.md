# studio/tools/ —— 生产线可执行工具

两个工具，纯 Python 标准库（**零第三方依赖**，不需要 pip install）。

## `gen.py` —— 出图与放大

本机 ComfyUI（FLUX.2 klein 4B fp8）客户端，三种模式。

```powershell
# 1) 体检：确认 ComfyUI 在跑、显存余量
D:\ComfyUI\python_embeded\python.exe studio\tools\gen.py --check

# 2) 单张出图（16:9 / 1920×1080，约 8–12s）
D:\ComfyUI\python_embeded\python.exe studio\tools\gen.py --prompt "<见 studio/jobs/>" `
  --out studio\work\raw\probe.png --width 1920 --height 1080 --steps 4 --seed 303

# 3) 批量出图（作业单 JSON，每项 = 一次 render 的 kwargs）
D:\ComfyUI\python_embeded\python.exe studio\tools\gen.py --batch studio\jobs\target-frames.json

# 4) 放大到规格（RealESRGAN ×2 → 长边封顶 3840）
D:\ComfyUI\python_embeded\python.exe studio\tools\gen.py --from studio\work\raw\probe.png `
  --to studio\frames\selected\S1.png --max-edge 3840
```

- 帧尺寸自动吸附到 /16 网格（FLUX 的 patchify 需要），再回裁到请求尺寸——`--width/--height` 严格生效
- 蒸馏版权重跑 `cfg=1`，**负面词不生效**；要负面词需 base 权重 + `--cfg 5 --steps 20`

## `pack.py` —— 打包

把源图（+可选深度图）打成运行时能吃的 pack 目录：`manifest.json` + PNG + `credits.txt`。

```powershell
# 整图层包（远景主视觉 + 深度图）
D:\ComfyUI\python_embeded\python.exe studio\tools\pack.py --out app\assets\packs\mountains `
  --id pack.mountains --name-zh "远景主视觉" --name-en "Scene Background" --slot mid `
  --image studio\frames\selected\TF01.png --depth studio\work\depth.png `
  --credit "FLUX.2-klein 4B fp8 | prompt: studio/contract/sets/SET-01 | 2026-10-13"

# 变体包（四季树等透明 sprite）
D:\ComfyUI\python_embeded\python.exe studio\tools\pack.py --out app\assets\packs\trees `
  --id pack.trees --name-zh "前景树 · 四季" --name-en "Trees · Seasons" --slot near `
  --variant spring:spring.png --variant summer:summer.png `
  --credit "FLUX.2-klein 4B fp8 + BiRefNet | prompt: studio/contract/sets/SET-02 | 2026-10-13"
```

校验（不通过即退出非零，不会写出坏包）：

- `slot` 必须存在于 `shared/slots.json`
- 产物必须满足 `shared/pack.schema.json` 的必填项与双语名要求
- PNG 格式、长边 ≥2048（不足只告警）、深度图与整图同尺寸（不一致告警）
