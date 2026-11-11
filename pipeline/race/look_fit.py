"""What a re-fit looks like up close (owner's review, 2026-11-03): skin showing through, fabric folded over itself, and the underarm seams.
    <venv python> pipeline/race/look_fit.py [body] [--cases a,b] [--steps N]
Per case, for the race's reference (friction) and for today's method run N steps (750, the app's default limit) from the race's start:
- depth: how far the body pokes through, at the points and inside the triangles (4 samples each); the points alone sit on the body
  but a flat triangle between them cuts into a curved body
- folds: triangles turned inside out against the body, and edges folded sharper than 120 degrees, overall and near the underarms
- underarm: at each point where front, back and sleeve meet, the seams leaving it over 40 mm: how straight each is (largest sag
  from its chord over the chord's length), the angle side seam to sleeve seam and front armhole to back armhole (180 = one straight
  line), and the angle between those two lines (90 = a square cross, as in the owner's photos)
Spec: knowledge/engineering/app/refit-in-the-app.md.
"""
import os
import sys

import numpy as np
import warp as wp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import gpu as G  # noqa: E402
import race as R  # noqa: E402
import solvers as S  # noqa: E402
from export_app import seam_edges  # noqa: E402

PIECES = ('back', 'front', 'sleeve')


def depth(pb, pts, sleeve):
	"""Signed distance to the body (m) of arbitrary points, each on its part's surface (gpu.query_k)."""
	n = len(pts)
	x = wp.array(pts.astype(np.float32), dtype=wp.vec3, device=pb.device)
	sl = wp.array(sleeve.astype(np.int32), dtype=wp.int32, device=pb.device)
	d = wp.zeros(n, dtype=float, device=pb.device)
	g = wp.zeros(n, dtype=wp.vec3, device=pb.device)
	q = wp.zeros(n, dtype=wp.vec3, device=pb.device)
	e = wp.zeros(n, dtype=float, device=pb.device)
	kc = wp.zeros(n, dtype=float, device=pb.device)
	wp.launch(G.query_k, n, [x, sl, pb.torso_part, pb.arm_part, pb.plane, pb.hold, d, g, q, e, 0, kc], device=pb.device)
	return d.numpy().astype(np.float64)


def folds(x, tris):
	"""Edges whose two triangles meet at more than 120 degrees of turn (fabric folded back on itself): the edges' points."""
	nrm = np.cross(x[tris[:, 1]] - x[tris[:, 0]], x[tris[:, 2]] - x[tris[:, 0]])
	nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-30
	where, sharp = {}, []
	for t in range(len(tris)):
		for k in range(3):
			a, b = tris[t, k], tris[t, (k + 1) % 3]
			key = (min(a, b), max(a, b))
			if key in where:
				if np.dot(nrm[where.pop(key)], nrm[t]) < -0.5:
					sharp.append(key)
			else:
				where[key] = t
	return np.array(sharp, int).reshape(-1, 2)


def branches(x, seams, kind, junction, length=0.04):
	"""The seams leaving a junction point: per branch its kind and its points over `length` of arc."""
	adj = {}
	for (a, b), k in zip(seams, kind):
		adj.setdefault(a, []).append((b, k))
		adj.setdefault(b, []).append((a, k))
	out = []
	for nb, k in adj.get(junction, []):
		path, prev, cur, arc = [junction, nb], junction, nb, np.linalg.norm(x[nb] - x[junction])
		while arc < length:
			nxt = [(v, kk) for v, kk in adj.get(cur, []) if v != prev and kk == k]
			if len(nxt) != 1:
				break
			prev, cur = cur, nxt[0][0]
			arc += np.linalg.norm(x[cur] - x[prev])
			path.append(cur)
		out.append((k, np.array(path)))
	return out


def straight(x, path):
	p = x[path]
	c = p[-1] - p[0]
	L = np.linalg.norm(c) + 1e-12
	u = c / L
	off = (p - p[0]) - np.outer((p - p[0]) @ u, u)
	return u, float(np.linalg.norm(off, axis=1).max() / L)


def angle(u, v):
	return float(np.degrees(np.arccos(np.clip(np.dot(u, v), -1, 1))))


