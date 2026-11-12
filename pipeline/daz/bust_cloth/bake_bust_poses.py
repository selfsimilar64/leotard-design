# Bake the owner's bust starting shape (flatten 0.25, in-out 1.0) in the a-pose and chosen Daz poses.
import os, sys
sys.path.insert(0, r'C:/Users/mattj/leotard-design/pipeline/daz')
import bodies as Bd

keys = sys.argv[1].split(',')
poses = sys.argv[2].split(',')
jobs = []
for b in Bd.BODIES:
	if b['key'] not in keys: continue
	m = {**b['morphs'], **Bd.STACY_MORPHS, 'body_ctrl_BreastsFlatten': 0.25, 'body_ctrl_BreastsIn-Out': 1.0}
	out = os.path.join(Bd.HERE, 'out', 'bust-cloth', b['key'] + '-f25in10').replace(os.sep, '/') + '/'
	ps = [dict(key='a-pose', aim={'l': Bd.a_pose_aim(1), 'r': Bd.a_pose_aim(-1)}, nodes='cage')]
	ps += [dict(key=p['key'], preset=Bd.pose_preset(p), nodes='cage') for p in Bd.POSES if p['key'] in poses]
	jobs.append(dict(key=b['key'] + '-f25in10', out=out, presets=[Bd.STACY[0], *b['presets']], morphs=m, poses=ps, expressions=[]))
Bd.run_daz(jobs, 'bust-cloth-poses')
