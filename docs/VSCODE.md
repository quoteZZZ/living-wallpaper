# VSCode 工作区配置说明（VSCODE）

> 面向《至日 · 岁局》的 VSCode 开发环境。**唯一真源是 `.vscode/` 下的实际文件**，本文档只做导航与说明。
> 相关：`docs/ENV.md`（引擎与工具链安装）、`.editorconfig`（跨编辑器编码规范）、`.clang-format`（C++ 格式）。

---

## 1. 文件清单与职责

| 文件 | 作用 | 备注 |
|---|---|---|
| `.vscode/settings.json` | **主配置**：编码、缩进、排除规则、C++、PowerShell、终端、扩展调优 | 占位符 `__UE_ENGINE_ROOT__` 由脚本替换 |
| `.vscode/extensions.json` | **扩展清单唯一真源**：recommendations / unwantedRecommendations | 改这里即改推荐清单 |
| `.vscode/tasks.json` | 任务：构建、工程文件、环境体检、契约校验、生图、Git 同步 | `Ctrl+Shift+B` = 默认构建 |
| `.vscode/launch.json` | 调试：`cppvsdbg` attach/launch、PowerShell 脚本调试 | 需 VS2022 生成工具 |
| `.vscode/c_cpp_properties.json` | IntelliSense：includePath、宏定义、compileCommands | 同上有占位符 |
| `.vscode/solstice.code-workspace` | 工作区文件（单根 = 仓库根） | 见 §5；**不再重复声明 extensions**，见 §3.1 |
| `.vscode/solstice.code-snippets` | C++ 代码片段：`uclass` / `ustruct` / `ulenum` / `ulog` … | 输入前缀 + Tab 展开 |
| `.editorconfig` | 跨编辑器编码/换行/缩进；**ps1 强制 utf-8-bom** | 解决 PS 5.1 中文乱码 |
| `.clang-format` | C++ 格式化风格（UE 基调） | cpptools 内置 clang-format 使用 |
| `tools/vscode-extensions.ps1` | 扩展体检/安装/卸载 | 默认只读；支持多轮依赖卸载 |

---

## 2. 打开方式

**推荐**：`文件 → 打开工作区 → .vscode\solstice.code-workspace`

或直接打开文件夹 `d:\GitCode\solstice`（`.vscode/settings.json` 同样生效，效果一致）。

首次打开后建议按顺序执行（`Ctrl+Shift+P → Tasks: Run Task`）：

1. `环境: 体检` —— 确认工具链状态
2. `Solstice: 配置 VSCode (写入引擎路径)` —— 替换 `__UE_ENGINE_ROOT__`
3. `Solstice: 生成工程文件 (Solution / cpptools)` —— 产出 `game\Solstice.sln`
4. `Solstice: 构建 SolsticeEditor (Development)` —— `Ctrl+Shift+B` 亦可
5. `Solstice: 启动编辑器`

> UE 与 VS2022 未安装时，第 2–5 步会明确报错并给出补救提示（不会静默失败）。
> 契约校验（`shared/`）与生图（`studio/`）两组任务所依赖的目录**尚未落地**，现在运行会报「文件不存在」；
> 目录建立后即可直接使用，任务描述里已标注该前提。

---

## 3. 扩展：现状与处置

### 3.1 唯一真源与「不重复声明」

扩展清单只写在 `.vscode/extensions.json`。
`solstice.code-workspace` 里**刻意不再写 `extensions` 段**——工作区文件中的该段会与 `extensions.json` 叠加，
容易出现两份清单不一致（改了一处忘另一处）。扩展的一切增删请只改 `extensions.json`。

### 3.2 本机现状（2026-10-14 核实）

- VSCode **1.119.0**，CLI：`D:\Microsoft VS Code\bin\code.cmd`
- 已装扩展：**61 → 26 个**（2026-10-13 卸载 34 个无关扩展，见 §3.5；另清理 2 个其他 AI 助手，见 §3.6；2026-10-14 补装 `eamodio.gitlens`、新增 `jeff-hykin.better-cpp-syntax`）

