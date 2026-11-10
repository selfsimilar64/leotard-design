// Fitted garments: a flat block drafted as a pattern maker would, sewn and fitted onto the body by the fit solver
// (pipeline/wrap_block.py), shown instead of the app's own drawn pieces (render/fitted.js). A design picks one with
// meta.fitted (op fitted.set); its panels named Front, Back and Sleeve dress the fitted pieces of the same name.
// Files: app/public/fitted/, copied there by pipeline/publish_fitted.py from the fit's output (twin: its OWNED list).
// Only blocks the project owns are listed: a block derived from a bought pattern stays out (its licence bars
// redistributing it). knowledge/engineering/app/fitted-garments-in-the-app.md
// The purchased block (BasicPatternBlock 0005, XS on `young`), for comparison only: its fits stay in app/captures, served by the
// dev server at /fitted-local/ (vite.config.js) and listed only in dev, so they are never bundled or shipped (licence).
// Only the high-cut garments are offered (owner, 2026-11-10): the basic and thigh legs, the bodyshaper and the stretch-knit leotard
// were removed; a design that names one shows its block's high cut where there is one (MOVED), else the drawn pieces.
const LOCAL = [
	{ key: 'bought-XS-high', label: 'Purchased block, high cut (local)', leg: 'High-hips leg', file: 'wrap-XS-high-resolved', fittedOn: 'young', local: true, hint: 'The purchased block, size XS, high-hips leg; fitted by simulation on the young body. Shown only on this computer (its licence bars shipping it)' },
];

export const FITTED = [
	...(import.meta.env.DEV ? LOCAL : []),
	{ key: 'armstrong-6-high', label: 'Textbook leotard, high cut', leg: 'High-cut leg', file: 'armstrong-6-high-resolved', fittedOn: 'young' },
	// The hybrid (pipeline/draft_hybrid.py): Armstrong's block with its crotch seam moved 29 mm forward, a front strip joined to the back
	{ key: 'hybrid-6-high', label: 'Hybrid leotard, high cut', leg: 'High-cut leg', file: 'hybrid-6-high-resolved', fittedOn: 'young' },
];
const MOVED = { 'bought-XS': 'bought-XS-high', 'armstrong-6': 'armstrong-6-high', 'hybrid-6': 'hybrid-6-high' };

export const fittedOf = (doc) => { const k = doc?.meta?.fitted; return FITTED.find((f) => f.key === (MOVED[k] ?? k)) ?? null; };

// The fitted garment's size: its pattern made wider (across the grain) and longer (along it) by these factors, op fitted.size.
// The re-fit takes the scaled pattern as its rest shape (fit/fitted-case.js garmentArrays): smaller sits tauter, larger looser.
// Without a re-fit (none run yet, re-fit off, no WebGPU) the fit shown is the file's, at 1 x 1. The range is ours, not a maker's.
export const FIT_SIZE_RANGE = [0.8, 1.1];
export const fitSizeOf = (doc) => ({ width: doc?.meta?.fitSize?.width ?? 1, length: doc?.meta?.fitSize?.length ?? 1 });

// A fitted garment's pieces for the flat view (ui/FlatView.jsx), in the shape garment/pattern.js patternPieces gives: each piece
// once (a cell's half 0), its outline as drafted, in mm with its corner at the origin. The outlines are stitching lines (the fit
// works on those), so no separate stitch line is drawn. Colour and choosing a piece go through the panel of the same name.
// fitted: the FittedView (render/fitted.js); its clothFor gives each piece's flat frame for the stones on it (stones/fitted-cloth.js).
export function fittedPieces(data, doc, fitted = null) {
	const L0 = doc.panels.filter((p) => (p.layer ?? 'L0') === 'L0' && !p.removed), byName = new Map(L0.map((p) => [p.name, p])), front = byName.get('Front') ?? L0[0];
	const out = [], size = fitSizeOf(doc);
	// the outlines stay as drafted (the stones' frames are laid in them); a resized pattern says so on its label
	const sized = size.width === 1 && size.length === 1 ? '' : ` · cut at ${Math.round(size.width * 100)}% wide, ${Math.round(size.length * 100)}% long`;
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
			cut: (c.name === 'Sleeve' ? 'Cut 2, mirrored' : 'Cut 1') + ' · stitching line' + sized, colour: panel?.stack?.[0]?.colour ?? '#8f8a82', size: [w, h] });
	}
	return out;
}
