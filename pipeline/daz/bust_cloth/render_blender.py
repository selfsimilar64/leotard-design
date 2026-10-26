# blender -b -P render_blender.py -- jobs.json
# jobs.json: {"res":[w,h], "items":[{"obj":path, "out":png, "target":[x,y,z] (blender m), "view":"front|34|side", "dist":m, "ortho":size}]}
import bpy, json, sys, math
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
J = json.load(open(args[0]))
scn = bpy.context.scene
scn.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
scn.render.resolution_x, scn.render.resolution_y = J['res']
scn.render.film_transparent = False
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.03, 0.035, 0.045, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
mat = bpy.data.materials.new('skin'); mat.use_nodes = True
bs = mat.node_tree.nodes['Principled BSDF']
bs.inputs['Base Color'].default_value = (0.78, 0.76, 0.74, 1); bs.inputs['Roughness'].default_value = 0.45
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scn.collection.objects.link(cam); scn.camera = cam
def light(name, rot, energy, size=3):
	l = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN')); l.data.energy = energy; l.data.angle = math.radians(size)
	l.rotation_euler = [math.radians(a) for a in rot]; scn.collection.objects.link(l)
light('key', (55, 0, 35), 3.0, 8)
light('fill', (70, 0, -60), 0.9, 20)
light('top', (15, 0, 180), 1.0, 10)
LZ = {n: bpy.data.objects[n].rotation_euler[2] for n in ('key', 'fill', 'top')}
cur = None
for it in J['items']:
	if cur is None or cur[0] != it['obj']:
		if cur: bpy.data.objects.remove(cur[1])
		bpy.ops.wm.obj_import(filepath=it['obj'], forward_axis='Y', up_axis='Z')
		ob = bpy.context.selected_objects[0]; ob.data.materials.clear(); ob.data.materials.append(mat)
		for p in ob.data.polygons: p.use_smooth = True
		cur = (it['obj'], ob)
	t = Vector(it['target']); a = {'front': 0, '34': 35, 'side': 90, 'back': 180, 'back34': 145, 'low': 180}.get(it['view'], 0)
	e = it.get('elev', -40 if it['view'] == 'low' else 0)
	d = it.get('dist', 1.2)
	ce = math.cos(math.radians(e))
	cam.location = t + Vector((math.sin(math.radians(a)) * d * ce, -math.cos(math.radians(a)) * d * ce, math.sin(math.radians(e)) * d))
	cam.rotation_euler = (math.radians(90 - e), 0, math.radians(a))
	for nm, z0 in LZ.items(): bpy.data.objects[nm].rotation_euler[2] = z0 + math.radians(a)
	cam.data.type = 'ORTHO'; cam.data.ortho_scale = it.get('ortho', 0.42)
	scn.render.filepath = it['out']
	bpy.ops.render.render(write_still=True)
