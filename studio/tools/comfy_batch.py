#!/usr/bin/env python3
"""Solstice studio - batch ComfyUI driver.

Reads a job list (jsonl) and a ComfyUI API-format workflow template, queues every job against a
running ComfyUI, copies the results into studio/out/<subdir>/ and appends one line per produced
file to studio/out/manifest.jsonl.

The manifest is the point: storefronts require disclosure of AI-generated content, and the repo
rule is that generated media never enters git but its manifest always does
(see docs/tech/STRUCTURE.md SS4 and .gitignore section 3).

Standard library only, so it runs with any Python on the machine.

Usage
-----
    python studio/tools/comfy_batch.py --check
    python studio/tools/comfy_batch.py --jobs studio/jobs/paper-textures.jsonl
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STUDIO_OUT = os.path.join(REPO_ROOT, "studio", "out")
MANIFEST = os.path.join(STUDIO_OUT, "manifest.jsonl")

DEFAULT_HOST = "http://127.0.0.1:8188"
DEFAULT_WORKFLOW = os.path.join(REPO_ROOT, "studio", "workflows", "paper-texture.json")
DEFAULT_PRESET = os.path.join(REPO_ROOT, "studio", "presets", "paper-diorama.json")


def post_json(url: str, payload: dict, timeout: float = 30.0) -> dict:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def get_json(url: str, timeout: float = 30.0) -> dict:
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def check(host: str) -> int:
    try:
        stats = get_json(f"{host}/system_stats", timeout=5.0)
    except (urllib.error.URLError, OSError) as error:
        print(f"[solstice] ComfyUI is not reachable at {host}: {error}")
        print("          start it with D:\\ComfyUI\\run_nvidia_gpu.bat")
        return 1

    devices = stats.get("devices") or []
    for device in devices:
        print(f"[solstice] device: {device.get('name')} vram={device.get('vram_total')}")

    info = get_json(f"{host}/object_info", timeout=20.0)
    loaders = info.get("CheckpointLoaderSimple", {}).get("input", {}).get("required", {})
    choices = loaders.get("ckpt_name", [[]])[0]
    if not choices:
        print("[solstice] no checkpoint installed under D:\\ComfyUI\\models\\checkpoints")
        print("          the pipeline is ready; it just has nothing to draw with yet")
        return 2

    print(f"[solstice] {len(choices)} checkpoint(s): {', '.join(choices[:6])}")
    return 0


def load_preset(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def build_prompt(preset: dict, job: dict) -> tuple[str, str]:
    subject_key = job.get("subject", "paper-texture")
    subject = preset["subjects"].get(subject_key)
    if subject is None:
        raise SystemExit(f"[solstice] unknown subject '{subject_key}' in preset")

    positive = ", ".join([subject["prompt"]] + preset["words"] + job.get("extra", []))
    negative = ", ".join(preset["negative"] + job.get("extra_negative", []))
    return positive, negative


def fill_template(template: dict, job: dict, preset: dict, model: str, positive: str, negative: str) -> dict:
    subject = preset["subjects"][job.get("subject", "paper-texture")]
    width, height = job.get("size") or subject.get("size") or [512, 512]

    substitutions = {
        "__MODEL__": model,
        "__POSITIVE__": positive,
        "__NEGATIVE__": negative,
        "__WIDTH__": width,
        "__HEIGHT__": height,
        "__SEED__": job.get("seed", 0),
        "__STEPS__": job.get("steps", 24),
        "__CFG__": job.get("cfg", 6.0),
        "__PREFIX__": job.get("prefix", "solstice/" + job["out"]),
    }

    def walk(node):
        if isinstance(node, dict):
            return {key: walk(value) for key, value in node.items()}
        if isinstance(node, list):
            return [walk(item) for item in node]
        if isinstance(node, str) and node in substitutions:
            return substitutions[node]
        return node

    return walk(template)


def sha256_of(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def wait_for_result(host: str, prompt_id: str, timeout: float = 900.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        history = get_json(f"{host}/history/{prompt_id}", timeout=30.0)
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(1.0)
    raise TimeoutError(f"prompt {prompt_id} did not finish within {timeout:.0f}s")


def main() -> int:
    parser = argparse.ArgumentParser(description="Solstice studio batch driver")
    parser.add_argument("--check", action="store_true", help="probe ComfyUI and list checkpoints")
    parser.add_argument("--jobs", help="jsonl job list")
    parser.add_argument("--workflow", default=DEFAULT_WORKFLOW)
    parser.add_argument("--preset", default=DEFAULT_PRESET)
    parser.add_argument("--host", default=os.environ.get("COMFY_HOST", DEFAULT_HOST))
    parser.add_argument("--model", help="checkpoint filename; defaults to the first installed one")
    parser.add_argument("--comfy-output", default=os.environ.get("COMFY_OUTPUT", r"D:\ComfyUI\output"))
    args = parser.parse_args()

    if args.check or not args.jobs:
        return check(args.host)

    preset = load_preset(args.preset)
    with open(args.workflow, "r", encoding="utf-8") as handle:
        template = json.load(handle)

    model = args.model
    if not model:
        info = get_json(f"{args.host}/object_info", timeout=20.0)
        choices = info["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0]
        if not choices:
            print("[solstice] no checkpoint installed; nothing to do")
            return 2
        model = choices[0]

    os.makedirs(STUDIO_OUT, exist_ok=True)
    produced = 0

    with open(args.jobs, "r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line or line.startswith("//"):
                continue
            job = json.loads(line)
            positive, negative = build_prompt(preset, job)
            prompt = fill_template(template, job, preset, model, positive, negative)

            print(f"[solstice] {line_number}: {job['out']} ({job.get('subject')})")
            response = post_json(f"{args.host}/prompt", {"prompt": prompt})
            prompt_id = response.get("prompt_id")
            if not prompt_id:
                print(f"[solstice]   rejected: {response}")
                continue

            result = wait_for_result(args.host, prompt_id)
            outputs = result.get("outputs", {})
            for node in outputs.values():
                for image in node.get("images", []):
                    subfolder = image.get("subfolder", "")
                    source = os.path.join(args.comfy_output, subfolder, image["filename"])
                    if not os.path.isfile(source):
                        print(f"[solstice]   missing output file {source}")
                        continue

                    destination_dir = os.path.join(STUDIO_OUT, job.get("subdir", "textures"))
                    os.makedirs(destination_dir, exist_ok=True)
                    destination = os.path.join(destination_dir, job["out"] + os.path.splitext(image["filename"])[1])
                    shutil.copy2(source, destination)

                    entry = {
                        "file": os.path.relpath(destination, REPO_ROOT).replace("\\", "/"),
                        "sha256": sha256_of(destination),
                        "subject": job.get("subject"),
                        "preset": preset["id"],
                        "model": model,
                        "seed": job.get("seed", 0),
                        "steps": job.get("steps", 24),
                        "prompt": positive,
                        "negative": negative,
                        "generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                        "tool": "studio/tools/comfy_batch.py",
                    }
                    with open(MANIFEST, "a", encoding="utf-8") as manifest:
                        manifest.write(json.dumps(entry, ensure_ascii=False) + "\n")
                    produced += 1
                    print(f"[solstice]   -> {entry['file']}")

    print(f"[solstice] done, {produced} file(s) logged to studio/out/manifest.jsonl")
    return 0


if __name__ == "__main__":
    sys.exit(main())
