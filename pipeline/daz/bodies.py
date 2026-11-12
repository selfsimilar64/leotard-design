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
# Stage 2 (the reference body only since 2026-10-26): the arm poses (ARMS), one side at a time, the other arm in the a-pose: the app
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
# Motionless Mannequin Poses (Daz Originals, bought 2026-11-12): the Feminine set (poses 01-15 retuned
# for a feminine figure: arms clear of the hips, hip height) by its number in the pack.
_MD = P9 + 'Poses/Daz Originals/Motionless/Feminine/'
MOTIONLESS_POSE = lambda n: next(_MD + f for f in os.listdir(LIB + _MD) if f.startswith('Motionless Genesis 9 Base Feminine %02d ' % n) and f.endswith('.duf'))
# A POSES entry's preset: n = Skillful Routine number, mn = Motionless number (bust_cloth/bake_bust_poses.py uses it too).
pose_preset = lambda p: MOTIONLESS_POSE(p['mn']) if 'mn' in p else DAZ_POSE(p['n'])
EXPR = lambda n: next(_ED + f for f in os.listdir(LIB + _ED) if f.startswith('SR Expression %02d ' % n) and f.endswith('.duf'))
NEUTRAL = P9 + 'Expressions/3D Sugar/0 Expression.duf'
# The person is Stacy (CaramelDream3D) on every body since 2026-10-21 (owner's choice): her face
# (the CD Stacy Head morph, on top of each body's age and character shape; not her body morph, so
# ages and builds stay; the adults' characters shape only the body, so their face is hers alone),
# her skin, eyes and lashes. Her skin is the only one the app shows.
_ST = P9 + 'Characters/CaramelDream3D/Stacy/MATERIAL/'
STACY = [_ST + 'Stacy Skin.duf', [_ST + 'Eyes/Stacy Eyes 00.duf', 'Genesis9Eyes'], [_ST + 'Stacy Eyelashes 01.duf', 'Genesis9Eyelashes']]
STACY_MORPHS = {'CD Stacy Head': 1}
EIRGRID = [P9 + 'Hair/Daz Originals/Eirgrid Hair/Eirgrid Hair G9.duf', [P9 + 'Hair/Daz Originals/Eirgrid Hair/Materials Iray/Eirgrid 10 M Brown.duf', 'Eirgrid']]
# The hairs the app offers (body.hair). Eirgrid is baked by Daz with every figure; the others are
# Character Creator hair cards from the owner's free downloads (2026-10-21), fitted to the bare
# Genesis 9 head by fit_hair.py and carried per body and pose by convert_bodies.py (the head's
# cranium similarity, then hair_shift like Eirgrid). node: the figure.bin mesh's node name.
# zip / blend_archive: the download and the .blend inside it; objects: what blend_to_obj.py writes
# (hair, CC head, CC eyes); materials: CC material -> app material name; head, eyes: CC materials
# used for the fit; scalp: the cap materials (kept closer to the skin); tint: the colour (display
# values) multiplying the colour map; strands: the archive in the zip with the maps the .blend links
# but lacks: the colour, roughness and specular maps are then made from the hair shader's maps
# (fit_hair.strand_maps) and the app shades it as strands (figure.js).
_DL = os.path.join(os.path.expanduser('~'), 'Downloads')
HAIRS = [
	dict(key='eirgrid', label='Long braids', node='aprilyshEirgridHair_428373'),
	dict(key='high-ponytail', label='Slicked-back high bun', node='CCHighPonytail',  # key kept from its first, wrong label: designs and commands name a hair by key
		zip=os.path.join(_DL, 'female hair.zip'), blend_archive='Blender File.rar', objects=['Hair', 'Body', 'Eye'],
		# its scalp cap is invisible in the original (shader Opacity 0) and left out; its diffuse map is a
		# flat near-black in another layout than the cut-out (white along the edges, which showed as white
		# flakes): the strand maps instead, tinted a mid brown (in the app, this tint matches a Blender
		# render of the original shader given the earlier plain brown 0.42, 0.27, 0.19; 2026-10-26)
		materials={'High_polytail_Transparency': 'Ponytail'}, scalp=[], tint=[0.27, 0.19, 0.145], strands='texture.rar',
		head='Std_Skin_Head', eyes=['Std_Eye_L', 'Std_Eye_R']),
	dict(key='bun-bangs', label='High bun with bangs', node='CCBunBangs',
		zip=os.path.join(_DL, 'next-gen 3d female bun bangs hairstyle pbr real-time ready.zip'), blend_archive='blender file.zip',
		objects=['Hair_TUR', 'Scalp', 'Body', 'Eye'],
		materials={'Haircard_01_Transparency': 'Bun Card 1', 'Haircard_02_Transparency': 'Bun Card 2',
			'Haircard_03_Transparency': 'Bun Card 3', 'Haircard_04_Transparency': 'Bun Card 4', 'Scalp1_Transparency': 'Bun Scalp'},
		scalp=['Scalp1_Transparency'], head='Skin_Head', eyes=['Eye_L', 'Eye_R']),
]

