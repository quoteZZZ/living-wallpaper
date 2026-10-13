#!/usr/bin/env python3
"""Solstice pack builder (stdlib only).

Builds an assets pack folder (manifest.json + credits.txt + copied images)
from source images + depth map + meta.  See docs/PACKS_GUIDE.md section 4.

The pack format lives in shared/pack.schema.json and the layer classes in
shared/slots.json -- this script validates against those, it does not own
a second copy of the contract.

Usage (PowerShell):
  python studio/tools/pack.py --out app/assets/packs/mountains `
    --id pack.mountains --name-zh "中景山峦" --name-en "Mountains" --slot mid `
    --image scene.png --depth depth.png `
    --credit "Seedream 5.0 Pro | prompt: studio/contract/sets/SET-01 | 2026-10-13"

  python studio/tools/pack.py --out app/assets/packs/trees `
    --id pack.trees --name-zh "四季树" --name-en "Trees" --slot near `
    --variant spring:spring.png --variant summer:summer.png `
    --credit "FLUX.2 klein + BiRefNet | studio/contract/sets/SET-02 | 2026-10-13"
"""
import argparse
import json
import re
import shutil
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]          # studio/tools/pack.py -> repo root
SHARED = ROOT / "shared"


def load_contract():
    """Read the shared pack contract; fails loudly if it is missing."""
    slots = json.loads((SHARED / "slots.json").read_text(encoding="utf-8"))
    schema = json.loads((SHARED / "pack.schema.json").read_text(encoding="utf-8"))
    return slots, schema


def check_manifest(manifest, slots, schema):
    """Minimal structural check against shared/pack.schema.json."""
    problems = []
    for key in schema.get("required", []):
        if key not in manifest:
            problems.append(f"missing required field: {key}")
    name = manifest.get("name") or {}
    for lang in ("zh", "en"):
        if not name.get(lang):
            problems.append(f"name.{lang} missing (双语红线, see STRUCTURE §3.8)")
    pattern = schema["properties"]["id"].get("pattern")
    if pattern and not re.match(pattern, str(manifest.get("id", ""))):
        problems.append(f"id {manifest.get('id')!r} does not match {pattern}")
    allowed = [c["id"] for c in slots.get("layerClasses", [])]
    if manifest.get("slot") not in allowed:
        problems.append(f"slot {manifest.get('slot')!r} not in shared/slots.json {allowed}")
    return problems


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
    slots, schema = load_contract()
    layer_classes = sorted(c["id"] for c in slots.get("layerClasses", []))

    ap = argparse.ArgumentParser(description="Build a Solstice assets pack folder.")
    ap.add_argument("--out", required=True, help="output pack directory")
    ap.add_argument("--id", required=True, help="pack id, e.g. pack.mountains")
    ap.add_argument("--name-zh", required=True)
    ap.add_argument("--name-en", required=True)
    ap.add_argument("--slot", required=True, choices=layer_classes,
                    help="layer class, see shared/slots.json")
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

    # 1. assemble the manifest and validate it against shared/ BEFORE touching files,
    #    so a rejected pack never leaves a half-written directory behind.
    manifest = {
        "id": args.id,
        "api": 1,
        "name": {"zh": args.name_zh, "en": args.name_en},
        "slot": args.slot,
    }
    if args.image:
        scene = {"image": "scene.png"}
        if args.depth:
            scene["depth"] = "depth.png"
        manifest["scene"] = scene
    for vid, _file in args.variant:
        manifest.setdefault("variants", []).append({"id": vid, "image": f"{vid}.png"})

    problems = check_manifest(manifest, slots, schema)
    if problems:
        for item in problems:
            print(f"[err] {item}")
        return 1

    # 2. validate the images, then copy
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    if args.image:
        img = Path(args.image)
        iw, ih = check_image(img, 2048)
        if args.depth:
            dep = Path(args.depth)
            dw, dh = check_image(dep, 512)
            if (dw, dh) != (iw, ih):
                print(f"[warn] depth size {dw}x{dh} != scene size {iw}x{ih}")
        shutil.copy2(img, out / "scene.png")
        if args.depth:
            shutil.copy2(Path(args.depth), out / "depth.png")
    for vid, file in args.variant:
        path = Path(file)
        check_image(path, 2048)
        shutil.copy2(path, out / f"{vid}.png")

    # 3. write the pack
    (out / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "credits.txt").write_text(args.credit + "\n", encoding="utf-8")

    kind = f"{len(manifest.get('variants', []))} variants" if manifest.get("variants") else "scene"
    print(f"[ok] pack built: {out}")
    print(f"     {manifest['id']} · slot={args.slot} · {kind} · schema={schema['title']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
