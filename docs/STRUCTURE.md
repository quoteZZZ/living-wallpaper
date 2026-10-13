# Solstice · 目录与命名规范（STRUCTURE）

> **定位**：目录形状与命名的**唯一真源**。`DESIGN.md §2.3` 只留摘要并指向本文。
> 冲突仲裁：**结构问题看本文，设计/玩法问题看 `DESIGN.md`**；素材规格看 `PACKS_GUIDE.md`。
> 生效日期：2026-10-13（v1，随「游戏 / 共享 / 素材生产」分域落地）。

---

## 0. 为什么必须分域

项目里其实有三个正交的关注点，混在一起的代价很具体：

| 关注点 | 生命周期 | 混在一起的代价 |
|---|---|---|
| **运行时**：游戏本体 + 壁纸模式 | 进发行包，越干净越好 | 素材工具混进来 → 发行包夹带脚本；改工具会碰到游戏目录 |
| **生产线**：离线出图、抠图、打包 | 永不发布，可以又重又脏 | 产出图片与源码同框 → 分不清哪个是"要发布的" |
| **契约**：pack 格式、图层类、卡槽 | 双方共用，必须只有一份 | 运行时与脚本各写一份枚举 → 静默漂移 |

判定标准很简单：**这个东西会进玩家的安装包吗？** 会 → `app/`；不会但产出会 → `studio/`；两边都要读的定义 → `shared/`。

---

## 1. 六个顶层域

| 目录 | 角色 | 进发行包 | 一句话归属判断 |
|---|---|---|---|
| `app/` | **运行时**：游戏本体、壁纸模式（T1 起 Tauri 壳也在其下） | ✅ | 影响"游戏跑起来是什么样" |
| `shared/` | **跨域契约**：格式定义、枚举，零业务逻辑 | ✅（被内联消费） | 运行时与生产线都要读同一份 |
| `studio/` | **素材生产线**：任务书、作业单、工具、帧产物、中间件 | ❌ | 影响"素材长什么样、怎么生产" |
| `dev/` | **工程基建**：双机同步、机制验证留档 | ❌ | 影响"两台机怎么协作、机制能不能跑通" |
| `docs/` | **文档**：设计与流程的唯一真源 | ❌ | 只是给人看的规定 |
| `site/` | **落地页资源**（Pages 用的截图等） | ❌ | 只服务官网页面 |

根级只允许：`README.md`、`.gitignore`、`index.html`（Pages 入口，见 §8）、`.codebuddy/`。

---

## 2. 完整目标树

```
solstice/
├─ app/                          # ① 运行时（发布物）
│  ├─ index.html                 #    入口：主题令牌 + 画布宿主 + 脚本装配
│  ├─ js/
│  │  ├─ kernel.js               #    微内核：i18n / 存储 / 上下文总线 / 注册表+仲裁 / 场景簿
│  │  ├─ icons.js                #    Lucide 图标数据（ISC）→ 拟迁 vendor/（§7）
│  │  ├─ main.js                 #    装配启动
│  │  ├─ core/                   #    渲染后端：composer(WebGL) · sketch(2D) · style(StyleSystem)
│  │  ├─ ui/                     #    交互：hud(Dock/纸签) · panel(设置中心) · editor(场景编辑器)
│  │  ├─ plugins/                #    官方内容插件（自举）：base · mountains · weather · trees · horses · presets · info
│  │  ├─ vendor/                 #    (待做) 第三方数据/库，与自研代码物理隔开
│  │  └─ shell/                  #    (待做 T1) Tauri 壳相关前端粘合层
│  └─ assets/                    #    运行时素材（只被加载，不被生产）
│     ├─ packs/<name>/           #    成包素材：manifest.json + PNG + credits.txt（← studio 的产物）
│     ├─ models/                 #    低模（当前为 CC0 占位）
│     └─ images/                 #    图片素材库（F5）
├─ shared/                       # ② 跨域契约
│  ├─ pack.schema.json           #    pack manifest 结构（唯一真源）
│  ├─ slots.json                 #    图层类顺序 + 卡槽 id 表
│  └─ README.md
├─ studio/                       # ③ 素材生产线（离线）
│  ├─ contract/                  #    要什么：美术基准 + 任务书
│  │  ├─ target-frames.md        #    目标帧合同（总闸门）
│  │  └─ sets/                   #    SET-00…03 任务书（自包含，可整段执行）
│  ├─ jobs/                      #    怎么生成：作业单 JSON（提示词 + 参数，兼 AI 披露留档）
│  ├─ tools/                     #    怎么跑：gen.py（出图+放大） · pack.py（打包）
│  ├─ frames/                    #    跑出什么
│  │  ├─ candidates/             #    候选草案（裁决用，可清理）
│  │  ├─ selected/               #    裁决入选帧（美术基准）
│  │  └─ golden/                 #    黄金帧（视觉回归比对）
│  ├─ work/                      #    中间产物（gitignore，永不入库）
│  └─ README.md
├─ dev/                          # ④ 工程基建
│  ├─ sync/sync_once.ps1         #    双机 git 自动同步
│  ├─ spikes/workerw_embed.ps1   #    已验证机制留档（桌面嵌入）
│  └─ README.md
├─ docs/                         # ⑤ 文档
│  ├─ DESIGN.md                  #    设计真源（§2.3 目录摘要 → 指向本文）
│  ├─ STRUCTURE.md               #    本文：目录与命名真源
│  ├─ PACKS_GUIDE.md             #    素材制作指南（规格/流程/打包）
│  └─ SYNC.md                    #    双机协作流程
├─ site/shots/                   # ⑥ 落地页截图
├─ index.html                    #    Pages 入口（根级硬约束）
└─ README.md
```

