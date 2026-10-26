# python bake_variant.py <suffix> <body,body> key=value ...   (Daz morph overrides; 0 removes)
import os, sys
sys.path.insert(0, r'C:/Users/mattj/leotard-design/pipeline/daz')
import bodies as Bd

suffix, keys = sys.argv[1], sys.argv[2].split(',')
over = {k: float(v) for k, v in (a.split('=') for a in sys.argv[3:])}
jobs = []
for b in Bd.BODIES:
	if b['key'] not in keys: continue
	m = {**b['morphs'], **Bd.STACY_MORPHS}
	for k, v in over.items():
		if v == 0: m.pop(k, None)
		else: m[k] = v
	out = os.path.join(Bd.HERE, 'out', 'bust-cloth', b['key'] + '-' + suffix).replace(os.sep, '/') + '/'
	jobs.append(dict(key=b['key'] + '-' + suffix, out=out, presets=[Bd.STACY[0], *b['presets']], morphs=m,
		poses=[dict(key='a-pose', aim={'l': Bd.a_pose_aim(1), 'r': Bd.a_pose_aim(-1)}, nodes='cage')], expressions=[]))
	print(jobs[-1]['key'], m)
Bd.run_daz(jobs, 'bust-cloth-' + suffix)
