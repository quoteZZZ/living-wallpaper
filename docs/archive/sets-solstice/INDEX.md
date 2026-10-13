# Solstice · 素材生产任务书索引（SET 系列）

> **用途**：素材生成机（另一台主机，云端模型 / 本地 ComfyUI）按 SET 顺序生产。
> 每个 SET 是一份**自包含任务书**：可整段复制执行，含参数、完整提示词、后处理、打包命令与验收清单。
> **总原则**：`SET-00` 未锁定前，任何优美线素材不开工（目标帧合同，`../target-frames.md`）。

## 生产顺序与状态

| SET | 内容 | 前置 | 产出包 | 状态 |
|---|---|---|---|---|
| [SET-00](SET-00-target-frames.md) | 目标帧（风格基准/黄金帧） | 无 | `studio/frames/selected/` + `studio/frames/golden/` | **Phase 1 ✅ S1 锁定**（2026-10-13）；Phase 2 TF01–08 降级为风格基准帧，仍出、逐张裁决 |
| [SET-01](SET-01-materials.md) | 地形无接缝材质包 ×5（v5.4 参数化地形） | S1 锁定 | `studio/frames/materials/` → schema v2 后入 `app/assets/packs/` | **可开工**（前置已满足） |
| [SET-02](SET-02-trees-seasons.md) | 前景树 · 四季 sprite | S1 锁定 | `app/assets/packs/trees/`（替换占位） | 可开工 |
| [SET-03](SET-03-horses-sprites.md) | 马群 sprite（优美线 Actor） | S1 锁定 | `app/assets/packs/horses/` | 可开工（可后置） |

> **v5.4 注**：整图方案已废除（DESIGN §2.9 参数化地形）；原 SET-01"远景整图+深度图"被地形材质包取代。

**一次只做一个 SET**；做完 → 自检验收清单 → 提交 git → 等代码侧打包验收通过，再开下一个。

## 通用规则（每个 SET 都适用）

1. **raw 不入库**：生成候选图（每步多出的 2–4 张备选）留在本机，只提交最终选中与成包文件。
2. **PNG 提交前压缩**：单图 > 15MB 先过无损级压缩（pngquant / tinypng）再提交。
3. **留档**：每个包的 credits 必须含 `模型名 | prompt 出处 | 日期`（Steam AI 披露审查用）。
4. **git 提交约定**：素材单独提交，英文祈使句，如 `studio: SET-01 terrain materials (S1 style)`。
5. **光照统一左上 45° 中性顶光**；时辰/天气氛围一律由引擎 LUT 调色，素材本身不带夕阳/夜景感。
6. **负面词通用**（每张都带）：见 `../target-frames.md` 第 0 节。

## 分工边界

- **素材机（另一台主机）**：跑生成按钮、后处理（抠图/深度图）、按任务书命名落盘、自检验收清单、提交 git。
- **代码机（本机）**：提示词工程、任务书维护、pack 打包校验、引擎侧加载与调色、与目标帧比对验收。
- **用户**：只在两个节点动手——① 目标帧审美裁决；② 成包前的最后挑图。