def underarm(x, tris, piece, seams):
	e2t = {}
	for t in range(len(tris)):
		for k in range(3):
			a, b = tris[t, k], tris[t, (k + 1) % 3]
			e2t.setdefault((min(a, b), max(a, b)), []).append(t)
	kind = ['|'.join(sorted(PIECES[piece[t]] for t in e2t[(min(a, b), max(a, b))])) for a, b in seams]
	touch = {}
	for t in range(len(tris)):
		for v in tris[t]:
			touch.setdefault(v, set()).add(piece[t])
	deg = np.bincount(seams.ravel(), minlength=len(x))
	js = [v for v, s in touch.items() if len(s) == 3 and deg[v] >= 3]
	rows = []
	for side in (1, -1):
		mine = [v for v in js if np.sign(x[v, 0]) == side]
		if not mine:
			continue
		j = max(mine, key=lambda v: deg[v])
		br = {k: straight(x, p) for k, p in branches(x, seams, kind, j) if len(p) > 2}
		r = dict(side='right' if side > 0 else 'left', kinds=sorted(br))
		if 'back|front' in br and 'sleeve|sleeve' in br:
			r['side_to_sleeve'] = angle(br['back|front'][0], br['sleeve|sleeve'][0])
		if 'front|sleeve' in br and 'back|sleeve' in br:
			r['armhole'] = angle(br['front|sleeve'][0], br['back|sleeve'][0])
		if all(k in br for k in ('back|front', 'sleeve|sleeve', 'front|sleeve', 'back|sleeve')):
			a = br['back|front'][0] - br['sleeve|sleeve'][0]
			b = br['front|sleeve'][0] - br['back|sleeve'][0]
			r['cross'] = angle(a / np.linalg.norm(a), b / np.linalg.norm(b))
		r['sag'] = {k: round(v[1] * 100, 1) for k, v in br.items()}  # % of the chord
		rows.append(r)
	return rows


def main():
	args = sys.argv[1:]
	key = args[0] if args and not args[0].startswith('--') else 'young'
	names = (args[args.index('--cases') + 1] if '--cases' in args else 'standing,lunge-arms-up,back-arched,passe').split(',')
	steps = int(args[args.index('--steps') + 1]) if '--steps' in args else 750
	refs = {}
	for name in R.ORDER:
		f = os.path.join(R.CAP, f'case-{key}-{name}.npz')
		rf = os.path.join(R.CAP, f'ref-{key}-{name}-friction.npy')
		if os.path.exists(f) and os.path.exists(rf):
			refs[name] = (np.load(rf), dict(np.load(f)))
	for name in names:
		ref, case = refs[name]
		start, _ = R.start_of(case, refs, key)
		pb = G.Problem(case, mu=G.MU)
		tris = pb.tris_np
		piece = np.searchsorted(PIECES, case['tag'])
		seams = seam_edges(tris, case['rest'])
		x0 = pb.array(start)
		pb.set_anchor(x0)

		class Count(S.Recorder):
			def __init__(self):
				super().__init__(1e9)

			def __call__(self, x, info=None):
				self.it += 1
				return self.it < steps
		app = S.local_global(pb, x0, Count(), cg_iters=10).numpy().astype(np.float64)
		sl_t = (pb.sleeve_np[tris].sum(1) >= 2).astype(np.int32)
		W = np.array([[1 / 3, 1 / 3, 1 / 3], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5]])
		for label, x in (('start', start), ('reference', ref), (f'{steps} steps', app)):
			dv = depth(pb, x, pb.sleeve_np) * 1000
			samples = np.einsum('sk,tkc->tsc', W, x[tris]).reshape(-1, 3)
			dt = depth(pb, samples, np.repeat(sl_t, 4)) * 1000
			p = pb.parts(pb.array(x))
			flip = pb.flip.numpy().astype(bool)
			fl = folds(x, tris)
			js = []
			for r in underarm(x, tris, piece, seams):
				js.append(r)
			# near the underarm: within 6 cm of either junction
			touch = np.zeros(len(x), int)
			for t in range(len(tris)):
				for v in tris[t]:
					touch[v] |= 1 << piece[t]
			jpts = x[touch == 7]
			near_t = np.min(np.linalg.norm(x[tris].mean(1)[:, None] - jpts[None], axis=2), axis=1) < 0.06 if len(jpts) else np.zeros(len(tris), bool)
			print(f'\n{name}, {label}:')
			print(f'  points inside the body: over 0.2 mm {(dv < -0.2).sum()}, over 1 mm {(dv < -1).sum()}, deepest {-dv.min():.2f} mm')
			print(f'  inside the triangles (4 samples each): over 0.2 mm {(dt < -0.2).mean() * 100:.1f}%, over 0.5 mm {(dt < -0.5).mean() * 100:.2f}%, '
				f'over 1 mm {(dt < -1).mean() * 100:.2f}%, deepest {-dt.min():.2f} mm')
			print(f'  inside out: {flip.sum()} triangles ({flip[near_t].sum()} within 6 cm of an underarm), by panel '
				+ ', '.join(f'{PIECES[k]} {(flip & (piece == k)).sum()}' for k in range(3)))
			fl_near = np.isin(fl, np.where(touch > 0)[0]).all(1) if len(fl) else np.zeros(0, bool)
			print(f'  edges folded past 120 degrees: {len(fl)}' + (f'; their points near an underarm: {np.sum(np.min(np.linalg.norm(x[fl[:, 0]][:, None] - jpts[None], axis=2), axis=1) < 0.06)}' if len(fl) and len(jpts) else ''))
			for r in js:
				print(f'  {r["side"]} underarm: side seam to sleeve seam {r.get("side_to_sleeve", float("nan")):.0f} deg, front to back armhole {r.get("armhole", float("nan")):.0f} deg, '
					f'cross {r.get("cross", float("nan")):.0f} deg; sag over 40 mm (% of chord) {r["sag"]}')


if __name__ == '__main__':
	main()
