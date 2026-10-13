#!/usr/bin/env python3
"""Solstice contact sheet builder (stdlib only, no Pillow).

One batch of candidates -> one review image, so a season's worth of card faces
(or any candidate batch) can be judged in a single look without opening 30
files.  Pure pixel compositing, no GPU, no text labels -- the reading order is
row-major and matches the order given on the command line.

Usage (PowerShell):
  D:\\ComfyUI\\python_embeded\\python.exe studio\\tools\\contact.py `
    --out studio\\work\\raw\\review.png --cols 5 --cell 420 `
    --from studio\\frames\\cards\\mt-plum-ridge.1.png `
           studio\\frames\\cards\\pl-plum.1.png ...
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import seamless as S  # noqa: E402

BACKGROUND = 88


def main() -> int:
    ap = argparse.ArgumentParser(description="Compose a contact sheet from PNGs.")
    ap.add_argument("--out", required=True, help="output review PNG")
    ap.add_argument("--from", dest="sources", nargs="+", required=True,
                    help="source PNGs, row-major")
    ap.add_argument("--cols", type=int, default=5, help="columns (default 5)")
    ap.add_argument("--cell", type=int, default=420, help="cell height in px")
    ap.add_argument("--gap", type=int, default=10, help="gap between cells")
    args = ap.parse_args()

    frames = [S.read_png(p) for p in args.sources]
    ch = frames[0][2]
    for path, f in zip(args.sources, frames):
        if f[2] != ch:
            print(f"[err] {path}: {f[2]} channels != {ch}")
            return 1
    cw = max(1, args.cell * frames[0][0] // frames[0][1])
    cells = []
    for f in frames:
        cells.append(f[3] if (f[0], f[1]) == (cw, args.cell)
                     else S.downscale(f[0], f[1], ch, f[3], cw, args.cell))

    cols = max(1, args.cols)
    rows = (len(cells) + cols - 1) // cols
    gap = args.gap
    w = cols * cw + (cols + 1) * gap
    h = rows * args.cell + (rows + 1) * gap
    canvas = bytearray([BACKGROUND] * (w * h * ch))

    for idx, cell in enumerate(cells):
        r, c = divmod(idx, cols)
        x0 = gap + c * (cw + gap)
        y0 = gap + r * (args.cell + gap)
        for y in range(args.cell):
            src = y * cw * ch
            dst = ((y0 + y) * w + x0) * ch
            canvas[dst:dst + cw * ch] = cell[src:src + cw * ch]

    S.write_png(args.out, w, h, ch, canvas)
    print(f"[ok] {args.out}  {w}x{h}  ({len(cells)} cells, {cols} cols x {rows} rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
