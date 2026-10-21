// Contact sheet of body choices: one design on several body types, poses, heads and expressions,
// each captured to app/captures/bodies-<n>.png. Run in the app:
//   const b = await import('/rehearsals/bodies.js?t=' + Date.now());
//   await b.sheet(app, 'b9-crystal-rain');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const COMBOS = [
	{ size: 'young', pose: 'a-pose', head: 'mannequin' },
	{ size: 'young', pose: 'hands-on-hips', head: 'none' },
	{ size: 'teen', pose: 'standing', head: 'person', expression: 'smile' },
	{ size: 'child', pose: 'arms-outstretched', head: 'person', expression: 'soft-smile' },
	{ size: 'broad', pose: 'passe', head: 'mannequin' },
	{ size: 'adult', pose: 'split-leap', head: 'person', expression: 'focused' },
];

// The whole body, from the front three-quarter, framed on the mesh's bounds.
async function shot(app, name, o = {}) {
	const bb = app.engine.body.geometry.boundingBox, c = [(bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2];
	const W = o.w ?? 700, H = o.h ?? 1000;
	const h = Math.max(bb.max.y - bb.min.y, Math.hypot(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * H / W), fov = 26, dist = h / 2 / Math.tan(fov / 2 * Math.PI / 180) * 1.12;
	const d = o.dir ?? [0.35, 0.08, 0.93], n = Math.hypot(...d);
	return app.capture(name, { view: { position: c.map((v, k) => v + d[k] / n * dist), target: c, fov }, width: W, height: H });
}

export async function sheet(app, design, combos = COMBOS) {
	if (design) await app.open(design);
	app.exec({ op: 'scene.set', rig: 'White seamless (photo studio)', glare: 'plain' });
	const out = [];
	for (const [i, c] of combos.entries()) {
		app.exec({ op: 'body.set', form: 'full', expression: 'neutral', ...c });
		await app.engine.figureReady;
		if (c.head === 'person') await wait(3000); // textures
		out.push(await shot(app, `bodies-${i + 1}`));
	}
	return out;
}
