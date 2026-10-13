# studio/ —— 素材生产线（离线，不随游戏发布）

**一句话**：这里回答「素材要什么 → 怎么生成 → 跑出什么 → 怎么打包成运行时素材」。
运行时（`app/`）只吃结果：`app/assets/packs/`。生产线的东西不进发行包。

## 目录职责

| 目录 | 回答的问题 | 内容 |
|---|---|---|
| `contract/` | **要什么** | 目标帧合同 `target-frames.md`（美术基准，唯一真源）+ `sets/SET-*.md` 任务书（自包含，可整段执行） |
| `jobs/` | **怎么生成** | 生成作业单 JSON：逐张完整提示词 + 参数，兼作 Steam AI 披露留档 |
| `tools/` | **怎么跑** | `gen.py`（ComfyUI 出图 + ESRGAN 放大）、`pack.py`（打包成 pack 目录），见 `tools/README.md` |
| `frames/` | **跑出什么** | `candidates/` 候选草案 → `selected/` 裁决入选 → `golden/` 黄金帧基准（视觉回归） |
| `work/` | **中间产物** | raw 候选、临时帧、放大中间件——**已 gitignore，永不入库** |

## 一轮生产（循环）

```
读 contract/sets/ 领一个 SET（一次只做一个，尊重前置）
  → 用 tools/gen.py 按 jobs/ 里的提示词出图（中间件写 work/）
  → 自检 contract 的验收清单 → 不过则重出
  → 入选帧落 frames/selected/
  → 成包素材用 tools/pack.py 写进 app/assets/packs/<包名>/
  → 素材单独提交（英文祈使句），推送
```

## 产物落位（只有两处会进运行时）

- `frames/selected/`、`frames/golden/`：美术基准，随仓库走，供比对与留档
- `app/assets/packs/<pack.<name> 去前缀>/`：`manifest.json` + PNG + `credits.txt`，运行时加载

## 环境（素材机）

- 生图后端：本机 ComfyUI `http://127.0.0.1:8188`，FLUX.2 [klein] 4B fp8（4 步蒸馏）
- 放大：`RealESRGAN_x2plus`（`models/upscale_models/`）
- 解释器：`D:\ComfyUI\python_embeded\python.exe`（系统 PATH 里的 `python` 未必可用）
