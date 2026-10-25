# Blender script for pipeline/daz/fit_hair.py: writes mesh objects of a Character Creator .blend as
# one OBJ and unpacks their materials' maps.
#
#   blender -b file.blend --python blend_to_obj.py -- out_dir Object1 Object2 ...
#
# out_dir/scene.obj: world space converted to Daz axes (y up, +z front, centimetres; CC characters
# face -y in Blender, metres), one `o` block per object, per-face materials and UVs.
# out_dir/maps.json: { material: { diffuse, alpha, bump: file name } } for every material of the
# objects (the Reallusion shader group's Diffuse / Alpha / Bump Map inputs), files beside it.
import bpy, json, os, sys

args = sys.argv[sys.argv.index('--') + 1:]
out, names = args[0], args[1:]
os.makedirs(out, exist_ok=True)
dg = bpy.context.evaluated_depsgraph_get()
SOCKETS = {'Diffuse Map': 'diffuse', 'Alpha Map': 'alpha', 'Bump Map': 'bump'}
maps = {}
with open(os.path.join(out, 'scene.obj'), 'w') as f:
	base_v, base_t = 1, 1
	for nm in names:
		o = bpy.data.objects[nm]
		e = o.evaluated_get(dg)
		me = e.to_mesh()
		M = o.matrix_world
		f.write('o %s\n' % nm)
		for v in me.vertices:
			p = M @ v.co
			f.write('v %.5f %.5f %.5f\n' % (p.x * 100, p.z * 100, -p.y * 100))
		uv = me.uv_layers.active.data
		for l in me.loops: f.write('vt %.6f %.6f\n' % tuple(uv[l.index].uv))
		mats = [s.material for s in o.material_slots]
		cur = None
		for p in me.polygons:
			m = mats[p.material_index].name if mats and mats[p.material_index] else 'none'
			if m != cur: f.write('usemtl %s\n' % m); cur = m
			f.write('f ' + ' '.join('%d/%d' % (me.loops[li].vertex_index + base_v, li + base_t) for li in p.loop_indices) + '\n')
		base_v += len(me.vertices); base_t += len(me.loops)
		e.to_mesh_clear()
		for m in mats:
			if not m or not m.use_nodes or m.name in maps: continue
			rec = maps[m.name] = {}
			for n in m.node_tree.nodes:
				if n.type != 'TEX_IMAGE' or not n.image: continue
				for l in n.outputs[0].links:
					k = SOCKETS.get(l.to_socket.name)
					if not k or k in rec: continue
					im = n.image
					ext = os.path.splitext(im.filepath)[1].lower() or '.png'
					fn = bpy.path.clean_name(m.name) + '_' + k + ext
					if im.packed_file: open(os.path.join(out, fn), 'wb').write(im.packed_file.data)
					else:
						im.filepath_raw = os.path.join(out, fn); im.save()
					rec[k] = fn
json.dump(maps, open(os.path.join(out, 'maps.json'), 'w'), indent=1)
print('WROTE', out)
