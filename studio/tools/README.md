# studio/tools/ —— 生产线可执行工具

四个工具，纯 Python 标准库（**零第三方依赖**，不需要 pip install）。

出图链路：`gen.py`（渲染/放大/垫图/接缝重绘）→ `seamless.py`（错位+接缝处理+质检）
→ `finish.py`（一键把 raw 渲染变成无接缝成品 tile）→ `pack.py`（打包成运行时素材包）。

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

### 垫图锁风格（`--ref`，FLUX.2 edit 分支）

按官方 `image_flux2_klein_image_edit_4b_distilled` 模板接线（参考图 VAE 编码后经
`ReferenceLatent` 挂进条件），用于「所有优美线素材以 `S1.png` 锁风格」这条硬约束：

```powershell
D:\ComfyUI\python_embeded\python.exe studio\tools\gen.py `
  --prompt "<材质提示词>" --out studio\work\raw\rock_v1.png `
  --ref studio\frames\selected\S1.png --ref-crop 240,480,640,640
```

`--ref-crop` 是 `x,y,w,h`（必须是 S1 内对应材质区域的局部；裁到岸边草地/天空会把内容带进来）。
批量作业单里写 `"ref"` / `"ref_crop"` 两个键即可。

### 接缝带重绘（`--seam-fix`）

给「已按半幅错位的 tile」重建中线硬棱：掩膜十字带 → VAEInpaint 编码 → 完整调度重绘 →
只把该带贴回原图（边框像素不动，无缝不被破坏）。

```powershell
D:\ComfyUI\python_embeded\python.exe studio\tools\gen.py `
  --seam-fix studio\work\raw\rock_v1_roll.png --to studio\work\raw\rock_v1_seamless.png `
  --band 128 --seam-steps 4 --seam-prompt "<与出图一致的材质提示词>"
```

- `--seam-steps 4`（完整调度，等价全步去噪）是经验值；**小于完整调度会得到灰块**
  （低噪声起步对蒸馏模型是域外输入），不要用 `SplitSigmas` 截半。
- `--band 128` 够用；带宽越大重绘面积越大、越慢。

## `seamless.py` —— 无缝化与质检（纯像素运算，不占显存）

```powershell
# 环形错位（保证平铺无缝，代价是中线出现硬棱，交给 --seam-fix 处理）
D:\ComfyUI\python_embeded\python.exe studio\tools\seamless.py `
  --in studio\work\raw\rock_v1.png --out studio\work\raw\rock_v1_roll.png --mode roll

# 成品质检 + 2×2 平铺预览（mode none = 只测不动）
D:\ComfyUI\python_embeded\python.exe studio\tools\seamless.py `
  --in studio\work\raw\rock_v1_seamless.png --mode none --tile-preview

# 逐材质评审图：多张候选各自 2×2 平铺、并排成一张（挑图用）
D:\ComfyUI\python_embeded\python.exe studio\tools\seamless.py `
  --sheet studio\work\raw\sheet_rock.png --from a.png b.png c.png --tile-side 512
```

- `--mode blur|mirror` 是不用 ComfyUI 的降级方案（涂抹/镜像混合）：能消缝，但**高对比纹理上
  看得出柔带或镜像对称**，正式素材请走 `--seam-fix`。
- `--flatten 0.35`：按**环形采样**的低频亮度场做增益归一，压掉出图自带的方向性渐变
  （SET-01「均匀平光」）；因为场是周期的，压平不会破坏接缝。
- 质检口径：`seam L|R`、`T|B` 是对边像素差，和「自然梯度」（相邻列/行差）比——**比值 ≈1.0
  就等于肉眼无接缝**；`light dY/dX` 是上下/左右半幅亮度差，平光应接近 0。

## `finish.py` —— raw 渲染 → 无接缝成品 tile（一键）

`seamless.py --mode roll` + `gen.py --seam-fix` + 质检 + 平铺预览，按作业单批量跑：

```powershell
D:\ComfyUI\python_embeded\python.exe studio\tools\finish.py `
  --batch studio\jobs\set-01-materials.json --dir studio\work\raw
```

- 产物 `studio/work/raw/<name>_seamless.png`（候选，gitignore）+ `_tile2x2.png`（目视验收）。
- `--flatten 0.35` 默认开启（SET-01 要求平光）；`--seed-offset` 让接缝重绘与出图用不同种子。
- 结尾打印质检表：接缝比 ≈1.0、`light dY` ≈0 即为过。

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
