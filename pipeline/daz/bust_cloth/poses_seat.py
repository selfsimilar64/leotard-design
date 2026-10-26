import sys, os, json, subprocess, numpy as np
import seat_proto as SP, bust_proto as B, posecarry as PC
from bust_proto import g9
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]; body = sys.argv[2]; poses = sys.argv[3].split(','); kw = eval('dict(' + sys.argv[4] + ')'); kw['grid'] = True
os.makedirs(out, exist_ok=True)
P = B.cage(body); L = SP.landmarks(P)
Q, I = SP.run_grid(P, **kw)
np.save('%s/%s-seat.npy' % (out, body), Q)
free = I['free']; seat = free > 0.3
T = B.fig()['tris']
items = []; rows = []
for pz in poses:
	Pp = g9.read_pts(B.REPO + '/pipeline/daz/out/bodies/%s/%s.pts' % (body, pz))['Genesis9']
	Qp = SP.run_posed(P, Pp, **kw) if kw.get('per_pose') else PC.carry(P, Q, Pp)
	for n, X in (('today', Pp), ('seat', Qp)): B.write_obj(X, '%s/%s-%s.obj' % (out, pz, n))
	c = Pp[seat].mean(0)
	N = g9.vertex_normals(Pp, T)[seat].mean(0); N /= np.linalg.norm(N)
	az = np.degrees(np.arctan2(N[0], -N[2]))  # camera on the seat's outward side
	azb = 180 + az
	el = np.degrees(np.arcsin(np.clip(N[1], -1, 1)))
	tgt = [c[0] * .01, -c[2] * .01, c[1] * .01]
	for n in ('today', 'seat'):
		for v, da, de in (('back', 0, 0), ('low', 0, -35), ('b34', -35, 0)):
			items.append(dict(obj=os.path.abspath('%s/%s-%s.obj' % (out, pz, n)), out=os.path.abspath('%s/%s-%s-%s.png' % (out, pz, n, v)), target=tgt, view='back', az=-az + 180 + da if False else (180 - az) + da, elev=el + de, ortho=0.34, dist=1.8))
	rows.append(pz)
json.dump(dict(res=[440, 520], items=items), open(out + '/pjobs.json', 'w'))
r = subprocess.run([B.BLENDER, '-b', '--factory-startup', '-P', B.S_DIR + '/render_blender.py', '--', os.path.abspath(out + '/pjobs.json')], capture_output=True, text=True)
if r.returncode: print(r.stderr[-2000:])
w, h = 440, 520
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
	for i, (v, n) in enumerate(cols): G.paste(Image.open('%s/%s-%s-%s.png' % (out, pz, n, v)), (180 + i * (w + 6), 70 + j * (h + 6)))
G.save(out + '/poses.png')
