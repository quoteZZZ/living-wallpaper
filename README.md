# Solstice（项目名待定）

> 旧名《至日 · 岁局》已随形态作废；工程与模块名暂沿用 `Solstice`。

> **当前状态：立项已定稿（2026-10-14）。** 唯一真源：[`docs/GDD.md`](docs/GDD.md)
> 形态：**纸雕微缩（全 3D）的永续幻想生态界**——可与真实时间同频（联网天气 / 昼夜 / 节气），也可把时间握在手里；**干涉卡 = 七元素 × 11 级（0–9 / 禁物）× 3 类（物 / 术 / 律），卡种 ≥ 231**（多元素卡种另计、每种可多张）；无失败、无目标系统。
> 本仓库当前**只有文档与开发环境脚本，没有任何游戏代码**——`game/` 里连一个 `.uproject` 都没有。

---

## 一、仓库真实状态（逐项核对，非规划）

| 项 | 真实情况 |
|---|---|
| 游戏代码 | ❌ **无**。`game/` 下仅有本地 `DerivedDataCache/`（已被 `.gitignore` 忽略，不入库）；**无 `Solstice.uproject`、无 `Source/`** |
| 工程 / 解决方案 | ❌ 无 `Solstice.sln`、无 `compile_commands.json`（需引擎就绪后由脚本生成） |
| 立项文档 | ✅ **已定稿**：[`docs/GDD.md`](docs/GDD.md)（唯一真源 **v6.0**，已细化到规格级） |
| 文档 | ✅ `docs/` 共 9 份（见 §四） |
| 环境脚本 | ✅ `tools/` 共 9 个 PowerShell + `README.md` |
| IDE 配置 | ✅ `.vscode/` 共 7 份，另有 `.clang-format`、`.editorconfig` |
| 项目数据 | ✅ `.codebuddy/agents/` 3 个子代理定义（勿删） |
| 生图能力 | ⚠️ 本机 `D:\ComfyUI` 就绪（FLUX.2 Klein 4B FP8 已装），但**仓库内 `studio/` 生图线已在本次整理中删除** |
| 编译可行性 | ❌ **当前无法编译**——虚幻引擎与 C++ 生成工具均未安装 |

---

## 二、本机环境实测

由 `tools\check-env.ps1` 于 2026-10-13 实测：**通过 7 / 缺失 3**。

| 项 | 状态 | 实测值 |
|---|---|---|
| winget | ✅ | v1.29.380 |
| Git | ✅ | 2.53.0.windows.1 |
| Python | ✅ | 3.12.10 |
| GPU（NVIDIA） | ✅ | RTX 5060，8151 MiB，驱动 610.74 |
| 磁盘 D: | ✅ | 剩余 363.8 GB / 753.7 GB |
| ComfyUI | ✅ | `D:\ComfyUI` 就绪，FLUX.2 Klein 4B FP8 已装 |
| Epic Games Launcher | ✅ | **已安装** |
| 磁盘 C: | ✅ | 剩余 77.4 GB / 199.2 GB —— 实测需求约 10–15 GB，**够用，无需清理**（见 `GDD.md` §18.3） |
| 虚幻引擎 UE5 | ❌ | 未找到 `UnrealEditor.exe`；`D:\Epic Games\UE_5.8` 是 15.67 GB **未登记的下载残件**（Launcher 清单为空），需清除重装 |
| VS2022 生成工具（C++） | ❌ | 未找到 `vswhere.exe` |

---

## 三、目录实况

```
solstice/
├─ docs/        9 份文档：GDD（唯一真源）/ CARDS（卡片设定集）/ DESIGN / STORY / ART-STYLE / STRUCTURE / ENV / VSCODE / SYNC
├─ tools/       9 个 PowerShell 环境与构建脚本 + README.md
├─ game/        UE 工程占位目录 —— 目前仅有被忽略的本地缓存
├─ .vscode/     构建任务 / 调试 / cpptools / 代码片段 / 工作区文件
└─ .codebuddy/  agents/ 子代理定义（项目数据，勿删）
```

**2026-10-13 整理中删除的内容**（仍可从 git 历史取回）：

- `app/` —— 更早形态的 WebGL 运行时
- `studio/` —— 更早形态的生图线与素材
- `shared/` —— 更早形态的 JSON 契约
- `docs/archive/`、`docs/PROPOSALS.md`
- `.codebuddy/rules/solstice-core|solstice-workflow` —— 描述已作废形态的旧规则

---

## 四、文档索引（含状态标注）

