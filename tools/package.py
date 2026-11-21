"""Packages the BUILT extension (dist/extension) for sharing.

Run `npm run build` first (or just `npm run package`, which does both).

Writes, next to dist/extension:
  dist/tab-note-<version>.tar.gz   for friends: README.md + extension/ folder
  dist/tab-note-<version>.zip      the extension folder itself, ready for a store upload

Layout inside the tar.gz:
  tab-note-<version>/README.md      install guide
  tab-note-<version>/extension/     the folder containing manifest.json
                                    (this is what "Load unpacked" points at)
"""
import json
import sys
import tarfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "dist" / "extension"
README = ROOT / "tools" / "dist-readme.md"
OUT = ROOT / "dist"


def normalize(info):
    info.uid = info.gid = 0
    info.uname = info.gname = ""
    info.mtime = 0  # same input => same bytes
    info.mode = 0o755 if info.isdir() else 0o644
    return info


def main():
    if not (BUILD / "manifest.json").exists():
        sys.exit("dist/extension/manifest.json not found. Run `npm run build` first.")

    version = json.loads((BUILD / "manifest.json").read_text(encoding="utf-8"))["version"]
    top = f"tab-note-{version}"

    readme_text = README.read_text(encoding="utf-8").replace("{{VERSION}}", version)
    readme_copy = OUT / "README.md"
    readme_copy.write_bytes(readme_text.replace("\r\n", "\n").encode("utf-8"))

    files = sorted(p for p in BUILD.rglob("*") if p.is_file())

    tar_path = OUT / f"{top}.tar.gz"
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(readme_copy, arcname=f"{top}/README.md", filter=normalize)
        for path in files:
            rel = path.relative_to(BUILD).as_posix()
            tar.add(path, arcname=f"{top}/extension/{rel}", recursive=False, filter=normalize)

    zip_path = OUT / f"{top}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for path in files:
            info = zipfile.ZipInfo(path.relative_to(BUILD).as_posix(), date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, path.read_bytes())

    print(f"wrote {tar_path} ({tar_path.stat().st_size:,} bytes)")
    print(f"wrote {zip_path} ({zip_path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
