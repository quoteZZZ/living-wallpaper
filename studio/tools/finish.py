#!/usr/bin/env python3
"""Solstice tile finisher: raw render -> seamless 1024 tile + QC (stdlib only).

One action, three steps, for every source (SET-01 terrain materials):

  1. `seamless.py` rolls the render by half -> the wrap-around seam is gone by
     construction, at the price of a ridge where the old borders met;
  2. `gen.py --seam-fix` (this script calls it in-process) masks that ridge and
     re-denoises the band, then composites it back so the tile borders -- and
     therefore the seamlessness -- are never touched;
  3. QC: size, wrap continuity against the natural pixel gradient, a
     directional-light proxy and a 2x2 tiling preview for the visual check.

Usage (PowerShell):
  D:\\ComfyUI\\python_embeded\\python.exe studio\\tools\\finish.py `
    --in studio\\work\\raw\\mat-snow_v1.png --out studio\\work\\raw\\mat-snow_v1_seamless.png `
    --prompt "<the same prompt the tile was rendered with>"

  D:\\ComfyUI\\python_embeded\\python.exe studio\\tools\\finish.py `
    --batch studio\\jobs\\set-01-materials.json --dir studio\\work\\raw
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gen  # noqa: E402
import seamless  # noqa: E402


def finish_one(src, out, prompt, band=128, steps=4, seed=None, server=gen.DEFAULT_SERVER,
               tile_preview=True, work_dir=None, flatten=0.0):
    """Roll -> seam-fix -> QC. Returns a dict of measurements."""
    w, h, ch, pix = seamless.read_png(src)
    if seed is None:
        seed = 9100
    work_dir = Path(work_dir or Path(src).parent)
    rolled = Path(work_dir) / (Path(src).stem + "_roll.png")
    seamless.write_png(rolled, w, h, ch,
                       seamless.make_seamless(w, h, ch, pix, mode="roll",
                                              flatten=flatten))
    gen.seam_fix(server, rolled, out, prompt, band=band, steps=steps, seed=seed)

    w2, h2, ch2, pix2 = seamless.read_png(out)
    print(f"[qc] {Path(out).name}")
    seamless.qc_line("as-render", w, h, ch, pix)
    lr, tb, dy, dx = seamless.qc_line("finished", w2, h2, ch2, pix2)
    glr, gtb = seamless.gradient_metric(w2, h2, ch2, pix2)
    if tile_preview:
        gw, gh, gp = seamless.tiled_grid(w2, h2, ch2, pix2, 1)
        prev = Path(out).parent / (Path(out).stem + "_tile2x2.png")
        seamless.write_png(prev, gw, gh, ch2, gp)
        print(f"[ok] {prev}")
    return {"file": str(out), "w": w2, "h": h2,
            "seam_lr": lr, "grad_lr": glr, "ratio_lr": lr / max(glr, 0.01),
            "seam_tb": tb, "grad_tb": gtb, "ratio_tb": tb / max(gtb, 0.01),
            "light_dy": dy, "light_dx": dx}


def main() -> int:
    ap = argparse.ArgumentParser(description="Raw render -> seamless tile + QC.")
    ap.add_argument("--in", dest="src", help="raw render PNG")
    ap.add_argument("--out", dest="dst", help="finished tile PNG")
    ap.add_argument("--prompt", help="prompt the tile was rendered with")
    ap.add_argument("--batch", help="job JSON (list of render kwargs with out/prompt)")
    ap.add_argument("--dir", help="directory the batch writes its _seamless.png into")
    ap.add_argument("--suffix", default="_seamless", help="batch output suffix")
    ap.add_argument("--band", type=int, default=128, help="seam-fix band px (default 128)")
    ap.add_argument("--seam-steps", dest="steps", type=int, default=4,
                    help="seam-fix denoise steps (default 4)")
    ap.add_argument("--seed-offset", dest="seed_offset", type=int, default=9000,
                    help="seam-fix seed = render seed + this (default 9000)")
    ap.add_argument("--flatten", type=float, default=0.35,
                    help="flatten large-scale lighting, 0 = off (default 0.35; "
                         "SET-01 wants flat even light, the engine lights the scene)")
    args = ap.parse_args()

    rows = []
    if args.batch:
        entries = json.loads(Path(args.batch).read_text(encoding="utf-8"))
        out_dir = Path(args.dir or "studio/work/raw")
        for entry in entries:
            src = Path(entry["out"])
            dst = out_dir / (src.stem + args.suffix + ".png")
            try:
                rows.append(finish_one(src, dst, entry["prompt"], band=args.band,
                                       steps=args.steps,
                                       seed=entry.get("seed", 0) + args.seed_offset,
                                       work_dir=out_dir, flatten=args.flatten))
            except Exception as exc:  # noqa: BLE001 - report and keep going
                print(f"[err] {src.name}: {exc}")
    else:
        if not (args.src and args.dst and args.prompt):
            ap.error("single mode needs --in, --out and --prompt")
        rows.append(finish_one(args.src, args.dst, args.prompt, band=args.band,
                               steps=args.steps, flatten=args.flatten))

    if rows:
        print("\n  file                                   size      seam ratio (L|R / T|B)   light dY")
        for r in rows:
            print(f"  {Path(r['file']).name:<38} {r['w']}x{r['h']} "
                  f" {r['ratio_lr']:5.1f} / {r['ratio_tb']:5.1f}   {r['light_dy']:+6.2f}")
        print("  (seam ratio ~1.0 = the wrap edge is as smooth as the texture itself)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
