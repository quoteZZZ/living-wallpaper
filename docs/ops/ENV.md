---
id: ops/ENV
title: 开发环境搭建
version: 2.2
date: 2026-10-17
status: active
truth: nav
owner: both
---

# 开发环境搭建（ENV）

> 本文件只描述**环境与工具链**（装什么、装在哪、实测结果），不重复设计规格；规格真源见 [`../charter/GDD.md`](../charter/GDD.md)，前置条件与磁盘结论见 [`../plan/ROADMAP.md`](../plan/ROADMAP.md) §3。
>
> **本机已核实事实**：Windows 11 (25H2) / PowerShell（用户 `Administrator`）· `winget` 可用 · Python 3.12.10 ·
> CPU Intel i5-12600KF（10 物理核 / 16 逻辑核）· 内存 32GB · GPU NVIDIA RTX 5060 8GB（Blackwell sm_120，驱动 610.74）· D 盘剩余约 370GB ·
> 本地生图 ComfyUI 便携版在 `D:\ComfyUI`（torch 2.14.0+cu130，已支持 sm_120）。
>
> **安装现状**（2026-10-16 实测）：**Epic Games Launcher ✅**；**虚幻引擎 ✅ 5.8.3**（`D:\Epic Games\UE_5.8`，已登记，`UnrealEditor.exe` 与全套引擎源码就位）；**VS2022 生成工具 ✅**（`D:\VS2022`，MSVC 14.44.35207 + Windows SDK 10.0.22621.0）；**.NET Framework 4.6.2 SDK ✅**（原本缺失，已从官方 VS 渠道清单提取并部署到 `D:\_toolchain\AutoSDK\…`，见 §1.3）。
> **M0 两个目标均已编译通过并实测运行**（`SolsticeEditor` / `Solstice`）。编译时**必须加 `-NoUBA`**，见 §2.4。

---

## 1 安装顺序与体积预期

| 步骤 | 操作 | 体积 | 耗时 | 谁来做 | 状态 |
|---|---|---|---|---|---|
| 1 | `tools\install-epic-launcher.ps1` | ~1GB | 几分钟 | 用户执行脚本 | ✅ **已完成，无需再跑** |
| 2 | 打开 Launcher **登录 Epic 账号** | — | 几分钟 | **必须人工**（不可脚本化） | ✅ 已登录 |
| 3 | Launcher 内安装**虚幻引擎**（实际落在 `D:\Epic Games\UE_5.8`） | 30–60GB | 30–90 分钟 | **必须 GUI** | ✅ **5.8.3 已装** |
| 4 | `tools\install-vs-buildtools.ps1`（VS2022 生成工具 + C++ 负载，实际在 `D:\VS2022`） | 15–20GB | 20–60 分钟 | **用户执行脚本** | ✅ **已装**（MSVC 14.44.35207 + SDK 10.0.22621.0） |
| 4b | **.NET Framework 4.6.2 SDK**（`SwarmInterface.Build.cs` 硬要求） | ~5MB | 秒级 | AI（见 §1.3） | ✅ **已补齐** |
| 5 | `tools\check-env.ps1` 复检 | — | 秒级 | AI / 用户 | ✅ |
| 6 | `tools\configure-vscode.ps1` 写入引擎路径 | — | 秒级 | AI / 用户 | ✅ |
| 7 | `tools\gen-projectfiles.ps1` 生成工程文件 | — | 1–3 分钟 | AI / 用户 | ✅ |
| 8 | `tools\build.ps1` 编译 | — | 1–10 分钟 | AI / 用户 | ✅ 两个目标均通过 |
| 9 | `tools\gen-assets.ps1` 生成内容（新克隆必跑） | — | 约 10 秒 | AI / 用户 | ✅ |
| 10 | `tools\bench.ps1` 无头确定性回归 | — | 约 10 秒 | AI / 用户 | ✅ |
| 11 | VSCode 打开 `.vscode\solstice.code-workspace` | — | — | 用户 | — |

### 1.1 本机实测（`tools\check-env.ps1`，2026-10-13 首测 / 2026-10-14 复核 / 2026-10-16 工具链复核）

