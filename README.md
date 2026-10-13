# 至日 · 岁局（Solstice: Yearbound）

> **当前状态：立项重定中（2026-10-13）。**
> 项目形态尚未重新确定：`docs/DESIGN.md` 的 v3.0《至日·岁局》以及更早的每一版形态，**均已降级为参考稿**，不再作为唯一真源。
> 本仓库当前**只有文档与开发环境脚本，没有任何游戏代码**——`game/` 里连一个 `.uproject` 都没有。

---

## 一、仓库真实状态（逐项核对，非规划）

| 项 | 真实情况 |
|---|---|
| 游戏代码 | ❌ **无**。`game/` 下仅有本地 `DerivedDataCache/`（已被 `.gitignore` 忽略，不入库）；**无 `Solstice.uproject`、无 `Source/`** |
| 工程 / 解决方案 | ❌ 无 `Solstice.sln`、无 `compile_commands.json`（需引擎就绪后由脚本生成） |
| 文档 | ✅ `docs/` 共 7 份（见 §四） |
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
| 磁盘 C: | ⚠️ | 剩余 77.7 GB / 199.2 GB —— UE + VS + 工程缓存约需 120 GB，**空间不足** |
| 虚幻引擎 UE5 | ❌ | 未找到 `UnrealEditor.exe` |
| VS2022 生成工具（C++） | ❌ | 未找到 `vswhere.exe` |

---

## 三、目录实况

```
solstice/
├─ docs/        7 份文档：DESIGN / STORY / ART-STYLE / STRUCTURE / ENV / VSCODE / SYNC
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
| `docs/DESIGN.md` | ⚠️ **参考** | v3.0《至日·岁局》；随本次重定降级为参考 |
| `docs/STORY.md` | ⚠️ 参考 | 旧世界观（四时界） |
| `docs/ART-STYLE.md` | ⚠️ 参考 | 旧风格锚 C1「纸墨卡通」 |
| `docs/STRUCTURE.md` | ✅ 可用 | 目录与命名规则；其中「三分法」需按新形态重审 |
| `docs/ENV.md` | ✅ 可用 | 开发环境搭建（VSCode + 引擎 C++） |
| `docs/VSCODE.md` | ✅ 可用 | VSCode 配置细节 |
| `docs/SYNC.md` | ✅ 可用 | 双机 git 同步约定 |

> `tools/` 下的脚本按工程名 `Solstice` / 目标 `SolsticeEditor` 编写。新形态定案后若改名，这批脚本需同步调整。

---

## 五、环境补齐（需用户主动执行）

```powershell
# 只读体检：看清缺什么
powershell -ExecutionPolicy Bypass -File tools\check-env.ps1

# 安装 VS2022 生成工具 + "使用 C++ 的桌面开发"（约 15–20GB）
powershell -ExecutionPolicy Bypass -File tools\install-vs-buildtools.ps1

# Epic Games Launcher 已安装（无需再跑 install-epic-launcher.ps1）
#   → 人工登录 Epic 账号 → Launcher 内安装虚幻引擎最新稳定版到 D:\UE\UE_5.x
```

**待解决**：C 盘剩余空间不足（UE + VS 约需 120GB，对照见 `docs/ENV.md`）。

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
- **文档先行**：接口或规格变化先改文档再改代码。
- **双机同步**：git 唯一真源 + 计划任务定时 pull/push（见 `docs/SYNC.md`）。
- **素材合规**：AI 生成素材逐张留档（模型版本 / prompt / 种子 / 日期），并遵守 Steam AI 内容披露要求。

---

## 七、形态沿革（供重定时避免重复推翻）

1. 「会活着的」Windows 动态壁纸（Tauri 2 + WebGL2，`app/` + `studio/` + `shared/` 三分法）
2. 「一切皆元素」的场景引擎（参数化地形，运行时零 AI）
3. 《牌语四季》收集卡（`card` / `combos` schema）
4. 宝可梦式精灵收集 —— **已否决**
5. 《至日 · 岁局》单机肉鸽自走棋卡牌（虚幻引擎 5 + C++）—— **本次降级为参考**
6. **当前：立项重定中**
