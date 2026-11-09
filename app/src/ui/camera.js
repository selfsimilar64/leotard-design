// Camera moves of the interface: the view chip's views (front, three-quarter, side, back, fit) and
// the close-ups the Shape card turns to when an element of the cut is opened (prefs.followCamera). Each move
// glides there (an orbit about the moving target, eased) and stops as soon as the person takes the
// view themselves.
import * as THREE from 'three';
import { app } from '../instance.js';

let flight = null;

// Glide to { position, target } (arrays, metres) in ms.
export function flyTo({ position, target }, ms = 560) {
	const vp = app.engine?.viewport;
	if (!vp || vp.photo) return;
	const cam = vp.camera, ctl = vp.controls;
	const t0 = ctl.target.clone(), t1 = new THREE.Vector3().fromArray(target);
	const o0 = cam.position.clone().sub(t0), o1 = new THREE.Vector3().fromArray(position).sub(t1);
	const d0 = o0.length(), d1 = o1.length(), q = new THREE.Quaternion().setFromUnitVectors(o0.clone().normalize(), o1.clone().normalize());
	const qi = new THREE.Quaternion(), dir = new THREE.Vector3();
	cancel();
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, start = performance.now();
	const me = flight = { stop: false };
	const stopOnTouch = () => { me.stop = true; };
	ctl.addEventListener('start', stopOnTouch);
	const step = () => {
		if (me.stop || flight !== me) { ctl.removeEventListener('start', stopOnTouch); return; }
		const k = reduce ? 1 : Math.min((performance.now() - start) / ms, 1), e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
		qi.identity().slerp(q, e);
		dir.copy(o0).normalize().applyQuaternion(qi).multiplyScalar(d0 + (d1 - d0) * e);
		ctl.target.lerpVectors(t0, t1, e);
		cam.position.copy(ctl.target).add(dir);
		ctl.update();
		if (k < 1) requestAnimationFrame(step); else { ctl.removeEventListener('start', stopOnTouch); flight = null; }
	};
	requestAnimationFrame(step);
}
export function cancel() { if (flight) flight.stop = true; flight = null; }

// The view chip's views: the same target and distance, from another side; fit frames the leotard.
const DIRS = { front: [0, 0.06, 1], threeq: [0.62, 0.08, 0.78], side: [1, 0.06, 0], back: [0, 0.06, -1] };
export function viewTo(name) {
	const vp = app.engine?.viewport;
	if (!vp) return;
	if (name === 'fit') { flyTo(fitView()); return; }
	const t = vp.controls.target, d = vp.camera.position.distanceTo(t), [x, y, z] = DIRS[name], l = Math.hypot(x, y, z);
	flyTo({ position: [t.x + x / l * d, t.y + y / l * d, t.z + z / l * d], target: t.toArray() });
}

// Where Engine.frameCamera would put the camera (from the side it looks from now); with the
// mannequin hidden, the leotard alone (neck to just under the crotch), from the same side.
function fitView() {
	const e = app.engine, vp = e.viewport, was = vp.getCamera();
	if (e.bodyHidden) {
		const man = e.body, top = man.body.landmarks.neck_base[1] + 0.08, bottom = man.crotch.y - 0.1, t = [0, (top + bottom) / 2, 0];
		const d = ((top - bottom) / 2) / Math.tan(THREE.MathUtils.degToRad(vp.camera.fov) / 2) * 1.15;
		const dir = vp.camera.position.clone().sub(vp.controls.target).normalize();
		return { target: t, position: [t[0] + dir.x * d, t[1] + dir.y * d, t[2] + dir.z * d] };
	}
	e.frameCamera(app.doc.body.form);
	const to = vp.getCamera();
	vp.setCamera(was);
	return to;
}

// Close-ups of the shape elements, on the body as shown (its size and pose): a target near a
// landmark of the garment surface, the side to look from, and the height of the view (metres).
const FOCUS = {
	neck: { at: [['cf-neck', 1]], off: [0, -0.07, 0], dir: [0.12, 0.32, 1], h: 0.52 },
	back: { at: [['cb-neck', 1]], off: [0, -0.2, 0], dir: [-0.12, 0.2, -1], h: 0.76 },
	sleeves: { at: [['shoulder-l', 1]], off: [0.03, -0.17, 0], dir: [1, 0.18, 0.95], h: 0.9 },
	armhole: { at: [['shoulder-l', 1]], off: [0.01, -0.06, 0], dir: [0.9, 0.22, 1], h: 0.56 },
	strap: { at: [['shoulder-l', 0.5], ['shoulder-r', 0.5]], off: [0, -0.04, 0.02], dir: [0.3, 0.55, 1], h: 0.54 },
	// (the surface's 'crotch' landmark is not at the crotch on the Genesis 9 bodies: from the hip)
	leg: { at: [['hip-l', 1]], off: [-0.07, -0.01, 0.01], dir: [0.95, 0.1, 0.8], h: 0.5 },
	yoke: { at: [['bust-l', 0.5], ['bust-r', 0.5]], off: [0, 0.05, 0], dir: [0.14, 0.22, 1], h: 0.56 },
	waist: { at: [['navel', 1]], off: [0, 0.03, 0], dir: [0.18, 0.12, 1], h: 0.62 },
};
export function focusView(key) {
	const f = FOCUS[key], ctx = app.store?.ctx, vp = app.engine?.viewport;
	if (!f || !ctx?.landmarkPos || !vp) return null;
	const t = new THREE.Vector3();
	try { for (const [lm, w] of f.at) t.addScaledVector(new THREE.Vector3().fromArray(ctx.landmarkPos(lm)), w); } catch { return null; }
	t.add(new THREE.Vector3().fromArray(f.off));
	const d = (f.h / 2) / Math.tan(THREE.MathUtils.degToRad(vp.camera.fov) / 2), dir = new THREE.Vector3().fromArray(f.dir).normalize();
	return { target: t.toArray(), position: t.clone().addScaledVector(dir, d).toArray() };
}
export function focusOn(key) { const v = focusView(key); if (v) flyTo(clearOfCard(v)); }

// A close-up the interface turns to lands in the middle of the stage that is clear of the glass over it: between the
// spine (left) and the card (right), not behind the card. The view slides sideways by that many pixels, at the
// target's distance. (The views a person asks for themselves, the view chip's and Fit, stay centred in the window.)
const SPINE = 92;
function clearOfCard(view) {
	const vp = app.engine.viewport, box = vp.container.getBoundingClientRect(), card = document.querySelector('.inspector')?.getBoundingClientRect();
	if (!card || !box.width || card.top > box.top + box.height * 0.4 || card.left > box.right) return view; // no card over this view, or one at its foot
	const px = box.width / 2 - (SPINE + (card.left - box.left)) / 2; // how far left of the middle the clear part's middle is
	if (px <= 0) return view;
	const t = new THREE.Vector3().fromArray(view.target), dir = new THREE.Vector3().fromArray(view.position).sub(t);
	const perPx = (2 * dir.length() * Math.tan(THREE.MathUtils.degToRad(vp.camera.fov) / 2)) / box.height;
	const slide = new THREE.Vector3(0, 1, 0).cross(dir).normalize().multiplyScalar(px * perPx); // towards the screen's right: the subject moves left
	return { target: t.add(slide).toArray(), position: new THREE.Vector3().fromArray(view.position).add(slide).toArray() };
}
