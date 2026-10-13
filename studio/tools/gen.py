#!/usr/bin/env python3
"""Solstice local generation client (stdlib only).

Talks to a local ComfyUI instance running FLUX.2 [klein] 4B fp8 and writes a
PNG.  This is the "foreground / interactive element" production endpoint from
docs/PACKS_GUIDE.md section 0 -- see also studio/contract/target-frames.md.

Graph shape mirrors the official ComfyUI template
`image_flux2_klein_text_to_image.json` (distilled 4-step branch):
  UNETLoader -> CFGGuider(cfg=1) -> SamplerCustomAdvanced(Flux2Scheduler)
  CLIPLoader(qwen_3_4b, flux2) / VAELoader(flux2-vae) -> VAEDecode -> SaveImage

NOTE: the distilled model runs with cfg=1, so its negative conditioning is
zeroed out and **negative prompts have no effect**.  Use the base model
(`--model flux-2-klein-base-4b-fp8.safetensors --cfg 5 --steps 20`) if you
need negatives to bite.

Usage (PowerShell), with ComfyUI already listening (see studio/tools/README.md):
  python studio/tools/gen.py --prompt "a lone oak tree" --out studio/work/oak.png

  python studio/tools/gen.py --prompt "..." --out studio/work/oak.png `
    --width 1920 --height 1080 --steps 4 --seed 42

  # base model + real negative prompt
  python studio/tools/gen.py --prompt "..." --negative "blurry, lowres" `
    --out studio/work/oak.png --model flux-2-klein-base-4b-fp8.safetensors --cfg 5 --steps 20

Reference / style-lock mode (FLUX.2 edit branch: the ref is VAE-encoded and
chained into the conditioning via ReferenceLatent, matching the official
`image_flux2_klein_image_edit_4b_distilled` template):
  python studio/tools/gen.py --prompt "..." --out studio/work/rock.png `
    --ref studio/frames/selected/S1.png --ref-crop 240,480,640,640

Batch file (JSON list, each entry = kwargs for one render, `ref`/`ref_crop`
included):
  python studio/tools/gen.py --batch studio/jobs/target-frames.json

Upscale an existing image to the frame spec (1920x1080 -> 3840x2160):
  python studio/tools/gen.py --from studio/work/a.png --to studio/frames/selected/S1.png `
    --max-edge 3840
"""
import argparse
import json
import struct
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

DEFAULT_SERVER = "http://127.0.0.1:8188"
DEFAULT_MODEL = "flux-2-klein-4b-fp8.safetensors"
DEFAULT_CLIP = "qwen_3_4b.safetensors"
DEFAULT_VAE = "flux2-vae.safetensors"
DEFAULT_UPSCALE = "RealESRGAN_x2plus.pth"


def snap16(value):
    """FLUX.2 patchifies 2x on a /8 latent, so frames land on a /16 grid."""
    return max(16, int(round(value / 16)) * 16)


