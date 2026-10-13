#!/usr/bin/env python3
"""Solstice local generation client (stdlib only).

Talks to a local ComfyUI instance running FLUX.2 [klein] 4B fp8 and writes a
PNG.  This is the "foreground / interactive element" production endpoint from
docs/PACKS_GUIDE.md section 0 -- see also tools/prompts/target-frames.md.

Graph shape mirrors the official ComfyUI template
`image_flux2_klein_text_to_image.json` (distilled 4-step branch):
  UNETLoader -> CFGGuider(cfg=1) -> SamplerCustomAdvanced(Flux2Scheduler)
  CLIPLoader(qwen_3_4b, flux2) / VAELoader(flux2-vae) -> VAEDecode -> SaveImage

NOTE: the distilled model runs with cfg=1, so its negative conditioning is
zeroed out and **negative prompts have no effect**.  Use the base model
(`--model flux-2-klein-base-4b-fp8.safetensors --cfg 5 --steps 20`) if you
need negatives to bite.

Usage (PowerShell), with ComfyUI already listening:
  python tools/gen/local_flux.py --prompt "a lone oak tree" --out tmp/oak.png

  python tools/gen/local_flux.py --prompt "..." --out tmp/oak.png `
    --width 1344 --height 768 --steps 4 --seed 42

  # base model + real negative prompt
  python tools/gen/local_flux.py --prompt "..." --negative "blurry, lowres" `
    --out tmp/oak.png --model flux-2-klein-base-4b-fp8.safetensors --cfg 5 --steps 20

Batch file (JSON list, each entry = kwargs for one render):
  python tools/gen/local_flux.py --batch tools/gen/jobs/example.json
"""
import argparse
import json
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


def build_graph(prompt, negative, model, clip, vae, width, height, steps, seed, cfg,
                filename_prefix):
    """Return the ComfyUI API-format prompt graph."""
    graph = {
        "70": {"class_type": "UNETLoader",
               "inputs": {"unet_name": model, "weight_dtype": "default"}},
        "71": {"class_type": "CLIPLoader",
               "inputs": {"clip_name": clip, "type": "flux2"}},
        "72": {"class_type": "VAELoader", "inputs": {"vae_name": vae}},
        "66": {"class_type": "EmptyFlux2LatentImage",
               "inputs": {"width": width, "height": height, "batch_size": 1}},
        "62": {"class_type": "Flux2Scheduler",
               "inputs": {"steps": steps, "width": width, "height": height}},
        "61": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}},
        "73": {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
        "65": {"class_type": "VAEDecode", "inputs": {"samples": ["64", 0], "vae": ["72", 0]}},
        "9": {"class_type": "SaveImage",
              "inputs": {"images": ["65", 0], "filename_prefix": filename_prefix}},
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


def render(server, prompt, out, negative="", model=DEFAULT_MODEL, clip=DEFAULT_CLIP,
           vae=DEFAULT_VAE, width=1024, height=1024, steps=4, seed=42, cfg=1,
           timeout=900, quiet=False):
    """Run one generation; returns the saved Path."""
    prefix = Path(out).stem
    graph = build_graph(prompt, negative, model, clip, vae, width, height, steps,
                        seed, cfg, prefix)
    client_id = str(uuid.uuid4())
    started = time.time()
    res = post_json(server.rstrip("/") + "/prompt",
                    {"prompt": graph, "client_id": client_id})
    job = res["prompt_id"]
    if not quiet:
        print(f"[..] queued {job} ({width}x{height}, steps={steps}, seed={seed})")

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
    images = [im for node in outputs.values() for im in node.get("images", [])]
    if not images:
        raise RuntimeError(f"job {job} produced no images: {outputs}")

    im = images[0]
    q = urllib.parse.urlencode({"filename": im["filename"],
                                "subfolder": im.get("subfolder", ""),
                                "type": im.get("type", "output")})
    out_path = Path(out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(f"{server.rstrip('/')}/view?{q}", timeout=120) as resp:
        out_path.write_bytes(resp.read())

    elapsed = time.time() - started
    if not quiet:
        print(f"[ok] {out_path}  ({elapsed:.1f}s)")
    return out_path


def job_from_entry(entry, server, base_dir):
    """Turn one --batch JSON entry into render() kwargs."""
    out = Path(entry["out"])
    if not out.is_absolute():
        out = base_dir / out
    kwargs = {k: v for k, v in entry.items() if k != "out"}
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
    ap.add_argument("--timeout", type=int, default=900, help="seconds to wait for one image")
    ap.add_argument("--batch", help="JSON file: list of render() kwargs incl. out")
    ap.add_argument("--check", action="store_true", help="print GPU/VRAM and exit")
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

    if args.batch:
        path = Path(args.batch)
        entries = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(entries, list):
            print("[err] --batch file must contain a JSON list")
            return 1
        failures = 0
        for i, entry in enumerate(entries, 1):
            kwargs, out = job_from_entry(entry, args.server, Path.cwd())
            print(f"[{i}/{len(entries)}] {out.name}")
            try:
                render(**kwargs, out=out, timeout=args.timeout)
            except Exception as exc:  # noqa: BLE001 - keep going, report at the end
                failures += 1
                print(f"[err] {out.name}: {exc}")
        print(f"[done] {len(entries) - failures}/{len(entries)} ok")
        return 1 if failures else 0

    if not args.prompt or not args.out:
        ap.error("--prompt and --out are required (or use --batch / --check)")

    try:
        render(args.server, args.prompt, args.out, negative=args.negative,
               model=args.model, clip=args.clip, vae=args.vae, width=args.width,
               height=args.height, steps=args.steps, seed=args.seed, cfg=args.cfg,
               timeout=args.timeout)
    except Exception as exc:  # noqa: BLE001 - single failure should exit non-zero
        print(f"[err] {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
