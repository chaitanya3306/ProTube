#!/usr/bin/env python3
"""Create a clean store-upload ZIP from validated extension runtime assets."""
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist"
OUT.mkdir(exist_ok=True)
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

# Keep the package simple and complete: all runtime JS/CSS, HTML, icons and manifest.
files = ["manifest.json", "popup.html", "options.html"]
for folder in ("js", "css", "icons"):
    files.extend(
        path.relative_to(ROOT).as_posix()
        for path in (ROOT / folder).rglob("*")
        if path.is_file()
    )

archive = OUT / f"protube-v{manifest['version']}-store.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
    for relative in sorted(set(files)):
        source = ROOT / relative
        if not source.is_file():
            raise FileNotFoundError(f"Runtime asset missing: {relative}")
        bundle.write(source, relative)

print(f"Created {archive.relative_to(ROOT)} with {len(files)} runtime files.")