| 项 | 状态 | 实测值 |
|---|---|---|
| winget | ✅ | v1.29.380 |
| Git | ✅ | 2.53.0.windows.1 |
| Python | ✅ | 3.12.10 |
| CPU / 内存 | ✅ | i5-12600KF（10 物理核 / 16 逻辑核）/ 31.84 GB |
| GPU（NVIDIA） | ✅ | RTX 5060，8151 MiB，驱动 610.74 |
| 磁盘 D: | ✅ | 剩余充足 —— **不需要清理 C 盘** |
| 磁盘 C: | ⚠ | 剩余 77.4 GB；实际需求约 10–15 GB（`check-env.ps1` 的 120 GB 是保守阈值） |
| ComfyUI | ✅ | `D:\ComfyUI` 就绪，FLUX.2 Klein 4B FP8 已装 |
| Epic Games Launcher | ✅ | 已安装 |
| 虚幻引擎 UE5 | ✅ | **5.8.3**（CL 58210709），`D:\Epic Games\UE_5.8`，`UnrealEditor.exe` 就位 |
| VS2022 生成工具（C++） | ✅ | `D:\VS2022`，MSVC 14.44.35207 + Windows SDK 10.0.22621.0 |
| .NET Framework 4.6.2 SDK | ✅ | 见 §1.3（原本缺失，是 UBT 的唯一硬阻塞） |
| 平台 SDK（引擎侧） | ⚠ | 仅 Win64 有效；`-Mode=ValidatePlatforms` 报 Mac / IOS / Android / Linux / TVOS / VisionOS 缺失——**M0 只发行 Windows，可忽略** |

**磁盘预算**：UE(60GB) + VS(20GB) + 工程 `Intermediate`/`DerivedDataCache`(20–40GB) ≈ **100–120GB**；D 盘充足。

### 1.3 `.NET Framework 4.6.2 SDK`（**必须补，否则编不过**）

`SwarmInterface.Build.cs` 无条件要求 `NetFxSdkDir`，它会去找 `Include/um/metahost.h` 与 `Lib/um/x64/mscoree.lib`。
本机原本**三处都没有**（`Program Files (x86)`、`Program Files`、`D:\VS2022`），注册表 `HKLM\SOFTWARE\Microsoft\Microsoft SDKs\NETFXSDK` 也不存在 —— 于是 UBT 直接抛
`Unable to instantiate module 'SwarmInterface': Could not find NetFxSDK install dir`。**这和 C++ 工作负载装没装无关。**

补法（无需管理员、无需重装 VS）：

1. 从**本机已有的 VS 渠道清单**取下载地址：`C:\ProgramData\Microsoft\VisualStudio\Packages\_Instances\<id>\catalog.json`（一万九千余条，含每个包的 URL 与 SHA256）。
2. 取 `Microsoft.Net.Component.4.6.2.SDK` → 其 chained 包 `Microsoft.Net.4.6.2.SDK`（一个 `.msi` + 一个 `.cab`），**校验大小与 SHA256 与清单逐字节一致**。
3. `msiexec /a` 解包到 `D:\_toolchain\netfx\extract`，把 `NETFXSDK/4.6.2` 部署到 `D:\_toolchain\AutoSDK\HostWin64\Win64\Windows Kits\NETFXSDK\4.6.2`。
4. 注册 `KitsInstallationFolder` 指向它 —— 写 `HKLM:\SOFTWARE\WOW6432Node\Microsoft\Microsoft SDKs\NETFXSDK\4.6.2`（另加 `HKCU` 一份更保险）。
   `MicrosoftPlatformSDK.TryReadDirRegistryKey`（`MicrosoftPlatformSDK.cs:477`）**只读字符串、不校验目录是否存在**，所以只要能读出路径即可。

> 也可让 `MicrosoftPlatformSDK` 走 `UE_SDKS_ROOT` 分支（`AutoSDK\Host<Platform>\Win64\Windows Kits\NETFXSDK\<ver>`）——两种方式本机都验证过，AutoSDK 那份即第 3 步落地的目录。
>
> `reg.exe` 若被安全策略拦截，用 PowerShell 的 `New-ItemProperty`（注册表）替代。

