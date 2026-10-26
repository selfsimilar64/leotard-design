# Normal-shaded comparison sheet: rows = poses, columns = views x variants (saved results).
import sys, os, json, subprocess, numpy as np
import bust_proto as B, seat_proto as SP, diag as Dg
from bust_proto import g9
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]; body = sys.argv[2]; poses = sys.argv[3].split(','); variants = sys.argv[4].split(',')
shade = sys.argv[5] if len(sys.argv) > 5 else 'normal'
views = (sys.argv[6] if len(sys.argv) > 6 else 'back,low,b34').split(',')
os.makedirs(out, exist_ok=True)
Pa = B.cage(body); L = SP.landmarks(Pa)
free, ins = SP.region(Pa, L, **{k: v for k, v in Dg.KW.items() if k in ('w_lo', 'w_hi', 'w_soft', 'top_soft', 'front_soft', 'front')})
seat = free > 0.3; T = B.fig()['tris']
ortho = (float(sys.argv[7]) if len(sys.argv) > 7 else 0.30) * (Pa[:, 1].max() - Pa[:, 1].min()) / 164.0
low = (sys.argv[8] == 'bottom') if len(sys.argv) > 8 else False
bot = seat & (Pa[:, 1] < L['cy'] + 4)
items = []
VD = {'back': (0, 0), 'low': (0, -35), 'b34': (-35, 0), 'under': (0, -65)}
for pz in poses:
	Pp = Dg.pose_mesh(body, pz)
	c = Pp[bot if low else seat].mean(0); N = g9.vertex_normals(Pp, T)[seat].mean(0); N /= np.linalg.norm(N)
	az = np.degrees(np.arctan2(N[0], -N[2])); el = np.degrees(np.arcsin(np.clip(N[1], -1, 1)))
	tgt = [c[0] * .01, -c[2] * .01, c[1] * .01]
	for vn in variants:
		X = Pp if vn == 'today' else np.load('sc-%s-%s-%s.npy' % (body, vn, pz))
		B.write_obj(X, '%s/%s-%s.obj' % (out, pz, vn))
		for v in views:
			da, de = VD[v]
			items.append(dict(obj=os.path.abspath('%s/%s-%s.obj' % (out, pz, vn)), out=os.path.abspath('%s/%s-%s-%s.png' % (out, pz, vn, v)), target=tgt, view='back', az=(180 - az) + da, elev=el + de, ortho=ortho, dist=1.8))
json.dump(dict(res=[380, 440], items=items, shade=shade), open(out + '/vjobs.json', 'w'))
r = subprocess.run([B.BLENDER, '-b', '--factory-startup', '-P', B.S_DIR + '/render_blender.py', '--', os.path.abspath(out + '/vjobs.json')], capture_output=True, text=True)
if r.returncode: print(r.stderr[-2000:])
w, h = 380, 440
cols = [(v, n) for v in views for n in variants]
G = Image.new('RGB', (170 + len(cols) * (w + 6), 70 + len(poses) * (h + 6)), (245, 245, 243)); d = ImageDraw.Draw(G)
f = ImageFont.truetype('arialbd.ttf', 20); fs = ImageFont.truetype('arial.ttf', 17)
for i, (v, n) in enumerate(cols):
	x = 170 + i * (w + 6)
	if n == variants[0]: d.text((x, 8), {'back': 'From behind', 'low': 'From behind, low', 'b34': 'Three-quarter back', 'under': 'From below'}[v], fill=(20, 20, 20), font=f)
	d.text((x + 4, 38), n, fill=(40, 40, 40), font=fs)
for j, pz in enumerate(poses):
	d.text((10, 70 + j * (h + 6) + h / 2), pz, fill=(20, 20, 20), font=f, anchor='lm')
	for i, (v, n) in enumerate(cols): G.paste(Image.open('%s/%s-%s-%s.png' % (out, pz, n, v)), (170 + i * (w + 6), 70 + j * (h + 6)))
G.save('%s/sheet-%s.png' % (out, shade))
