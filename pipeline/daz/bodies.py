# The app's Genesis 9 bodies: every body type in every pose, with facial expressions and the
# person's head (face, eyes, mouth, lashes, brows, Eirgrid hair), baked by Daz Studio and converted
# for the app. Genesis 9 subdivided once is the app's canonical mesh, so body type, pose, expression
# and head are independent choices the app combines at run time
# (knowledge: engineering/pipeline/g9-bodies.md).
#
#   python pipeline/daz/bodies.py                 bake stage 1 and 2 in Daz Studio, then convert
#   python pipeline/daz/bodies.py --stage1 [keys]  rest pose, Daz poses, expressions (+ the bare figure)
#   python pipeline/daz/bodies.py --stage2 [keys]  arm poses (needs stage 1: aims from its landmarks)
#   python pipeline/daz/bodies.py --missing-poses [keys]  only the Daz poses (POSES) not baked yet
#   python pipeline/daz/bodies.py --convert        stage 1 + 2 output -> app/public/g9/
#
# Stage 1 per body: Genesis 9 with the body's skin, age and character presets, Eirgrid hair and
# morphs; poses "a-pose" (the mannequin stance, arms aimed) and the Daz poses (POSES), each written
# with every figure; the expressions on the a-pose (face only). The "bare" figure (no shape, no
# pose) is baked once with the OBJ export: topology, UVs, and where the brows, lashes, tear film
# and hair roots sit on an unshaped skin (Daz moves them with the bones but not with the head's
# shape morphs, so the app re-attaches them to each body's skin).
# Stage 2 per body: the arm poses (ARMS), one side at a time, the other arm in the a-pose: the app
# adds the two sides' changes to the a-pose, so every left/right combination works.
#
# Everything written is derived from the owner's licensed Daz content: pipeline/daz/out/ and
# app/public/g9/ are git-ignored (knowledge: Daz Interactive License).
import json, math, os, subprocess, sys, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import g9

LIB = g9.LIB
STUDIO = os.environ.get('DAZ_STUDIO', r'C:/Program Files/DAZ 3D/DAZStudio6/DAZStudio.exe')
OUT = os.path.join(HERE, 'out', 'bodies')

P9 = 'People/Genesis 9/'
AGE = {'5-6': 'Growing Up 01 5-6', '9-10': 'Growing Up 02 9-10', 'young-teen': 'Growing Up 03 Young Teen',
	'older-teen': 'Growing Up 04 Older Teen', 'adult': 'Growing Up 05 Adult'}
AGE_P = lambda a: P9 + 'Shapes/Zev0/Growing Up/Age Presets/%s.duf' % AGE[a]
_PD = P9 + 'Poses/3D Sugar/Skillful Routine/Feminine/'
_ED = P9 + 'Expressions/3D Sugar/Skilfull Routine/'
DAZ_POSE = lambda n: next(_PD + f for f in os.listdir(LIB + _PD) if f.startswith('SR G9 Feminine %02d ' % n) and f.endswith('.duf'))
EXPR = lambda n: next(_ED + f for f in os.listdir(LIB + _ED) if f.startswith('SR Expression %02d ' % n) and f.endswith('.duf'))
NEUTRAL = P9 + 'Expressions/3D Sugar/0 Expression.duf'
# The person is Stacy (CaramelDream3D) on every body since 2026-10-21 (owner's choice): her face
# (the CD Stacy Head morph, on top of each body's age and character shape; not her body morph, so
# ages and builds stay), her skin, eyes and lashes. Her skin is the only one the app shows.
_ST = P9 + 'Characters/CaramelDream3D/Stacy/MATERIAL/'
STACY = [_ST + 'Stacy Skin.duf', [_ST + 'Eyes/Stacy Eyes 00.duf', 'Genesis9Eyes'], [_ST + 'Stacy Eyelashes 01.duf', 'Genesis9Eyelashes']]
STACY_MORPHS = {'CD Stacy Head': 1}
EIRGRID = [P9 + 'Hair/Daz Originals/Eirgrid Hair/Eirgrid Hair G9.duf', [P9 + 'Hair/Daz Originals/Eirgrid Hair/Materials Iray/Eirgrid 10 M Brown.duf', 'Eirgrid']]

ATHLETIC = {'body_bs_FlexGluteClenchL': 0.35, 'body_bs_FlexGluteClenchR': 0.35, 'body_bs_FlexQuadL': 0.3,
	'body_bs_FlexQuadR': 0.3, 'body_bs_FlexCalfL': 0.3, 'body_bs_FlexCalfR': 0.3,
	'body_bs_FlexHamstringL': 0.2, 'body_bs_FlexHamstringR': 0.2}

