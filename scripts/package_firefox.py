#!/usr/bin/env python3
"""Build a Firefox (AMO) package from the same source tree.

Differences from the Chromium build:
  * background.service_worker -> background.scripts (Firefox MV3 uses event pages)
  * browser_specific_settings.gecko with an add-on id and the required data-collection declaration

Run `python scripts/validate_extension.py` first, then:  python scripts/package_firefox.py
"""
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist"
OUT.mkdir(exist_ok=True)

manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

# Same load order the Chromium service worker uses via importScripts().
manifest["background"] = {
    "scripts": [
        "js/constants.js",
        "js/presets.js",
        "js/storage.js",
        "js/clickbait.js",
        "js/scoring.js",
        "js/youtube-api.js",
        "js/background.js",
    ]
}
manifest["browser_specific_settings"] = {
    "gecko": {
        "id": "protube@chaitanya3306.github.io",
        "strict_min_version": "140.0",
        # ProTube has zero telemetry; user data stays in browser storage.
        "data_collection_permissions": {"required": ["none"]},
    }
}

files = ["popup.html", "options.html"]
for folder in ("js", "css", "icons"):
    files.extend(
        p.relative_to(ROOT).as_posix()
        for p in (ROOT / folder).rglob("*")
        if p.is_file()
    )

archive = OUT / f"protube-v{manifest['version']}-firefox.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
    bundle.writestr("manifest.json", json.dumps(manifest, indent=2))
    for relative in sorted(set(files)):
        bundle.write(ROOT / relative, relative)

print(f"Created {archive.relative_to(ROOT)} with {len(files) + 1} files.")
