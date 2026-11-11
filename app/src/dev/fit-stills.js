// Stills of the fitted garment in several poses, the "before" of the fit realism plan's later stages (stage 0, as the owner set it on
// 2026-11-10: in-app camera angles in a bright matte lycra, no measurements): per fit ('skin', the app's fit; 'bridged', the
// older fit kept to go back to: render/fitted.js FIT_DEFAULTS.body), body and pose, the seat, the small of the back, the front, the
// underarm and a leg opening. Written to captures/fit-stills/<tag>/<fit>/<body>-<pose>-<view>.png.
// Opens its own design, so it keeps the page's autosave and puts it back at the end (reload the page afterwards to see it); a run cut
// short by a reload cannot, so keep a copy of the autosave first.
// Run it in a tab nobody designs in:
//   const s = await import('/src/dev/fit-stills.js'); await s.all('2026-11-10')       // or s.all(tag, { fits, bodies, poses, views })
import { framed, lightsTurned } from '../render/pictures.js';
import { surfaceLandmarks } from '../body/landmarks.js';

const app = () => window.app;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const KEY = 'hybrid-6-high';
export const FITS = ['skin', 'bridged'];
// only the body the garment is sized for (owner, 2026-11-10: the hybrid's pattern is drafted for young; on another body the stills
// show a wrong size, not the fit)
export const BODIES = ['young'];
export const POSES = ['standing', 'back-arched', 'passe', 'lunge-arms-up'];
// light enough that the fabric's shape shows in its shading (owner, 2026-10-25), and a colour that stands out from the white
// mannequin and backdrop: blue, more teal (owner, 2026-11-10; an off-white was unreadable)
export const COLOUR = '#2a9db0';
const AUTOSAVE = 'leotard.autosave.v1';

// The design: the fitted garment, every panel matte lycra in the light colour, nothing printed on it.
export async function prepare(key = KEY) {
	const a = app();
	a.new('Fit stills');
	a.exec({ op: 'fitted.set', key });
	for (const p of a.doc.panels) a.exec({ op: 'panel.set', id: p.id, fabric: 'matte', colour: COLOUR, print: null, ombre: null, texture: null });
	await a.engine.settled();
}

// Where a surface landmark is on the posed skin, and the skin's normal there.
function landmark(sp) {
	const man = app().engine.body, P = man.aPos.array, N = man.aNrm.array, idx = man.idx, f = sp.f, w = [sp.b0, sp.b1, sp.b2];
	const p = [0, 0, 0], n = [0, 0, 0];
	for (let j = 0; j < 3; j++) { const v = idx[3 * f + j]; for (let k = 0; k < 3; k++) { p[k] += w[j] * P[3 * v + k]; n[k] += w[j] * N[3 * v + k]; } }
	const L = Math.hypot(...n);
	return { p, n: n.map((x) => x / L) };
}

// The views on the body as posed now: { name: { camera, dir } }. dir is where the camera looks from (the lights turn to it).
function views() {
	const e = app().engine, man = e.body, P = man.aPos.array, N = man.aNrm.array, cy = man.crotchY, up = [0, 1, 0];
	const lm = surfaceLandmarks(man, e.surf), add = (a, b, s = 1) => a.map((x, i) => x + s * b[i]);
	// the seat: its skin's centre and mean normal (3-15 cm above the crotch, within 12 cm of the midline, the back)
	const c = [0, 0, 0], b = [0, 0, 0];
	let k = 0;
	for (let v = 0; v < man.vertices; v++) {
		const y = man.ref[3 * v + 1] - cy;
		if (man.form[2 * v] >= 0 || Math.abs(man.ref[3 * v]) > 0.12 || y < 0.03 || y > 0.15 || man.wArm[v] > 0.5) continue;
		for (let j = 0; j < 3; j++) { c[j] += P[3 * v + j]; b[j] += N[3 * v + j]; }
		k++;
	}
	const seatC = c.map((x) => x / k), seatB = b.map((x) => x / Math.hypot(...b));
	const back = landmark(lm['cb-waist']), front = landmark(lm.navel), arm = landmark(lm['underarm-l']), hip = landmark(lm['hip-l']);
	const neck = landmark(lm['cf-neck']), shoulder = landmark(lm['shoulder-l']);
	// a leg opening: the fitted garment's opening on the wearer's left leg, as drawn (its points re-fitted), seen from the hip's side
	const fv = e.fitted, X = fv.solved;
	let leg = null;
	for (const o of fv.data?.openings ?? []) {
		if (!o.ids || !X) continue;
		let rx = 0, ry = 0;
		for (let i = 0; i < o.hostW.length / 3; i++) for (let j = 0; j < 3; j++) { const v = o.hostI[3 * i + j], w = o.hostW[3 * i + j]; rx += w * man.ref[3 * v]; ry += w * man.ref[3 * v + 1]; }
		const n = o.hostW.length / 3;
		if (rx / n > 0.02 && rx / n < 0.15 && ry / n < cy + 0.15) leg = o; // left, low, within the hips (a wrist hangs as low, further out)
	}
	let legC = hip.p;
	if (leg) { legC = [0, 0, 0]; for (const i of leg.ids) for (let j = 0; j < 3; j++) legC[j] += X[3 * i + j] / leg.ids.length; }
	const v = (target, dir, h) => ({ camera: framed(target, dir, h), dir });
	return {
		seat: v(add(seatC, up, 0.04), add(seatB, up, 0.1), 0.36),
		'back-waist': v(back.p, add(back.n, up, 0.05), 0.36),
		front: v(add(front.p, up, 0.02), add(front.n, up, 0.05), 0.42),
		underarm: v(arm.p, add(arm.n, up, -0.2), 0.26),
		leg: v(legC, add(hip.n, up, 0.15), 0.34),
		// a sleeveless garment's openings (2026-11-11, the tank): the front neck, and the left armhole from the side
		neck: v(add(neck.p, up, -0.06), add(neck.n, up, 0.15), 0.32),
		armhole: v(shoulder.p.map((x, i) => (x + arm.p[i]) / 2), add(arm.n, up, 0.1), 0.3),
	};
}
export const VIEWS = ['seat', 'back-waist', 'front', 'underarm', 'leg'];
export const OPENING_VIEWS = ['neck', 'armhole', 'leg', 'seat'];

