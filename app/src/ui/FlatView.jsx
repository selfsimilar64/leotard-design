// The flat view: every pattern piece as cut (solid line), its stitch line (dashed), grain line and
// name, laid out like the printable pattern. Updates when the garment is re-cut and flattened; a
// click on a piece chooses it (the Fabric tab), a double-click focuses on it alone: zoomed to fit at
// true proportion, with a strip of the other pieces to switch to and Esc or All pieces to go back.
// With a fitted garment on (garment/fitted.js) the pieces are its own, as drafted.
import { useEffect, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection, layout, prefs, setPref } from './state.js';
import { patternPieces, layoutPieces } from '../garment/pattern.js';
import { fittedPieces } from '../garment/fitted.js';
import { thumb, thumbName, Segmented } from './kit.jsx';
import { StonesOn, PatternHandlesOn } from './FlatStones.jsx';

const piecesNow = () => {
	const f = app.engine?.fitted;
	if (f?.active) return fittedPieces(f.data, app.doc);
	return patternPieces(app.engine.views, app.doc, { surf: app.engine.surf }).pieces;
};

export function FlatView() {
	rev.value;
	const [data, setData] = useState(null), [focus, setFocus] = useState(null), [fitRev, setFitRev] = useState(0), [geoRev, setGeoRev] = useState(0);
	// laid out again when the pieces can have changed (not on a stone or colour edit: a drag on a pattern stays light)
	useEffect(() => app.onChange((touched, why) => {
		if (why === 'load' || ['curves', 'panels', 'layers', 'trims', 'meta'].some((k) => touched.has(k))) setGeoRev((x) => x + 1);
	}), []);
	useEffect(() => {
		if (!app.engine) return;
		let live = true;
		// the pattern alone has the whole stage: a wider row (mm) before wrapping
		app.engine.whenFlat().then(() => { if (live) setData(layoutPieces(piecesNow(), layout.value === 'flat' ? 1400 : 560)); });
		return () => { live = false; };
	}, [geoRev, fitRev, layout.value, !!app.engine]); // (open from the start, the view mounts before the engine is attached)
	// a fitted garment loads after the change that asked for it: lay out again once it is in
	useEffect(() => {
		const f = app.engine?.fitted;
		if (!f) return;
		const was = f.onLoaded;
		f.onLoaded = () => { was?.(); setFitRev((x) => x + 1); };
		return () => { f.onLoaded = was; };
	}, []);
	useEffect(() => {
		if (!focus) return;
		const key = (e) => { if (e.key === 'Escape') setFocus(null); };
		addEventListener('keydown', key);
		return () => removeEventListener('keydown', key);
	}, [focus]);
	if (!data) return <div class="flat-empty">Laying out the pieces…</div>;
	if (!data.placed.length) return <div class="flat-empty">No pattern pieces yet: pick a starting point in Designs.</div>;
	const sel = selection.value, pick = (p) => { selection.value = { kind: 'panels', id: p.panelId }; };
	// two appearances of the same pieces: a sewing aid (cut and stitch lines, grain, notes) or the look (colours, fabric, stones)
	const look = prefs.value.flatLook === 'look', P = look ? LookPiece : Piece;
	const mode = <div class="flat-mode"><Segmented value={look ? 'look' : 'pattern'} options={[['pattern', 'Sewing', null, 'Cut and stitch lines, grain and notes: a sewing aid'], ['look', 'Look', null, 'Each piece as it will look: colours, fabric and stones']]} onPick={(v) => setPref('flatLook', v)} /></div>;
	const focused = focus && data.placed.find((p) => p.key === focus);
	if (focused) {
		const pad = 30, [W, H] = focused.size, one = { ...focused, at: [0, 0] };
		return (
			<div class="flat-focus">
				<div class="flat-title">{focused.name}</div>
				{mode}
				<button class="btn small flat-back" onClick={() => setFocus(null)} title="Back to every piece (Esc)">All pieces</button>
				<svg class="flat-svg" viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}`} preserveAspectRatio="xMidYMid meet">
					<P p={one} active onClick={() => pick(focused)} />
					<Defs pieces={[one]} look={look} />
					<text x={-pad + 4} y={H + pad - 8} font-size={Math.max(8, H / 70)} fill="#8f8a82" font-family="system-ui, sans-serif">{Math.round(W)} × {Math.round(H)} mm</text>
				</svg>
				<div class="flat-strip" role="tablist" aria-label="Pieces">
					{data.placed.map((p) => {
						const [w, h] = p.size;
						return (
							<button key={p.key} role="tab" aria-selected={p.key === focus} class={`flat-thumb ${p.key === focus ? 'on' : ''}`} title={p.name} onClick={() => { setFocus(p.key); pick(p); }}>
								<svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} preserveAspectRatio="xMidYMid meet"><polygon points={p.cutLine.map(([x, y]) => `${x},${h - y}`).join(' ')} fill={p.colour} fill-opacity="0.35" stroke="#2a2724" stroke-width={Math.max(w, h) / 60} /></svg>
								<span>{p.name}</span>
							</button>
						);
					})}
				</div>
			</div>
		);
	}
	const pad = 24, [W, H] = data.size;
	return (
		<>
			<div class="flat-title">Pattern pieces{app.engine?.fitted?.active ? ' (fitted garment)' : ''}</div>
			{mode}
			<svg class="flat-svg" viewBox={`${-pad} ${-pad - 24} ${W + 2 * pad} ${H + 2 * pad + 24}`} preserveAspectRatio="xMidYMid meet">
				{data.placed.map((p) => <P key={p.key} p={p} active={sel?.kind === 'panels' && sel.id === p.panelId} onClick={() => pick(p)} onFocus={() => { setFocus(p.key); pick(p); }} />)}
				<Defs pieces={data.placed} look={look} />
				<text x={-pad + 4} y={H + pad - 6} font-size="8" fill="#8f8a82" font-family="system-ui, sans-serif">Millimetres · seam allowance on pieced pieces · dotted: where an appliqué is sewn · double-click a piece to work on it alone</text>
			</svg>
		</>
	);
}

function Defs({ pieces = [], look = false }) {
	// the look's fills: per fabric its swatch picture (public/thumbs/materials, dev/thumbnails.js materials), greyed so it adds the
	// fabric's surface and not its swatch's colour, as a faint tile; per piece
	// with an ombre a fade from its colour to the ombre's, top to bottom (an approximation: the 3D fade runs by body height)
	const fabrics = look ? [...new Set(pieces.map((p) => lookOf(p).fabric).filter(Boolean))] : [];
	return (
		<defs>
			<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#2a2724" /></marker>
			<filter id="tex-grey"><feColorMatrix type="saturate" values="0" /></filter>
			{fabrics.map((f) => (
				<pattern key={f} id={`tex-${thumbName(f)}`} patternUnits="userSpaceOnUse" width={TEX_MM} height={TEX_MM}>
					<image href={thumb('materials', f)} width={TEX_MM} height={TEX_MM} preserveAspectRatio="xMidYMid slice" filter="url(#tex-grey)" />
				</pattern>
			))}
			{look ? pieces.map((p) => { const s = lookOf(p); return s.ombre ? (
				<linearGradient key={p.key} id={`fade-${p.key}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color={s.colour} /><stop offset="1" stop-color={s.ombre.colour} />
				</linearGradient>
			) : null; }) : null}
		</defs>
	);
}

