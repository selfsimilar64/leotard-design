# Pixel parity of a WebGPU capture set against the WebGL baseline (knowledge/engineering/rendering/webgl-baseline-captures.md).
# usage: python app/test/webgpu-parity/compare.py <tag> [group] [name-filter]   (captures in app/captures/baseline-<tag>/)
# Prints per shot: mean absolute difference (0-255, all channels), share of pixels off by more than 8/255, and writes a side
# by side sheet (WebGL left, WebGPU right) per shot into app/captures/parity-<tag>/.
import sys, os
from PIL import Image, ImageChops

root = os.path.join(os.path.dirname(__file__), '..', '..', 'captures')
tag = sys.argv[1]
group = sys.argv[2] if len(sys.argv) > 2 else None
filt = sys.argv[3] if len(sys.argv) > 3 else ''
src, ref, out = (os.path.join(root, d) for d in (f'baseline-{tag}', 'baseline-webgl', f'parity-{tag}'))
rows = []
for g in sorted(os.listdir(src)):
	if not os.path.isdir(os.path.join(src, g)) or (group and g != group): continue
	for f in sorted(os.listdir(os.path.join(src, g))):
		if not f.endswith('.png') or filt not in f: continue
		r = os.path.join(ref, g, f)
		if not os.path.exists(r): rows.append((g, f, None, None)); continue
		a = Image.open(r).convert('RGB'); b = Image.open(os.path.join(src, g, f)).convert('RGB')
		if a.size != b.size: rows.append((g, f, 'size', None)); continue
		d = ImageChops.difference(a, b)
		hist = d.convert('L').histogram()
		n = a.size[0] * a.size[1]
		mean = sum(i * c for i, c in enumerate(hist)) / n
		over = sum(hist[9:]) / n
		rows.append((g, f, mean, over))
		os.makedirs(os.path.join(out, g), exist_ok=True)
		s = Image.new('RGB', (a.width * 2, a.height)); s.paste(a, (0, 0)); s.paste(b, (a.width, 0))
		s.thumbnail((1600, 1000)); s.save(os.path.join(out, g, f.replace('.png', '.jpg')), quality=88)
for g, f, m, o in rows:
	print(f'{g}/{f:40s}', 'no baseline' if m is None else 'size differs' if m == 'size' else f'mean {m:5.1f}  >8/255 {o * 100:5.1f}%')
