# Builds the mannequin bodies for poc-threejs from the CC0 MakeHuman base mesh (via MPFB 2).
#
# Run headless with the portable Blender in tools/ (see pipeline/README.md):
#   tools/blender-4.5.14-windows-x64/blender.exe -b --python pipeline/build_mannequins.py
#
# Every body is the same mesh with different vertex positions: the same vertex i is the same
# anatomical point on the child and on the adult. poc-threejs relies on that to define the
# leotard once (on the reference body) and have it fit every size.
#
# Per body: MakeHuman macros (female, age, build) -> uniform scale to a target stature -> pose
# the arms to a mannequin stance -> drop helper geometry -> "mannequinise" (abstract egg head,
# smoothed hands and feet, a light all-over smooth for a moulded look) -> one Catmull-Clark
# level -> split quads into triangles on a fixed diagonal (so topology stays identical).
#
# Output (poc-threejs/public/mannequins/):
#   manifest.json   vertex/index counts, per-body stature, landmarks and file names
#   shared.bin      Uint32 indices, then Uint8x8 per-vertex part weights (see PARTS below)
#   <body>.bin      Float32 xyz positions, metres, y up, +z = front of the body
import bpy, bmesh, json, math, os, struct, sys
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'poc-threejs', 'public', 'mannequins')

# MakeHuman's age slider: 0 = 1 year, 0.1875 = 11, 0.5 = 25, 1 = 90.
def age_value(years):
	if years < 11: return (years - 1) / 10 * 0.1875
	if years < 25: return 0.1875 + (years - 11) / 14 * 0.3125
	return 0.5 + (years - 25) / 65 * 0.5

# Statures follow children's/junior mannequin and dress-form charts (research_notes/
# mannequins_and_leotard_fit.md: ~130 / 155 / 163 / 165 cm), shaved a little because competitive
# gymnasts run short. Build: lean and somewhat muscular.
BODIES = [
	dict(key='child', label='Child (about 8)', years=8, stature=1.29, muscle=0.6, weight=0.42, cup=0.0),
	dict(key='teen', label='Teen (about 13)', years=13, stature=1.53, muscle=0.62, weight=0.44, cup=0.3),
	dict(key='young', label='Young adult (about 18)', years=18, stature=1.61, muscle=0.62, weight=0.45, cup=0.45),
	dict(key='adult', label='Adult (about 30)', years=30, stature=1.64, muscle=0.58, weight=0.5, cup=0.55),
]

# Mannequin stance: upper arm 13 deg out from vertical and a touch forward, elbow softly bent.
UPPER_DIR = Vector((math.sin(math.radians(13)), -0.06, -math.cos(math.radians(13)))).normalized()
ELBOW_BEND = math.radians(14)

ARM_BONES = ('upperarm', 'lowerarm', 'wrist', 'finger', 'metacarpal')
HAND_BONES = ('wrist', 'finger', 'metacarpal')
# Part weights exported per vertex, one byte each.
PARTS = ['shoulder', 'upperarm', 'forearm', 'upperleg', 'lowerleg', 'head', 'hand', 'spare']


def part_of(bone):
	if bone.startswith('shoulder01'): return 0
	if bone.startswith('upperarm'): return 1
	if bone.startswith('lowerarm'): return 2
	if bone.startswith(HAND_BONES): return 6
	if bone.startswith('upperleg'): return 3
	if bone.startswith(('lowerleg', 'foot', 'toe')): return 4
	return -1


def clear():
	for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
	for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
	for a in list(bpy.data.armatures): bpy.data.armatures.remove(a)


def descendants(bone):
	out = [bone]
	for c in bone.children: out += descendants(c)
	return out


def rotate_bone(rig, name, world_rot):
	"""Rotate a pose bone by world_rot (armature space) about its head, on top of its current pose."""
	pb = rig.pose.bones[name]
	pb.rotation_mode = 'QUATERNION'
	bpy.context.view_layer.update()
	cur = pb.matrix.to_quaternion()  # armature-space orientation including parents' pose
	pb.rotation_quaternion = pb.rotation_quaternion @ (cur.inverted() @ world_rot @ cur)
	bpy.context.view_layer.update()


