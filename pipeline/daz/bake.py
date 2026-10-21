# Figure scenes for the app's "real person" renders: Genesis 9 with a head, face, expression,
# age and gymnastics pose, baked by Daz Studio and converted for three.js.
#
#   python pipeline/daz/bake.py [scene keys...]          (bake in Daz Studio, then convert)
#   python pipeline/daz/bake.py --convert [scene keys...] (convert an earlier bake only)
#
# Stage 1 (Daz Studio, bake_scenes.dsa): each scene's presets are applied to Genesis 9 in Daz
# Studio itself (character, skin, Growing Up age, Skillful Routine pose and expression), so Daz does
# the shaping, posing, joint correctives and fitting of the eyes, mouth, lashes and brows. Output per
# scene in pipeline/daz/out/<key>/: scene.obj (base resolution, cm), materials.json, bones.json.
# Stage 2 (convert.py): meshes, textures and the mannequin mesh carried onto the posed body for the
# app, in app/public/figures-daz/.
#
# Everything written here is derived from the owner's licensed Daz content: both output folders are
# git-ignored (see knowledge/engineering/pipeline/daz-figures.md for licensing).
import json, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('DAZ_LIBRARY', r'C:/Users/Public/Documents/My DAZ 3D Library').replace('\\', '/').rstrip('/') + '/'
STUDIO = os.environ.get('DAZ_STUDIO', r'C:/Program Files/DAZ 3D/DAZStudio6/DAZStudio.exe')
OUT = os.path.join(HERE, 'out')

G9 = 'People/Genesis 9/'
# Characters are dialled by their controller morph ('Kat_figure_ctrl_Character': 1): the character
# presets (People/Genesis 9/Characters/*.duf) open an "apply to selected?" dialog even with -noPrompt,
# which ends the unattended run.
SKIN = lambda i: G9 + 'Materials/Daz Originals/Base Materials/G9 Feminine Skin %02d MAT.duf' % i
AGE = {'5-6': 'Growing Up 01 5-6', '9-10': 'Growing Up 02 9-10', 'young-teen': 'Growing Up 03 Young Teen',
	'older-teen': 'Growing Up 04 Older Teen', 'adult': 'Growing Up 05 Adult'}
AGE_P = lambda a: G9 + 'Shapes/Zev0/Growing Up/Age Presets/%s.duf' % AGE[a]
POSE = lambda n: next(G9 + 'Poses/3D Sugar/Skillful Routine/Feminine/' + f for f in
	os.listdir(LIB + G9 + 'Poses/3D Sugar/Skillful Routine/Feminine') if f.startswith('SR G9 Feminine %02d ' % n) and f.endswith('.duf'))
EXPR = lambda n: next(G9 + 'Expressions/3D Sugar/Skilfull Routine/' + f for f in
	os.listdir(LIB + G9 + 'Expressions/3D Sugar/Skilfull Routine') if f.startswith('SR Expression %02d ' % n) and f.endswith('.duf'))

HAIR_CAP = G9 + 'Hair/Daz Originals/Base Hair/G9 Base dForce Pixie Hair.duf'

# Hair colours (linear RGB) for the competition bun (hair.py)
HAIR = {'blonde': [0.36, 0.25, 0.13], 'light-brown': [0.2, 0.12, 0.065], 'dark-brown': [0.085, 0.052, 0.032],
	'black': [0.025, 0.02, 0.018], 'auburn': [0.22, 0.085, 0.04]}
TIE = {'black': [0.03, 0.03, 0.035], 'pink': [0.8, 0.25, 0.4], 'white': [0.85, 0.85, 0.85], 'navy': [0.03, 0.05, 0.18]}
NEUTRAL = G9 + 'Expressions/3D Sugar/0 Expression.duf'
EIRGRID = lambda mat: [G9 + 'Hair/Daz Originals/Eirgrid Hair/Eirgrid Hair G9.duf', [G9 + 'Hair/Daz Originals/Eirgrid Hair/Materials Iray/Eirgrid %s.duf' % mat, 'Eirgrid']]
PIXIE = [G9 + 'Hair/Daz Originals/Base Hair/G9 Base dForce Pixie Hair.duf']