### 3.3 保留并使用（26 个中的 21 个）

| 类别 | 扩展 | 为什么需要 |
|---|---|---|
| C++ / 引擎 | `ms-vscode.cpptools` | IntelliSense 与 `cppvsdbg` 调试的唯一来源 |
| | `ms-vscode.cpptools-themes` | C++ 语义着色主题 |
| 脚本 / 工程 | `ms-vscode.powershell` | `tools/` 下全部脚本 |
| | `editorconfig.editorconfig` | 统一编码/缩进/换行 |
| 界面语言 | `ms-ceintl.vscode-language-pack-zh-hans` | 代码、脚本、文档全中文，界面统一为简体中文 |
| 数据 / 文档 | `redhat.vscode-yaml` | YAML 校验与补全 |
| | `yzhang.markdown-all-in-one` | 文档表格/TOC/预览 |
| | `davidanson.vscode-markdownlint` | 文档规范 |
| | `bierner.markdown-mermaid` | 文档里的流程图 |
| 开发体验 | `usernamehw.errorlens` | C++ 报错直接显示在行尾 |
| | `jeff-hykin.better-cpp-syntax` | C++ 语法高亮增强——UE 反射宏密集的代码可读性明显更好（2026-10-14 补装） |
| | `gruntfuggly.todo-tree` | 汇总 TODO / FIXME / 待裁决点 |
| | `wayou.vscode-todo-highlight` | TODO 高亮（与 todo-tree 互补） |
| | `streetsidesoftware.code-spell-checker` | 中英拼写检查（已配 `cSpell.words`） |
| | `christian-kohler.path-intellisense` | 路径补全 |
| | `sleistner.vscode-fileutils` | 文件操作增强 |
| 版本控制 | `eamodio.gitlens` | git blame / 历史（双机同步场景有用） |
| | `mhutchie.git-graph` | 图形化 git 历史 |
| 素材 / 二进制 | `jock.svg` | SVG 预览 |
| | `ms-vscode.hexeditor` | 十六进制查看 `.uasset` 头部 |

### 3.4 已装但「按设计不启用」（1 个）

`llvm-vs-code-extensions.vscode-clangd` —— **路线 B 专用**，本机已安装。

- 当前走**路线 A**（`cpptools` + `Solstice.sln`），若 clangd 同时启用，两套引擎会**重复报错、重复高亮**。
- **处置（保持路线 A）**：扩展面板 → `llvm-vs-code-extensions.vscode-clangd` → 右键 → **Disable (Workspace)**。
- 彻底移除（推荐，卸掉后想用路线 B 再装）：
  ```powershell
  code --uninstall-extension llvm-vs-code-extensions.vscode-clangd
  ```
- 该扩展**刻意不写进 `extensions.json` 的任何一张清单**，以免被 `-RemoveUnwanted` 一并卸掉。

### 3.5 本轮已卸载（34 个，全局移除）

| 类别 | 扩展 |
|---|---|
| Java / Spring / Maven（12） | `redhat.java`、`vscjava.vscode-java-pack`、`-java-debug`、`-java-dependency`、`-java-test`、`-maven`、`-spring-boot-dashboard`、`-spring-initializr`、`vmware.vscode-spring-boot`、`vmware.vscode-boot-dev-pack`、`oracle.oracle-java`、`caolin.java-run` |
| 前端 Vue / JS / HTML / CSS（13） | `vue.volar`、`octref.vetur`、`hollowtree.vue-snippets`、`oysun.vuehelper`、`morningstart.vue3-snipptes`、`fallenmax.mithril-emmet`、`ecmel.vscode-html-css`、`ritwickdey.liveserver`、`techer.open-in-browser`、`formulahendry.auto-close-tag`、`formulahendry.auto-rename-tag`、`xabikos.javascriptsnippets`、`christian-kohler.npm-intellisense` |
| 前端工具链（4） | `dbaeumer.vscode-eslint`、`esbenp.prettier-vscode`、`rvest.vs-code-prettier-eslint`、`orta.vscode-jest` |
| 其他（5） | `mtxr.sqltools`、`johnstoncode.svn-scm`、`ms-azuretools.vscode-containers`、`formulahendry.code-runner`、`dotjoshjohnson.xml` |