### 1.2 AI 能做 / 用户必须做

- **AI 能做**：全部 C++ 与配置、所有脚本、文档、生图线、跑体检/工程生成/编译。
- **用户必须做**：① 批准并运行安装脚本；② **手动登录 Epic 账号**；③ 在 Launcher GUI 里选 UE 版本/路径/组件；④ 在 UE 编辑器里连蓝图（薄表现层）。职责边界见 [`WORKFLOW.md`](WORKFLOW.md) §1。

---

## 2 用 VSCode 开发虚幻 C++ —— 完整方案

### 2.1 为什么可行

UE 内置 **`VSCodeSourceCodeAccess`** 插件。启用后，在编辑器里双击 C++ 文件会直接用 VSCode 打开。
配置：**Editor Preferences → Source Code → Source Code Editor = Visual Studio Code**（下拉里没有就先在 Plugins 里启用 `VSCodeSourceCodeAccess`）。

### 2.2 IntelliSense 两条路线（二选一，不可同时启用）

| | 路线 A（推荐） | 路线 B |
|---|---|---|
| 扩展 | `ms-vscode.cpptools` | `llvm-vs-code-extensions.vscode-clangd` |
| 输入 | `Solstice.sln` | `compile_commands.json` |
| 生成 | `gen-projectfiles.ps1 -Mode Solution` | `gen-projectfiles.ps1 -Mode ClangDb` |
| 优点 | 与 `cppvsdbg` 调试器同源、零额外依赖 | 索引快、跳转准、补全质量高 |
| 缺点 | 大工程索引较慢 | 首次全量索引**吃系统内存**（UE 源码可能数 GB） |

**结论**：M0 用**路线 A**。若补全明显拖慢，再切路线 B（切换时须设 `"C_Cpp.intelliSenseEngine": "disabled"`）。
> 注意：8GB 是**显存**，与系统内存是两回事；若系统内存同样紧张，一律留在路线 A。

### 2.3 调试（`cppvsdbg`）

`cppvsdbg` 是 VS 调试引擎，**要求 VS2022 生成工具已安装**。两种配置（见 `.vscode/launch.json`）：
- **attach**：先手动启动 `UnrealEditor.exe`，再 Attach。日常开发首选（编辑器常驻）。
- **launch**：由 VSCode 直接拉起 `UnrealEditor.exe <uproject> -game -log`。

### 2.4 构建：Live Coding vs 命令行全量重编

| 场景 | 方式 |
|---|---|
| 只改 `.cpp` 内部实现 | **Live Coding**（编辑器内 `Ctrl+Alt+F11`）热补丁 |
| 改头文件接口 / `UCLASS`·`USTRUCT`·`UENUM` 反射宏 / 增删类或成员 | **必须关编辑器**，走 `tools\build.ps1` 全量重编 |
| 新增模块 / 改 `.Build.cs` / 改 Target | 关编辑器 → 重跑 `gen-projectfiles.ps1` → `build.ps1` |
| 改 `.uproject` 的模块 `LoadingPhase` | 重跑 `build.ps1`（重建 target receipt），否则运行时仍按旧清单加载 |

#### 2.4.1 本机必须加 `-NoUBA`（否则编不过）

**本机 UBA（Unreal Build Accelerator，UE5.6+ 默认开启）会失败**，症状是每个临时文件改名/删除都报：

```text
SetFileInformationByHandle (FileDispositionInfo) failed on <pid> ... (Access is denied.)
fatal error C1083: 无法打开预编译头文件 "...h.pch": 拒绝访问
```

**已在沙箱内外各复现一次**，说明不是 agent 策略；Windows Defender 实时防护开着，无第三方杀软，目录 ACL 也是 FullControl —— 就是 UBA 的文件系统 detour 在本机环境下的问题。

**绕过**：给 UnrealBuildTool 加 `-NoUBA`。这是 UBT 的正式开关（`BuildConfiguration.cs:54`
`[CommandLine("-NoUBA", Value = "false")] bAllowUBAExecutor`），加上之后每个编译动作都以 `[NoUba]` 执行，access-denied 一次性消失（实测从 25+ 个降到 0）。
`tools\build.ps1` 若在**本机**跑不通，用下面的直调方式（注意 `-NoUBA`）：