def build_graph(prompt, negative, model, clip, vae, width, height, steps, seed, cfg,
                filename_prefix):
    """Return the ComfyUI API-format prompt graph."""
    lw, lh = snap16(width), snap16(height)
    graph = {
        "70": {"class_type": "UNETLoader",
               "inputs": {"unet_name": model, "weight_dtype": "default"}},
        "71": {"class_type": "CLIPLoader",
               "inputs": {"clip_name": clip, "type": "flux2"}},
        "72": {"class_type": "VAELoader", "inputs": {"vae_name": vae}},
        "66": {"class_type": "EmptyFlux2LatentImage",
               "inputs": {"width": lw, "height": lh, "batch_size": 1}},
        "62": {"class_type": "Flux2Scheduler",
               "inputs": {"steps": steps, "width": lw, "height": lh}},
        "61": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}},
        "73": {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
        "65": {"class_type": "VAEDecode", "inputs": {"samples": ["64", 0], "vae": ["72", 0]}},
    }

    graph["74"] = {"class_type": "CLIPTextEncode",
                   "inputs": {"text": prompt, "clip": ["71", 0]}}

    if cfg >= 2 or not negative:
        # either a real cfg (base model) -- keep both sides live
        if negative:
            graph["75"] = {"class_type": "CLIPTextEncode",
                           "inputs": {"text": negative, "clip": ["71", 0]}}
            neg_ref = ["75", 0]
        else:
            # no negative supplied -> zero it out, same as the distilled template
            graph["76"] = {"class_type": "ConditioningZeroOut",
                           "inputs": {"conditioning": ["74", 0]}}
            neg_ref = ["76", 0]
    else:
        graph["76"] = {"class_type": "ConditioningZeroOut",
                       "inputs": {"conditioning": ["74", 0]}}
        neg_ref = ["76", 0]

    graph["63"] = {"class_type": "CFGGuider",
                   "inputs": {"model": ["70", 0], "positive": ["74", 0],
                              "negative": neg_ref, "cfg": cfg}}
    graph["64"] = {"class_type": "SamplerCustomAdvanced",
                   "inputs": {"noise": ["73", 0], "guider": ["63", 0],
                              "sampler": ["61", 0], "sigmas": ["62", 0],
                              "latent_image": ["66", 0]}}

    images = ["65", 0]
    if (lw, lh) != (width, height):
        # the /16 grid ate a few pixels; hand back the exact requested frame
        graph["67"] = {"class_type": "ImageScale",
                       "inputs": {"image": images, "upscale_method": "lanczos",
                                  "width": width, "height": height,
                                  "crop": "disabled"}}
        images = ["67", 0]
    graph["9"] = {"class_type": "SaveImage",
                  "inputs": {"images": images, "filename_prefix": filename_prefix}}
    return graph


def parse_crop(text):
    """'x,y,w,h' -> (x, y, w, h)."""
    if text is None:
        return None
    if isinstance(text, (list, tuple)):
        return tuple(int(v) for v in text)
    parts = [p.strip() for p in str(text).split(",")]
    if len(parts) != 4:
        raise ValueError(f"--ref-crop must be x,y,w,h, got {text!r}")
    return tuple(int(p) for p in parts)


def build_edit_graph(prompt, negative, model, clip, vae, width, height, steps, seed,
                     cfg, filename_prefix, ref_name, ref_crop=None):
    """Reference-guided graph (style lock), per the official Klein edit template."""
    lw, lh = snap16(width), snap16(height)
    graph = {
        "70": {"class_type": "UNETLoader",
               "inputs": {"unet_name": model, "weight_dtype": "default"}},
        "71": {"class_type": "CLIPLoader",
               "inputs": {"clip_name": clip, "type": "flux2"}},
        "72": {"class_type": "VAELoader", "inputs": {"vae_name": vae}},
        "80": {"class_type": "LoadImage", "inputs": {"image": ref_name}},
        "83": {"class_type": "VAEEncode",
               "inputs": {"vae": ["72", 0]}},
        "66": {"class_type": "EmptyFlux2LatentImage",
               "inputs": {"width": lw, "height": lh, "batch_size": 1}},
        "62": {"class_type": "Flux2Scheduler",
               "inputs": {"steps": steps, "width": lw, "height": lh}},
        "61": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}},
        "73": {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
        "74": {"class_type": "CLIPTextEncode",
               "inputs": {"text": prompt, "clip": ["71", 0]}},
        "76": {"class_type": "ConditioningZeroOut",
               "inputs": {"conditioning": ["74", 0]}},
        "65": {"class_type": "VAEDecode",
               "inputs": {"samples": ["64", 0], "vae": ["72", 0]}},
    }
    ref_src = ["80", 0]
    if ref_crop:
        x, y, cw, chh = ref_crop
        graph["81"] = {"class_type": "ImageCrop",
                       "inputs": {"image": ref_src, "width": cw, "height": chh,
                                  "x": x, "y": y}}
        ref_src = ["81", 0]
    graph["82"] = {"class_type": "ImageScale",
                   "inputs": {"image": ref_src, "upscale_method": "lanczos",
                              "width": lw, "height": lh, "crop": "disabled"}}
    graph["83"]["inputs"]["pixels"] = ["82", 0]
    graph["77"] = {"class_type": "ReferenceLatent",
                   "inputs": {"conditioning": ["74", 0], "latent": ["83", 0]}}
    graph["78"] = {"class_type": "ReferenceLatent",
                   "inputs": {"conditioning": ["76", 0], "latent": ["83", 0]}}
    graph["63"] = {"class_type": "CFGGuider",
                   "inputs": {"model": ["70", 0], "positive": ["77", 0],
                              "negative": ["78", 0], "cfg": cfg}}
    graph["64"] = {"class_type": "SamplerCustomAdvanced",
                   "inputs": {"noise": ["73", 0], "guider": ["63", 0],
                              "sampler": ["61", 0], "sigmas": ["62", 0],
                              "latent_image": ["66", 0]}}

    images = ["65", 0]
    if (lw, lh) != (width, height):
        graph["67"] = {"class_type": "ImageScale",
                       "inputs": {"image": images, "upscale_method": "lanczos",
                                  "width": width, "height": height,
                                  "crop": "disabled"}}
        images = ["67", 0]
    graph["9"] = {"class_type": "SaveImage",
                  "inputs": {"images": images, "filename_prefix": filename_prefix}}
    return graph