async function refitDone(fv) {
	await wait(300);
	while (fv.running) await wait(100);
	await app().engine.settled();
}

async function shoot(dir, name, pick) {
	const a = app(), vp = a.engine.viewport, V = views(), out = [];
	for (const k of pick) {
		const { camera, dir: d } = V[k];
		await lightsTurned(a, Math.atan2(d[0], d[2]), async () => { // the studio's front lights turned to the camera's side
			vp.setCamera(camera);
			await wait(600);
			const blob = await a.withoutOverlay(() => vp.capture(900, 900));
			const url = `/__fs/captures/${dir}/${name}-${k}.png`;
			const r = await fetch(url, { method: 'POST', body: blob });
			if (!r.ok) throw new Error(`${url}: ${r.status}`);
			out.push(url);
		});
	}
	return out;
}

// Every fit, body and pose. -> { shots: [urls], log: [{ fit, body, pose, steps, seconds }] }; window.stillsProgress says where it is.
// A case already taken under this tag (its <body>-<pose>.json record) is skipped unless redo. options: other fit options for the run
// (render/fitted.js FIT_DEFAULTS: press, bend, mesh, steps), put back at the end.
// size: the pattern's { width, length } (op fitted.size, garment/fitted.js fitSizeOf), applied to the stills' own design.
// garment: the fitted garment's key (KEY, the hybrid high cut; 'hybrid-6-tank' for the elastic at every opening, with OPENING_VIEWS).
export async function all(tag, { fits = FITS, bodies = BODIES, poses = POSES, views: pick = VIEWS, redo = false, options = {}, size = null, garment = KEY } = {}) {
	const a = app(), e = a.engine, fv = e.fitted, vp = e.viewport, cam = vp.getCamera();
	let saved = null;
	try { saved = localStorage.getItem(AUTOSAVE); } catch { /* storage blocked */ }
	const keepBody = fv.options.body, keep = Object.fromEntries(Object.keys(options).map((k) => [k, fv.options[k]])), shots = [], log = [];
	try {
		fv.options = { ...fv.options, ...options }; // before the design opens: its fit is made with them
		await prepare(garment);
		if (size) { a.exec({ op: 'fitted.size', ...size }); await e.settled(); await refitDone(fv); }
		for (const fit of fits) {
			if (fv.options.body !== fit) { fv.setOptions({ body: fit }); await refitDone(fv); }
			for (const body of bodies) for (const pose of poses) {
				window.stillsProgress = `${fit} ${body} ${pose}`;
				// resumable (a page reload cuts a run short: another session's edits, HMR): a case whose record is written is done
				const rec = `/__fs/captures/fit-stills/${tag}/${fit}/${body}-${pose}.json`;
				if (!redo && (await fetch(rec)).ok) continue;
				a.exec({ op: 'body.set', size: body, pose });
				await e.settled();
				await refitDone(fv);
				const entry = { fit, body, pose, options, size, state: fv.status.state, steps: fv.status.steps, seconds: fv.status.seconds, setup: fv.status.setup, hidden: document.hidden };
				shots.push(...await shoot(`fit-stills/${tag}/${fit}`, `${body}-${pose}`, pick));
				await fetch(rec, { method: 'POST', body: JSON.stringify(entry) });
				log.push(entry);
			}
		}
	} finally {
		vp.setCamera(cam);
		fv.options = { ...fv.options, ...keep };
		if (fv.options.body !== keepBody) fv.setOptions({ body: keepBody });
		await wait(1000); // after the design's own autosave (400 ms after a change), so this one is last
		try { if (saved != null) localStorage.setItem(AUTOSAVE, saved); } catch { /* storage blocked */ }
		window.stillsProgress = 'done';
	}
	return { shots, log };
}