```bash
"<引擎>\Engine\Binaries\ThirdParty\DotNet\10.0\win-x64\dotnet.exe" \
  "<引擎>\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.dll" \
  SolsticeEditor Win64 Development -Project="<仓库>\game\Solstice.uproject" -NoUBA -WaitMutex
```

**注意不要直接跑 `UnrealBuildTool.exe`**：本机只装了 .NET 8/9，而 UBT 要 .NET 10，直接执行会以 `EXIT=150` 退出。用引擎自带的那份 `dotnet.exe`（上例）才正常。

> `tools\gen-projectfiles.ps1` 已内置该逻辑：自动探测 `Engine\Binaries\ThirdParty\DotNet\<ver>\win-x64\dotnet.exe`（版本目录倒序取最高）并用它运行 `UnrealBuildTool.dll`，工作目录设为 `Engine\Source`（与 `Build.bat` 一致）；探测不到才回退 `.exe` 直调。故**生成工程文件无需手动直调**（2026-10-17 实测：`-Mode Solution` 正常产出 `game\Solstice.sln`）。`tools\build.ps1` 走 `Build.bat`，后者内部已 `call GetDotnetPath.bat` 设置自带 dotnet，不受此问题影响。

> 网络受限时记得清掉代理变量（`HTTPS_PROXY` 等）——直调 dotnet 不走代理，但引擎的下载器会读。本机若用 `curl` 走 https 还需 `--ssl-no-revoke`（schannel 吊销检查在本机失败）。

### 2.5 推荐 VSCode 扩展

| 扩展 ID | 用途 | 备注 |
|---|---|---|
| `ms-vscode.cpptools` | C++ IntelliSense + `cppvsdbg` | 必需（路线 A） |
| `llvm-vs-code-extensions.vscode-clangd` | clangd IntelliSense | 可选（路线 B，二选一） |
| `ms-vscode.powershell` | 编辑/运行 `tools/**.ps1` | 推荐 |
| `redhat.vscode-yaml` | 编辑 YAML | 推荐 |
| `EditorConfig.EditorConfig` | 统一缩进/换行/编码 | 推荐 |

> 未列入的扩展请自行在扩展市场核实 ID，避免填入不存在的扩展。

### 2.6 常见坑