ATHLETIC = {'body_bs_FlexGluteClenchL': 0.35, 'body_bs_FlexGluteClenchR': 0.35, 'body_bs_FlexQuadL': 0.3,
	'body_bs_FlexQuadR': 0.3, 'body_bs_FlexCalfL': 0.3, 'body_bs_FlexCalfR': 0.3,
	'body_bs_FlexHamstringL': 0.2, 'body_bs_FlexHamstringR': 0.2}
# Sports-bra bust (owner, 2026-10-25): the Daz starting shape of every body past childhood, a quarter
# flattened and the breasts drawn together; shapes.py then lifts it and drapes our taut cloth over it
# (knowledge decisions/2026-10-25-sports-bra-cloth-bust.md; before: flatten 1, in-out 0.5,
# decisions/2026-10-25-sports-bra-bust.md). Shape and pectoral controls only; bake_bodies.dsa sets them
# again after each pose preset (Skillful Routine poses write 0 to every breast control).
BUST = {'body_ctrl_BreastsFlatten': 0.25, 'body_ctrl_BreastsIn-Out': 1.0}

# Body types. stature: the body is scaled uniformly to it (metres). The adults keep the recipes of
# the earlier wrapped Daz bodies (knowledge: daz-bodies); ages come from Growing Up. Characters are
# dialled by their controller morph (the character .duf presets open a dialog that stops the run).
# `young` is the reference body every design is drawn on.
# skin: the Daz skin set each body was baked with before Stacy (unused since: every body wears
# Stacy's skin, STACY).
BODIES = [
	dict(key='child-6', label='Child, about 6', years=6, stature=1.17, skin=1, presets=[AGE_P('5-6')], morphs={}),
	dict(key='child', label='Child, about 9', years=9, stature=1.33, skin=1, presets=[AGE_P('9-10')], morphs={}),
	# the young teen keeps Kat's head half only (the face as before); none of her adult body (owner, 2026-10-28)
	dict(key='teen', label='Young teen, about 13', years=13, stature=1.55, skin=2, presets=[AGE_P('young-teen')],
		morphs={'Kat_head_bs_Head': 1, **BUST}),
	dict(key='older-teen', label='Older teen, about 16', years=16, stature=1.6, skin=3, presets=[AGE_P('older-teen')], morphs={**BUST}),
	# the adults take only their character's body half (a *_figure_ctrl_Character dials *_head_bs_Head
	# and *_body_bs_body at 1 and nothing else), so the face is Stacy's alone (owner, 2026-10-26)
	dict(key='young', label='Young adult, athletic', years=18, stature=1.61, skin=2, presets=[],
		morphs={'Kat_body_bs_body': 1, **ATHLETIC, **BUST}),
	dict(key='adult', label='Adult, about 30', years=30, stature=1.64, skin=4, presets=[],
		morphs={'BaseFeminine_body_bs_Body': 1, **{k: v * 0.8 for k, v in ATHLETIC.items()}, **BUST}),
]
REF = 'young'