# Body types. stature: the body is scaled uniformly to it (metres). The adults keep the recipes of
# the earlier wrapped Daz bodies (knowledge: daz-bodies); ages come from Growing Up. Characters are
# dialled by their controller morph (the character .duf presets open a dialog that stops the run).
# `young` is the reference body every design is drawn on.
# skin: the Daz skin set each body was baked with before Stacy (unused since: every body wears
# Stacy's skin, STACY).
BODIES = [
	dict(key='child-6', label='Child, about 6', years=6, stature=1.17, skin=1, presets=[AGE_P('5-6')], morphs={}),
	dict(key='child', label='Child, about 9', years=9, stature=1.33, skin=1, presets=[AGE_P('9-10')], morphs={}),
	dict(key='teen', label='Young teen, about 13', years=13, stature=1.55, skin=2, presets=[AGE_P('young-teen')],
		morphs={'Kat_figure_ctrl_Character': 1}),
	dict(key='older-teen', label='Older teen, about 16', years=16, stature=1.6, skin=3, presets=[AGE_P('older-teen')], morphs={}),
	dict(key='petite', label='Petite athlete', years=18, stature=1.53, skin=3, presets=[],
		morphs={'BaseFeminine_figure_ctrl_Character': 1, 'BaseFeminine_body_bs_Body': -0.5, 'body_bs_ProportionShoulderWidth': -0.35,
			'body_bs_ProportionChestWidth': -0.3, 'body_ctrl_BreastsFlatten': 0.5, **ATHLETIC}),
	dict(key='young', label='Young adult, athletic', years=18, stature=1.61, skin=2, presets=[],
		morphs={'Kat_figure_ctrl_Character': 1, **ATHLETIC}),
	dict(key='adult', label='Adult, about 30', years=30, stature=1.64, skin=4, presets=[],
		morphs={'BaseFeminine_figure_ctrl_Character': 1, **{k: v * 0.8 for k, v in ATHLETIC.items()}}),
	dict(key='broad', label='Adult, broader build', years=30, stature=1.66, skin=4, presets=[],
		morphs={'Amala_figure_ctrl_Character': 1}),
]
REF = 'young'

# Poses. 'a-pose': the mannequin stance (upper arm 13 degrees from vertical, a little forward;
# elbow bent 14 degrees forward), the rest pose every design is drawn in. Daz poses: all 30 of
# Skillful Routine (3D Sugar), the first eight chosen in 2026-10 as the ones that show a leotard
# best, the rest added on the owner's request (2026-10-21); the app's pose picker lists them in
# this order. n: the pose's number in the pack (SR G9 Feminine NN ...); the props some of its
# previews show (ball, hoop) are not part of the figure.
UPPER_DIR = [math.sin(math.radians(13)), -math.cos(math.radians(13)), 0.06]
ELBOW_BEND = math.radians(14)
POSES = [
	dict(key='standing', label='Standing, presenting', n=5),
	dict(key='arms-outstretched', label='Arms outstretched', n=1),
	dict(key='one-arm-up', label='One arm up', n=10),
	dict(key='passe', label='On one leg, hands behind head', n=8),
	dict(key='releve-arms-up', label='On one leg, arms up', n=18),
	dict(key='split-leap', label='Split leap', n=16),
	dict(key='stag-jump', label='Stag jump', n=25),
	dict(key='kneeling', label='Kneeling', n=13),
	dict(key='lunge-arms-up', label='Low lunge, arms up', n=2),
	dict(key='lying-legs-up', label='Lying, legs up', n=3),
	dict(key='handstand', label='Handstand', n=4),
	dict(key='legs-up', label='Legs up, on the hands', n=6),
	dict(key='chest-stand', label='Chest stand', n=7),
	dict(key='cartwheel-low', label='Cartwheel, low', n=9),
	dict(key='lying-leg-up', label='Lying, one leg up', n=11),
	dict(key='one-arm-balance', label='One-arm balance', n=12),
	dict(key='lying', label='Lying on the floor', n=14),
	dict(key='swinging', label='Swinging', n=15),
	dict(key='back-arched', label='Bridge, back arched', n=17),
	dict(key='lunge-arm-up', label='Lunge, arm up', n=19),
	dict(key='kneeling-leg-up', label='Kneeling, one leg up', n=20),
	dict(key='cartwheel', label='Cartwheel', n=21),
	dict(key='kneeling-arm-up', label='Kneeling, arm up', n=22),
	dict(key='jump-arched', label='Jump, back arched', n=23),
	dict(key='walkover', label='Walkover', n=24),
	dict(key='floor-split', label='Split on the floor', n=26),
	dict(key='elbow-balance', label='Elbow balance', n=27),
	dict(key='pirouette', label='Pirouette', n=28),
	dict(key='arms-open', label='Arms open', n=29),
	dict(key='one-knee', label='On one knee', n=30),
]
# Arm poses (the app's 'arms-down', 'hands-on-hips', ...: body/pose.js): each arm separately.
ARMS = ['down', 'front', 'thigh', 'hip', 'up']
EXPRESSIONS = [
	dict(key='neutral', label='Neutral', preset=NEUTRAL),
	dict(key='smile', label='Smile', n=13),
	dict(key='soft-smile', label='Closed-mouth smile', n=26),
	dict(key='focused', label='Focused', n=16),
]

