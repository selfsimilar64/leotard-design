# Contact sheet: per preset a row, columns old / current / peaks, a 6 x 6 cm window of the flat piece.
# Overlapping stones (closer than 0.92 of touching) outlined red.
import json, sys, math
from PIL import Image, ImageDraw, ImageFont

out_dir = sys.argv[1]
keys = sys.argv[2].split(',')
stones = json.load(open(out_dir + '/stones.json'))
W = 0.06          # window (metres)
PX = 300          # pixels per window
S = PX / W
cols = ['old', 'current', 'peaks']
titles = {'old': 'Before (one-by-one check)', 'current': 'Now (overlap allowed)', 'peaks': 'Parallel rule'}
head = 34
sheet = Image.new('RGB', (180 + 3 * (PX + 12), head + len(keys) * (PX + 12)), (247, 245, 241))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('arial.ttf', 15)
except Exception:
    font = ImageFont.load_default()
for c, col in enumerate(cols):
    d.text((180 + c * (PX + 12) + 6, 8), titles[col], fill=(40, 37, 33), font=font)

def overlapping(lst):
    bad = set()
    cell = 0.006
    grid = {}
    for i, s in enumerate(lst):
        grid.setdefault((math.floor(s['u'] / cell), math.floor(s['v'] / cell)), []).append(i)
    for i, s in enumerate(lst):
        cx, cy = math.floor(s['u'] / cell), math.floor(s['v'] / cell)
        for a in range(-2, 3):
            for b in range(-2, 3):
                for j in grid.get((cx + a, cy + b), []):
                    if j <= i:
                        continue
                    o = lst[j]
                    if math.hypot(o['u'] - s['u'], o['v'] - s['v']) < (o['size'] + s['size']) / 2 * 0.92:
                        bad.add(i); bad.add(j)
    return bad

for r, key in enumerate(keys):
    y0 = head + r * (PX + 12)
    n = {col: len(stones[key][col]) for col in cols}
    d.text((10, y0 + 10), key, fill=(40, 37, 33), font=font)
    for c, col in enumerate(cols):
        lst = stones[key][col]
        bad = overlapping(lst)
        x0 = 180 + c * (PX + 12)
        tile = Image.new('RGB', (PX * 2, PX * 2), (136, 37, 65))
        t = ImageDraw.Draw(tile)
        # window: centred a little off the middle, so crossings and lines both show
        cu, cv = 0.011, 0.007
        for i, s in enumerate(lst):
            x = (s['u'] - cu + W / 2) * S * 2
            y = (cv + W / 2 - s['v']) * S * 2
            rr = s['size'] / 2 * S * 2
            if x < -rr or y < -rr or x > PX * 2 + rr or y > PX * 2 + rr:
                continue
            t.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(233, 205, 92), outline=(220, 30, 30) if i in bad else (60, 50, 30), width=3 if i in bad else 1)
        tile = tile.resize((PX, PX), Image.LANCZOS)
        sheet.paste(tile, (x0, y0))
        d.text((x0 + 6, y0 + PX - 20), f'{n[col]} stones, {len(bad)} overlapping', fill=(255, 255, 255), font=font)
sheet.save(out_dir + '/spacing-compare.png')
print('saved', sheet.size)
