// Fitted garments: a flat block drafted as a pattern maker would, sewn and fitted onto the body by the fit solver
// (pipeline/wrap_block.py), shown instead of the app's own drawn pieces (render/fitted.js). A design picks one with
// meta.fitted (op fitted.set); its panels named Front, Back and Sleeve dress the fitted pieces of the same name.
// Files: app/public/fitted/, copied there by pipeline/publish_fitted.py from the fit's output (twin: its OWNED list).
// Only blocks the project owns are listed: a block derived from a bought pattern stays out (its licence bars
// redistributing it). knowledge/engineering/app/fitted-garments-in-the-app.md

// The size a block is cut at by default, against its draft (fitSizeOf): Armstrong's block and the hybrid take almost no length out
// for stretch (the seat about 3% stretched up and down standing), where real leotards are cut about 8-24% shorter than the body
// (knowledge: real-leotard-yardsticks, negative-ease). Owner, 2026-11-11: width 100%, length 85-90%; 88% looked better in most poses;
// then 90-95%, so the leg is not cut so high and rides up the seat less: 90%, still inside the yardsticks' range.
const CUT = { width: 1, length: 0.9 };

// The purchased block (BasicPatternBlock 0005, XS on `young`), for comparison only: its fits stay in app/captures, served by the
// dev server at /fitted-local/ (vite.config.js) and listed only in dev, so they are never bundled or shipped (licence).
// Only the high-cut garments are offered (owner, 2026-11-10): the basic and thigh legs, the bodyshaper and the stretch-knit leotard
// were removed; a design that names one shows its block's high cut where there is one (MOVED), else the drawn pieces.
// The strappy back (owner's illustration, 2026-11-10): the hybrid high cut recut by pattern changes and fitted from the block's fit
// (pipeline/design_strappy.py). A preview, so local like the purchased block: its file is made into app/captures by
// `python pipeline/wrap_block.py --drafted hybrid-6 young --design strappy`. bound: its neck and armholes are bound and its straps
// cut from the binding, in the design's binding look (fittedTrimOf).
const LOCAL = [
	{ key: 'bought-XS-high', label: 'Purchased block, high cut (local)', leg: 'High-hips leg', file: 'wrap-XS-high-resolved', fittedOn: 'young', local: true, hint: 'The purchased block, size XS, high-hips leg; fitted by simulation on the young body. Shown only on this computer (its licence bars shipping it)' },
	// The tank (pipeline/design_tank.py): the hybrid high cut without sleeves, 2 in straps, turned elastic at every opening; made, as the
	// strappy back, by `WRAP_REUSE_BASE=1 python pipeline/wrap_block.py --drafted hybrid-6 young --design tank`. A preview for the elastic.
	{ key: 'hybrid-6-tank', label: 'Tank (local)', leg: 'Hybrid, preview', file: 'wrap-hybrid-6-tank-resolved', fittedOn: 'young', local: true, size: CUT, hint: 'The hybrid high cut recut as a tank leotard: no sleeves, turned elastic at the neck, armholes and legs. A preview, shown only on this computer' },
	{ key: 'hybrid-6-strappy', label: 'Strappy back (local)', leg: 'Hybrid, preview', file: 'wrap-hybrid-6-strappy-resolved', fittedOn: 'young', local: true, bound: true, size: CUT, hint: 'The hybrid high cut recut as a strappy back: thin straps, bound neck and armholes, open upper back. A preview, shown only on this computer' },
];

export const FITTED = [
	...(import.meta.env.DEV ? LOCAL : []),
	{ key: 'armstrong-6-high', label: 'Textbook leotard, high cut', leg: 'High-cut leg', file: 'armstrong-6-high-resolved', fittedOn: 'young', size: CUT },
	// The hybrid (pipeline/draft_hybrid.py): Armstrong's block with its crotch seam moved 29 mm forward, a front strip joined to the back
	{ key: 'hybrid-6-high', label: 'Hybrid leotard, high cut', leg: 'High-cut leg', file: 'hybrid-6-high-resolved', fittedOn: 'young', size: CUT },
];
const MOVED = { 'bought-XS': 'bought-XS-high', 'armstrong-6': 'armstrong-6-high', 'hybrid-6': 'hybrid-6-high' };

export const fittedOf = (doc) => { const k = doc?.meta?.fitted; return FITTED.find((f) => f.key === (MOVED[k] ?? k)) ?? null; };

// The fitted garment's size: its pattern made wider (across the grain) and longer (along it) by these factors, op fitted.size.
// The re-fit takes the scaled pattern as its rest shape (fit/fitted-case.js garmentArrays): smaller sits tauter, larger looser.
// Without a re-fit (none run yet, re-fit off, no WebGPU) the fit shown is the file's, at 1 x 1. The range is ours, not a maker's.
// Unset (meta.fitSize null), a garment is at its own default (FITTED size, CUT above; 1 x 1 without one).
export const FIT_SIZE_RANGE = [0.8, 1.1];
export const fitSizeDefault = (doc) => fittedOf(doc)?.size ?? { width: 1, length: 1 };
export const fitSizeOf = (doc) => {
	const d = fitSizeDefault(doc);
	return { width: doc?.meta?.fitSize?.width ?? d.width, length: doc?.meta?.fitSize?.length ?? d.length };
};

// The binding on a fitted garment's bound openings and its straps (render/fitted.js): meta.fittedTrim (op fitted.trim) over the
// default, white shiny, the default a drawn edge's binding starts at too (ui/ShapeCard.jsx Finish).
export const TRIM_DEFAULT = { fabric: 'shiny', colour: '#ffffff', second: 'Tone-on-tone' };
export const fittedTrimOf = (doc) => ({ ...TRIM_DEFAULT, ...(doc?.meta?.fittedTrim ?? {}) });

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
			cut: (c.name === 'Sleeve' || c.name === 'Strap' ? 'Cut 2, mirrored' : 'Cut 1') + ' · stitching line' + sized,
			colour: (c.name === 'Strap' ? fittedTrimOf(doc).colour : panel?.stack?.[0]?.colour) ?? '#8f8a82', size: [w, h] });
	}
	return out;
}