# Spine fractions of the chest and waist landmarks (pelvis -> neck base), as on the MakeHuman young
# adult the first designs were drawn on.
CHEST_F, WAIST_F = 0.7076, 0.2441


def unit(v): v = np.asarray(v, dtype=np.float64); return v / np.linalg.norm(v)


def a_pose_aim(sx):
	up = unit(UPPER_DIR) * [sx, 1, 1]
	fwd = np.array([0, 0, 1.0]) - up * up[2]; fwd /= np.linalg.norm(fwd)
	fa = up * math.cos(ELBOW_BEND) + fwd * math.sin(ELBOW_BEND)
	return {'upper': up.round(6).tolist(), 'fore': fa.round(6).tolist()}


def body_dir(key): return os.path.join(OUT, key).replace('\\', '/') + '/'


def stage1_jobs(bodies, missing=False):
	"""missing: only the Daz poses not baked yet (no A-pose, expressions, bare figure or materials)."""
	if missing:
		jobs = []
		for b in bodies:
			todo = [dict(key=p['key'], preset=DAZ_POSE(p['n']), nodes='all') for p in POSES if not os.path.exists(body_dir(b['key']) + p['key'] + '.pts')]
			if todo: jobs.append(dict(key=b['key'], out=body_dir(b['key']), presets=[*STACY, *b["presets"], *EIRGRID],
				morphs={**b['morphs'], **STACY_MORPHS}, poses=todo, materials=False, expressions=[]))
		return jobs
	jobs = [dict(key='bare', out=body_dir('bare'), presets=[*EIRGRID], morphs={}, obj=True, materials=True,
		poses=[dict(key='zero', nodes='all')], expressions=[])]
	for b in bodies:
		poses = [dict(key='a-pose', aim={'l': a_pose_aim(1), 'r': a_pose_aim(-1)}, nodes='all')]
		poses += [dict(key=p['key'], preset=DAZ_POSE(p['n']), nodes='all') for p in POSES]
		jobs.append(dict(key=b['key'], out=body_dir(b['key']), presets=[*STACY, *b["presets"], *EIRGRID],
			morphs={**b['morphs'], **STACY_MORPHS}, poses=poses, materials=True,
			expressions=[dict(key=e['key'], preset=e.get('preset') or EXPR(e['n'])) for e in EXPRESSIONS]))
	return jobs


# --- stage 2: arm poses, aimed from the body's own landmarks ---------------------------------------

def rest_measures(b):
	"""Landmarks of a body's a-pose (stage 1), in Daz centimetres, and k: Daz cm per app metre."""
	d = body_dir(b['key'])
	cage = g9.read_pts(d + 'a-pose.pts')['Genesis9']
	bones = json.load(open(d + 'a-pose.bones.json'))
	o = lambda n: np.array(bones[n]['o'])
	fig = figure()
	w = part_weights(fig)
	arm = w['upperarm'] + w['forearm'] + w['hand']
	height = cage[:, 1].max() - cage[:, 1].min()
	k = height / b['stature']
	pelvis, neck = o('hip'), o('neck1')
	waistY = pelvis[1] + WAIST_F * (neck[1] - pelvis[1])
	mid = (np.abs(cage[:, 0]) < 0.6) & (arm < 0.5) & (w['head'] < 0.5) & (cage[:, 1] > 0.25 * height) & (cage[:, 1] < 0.7 * height)
	crotchY = cage[mid, 1].min()
	front = (np.abs(cage[:, 0]) < 3) & (np.abs(cage[:, 1] - waistY) < 4) & (arm < 0.1)
	frontZ = cage[front, 2].max()
	return dict(S=o('l_upperarm'), E=o('l_forearm'), W=o('l_hand'), crotchY=crotchY, waistY=waistY, frontZ=frontZ,
		headTop=cage[:, 1].max(), k=k / 100.0)


