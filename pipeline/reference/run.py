"""One reference run: the leotard on the young body in Newton's Style3D solver, started from our fit.
    python pipeline/reference/run.py <inputs dir> <output dir> <run name> [key=value ...]
See README.md and experiments.py. Writes <output>/<run>.npz (final positions, history) and <run>.json (measures).
"""
import json
import os
import sys
import time

import numpy as np
import warp as wp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from garment import Garment  # noqa: E402

DEFAULTS = dict(
	# fabric. 215 N/m: the geometric middle of the published 120-385 N/m tricot range; density 0.2 kg/m2 (White Swim Solid 0.204)
	ku=215.0, kv=215.0, ks_ratio=0.5,  # ks = ks_ratio * sqrt(ku kv). 0.5 is the isotropic value with no Poisson (G = E / 2): no usable knit shear figure exists
	density=0.2, bend=5e-6,  # bending rigidity 2-6 uN.m, fabric_mechanics.md, my calculation there
	# elastic: N per unit strain
	ea=5.0, two_sided=0,
	# contact
	mu=0.5, ke=1000.0, kd=1e-6, radius=0.0005, eps=1e-3,  # penalty stiffness N/m; half a fabric thickness; friction creep speed m/s
	collider='skin',  # or 'lifted'
	gravity=9.81,
	nu=0.0, gather=-1.0,  # gather < 0: stock membrane
	self_radius=1e-3, self_contact=0, gap=0.03,
	dt=1.0 / 120, seconds=10.0, iters=8, linear=16,
	device='cuda:0', start='ours', save_every=60,
)


def parse(args):
	cfg = dict(DEFAULTS)
	for a in args:
		k, v = a.split('=', 1)
		if k not in cfg:
			raise KeyError(k)
		cfg[k] = type(DEFAULTS[k])(v) if not isinstance(DEFAULTS[k], str) else v
	return cfg


@wp.kernel
def _distance_kernel(mesh: wp.uint64, q: wp.array[wp.vec3], out: wp.array[float]):
	i = wp.tid()
	r = wp.mesh_query_point_sign_normal(mesh, q[i], 1.0)
	if r.result:
		p = wp.mesh_eval_position(mesh, r.face, r.u, r.v)
		out[i] = wp.length(q[i] - p) * r.sign
	else:
		out[i] = 1.0


class Distances:
	"""Signed distance of points to the two surfaces."""

	def __init__(self, skin, lifted, idx, device):
		self.device = device
		mk = lambda P: wp.Mesh(points=wp.array(P, dtype=wp.vec3, device=device), indices=wp.array(idx, dtype=wp.int32, device=device))
		self.meshes = {'skin': mk(skin), 'lifted': mk(lifted)}

	def __call__(self, x, which):
		q = wp.array(x, dtype=wp.vec3, device=self.device)
		out = wp.zeros(len(x), dtype=float, device=self.device)
		wp.launch(_distance_kernel, dim=len(x), inputs=[self.meshes[which].id, q], outputs=[out], device=self.device)
		return out.numpy().astype(float)


def outward_normals(g, x):
	"""Vertex normals of the garment at x. Every cell's winding is outward (checked below)."""
	n = np.zeros_like(x)
	fn = np.cross(x[g.tris[:, 1]] - x[g.tris[:, 0]], x[g.tris[:, 2]] - x[g.tris[:, 0]])
	for k in range(3):
		np.add.at(n, g.tris[:, k], fn)
	return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)


