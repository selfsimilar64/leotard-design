# Parity summary of a WebGPU capture set against the WebGL baseline, per group: shots compared, the median and worst mean
# difference (0-255, all channels), and every shot over a threshold. usage: python app/test/webgpu-parity/report.py <tag> [threshold]
import sys, os, statistics
from PIL import Image, ImageChops

root = os.path.join(os.path.dirname(__file__), '..', '..', 'captures')
tag = sys.argv[1]
thr = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
src, ref = os.path.join(root, f'baseline-{tag}'), os.path.join(root, 'baseline-webgl')
groups = {}
for g in sorted(os.listdir(src)):
	if not os.path.isdir(os.path.join(src, g)): continue
	for f in sorted(os.listdir(os.path.join(src, g))):
		r = os.path.join(ref, g, f)
		if not f.endswith('.png') or not os.path.exists(r): continue
		a = Image.open(r).convert('RGB'); b = Image.open(os.path.join(src, g, f)).convert('RGB')
		if a.size != b.size: continue
		h = ImageChops.difference(a, b).convert('L').histogram(); n = a.size[0] * a.size[1]
		groups.setdefault(g, []).append((f[:-4], sum(i * c for i, c in enumerate(h)) / n, sum(h[9:]) / n))
print('| group | shots | median | worst |')
print('|---|---|---|---|')
for g, rows in groups.items():
	w = max(rows, key=lambda x: x[1])
	print(f'| {g} | {len(rows)} | {statistics.median(x[1] for x in rows):.1f} | {w[1]:.1f} ({w[0]}) |')
print()
for g, rows in groups.items():
	for name, m, o in rows:
		if m > thr: print(f'{g}/{name}: mean {m:.1f}, {o * 100:.1f}% of pixels off by more than 8/255')
