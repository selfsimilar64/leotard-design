import sys, seat_proto as SP, bust_proto as B, numpy as np, json, os, subprocess
from PIL import Image, ImageDraw, ImageFont
body, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
P = B.cage(body); L = SP.landmarks(P)
tgt = [0.0, 0.12, (L['cy'] + 5) * 0.01]
items = []
for n in names:
	for v, e in (('back', 0), ('low', -40)):
		items.append(dict(obj=os.path.abspath('%s/%s.obj' % (out, n)), out=os.path.abspath('%s/c-%s-%s.png' % (out, n, v)), target=tgt, view=v, elev=e, ortho=0.14, dist=1.5))
json.dump(dict(res=[600, 600], items=items), open(out + '/cjobs.json', 'w'))
subprocess.run([B.BLENDER, '-b', '--factory-startup', '-P', B.S_DIR + '/render_blender.py', '--', os.path.abspath(out + '/cjobs.json')], capture_output=True)
G = Image.new('RGB', (2 * 612, len(names) * 640), (245, 245, 243)); d = ImageDraw.Draw(G); f = ImageFont.truetype('arialbd.ttf', 20)
for j, n in enumerate(names):
	d.text((8, j * 640 + 8), n, fill=(20, 20, 20), font=f)
	for i, v in enumerate(('back', 'low')): G.paste(Image.open('%s/c-%s-%s.png' % (out, n, v)), (i * 612, j * 640 + 36))
G.save(out + '/close.png')