def post_json(url, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_json(url, timeout=30):
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def server_stats(server):
    stats = get_json(server.rstrip("/") + "/system_stats", timeout=10)
    dev = stats["devices"][0]
    return dev


def run_graph(server, graph, out, timeout=900, quiet=False, note=""):
    """Submit an API graph, wait for it, download the first image to `out`."""
    client_id = str(uuid.uuid4())
    started = time.time()
    res = post_json(server.rstrip("/") + "/prompt",
                    {"prompt": graph, "client_id": client_id})
    job = res["prompt_id"]
    if not quiet:
        print(f"[..] queued {job}{(' ' + note) if note else ''}")

    history = None
    deadline = started + timeout
    while time.time() < deadline:
        time.sleep(2)
        try:
            history = get_json(f"{server.rstrip('/')}/history/{job}")
        except urllib.error.URLError:
            continue
        if history.get(job, {}).get("outputs"):
            break
    else:
        raise TimeoutError(f"no output after {timeout}s for job {job}")

    outputs = history[job]["outputs"]
    if history[job].get("status", {}).get("status_str") == "error":
        raise RuntimeError(f"job {job} failed: {history[job]['status']}")
    images = [im for node in outputs.values() for im in node.get("images", [])]
    if not images:
        raise RuntimeError(f"job {job} produced no images: {outputs}")

    im = images[0]
    q = urllib.parse.urlencode({"filename": im["filename"],
                                "subfolder": im.get("subfolder", ""),
                                "type": im.get("type", "output")})
    out_path = Path(out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(f"{server.rstrip('/')}/view?{q}", timeout=300) as resp:
        out_path.write_bytes(resp.read())

    elapsed = time.time() - started
    if not quiet:
        print(f"[ok] {out_path}  ({elapsed:.1f}s)")
    return out_path


def render(server, prompt, out, negative="", model=DEFAULT_MODEL, clip=DEFAULT_CLIP,
           vae=DEFAULT_VAE, width=1024, height=1024, steps=4, seed=42, cfg=1,
           timeout=900, quiet=False, ref=None, ref_crop=None):
    """Run one generation; returns the saved Path.

    With `ref` set this becomes the FLUX.2 edit branch (reference image guides
    the conditioning -> style lock); `ref_crop` = (x, y, w, h) region of it.
    """
    prefix = Path(out).stem
    if ref:
        ref_name = upload_image(server, str(ref))
        graph = build_edit_graph(prompt, negative, model, clip, vae, width, height,
                                 steps, seed, cfg, prefix, ref_name,
                                 parse_crop(ref_crop))
        note = (f"(edit ref={Path(str(ref)).name}, {width}x{height}, "
                f"steps={steps}, seed={seed})")
    else:
        graph = build_graph(prompt, negative, model, clip, vae, width, height, steps,
                            seed, cfg, prefix)
        note = f"({width}x{height}, steps={steps}, seed={seed})"
    return run_graph(server, graph, out, timeout=timeout, quiet=quiet, note=note)


def png_size(path):
    """Return (width, height) of a PNG via its IHDR chunk."""
    with Path(path).open("rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n" or head[12:16] != b"IHDR":
        raise ValueError(f"not a valid PNG: {path}")
    return struct.unpack(">II", head[16:24])


def upload_image(server, path):
    """Push a local PNG into ComfyUI's input folder; returns the stored name."""
    boundary = "----solstice" + uuid.uuid4().hex
    name = Path(path).name
    body = b"".join([
        f'--{boundary}\r\nContent-Disposition: form-data; name="image"; '
        f'filename="{name}"\r\nContent-Type: image/png\r\n\r\n'.encode("utf-8"),
        Path(path).read_bytes(),
        f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="overwrite"'
        f'\r\n\r\ntrue\r\n--{boundary}--\r\n'.encode("utf-8"),
    ])
    req = urllib.request.Request(
        server.rstrip("/") + "/upload/image", data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        meta = json.loads(resp.read().decode("utf-8"))
    sub = meta.get("subfolder") or ""
    return f"{sub}/{meta['name']}" if sub else meta["name"]


def build_upscale_graph(image_name, model, size, filename_prefix):
    """API graph: LoadImage -> ESRGAN -> (optional) Lanczos resize -> SaveImage."""
    graph = {
        "10": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "11": {"class_type": "UpscaleModelLoader", "inputs": {"model_name": model}},
        "12": {"class_type": "ImageUpscaleWithModel",
               "inputs": {"upscale_model": ["11", 0], "image": ["10", 0]}},
    }
    src = ["12", 0]
    if size:
        graph["13"] = {"class_type": "ImageScale",
                       "inputs": {"image": src, "upscale_method": "lanczos",
                                  "width": size[0], "height": size[1],
                                  "crop": "disabled"}}
        src = ["13", 0]
    graph["9"] = {"class_type": "SaveImage",
                  "inputs": {"images": src, "filename_prefix": filename_prefix}}
    return graph


def upscale(server, src, out, model=DEFAULT_UPSCALE, scale=2, max_edge=3840,
            timeout=1800, quiet=False):
    """Upscale a local PNG; returns the saved Path.

    `scale` is the model's own factor (RealESRGAN_x2plus = 2).  The result is
    resized down to `max_edge` on the long side when it overshoots.
    """
    w, h = png_size(src)
    up = (w * scale, h * scale)
    size = up
    if max_edge and max(up) > max_edge:
        k = max_edge / max(up)
        size = (int(round(up[0] * k / 8) * 8), int(round(up[1] * k / 8) * 8))
    name = upload_image(server, src)
    graph = build_upscale_graph(name, model, size, Path(out).stem)
    out_path = run_graph(server, graph, out, timeout=timeout, quiet=quiet,
                         note=f"({model} {w}x{h} -> {size[0]}x{size[1]})")
    return out_path


def build_seam_fix_graph(image_name, prompt, negative, model, clip, vae, w, h, band,
                         steps, seed, cfg, filename_prefix):
    """Inpaint the centre cross band of an already-rolled tile.

    ComfyUI core has no seamless node, so studio/tools/seamless.py rolls the
    render by half (wrap continuity by construction) and leaves a ridge where
    the old borders met.  This graph masks that ridge, re-denoises the band from
    noise with the rest of the tile as context and composites it back, so the
    tile borders stay untouched.
    """
    graph = {
        "70": {"class_type": "UNETLoader",
               "inputs": {"unet_name": model, "weight_dtype": "default"}},
        "71": {"class_type": "CLIPLoader",
               "inputs": {"clip_name": clip, "type": "flux2"}},
        "72": {"class_type": "VAELoader", "inputs": {"vae_name": vae}},
        "80": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "91": {"class_type": "SolidMask",
               "inputs": {"value": 0.0, "width": w, "height": h}},
        "92": {"class_type": "SolidMask",
               "inputs": {"value": 1.0, "width": band, "height": h}},
        "93": {"class_type": "SolidMask",
               "inputs": {"value": 1.0, "width": w, "height": band}},
        "94": {"class_type": "MaskComposite",
               "inputs": {"destination": ["91", 0], "source": ["92", 0],
                          "x": w // 2 - band // 2, "y": 0, "operation": "add"}},
        "95": {"class_type": "MaskComposite",
               "inputs": {"destination": ["94", 0], "source": ["93", 0],
                          "x": 0, "y": h // 2 - band // 2, "operation": "add"}},
        "86": {"class_type": "VAEEncodeForInpaint",
               "inputs": {"pixels": ["80", 0], "vae": ["72", 0], "mask": ["95", 0],
                          "grow_mask_by": 8}},
        "62": {"class_type": "Flux2Scheduler", "inputs": {"steps": steps,
                                                          "width": w, "height": h}},
        "61": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}},
        "73": {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
        "74": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt,
                                                          "clip": ["71", 0]}},
        "76": {"class_type": "ConditioningZeroOut",
               "inputs": {"conditioning": ["74", 0]}},
        "87": {"class_type": "VAEEncode",
               "inputs": {"pixels": ["80", 0], "vae": ["72", 0]}},
        "77": {"class_type": "ReferenceLatent",
               "inputs": {"conditioning": ["74", 0], "latent": ["87", 0]}},
        "78": {"class_type": "ReferenceLatent",
               "inputs": {"conditioning": ["76", 0], "latent": ["87", 0]}},
        "60": {"class_type": "CFGGuider",
               "inputs": {"model": ["70", 0], "positive": ["77", 0],
                          "negative": ["78", 0], "cfg": cfg}},
        "64": {"class_type": "SamplerCustomAdvanced",
               "inputs": {"noise": ["73", 0], "guider": ["60", 0],
                          "sampler": ["61", 0], "sigmas": ["62", 0],
                          "latent_image": ["86", 0]}},
        "65": {"class_type": "VAEDecode",
               "inputs": {"samples": ["64", 0], "vae": ["72", 0]}},
        "66": {"class_type": "ImageCompositeMasked",
               "inputs": {"destination": ["80", 0], "source": ["65", 0],
                          "x": 0, "y": 0, "resize_source": False, "mask": ["95", 0]}},
        "9": {"class_type": "SaveImage",
              "inputs": {"images": ["66", 0], "filename_prefix": filename_prefix}},
    }
    if negative:
        graph["75"] = {"class_type": "CLIPTextEncode",
                       "inputs": {"text": negative, "clip": ["71", 0]}}
        graph["78"]["inputs"]["conditioning"] = ["75", 0]
    return graph


def seam_fix(server, src, out, prompt, band=128, steps=4, seed=707,
             model=DEFAULT_MODEL, clip=DEFAULT_CLIP, vae=DEFAULT_VAE, cfg=1.0,
             negative="", timeout=900, quiet=False):
    """Rebuild the ridge of a rolled tile in place; returns the saved Path."""
    w, h = png_size(src)
    name = upload_image(server, src)
    graph = build_seam_fix_graph(name, prompt, negative, model, clip, vae, w, h,
                                 band, steps, seed, cfg, Path(out).stem)
    return run_graph(server, graph, out, timeout=timeout, quiet=quiet,
                     note=f"(seam fix {w}x{h}, band={band}, steps={steps})")


def job_from_entry(entry, server, base_dir):
    """Turn one --batch JSON entry into render() kwargs.

    Keys starting with `_` are bookkeeping only (card id, season, suit, ...)
    and are ignored, so a job file can double as the per-image disclosure
    record without breaking the render call.
    """
    out = Path(entry["out"])
    if not out.is_absolute():
        out = base_dir / out
    kwargs = {k: v for k, v in entry.items()
              if k != "out" and not k.startswith("_")}
    kwargs.setdefault("negative", "")
    kwargs["server"] = server
    return kwargs, out


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate an image via local ComfyUI (FLUX.2 klein).")
    ap.add_argument("--prompt", help="positive prompt")
    ap.add_argument("--negative", default="", help="negative prompt (base model only; inert at cfg=1)")
    ap.add_argument("--out", help="output PNG path")
    ap.add_argument("--server", default=DEFAULT_SERVER, help="ComfyUI base URL")
    ap.add_argument("--model", default=DEFAULT_MODEL, help="UNET file in models/diffusion_models")
    ap.add_argument("--clip", default=DEFAULT_CLIP, help="text encoder in models/text_encoders")
    ap.add_argument("--vae", default=DEFAULT_VAE, help="VAE in models/vae")
    ap.add_argument("--width", type=int, default=1024)
    ap.add_argument("--height", type=int, default=1024)
    ap.add_argument("--steps", type=int, default=4)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--cfg", type=float, default=1.0)
    ap.add_argument("--ref", help="reference image for style lock (FLUX.2 edit branch)")
    ap.add_argument("--ref-crop", dest="ref_crop",
                    help="region of --ref to use, as x,y,w,h")
    ap.add_argument("--timeout", type=int, default=900, help="seconds to wait for one image")
    ap.add_argument("--batch", help="JSON file: list of render() kwargs incl. out")
    ap.add_argument("--skip-existing", dest="skip_existing", action="store_true",
                    help="batch mode: skip entries whose --out already exists "
                         "(resume a long batch / only render new variants)")
    ap.add_argument("--from", dest="src", help="upscale mode: source PNG")
    ap.add_argument("--to", dest="dst", help="upscale mode: output PNG")
    ap.add_argument("--upscale-model", default=DEFAULT_UPSCALE,
                    help="model file in models/upscale_models")
    ap.add_argument("--scale", type=int, default=2,
                    help="the upscale model's own factor (x2plus = 2)")
    ap.add_argument("--max-edge", type=int, default=3840,
                    help="downscale the result to this long edge (0 = keep)")
    ap.add_argument("--check", action="store_true", help="print GPU/VRAM and exit")
    ap.add_argument("--seam-fix", dest="seam_fix",
                    help="seam-fix mode: rolled tile to rebuild (paired with --to)")
    ap.add_argument("--band", type=int, default=128,
                    help="seam-fix band width in px (default 128)")
    ap.add_argument("--seam-prompt", dest="seam_prompt",
                    help="seam-fix mode: prompt describing the same material")
    ap.add_argument("--seam-steps", dest="seam_steps", type=int, default=4,
                    help="seam-fix denoise steps (default 4 = full schedule)")
    args = ap.parse_args()

    if args.check:
        try:
            dev = server_stats(args.server)
        except Exception as exc:  # noqa: BLE001 - surface the real reason
            print(f"[err] cannot reach ComfyUI at {args.server}: {exc}")
            return 1
        print(f"[ok] {dev['name']}")
        print(f"     vram_free {dev['vram_free'] / 1024**2:.0f} MB / "
              f"{dev['vram_total'] / 1024**2:.0f} MB")
        return 0

    if args.seam_fix:
        if not (args.dst and args.seam_prompt):
            ap.error("seam-fix mode needs --seam-fix <in>, --to <out> and --seam-prompt")
        try:
            seam_fix(args.server, args.seam_fix, args.dst, args.seam_prompt,
                     band=args.band, steps=args.seam_steps, seed=args.seed,
                     model=args.model, clip=args.clip, vae=args.vae, cfg=args.cfg,
                     timeout=args.timeout)
        except Exception as exc:  # noqa: BLE001
            print(f"[err] {exc}")
            return 1
        return 0

    if args.src or args.dst:
        if not (args.src and args.dst):
            ap.error("upscale mode needs both --from and --to")
        try:
            upscale(args.server, args.src, args.dst, model=args.upscale_model,
                    scale=args.scale, max_edge=args.max_edge, timeout=args.timeout)
        except Exception as exc:  # noqa: BLE001 - single failure should exit non-zero
            print(f"[err] {exc}")
            return 1
        return 0

    if args.batch:
        path = Path(args.batch)
        entries = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(entries, list):
            print("[err] --batch file must contain a JSON list")
            return 1
        failures = 0
        skipped = 0
        for i, entry in enumerate(entries, 1):
            kwargs, out = job_from_entry(entry, args.server, Path.cwd())
            if args.skip_existing and out.exists():
                skipped += 1
                print(f"[{i}/{len(entries)}] {out.name} (exists, skipped)")
                continue
            print(f"[{i}/{len(entries)}] {out.name}")
            try:
                render(**kwargs, out=out, timeout=args.timeout)
            except Exception as exc:  # noqa: BLE001 - keep going, report at the end
                failures += 1
                print(f"[err] {out.name}: {exc}")
        print(f"[done] {len(entries) - failures - skipped}/{len(entries) - skipped} ok"
              f"{f', {skipped} skipped' if skipped else ''}")
        return 1 if failures else 0

    if not args.prompt or not args.out:
        ap.error("--prompt and --out are required (or use --batch / --check)")

    try:
        render(args.server, args.prompt, args.out, negative=args.negative,
               model=args.model, clip=args.clip, vae=args.vae, width=args.width,
               height=args.height, steps=args.steps, seed=args.seed, cfg=args.cfg,
               timeout=args.timeout, ref=args.ref, ref_crop=args.ref_crop)
    except Exception as exc:  # noqa: BLE001 - single failure should exit non-zero
        print(f"[err] {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
