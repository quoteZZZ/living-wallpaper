#!/usr/bin/env python3
"""Solstice seamless-tile finisher + QC (stdlib only, no Pillow).

ComfyUI core ships no "make seamless" node, so the wrap-around guarantee is
enforced offline:

  1. roll the tile by half in x and y -- opposite edges then hold pixels that
     were neighbours in the middle of the render, so the 2x2 tiling seam is
     gone by construction (the old borders now sit on the centre lines);
  2. soften that centre ridge with a narrow mirror blend (content stays
     symmetric only inside the band, which is invisible on organic textures).

Also reports the mechanical parts of the SET-01 acceptance list: tile size,
wrap-around continuity (column/row edge delta) and a directional-light proxy
(top/bottom + left/right luminance delta; flat even light scores low).

Usage (PowerShell):
  # finish one tile and print QC
  D:\\ComfyUI\\python_embeded\\python.exe studio\\tools\\seamless.py `
    --in studio\\work\\raw\\rock-cliff_v1.png `
    --out studio\\work\\raw\\rock-cliff_v1_seamless.png --tile-preview

  # per-material contact sheet (each candidate tiled 2x2, side by side)
  D:\\ComfyUI\\python_embeded\\python.exe studio\\tools\\seamless.py `
    --sheet studio\\work\\raw\\sheet_rock.png `
    --from studio\\work\\raw\\a.png studio\\work\\raw\\b.png --scale 1
"""
import argparse
import struct
import sys
import zlib
from pathlib import Path

CHANNELS = {0: 1, 2: 3, 4: 2, 6: 4}


