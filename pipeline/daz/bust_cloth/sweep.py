import sys, bust_proto as B, cloth_proto as C, cloth_pbd as D, numpy as np
from bust_proto import g9
out = 's1'
F = B.fig()
base = g9.read_pts(B.REPO + '/pipeline/daz/out/bust-cloth/young-f25in10/a-pose.pts')['Genesis9']
objs, cols, labels = {}, [], {}
def add(name, P, label):
	B.write_obj(P, '%s/%s.obj' % (out, name)); objs[name] = (P, '%s/%s.obj' % (out, name)); cols.append(name); labels[name] = label
add('today', B.cage('young'), 'Today\n(flatten 100%, in 0.5)')
prev = np.load('p4/young-cloth.npy'); add('prev', prev, 'Last round\n(flatten 0, in 0.5, lift 1, cloth)')
add('base', base, 'Flatten 25%, in 1.0\n(no cloth)')
P1, _ = C.prepare(base, lift=2.0, squish=0.0)
fr, inside = C.band(P1); free = np.where(inside, 0.002 + fr, 0)
for s in (0.05, 0.15, 0.3, 0.5):
	X, CF, used = D.drape(P1, free, shrink=s, iters=1500, stiff=1.0, hard_pin=True, off=1.0)
	Q, _ = D.transfer(P1, free, X, CF)
	np.save('%s/t%02d.npy' % (out, int(s * 100)), Q)
	add('t%02d' % int(s * 100), Q, '+ lift 2 cm, cloth\ntightness %d%%' % int(s * 100))
B.render(objs, out)
B.grid(['front', '34', 'side'], cols, out, 'Young adult: flatten 25%, in 1.0, lift 2 cm, cloth tightness sweep', out + '/grid.png', labels)