---

## 3. 命名规则

1. **目录名 = 一个角色**，小写单词，不用歧义缩写（`prompts/` 里既放提示词文档又放图片是本规范要消灭的反例）。
2. **不许同名混装**：一个目录里禁止"文档 + 数据 + 产物"三者混放。判断不清就按 §4 的决策表拆。
3. **运行时 JS**：沿用现有风格，小写单词/短横线（`composer.js` / `hud.js` / `kernel.js`），单文件 + JSDoc，不引入目录层级过深。
4. **生产线脚本**：动词命名（`gen.py` 生成、`pack.py` 打包），一个脚本一个动作；工具说明集中在 `studio/tools/README.md`。
5. **素材包**：包 id 一律 `pack.<name>`；落地目录名取去掉前缀的部分（`pack.trees` → `app/assets/packs/trees/`）。
6. **帧产物**：候选 = `<风格>/TF<NN>_v<序号>.png`；入选 = `<风格>.png`（Phase 1）或 `TF<NN>.png`（Phase 2）；任务书 = `SET-<NN>-<slug>.md`。
7. **中间产物**：只有 `studio/work/`（已 gitignore）+ `tmp/`（构建/调试临时）。**任何中间产物都不得入库**，入库的只有裁决入选与成包素材。
8. **双语**：所有面向用户的字符串双语（manifest 的 `name/description` 用 `{"zh","en"}`，缺语言 en 兜底）；文档以中文为主。

---

## 4. 归位决策表（加新东西时对号入座）

| 我要加的东西 | 放哪 | 别忘了 |
|---|---|---|
| 游戏功能 / 画面元素 / 交互组件 | `app/js/{core,ui,plugins,vendor}/` | 新插件走官方自举格式 |
| 素材包（成包） | `app/assets/packs/<name>/` | 用 `studio/tools/pack.py` 生成，别手写 manifest |
| 新素材任务书 | `studio/contract/sets/SET-NN-*.md` + 更新 `sets/INDEX.md` 状态 | 自包含：参数、完整提示词、打包命令、验收清单 |
| 新生成作业单 | `studio/jobs/*.json` | 逐张完整提示词（= AI 披露留档） |
| 新素材脚本 | `studio/tools/*.py` | 纯标准库，零依赖；用法写进 `studio/tools/README.md` |
| 裁决入选帧 / 黄金帧 | `studio/frames/selected/` `…/golden/` | 命名规则见 §3.6 |
| 格式定义 / 枚举 | `shared/` | 同一改动回写 `PACKS_GUIDE.md` 与 `DESIGN.md` |
| 双机脚本 / 一次性验证 | `dev/sync/` `dev/spikes/` | 验证结论要回写 DESIGN |
| 说明文档 | `docs/` | 结构类归本文，其余按主题 |

---

## 5. 跨域红线

1. **依赖方向单向**：`app → shared`（只读，file:// 下内联）、`studio → shared`、`studio → app/assets/packs`（**只写**产物目录）、`dev → 无`。反向依赖一律禁止。
2. **生产线不 import 运行时 JS**，运行时不做任何"读本地 JSON 文件"的加载（零构建 + `file://` 双击可用是硬约束，`fetch` 本地文件会失败）；`shared/*.json` 是给工具链与 T1.1 之后读的。
3. **谁碰哪片**（双机分工，详见 `SYNC.md`）：素材机只碰 `studio/**` 与 `app/assets/packs/**`；`app/js/**`、`docs/**`、`shared/**` 的改动由代码机主导，避免 rebase 冲突。
4. **中间产物不入库**：`studio/work/`、`tmp/` 已在 `.gitignore`；候选草案只在需要裁决时入库。
5. **单个文件上限**：任一 JS 超 3000 行前先拆模块（DESIGN §3.1），不要靠目录名掩盖巨型文件。