def pose_arms(rig):
	for side, sx in (('L', 1), ('R', -1)):
		pb = rig.pose.bones
		target = UPPER_DIR.copy(); target.x *= sx
		a, b = pb['upperarm01.' + side].head, pb['upperarm02.' + side].tail
		rotate_bone(rig, 'upperarm01.' + side, (b - a).normalized().rotation_difference(target))
		# Forearm: the upper-arm direction bent forward (towards -y) about the elbow.
		fa = Matrix.Rotation(-ELBOW_BEND * 1.0, 3, Vector((1, 0, 0))) @ target
		e, w = pb['lowerarm01.' + side].head, pb['lowerarm02.' + side].tail
		rotate_bone(rig, 'lowerarm01.' + side, (w - e).normalized().rotation_difference(fa.normalized()))


def egg_sphere(bm, seg, rings):
	"""Unit UV sphere built vertex by vertex (bmesh's primitive is not ordered identically each run)."""
	verts = [bm.verts.new((0, 0, -1))]
	for r in range(1, rings):
		th = math.pi * r / rings - math.pi / 2
		for sg in range(seg):
			ph = 2 * math.pi * sg / seg
			verts.append(bm.verts.new((math.cos(th) * math.cos(ph), math.cos(th) * math.sin(ph), math.sin(th))))
	verts.append(bm.verts.new((0, 0, 1)))
	ring = lambda r, sg: verts[1 + (r - 1) * seg + sg % seg]
	for sg in range(seg):
		bm.faces.new((verts[0], ring(1, sg + 1), ring(1, sg)))
		bm.faces.new((verts[-1], ring(rings - 1, sg), ring(rings - 1, sg + 1)))
		for r in range(1, rings - 1):
			bm.faces.new((ring(r, sg), ring(r, sg + 1), ring(r + 1, sg + 1), ring(r + 1, sg)))
	return verts


def apply_modifiers(obj):
	bpy.context.view_layer.objects.active = obj
	obj.select_set(True)
	for m in list(obj.modifiers):
		bpy.ops.object.modifier_apply(modifier=m.name)


def group_weights(obj, names):
	idx = {obj.vertex_groups[n].index for n in names if n in obj.vertex_groups}
	return [sum(g.weight for g in v.groups if g.group in idx) for v in obj.data.vertices]


