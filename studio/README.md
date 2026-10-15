# `studio/` — 生图线（ComfyUI）

本目录是**产出素材**的本地生图线，与 `game/` 的运行时工程解耦。真源：
[`docs/tech/STRUCTURE.md`](../docs/tech/STRUCTURE.md) §4。

## 为什么需要它

[`game/Content/`](../game/Content/README.md) 的二进制资产不入 git，前提是**能重建**。
目前需要重建的只有两类：

| 类别 | 现状 | 谁生成 |
|---|---|---|
| 纸雕母材质 `M_Paper` / `M_Ink` | ✅ 已由 `SolsticeEditor` 按代码建图生成 | 引擎侧 |
| 纸纹 / 地表 / 水纹 / 卡面 | 🟡 待生图 | **本目录** |

也就是说：**目前游戏不依赖任何生图产物就能跑**。本目录是给"纸的质感再上一个台阶"准备的，
不是启动前提。这一点是刻意的——先让最小闭环成立，再叠质感。

## 目录

```text
studio/
├─ workflows/   ComfyUI 工作流（API 格式 JSON，入 git）
├─ jobs/        批量任务清单（jsonl：prompt / seed / 尺寸 / 输出名，入 git）
├─ presets/     风格主题参数（入 git，与 shared/schema 对齐）
├─ tools/       comfy_batch.py —— 读 jobs 打 ComfyUI HTTP API，写 manifest
└─ out/         ⚠ 产物不入 git；out/manifest.jsonl **入 git**（Steam AI 内容披露留档）
```

## 用法

```bash
# 1. 起 ComfyUI（本机在 D:\ComfyUI）
D:\ComfyUI\run_nvidia_gpu.bat

# 2. 检查模型与连通性
python studio/tools/comfy_batch.py --check

# 3. 跑纸纹任务
python studio/tools/comfy_batch.py --jobs studio/jobs/paper-textures.jsonl \
    --workflow studio/workflows/paper-texture.json
```

产物落在 `D:\ComfyUI\output\solstice\`，脚本会按 job 的 `out` 名字拷进 `studio/out/<子目录>/`
并往 `studio/out/manifest.jsonl` 追加一行（含 prompt / seed / 模型 / 哈希），这是
**AI 生成内容的合规留档**，必须入库。

## 风格锚

`presets/paper-diorama.json` 是与 [`docs/art/ART-STYLE.md`](../docs/art/ART-STYLE.md) 对齐的风格参数：
纸张纤维、切边毛茬、四档硬光、无高光。生图 prompt 由这个 preset 拼出来，不手写。