1. **IntelliSense 报红但能编译**：多为引擎路径未写入或 `compile_commands.json` 未生成 → 跑 `configure-vscode.ps1` 与 `gen-projectfiles.ps1`。
2. **引擎路径变更**（换盘/重装）：重跑 `tools\configure-vscode.ps1`（覆盖 `__UE_ENGINE_ROOT__`）。
3. **UBT 缓存异常**：删 `game\Intermediate\` 与 `game\Binaries\` 后重编。
4. **缺 VS 组件**：参照引擎文档要求的组件列表，用 VS 安装器补齐（`.vsconfig`）。
5. **cpptools 与 clangd 冲突**：见 §2.2。
6. **PowerShell 5.1 中文乱码**：脚本以 **UTF-8 with BOM** 保存，用 `-ExecutionPolicy Bypass` 运行。
7. **`Unable to build while Live Coding is active`**：有残留的 `UnrealEditor.exe`（有时只是停在项目浏览器、没开工程）+ `LiveCodingConsole.exe` 占着互斥锁。先 `CloseMainWindow()` 优雅退出，再 `Stop-Process` 收掉 `LiveCodingConsole` / `UnrealTraceServer`。命令行编译前**一律先确认没有编辑器进程**。
8. **`Couldn't find target rules file for target 'SolsticeEditor' in rules assembly 'UE5Rules'`**：`.Target.cs` 放错位置。UE 5.8 的 `ProjectRulesAssembly` 只 glob `Source/*.Target.cs`，**放在工程根目录无效**。
9. **`-run=XxxCommandlet` 报 `looked like a commandlet, but we could not find the class`**：命令行类解析（`LaunchEngineLoop.cpp:3931`）发生在 `PostEngineInit` 阶段模块加载（同文件 `4861`）**之前**。所以承载 Commandlet 的模块 `LoadingPhase` 必须是 `Default`（在 `3896` 加载）。见 [`../tech/STRUCTURE.md`](../tech/STRUCTURE.md) §3。
10. **编辑器模块链接期 `LNK2019`（跨 DLL 符号未导出）**：`UnrealEditor-Solstice.dll` 与 `UnrealEditor-SolsticeEditor.dll` 是两个 DLL。运行模块里**凡是被编辑器模块引用的公共类型都要标 `SOLSTICE_API`**，否则 `.obj` 里有符号、`.lib` 里没有。M0 踩过两次（`FPaperMaterials`、`FSimKernel`/`FDataLoader`）。排查用 `dumpbin -symbols`（Git Bash 下必须用**短横线** `-symbols`，用 `/symbols` 会被路径转换吃掉）。
11. **无头日志里看不到自己的 `UE_LOG`**：`LogTemp` 会被过滤掉；且只加 `-stdout` 会丢尾部。正确做法是**定义项目自己的日志类别**（`SOLSTICE_API DECLARE_LOG_CATEGORY_EXTERN(LogSolstice, Log, All)` + `DEFINE_LOG_CATEGORY`）并同时用 `-abslog=<路径>` 落盘——`LogSolstice` 的行只在 abslog 文件里。
12. **静态变量持有 UObject 导致崩溃**：`FPaperMaterials` 这类普通 `static` 结构对 GC 是不可见的，里面缓存的 `UMaterialInstanceDynamic*` 会在下一次关卡加载时被回收，之后解引用就是 `EXCEPTION_ACCESS_VIOLATION reading 0xffffffffffffffff`（首次成功运行即踩到）。凡是交给外部的 UObject 都要 `AddToRoot()`。
13. **一个 UBT 未报的坑：编译期内存**。16 线程并行编 PCH + 31.84 GB 内存时出现过 `Killed process ... - Low on memory (44.2gb/45.1gb)`，重跑即通过。若反复出现，减少并行度。

---

## 3 本地生图环境（已就绪，无需额外下载）

| 项 | 值 |
|---|---|
| 根目录 | `D:\ComfyUI`（便携版，`python_embeded` + `run_nvidia_gpu.bat`） |
| 服务 | `http://127.0.0.1:8188`，健康探针 `/system_stats` |
| 扩散模型 | `models\diffusion_models\flux-2-klein-4b-fp8.safetensors`（3.79GB） |
| 文本编码器 | `models\text_encoders\qwen_3_4b.safetensors`（7.49GB，`CLIPLoader type=flux2`） |
| VAE | `models\vae\flux2-vae.safetensors` |
| 超分 | `models\upscale_models\RealESRGAN_x2plus.pth`（**x2**，非 x4） |
| 实测可用参数 | `steps=4` `cfg=1.0` `sampler=euler` + `Flux2Scheduler` |

> 调用方式、批次规范与 manifest 登记见 [`../art/ASSETS.md`](../art/ASSETS.md) §3。**CFG=1 时负向串不参与采样**（走 zero-out），仅作留档。

---

## 4 VSCode 工作区配置

`.vscode/` 下的全部配置（settings / extensions / tasks / launch / c_cpp_properties / code-workspace / code-snippets）
以及根目录的 `.editorconfig`、`.clang-format` 已经就绪，**逐项说明见 [`VSCODE.md`](VSCODE.md)**。

扩展清单的唯一真源是 `.vscode/extensions.json`；用 `tools\vscode-extensions.ps1` 做体检与增删：

```powershell
powershell -ExecutionPolicy Bypass -File tools\vscode-extensions.ps1                    # 只读体检
powershell -ExecutionPolicy Bypass -File tools\vscode-extensions.ps1 -InstallRecommended
powershell -ExecutionPolicy Bypass -File tools\vscode-extensions.ps1 -RemoveUnwanted    # 预览
```