> 这些扩展已从 `extensions.json` 的 `unwantedRecommendations` 中登记，抑制 VS Code 的推荐噪音。
> 若日后确实需要某个，重装即可（本文档保留了清单）。

### 3.6 个人工具（未登记，随你保留）

以下扩展与本项目无关也非必需，但属于个人工具，**未列入任何清单**（既不推荐也不抑制，脚本也不会动它们）：

`tencent-cloud.coding-copilot`（**本项目唯一的 AI 助手**）· `intellsmi.comment-translate` ·
`xiaodiyan.translator-helper` · `k--kato.intellij-idea-keybindings` · `orionunique.troll`

> **其他 AI 助手已清理（2026-10-13）**：卸载 `openai.chatgpt`、`openai.codex-audio`；
> 并从 VS Code 用户设置中移除残留死配置：`Lingma.*`（通义灵码）、`claudeCode.*`（Claude Code → MiniMax）、
> `codebot.*` / `codecheck.*`（华为 CodeArts）、`github.copilot.*`。
> **多套 AI 助手并存 = 多套「是否确认执行」机制互相叠加**，这才是「到处弹确认」的主要放大器，故只保留一个。
> CodeBuddy 自身的权限/自动运行配置见 §8。

### 3.7 扩展体检 / 增删

```powershell
# 只读体检：列出「已装推荐 / 缺失 / 无关」三类
powershell -ExecutionPolicy Bypass -File tools\vscode-extensions.ps1

# 安装缺失的推荐扩展
powershell -ExecutionPolicy Bypass -File tools\vscode-extensions.ps1 -InstallRecommended

# 预览要卸载的无关扩展（不执行）
powershell -ExecutionPolicy Bypass -File tools\vscode-extensions.ps1 -RemoveUnwanted

# 真正卸载（全局，会影响其它项目）
powershell -ExecutionPolicy Bypass -File tools\vscode-extensions.ps1 -RemoveUnwanted -Confirm
```

> **卸载会按依赖关系自动多轮重试**：扩展之间存在依赖（例：`vscjava.vscode-java-test` → `redhat.java`），
> 脚本会先卸依赖方、再卸被依赖方，最后报告仍无法卸载的残留项，不会因单个失败而中断整批。

### 3.8 UE 相关扩展候选核实（2026-10-14）

用 VSCode 市场 API 按 `unreal engine` / `unreal blueprint` / `uproject` / `unreal` / `ue5` 检索后的结论：

**① 事实前提**：VSCode **没有官方虚幻引擎扩展**，也**没有任何插件能操作蓝图编辑器**。
所以"尽量让 AI 开发"的杠杆在 CodeBuddy 的权限模式（§8），不在插件数量。

**② 已采纳**

| 扩展 | 安装量 | 判断 |
|---|---|---|
| `eamodio.gitlens` | — | 2026-10-14 补装；提交历史 / blame，双机同步场景有用 |
| `jeff-hykin.better-cpp-syntax` | 12.78M | 纯语法高亮，零风险；UE 反射宏密集的代码可读性明显更好 |

**③ 条件性候选（暂不安装）**

| 扩展 | 安装量 | 何时才值得装 |
|---|---|---|
| `NilsSoderman.ue-python` | 63.4k | 等 P3 真的用官方编辑器 Python 做资产批处理、且需要在 VSCode 里编辑/执行这些脚本时 |

**④ 明确不采纳**

| 扩展 | 安装量 | 原因 |
|---|---|---|
| `CAPTNCAPS.ue4-snippets` | 147.3k | UE4 时代，API 与语法已过期 |
| `openpixel.unreal-engine-4-helper` | 29.5k | 同上 |
| `WholeTomatoSoftware.VisualAssist` | 635.2k | 商业付费 C++ 扩展，与 cpptools 功能重叠 |
| `AgitoReiKen.GenerateProjectFilesUE` | 2.8k | 本仓库 `tools\gen-projectfiles.ps1` 已覆盖 |
| `Hazelight.unreal-angelscript` / `-clang-format` | 25.3k / 4.1k | AngelScript，与本项目无关 |

