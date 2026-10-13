# 素材预处理：场景图居中裁剪到 16:9 + 生成垂直渐变深度图（天顶远/底部近）
# 用法: powershell -File tools/asset-prep.ps1 [-Scene app/assets/scene.png]
param(
  [string]$Scene = "e:/solstice/app/assets/scene.png",
  [string]$Depth = "e:/solstice/app/assets/depth.png"
)
Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile($Scene)
$tw = $src.Width
$th = [int][math]::Round($src.Width * 9 / 16)
if ($th -gt $src.Height) { $th = $src.Height; $tw = [int][math]::Round($src.Height * 16 / 9) }
$sx = [int](($src.Width - $tw) / 2)
$sy = [int](($src.Height - $th) * 0.42)   # 偏上裁剪，保住主峰与天空

$crop = New-Object System.Drawing.Bitmap($tw, $th)
$g = [System.Drawing.Graphics]::FromImage($crop)
$srcRect = New-Object System.Drawing.Rectangle($sx, $sy, $tw, $th)
$dstRect = New-Object System.Drawing.Rectangle(0, 0, $tw, $th)
$g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $src.Dispose()
$crop.Save($Scene, [System.Drawing.Imaging.ImageFormat]::Png); $crop.Dispose()

# 深度图：黑(0)=远（视差不动）→ 白(1)=近（视差最大）；顶端留 4% 避免天空完全死锁
$d = New-Object System.Drawing.Bitmap($tw, $th)
$g = [System.Drawing.Graphics]::FromImage($d)
$rect = New-Object System.Drawing.Rectangle(0, 0, $tw, $th)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,
  [System.Drawing.Color]::FromArgb(255, 10, 10, 10),
  [System.Drawing.Color]::FromArgb(255, 255, 255, 255),
  [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
$g.FillRectangle($brush, $rect); $g.Dispose(); $brush.Dispose()
$d.Save($Depth, [System.Drawing.Imaging.ImageFormat]::Png); $d.Dispose()
Write-Output "scene cropped to ${tw}x${th}; depth written: $Depth"