> ⚠ **PowerShell 脚本必须为 UTF-8 with BOM**：PowerShell 5.1 会把无 BOM 的 UTF-8 当 ANSI 解析，含中文的脚本会直接语法报错。
> `.editorconfig` 已对 `[*.ps1]` 强制 `charset = utf-8-bom`；新建脚本时 VSCode 会自动带上 BOM。

---

## 5 速查命令

```powershell
# 体检与环境
powershell -ExecutionPolicy Bypass -File tools\check-env.ps1
powershell -ExecutionPolicy Bypass -File tools\find-ue.ps1 -All
powershell -ExecutionPolicy Bypass -File tools\configure-vscode.ps1

# 工程与构建
powershell -ExecutionPolicy Bypass -File tools\gen-projectfiles.ps1 -Mode Solution
powershell -ExecutionPolicy Bypass -File tools\build.ps1
powershell -ExecutionPolicy Bypass -File tools\build.ps1 -Target Solstice

# 内容与回归（新克隆后按顺序各跑一次）
powershell -ExecutionPolicy Bypass -File tools\gen-assets.ps1
powershell -ExecutionPolicy Bypass -File tools\bench.ps1 -Days 2

# 提交钩子（每个克隆装一次；提交时自动跑 checks/ 两条自检）
powershell -ExecutionPolicy Bypass -File tools\install-hooks.ps1

# 起编辑器
powershell -ExecutionPolicy Bypass -File tools\launch-editor.ps1
```

**新克隆的最小闭环**：`find-ue` → `gen-projectfiles` → `build` → `gen-assets` → `bench`。
前两步没有就编不过，第三步没有就跑不到「纸材质已生成」的状态（会退化到引擎自带的 unlit 调试材质，界面仍能起，但纸雕配色不对）。

---

## 6 更新触发

| 改动类型 | 必须同次更新 |
|---|---|
| 新增 / 修改工具脚本 | 本文件 §1 / §5 + `tools/README.md` |
| 引擎或生成工具版本、安装路径变化 | 本文件顶部"安装现状"与 §1.1 + [`../plan/ROADMAP.md`](../plan/ROADMAP.md) §3 |
| 生图模型 / 采样参数变化 | 本文件 §3 + [`../art/ASSETS.md`](../art/ASSETS.md) §3 |
| VSCode 配置变化 | [`VSCODE.md`](VSCODE.md)（真源是 `.vscode/` 实文件） |

---

## 沿革

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0 | 2026-10-14 | 补统一文档头；真源指针从已作废的 `DESIGN.md` 改为 `charter/GDD.md`；Epic Launcher 状态更正为已安装 |
| 1.1 | 2026-10-14 | 迁入 `docs/ops/`；修正链接与 §3.1 层级错误（改为 §4）；生图调用说明移交 `art/ASSETS.md` |
| 1.2 | 2026-10-14 | 补 §1.1 本机实测表（从 `README.md` 迁入，含 C/D 盘与残件结论）；§1.2 分工小节补编号 |
| 2.0 | 2026-10-16 | 工具链落地：引擎 ✅ 5.8.3 / VS2022 ✅ / **新增 §1.3 `.NET Framework 4.6.2 SDK` 补法**；§1 / §1.1 状态据实改写；**新增 §2.4.1 `-NoUBA` 必加**与 `UnrealBuildTool.exe` 直调会 `EXIT=150` 的说明；§2.6 常见坑扩充至 13 条（Live Coding 互斥、`.Target.cs` 位置、`LoadingPhase` 与 `-run=` 顺序、`SOLSTICE_API` 跨 DLL、`LogTemp` 被过滤、静态持有 UObject 的 GC 崩溃）；§5 补内容生成与回归命令 |
| 2.1 | 2026-10-16 | §5 补提交钩子安装命令 `install-hooks.ps1`（自检自动执行的本地闸门，另见 `tools/README.md`） |
| 2.2 | 2026-10-17 | §2.4.1 补：`tools\gen-projectfiles.ps1` 已自动改用引擎自带 dotnet 运行 `UnrealBuildTool.dll`（修复直调 `.exe` 在本机必然失败的问题，2026-10-17 实测通过）；`tools/README.md` 同步 |
