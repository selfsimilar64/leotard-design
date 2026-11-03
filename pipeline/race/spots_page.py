"""A page that shows the unsettled spots in 3D (three.js), since flat plots of them are unreadable: the whole garment with the spots marked,
and each spot close up with the body under it.
    python pipeline/race/spots_page.py [pose]
Writes app/captures/race/spots-young-<pose>.html (git-ignored: derived from licensed data); open it in a browser.
Spec: knowledge/engineering/app/solver-race-plan.md (stage 1).
"""
import json
import os
import sys

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from energy import Energy, alternating_residual  # noqa: E402

CAP = os.path.join(HERE, '..', '..', 'app', 'captures', 'race')

PAGE = r"""<!doctype html><html><head><meta charset="utf-8"><title>Unsettled spots</title>
<style>body{margin:0;background:#f4f2ee;font:13px system-ui,sans-serif;color:#222}#grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:6px}
.cell{position:relative;background:#fff;height:46vh}.cell canvas{width:100%;height:100%;display:block}.cap{position:absolute;left:8px;top:6px;background:#fffc;padding:2px 6px}
#key{padding:4px 10px}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
</head><body><div id="key">Blue: fabric. Red: triangles turned inside out. Orange: stretched over 1.3x. Black line: elastic edge. Skin: the body. Drag to turn a view.</div><div id="grid"></div>
<script type="module">
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const D = __DATA__;
function mesh(pos, idx, cols, opts){
  const g = new THREE.BufferGeometry();
  const P = new Float32Array(idx.length*3), C = new Float32Array(idx.length*3);
  for(let t=0;t<idx.length/3;t++) for(let k=0;k<3;k++){const v=idx[3*t+k];for(let a=0;a<3;a++){P[9*t+3*k+a]=pos[3*v+a];C[9*t+3*k+a]=cols?cols[3*t+a]:opts.c[a];}}
  g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('color',new THREE.BufferAttribute(C,3));g.computeVertexNormals();
  return new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.8,flatShading:true,transparent:!!opts.o,opacity:opts.o||1,depthWrite:!opts.o}));
}
function view(title, items, centre, eye, r){
  const cell=document.createElement('div');cell.className='cell';document.getElementById('grid').appendChild(cell);
  const cap=document.createElement('div');cap.className='cap';cap.textContent=title;cell.appendChild(cap);
  const R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});cell.appendChild(R.domElement);
  const w=cell.clientWidth||innerWidth/2-12,h=cell.clientHeight||innerHeight*.46;R.setPixelRatio(devicePixelRatio);R.setSize(w,h);
  const S=new THREE.Scene();S.background=new THREE.Color(0xffffff);
  S.add(new THREE.HemisphereLight(0xffffff,0x888888,1.6));const L=new THREE.DirectionalLight(0xffffff,1.4);S.add(L);
  for(const it of items) S.add(it);
  const cam=new THREE.PerspectiveCamera(30,w/h,r/50,r*50);const c=new THREE.Vector3(...centre);
  cam.position.copy(c).add(new THREE.Vector3(...eye).normalize().multiplyScalar(r*3.2));cam.lookAt(c);
  const ctl=new OrbitControls(cam,R.domElement);ctl.target.copy(c);
  const draw=()=>{L.position.copy(cam.position);R.render(S,cam);};ctl.addEventListener('change',draw);ctl.update();draw();
}
const G=D.garment, B=D.body;
const body=()=>mesh(B.P,B.I,null,{c:[.86,.72,.62]});
const all=[mesh(G.P,G.I,G.C,{}),mesh(B.P,B.I,null,{c:[.86,.72,.62],o:.25})];
for(const s of D.spots){const m=new THREE.Mesh(new THREE.SphereGeometry(.025,16,12),new THREE.MeshBasicMaterial({color:0xdd2222,transparent:true,opacity:.5}));m.position.set(...s.centre);all.push(m);}
view('Where: the whole garment, spots ringed in red', all, D.centre, D.eye, .55);
D.spots.forEach((s,i)=>{
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(s.lines),3));
  const items=[mesh(G.P,s.I,s.C,{}),mesh(B.P,s.B,null,{c:[.86,.72,.62]}),new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0}))];
  view(`Spot ${i+1}: ${s.title}`, items, s.centre, s.eye, .07);
});
</script></body></html>"""