def run(inputs, out_dir, name, cfg):
	import newton
	from newton.solvers import style3d
	from solver import FitSolver
	wp.init()
	dev = cfg['device']
	wp.set_device(dev)
	g = Garment(inputs)
	skin = np.load(os.path.join(inputs, 'raw_skin.npy'))
	dist = Distances(skin, g.G, g.body_idx, dev)
	collider = skin if cfg['collider'] == 'skin' else g.G

	# where it starts: our fit, or an earlier run; just proud of the collider so that contact normals are defined
	if cfg['start'] == 'ours':
		x0 = g.x_ours.copy()
	else:
		x0 = np.load(os.path.join(out_dir, cfg['start'] + '.npz'))['x']
	nrm = outward_normals(g, x0)
	d0 = dist(x0, cfg['collider'])
	inward = np.mean((x0 - x0.mean(0)) * nrm) < 0
	if inward:
		raise RuntimeError('garment winding faces inward: the normals below would push it into the body')
	lift = np.maximum(cfg['radius'] * 1.2 - d0, 0)
	x0 = x0 + nrm * lift[:, None]

	builder = newton.ModelBuilder(up_axis=newton.Axis.Y, gravity=(0.0, -cfg['gravity'], 0.0))
	newton.solvers.SolverStyle3D.register_custom_attributes(builder)
	ks = cfg['ks_ratio'] * np.sqrt(cfg['ku'] * cfg['kv'])
	style3d.add_cloth_mesh(
		builder, pos=wp.vec3(0, 0, 0), rot=wp.quat_identity(), vel=wp.vec3(0, 0, 0),
		vertices=x0.tolist(), indices=g.tris.ravel().tolist(),
		panel_verts=g.panel_uv.tolist(), panel_indices=g.panel_tris.ravel().tolist(),
		density=cfg['density'], particle_radius=cfg['radius'],
		tri_aniso_ke=wp.vec3(cfg['ku'], cfg['kv'], ks),
		edge_aniso_ke=wp.vec3(cfg['bend'], cfg['bend'], cfg['bend']),
	)
	shape_cfg = newton.ModelBuilder.ShapeConfig(mu=cfg['mu'])
	builder.add_shape_mesh(body=-1, mesh=newton.Mesh(collider.astype(np.float32), g.body_idx.astype(np.int32), compute_inertia=False, is_solid=False), cfg=shape_cfg)
	model = builder.finalize(device=dev)
	model.soft_contact_ke = cfg['ke']
	model.soft_contact_kd = cfg['kd']
	model.soft_contact_mu = cfg['mu']
	model.set_gravity((0.0, -cfg['gravity'], 0.0))
	solver = FitSolver(model, iterations=cfg['iters'], linear_iterations=cfg['linear'], spans=g.spans(), ea=cfg['ea'], two_sided=bool(cfg['two_sided']), nu=cfg['nu'], gather=None if cfg['gather'] < 0 else cfg['gather'])
	col = solver.collision
	col.friction_epsilon = cfg['eps']
	col.radius = cfg['self_radius']
	if not cfg['self_contact']:
		col.stiff_vf = col.stiff_ee = col.stiff_ef = 0.0
	s0, s1 = model.state(), model.state()
	control = model.control()
	pipeline = newton.CollisionPipeline(model, soft_contact_gap=cfg['gap'])
	contacts = pipeline.contacts()

	dt = cfg['dt']
	steps = int(round(cfg['seconds'] / dt))
	hist = []
	t0 = time.time()
	prev = s0.particle_q.numpy().copy()
	prev_t = 0
	ok = True
	for i in range(steps):
		pipeline.collide(s0, contacts)
		s0.clear_forces()
		diag = (i + 1) % cfg['save_every'] == 0 or i == steps - 1
		solver.want_rhs = diag
		solver.step(s0, s1, control, contacts, dt)
		s0, s1 = s1, s0
		if diag:
			x = s0.particle_q.numpy().astype(float)
			if not np.isfinite(x).all() or np.abs(x).max() > 5:
				print('BLEW UP at step', i, flush=True)
				ok = False
				break
			v = np.linalg.norm(x - prev, axis=1) / ((i + 1 - prev_t) * dt) * 1000  # mm/s over the interval
			f = np.linalg.norm(solver.last_rhs, axis=1)
			d = dist(x, cfg['collider'])
			torso = g.vtag != 'Sleeve'
			hist.append({'t': (i + 1) * dt, 'v_mean': float(v.mean()), 'v_p95': float(np.percentile(v, 95)), 'v_max': float(v.max()), 'f_mean': float(f.mean()), 'f_p95': float(np.percentile(f, 95)), 'f_max': float(f.max()), 'pen_min_mm': float(d.min() * 1000), 'torso_v_mean': float(v[torso].mean()), 'torso_v_p95': float(np.percentile(v[torso], 95)), 'torso_v_max': float(v[torso].max()), 'torso_f_p95': float(np.percentile(f[torso], 95)), 'torso_f_max': float(f[torso].max()), 'torso_pen_min_mm': float(d[torso].min() * 1000), 'wall': time.time() - t0})
			h = hist[-1]
			print(f"t {h['t']:.2f} torso v mean {h['torso_v_mean']:.3f} p95 {h['torso_v_p95']:.3f} max {h['torso_v_max']:.2f} mm/s; force p95 {h['torso_f_p95'] * 1000:.3f} max {h['torso_f_max'] * 1000:.2f} mN; min dist {h['torso_pen_min_mm']:.2f} mm | all: v max {h['v_max']:.2f} force max {h['f_max'] * 1000:.1f} min dist {h['pen_min_mm']:.2f}; wall {h['wall']:.0f} s", flush=True)
			prev, prev_t = x.copy(), i + 1
	wall = time.time() - t0
	x = s0.particle_q.numpy().astype(float)
	reference = None
	ref = os.path.join(out_dir, 'baseline.npz')
	if name != 'baseline' and os.path.exists(ref):
		reference = np.load(ref)['x']
	dr, dl = dist(x, 'skin'), dist(x, 'lifted')
	m = g.measures(x, dr, dl, reference)
	m.update(name=name, cfg=cfg, wall_s=wall, ok=ok, history=hist, n=g.n, tris=len(g.tris))
	np.savez(os.path.join(out_dir, name + '.npz'), x=x, net_force=solver.last_rhs)
	with open(os.path.join(out_dir, name + '.json'), 'w', encoding='utf-8') as f:
		json.dump(m, f, indent=1)
	print(f'{name}: done in {wall:.0f} s, vs ours mean {m["vs_ours"]["mean"]:.2f} p95 {m["vs_ours"]["p95"]:.2f} max {m["vs_ours"]["max"]:.2f} mm')
	return m


if __name__ == '__main__':
	inputs_, out_, name_ = sys.argv[1:4]
	os.makedirs(out_, exist_ok=True)
	run(inputs_, out_, name_, parse(sys.argv[4:]))
