"""How fast and how right is a re-fit after a structural edit, started from the fit already there?

Cuts holes out of a fitted high-leg block (triangles removed, so edges are rough and carry no elastic) and re-solves from where the
fabric was: the whole garment, and only the fabric near the hole with the rest held. Each is judged against a long whole-garment solve.
    python pipeline/refit_bench.py [body key]
Spec: knowledge/engineering/app/refitting-after-an-edit.md.
"""
import sys
import time

import numpy as np

import wrap_block

REFERENCE = 600  # iterations taken as the settled answer
CHECKS = (5, 10, 20, 40, 80, 160)
NEAR = 0.12  # metres from the hole that a local re-fit moves
# name, piece, centre x, y, half width, half height, in mm on the flat piece
CUTS = (('back keyhole', 'back', 0, 500, 70, 110), ('large back opening', 'back', 0, 430, 120, 200), ('front side cutout', 'front', 170, 280, 60, 70))


def errors(p, ref, ids):
	d = np.linalg.norm(p[ids] - ref[ids], axis=1) * 1000
	return f'mean {d.mean():5.2f}, 95% {np.percentile(d, 95):5.2f}, max {d.max():6.2f} mm'


def bench(G, pos, part_solve):
	tris, rest, tag = G['tris'], G['rest'] * 1000, G['tag']
	print(f"\nmesh: {G['nw']} points, {len(tris)} triangles", flush=True)
	centre = rest.mean(1)
	# A fit that has not finished settling would count its own drift against every edit: start settled, and measure what drift is left
	every = np.ones(len(tris), bool)
	all_ids = np.unique(tris)
	before = pos
	pos = part_solve(G, every, pos, iters=REFERENCE, label='settling')
	print(f'  settling the fit moved it: {errors(before, pos, all_ids)}', flush=True)
	print(f'  no edit, {REFERENCE} iterations more: {errors(pos, part_solve(G, every, pos, iters=REFERENCE, label="control"), all_ids)}', flush=True)
	for name, piece, x, y, rx, ry in CUTS:
		gone = (tag == piece) & (((centre[:, 0] - x) / rx) ** 2 + ((centre[:, 1] - y) / ry) ** 2 < 1)
		keep = ~gone
		ids = np.unique(tris[keep])
		edge = np.intersect1d(np.unique(tris[gone]), ids)
		dist = np.linalg.norm(pos[:, None] - pos[edge][None], axis=2).min(axis=1) if len(edge) < 2000 else None
		near = dist < NEAR
		local = keep & near[tris].any(axis=1)
		held = np.setdiff1d(np.unique(tris[local]), np.where(near)[0])
		ref = part_solve(G, keep, pos, iters=REFERENCE, label='reference')
		print(f'\n== {name}: {int(gone.sum())} triangles cut; a local re-fit moves {int(near.sum())} of {G["nw"]} points', flush=True)
		close, far = np.intersect1d(ids, np.where(near)[0]), np.setdiff1d(ids, np.where(near)[0])
		print(f'  keeping the old fit as it is: near {errors(pos, ref, close)}; elsewhere {errors(pos, ref, far)}', flush=True)
		for title, mask, hold in (('whole garment', keep, None), ('near the hole', local, held)):
			p, done, spent = pos, 0, 0.0
			for n in CHECKS:
				t = time.perf_counter()
				p = part_solve(G, mask, p, held_ids=hold, iters=n - done, label=title)
				spent += time.perf_counter() - t
				done = n
				print(f'  {title:14} {n:4} iterations, {spent:6.1f} s: near {errors(p, ref, close)}; elsewhere {errors(p, ref, far)}', flush=True)


def main():
	key = sys.argv[1] if len(sys.argv) > 1 else 'young'
	sys.argv = ['wrap_block.py', '--drafted', f'body-{key}', key]
	t = time.perf_counter()
	wrap_block.main(after=lambda **k: (print(f'\nfull fit and one cut re-solved: {time.perf_counter() - t:.1f} s', flush=True), bench(**k)))


if __name__ == '__main__':
	main()