def colours(flip, stretch):
	c = np.tile([0.45, 0.62, 0.85], (len(flip), 1))
	c[stretch > 1.3] = [0.95, 0.6, 0.15]
	c[flip] = [0.85, 0.12, 0.12]
	return c


def main():
	pose = sys.argv[1] if len(sys.argv) > 1 else 'back-arched'
	case = dict(np.load(os.path.join(CAP, f'case-young-{pose}.npz')))
	x, tris, tag = case['alt_1440_on'], case['tris'], case['tag']
	En = Energy(case)
	En(case['alt_1080'])
	En(case['alt_1440'])
	r = np.linalg.norm(alternating_residual(case, case['alt_1440'], En.was), axis=1)
	hot = np.where(r > 0.01)[0]
	n = En.was
	F = np.stack([x[tris[:, 1]] - x[tris[:, 0]], x[tris[:, 2]] - x[tris[:, 0]]], axis=2) @ En.Dm_inv
	flip = (np.cross(F[:, :, 0], F[:, :, 1]) * n[tris].sum(1)).sum(1) * case['facing'] < 0
	stretch = np.linalg.svd(F, compute_uv=False)[:, 0]
	pairs = cKDTree(x[hot]).query_pairs(0.03, output_type='ndarray')
	k, label = connected_components(coo_matrix((np.ones(len(pairs)), (pairs[:, 0], pairs[:, 1])), shape=(len(hot), len(hot))), directed=False)
	spots = [sp for sp in sorted([hot[label == i] for i in range(k)], key=len, reverse=True) if len(sp) >= 3]
	BP, BT = case['surface_P'], case['surface_idx'].reshape(-1, 3)
	BP = BP - 0.002 * En.surface.N  # drawn 2 mm under the fabric, which lies on this surface, so the two do not flicker through each other
	keep_b = np.zeros(len(BP), bool)
	keep_b[np.unique(BT)] = True
	el = case['elastic'][:, :2].astype(int)
	r6 = lambda a: np.round(np.asarray(a, float), 5).ravel().tolist()
	out = dict(garment=dict(P=r6(x), I=tris.ravel().tolist(), C=r6(colours(flip, stretch))), body=dict(P=r6(BP), I=BT[::2].ravel().tolist()), spots=[])
	front = np.array([0.0, 0, -1]) if x[tris[tag == 'front']][..., 2].mean() < x[tris[tag == 'back']][..., 2].mean() else np.array([0.0, 0, 1])  # tag is per triangle
	out['centre'], out['eye'] = r6(x.mean(0)), r6(front + [0.4, 0.2, 0])
	middle = case['surface_P'].mean(0)
	out_dir = lambda c: (c - middle) / np.linalg.norm(c - middle)  # look in from outside the body: spots sit in creases, where the surface normal is no guide
	for sp in spots:
		c = x[sp].mean(0)
		nn = n[sp].mean(0)
		nn /= np.linalg.norm(nn)
		gt = np.where((np.linalg.norm(x[tris].mean(1) - c, axis=1) < 0.06))[0]
		bt = np.where((np.linalg.norm(BP[BT].mean(1) - c, axis=1) < 0.05))[0]
		on = (np.linalg.norm(x[el].mean(1) - c, axis=1) < 0.06)
		pieces = sorted({str(tag[t]) for t in np.where(np.isin(tris, sp).any(1))[0]})
		out['spots'].append(dict(centre=r6(c), eye=r6(out_dir(c) + 0.3 * np.cross(out_dir(c), [0, 1, 0])), I=tris[gt].ravel().tolist(), C=r6(colours(flip[gt], stretch[gt])),
			B=BT[bt].ravel().tolist(), lines=r6(x[el[on]].reshape(-1, 3)), title=f'{len(sp)} unsettled points on {" + ".join(pieces)}, {int(flip[gt].sum())} inside-out triangles within 6 cm'))
	path = os.path.join(CAP, f'spots-young-{pose}.html')
	with open(path, 'w', encoding='utf-8') as f:
		f.write(PAGE.replace('__DATA__', json.dumps(out, separators=(',', ':'))))
	print('wrote', path)


if __name__ == '__main__':
	main()