---

## 4. 关键设置说明（为什么这么配）

| 设置 | 值 | 理由 |
|---|---|---|
| `editor.formatOnSave` | `false` | **关键**：避免任何格式化类扩展去动 C++ / INI / PS1 |
| `files.eol` | `\n` | 统一 LF；`.editorconfig` 对 `.ps1` 单独要求 CRLF |
| `editor.detectIndentation` | `false` | 防止被引擎代码的 Tab 带偏，固定 4 空格 |
| `files.readonlyInclude` | UE 生成物 | `Binaries/Intermediate/Saved` 改也会被覆盖，设为只读防误编辑 |
| `files.exclude` / `search.exclude` / `watcherExclude` | UE 生成物 | `DerivedDataCache` 动辄数十万文件，不排除会让搜索与监听卡死 |
| `terminal.integrated.profiles.windows` | `source: PowerShell` + `-ExecutionPolicy Bypass` | 终端里可直接跑 `tools\*.ps1`，不必先改执行策略 |
| `C_Cpp.default.cppStandard` | `c++20` | 与 `c_cpp_properties.json`、`.clang-format` 一致 |
| `explorer.confirmDelete` | `true` | 覆盖全局的 `false`：游戏资产与生成图删错代价高 |
| `files.autoSave` | `off` | C++ 保存可能触发 UBT/Live Coding，显式保存更可控 |
| `[ini]` / `[json]` / `[yaml]` | `tabSize: 2` | 与 `.editorconfig` 对数据与配置文件的约定一致 |
| `cSpell.words` | 见文件 | 已加 `UCLASS` `USTRUCT` `cppvsdbg` `ComfyUI` `Yearbound` `SolsticeSim` 等项目词 |

> **已清理**：原先为 Java / Vue / eslint / prettier / jest / sqltools / svn / xml 等扩展逐条写死的「降噪设置」
> （如 `eslint.enable: false`）在本轮已随扩展一并删除——扩展不在，设置即失效，留着只会误导。
> 日后重装某扩展时，直接在编辑器 UI 里按需关闭即可。

---

## 5. 为什么工作区是单根（不拆多根）

