#!/usr/bin/env python3
"""Solstice pack builder (stdlib only).

Builds an assets pack folder (manifest.json + credits.txt + copied images)
from source images + depth map + meta.  See docs/PACKS_GUIDE.md section 4.

Usage (PowerShell):
  python tools/pack_builder.py --out app/assets/packs/mountains `
    --id pack.mountains --name-zh "中景山峦" --name-en "Mountains" --slot mid `
    --image scene.png --depth depth.png `
    --credit "Seedream 5.0 Pro | prompt: see tools/prompts | 2026-10-13"

  python tools/pack_builder.py --out app/assets/packs/trees `
    --id pack.trees --name-zh "四季树" --name-en "Trees" --slot near `
    --variant spring:spring.png --variant summer:summer.png `
    --credit "FLUX.2 klein + BiRefNet | 2026-10-13"
"""
import argparse
import json
import shutil
import struct
import sys
from pathlib import Path

VALID_SLOTS = {"sky", "far", "mid", "near", "foreground", "overlay"}


def png_size(path: Path):
    """Return (width, height) of a PNG via its IHDR chunk."""
    with path.open("rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n" or head[12:16] != b"IHDR":
        raise ValueError(f"not a valid PNG: {path}")
    w, h = struct.unpack(">II", head[16:24])
    return w, h


def check_image(path: Path, long_edge_min: int) -> tuple:
    """Validate a PNG; returns (w, h). Warns on small long edge."""
    if path.suffix.lower() != ".png":
        raise ValueError(f"pack assets must be PNG: {path}")
    w, h = png_size(path)
    if max(w, h) < long_edge_min:
        print(f"[warn] {path.name}: {w}x{h} long edge < {long_edge_min}px (below spec)")
    return w, h


def parse_variant(text: str) -> tuple:
    vid, _, file = text.partition(":")
    vid, file = vid.strip(), file.strip()
    if not vid or not file:
        raise argparse.ArgumentTypeError(f"variant must be id:file, got: {text}")
    return vid, file


def main() -> int:
    ap = argparse.ArgumentParser(description="Build a Solstice assets pack folder.")
    ap.add_argument("--out", required=True, help="output pack directory")
    ap.add_argument("--id", required=True, help="pack id, e.g. pack.mountains")
    ap.add_argument("--name-zh", required=True)
    ap.add_argument("--name-en", required=True)
    ap.add_argument("--slot", required=True, choices=sorted(VALID_SLOTS), help="layer slot")
    ap.add_argument("--image", help="scene image (whole-layer pack)")
    ap.add_argument("--depth", help="depth.png paired with --image (optional)")
    ap.add_argument("--variant", action="append", default=[], type=parse_variant,
                    help="variant id:file, repeatable (variant pack)")
    ap.add_argument("--credit", required=True,
                    help="credits line: model | prompt ref | date")
    args = ap.parse_args()

    if not args.image and not args.variant:
        ap.error("need --image (scene pack) or at least one --variant")
    if args.image and args.variant:
        ap.error("choose either a scene pack (--image) or variant pack (--variant), not both")
    if args.depth and not args.image:
        ap.error("--depth requires --image")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest = {
        "id": args.id,
        "api": 1,
        "name": {"zh": args.name_zh, "en": args.name_en},
        "slot": args.slot,
    }

    # scene pack
    if args.image:
        img = Path(args.image)
        iw, ih = check_image(img, 2048)
        shutil.copy2(img, out / "scene.png")
        scene = {"image": "scene.png"}
        if args.depth:
            dep = Path(args.depth)
            dw, dh = check_image(dep, 512)
            if (dw, dh) != (iw, ih):
                print(f"[warn] depth size {dw}x{dh} != scene size {iw}x{ih}")
            shutil.copy2(dep, out / "depth.png")
            scene["depth"] = "depth.png"
        manifest["scene"] = scene

    # variant pack
    for vid, file in args.variant:
        path = Path(file)
        check_image(path, 2048)
        shutil.copy2(path, out / f"{vid}.png")
        manifest.setdefault("variants", []).append({"id": vid, "image": f"{vid}.png"})

    (out / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "credits.txt").write_text(args.credit + "\n", encoding="utf-8")

    print(f"[ok] pack built: {out}")
    print(f"     manifest: {len(manifest.get('variants', [])) or 'scene'} entries, slot={args.slot}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
