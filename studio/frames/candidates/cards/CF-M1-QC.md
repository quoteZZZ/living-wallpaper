# CF-M1 · 卡面自检报告（春季批 · batch 1/4）

> 生成机：素材机（RTX 5060 8GB，ComfyUI + FLUX.2-klein 4B fp8，本地离线）
> 日期：2026-10-13 ｜ 依据：`studio/contract/card-faces.md`（卡面生产合同）+ `docs/DESIGN.md` §4
> 状态：**春季 15 张已落盘待批量裁决**（本报告不代替用户的审美裁决）

## 1. 这一轮做了什么

合同 §2 的 CF-M1（rank1 基础卡 60 张 = 4 季 × 15）本轮产出**春季 15 张**：
`studio/frames/cards/<card-id>.png`（15 张，1024×1365），每张出 2–3 张候选
（共渲染 33 张，raw 全部留在 `studio/work/raw/cf-m1-spring/`，gitignore 不入库）。
本目录 `CF-M1-spring-review.png` 是整季评审图（15 张一排看完，即合同 §6 的"批量裁决"单位）。

**⚠️ 批单来源**：合同 §3.1 指定的 `studio/jobs/cards-cf-m1.json` 由代码机维护，**本轮拉取时该文件
不存在**（`studio/jobs/` 只有 target-frames / set-01-materials 两个旧作业单），仓库里也还没有任何
cardpack 数据。为了不停摆，素材机**按合同 §2 的系别分布与 §4 提示词骨架自拟**了本季批单
`studio/jobs/cards-cf-m1-spring.json`（逐张完整提示词 = AI 披露留档）。**卡 id 与主题需与代码机的
cardpack 数据对齐**：若主题不同，画面可按系别复用，但文件名与 `image` 字段要对上（见 §4）。

## 2. 规格与链路（可复现）

```powershell
# ① 出图：竖版 3:4、1024×1365、垫 S1 局部裁片锁风格（gen.py 的 FLUX.2 edit 分支）
D:\ComfyUI\python_embeded\python.exe studio\tools\gen.py --batch studio\jobs\cards-cf-m1-spring.json
# 续跑/只补新变体：
D:\ComfyUI\python_embeded\python.exe studio\tools\gen.py --batch studio\jobs\cards-cf-m1-spring.json --skip-existing

# ② 整季评审图（不用 GPU，把候选 5 列排成一张）
D:\ComfyUI\python_embeded\python.exe studio\tools\contact.py `
  --out studio\work\raw\cfsheet-v1.png --cols 5 --cell 420 --from <15 张 v1 路径...>
