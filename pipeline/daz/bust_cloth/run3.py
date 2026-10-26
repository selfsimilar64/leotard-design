import sys, bust_proto as B, cloth_proto as C, cloth_pbd as D, numpy as np
from bust_proto import g9
out = sys.argv[1]; keys = sys.argv[2].split(',')
kw = eval('dict(' + (sys.argv[3] if len(sys.argv) > 3 else '') + ')')
lift = kw.pop('lift', 1.0)
objs = {}; cols = []; labels = {}
for k in keys:
	Pt = B.cage(k)
	P0 = g9.read_pts(B.REPO + '/pipeline/daz/out/bust-cloth/%s-noflat/a-pose.pts' % k)['Genesis9']
	P1, _ = C.prepare(P0, lift=lift, squish=0.0)
	fr, inside = C.band(P1)
	free = np.where(inside, 0.002 + fr, 0)
	X, CF, used = D.drape(P1, free, **{a: b for a, b in kw.items() if a in ('shrink', 'off', 'iters', 'thick', 'stiff', 'hard_pin')})
	Q, _ = D.transfer(P1, free, X, CF)
	np.save('%s/%s-cloth.npy' % (out, k), Q)
	for nm, P in (('today', Pt), ('cloth', Q)):
		B.write_obj(P, '%s/%s-%s.obj' % (out, k, nm)); objs['%s-%s' % (k, nm)] = (P, '%s/%s-%s.obj' % (out, k, nm))
		cols.append('%s-%s' % (k, nm)); labels['%s-%s' % (k, nm)] = '%s\n%s' % (k, 'today (flatten 100%)' if nm == 'today' else 'cloth')
B.render(objs, out)
B.grid(['front', '34', 'side'], cols, out, 'Sports-bra cloth: teens and young adult', out + '/grid.png', labels)