---

## 6. 迁移表（2026-10-13 已执行）

| 旧路径 | 新路径 | 说明 |
|---|---|---|
| `tools/prep.ps1`（原 `tools/asset-prep.ps1`） | **删除** | 硬编码 `e:/solstice` 死路径；程序化渐变深度图已被 Depth-Anything 取代 |
| `tools/assets/asset_image.py` | **删除** | 白底键控抠树 + Lucide 抽取，硬编码已不存在的 `src/wallpaper/**`；CC0 原型线已废 |
| `tools/assets/asset_tree_glb.py` | **删除** | 生成 3D 低模，v5.3 已把 3D 线移出主线 |
| `tools/spike_babylon.html` | **删除** | Babylon 引擎线已否决 |
| `tools/pack_builder.py` | `studio/tools/pack.py` | 打包器，改为读 `shared/` 契约 |
| `tools/gen/local_flux.py` | `studio/tools/gen.py` | ComfyUI 客户端（出图 + ESRGAN 放大） |
| `tools/gen/jobs/` | `studio/jobs/` | 生成作业单 |
| `tools/prompts/target-frames.md` | `studio/contract/target-frames.md` | 目标帧合同（"要什么"） |
| `tools/prompts/sets/` | `studio/contract/sets/` | SET 任务书 |
| `tools/prompts/candidates/` | `studio/frames/candidates/` | 候选草案（"跑出什么"） |
| `tools/prompts/selected/` | `studio/frames/selected/` | 裁决入选帧 |
| `tools/golden/`（规划中的） | `studio/frames/golden/` | 黄金帧基准 |
| `tools/spike/` | `dev/spikes/` | 机制验证留档 |
| `tools/sync/` | `dev/sync/` | 双机同步脚本 |
| `preview-*.png`（根级） | `site/shots/{day,night,panel}.png` | 落地页截图，从根目录清出去 |
| `tools/inbox/raw/` | `studio/work/raw/` | 中间产物统一入口 |

**原因**：`tools/` 是典型的杂物抽屉——素材生产、工程基建、死代码、产出图片、待发布的运行时素材全塞在一起，命名还停留在"提示词目录里放 PNG"的状态。拆成 `studio/`（生产）、`dev/`（基建）、`shared/`（契约）后，每个目录名都能直接回答"这是什么"。

---

## 7. 已知待修（留给代码机，本次不动 `app/`）

| 位置 | 问题 | 建议 |
|---|---|---|
| `app/js/plugins/trees.js:45` | 注释里指向 `tools/PACKS_GUIDE.md`（旧路径） | 改为 `docs/PACKS_GUIDE.md` |
| `app/js/icons.js` | 第三方（Lucide, ISC）数据与自研代码同级 | 迁 `app/js/vendor/icons.js` |
| `app/js/core/style.js` | `DESIGN §2.1` 提到 StyleSystem 但文件不存在 | 落地或从 §2.1 删除该行 |
| `app/assets/models/tree.glb`、`app/assets/packs/trees/` | CC0 原型占位（`manifest.json` + 单张 `summer.png` 冒充四季） | SET-02 落地时用真素材替换；`trees.js` 的程序化兜底保留 |
| `app/index.html` | 脚本装配为硬编码 `<script>` 列表 | 新增文件必须同步装配清单，或 T1.1 起改用清单化加载 |

---

## 8. 被否决的选项（避免反复推翻）

| 选项 | 否决理由 |
|---|---|
| 落地页搬进 `site/index.html` | GitHub Pages 的分支发布**只支持根目录或 `/docs`**，搬走会改 URL 或需切 Actions 部署；收益只是"根目录少一个文件"。**保留根级 `index.html`，`site/` 只放它的资源**（截图）。 |
| `app/` 改名 `game/` | 会打断已发布的 Pages 预览链接、README、规则文档与同步脚本；而"运行时应用"本来就叫 app，语义不亏。**保留 `app/`，并在本文明确它 = 游戏运行时（含壁纸模式）**。 |
| 生产线叫 `pipeline/` | "谁的管线"不明确，且未来还会有构建/发布管线，容易再次混装。用 `studio/`（素材工作室）区分度更高。 |
| `docs/SYNC.md` 并入本文 | SYNC 讲**流程**（两台机怎么协作），本文讲**形状**（东西放哪里），读者与失效时机都不同。 |
| 保留单一 `tools/` 大目录 | 正是本次要消灭的问题：内容物毫无共同点，命名不描述内容。 |
| 把 `shared/*.json` 直接 `fetch` 进运行时 | 零构建 + `file://` 双击可用是硬约束，`fetch` 本地 JSON 会失败；T1.1 进 http 环境后再改为直接读取。 |
