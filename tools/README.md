# tools/ — 开发环境脚本

《至日 · 岁局》的环境检测、安装、工程生成与构建脚本。全部为 PowerShell，兼容 Windows PowerShell 5.1 与 PowerShell 7+。

> **保存编码**：脚本含中文注释/输出，PS 5.1 下请以 **UTF-8 with BOM** 保存。

## 脚本清单

| 脚本 | 用途 | 前置 | 示例 |
|---|---|---|---|
| `check-env.ps1` | 只读体检：winget / Git / Python / GPU / 磁盘 / ComfyUI / Epic Launcher / UE / VS2022 | 无 | `powershell -ExecutionPolicy Bypass -File tools\check-env.ps1` |
| `find-ue.ps1` | 探测引擎安装路径与版本；导出可复用函数 `Find-UnrealEngine` | 无 | `... -File tools\find-ue.ps1 -All` |
| `install-epic-launcher.ps1` | winget 安装 Epic Games Launcher | winget；**用户主动执行** | `... -File tools\install-epic-launcher.ps1 -DryRun` |
| `install-vs-buildtools.ps1` | winget 安装 VS2022 生成工具 + C++ 负载（约 15–20GB） | winget；**用户主动执行** | `... -File tools\install-vs-buildtools.ps1 -DryRun` |
| `configure-vscode.ps1` | 把引擎真实路径写入 `.vscode/*.json`（替换 `__UE_ENGINE_ROOT__`） | 已装引擎（否则降级） | `... -File tools\configure-vscode.ps1` |
| `gen-projectfiles.ps1` | 生成 `Solstice.sln`（cpptools）或 `compile_commands.json`（clangd） | 已装引擎 | `... -File tools\gen-projectfiles.ps1 -Mode Solution` |
| `build.ps1` | 调用 `Build.bat` 编译目标，透传退出码 | 引擎 + VS2022 生成工具 | `... -File tools\build.ps1 -Target SolsticeEditor` |
| `gen-assets.ps1` | **生成内容**：跑 `-run=SolsticeGenAssets` 写出 `/Game/Core/M_Paper` 与 `M_Ink`。幂等，已存在则跳过 | 已编译 `SolsticeEditor` | `... -File tools\gen-assets.ps1` |
| `bench.ps1` | **无头确定性回归**：跑 `-run=SolsticeBench`，同种子跑两遍比对世界摘要；不一致即退出码 1 | 已编译 `SolsticeEditor` | `... -File tools\bench.ps1 -Days 2` |
| `launch-editor.ps1` | 启动虚幻编辑器打开工程 | 已装引擎 | `... -File tools\launch-editor.ps1` |
| `vscode-extensions.ps1` | VSCode 扩展体检 / 安装推荐 / 卸载无关（默认只读） | VSCode CLI | `... -File tools\vscode-extensions.ps1 -InstallRecommended` |

## 推荐顺序

**首次搭环境**（本机已完成，换机才需要重跑）：

```
check-env.ps1
  → install-epic-launcher.ps1（用户执行）
  → 【人工登录 Epic】→ Launcher 内安装 UE
  → install-vs-buildtools.ps1（用户执行）
  → 补 .NET Framework 4.6.2 SDK（见 docs/ops/ENV.md §1.3）
  → check-env.ps1（复检全绿）
  → configure-vscode.ps1
  → gen-projectfiles.ps1 -Mode Solution
  → build.ps1
  → launch-editor.ps1
```

**日常 / 新克隆的最小闭环**（前三步缺一不可）：

```
find-ue.ps1          # 确认引擎在（找不到就什么都做不了）
  → gen-projectfiles.ps1 -Mode Solution
  → build.ps1
  → gen-assets.ps1   # 生成两个纸材质主材质，否则界面退化到引擎调试材质
  → bench.ps1 -Days 2   # 确认模拟仍然确定
```

> 内容生成与基准都走 `UnrealEditor-Cmd.exe`（无窗口）。它们依赖 `SolsticeEditor` 模块被加载，
> 因此该模块在 `.uproject` 里的 `LoadingPhase` 必须是 `Default` —— 原因见 `docs/ops/ENV.md` §2.6 第 9 条。

## 约定

- 全部脚本**幂等**，可反复运行。
- **不强制要求管理员**；仅在必要时提示。
- **安装类脚本不会被其它脚本自动调用**，只能由用户主动发起。
- 所有路径均可通过参数覆盖；默认值基于本机已核实事实（`D:\ComfyUI`、`D:\UE` 等）。