def arm_aim(preset, m, sx):
	"""The app's arm presets (same as body/pose.js ARMS before Genesis 9), for side sx (1 left, -1 right).
	m: rest_measures; offsets are app metres, times m['k'] (cm per metre of this body)."""
	k = m['k'] * 100
	X = lambda v: [v[0] * sx, v[1], v[2]]
	if preset == 'down': return {'upper': X([0.12, -1, 0.03]), 'fore': X([0.1, -1, 0.06])}
	if preset == 'front': return {'upper': X([0.06, -1, 0.16]), 'to': X([0.035 * k, m['crotchY'] + 0.02 * k, m['frontZ'] + 0.11 * k])}
	if preset == 'thigh': return {'upper': X([0.14, -1, 0.12]), 'to': X([0.11 * k, m['crotchY'] - 0.06 * k, m['frontZ'] + 0.05 * k])}
	if preset == 'hip': return {'upper': X([0.68, -0.6, -0.32]), 'to': X([m['S'][0] * 0.98, m['waistY'] - 0.04 * k, 0.0])}
	if preset == 'up': return {'upper': X([0.32, 1, -0.06]), 'to': X([0.02 * k, m['headTop'] + 0.02 * k, -0.04 * k]), 'collar': 25}
	raise ValueError(preset)


def stage2_jobs(bodies):
	jobs = []
	for b in bodies:
		m = rest_measures(b)
		poses = []
		for side, sx, other in (('l', 1, 'r'), ('r', -1, 'l')):
			for a in ARMS:
				poses.append(dict(key='arm-%s-%s' % (side, a), aim={side: arm_aim(a, m, sx), other: a_pose_aim(-sx)}, nodes='cage'))
		# the same shape as stage 1 (Stacy's face too): the app adds each arm's change from the A-pose
		jobs.append(dict(key=b['key'], out=body_dir(b['key']), presets=[STACY[0], *b['presets']], morphs={**b['morphs'], **STACY_MORPHS},
			poses=poses, expressions=[]))
	return jobs


def run_daz(jobs, name):
	os.makedirs(OUT, exist_ok=True)
	for j in jobs: os.makedirs(j['out'], exist_ok=True)
	jf = os.path.join(OUT, name + '.json').replace('\\', '/')
	json.dump({'library': LIB, 'neutral': NEUTRAL, 'bodies': jobs}, open(jf, 'w'), indent=1)
	logf = jf.replace('.json', '.log')
	if os.path.exists(logf): os.remove(logf)
	t0 = time.time()
	print('Daz Studio: %s, %d bodies...' % (name, len(jobs)), flush=True)
	subprocess.run([STUDIO, '-noPrompt', '-scriptArg', jf, os.path.join(HERE, 'bake_bodies.dsa').replace('\\', '/')], timeout=4 * 3600)
	print(open(logf).read() if os.path.exists(logf) else 'no log written', 'Daz Studio %.0f s' % (time.time() - t0), flush=True)


# --- Genesis 9 skin weights grouped into the app's body parts --------------------------------------

PARTS = ['shoulder', 'upperarm', 'forearm', 'upperleg', 'lowerleg', 'head', 'hand', 'spare']
_fig = None


def figure():
	global _fig
	if _fig is None: _fig = g9.load_figure()
	return _fig


def subtree(nodes, root):
	kids = {}
	for k, n in nodes.items():
		if n['parent']: kids.setdefault(n['parent'], []).append(k)
	out, stack = [], [root]
	while stack:
		k = stack.pop(); out.append(k); stack += kids.get(k, [])
	return out


def part_weights(fig):
	"""Per cage vertex, the skin weight of each app body part (sum over its Genesis 9 bones)."""
	nodes, W = fig['nodes'], fig['weights']
	groups = {'shoulder': [], 'upperarm': [], 'forearm': [], 'upperleg': [], 'lowerleg': [], 'head': [], 'hand': []}
	for s in 'lr':
		groups['shoulder'] += [s + '_shoulder']
		groups['hand'] += subtree(nodes, s + '_hand')
		groups['forearm'] += [b for b in subtree(nodes, s + '_forearm') if b not in groups['hand']]
		groups['upperarm'] += [b for b in subtree(nodes, s + '_upperarm') if b not in subtree(nodes, s + '_forearm')]
		groups['lowerleg'] += subtree(nodes, s + '_shin')
		groups['upperleg'] += [b for b in subtree(nodes, s + '_thigh') if b not in subtree(nodes, s + '_shin')]
	groups['head'] = subtree(nodes, 'head')
	n = len(fig['V'])
	out = {p: np.zeros(n) for p in PARTS}
	for p, bones in groups.items():
		for bn in bones:
			if bn in W: out[p] += W[bn]
	return out


def main():
	args = sys.argv[1:]
	keys = [a for a in args if not a.startswith('--')]
	bodies = [b for b in BODIES if not keys or b['key'] in keys]
	flags = {a for a in args if a.startswith('--')} or {'--stage1', '--stage2', '--convert'}
	if '--stage1' in flags: run_daz(stage1_jobs(bodies), 'stage1')
	if '--missing-poses' in flags:
		jobs = stage1_jobs(bodies, missing=True)
		if jobs: run_daz(jobs, 'stage1-missing')
	if '--stage2' in flags: run_daz(stage2_jobs(bodies), 'stage2')
	if '--convert' in flags:
		import convert_bodies
		convert_bodies.run()


if __name__ == '__main__':
	main()