所有 task 与 launch 配置都用 `${workspaceFolder}` 定位仓库根（`tools\`、`studio\` 脚本，`game\Solstice.uproject`）。

多根工作区下 `${workspaceFolder}` 会解析到各自子文件夹，**任务与调试路径会全部错乱**。
因此保持单根 = 仓库根，用 `files.exclude` 收纳 `game/Binaries` 等噪音目录。

---

## 6. IntelliSense 路线切换

**路线 A（当前，默认）**：`ms-vscode.cpptools` + `game\Solstice.sln`
```powershell
# 执行 task：Solstice: 生成工程文件 (Solution / cpptools)
```

**路线 B（可选）**：`clangd` + `game\compile_commands.json`
1. 确保 `llvm-vs-code-extensions.vscode-clangd` 已安装并在本工作区**启用**（默认已被你 Disable (Workspace)）
2. 执行 task：`Solstice: 生成工程文件 (ClangDb / clangd)`
3. 把 `.vscode/settings.json` 里 `C_Cpp.intelliSenseEngine` 改成 `"disabled"`
4. 取消注释同文件中 clangd 的三行配置

> 两者**不可同时启用 IntelliSense**。若系统内存紧张，留在路线 A。
> 细节与冲突警示已写在 `.vscode/settings.json` 的「C/C++」段落注释里。

---

## 7. 常见问题

| 症状 | 处理 |
|---|---|
| C++ 满屏红波浪线，但能编译 | 引擎路径未写入 / 未生成 `.sln` → 执行 `配置 VSCode` + `生成工程文件` 两个 task |
| C++ 报错每行出现两次 | clangd 与 cpptools 同时在跑 → 对 clangd 执行 **Disable (Workspace)**（见 §3.4） |
| 中文脚本在终端报语法错 | 脚本须为 **UTF-8 with BOM**。`.editorconfig` 已强制；现存脚本已批量补 BOM。若仍报错，检查该文件编码 |
| tasks 找不到 `tools\*.ps1` | 确认打开的是**仓库根**（不是 `game/` 子目录） |
| 终端里 `无法加载文件，因为在此系统上禁止运行脚本` | 用 tasks（已带 `-ExecutionPolicy Bypass`），或执行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| 契约校验 / 生图任务报「文件不存在」 | `shared/` 与 `studio/` 目录尚未落地（规划见 `docs\STRUCTURE.md`），属预期行为 |
| 搜索很慢 / 风扇狂转 | 确认 `files.watcherExclude` 生效；必要时关闭搜索中的 `game/Content` |

---

## 8. CodeBuddy（IDE 内 AI 助手）配置

本项目**只使用 CodeBuddy 一个 AI 助手**（其余 AI 插件已清理，见 §3.6）。

### 8.1 VS Code 插件侧（`codingcopilot.*`）

**位置**：VS Code 用户设置 `%APPDATA%\Code\User\settings.json`（`application` 作用域，工作区无法覆盖，所以只能改用户级）。

```jsonc
{
  // 命令自动运行，不再逐条弹批准
  "codingcopilot.autoRun": true,

  // 要【跳过】的内置安全检查类别。默认只跳过 3 项；
  // 本项目 tools/ 全是 .ps1，若把它清空成 []，PowerShell/脚本类检查会全部生效
  // → 每个任务执行都被拦下来要确认。
  "codingcopilot.disabledSecurityCategories": [
    "diskOps", "windowsSystem", "network", "systemServices", "userManagement",
    "fileDelete", "permissions", "processControl", "gitOps",
    "injection", "scriptExec", "powershell", "custom"
  ],

  // 删除仍走回收站（可恢复），但批量删除不再弹确认
  "codingcopilot.safeDeleteEnabled": true,
  "codingcopilot.safeDeleteBulkThreshold": 99999,

  // 额外拦截命令（正则，逐条匹配整条命令）；留空即不额外拦截
  "codingcopilot.customBlacklistCommands": []
}
```

> ⚠ 全类别跳过意味着 AI 可**静默执行任意命令**，唯一的安全网是 `safeDeleteEnabled: true`（删除进回收站）。
> 若同时使用 CodeBuddy CN 独立 IDE，需在其 `%APPDATA%\CodeBuddy CN\User\settings.json` 做同样配置。

### 8.2 CLI / agent 层权限模式

配置位于**用户级** `~/.codebuddy/settings.json`（Windows：`C:\Users\<你>\.codebuddy\settings.json`）。

```jsonc
{
  "permissions": {
    "defaultMode": "bypassPermissions", // 直接执行，不再逐条弹批准
    "allow": ["Bash(*)", "PowerShell(*)"]
  }
}
```

| `defaultMode` 合法取值 | 含义 |
|---|---|
| `default` | 最保守：只放行信任目录内的读取，其余都询问（**兜底值**） |
| `acceptEdits` | 自动放行文件编辑，命令仍询问 |
| `auto` | 把「最后仍会询问」的动作交给分类器判定（**仅用户级 settings 可授予**） |
| `dontAsk` | 不弹框，未预批准的动作**直接拒绝** |
| `plan` | 先写计划，确认后再执行 |
| `bypassPermissions` | **跳过绝大多数审批**（本项目当前使用） |

要点：
- 取值优先级：**会话当前值 > CLI `--permission-mode` > `permissions.defaultMode` > `default`**。
  命令面板/快捷键（`Shift+Tab`）临时切过的模式会**压过**文件配置，改文件后请**新开会话**或把模式切回。
- `deny` 规则**永远强于**模式；`allow` / `ask` 会改变模式的实际效果。
- 真正的「任何危险命令都不问」需要进程环境变量 `CODEBUDDY_IS_SANDBOX=1` 配合 `-y`，
  文档明确其仅限隔离沙箱；本项目**未启用**，仅用 `bypassPermissions`。