def build(spec):
	clear()
	macro = TargetService.get_default_macro_info_dict()
	macro.update(gender=0.0, age=age_value(spec['years']), muscle=spec['muscle'], weight=spec['weight'],
		proportions=1.0, height=0.5, cupsize=spec['cup'], firmness=0.4)
	human = HumanService.create_human(macro_detail_dict=macro, feet_on_ground=True, scale=0.1)
	rig = HumanService.add_builtin_rig(human, 'default')
	TargetService.bake_targets(human)  # shape keys -> plain mesh, so modifiers can be applied

	pose_arms(rig)

	# Head bones: the head and every face bone under it. Their vertices are replaced by an egg.
	head_bones = [b.name for b in descendants(rig.data.bones['head'])]

	apply_modifiers(human)  # mask (drops helper geometry) then armature (bakes the pose)
	human.parent = None
	human.matrix_world = rig.matrix_world @ human.matrix_world
	bpy.context.view_layer.objects.active = human
	bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

	pb = rig.pose.bones
	M = rig.matrix_world
	J = lambda n, tail=False: M @ (pb[n].tail if tail else pb[n].head)
	landmarks = {
		'neck_base': J('neck01'), 'head_base': J('head'), 'head_top': J('head', True),
		'shoulder_l': J('upperarm01.L'), 'elbow_l': J('lowerarm01.L'), 'wrist_l': J('wrist.L'),
		'hip_l': J('upperleg01.L'), 'knee_l': J('lowerleg01.L'), 'ankle_l': J('foot.L'),
		'pelvis': J('root'), 'chest': J('spine01'), 'waist': J('spine03'),
	}

	head_w = group_weights(human, head_bones)
	parts = [[0.0] * len(PARTS) for _ in human.data.vertices]
	gidx = {g.index: part_of(g.name) for g in human.vertex_groups}
	for v in human.data.vertices:
		for g in v.groups:
			p = gidx.get(g.group, -1)
			if p >= 0: parts[v.index][p] += g.weight
		parts[v.index][5] = head_w[v.index]

	bm = bmesh.new()
	bm.from_mesh(human.data)
	bm.verts.ensure_lookup_table()
	parts_layer = [bm.verts.layers.float.new('p_' + n) for n in PARTS]
	for v in bm.verts:
		for k, lay in enumerate(parts_layer): v[lay] = parts[v.index][k]

	# --- egg head ---------------------------------------------------------------------------
	head_verts = [v for v in bm.verts if v[parts_layer[5]] > 0.5]
	lo = Vector((min(v.co.x for v in head_verts), min(v.co.y for v in head_verts), min(v.co.z for v in head_verts)))
	hi = Vector((max(v.co.x for v in head_verts), max(v.co.y for v in head_verts), max(v.co.z for v in head_verts)))
	# Ears stick out of the skull, so the width comes from the inner 80% of the head.
	xs = sorted(abs(v.co.x) for v in head_verts)
	half_w = xs[int(len(xs) * 0.8)] * 0.96
	top = hi.z
	chin = landmarks['head_base'].z - (landmarks['head_top'].z - landmarks['head_base'].z) * 0.42
	rz = (top - chin) / 2
	ry = (hi.y - lo.y) / 2 * 0.86
	centre = Vector((0, (hi.y + lo.y) / 2 + ry * 0.04, (top + chin) / 2 - rz * 0.02))
	bmesh.ops.delete(bm, geom=head_verts, context='VERTS')
	egg = egg_sphere(bm, 40, 28)
	tilt = Matrix.Rotation(math.radians(-14), 3, 'X')  # chin forward, crown back
	for v in egg:
		x, y, z = v.co
		k = 1 + 0.17 * z if z < 0 else 1 + 0.03 * z  # narrower at the chin end
		p = Vector((x * half_w * k, y * ry * k, z * rz))
		v.co = centre + tilt @ p
		v[parts_layer[5]] = 1.0
		for k2 in (0, 1, 2, 3, 4, 6, 7): v[parts_layer[k2]] = 0.0

	# --- hands: soften the sculpted detail (nails, knuckles, finger gaps) ------------------------------------------
	hand = [v for v in bm.verts if v[parts_layer[6]] > 0.25]
	for _ in range(6): bmesh.ops.smooth_vert(bm, verts=hand, factor=0.45, use_axis_x=True, use_axis_y=True, use_axis_z=True)
	# --- bust: mannequins and dress forms have a smooth bust with no nipple. Mesh-graph smoothing
	# barely touches MakeHuman's nipple (a dense ring of tiny faces), so instead the bust's forward
	# height is fitted with a quadratic dome (area- and distance-weighted least squares) and the
	# mesh is replaced by that dome within 3 cm of the apex, blending back out by 5.5 cm.
	bm.normal_update()
	fwd = Vector((0, -1, 0))
	chest_lo, chest_hi = landmarks['waist'].z, landmarks['shoulder_l'].z
	R0, R1, FIT = 0.03, 0.055, 0.035
	for sx in (1, -1):
		side = [v for v in bm.verts if v.co.x * sx > 0.0 and chest_lo < v.co.z < chest_hi
			and v[parts_layer[1]] + v[parts_layer[2]] < 0.1 and v.normal.dot(fwd) > 0.15]
		apex = min(side, key=lambda v: v.co.y).co.copy()  # most forward point (front is -y)
		near = [v for v in side if (v.co.x - apex.x) ** 2 + (v.co.z - apex.z) ** 2 < R1 * R1]
		A = np.array([[1, v.co.x - apex.x, v.co.z - apex.z, (v.co.x - apex.x) ** 2, (v.co.x - apex.x) * (v.co.z - apex.z), (v.co.z - apex.z) ** 2] for v in near])
		d2 = A[:, 3] + A[:, 5]
		w = np.array([sum(f.calc_area() for f in v.link_faces) for v in near]) * np.exp(-d2 / (2 * FIT * FIT))
		y = np.array([v.co.y for v in near])
		coef = np.linalg.lstsq(A * w[:, None] ** 0.5, y * w ** 0.5, rcond=None)[0]
		dome = A @ coef
		for v, yd, dd in zip(near, dome, np.sqrt(d2)):
			k = min(1.0, max(0.0, (R1 - dd) / (R1 - R0)))
			k = k * k * (3 - 2 * k)
			v.co.y += (yd - v.co.y) * k

	# --- light all-over Taubin smooth: removes skin detail (nipples, knuckles, navel ridges)
	# without shrinking the body.
	body_verts = [v for v in bm.verts if v[parts_layer[5]] < 0.5]
	for _ in range(3):
		bmesh.ops.smooth_vert(bm, verts=body_verts, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
		bmesh.ops.smooth_vert(bm, verts=body_verts, factor=-0.53, use_axis_x=True, use_axis_y=True, use_axis_z=True)

	bm.to_mesh(human.data)
	bm.free()

	mod = human.modifiers.new('subd', 'SUBSURF')
	mod.levels = 1; mod.render_levels = 1; mod.quality = 3
	apply_modifiers(human)

	bm = bmesh.new()
	bm.from_mesh(human.data)
	bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
	parts_layer = [bm.verts.layers.float.get('p_' + n) for n in PARTS]
	# Blender z-up, front -y  ->  three.js y-up, front +z
	conv = lambda c: (c.x, c.z, -c.y)
	# Uniform scale to the target stature (MakeHuman's own height slider also reshapes the body).
	zs = [v.co.z for v in bm.verts]
	sc = spec['stature'] / (max(zs) - min(zs))
	pos = [tuple(c * sc for c in conv(v.co)) for v in bm.verts]
	# Split quads ourselves: Blender's triangulator picks diagonals by shape, which would give
	# each body a different triangle list.
	idx = []
	for f in bm.faces:
		vs = [v.index for v in f.verts]
		for k in range(1, len(vs) - 1): idx += (vs[0], vs[k], vs[k + 1])
	pw = [[min(255, max(0, round(v[l] * 255))) for l in parts_layer] for v in bm.verts]
	bm.free()
	lm = {k: [round(c * sc, 5) for c in conv(v)] for k, v in landmarks.items()}
	return pos, idx, pw, lm


def main():
	os.makedirs(OUT, exist_ok=True)
	manifest = {'source': 'MakeHuman base mesh (CC0) via MPFB 2, generated by pipeline/build_mannequins.py',
		'parts': PARTS, 'bodies': []}
	ref_idx = ref_pw = None
	for spec in BODIES:
		pos, idx, pw, lm = build(spec)
		if ref_idx is None:
			ref_idx, ref_pw = idx, pw
			with open(os.path.join(OUT, 'shared.bin'), 'wb') as f:
				f.write(struct.pack('<%dI' % len(idx), *idx))
				f.write(bytes(b for row in pw for b in row))
			manifest.update(vertices=len(pos), indices=len(idx))
		elif idx != ref_idx:
			raise RuntimeError('topology differs for ' + spec['key'])
		with open(os.path.join(OUT, spec['key'] + '.bin'), 'wb') as f:
			f.write(struct.pack('<%df' % (len(pos) * 3), *[c for p in pos for c in p]))
		ys = [p[1] for p in pos]
		manifest['bodies'].append({'key': spec['key'], 'label': spec['label'], 'years': spec['years'],
			'stature': round(max(ys) - min(ys), 4), 'file': spec['key'] + '.bin', 'landmarks': lm})
		print('BUILT', spec['key'], len(pos), 'verts', len(idx) // 3, 'tris', 'stature', max(ys) - min(ys))
	with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
		json.dump(manifest, f, indent=1)
	print('DONE', OUT)


main()
