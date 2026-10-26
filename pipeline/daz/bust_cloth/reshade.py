import sys, json, os, subprocess
import bust_proto as B
from PIL import Image, ImageDraw, ImageFont
out, shade = sys.argv[1], sys.argv[2]; rows = sys.argv[3].split(',')
J = json.load(open(out + '/pjobs.json'))
for it in J['items']: it['out'] = it['out'].replace('.png', '-%s.png' % shade)
J['shade'] = shade
json.dump(J, open(out + '/pjobs-%s.json' % shade, 'w'))
r = subprocess.run([B.BLENDER, '-b', '--factory-startup', '-P', B.S_DIR + '/render_blender.py', '--', os.path.abspath(out + '/pjobs-%s.json' % shade)], capture_output=True, text=True)
if r.returncode: print(r.stderr[-2000:])
w, h = J['res']
cols = [(v, n) for v in ('back', 'low', 'b34') for n in ('today', 'seat')]
G = Image.new('RGB', (180 + len(cols) * (w + 6), 70 + len(rows) * (h + 6)), (245, 245, 243)); d = ImageDraw.Draw(G)
f = ImageFont.truetype('arialbd.ttf', 20); fs = ImageFont.truetype('arial.ttf', 18)
vn = {'back': 'From behind', 'low': 'From behind, low', 'b34': 'Three-quarter back'}
for i, (v, n) in enumerate(cols):
	x = 180 + i * (w + 6)
	if n == 'today': d.text((x, 8), vn[v], fill=(20, 20, 20), font=f)
	d.text((x + 4, 38), 'Today' if n == 'today' else 'Cleft cloth', fill=(40, 40, 40), font=fs)
for j, pz in enumerate(rows):
	d.text((10, 70 + j * (h + 6) + h / 2), pz, fill=(20, 20, 20), font=f, anchor='lm')
	for i, (v, n) in enumerate(cols): G.paste(Image.open('%s/%s-%s-%s-%s.png' % (out, pz, n, v, shade)), (180 + i * (w + 6), 70 + j * (h + 6)))
G.save('%s/poses-%s.png' % (out, shade))
