import sys, diag as Dg, seat_proto as SP, bust_proto as B, numpy as np
body = sys.argv[1]; poses = sys.argv[2].split(','); variants = eval(sys.argv[3])
Pa = B.cage(body)
for name, extra in variants.items():
	kw = dict(Dg.KW); kw.update(extra); tot = 0; row = []
	for pz in poses:
		Pp = Dg.pose_mesh(body, pz)
		import io, contextlib
		with contextlib.redirect_stdout(io.StringIO()):
			if kw.get('hybrid'):
				if 'Qa' not in globals() or globals().get('Qa_name') != name: globals()['Qa'] = SP.run_posed(Pa, Pa, **kw); globals()['Qa_name'] = name
				Q = SP.run_hybrid(Pa, Pp, Qa, **kw)
			else: Q = SP.run_posed(Pa, Pp, **kw)
		s = Dg.score(Pp, Q); n = s['crease'] + s['flip'] + s['squash']; tot += n; row.append('%s %d' % (pz, n))
		np.save('sc-%s-%s-%s.npy' % (body, name, pz), Q)
	print('%-12s total %4d | %s' % (name, tot, ', '.join(row)), flush=True)
