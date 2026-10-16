---
id: art/ASSETS
title: 资产生产与登记
version: 1.1
date: 2026-10-16
status: active
truth: subsystem
owner: both
---

# 资产生产与登记（ASSETS）

## 0 本文件管什么 / 不管什么

- **管**：资产类别与去向、两条生产线的工作方式、**资产登记（manifest）规范**、生图批次规范、QC 清单、AI 内容合规。
- **不管**：风格参数与色板（见 [`ART-STYLE.md`](ART-STYLE.md)）；**目录与命名真源**（见 [`../tech/STRUCTURE.md`](../tech/STRUCTURE.md)）；环境安装（见 [`../ops/ENV.md`](../ops/ENV.md)）；2D / 3D 分工表（已并入本文 §1）。
- **目录状态提醒**：本文件提到的 `studio/`、`shared/`、`game/` 目前**尚未落地**（计划中，随 M0 建立）——见 [`../tech/STRUCTURE.md`](../tech/STRUCTURE.md) §1 的状态列。

---

## 1 资产类别与去向

| 类别 | 形态 | 谁产出 | 源 / 参数位置 | 产物位置 | 入 git |
|---|---|---|---|---|---|
| 地形、水体、山体、纸板层 | 3D | 程序化几何生成器（C++） | `game/Source/Solstice/Gen/` | `game/Content/World/` | 源码 ✅ / 产物 ❌ |
| 动物、岩石、建筑、装饰主体 | 3D | 程序化几何 | 同上 | `game/Content/Creatures|World/` | 源码 ✅ / 产物 ❌ |
| **纸板立牌**（树丛、灌木、旗帜、道具） | 3D 面片 + 2D 贴图 | 几何由代码生成 + 贴图走生图线 | `studio/jobs/` | `game/Content/World/` | 参数 ✅ / 产物 ❌ |
| **卡面** | 2D 图（3:4 画芯） | 生图线 | `studio/jobs/` + [`ART-STYLE.md`](ART-STYLE.md) §4 | `game/Content/Cards/` | 参数 ✅ / 产物 ❌ |
| **UI**（面板、边框、图标、按钮） | 2D | 生图线 + 九宫格 | `studio/jobs/` | `game/Content/UI/` | 参数 ✅ / 产物 ❌ |
| 地表材质、纸纹、水纹、苔藓、雪痕 | 2D 贴图 | 生图线 + 程序化混合 | `studio/jobs/` | `game/Content/Core|World/` | 参数 ✅ / 产物 ❌ |
| 粒子贴图（雨滴、雪花、落叶、光斑） | 2D 贴图 | 生图线 | `studio/jobs/` | `game/Content/FX/` | 参数 ✅ / 产物 ❌ |
| 天空 / 远景背景板 | 2D（可 3D） | 生图线全景图 + 程序化色板 | `studio/jobs/` | `game/Content/World/` | 参数 ✅ / 产物 ❌ |
| 风格主题参数 | JSON | 手写 / AI | `shared/schema/style.schema.json` + `studio/presets/` | — | ✅ |
| 内容数据（物种 / 卡池 / 法则 / 预设） | JSON | AI 生成 | `shared/schema/*.json` | `game/Config/Solstice/Data/*.json` | ✅ |

> **核心不变量**：`game/Content/` 的二进制**不入 git**，因此必须能由 **"种子 + 生成器 + 契约 + manifest"** 完整重建（[`../tech/STRUCTURE.md`](../tech/STRUCTURE.md) §0）。

### 1.1 两条生产线（+ 一条可选）

| 线 | 内容 | 谁做 |
|---|---|---|
| ① **程序化几何** | 生成器产出低模块面：纸板层、岩石、植物、动物部件、云 | AI（C++） |
| ② **生图线** | 立牌贴图 / 卡面 / UI / 纸纹 / 粒子 / 背景板 | AI 调度，用户挑图 |
| ③ **可选 3D 生成** | 日后接入本地 3D 生成补多样性；**M0 不依赖** | 后续 |

