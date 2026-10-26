import sys, diag as Dg, seat_proto as SP, bust_proto as B, cloth_proto as C, numpy as np, json, os, subprocess, io, contextlib
from bust_proto import g9
from PIL import Image
out = sys.argv[1]; body = sys.argv[2]; poses = sys.argv[3].split(','); extra = eval('dict(' + sys.argv[4] + ')')
kw = dict(Dg.KW); kw.update(extra)
Pa = B.cage(body); L = SP.landmarks(Pa)
free, ins = SP.region(Pa, L, **{k: v for k, v in Dg.KW.items() if k in ('w_lo', 'w_hi', 'w_soft', 'top_soft', 'front_soft', 'front')}); seat = free > 0.3
T = B.fig()['tris']; items = []; os.makedirs(out, exist_ok=True)
for pz in poses:
	Pp = Dg.pose_mesh(body, pz)
	with contextlib.redirect_stdout(io.StringIO()): Q = SP.run_posed(Pa, Pp, **kw)
	X, CF = SP.LAST['X'], SP.LAST['CF']
	for nm, (XX, FF) in (('cloth', (X, CF)),):
		with open('%s/%s-%s.obj' % (out, pz, nm), 'w') as f:
			Xb = C.to_bl(XX); f.write(''.join('v %f %f %f\n' % tuple(v) for v in Xb)); f.write(''.join('f %d %d %d %d\n' % tuple(q + 1) for q in FF))
	B.write_obj(Q, '%s/%s-skin.obj' % (out, pz))
	c = Pp[seat].mean(0); N = g9.vertex_normals(Pp, T)[seat].mean(0); N /= np.linalg.norm(N)
	az = np.degrees(np.arctan2(N[0], -N[2])); el = np.degrees(np.arcsin(np.clip(N[1], -1, 1)))
	for nm in ('cloth', 'skin'):
		for v, de in (('back', 0), ('low', -35)):
			items.append(dict(obj=os.path.abspath('%s/%s-%s.obj' % (out, pz, nm)), out=os.path.abspath('%s/%s-%s-%s.png' % (out, pz, nm, v)), target=[c[0] * .01, -c[2] * .01, c[1] * .01], view='back', az=180 - az, elev=el + de, ortho=0.30, dist=1.8))
json.dump(dict(res=[340, 400], items=items, shade='normal'), open(out + '/j.json', 'w'))
subprocess.run([B.BLENDER, '-b', '--factory-startup', '-P', B.S_DIR + '/render_blender.py', '--', os.path.abspath(out + '/j.json')], capture_output=True)
G = Image.new('RGB', (4 * 346, len(poses) * 406), (245, 245, 243))
for k, it in enumerate(items): G.paste(Image.open(it['out']), ((k % 4) * 346, (k // 4) * 406))
G.save(out + '/cloth.png')
