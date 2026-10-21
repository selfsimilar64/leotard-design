// Capture helpers for a real person wearing a design (head type 'person'; see render/figure.js and
// pipeline/daz/bodies.py). Run in the app:
//   const f = await import('/rehearsals/figures.js?t=' + Date.now());
//   await f.showcase(app, { size: 'child', pose: 'arms-outstretched', expression: 'smile' }, 'b11-converging-fan');
//   // app/captures/show-<size>-<pose>-body|face.png

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The figure's facing direction (horizontal, from the eye line) and eye midpoint.
function facing(app) {
	const e = app.engine.figure.eyes(), L = e.l.toArray(), R = e.r.toArray();
	let fw = [-(L[2] - R[2]), 0, L[0] - R[0]];
	const n = Math.hypot(...fw);
	fw = fw.map((v) => v / n);
	return { fw, mid: [(L[0] + R[0]) / 2, (L[1] + R[1]) / 2, (L[2] + R[2]) / 2] };
}
const turn = (v, a) => [v[0] * Math.cos(a) - v[2] * Math.sin(a), 0, v[0] * Math.sin(a) + v[2] * Math.cos(a)];

// who: { size, pose, expression } (body.set fields)
export async function useFigure(app, who) {
	app.exec({ op: 'body.set', form: 'full', head: 'person', pose: 'a-pose', expression: 'neutral', ...who });
	await app.engine.figureReady;
	await wait(4000); // textures
}

// Head and shoulders. o: yaw (radians from the face's direction), fov, dist, dy, up, w, h.
export async function face(app, name, o = {}) {
	const { fw, mid } = facing(app), d = turn(fw, o.yaw ?? 0.4), dist = o.dist ?? 0.75;
	const c = [mid[0], mid[1] + (o.dy ?? 0), mid[2]];
	await app.capture(name, { view: { position: [c[0] + d[0] * dist, c[1] + (o.up ?? 0.03), c[2] + d[2] * dist], target: c, fov: o.fov ?? 22 }, width: o.w ?? 800, height: o.h ?? 800 });
}

// The whole figure, framed on its bounds, between the body's front and the face's direction.
export async function body(app, name, o = {}) {
	const f = app.engine.figure, bb = f.group.children[0].geometry.boundingBox.clone().makeEmpty();
	for (const m of f.group.children) { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox); }
	const { fw } = facing(app);
	let d = turn([fw[0] * 0.5, 0, 0.5 + fw[2] * 0.5], o.yaw ?? 0.35);
	const n = Math.hypot(...d); d = d.map((v) => v / n);
	const c = [(bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2];
	const h = Math.max(bb.max.y - bb.min.y, (bb.max.x - bb.min.x) * 0.8, (bb.max.z - bb.min.z) * 0.8), fov = o.fov ?? 28;
	const dist = h / 2 / Math.tan(fov / 2 * Math.PI / 180) * (o.margin ?? 1.1);
	await app.capture(name, { view: { position: [c[0] + d[0] * dist, c[1] + h * 0.05, c[2] + d[2] * dist], target: c, fov }, width: o.w ?? 1000, height: o.h ?? 1300 });
}

// A design on a person: body and face captures (show-<size>-<pose>-body.png, -face.png).
export async function showcase(app, who, design, o = {}) {
	await app.open(design);
	app.exec({ op: 'scene.set', rig: o.rig ?? 'White seamless (photo studio)' });
	await useFigure(app, who);
	const name = 'show-' + (who.size ?? app.doc.body.size) + '-' + (typeof who.pose === 'string' ? who.pose : 'a-pose');
	await body(app, name + '-body', o.body);
	// a design's star-filter glare also catches the eyes' catchlights: plain for the close-up
	app.exec({ op: 'scene.set', glare: 'plain' });
	await face(app, name + '-face', o.face);
}
