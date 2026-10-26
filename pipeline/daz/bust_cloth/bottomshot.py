import sys, seat_proto as SP, bust_proto as B, numpy as np, json, os, subprocess
from PIL import Image, ImageDraw, ImageFont
body, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
P = B.cage(body); L = SP.landmarks(P)
tgt = [0.0, 0.06, (L['cy'] + 2.5) * 0.01]
vs = [('back', 0, 180), ('low', -45, 180), ('under', -70, 180), ('b34low', -30, 145)]
items = []
for n in names:
	for v, e, a in vs:
		items.append(dict(obj=os.path.abspath('%s/%s.obj' % (out, n)), out=os.path.abspath('%s/b-%s-%s.png' % (out, n, v)), target=tgt, view='back34' if a == 145 else 'back', elev=e, ortho=0.16, dist=1.5))
json.dump(dict(res=[520, 520], items=items), open(out + '/bjobs.json', 'w'))
subprocess.run([B.BLENDER, '-b', '--factory-startup', '-P', B.S_DIR + '/render_blender.py', '--', os.path.abspath(out + '/bjobs.json')], capture_output=True)
G = Image.new('RGB', (len(vs) * 530, len(names) * 560), (245, 245, 243)); d = ImageDraw.Draw(G); f = ImageFont.truetype('arialbd.ttf', 20)
for j, n in enumerate(names):
	d.text((8, j * 560 + 8), n, fill=(20, 20, 20), font=f)
	for i, (v, e, a) in enumerate(vs): G.paste(Image.open('%s/b-%s-%s.png' % (out, n, v)), (i * 530, j * 560 + 36))
G.save(out + '/bottom.png')
