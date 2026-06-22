#!/usr/bin/env python3
"""Score AI-styled QR codes for scannability (0-100). Prototype."""
import sys
from pathlib import Path
from PIL import Image
import scorer

_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def _gather(target: Path) -> list[Path]:
    if target.is_dir():
        return sorted(p for p in target.iterdir() if p.suffix.lower() in _EXTS)
    return [target]


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: python score_qr.py <image-or-folder>")
        return 2
    paths = _gather(Path(argv[1]))
    if not paths:
        print("No images found.")
        return 1
    results = []
    for path in paths:
        try:
            with Image.open(path) as img:
                img.load()
                res = scorer.score_image(img, path.name)
        except Exception as exc:
            print(f"  WARNING: skipping {path.name} — {exc}")
            print()
            continue
        results.append(res)
        print(scorer.format_result(res))
        print()
    print("=" * 48)
    print("SUMMARY (weakest first)")
    for res in sorted(results, key=lambda r: r.score):
        print(f"  {res.score:6.1f}  [{res.band:<22}]  {res.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