# Poses. 'a-pose': the mannequin stance (upper arm 13 degrees from vertical, a little forward;
# elbow bent 14 degrees forward), the rest pose every design is drawn in. Daz poses: 10 of the 30 in
# Skillful Routine (3D Sugar), the first five chosen in 2026-10 as the ones that show a leotard
# best, the rest added on the owner's request (2026-10-21); 17 others were removed on the owner's
# request (2026-10-26), and handstand, cartwheel low and lunge arm up on 2026-10-28 (fewer to shape). The app's pose picker lists them in this order. n: the pose's number in the pack (SR G9 Feminine NN ...); the props some of its
# previews show (ball, hoop) are not part of the figure.
UPPER_DIR = [math.sin(math.radians(13)), -math.cos(math.radians(13)), 0.06]
ELBOW_BEND = math.radians(14)
POSES = [
	dict(key='standing', label='Standing, presenting', n=5),
	dict(key='arms-outstretched', label='Arms outstretched', n=1),
	dict(key='passe', label='On one leg, hands behind head', n=8),
	dict(key='stag-jump', label='Stag jump', n=25),
	dict(key='kneeling', label='Kneeling', n=13),
	dict(key='lunge-arms-up', label='Low lunge, arms up', n=2),
	dict(key='back-arched', label='Bridge, back arched', n=17),
	dict(key='kneeling-arm-up', label='Kneeling, arm up', n=22),
	dict(key='arms-open', label='Arms open', n=29),
	dict(key='one-knee', label='On one knee', n=30),
	# Motionless Mannequin Poses, picked by the owner 2026-11-12 (mn: Feminine NN in that pack). Keys
	# start 'mm-' so none collides with the old arm poses of body/pose.js ('hands-on-hips', ...).
	# Labels kept to about 13 characters: the picker's tiles cut longer ones (07 and 08 both "look to the side").
	dict(key='mm-standing-on-leg', label='Weight shift', mn=3),
	dict(key='mm-looking-side', label='Feet apart', mn=7),
	dict(key='mm-looking-side-2', label='Feet together', mn=8),
	dict(key='mm-hand-on-hip', label='Hand on hip', mn=11),
	dict(key='mm-hands-on-hips', label='Hands on hips', mn=14),
]
# Arm poses (the app's 'arms-down', 'hands-on-hips', ...: body/pose.js): each arm separately.
# Since 2026-10-26 only 'up' on the reference body is baked: the curves' open surface needs it
# (app body/reference.js openSurface); the arm-only poses left the picker on 2026-10-21 and the owner
# asked that no more work go into them ('down', 'front', 'thigh', 'hip' were baked before).
ARMS = ['up']
EXPRESSIONS = [
	dict(key='neutral', label='Neutral', preset=NEUTRAL),
	# smile (SR 13), closed-mouth smile (SR 26) and focused (SR 16) removed on the owner's request
	# (2026-10-26); a design saved with one shows the neutral face (render/figure.js filesFor)
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
			todo = [dict(key=p['key'], preset=pose_preset(p), nodes='all') for p in POSES if not os.path.exists(body_dir(b['key']) + p['key'] + '.pts')]
			if todo: jobs.append(dict(key=b['key'], out=body_dir(b['key']), presets=[*STACY, *b["presets"], *EIRGRID],
				morphs={**b['morphs'], **STACY_MORPHS}, poses=todo, materials=False, expressions=[]))
		return jobs
	jobs = [dict(key='bare', out=body_dir('bare'), presets=[*EIRGRID], morphs={}, obj=True, materials=True,
		poses=[dict(key='zero', nodes='all')], expressions=[])]
	for b in bodies:
		poses = [dict(key='a-pose', aim={'l': a_pose_aim(1), 'r': a_pose_aim(-1)}, nodes='all')]
		poses += [dict(key=p['key'], preset=pose_preset(p), nodes='all') for p in POSES]
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
		if b['key'] != REF: continue  # only the reference body's raised arms are used (ARMS)
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
