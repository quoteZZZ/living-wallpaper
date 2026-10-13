# 开发环境搭建（ENV）

> 真源：`docs/DESIGN.md` v3.0 §8/§12。本文件只描述**环境与工具链**，不重复设计规格。
>
> **本机已核实事实**：Windows / PowerShell（用户 `Administrator`）· `winget` 可用 · Python 3.12.10 ·
> GPU NVIDIA RTX 5060 8GB（Blackwell sm_120，驱动 610.74）· D 盘剩余约 370GB ·
> 本地生图 ComfyUI 便携版在 `D:\ComfyUI`（torch 2.14.0+cu130，已支持 sm_120）。
>
> **尚未安装**：Epic Games Launcher 与虚幻引擎。

---

## 1. 安装顺序与体积预期

| 步骤 | 操作 | 体积 | 耗时 | 谁来做 |
|---|---|---|---|---|
| 1 | `tools\install-epic-launcher.ps1` | ~1GB | 几分钟 | **用户执行脚本** |
| 2 | 打开 Launcher **登录 Epic 账号** | — | 几分钟 | **必须人工**（不可脚本化） |
| 3 | Launcher 内安装**虚幻引擎最新稳定版**（建议 `D:\UE\UE_5.x`） | 30–60GB | 30–90 分钟 | **必须 GUI** |
| 4 | `tools\install-vs-buildtools.ps1`（VS2022 生成工具 + C++ 负载） | 15–20GB | 20–60 分钟 | **用户执行脚本** |
| 5 | `tools\check-env.ps1` 复检 | — | 秒级 | AI / 用户 |
| 6 | `tools\configure-vscode.ps1` 写入引擎路径 | — | 秒级 | AI / 用户 |
| 7 | `tools\gen-projectfiles.ps1` 生成工程文件 | — | 1–3 分钟 | AI / 用户 |
| 8 | VSCode 打开 `.vscode\solstice.code-workspace` | — | — | 用户 |

**磁盘预算**：UE(60GB) + VS(20GB) + 工程 `Intermediate`/`DerivedDataCache`(20–40GB) ≈ **100–120GB**；D 盘 370GB 充足。

### AI 能做 / 用户必须做

- **AI 能做**：全部 C++ 与配置、所有脚本、文档、生图线、跑体检/工程生成/编译。
- **用户必须做**：① 批准并运行 winget 安装；② **手动登录 Epic 账号**；③ 在 Launcher GUI 里选 UE 版本/路径/组件；④ 在 UE 编辑器里连蓝图（薄表现层）。

---

## 2. 用 VSCode 开发虚幻 C++ —— 完整方案

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

---

## 3. 本地生图环境（已就绪，无需额外下载）

| 项 | 值 |
|---|---|
| 根目录 | `D:\ComfyUI`（便携版，`python_embeded` + `run_nvidia_gpu.bat`） |
| 服务 | `http://127.0.0.1:8188`，健康探针 `/system_stats` |
| 扩散模型 | `models\diffusion_models\flux-2-klein-4b-fp8.safetensors`（3.79GB） |
| 文本编码器 | `models\text_encoders\qwen_3_4b.safetensors`（7.49GB，`CLIPLoader type=flux2`） |
| VAE | `models\vae\flux2-vae.safetensors` |
| 超分 | `models\upscale_models\RealESRGAN_x2plus.pth`（**x2**，非 x4） |
| 实测可用参数 | `steps=4` `cfg=1.0` `sampler=euler` + `Flux2Scheduler` |

> 详细调用方式与脚本见 `studio/README.md`。**CFG=1 时负向串不参与采样**（走 zero-out），仅作留档。

---

## 3.1 VSCode 工作区配置

`.vscode/` 下的全部配置（settings / extensions / tasks / launch / c_cpp_properties / code-workspace / code-snippets）
以及根目录的 `.editorconfig`、`.clang-format` 已经就绪，**逐项说明见 [`VSCODE.md`](./VSCODE.md)**。

扩展清单的唯一真源是 `.vscode/extensions.json`；用 `tools\vscode-extensions.ps1` 做体检与增删：

```powershell
powershell -ExecutionPolicy Bypass -File tools\vscode-extensions.ps1                    # 只读体检
powershell -ExecutionPolicy Bypass -File tools\vscode-extensions.ps1 -InstallRecommended
powershell -ExecutionPolicy Bypass -File tools\vscode-extensions.ps1 -RemoveUnwanted    # 预览
```

> ⚠ **PowerShell 脚本必须为 UTF-8 with BOM**：PowerShell 5.1 会把无 BOM 的 UTF-8 当 ANSI 解析，含中文的脚本会直接语法报错。
> `.editorconfig` 已对 `[*.ps1]` 强制 `charset = utf-8-bom`；新建脚本时 VSCode 会自动带上 BOM。

---

## 4. 速查命令

```powershell
powershell -ExecutionPolicy Bypass -File tools\check-env.ps1
powershell -ExecutionPolicy Bypass -File tools\find-ue.ps1 -All
powershell -ExecutionPolicy Bypass -File tools\configure-vscode.ps1
powershell -ExecutionPolicy Bypass -File tools\gen-projectfiles.ps1 -Mode Solution
powershell -ExecutionPolicy Bypass -File tools\build.ps1
powershell -ExecutionPolicy Bypass -File tools\launch-editor.ps1
```