| 文档 | 状态 | 说明 |
|---|---|---|
| [`docs/GDD.md`](docs/GDD.md) | ✅ **唯一真源** | 立项需求与设计真源 **v6.0**（立项已定稿 · 设计细化到规格级） |
| [`docs/CARDS.md`](docs/CARDS.md) | ✅ **子系统真源** | 卡片设定集：卡结构 / 七元素 / 11 级 / 三卡类 / 十二类 / 卡型 / 生克 / 禁物 / 卡包（与 GDD §10 同源） |
| `docs/DESIGN.md` | ❌ 已作废 | v3.0《至日·岁局》自走棋卡牌；仅留作沿革记录 |
| `docs/STORY.md` | ❌ 已作废 | 四时界世界观 |
| `docs/ART-STYLE.md` | ⚠️ 部分作废 | 卡面版式全废；墨线 + 平涂 + 纸颗粒部分可继承 |
| `docs/STRUCTURE.md` | ✅ 可用 | 目录与命名规则；其中「三分法」需按新形态重审 |
| `docs/ENV.md` | ✅ 可用 | 开发环境搭建（VSCode + 引擎 C++） |
| `docs/VSCODE.md` | ✅ 可用 | VSCode 配置细节 |
| `docs/SYNC.md` | ✅ 可用 | 双机 git 同步约定 |

> `tools/` 下的脚本按工程名 `Solstice` / 目标 `SolsticeEditor` 编写。**项目名已锁定为 `Solstice`**（中文名可后补，见 `GDD.md` §21），这批脚本与存档键前缀**无需改名**。

---

## 五、环境补齐（需用户主动执行）

```powershell
# 只读体检：看清缺什么
powershell -ExecutionPolicy Bypass -File tools\check-env.ps1

# 安装 VS2022 生成工具 + "使用 C++ 的桌面开发"
#   winget 默认装 C 盘；C 盘紧张时可用官方 bootstrapper 指定 --installPath D:\VS2022
powershell -ExecutionPolicy Bypass -File tools\install-vs-buildtools.ps1

# Epic Games Launcher 已安装（无需再跑 install-epic-launcher.ps1）
```

**磁盘与引擎现状（2026-10-14 只读核查）**

- **不需要清理 C 盘**：C 盘 77.4 GB / D 盘 354.3 GB。引擎、着色器缓存、工程全可落 D 盘；只有 Windows SDK（`C:\Program Files (x86)\Windows Kits\10`，约 5–10 GB，**安装器不提供改路径选项**）与少量系统组件必须留在 C 盘，实际需求约 10–15 GB。`check-env.ps1` 里的 120 GB 只是脚本保守阈值，不是实测需求。
- **需先处理引擎残件**：`D:\Epic Games\UE_5.8` 占 15.67 GB，但里面只有 `.egstore`（`bps` 下载分块 + `Pending` + `.lock`），**没有 `Engine/`、没有 `UnrealEditor.exe`**；Epic Launcher 的引擎清单为空、`Manifests` 目录 0 个文件——即上次中断下载留下的孤儿暂存，**不可靠地续装，建议删除后重装**。
- **缓存外置**：设置环境变量 `UE-LocalDataCachePath=D:\UE-DDC`，把 UE 共享 DDC 移出 `%LOCALAPPDATA%`（当前确认为未设置）。

完整前置条件见 [`GDD.md`](docs/GDD.md) §18.3，里程碑切分见 §18.1，执行计划见 §20。

引擎与生成工具就绪后（**前提是工程骨架已存在**）：

```powershell
powershell -ExecutionPolicy Bypass -File tools\configure-vscode.ps1   # 写入引擎路径到 .vscode
powershell -ExecutionPolicy Bypass -File tools\gen-projectfiles.ps1   # 生成 Solstice.sln
powershell -ExecutionPolicy Bypass -File tools\build.ps1              # 编译
powershell -ExecutionPolicy Bypass -File tools\launch-editor.ps1      # 启动编辑器
```

VSCode 中 `Ctrl+Shift+B` 运行构建任务，`F5` 用 `cppvsdbg` 调试。

---

## 六、协作约定

- **提交信息**：英文、简短祈使句。
- **AI 主力开发 + 用户节点裁决**：用户只在立项 / 审美 / 数值走向处拍板。
- **逻辑在 C++、表现层在蓝图**：确定性内核（模拟 / 时间 / 存档）不得依赖蓝图；凡可代码化或脚本化的环节默认由 AI 完成，编辑器只留不可脚本化的可视化决策（详见 `GDD.md` §17.2）。
- **文档先行**：接口或规格变化先改文档再改代码。
- **双机同步**：git 唯一真源 + 计划任务定时 pull/push（见 `docs/SYNC.md`）。
- **素材合规**：AI 生成素材逐张留档（模型版本 / prompt / 种子 / 日期），并遵守 Steam AI 内容披露要求。

---

## 七、形态沿革（供重定时避免重复推翻）

1. 「会活着的」Windows 动态壁纸（Tauri 2 + WebGL2，`app/` + `studio/` + `shared/` 三分法）
2. 「一切皆元素」的场景引擎（参数化地形，运行时零 AI）
3. 《牌语四季》收集卡（`card` / `combos` schema）
4. 宝可梦式精灵收集 —— **已否决**
5. 《至日 · 岁局》单机肉鸽自走棋卡牌（虚幻引擎 5 + C++）—— 降级为参考
6. **当前：纸雕微缩（全 3D）的永续幻想生态界 —— 立项已定稿**，见 [`docs/GDD.md`](docs/GDD.md)
