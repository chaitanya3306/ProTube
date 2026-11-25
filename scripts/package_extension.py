#!/usr/bin/env python3
"""Create a clean store-upload ZIP from the validated extension source."""
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist"
OUT.mkdir(exist_ok=True)
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

# Only ship runtime assets. Repository documentation, tests and CI files stay out.
files = ["manifest.json"]
for key in ("icons",):
    files.extend(manifest.get(key, {}).values())
action = manifest.get("action", {})
files.extend([action.get("default_popup", "")])
files.extend(action.get("default_icon", {}).values())
options_page = manifest.get("options_ui", {}).get("page")
if options_page:
    files.append(options_page)
background = manifest.get("background", {}).get("service_worker")
if background:
    files.append(background)
for item in manifest.get("content_scripts", []):
    files.extend(item.get("js", []))
    files.extend(item.get("css", []))

files = sorted({p for p in files if p})
archive = OUT / f"protube-v{manifest['version']}-store.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
    for relative in files:
        source = ROOT / relative
        if not source.is_file():
            raise FileNotFoundError(f"Manifest runtime asset missing: {relative}")
        bundle.write(source, relative)

print(f"Created {archive.relative_to(ROOT)} with {len(files)} runtime files.")
