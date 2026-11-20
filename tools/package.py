"""Builds dist/tab-note-<version>.tar.gz for sharing.

Layout inside the archive:
  tab-note-<version>/README.md      install guide for friends
  tab-note-<version>/extension/     the folder containing manifest.json
                                    (this is what "Load unpacked" points at)

Run: python tools/package.py   (or: npm run package)
"""
import json
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
README = ROOT / "tools" / "dist-readme.md"
OUT = ROOT / "dist"


def main():
    manifest = json.loads((SRC / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    top = f"tab-note-{version}"
    OUT.mkdir(exist_ok=True)
    archive = OUT / f"{top}.tar.gz"

    def normalize(info):
        info.uid = info.gid = 0
        info.uname = info.gname = ""
        info.mtime = 0          # same input => same bytes
        info.mode = 0o755 if info.isdir() else 0o644
        return info

    readme_text = README.read_text(encoding="utf-8").replace("{{VERSION}}", version)
    readme_copy = OUT / "README.md"
    readme_copy.write_bytes(readme_text.replace("\r\n", "\n").encode("utf-8"))

    with tarfile.open(archive, "w:gz") as tar:
        tar.add(readme_copy, arcname=f"{top}/README.md", filter=normalize)
        for path in sorted(SRC.rglob("*")):
            rel = path.relative_to(SRC).as_posix()
            tar.add(path, arcname=f"{top}/extension/{rel}", recursive=False, filter=normalize)

    print(f"wrote {archive} ({archive.stat().st_size:,} bytes)")
    print(f"wrote {readme_copy}")


if __name__ == "__main__":
    main()
