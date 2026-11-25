#!/usr/bin/env python3
"""Validate the unpacked Chromium extension before packaging."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / "manifest.json"
errors = []

def require_file(relative, label):
    path = ROOT / relative
    if not path.is_file():
        errors.append(f"{label} is missing: {relative}")

try:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"Invalid manifest.json: {exc}", file=sys.stderr)
    raise SystemExit(1)

if manifest.get("manifest_version") != 3:
    errors.append("manifest_version must be 3")
if not manifest.get("name"):
    errors.append("manifest name is required")
if not manifest.get("version") or not re.fullmatch(r"\d+\.\d+\.\d+(?:\.\d+)?", manifest["version"]):
    errors.append("version must be a dotted numeric version")
if len(manifest.get("description", "")) > 132:
    errors.append("manifest description must be 132 characters or fewer")

for size, path in manifest.get("icons", {}).items():
    require_file(path, f"{size}px icon")
action = manifest.get("action", {})
if action.get("default_popup"):
    require_file(action["default_popup"], "Action popup")
for path in action.get("default_icon", {}).values():
    require_file(path, "Action icon")
options = manifest.get("options_ui", {}).get("page")
if options:
    require_file(options, "Options page")
background = manifest.get("background", {}).get("service_worker")
if background:
    require_file(background, "Service worker")
for script in manifest.get("content_scripts", []):
    for path in script.get("js", []):
        require_file(path, "Content script")
    for path in script.get("css", []):
        require_file(path, "Content stylesheet")

allowed_permissions = {"storage"}
unexpected = set(manifest.get("permissions", [])) - allowed_permissions
if unexpected:
    errors.append(f"Review unexpected permissions: {', '.join(sorted(unexpected))}")

if errors:
    print("Extension validation FAILED:")
    for error in errors:
        print(f" - {error}")
    raise SystemExit(1)

print(f"Extension validation passed (Manifest V{manifest['manifest_version']}, version {manifest['version']}).")
