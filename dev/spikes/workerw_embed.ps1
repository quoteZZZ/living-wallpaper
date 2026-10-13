# T1.0-B spike ①：WorkerW 嵌入机制验证（纯 Win32 窗口，复现 Lively 流程）
# 流程：EnumWindows 定位 Progman → 0x052C 生成 WorkerW → 找壁纸层 WorkerW
#      → CreateWindowExW 造窗 → SetParent(WorkerW) → 截屏留证 → DestroyWindow
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class W {
  public delegate bool EnumProc(IntPtr h, IntPtr lp);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lp);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string w);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr SetParent(IntPtr c, IntPtr p);
  [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int hh, uint f);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern ushort RegisterClassW(ref WNDCLASS wc);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr CreateWindowExW(uint ex, string cls, string win, uint style, int x, int y, int w, int h, IntPtr parent, IntPtr menu, IntPtr inst, string param);
  [DllImport("user32.dll")] public static extern bool DestroyWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr h);
  [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr h, IntPtr dc);
  [DllImport("gdi32.dll")] public static extern uint SetTextColor(IntPtr dc, uint c);
  [DllImport("gdi32.dll")] public static extern uint SetBkColor(IntPtr dc, uint c);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr DrawTextW(IntPtr dc, string s, int n, ref RECT r, uint f);
  [DllImport("kernel32.dll")] public static extern IntPtr GetModuleHandleW(string n);
  [DllImport("kernel32.dll", CharSet=CharSet.Ansi)] public static extern IntPtr GetProcAddress(IntPtr m, string n);
  [DllImport("user32.dll")] public static extern int GetWindowLongW(IntPtr h, int idx);
  [DllImport("user32.dll")] public static extern int SetWindowLongW(IntPtr h, int idx, int val);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct WNDCLASS {
    public uint style; public IntPtr proc; public int extra; public int winExtra;
    public IntPtr inst; public IntPtr icon; public IntPtr cursor; public IntPtr brush;
    public string menu; public string className;
  }
}
'@

# 1) 定位 Progman 并发 0x052C
$progman = [IntPtr]::Zero
$cbP = {
  param($h, $lp)
  $sb = New-Object System.Text.StringBuilder 256
  [W]::GetClassName($h, $sb, 256) | Out-Null
  if ($sb.ToString() -eq 'Progman') { $script:progman = $h; return $false }
  return $true
}
[W]::EnumWindows($cbP, [IntPtr]::Zero) | Out-Null
if ($progman -eq [IntPtr]::Zero) { throw 'Progman not found' }
Write-Host ("Progman: 0x" + $progman.ToString('X'))
[W]::SendMessage($progman, 0x052C, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null

# 2) 嵌入点定位（回退链）：
#    ① 经典：DefView 宿主后的 WorkerW 兄弟（Win10 及部分 Win11）
#    ② 回退：直接挂进 DefView 宿主（Win11 新结构：图标直接在 Progman 下）
$dvh = [IntPtr]::Zero
$cbD = {
  param($h, $lp)
  if ([W]::FindWindowEx($h, [IntPtr]::Zero, 'SHELLDLL_DefView', $null) -ne [IntPtr]::Zero) {
    $script:dvh = $h; return $false
  }
  return $true
}
[W]::EnumWindows($cbD, [IntPtr]::Zero) | Out-Null
if ($dvh -eq [IntPtr]::Zero) { throw 'SHELLDLL_DefView host not found' }
$sbD = New-Object System.Text.StringBuilder 64
[W]::GetClassName($dvh, $sbD, 64) | Out-Null
$target = [W]::FindWindowEx([IntPtr]::Zero, $dvh, 'WorkerW', $null)
$mode = if ($target -ne [IntPtr]::Zero) { 'workerw-sibling' } else { 'progman-fallback'; $target = $dvh }
Write-Host ("embed target: 0x" + $target.ToString('X') + "  class=" + $sbD.ToString() + "  mode=" + $mode)

# 3) 造测试窗：用系统预注册 STATIC 类（免 RegisterClass），验证 SetParent 行为足够
$instance = [W]::GetModuleHandleW('user32.dll')
$WS_VISIBLE = [uint32]'0x10000000'; $WS_POPUP = [uint32]'0x90000000'   # POPUP|VISIBLE 合并
$win = [W]::CreateWindowExW(0, 'STATIC', 'Solstice T1.0-B spike - embedded via WorkerW',
  $WS_POPUP, 120, 160, 420, 260, [IntPtr]::Zero, [IntPtr]::Zero, $instance, $null)
if ($win -eq [IntPtr]::Zero) { throw 'CreateWindowExW failed: ' + [Runtime.InteropServices.Marshal]::GetLastWin32Error() }
Write-Host ("test window: 0x" + $win.ToString('X'))

# 4) 嵌入壁纸层：WS_POPUP → WS_CHILD，再 SetParent
$GWL_STYLE = -16
$style = [W]::GetWindowLongW($win, $GWL_STYLE)
$style = ($style -band (-bnot 0x80000000)) -bor 0x40000000        # 去 WS_POPUP 加 WS_CHILD
[W]::SetWindowLongW($win, $GWL_STYLE, $style) | Out-Null
$sp = [W]::SetParent($win, $target)
[W]::SetWindowPos($win, [IntPtr]::Zero, 120, 160, 420, 260, 0x4 -bor 0x20) | Out-Null
$gp = [W]::GetParent($win)
Write-Host ("SetParent old-parent: 0x" + $sp.ToString('X') + "   GetParent now: 0x" + $gp.ToString('X') + "  (target 0x" + $target.ToString('X') + ")")
Start-Sleep -Milliseconds 900

# 5) 终极验证：ToggleDesktop 露出桌面 → 截屏（应看到测试窗在图标后）→ 恢复
$shell = New-Object -ComObject Shell.Application
$shell.ToggleDesktop(); Start-Sleep -Milliseconds 1200
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(0, 0, 0, 0, $bmp.Size)
$out = Join-Path $PSScriptRoot '..\tmp\workerw_embed_proof.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
$shell.ToggleDesktop(); Start-Sleep -Milliseconds 600
Write-Host ("screenshot: " + $out)

# 6) 还原
[W]::DestroyWindow($win) | Out-Null
Write-Host 'done — test window destroyed, desktop untouched'
