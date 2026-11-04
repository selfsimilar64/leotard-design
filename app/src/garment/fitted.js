// Fitted garments: a flat block drafted as a pattern maker would, sewn and fitted onto the body by the fit solver
// (pipeline/wrap_block.py), shown instead of the app's own drawn pieces (render/fitted.js). A design picks one with
// meta.fitted (op fitted.set); its panels named Front, Back and Sleeve dress the fitted pieces of the same name.
// Files: app/public/fitted/, copied there by pipeline/publish_fitted.py from the fit's output (twin: its OWNED list).
// Only blocks the project owns are listed: a block derived from a bought pattern stays out (its licence bars
// redistributing it). knowledge/engineering/app/fitted-garments-in-the-app.md
export const FITTED = [
	{ key: 'armstrong-6', label: 'Textbook leotard', leg: 'Basic leg', file: 'armstrong-6-block', fittedOn: 'young' },
	{ key: 'armstrong-6-high', label: 'Textbook leotard, high cut', leg: 'High-cut leg', file: 'armstrong-6-high-resolved', fittedOn: 'young' },
];

export const fittedOf = (doc) => FITTED.find((f) => f.key === doc?.meta?.fitted) ?? null;

// A fitted garment's pieces for the flat view (ui/FlatView.jsx), in the shape garment/pattern.js patternPieces gives: each piece
// once (a cell's half 0), its outline as drafted, in mm with its corner at the origin. The outlines are stitching lines (the fit
// works on those), so no separate stitch line is drawn. Colour and choosing a piece go through the panel of the same name.
// fitted: the FittedView (render/fitted.js); its clothFor gives each piece's flat frame for the stones on it (stones/fitted-cloth.js).
export function fittedPieces(data, doc, fitted = null) {
	const L0 = doc.panels.filter((p) => (p.layer ?? 'L0') === 'L0' && !p.removed), byName = new Map(L0.map((p) => [p.name, p])), front = byName.get('Front') ?? L0[0];
	const out = [];
	for (const c of data.cells) {
		if (c.half !== 0) continue;
		const raw = c.outline.map(([x, y]) => [x * 1000, y * 1000]);
		const x0 = Math.min(...raw.map((p) => p[0])), y0 = Math.min(...raw.map((p) => p[1]));
		const pts = raw.map(([x, y]) => [x - x0, y - y0]);
		const w = Math.max(...pts.map((p) => p[0])), h = Math.max(...pts.map((p) => p[1]));
		const panel = byName.get(c.name) ?? front, cloth = panel && byName.get(c.name) ? fitted?.clothFor(panel.id) : null;
		// the frame the stones are laid in: mm = uv * 1000 - origin, uv the cloth's (its origin at its points' mean)
		const frame = cloth ? { cell: cloth.cell, layer: 'L0', origin: [x0 - cloth.shift[0] * 1000, y0 - cloth.shift[1] * 1000], easeUV: [0, 0], fitted: true } : {};
		out.push({ ...frame, key: c.piece, panelId: panel?.id, name: c.name, cutLine: pts, stitch: null, grain: { at: [w / 2, h / 2], angle: 0 },
			cut: (c.name === 'Sleeve' ? 'Cut 2, mirrored' : 'Cut 1') + ' · stitching line', colour: panel?.stack?.[0]?.colour ?? '#8f8a82', size: [w, h] });
	}
	return out;
}