```

**关键发现：卡面必须走垫图（edit）分支。** 同一提示词下纯文生图会**自己画出卡框**
（圆角黑边，合同 §1 明确禁止"边框"），垫图分支不会；两种模式的 1024×1365 与上身留白都正常，
但纯文生图那张必须作废。留档对比：`studio/work/raw/probe-card-ref.png` / `probe-card-t2i.png`（raw，不入库）。

## 3. 自检结果（合同 §5 逐条）

| 验收项 | 结果 | 依据 |
|---|---|---|
| 竖版 3:4、1024×1365 | ✅ 15/15 | 逐张读 PNG 头校验，30 张 raw 全部 1024×1365 |
| 无文字/水印/边框 | ✅ | 15 张逐张目视（评审图）+ 垫图路线本身不画框 |
| 单主体居中、占比 55–75%、上部留气口 | ⚠️ 13/15 达标 | `pl-plum`（v3 大枝占下 2/3 ✅）、`ps-tea-picker`（v3 背身占下半 ✅）已重出修正；`bs-hare`、`wt-rain-pool` 主体偏小/留白偏大，见 §5 |
| 季节色调正确（同季和谐） | ✅ 基本 | 15 张走同一 spring 色调段（fresh greens + soft pink blossoms），评审图观感统一 |
| 与 S1 风格一致（垫图生效） | ⚠️ 待用户确认 | 全部垫 S1 裁片；整体为柔和淡彩 anime，但 `bs-hare` 的写实毛发感与其余不一致（风格离群） |
| 平光、无自带时辰 | ✅ | 均为中性日光，无夕阳/夜景氛围（时辰由引擎给） |
| credits 留档完整 | ✅ | `studio/frames/cards/credits.txt` 逐张一行：`<card-id> \| 模型 \| jobs/cards-cf-m1-spring \| 日期` |

## 4. 落盘清单与选中变体（提案：卡表 id 待代码机对齐）

| # | 卡 id（自拟） | 系 | 主题 | 落盘文件 | 选中 |
|---|---|---|---|---|---|
| 1 | `card.mt-plum-ridge.1` | mountain | 春山梅岭 | `mt-plum-ridge.1.png` | v1 |
| 2 | `card.mt-mist-valley.1` | mountain | 春山雾谷 | `mt-mist-valley.1.png` | v2 |
| 3 | `card.wt-brook.1` | water | 春溪 | `wt-brook.1.png` | v1 |
| 4 | `card.wt-rain-pool.1` | water | 春雨池塘 | `wt-rain-pool.1.png` | v2 |
| 5 | `card.pl-plum.1` | plant | 梅 | `pl-plum.1.png` | v3（重出） |
| 6 | `card.pl-willow.1` | plant | 柳 | `pl-willow.1.png` | v2 |
| 7 | `card.pl-peach.1` | plant | 桃 | `pl-peach.1.png` | v2 |
| 8 | `card.bd-swallow.1` | bird | 燕 | `bd-swallow.1.png` | v1 |
| 9 | `card.bd-oriole.1` | bird | 黄鹂 | `bd-oriole.1.png` | v3（重出） |
| 10 | `card.bs-ox.1` | beast | 耕牛 | `bs-ox.1.png` | v1 |
| 11 | `card.bs-hare.1` | beast | 野兔 | `bs-hare.1.png` | v2 |
| 12 | `card.ps-tea-picker.1` | person | 采茶人 | `ps-tea-picker.1.png` | v3（重出） |
| 13 | `card.sk-spring-cloud.1` | sky | 春云 | `sk-spring-cloud.1.png` | v2 |
| 14 | `card.sk-drizzle.1` | sky | 细雨 | `sk-drizzle.1.png` | v2 |
| 15 | `card.af-kite.1` | artifact | 纸鸢 | `af-kite.1.png` | v1 |

系别分布与合同 §2 一致：mountain 2 / water 2 / plant 3 / bird 2 / beast 2 / person 1 / sky 2 / artifact 1。

## 5. 待用户裁决（批量裁决单位 = 春季 15 张）

先看 `CF-M1-spring-review.png`（5×3 网格，按 §4 顺序）。素材机自陈的疑点：

1. `bs-hare.1`（第 11 格）：野兔写实毛发感明显强于同批，**风格离群**，建议退回重出；
2. `wt-rain-pool.1`（第 4 格）：俯视池塘，与同批"远景/中景"节奏不同，留白偏大；
3. `sk-drizzle.1`（第 14 格）：色调偏灰湿，与"fresh spring"基调略有出入；
4. 若整季节奏/主题需调整（例如主题名与代码机卡表不符），退回时请给出目标主题词，素材机按"同一素材最多 3 次"重出。

## 6. 阻塞与交接

- **卡在用户**：春季 15 张批量裁决（挑图/退回）；通过后本季即定稿。
- **卡在代码机**：① `studio/jobs/cards-cf-m1.json` 批单未交付（本轮由素材机自拟春季批单）；
  ② 卡表 id/主题/名称需与 `shared/card.schema.json` 的 cardpack 数据对齐（本轮名称为自拟）；
  ③ 夏季/秋季/冬季批（CF-M1 余下 45 张）需要同样的批单或确认沿用本轮自拟卡表。
- 素材机未改动 `docs/**`、`shared/**`、`app/**`、`studio/contract/**`。

## 7. 本轮入库清单

`studio/jobs/cards-cf-m1-spring.json`（33 条，含逐张完整提示词与 seed）·
`studio/frames/cards/*.png`（15 张）· `studio/frames/cards/credits.txt` ·
`studio/frames/candidates/cards/CF-M1-spring-review.png` · 本报告 ·
`studio/tools/contact.py`（新：评审图拼版）· `studio/tools/gen.py`（`--skip-existing`、`_` 前缀元数据容忍）