def read_png(path):
    """Decode an 8-bit non-interlaced PNG -> (w, h, channels, bytearray)."""
    data = Path(path).read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"not a PNG: {path}")
    pos, idat = 8, bytearray()
    w = h = depth = ctype = 0
    while pos + 12 <= len(data):
        ln = int.from_bytes(data[pos:pos + 4], "big")
        typ = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + ln]
        pos += 12 + ln
        if typ == b"IHDR":
            w, h, depth, ctype, _comp, _filt, inter = struct.unpack(">IIBBBBB", body)
            if depth != 8:
                raise ValueError(f"{path}: only 8-bit PNG supported (got {depth})")
            if inter:
                raise ValueError(f"{path}: interlaced PNG unsupported")
            if ctype not in CHANNELS:
                raise ValueError(f"{path}: unsupported colour type {ctype}")
        elif typ == b"IDAT":
            idat += body
        elif typ == b"IEND":
            break
    ch = CHANNELS[ctype]
    stride = w * ch
    raw = zlib.decompress(bytes(idat))
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        ftype = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride
        if ftype == 1:
            for i in range(ch, stride):
                line[i] = (line[i] + line[i - ch]) & 0xFF
        elif ftype == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ftype == 3:
            for i in range(stride):
                left = line[i - ch] if i >= ch else 0
                line[i] = (line[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif ftype == 4:
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                c = prev[i - ch] if i >= ch else 0
                b = prev[i]
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                if pa <= pb and pa <= pc:
                    pred = a
                elif pb <= pc:
                    pred = b
                else:
                    pred = c
                line[i] = (line[i] + pred) & 0xFF
        elif ftype != 0:
            raise ValueError(f"{path}: bad filter type {ftype} on row {y}")
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, ch, out


def write_png(path, w, h, ch, pix):
    """Encode an 8-bit RGB/RGBA buffer; adaptive per-row filtering."""
    ctype = {1: 0, 2: 4, 3: 2, 4: 6}[ch]
    stride = w * ch
    body = bytearray()

    def paeth(a, b, c):
        pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
        if pa <= pb and pa <= pc:
            return a
        return b if pb <= pc else c

    def predictor(ftype, line, prev, i):
        a = line[i - ch] if i >= ch else 0
        b = prev[i]
        c = prev[i - ch] if i >= ch else 0
        if ftype == 0:
            return 0
        if ftype == 1:
            return a
        if ftype == 2:
            return b
        return paeth(a, b, c)

    prev = bytearray(stride)
    for y in range(h):
        line = pix[y * stride:(y + 1) * stride]
        # pick the filter on a subsample, then encode the whole row with it
        best_type, best_score = 2, None
        for ftype in (0, 1, 2, 4):
            score = 0
            for i in range(0, stride, 8):
                val = (line[i] - predictor(ftype, line, prev, i)) & 0xFF
                score += val if val < 128 else 256 - val
            if best_score is None or score < best_score:
                best_type, best_score = ftype, score
        cand = bytearray(stride)
        for i in range(stride):
            cand[i] = (line[i] - predictor(best_type, line, prev, i)) & 0xFF
        body.append(best_type)
        body += cand
        prev = line

    def chunk(typ, payload):
        return (struct.pack(">I", len(payload)) + typ + payload
                + struct.pack(">I", zlib.crc32(typ + payload) & 0xFFFFFFFF))

    out = bytearray(b"\x89PNG\r\n\x1a\n")
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ctype, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(bytes(body), 9))
    out += chunk(b"IEND", b"")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_bytes(bytes(out))


def roll(w, h, ch, pix, dx, dy):
    """Wrap-shift the tile by (dx, dy) pixels."""
    stride = w * ch
    out = bytearray(len(pix))
    for y in range(h):
        sy = (y - dy) % h
        src = pix[sy * stride:(sy + 1) * stride]
        if dx % w == 0:
            out[y * stride:(y + 1) * stride] = src
            continue
        cut = (dx % w) * ch
        out[y * stride:(y + 1) * stride] = src[cut:] + src[:cut]
    return out


def _smoothstep(t):
    return t * t * (3 - 2 * t)


def blend_band(w, h, ch, pix, axis, band):
    """Mirror-blend a band around the centre line on `axis` ('x' or 'y')."""
    if band <= 0:
        return pix
    out = bytearray(pix)
    n = w if axis == "x" else h
    c = n // 2
    band = min(band, c)
    if band < 2:
        return pix
    stride = w * ch
    for k in range(-band, band):
        t = abs(k) / band
        m = 0.5 * (1.0 - _smoothstep(t))          # 0 at band edge, .5 on the seam
        mi = 2 * c - 1 - (c + k)                  # mirrored position
        if not (0 <= c + k < n and 0 <= mi < n):
            continue
        for j in range(h if axis == "x" else w):
            if axis == "x":
                ia = (c + k) * ch + j * stride
                ib = mi * ch + j * stride
            else:
                ia = (c + k) * stride + j * ch
                ib = mi * stride + j * ch
            for kk in range(ch):
                out[ia + kk] = int(pix[ia + kk] * (1 - m) + pix[ib + kk] * m + 0.5)
    return out


def blur_ridge(w, h, ch, pix, axis, band, radius):
    """Smear the centre ridge with a directional box blur (no mirror symmetry).

    The band is blurred along the axis perpendicular to the seam, ramped by a
    smoothstep so the untouched texture takes over at the band edges.  Tile
    borders are never touched, so wrap continuity is preserved.
    """
    if band <= 0 or radius <= 0:
        return pix
    n = w if axis == "x" else h
    c = n // 2
    band = min(band, c)
    if band < 2:
        return pix
    stride = w * ch
    out = bytearray(pix)
    run = h if axis == "x" else w

    def sample(i_along, j_perp):
        if axis == "x":
            return j_perp * stride + i_along * ch
        return i_along * stride + j_perp * ch

    for k in range(-band, band):
        pos = c + k
        wgt = 0.5 * (1.0 - _smoothstep(abs(k) / band))
        for j in range(run):
            acc = [0] * ch
            for off in range(-radius, radius + 1):
                p = (pos + off) % n
                base = sample(p, j)
                for kk in range(ch):
                    acc[kk] += pix[base + kk]
            base = sample(pos, j)
            for kk in range(ch):
                avg = acc[kk] / (2 * radius + 1)
                out[base + kk] = int(pix[base + kk] * (1 - wgt) + avg * wgt + 0.5)
    return out


def make_seamless(w, h, ch, pix, band_frac=0.06, mode="blur", radius=None, flatten=0.0):
    """Roll by half, optionally soften the centre ridge, optionally flatten light.

    mode: 'roll' (wrap guarantee only), 'blur' (directional smear),
    'mirror' (symmetric blend -- smooth but visibly kaleidoscopic) or
    'none' (leave the pixels alone; measure only).
    """
    if mode == "none":
        return pix
    band = int(min(w, h) * band_frac)
    if radius is None:
        radius = max(2, band // 8)
    rolled = roll(w, h, ch, pix, w // 2, h // 2)
    for axis in ("x", "y"):
        if mode == "mirror":
            rolled = blend_band(w, h, ch, rolled, axis, band)
        elif mode == "blur":
            rolled = blur_ridge(w, h, ch, rolled, axis, band, radius)
    if flatten:
        rolled = flatten_light(w, h, ch, rolled, flatten)
    return rolled


def low_freq_field(w, h, ch, pix, grid=24):
    """Low-frequency luminance field, sampled on a torus (tileable by design).

    Returns a grid x grid list of mean luminance values; because the sample
    points wrap, the bilinear interpolation of it is periodic, so dividing the
    tile by it cannot break the wrap-around continuity.
    """
    acc = [0.0] * (grid * grid)
    cnt = [0] * (grid * grid)
    for y in range(h):
        gy = y * grid // h
        base = y * w * ch
        for x in range(w):
            gx = x * grid // w
            i = base + x * ch
            if ch >= 3:
                v = 0.2126 * pix[i] + 0.7152 * pix[i + 1] + 0.0722 * pix[i + 2]
            else:
                v = float(pix[i])
            acc[gy * grid + gx] += v
            cnt[gy * grid + gx] += 1
    return [acc[i] / max(cnt[i], 1) for i in range(grid * grid)], grid


def flatten_light(w, h, ch, pix, strength=0.35, grid=24):
    """Divide out the large-scale lighting gradient (flat even light, SET-01).

    Only the low frequency is touched, so local detail and hue survive; the
    gain is clamped and interpolated circularly, which keeps the tile seamless.
    """
    if strength <= 0:
        return pix
    field, g = low_freq_field(w, h, ch, pix, grid)
    mean = sum(field) / len(field)
    out = bytearray(pix)
    lo, hi = 1.0 - strength, 1.0 + strength
    for y in range(h):
        fy = y * g / h
        y0 = int(fy) % g
        y1 = (y0 + 1) % g
        ty = fy - int(fy)
        base = y * w * ch
        for x in range(w):
            fx = x * g / w
            x0 = int(fx) % g
            x1 = (x0 + 1) % g
            tx = fx - int(fx)
            a = field[y0 * g + x0] * (1 - tx) + field[y0 * g + x1] * tx
            b = field[y1 * g + x0] * (1 - tx) + field[y1 * g + x1] * tx
            local = a * (1 - ty) + b * ty
            gain = mean / local if local > 1.0 else 1.0
            gain = min(hi, max(lo, gain))
            i = base + x * ch
            for k in range(ch):
                out[i + k] = min(255, max(0, int(pix[i + k] * gain + 0.5)))
    return out


def edge_metric(w, h, ch, pix):
    """Mean |left-right| and |top-bottom| -- the wrap-around seam, 0 = perfect."""
    stride = w * ch
    lr = sum(abs(pix[y * stride + i] - pix[y * stride + (w - 1) * ch + i])
             for y in range(h) for i in range(ch)) / (h * ch)
    tb = sum(abs(pix[i] - pix[(h - 1) * stride + i]) for i in range(stride)) / stride
    return lr, tb


def light_metric(w, h, ch, pix):
    """Directional-light proxy: luminance delta top/bottom and left/right."""
    stride = w * ch

    def lum(x, y):
        i = y * stride + x * ch
        if ch >= 3:
            return 0.2126 * pix[i] + 0.7152 * pix[i + 1] + 0.0722 * pix[i + 2]
        return float(pix[i])

    half = h // 2
    top = sum(lum(x, y) for y in range(half) for x in range(0, w, 4)) / (half * (w // 4))
    bot = sum(lum(x, y) for y in range(half, h) for x in range(0, w, 4)) / ((h - half) * (w // 4))
    q = w // 4
    left = sum(lum(x, y) for y in range(0, h, 4) for x in range(q)) / ((h // 4) * q)
    right = sum(lum(x, y) for y in range(0, h, 4) for x in range(w - q, w)) / ((h // 4) * q)
    return top - bot, right - left


def downscale(w, h, ch, pix, nw, nh):
    """Box-average resample."""
    out = bytearray(nw * nh * ch)
    for y in range(nh):
        y0, y1 = y * h // nh, max(y * h // nh + 1, (y + 1) * h // nh)
        for x in range(nw):
            x0, x1 = x * w // nw, max(x * w // nw + 1, (x + 1) * w // nw)
            acc = [0] * ch
            for yy in range(y0, y1):
                base = yy * w * ch
                for xx in range(x0, x1):
                    i = base + xx * ch
                    for k in range(ch):
                        acc[k] += pix[i + k]
            cnt = (y1 - y0) * (x1 - x0)
            o = (y * nw + x) * ch
            for k in range(ch):
                out[o + k] = acc[k] // cnt
    return out


def tiled_grid(w, h, ch, pix, scale):
    """Compose the tile 2x2 into one image (visual seam check)."""
    tw, th = w * scale, h * scale
    small = downscale(w, h, ch, pix, tw, th) if scale != 1 else pix
    g = bytearray(tw * 2 * th * 2 * ch)
    stride_s = tw * ch
    stride_g = tw * 2 * ch
    for y in range(th):
        row = small[y * stride_s:(y + 1) * stride_s]
        for k in (0, 1):
            dst = y * stride_g + k * stride_s
            g[dst:dst + stride_s] = row
            gy = (y + th) * stride_g + k * stride_s
            g[gy:gy + stride_s] = row
    return tw * 2, th * 2, g


def sheet(w, h, ch, pix_list, tile_side=512):
    """Candidates side by side, each shown as a 2x2 tiling (review sheet)."""
    grids = []
    for p in pix_list:
        if (w, h) != (tile_side, tile_side):
            p = downscale(w, h, ch, p, tile_side, tile_side)
        grids.append(tiled_grid(tile_side, tile_side, ch, p, 1))
    gw, gh = grids[0][0], grids[0][1]
    total = gw * len(grids)
    out = bytearray(total * gh * ch)
    stride_out = total * ch
    for idx, (_gw, _gh, g) in enumerate(grids):
        for y in range(gh):
            src = y * gw * ch
            dst = y * stride_out + idx * gw * ch
            out[dst:dst + gw * ch] = g[src:src + gw * ch]
    return total, gh, out


def gradient_metric(w, h, ch, pix):
    """Natural neighbour-column/row delta -- the 'invisible seam' yardstick."""
    stride = w * ch
    xs = [w * i // 8 for i in range(1, 8)]
    ys = [h * i // 8 for i in range(1, 8)]
    lr = sum(abs(pix[y * stride + x * ch + k] - pix[y * stride + (x + 1) * ch + k])
             for x in xs for y in range(0, h, 3) for k in range(ch)) / (len(xs) * (h // 3 + 1) * ch)
    tb = sum(abs(pix[y * stride + x * ch + k] - pix[(y + 1) * stride + x * ch + k])
             for y in ys for x in range(0, w, 3) for k in range(ch)) / (len(ys) * (w // 3 + 1) * ch)
    return lr, tb


def qc_line(tag, w, h, ch, pix):
    lr, tb = edge_metric(w, h, ch, pix)
    glr, gtb = gradient_metric(w, h, ch, pix)
    dy, dx = light_metric(w, h, ch, pix)
    print(f"  {tag:<10} {w}x{h}  seam L|R {lr:6.2f} (grad {glr:5.2f}, x{lr / max(glr, 0.01):4.1f})"
          f"  T|B {tb:6.2f} (grad {gtb:5.2f}, x{tb / max(gtb, 0.01):4.1f})"
          f"  light dY {dy:+6.2f} dX {dx:+6.2f}")
    return lr, tb, dy, dx


def main() -> int:
    ap = argparse.ArgumentParser(description="Seamless tile finisher + QC (stdlib).")
    ap.add_argument("--in", dest="src", help="source tile PNG")
    ap.add_argument("--out", dest="dst", help="output tile PNG")
    ap.add_argument("--band", type=float, default=0.06,
                    help="ridge band as a fraction of the short edge (default 0.06)")
    ap.add_argument("--mode", choices=("roll", "blur", "mirror", "none"), default="blur",
                    help="ridge treatment after the roll (default blur); "
                         "'none' = QC an already-finished tile without touching it")
    ap.add_argument("--radius", type=int, default=None,
                    help="blur radius in px for --mode blur (default band/8)")
    ap.add_argument("--flatten", type=float, default=0.0,
                    help="flatten large-scale lighting by this much, 0..0.9 "
                         "(tileable, keeps detail; SET-01 asks for flat even light)")
    ap.add_argument("--tile-preview", action="store_true",
                    help="write <out>_tile2x2.png next to --out")
    ap.add_argument("--sheet", help="contact-sheet output PNG")
    ap.add_argument("--from", dest="sources", nargs="+",
                    help="sources for --sheet (each tiled 2x2, side by side)")
    ap.add_argument("--tile-side", dest="tile_side", type=int, default=512,
                    help="tile size used inside --sheet, each shown 2x2 (default 512)")
    args = ap.parse_args()

    if args.sheet:
        if not args.sources:
            ap.error("--sheet needs --from <png...>")
        frames = [read_png(p) for p in args.sources]
        w, h, ch, _ = frames[0]
        for p, f in zip(args.sources, frames):
            if (f[0], f[1]) != (w, h):
                print(f"[warn] {p}: {f[0]}x{f[1]} != {w}x{h}")
        sw, sh, sp = sheet(w, h, ch, [f[3] for f in frames], args.tile_side)
        write_png(args.sheet, sw, sh, ch, sp)
        print(f"[ok] sheet {args.sheet}  {sw}x{sh}  ({len(frames)} x 2x2 tiles)")
        return 0

    if not args.src:
        ap.error("--in is required (or use --sheet)")
    w, h, ch, pix = read_png(args.src)
    print(f"[..] {args.src}  {w}x{h} ch={ch}")
    qc_line("as-render", w, h, ch, pix)
    fixed = make_seamless(w, h, ch, pix, args.band, mode=args.mode,
                          radius=args.radius, flatten=args.flatten)
    qc_line("seamless", w, h, ch, fixed)

    if args.dst:
        write_png(args.dst, w, h, ch, fixed)
        print(f"[ok] {args.dst}")
    if args.tile_preview:
        gw, gh, gp = tiled_grid(w, h, ch, fixed, 1)
        base = Path(args.dst) if args.dst else Path(args.src)
        prev = base.with_name(base.stem + "_tile2x2.png")
        write_png(prev, gw, gh, ch, gp)
        print(f"[ok] {prev}  {gw}x{gh}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
