import sys, os, json, subprocess, numpy as np, io, contextlib
import bust_proto as B, cloth_proto as C, cloth_pbd as D, posecarry as PC
from bust_proto import g9
from PIL import Image, ImageDraw, ImageFont
out, body = sys.argv[1], sys.argv[2]; poses = sys.argv[3].split(',')
os.makedirs(out, exist_ok=True)
d0 = B.REPO + '/pipeline/daz/out/bust-cloth/%s-f25in10/' % body
Pa = g9.read_pts(d0 + 'a-pose.pts')['Genesis9']
P1, _ = C.prepare(Pa, lift=2.0, squish=0.0)
fr, inside = C.band(P1); free = np.where(inside, 0.002 + fr, 0)
with contextlib.redirect_stdout(io.StringIO()):
	X, CF, used = D.drape(P1, free, shrink=0.5, iters=1500, stiff=1.0, hard_pin=True, off=1.0)
Qa, _ = D.transfer(P1, free, X, CF)
np.save('%s/%s-a.npy' % (out, body), Qa)
F = B.fig(); T = F['tris']; chest = F['pec'] > 0.3
items = []; rows = []
for pz in poses:
	Pp = g9.read_pts(d0 + '%s.pts' % pz)['Genesis9'] if pz != 'a-pose' else Pa
	Pt = B.cage(body) if pz == 'a-pose' else g9.read_pts(B.REPO + '/pipeline/daz/out/bodies/%s/%s.pts' % (body, pz))['Genesis9']
	Qp = Qa if pz == 'a-pose' else PC.carry(Pa, Qa, Pp)
	for n, Xm in (('today', Pt), ('new', Qp)): B.write_obj(Xm, '%s/%s-%s.obj' % (out, pz, n))
	N = g9.vertex_normals(Pp, T)[chest].mean(0); N /= np.linalg.norm(N)
	c = Pp[chest].mean(0)
	az = np.degrees(np.arctan2(N[0], N[2])); el = np.degrees(np.arcsin(np.clip(N[1], -1, 1)))
	tgt = [c[0] * .01, -c[2] * .01, c[1] * .01]
	for n in ('today', 'new'):
		for v, da in (('front', 0), ('34', 35), ('side', 80)):
			items.append(dict(obj=os.path.abspath('%s/%s-%s.obj' % (out, pz, n)), out=os.path.abspath('%s/%s-%s-%s.png' % (out, pz, n, v)), target=tgt, view='front', az=az + da, elev=el, ortho=0.36 * (Pa[:, 1].max() - Pa[:, 1].min()) / 166, dist=1.8))
	rows.append(pz)
json.dump(dict(res=[340, 380], items=items, shade='normal'), open(out + '/j.json', 'w'))
r = subprocess.run([B.BLENDER, '-b', '--factory-startup', '-P', B.S_DIR + '/render_blender.py', '--', os.path.abspath(out + '/j.json')], capture_output=True, text=True)
if r.returncode: print(r.stderr[-2000:])
w, h = 340, 380
cols = [(v, n) for v in ('front', '34', 'side') for n in ('today', 'new')]
G = Image.new('RGB', (170 + len(cols) * (w + 6), 70 + len(rows) * (h + 6)), (245, 245, 243)); dr = ImageDraw.Draw(G)
f = ImageFont.truetype('arialbd.ttf', 20); fs = ImageFont.truetype('arial.ttf', 17)
for i, (v, n) in enumerate(cols):
	x = 170 + i * (w + 6)
	if n == 'today': dr.text((x, 8), {'front': 'Front', '34': 'Three-quarter', 'side': 'Side'}[v], fill=(20, 20, 20), font=f)
	dr.text((x + 4, 38), 'Today' if n == 'today' else 'Sports-bra cloth', fill=(40, 40, 40), font=fs)
for j, pz in enumerate(rows):
	dr.text((10, 70 + j * (h + 6) + h / 2), pz, fill=(20, 20, 20), font=f, anchor='lm')
	for i, (v, n) in enumerate(cols): G.paste(Image.open('%s/%s-%s-%s.png' % (out, pz, n, v)), (170 + i * (w + 6), 70 + j * (h + 6)))
G.save('%s/%s-bust-poses.png' % (out, body))