> **全 3D 没有废掉生图线**：纸板立牌的正面、卡面、UI、贴图、粒子恰好是立体纸雕最需要的东西——2D 产出反而有了更明确的用武之地。

### 1.2 动画：零人工资产

- **铰链运动**：动物视为纸板关节件，正弦 / 缓动驱动部件旋转（走路、扇翅、低头）。
- **整体摆动**：低频噪声驱动的轻微摇摆（纸片感）。
- **形态变化**：缩放、倾斜、翻转 + 顶点位移（生长、枯萎、翻滚）。
- 结论：**不需要任何人工动画资产**，且"纸板玩具般的动作"正是风格的一部分。

### 1.3 资产规模预算（T1 基准）

| 类别 | 数量（M0 → 最终） | 来源 |
|---|---|---|
| 地块纸板层 | 5 种高度模板 | 程序化 |
| 岩石 / 建筑 / 装饰 | 12 → 40 | 程序化 |
| 植物（3D 主体 + 立牌） | 6 → 30 | 程序化 + 生图 |
| 动物 | 5 → 30 物种（共用几套部件集） | 程序化 |
| **立牌贴图** | 20 → 120 | **生图线** |
| **卡面** | 36 → **≥252**（卡种数；每种可多张，但只出一张卡面） | **生图线** |
| **UI / 图标 / 边框** | 30 → 90 | **生图线** |
| 地表 / 纸纹 / 粒子贴图 | 20 → 60 套 | 生图线 + 程序化混合 |

> **单主题预算（★第 47 轮）**：风格包 / 主题扩展已否决（OPEN-QUESTIONS #9）——上表即**全量预算**，不再有"×N 主题"乘数。
> **卡面复用（★建议，待定）**：同一功能位在不同级之间**共用画芯**（1 级"降雨"与 5 级"降雨"只换版式标识），可把卡面产出量降到约 **1/3**。

---

## 2 资产登记（manifest）

**位置**：`studio/out/manifest.jsonl`（**该文件必须入库**；同目录的其他产物不入库）。

**逐张一行**，字段：

| 字段 | 含义 | 必填 |
|---|---|---|
| `id` | 资产 id（如 `card.water.3.rite.rain`、`tex.paper.grain`） | ✅ |
| `file` | 产物相对路径（`out/cards/...`） | ✅ |
| `kind` | `card` / `cutout` / `texture` / `fx` / `bg` / `ui` | ✅ |
| `style` | 所属风格主题（`T1`…`T5`） | ✅ |
| `model` | 模型文件名与版本（如 `flux-2-klein-4b-fp8`） | ✅ |
| `prompt_ref` | prompt 的引用键（不放全文，放 `jobs/` 里的条目 id） | ✅ |
| `seed` | 随机种子 | ✅ |
| `size` | 像素尺寸 | ✅ |
| `date` | 生成日期（YYYY-MM-DD） | ✅ |
| `source` | `generated` / `procedural` / `cc0` | ✅ |
| `pick` | 是否被用户选中（`yes`/`no`/空） | 建议 |
| `note` | 备注（返工原因等） | 可选 |

**为什么强制**：① **Steam AI 内容披露**需要逐张可追溯；② 两台机器靠它确认"产物身份"；③ 缺 manifest 的素材视为**不可复现**，**不得进游戏**（[`../tech/STRUCTURE.md`](../tech/STRUCTURE.md) §9）。

---

## 3 生图批次规范

**环境**：本机 ComfyUI 便携版 `D:\ComfyUI`，服务 `http://127.0.0.1:8188`（探针 `/system_stats`）；模型与实测参数见 [`../ops/ENV.md`](../ops/ENV.md) §3。

**采样基线**：`steps=4` · `cfg=1.0` · `sampler=euler` · `Flux2Scheduler`。
> ⚠ **CFG=1 时负向串不参与采样**（走 zero-out），**仅作 manifest 留档**——真正的负向控制靠正向串的精确用词 + 后期挑图。

**批次一致性四条**：

