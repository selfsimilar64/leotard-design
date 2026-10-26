import sys, seat_proto as SP, bust_proto as B, cloth_proto as C, numpy as np
out = sys.argv[1]; keys = sys.argv[2].split(','); variants = eval(sys.argv[3])  # {name: kwargs}
cols, labels = [], {}
objs = {}
for k in keys:
	P = B.cage(k)
	B.write_obj(P, '%s/%s-today.obj' % (out, k)); objs['%s-today' % k] = (P, '%s/%s-today.obj' % (out, k)); cols.append('%s-today' % k); labels['%s-today' % k] = k + '\ntoday'
	for nm, kw in variants.items():
		kw = dict(kw)
		Q, I = (SP.run_grid if kw.pop('grid', False) else SP.run)(P, **{a: b for a, b in kw.items() if a != 'show_cloth'})
		np.save('%s/%s-%s.npy' % (out, k, nm), Q)
		n = '%s-%s' % (k, nm); B.write_obj(Q, '%s/%s.obj' % (out, n)); objs[n] = (Q, '%s/%s.obj' % (out, n)); cols.append(n); labels[n] = k + '\n' + nm
		if kw.get('show_cloth'):
			with open('%s/%s-cloth.obj' % (out, n), 'w') as f:
				Xb = C.to_bl(I['X']); f.write(''.join('v %f %f %f\n' % tuple(v) for v in Xb)); f.write(''.join('f %d %d %d %d\n' % tuple(q + 1) for q in I['CF']))
			objs[n + '-c'] = (P, '%s/%s-cloth.obj' % (out, n)); cols.append(n + '-c'); labels[n + '-c'] = 'cloth alone'
	SP.render({c: objs[c] for c in objs if c.startswith(k)}, out, P)
B.grid(['back', 'low', 'back34', 'side'], cols, out, sys.argv[4] if len(sys.argv) > 4 else 'Seat', out + '/grid.png', labels)
