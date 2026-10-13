# 提取 Lucide 图标 path + 生成树素材包（白底→透明）
# 用法: python tools/make_assets.py
import os, re, json, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUCIDE = os.path.join(ROOT, 'tmp', 'lucide')
TMP = os.path.join(ROOT, 'tmp')

# ---------- 1) Lucide 图标提取 ----------
out = {}
if os.path.isdir(LUCIDE):
    for f in sorted(os.listdir(LUCIDE)):
        if not f.endswith('.svg'):
            continue
        s = open(os.path.join(LUCIDE, f), encoding='utf-8').read()
        m = re.search(r'<svg[^>]*>(.*)</svg>', s, re.S)
        inner = m.group(1).strip() if m else ''
        inner = re.sub(r'<!--.*?-->', '', inner, flags=re.S)
        out[f[:-4]] = re.sub(r'\s+', ' ', inner)
with open(os.path.join(TMP, 'lucide_paths.json'), 'w', encoding='utf-8') as fp:
    json.dump(out, fp, indent=1)
print('icons extracted:', len(out))

# ---------- 2) 树素材：白底 → 透明 PNG → 素材包 ----------
try:
    from PIL import Image
except ImportError:
    print('PIL MISSING — run: pip install pillow')
    sys.exit(0)

SRC = os.path.join(TMP, 'tree_v3_raw.jpg')
if not os.path.exists(SRC):
    SRC = os.path.join(TMP, 'tree_summer_raw.jpg')
print('source:', SRC)

im = Image.open(SRC).convert('L')          # 灰度
w, h = im.size
# 水印区（右下角）刷白
px = im.load()
for y in range(h - 46, h):
    for x in range(w - 150, w):
        px[x, y] = 255

# 亮度键控：暗=树(不透明)，亮=背景(透明)，中间平滑过渡
alpha = Image.new('L', (w, h))
ap = alpha.load()
LO, HI = 0.32, 0.62                        # 0.32 以下全不透明，0.62 以上全透明
for y in range(h):
    for x in range(w):
        l = px[x, y] / 255.0
        if l <= LO:
            a = 255
        elif l >= HI:
            a = 0
        else:
            a = int(255 * (HI - l) / (HI - LO))
        ap[x, y] = a

# 裁剪到内容包围盒
box = alpha.getbbox()
alpha = alpha.crop(box)
# 长边 1024
scale = 1024 / max(alpha.size)
if scale < 1:
    alpha = alpha.resize((int(alpha.size[0]*scale), int(alpha.size[1]*scale)), Image.LANCZOS)

# 灌入黑色 RGB + alpha
rgba = Image.merge('RGBA', (
    alpha.point(lambda a: 8), alpha.point(lambda a: 10),
    alpha.point(lambda a: 12), alpha))

dst_dir = os.path.join(ROOT, 'src', 'wallpaper', 'assets', 'packs', 'trees')
os.makedirs(dst_dir, exist_ok=True)
rgba.save(os.path.join(dst_dir, 'summer.png'))
print('saved:', os.path.join(dst_dir, 'summer.png'), rgba.size)

manifest = {
    'id': 'pack.trees', 'api': 1,
    'name': {'zh': '前景树 · 四季', 'en': 'Trees · Seasons'},
    'variants': [
        {'id': 'spring', 'image': 'summer.png'},
        {'id': 'summer', 'image': 'summer.png'},
        {'id': 'autumn', 'image': 'summer.png'},
        {'id': 'winter', 'image': 'summer.png'},
    ],
}
with open(os.path.join(dst_dir, 'manifest.json'), 'w', encoding='utf-8') as fp:
    json.dump(manifest, fp, ensure_ascii=False, indent=2)
print('manifest written')