1. 每批以**风格锚图**为参照；同批固定正向风格前缀与色板用词。
2. 同元素 / 同季节**固定基底 seed**，只变主体描述。
3. **色板 hex 与用词必须与 [`ART-STYLE.md`](ART-STYLE.md) 同源**——要加新色 / 新词，先回写 ART-STYLE 再落 prompt。
4. 逐张写入 manifest（§2）。

**候选风格串**（迁移自旧稿，**尚未随新形态定标**，定标前不作为硬约束）：

```text
cel shaded, flat color blocks, bold ink outline, 3-tone step shading, hard-edge shadow,
high silhouette readability, screen-print paper grain overlay, limited seasonal palette,
clean lineart, single centered subject, solid chroma background, crisp edges, no soft gradient
```

```text
photorealistic, soft gradient shading, airbrush, subsurface scattering, glossy realistic skin,
blurry, depth of field bokeh, lens flare, front-facing portrait, extreme close-up face,
text, watermark, signature, letters, numerals, frame, border, corner ornament,
extra limbs, extra fingers, cluttered background, multiple subjects
```

---

## 4 QC 清单（批量挑图逐条打勾）

- [ ] 1. 硬边 Cel-shading，**无软渐变 / 写实反光**
- [ ] 2. **描边完整**，未被光效吃掉，粗细符合 [`ART-STYLE.md`](ART-STYLE.md) §3.1
- [ ] 3. **缩略图下剪影可辨**
- [ ] 4. 色彩落在对应色板范围内，未跑偏色
- [ ] 5. **无正面人脸特写**（ART-STYLE §5）
- [ ] 6. 卡面**画芯无文字 / 无边框 / 无徽记**（ART-STYLE §4）
- [ ] 7. 主体落在**安全区**内（上 96 / 左右 88 / 下 176）
- [ ] 8. **无多余肢体 / 手指**、无明显结构崩坏
- [ ] 9. 纸张颗粒可见但**不过度**（不糊掉描边）
- [ ] 10. 元素母题与 [`ART-STYLE.md`](ART-STYLE.md) §3.4 **一致**
- [ ] 11. 已写入 `manifest.jsonl`（§2 字段齐全）

---

## 5 合规与边界

| 项 | 规则 |
|---|---|
| Steam AI 披露 | AI 生成素材**逐张留档**（模型 / prompt 引用 / seed / 日期），满足平台披露要求 |
| 运行时不调用 AI | 游戏运行期**不做任何 AI 调用或对话**——AI 只用于离线生产（GDD §2 非目标） |
| 素材来源 | 不使用来路不明的第三方素材；CC0 仅作**开发期占位**，不进发行内容 |
| 用户裁决 | **卡面 / 立牌 / 风格图必须过用户挑图**才算资产完成（[`../ops/WORKFLOW.md`](../ops/WORKFLOW.md) §4） |
| 单张提交 | 卡面 / 立绘类**单独提交**，便于回溯与回退 |

---

## 6 更新触发

| 改动类型 | 必须同次更新 |
|---|---|
| 新增资产类别 / 改变存放去向 | 本文件 §1 + [`../tech/STRUCTURE.md`](../tech/STRUCTURE.md) §4/§8 + `.gitignore` |
| manifest 字段变化 | 本文件 §2 + 生成脚本 + `studio/out/manifest.jsonl` 表头说明 |
| 采样参数 / 模型变化 | 本文件 §3 + [`../ops/ENV.md`](../ops/ENV.md) §3 |
| QC 标准变化 | 本文件 §4 + [`ART-STYLE.md`](ART-STYLE.md) 对应章节 |
| 风格定标完成 | 本文件 §3 的"候选风格串"改为定标串，并记录版本 |

---

## 沿革

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0 | 2026-10-14 | 新建；吸收 `archive/ART-STYLE-v1.md` §6（Prompt 规范）与 §7（studio 接口）中仍有效的部分，按现行形态（GDD §9）重写为"生产 + 登记 + 合规" |
| 1.1 | 2026-10-16 | **主题扩展否决同步（第 47 轮）**：§1.2 删 T2 剪纸动画行；§1.3 改**单主题全量预算**（风格包 / 主题扩展已否决，无 ×N 乘数） |
