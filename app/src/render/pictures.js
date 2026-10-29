// Pictures of a design for the interface's tiles. Every one shows the design on the headless
// mannequin in matte white plastic in the mannequin stance (presets.js MANNEQUIN), in the white loft
// studio over a plain backdrop the colour of the panel's tiles (PICTURE_SCENE). Used by app.save
// (a saved design's library picture, standardDiptych) and src/dev/thumbnails.js (every tile).
import { MANNEQUIN, RIGS } from './presets.js';

// the backdrop: chosen so that, tone-mapped, it comes out as the panel's tile colour (ui/styles.css --tile)
export const PICTURE_BACKDROP = '#ebe9e4';
// (less glow than the view's 0.18: at tile size the crystals' glow swallowed them)
export const PICTURE_SCENE = { rig: 'White loft studio', envRotation: 0, exposure: 1, backdrop: 'plain', backdropColour: PICTURE_BACKDROP, glare: 'plain', bloom: 0.07 };

// A camera on `target` from direction `dir` that shows a height h (metres) there; vertical fov.
export function framed(target, dir, h, fov = 24) {
	const d = (h / 2) / Math.tan((fov / 2) * Math.PI / 180), l = Math.hypot(...dir);
	return { position: target.map((t, i) => t + (dir[i] / l) * d), target, fov };
}

// The view rendered at twice the size (without editing lines), scaled down: a w x h canvas.
export async function shot(app, view, w, h) {
	const vp = app.engine.viewport;
	vp.setCamera(view);
	const blob = await app.withoutOverlay(() => vp.capture(w * 2, h * 2));
	const img = await loadImage(URL.createObjectURL(blob)), cv = document.createElement('canvas');
	cv.width = w; cv.height = h;
	const x = cv.getContext('2d');
	x.imageSmoothingQuality = 'high';
	x.drawImage(img, 0, 0, w, h);
	return cv;
}

export async function putJpeg(url, cv, q = 0.88) {
	const r = await fetch(url, { method: 'PUT', body: await new Promise((res) => cv.toBlob(res, 'image/jpeg', q)) });
	if (!r.ok) throw new Error(`${url}: ${r.status}`);
	return url;
}

// Pictures of the back are lit from behind, as a photographer turns the lights: the studio's lights
// turned by `turn` (radians) for fn, then back.
export async function lightsTurned(app, turn, fn) {
	const vp = app.engine.viewport, was = vp.settings.envRotation ?? 0;
	const place = () => { vp.placeHdriLights(); vp.placeStudioLights(); };
	vp.settings.envRotation = was + turn; place();
	try { return await fn(); } finally { vp.settings.envRotation = was; place(); }
}

// The leotard on show from the front and from behind, from the neckline to just under the crotch
// (as the moodboard's product photos), side by side: a 720 x 450 canvas.
export async function diptych(app) {
	const man = app.engine.body, top = man.body.landmarks.neck_base[1] + 0.075, bottom = man.crotch.y - 0.075;
	const h = top - bottom, cy = (top + bottom) / 2, W = 360, H = 450;
	const front = await shot(app, framed([0, cy, 0], [0, 0.05, 1], h, 20), W, H);
	const back = await lightsTurned(app, Math.PI, () => shot(app, framed([0, cy, 0], [0, 0.05, -1], h, 20), W, H));
	const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H;
	const x = cv.getContext('2d');
	x.drawImage(front, 0, 0); x.drawImage(back, W, 0);
	return cv;
}

// The design's library picture, whatever the view shows: for the picture the mannequin is shown, in
// matte white and the mannequin stance (a pose is undone for it, a re-fit of a few seconds), in the
// picture studio; then the finish, pose, studio, the hidden mannequin and the camera are put back.
// The design itself is not changed (no command, no undo step).
export async function standardDiptych(app, url) {
	const e = app.engine, vp = e.viewport, b = app.doc.body, scene = app.doc.scene;
	const cam = vp.getCamera(), hidden = !!e.bodyHidden, posed = (b.pose ?? 'a-pose') !== 'a-pose';
	if (hidden) e.setBodyHidden(false);
	if (posed) { e.applyBody({ ...b, pose: 'a-pose' }, true, false); await e.whenFlat(); }
	e.applyFinish(MANNEQUIN.finish, MANNEQUIN.finish, null);
	vp.applyScene({ ...scene, ...PICTURE_SCENE });
	await vp.hdri(RIGS[PICTURE_SCENE.rig].hdri);
	try { return await putJpeg(url, await diptych(app)); } finally {
		vp.applyScene(scene);
		if (posed) e.applyBody(b, true, false);
		e.applyFinish(b.finish, b.headFinish, b.colour);
		if (hidden) e.setBodyHidden(true);
		vp.setCamera(cam);
	}
}

function loadImage(src) {
	return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('Cannot load ' + src)); i.src = src; });
}
