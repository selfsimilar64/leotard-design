# Body shaping after the Daz bake: the sports-bra bust and the smoothed gluteal cleft, as if under
# tight fabric (knowledge: decisions/2026-10-25-sports-bra-cloth-bust.md and
# decisions/2026-10-26-seat-cleft-cloth.md). Both are our own taut-cloth drapes over the skin
# (pipeline/daz/bust_cloth/, the prototype these settings were chosen in):
#   bust: drawn once on the a-pose (lift, then a membrane over a bra band, the skin settled onto it,
#         then a fresh grid cloth over the front pulling harder across than along)
#         and carried into every pose like a Daz morph (each offset turned with its neighbourhood);
#   seat: drawn on every Daz pose's own body (a grid cloth across the cleft, pressed gently into
#         it, the skin slid onto it), since carrying it pleats the cleft when a pose opens it.
# Arm poses (the app adds each arm's change to the a-pose) take the a-pose's whole change, carried.
# Results are cached per body under out/bodies/<key>/shaped/ (keyed on the settings and the bake):
# the a-pose bust under the bust settings, each pose's seat offset under the seat settings.
import hashlib, io, contextlib, json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'bust_cloth'))
sys.path.insert(0, os.path.dirname(HERE))
import g9

# owner's choices, 2026-10-25/26 (bodies.py BUST sets the Daz starting shape the bust is drawn on)
BUST = dict(lift=2.0, drape=dict(shrink=0.5, iters=1500, stiff=1.0, hard_pin=True, off=1.0))
# then a second, fresh grid cloth over the front pulling 4x harder across than along (owner, 2026-10-28:
# the first gap-filling iteration, bust_cloth/fill.py fill8 'best'; rows pulled straight or half-way
# (rows=1 / 0.5) were tried in the app and dropped)
BRIDGE = dict(band=dict(theta=90.0, soft_t=40.0, above=8.0, soft_hi=12.0),
	grid=dict(dvec=(0, 0, -1), tilt=10.0, shrink=0.5, iters=1500, stiff=1.0, off=1.0, along=0.25), rows=0.0)
SEAT = dict(along=0.25, front=-3.0, front_soft=3.0, w_lo=1.5, w_hi=4.5, w_soft=2.5, top_soft=6.0, leg_keep=0.3,
	embed=True, t_in=0.15, jump=1.0, cling=0.001, cling_mode='pressure', smooth_settle=True, slide=True,
	lam=5.0, mu=0.05, cut_mode='edge', cut_core=0.5, grid=True)
VERSION = 1


def _quiet(f, *a, **k):
	with contextlib.redirect_stdout(io.StringIO()): return f(*a, **k)


def bust(P_a):
	import cloth_proto as C, cloth_pbd as D
	P1, _ = C.prepare(P_a, lift=BUST['lift'], squish=0.0)
	fr, inside = C.band(P1)
	free = np.where(inside, 0.002 + fr, 0)
	X, CF, _ = _quiet(D.drape, P1, free, **BUST['drape'])
	Q, _ = D.transfer(P1, free, X, CF)
	import seat_proto as SP
	fr, inside = C.band(Q, **BRIDGE['band'])
	free = np.where(inside, 0.002 + fr, 0)
	X, CF = SP.drape_grid(Q, free, verbose=False, **BRIDGE['grid'])
	if BRIDGE['rows']: X = D.taut_rows(X, CF, SP.drape_grid.last, BRIDGE['rows'])
	Q, _ = D.transfer(Q, free, X, CF)
	return Q


def seat(P_a, P_pose):
	import seat_proto as SP
	return _quiet(SP.run_posed, P_a, P_pose, **SEAT)


def carry(P_a, Q_a, P_pose):
	import posecarry as PC
	return PC.carry(P_a, Q_a, P_pose)


class Shaper:
	"""shaped(pose_key, cage) -> the shaped Genesis 9 cage for one body (cached)."""

	def __init__(self, body, d, P_a):
		self.d, self.P_a = d, P_a
		self.has_bust = 'body_ctrl_BreastsFlatten' in body['morphs']
		# the bust and the seat are cached under their own settings: the seat cloth never moves the chest
		# and the carried bust never moves the seat (checked 2026-10-28), so changing one keeps the other
		h = lambda x: hashlib.sha1(json.dumps(x, sort_keys=True).encode()).hexdigest()[:10]
		self.btag = h([VERSION, [BUST, BRIDGE] if self.has_bust else None])
		self.stag = h([VERSION, SEAT])
		self.tag = h([self.btag, self.stag])
		self.cache = os.path.join(d, 'shaped')
		os.makedirs(self.cache, exist_ok=True)
		self.B_a = self._cached('bust-a-pose', 'a-pose', lambda: bust(P_a) if self.has_bust else P_a.copy(), self.btag)
		self.Q_a = None

	def _cached(self, name, src, make, tag=None):
		f = os.path.join(self.cache, '%s.%s.npy' % (name, tag or self.tag))
		srcf = os.path.join(self.d, src + '.pts')
		if os.path.exists(f) and os.path.getmtime(f) >= os.path.getmtime(srcf): return np.load(f)
		X = make(); np.save(f, X); return X

	def bust_pose(self, pk, P):
		return self.B_a if pk == 'a-pose' else (carry(self.P_a, self.B_a, P) if self.has_bust else P)

	def pose(self, pk, P):
		"""A Daz pose (or the a-pose): bust carried, then the seat drawn on this pose's body (the seat's
		change is cached on its own, as an offset)."""
		Bp = self.bust_pose(pk, P)
		Q = Bp + self._cached('seat-' + pk, pk, lambda: seat(self.B_a, Bp) - Bp, self.stag)
		if pk == 'a-pose': self.Q_a = Q
		return Q

	def arm(self, ak, P):
		"""An arm pose: the a-pose's whole change carried (only the arm differs)."""
		if self.Q_a is None: self.pose('a-pose', self.P_a)
		return self._cached('arm-' + ak, 'arm-' + ak, lambda: carry(self.P_a, self.Q_a, P))