# Scenes. presets in application order (skin, age, pose, expression; the pose carries its own face,
# so the expression comes after it); morphs set afterwards (modifier or controller name -> value).
# Expressions: 13 smile with teeth, 26 / 29 closed-mouth smiles; 27 "Soft Smile" closes the eyes.
SCENES = [
	# the bare figure (no shape, pose or expression) with the hair cap and Eirgrid: where the brows,
	# lashes, tear film, cap and hairs sit on the skin (convert.py re-attaches them to every scene's skin; Daz moves them
	# with the bones but not with the Growing Up and character head shapes)
	dict(key='rest', label='rest', presets=[], morphs={}, hair=True, rest=True, daz_hair=EIRGRID('10 M Brown')),
	dict(key='kid9-salute', label='Girl about 9, arms outstretched, smiling', years=9,
		presets=[SKIN(1), AGE_P('9-10'), POSE(1), EXPR(13)], morphs={}, hair={'colour': HAIR['light-brown'], 'tie': TIE['pink']}),
	dict(key='teen-kat-armup', label='Young teen (Kat), one arm up, soft smile', years=13,
		presets=[SKIN(2), AGE_P('young-teen'), POSE(10), EXPR(26)], morphs={'Kat_figure_ctrl_Character': 1}, hair={'colour': HAIR['dark-brown'], 'tie': TIE['black']}),
	dict(key='teen-leap', label='Older teen, split leap, smiling', years=16,
		presets=[SKIN(3), AGE_P('older-teen'), POSE(16), EXPR(13)], morphs={}, hair={'colour': HAIR['black'], 'tie': TIE['white']}),
	# Daz's own hairs (owner, 2026-10-21: the procedural bun "looks so bad"; try the built-in hairs)
	dict(key='hair-eirgrid-adult', label='Adult (Amala), Eirgrid hair', years=22,
		presets=[SKIN(4), POSE(18), NEUTRAL], morphs={'Amala_figure_ctrl_Character': 1}, daz_hair=EIRGRID('10 M BrownDk')),
	dict(key='hair-eirgrid-teen', label='Young teen (Kat), Eirgrid hair', years=13,
		presets=[SKIN(2), AGE_P('young-teen'), POSE(10), EXPR(26)], morphs={'Kat_figure_ctrl_Character': 1}, daz_hair=EIRGRID('10 M Brown')),
	dict(key='hair-pixie-teen', label='Young teen (Kat), Pixie hair', years=13,
		presets=[SKIN(2), AGE_P('young-teen'), POSE(10), EXPR(26)], morphs={'Kat_figure_ctrl_Character': 1}, daz_hair=PIXIE),
	# (pose 29 "Arms Open" throws the head back: the face is never seen)
	dict(key='adult-amala-arms', label='Adult (Amala), on one leg, arms up, neutral', years=22,
		presets=[SKIN(4), POSE(18), NEUTRAL], morphs={'Amala_figure_ctrl_Character': 1}, hair={'colour': HAIR['black'], 'tie': TIE['black']}),
	dict(key='kid6-standing', label='Girl about 6, standing, smiling', years=6,
		presets=[SKIN(1), AGE_P('5-6'), POSE(5), EXPR(13)], morphs={}, hair={'colour': HAIR['auburn'], 'tie': TIE['navy']}),
	dict(key='teen-laura-passe', label='Young teen (Laura), on one leg, smiling', years=14,
		presets=[SKIN(2), AGE_P('young-teen'), POSE(8), EXPR(29)], morphs={'Laura_figure_ctrl_Character': 1}, hair={'colour': HAIR['blonde'], 'tie': TIE['pink']}),
]


def bake(scenes):
	os.makedirs(OUT, exist_ok=True)
	jobs = {'library': LIB, 'jobs': []}
	for s in scenes:
		d = os.path.join(OUT, s['key']).replace('\\', '/') + '/'
		os.makedirs(d, exist_ok=True)
		presets, remove = list(s['presets']), []
		presets += s.get('daz_hair', [])  # Daz's own hair: [figure preset, [material preset, node name part]]
		if s.get('hair'):
			# competition hair is built in convert.py on the Pixie hair's fitted scalp cap (the strands
			# are dropped: Daz's short pixie cut is not a competition style)
			presets.append(HAIR_CAP); remove.append('Pixie Cut')
		jobs['jobs'].append({'out': d, 'presets': presets, 'morphs': s.get('morphs', {}), 'remove': remove})
	jf = os.path.join(OUT, 'jobs.json').replace('\\', '/')
	json.dump(jobs, open(jf, 'w'), indent=1)
	logf = jf.replace('.json', '.log')
	if os.path.exists(logf): os.remove(logf)
	t0 = time.time()
	print('Daz Studio: %d scene(s)...' % len(scenes), flush=True)
	subprocess.run([STUDIO, '-noPrompt', '-scriptArg', jf, os.path.join(HERE, 'bake_scenes.dsa').replace('\\', '/')], timeout=3600)
	print(open(logf).read() if os.path.exists(logf) else 'no log written', 'Daz Studio %.0fs' % (time.time() - t0))


def main():
	args = sys.argv[1:]
	convert_only = '--convert' in args
	keys = [a for a in args if not a.startswith('--')]
	scenes = [s for s in SCENES if not keys or s['key'] in keys]
	if not convert_only: bake(scenes)
	import convert
	convert.run(scenes, OUT)


if __name__ == '__main__':
	main()
