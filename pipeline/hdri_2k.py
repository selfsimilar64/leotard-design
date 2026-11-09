"""Half-size copies of the studio HDRIs (assets/hdri/*_4k.hdr -> *_2k.hdr), which the app loads.

Owner, 2026-11-09: load a smaller HDRI to shorten the start. The 4K files (25 MB each) took most of a second
to decode and prefilter on the page; the lighting comes from the prefiltered environment, which is far smaller
than either, and the room backdrop is the only thing drawn from the full image (softer at 2K, accepted).

Each 2x2 block of linear radiance is averaged (cv2.INTER_AREA), so the total light is unchanged.
Run: python pipeline/hdri_2k.py   (rewrites every *_2k.hdr next to its *_4k.hdr)
"""
from pathlib import Path

import cv2
import numpy as np

HDRI = Path(__file__).resolve().parent.parent / "assets" / "hdri"


def main():
    for src in sorted(HDRI.glob("*_4k.hdr")):
        img = cv2.imread(str(src), cv2.IMREAD_UNCHANGED)
        assert img is not None and img.dtype == np.float32, src
        h, w = img.shape[:2]
        for k, tag in ((2, "2k"), (4, "1k")):
            small = cv2.resize(img, (w // k, h // k), interpolation=cv2.INTER_AREA)
            dst = src.with_name(src.name.replace("_4k.hdr", f"_{tag}.hdr"))
            cv2.imwrite(str(dst), small)
            print(f"{dst.name}: {w}x{h} -> {w // k}x{h // k}, mean {img.mean():.4f} -> {small.mean():.4f}, "
                  f"{src.stat().st_size / 1e6:.1f} MB -> {dst.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