const TEX_MM = 90; // one tile of a fabric's swatch on the flat piece

// A piece's look: its panel's first layer (fabric, colour, ombre), as the 3D view draws it.
function lookOf(p) {
	const s = app.doc.panels.find((q) => q.id === p.panelId)?.stack?.[0] ?? {};
	return { fabric: s.fabric, colour: s.colour ?? p.colour, ombre: s.ombre?.colour ? s.ombre : null };
}

// The piece as it will look: its colour (or fade), a faint tile of its fabric, its outline; the name small.
function LookPiece({ p, active, onClick, onFocus }) {
	const [ox, oy] = p.at, pt = ([x, y]) => `${ox + x},${oy + p.size[1] - y}`, s = lookOf(p), pts = p.cutLine.map(pt).join(' ');
	return (
		<g class={`piece look ${active ? 'sel' : ''}`} onClick={onClick} onDblClick={onFocus}>
			<polygon points={pts} fill={s.ombre ? `url(#fade-${p.key})` : s.colour} stroke="none" />
			{s.fabric ? <polygon points={pts} fill={`url(#tex-${thumbName(s.fabric)})`} opacity="0.5" style={{ mixBlendMode: 'soft-light' }} stroke="none" /> : null}
			<polygon class="look-edge" points={pts} fill="none" stroke={active ? '#1f1d1a' : 'rgba(31, 29, 26, 0.45)'} stroke-width={active ? 1.6 : 0.7} />
			<StonesOn p={p} />
			<PatternHandlesOn p={p} />
			<text x={ox + 6} y={oy + 12} font-size="8" fill="#59554f" font-family="system-ui, sans-serif">{p.name}</text>
		</g>
	);
}

function Piece({ p, active, onClick, onFocus }) {
	const [ox, oy] = p.at, pt = ([x, y]) => `${ox + x},${oy + p.size[1] - y}`;
	const [gx, gy] = p.grain.at, L = Math.min(p.size[1] * 0.6, 160) / 2, dx = Math.sin(p.grain.angle) * L, dy = Math.cos(p.grain.angle) * L;
	return (
		<g class={`piece ${active ? 'sel' : ''}`} onClick={onClick} onDblClick={onFocus}>
			<polygon points={p.cutLine.map(pt).join(' ')} fill={p.colour} fill-opacity="0.22" stroke="#2a2724" stroke-width="0.8" />
			{p.construction === 'appliqué' || !p.stitch ? null : <polygon points={p.stitch.map(pt).join(' ')} fill="none" stroke="#5a5650" stroke-width="0.6" stroke-dasharray="4 3" />}
			{(p.caught ?? []).map((run, i) => <polyline key={'c' + i} points={run.map(pt).join(' ')} fill="none" stroke="#5a5650" stroke-width="0.6" stroke-dasharray="4 3" />)}
			{(p.placement ?? []).map((run, i) => <polyline key={i} points={run.map(pt).join(' ')} fill="none" stroke="#2a2724" stroke-width="0.7" stroke-dasharray="1 2" />)}
			<line x1={ox + gx - dx} y1={oy + p.size[1] - (gy - dy)} x2={ox + gx + dx} y2={oy + p.size[1] - (gy + dy)} stroke="#2a2724" stroke-width="0.8" marker-start="url(#arr)" marker-end="url(#arr)" />
			<text x={ox + gx + 6} y={oy + p.size[1] - gy - 6} font-size="9" fill="#1f1d1a" font-family="system-ui, sans-serif">{p.name}</text>
			<text x={ox + gx + 6} y={oy + p.size[1] - gy + 6} font-size="7" fill="#59554f" font-family="system-ui, sans-serif">{p.cut}{p.construction === 'appliqué' ? ` · appliqué${p.sewnOn?.length ? ` on ${p.sewnOn.join(', ')}` : ''}${p.caughtIn?.length ? `, caught in ${p.caughtIn.join(', ')}` : ''}` : ''}{p.stretch ? ` · stretch ${(p.stretch.mean * 100).toFixed(0)}%` : ''}</text>
		</g>
	);
}
