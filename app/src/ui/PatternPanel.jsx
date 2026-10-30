// The stone patterns in the Sparkle tab: the gallery (every picture drawn by the pattern's own code) and
// the page of a chosen pattern. Everything here is live: a slider sends a gesture per drag and the stones
// follow in the same frame (stones/pattern.js, Engine.syncStones); the handles on the body do the same
// (render/gizmo.js, ui/tools.js).
import { useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, stonesRun } from './state.js';
import { run, Section, Field, Segmented, Slider, Switch, Tiles, Disclosure, Button, Hint } from './kit.jsx';
import { I } from './icons.jsx';
import { StonePicker, SizeLadder, CutPicker, cutLabel, parseStoneName } from './SparkleTab.jsx';
import { GALLERY, GALLERY_ITEMS, LAYOUTS, layoutDefaults } from '../stones/layouts.js';
import { Candidates } from '../stones/candidates.js';
import { GRADIENTS, gradientField } from '../stones/fields.js';
import { defaultGradient, patternParams } from '../stones/pattern.js';
import { COLOURS, SS, sizeOf } from '../stones/library.js';

// --- the gallery ------------------------------------------------------------------------------------

// A picture is the pattern's own layout and gradient (as stones/pattern.js runPattern applies them,
// without the cloth): density against rank, size along the gradient, on a square window.
const THUMB_PX = 150, WINDOW = 0.2, THUMB_PITCH = 0.0052, THUMB_STONE = 0.0034;
const thumbs = new Map(), thumbE = new Candidates(8192);
function thumbOf(item) {
	let url = thumbs.get(item.key);
	if (url) return url;
	const cv = document.createElement('canvas'), x = cv.getContext('2d'), h = WINDOW / 2, k = THUMB_PX / WINDOW;
	cv.width = cv.height = THUMB_PX;
	const layout = LAYOUTS[item.layout], P = { ...layoutDefaults(item.layout), ...item.params }, edge = (u, v) => Math.min(h - Math.abs(u), h - Math.abs(v));
	const E = thumbE.reset({ x0: -h, x1: h, y0: -h, y1: h, r: h * Math.SQRT2 }, THUMB_PITCH, 7, edge);
	try { layout.make(P, E); } catch (err) { console.warn('pattern picture', item.key, err); }
	const box = { x0: -h, x1: h, y0: -h, y1: h }, grad = P.gradient && P.gradient !== 'none' ? gradientField({ ...P, ...defaultGradient(P.gradient, box) }, edge) : null;
	const from = P.densityFrom ?? 1, to = P.densityTo ?? 1, d0 = P.size ? sizeOf(P.size) : THUMB_STONE, d1 = P.sizeTo ? sizeOf(P.sizeTo) : d0, dB = P.sizeB ? sizeOf(P.sizeB) : d0;
	x.fillStyle = '#2b2722';
	x.beginPath();
	for (let i = 0; i < E.n; i++) {
		const u = E.X[i], v = E.Y[i], t = grad ? grad(u, v) : 0;
		if (E.R[i] >= from + (to - from) * t) continue;
		const d = (layout.mixed && E.C[i] === 1 ? dB : d0 + (d1 - d0) * t) * E.K[i], r = Math.max(0.55, (d / 2) * k * 0.86), px = (u + h) * k, py = (h - v) * k;
		x.moveTo(px + r, py);
		x.arc(px, py, r, 0, Math.PI * 2);
	}
	x.fill();
	url = cv.toDataURL('image/png');
	thumbs.set(item.key, url);
	return url;
}

const groupOf = (key) => GALLERY.find((g) => g.items.some((it) => it.key === key))?.title;
export function PatternGallery({ value, onPick }) {
	const [cat, setCat] = useState(groupOf(value) ?? GALLERY[0].title), group = GALLERY.find((g) => g.title === cat);
	return (
		<div class="pattern-gallery">
			<Segmented wrap value={cat} options={GALLERY.map((g) => [g.title, g.title])} onPick={setCat} />
			<Tiles compact cols={4} value={value} items={group.items.map((it) => ({ key: it.key, label: it.label, img: thumbOf(it), hint: it.hint ?? it.label }))} onPick={onPick} />
		</div>
	);
}
export const patternLabel = (g) => GALLERY_ITEMS.get(g.params?.preset)?.label ?? LAYOUTS[g.params?.layout]?.label ?? 'Pattern';

// --- a chosen pattern -------------------------------------------------------------------------------

const FORMAT = {
	mm: (v) => (v * 1000).toFixed(v < 0.01 ? 1 : 0) + ' mm',
	deg: (v) => (Math.abs(v) < 10 && v % 1 ? v.toFixed(2) : v.toFixed(v % 1 ? 1 : 0)) + '°',
	n: (v) => (v % 1 ? v.toFixed(2) : String(v)),
	x: (v) => v.toFixed(2) + '×',
	pct: (v) => Math.round(v * 100) + '%',
};

function ParamControl({ spec, value, set }) {
	if (spec.options) return <Field label={spec.l}><Segmented wrap value={value} options={spec.options} onPick={(v) => set(spec.k, v)} /></Field>;
	return <Field label={spec.l}><Slider value={value} min={spec.min} max={spec.max} step={spec.step} format={FORMAT[spec.f]} onChange={(v, g) => set(spec.k, v, g)} /></Field>;
}

function Count({ id }) {
	stonesRun.value; rev.value;
	return <span class="sec-value">{(app.engine?.stoneRun.stones.filter((s) => s.gen === id).length ?? 0).toLocaleString()} crystals</span>;
}

const DISTORT = [
	{ k: 'twist', l: 'Twist', d: 0, min: -6, max: 6, step: 0.02, f: 'x' },
	{ k: 'bulge', l: 'Bulge', d: 0, min: -0.8, max: 3, step: 0.02, f: 'x' },
	{ k: 'bulgeR', l: 'Bulge width', d: 0.08, min: 0.02, max: 0.3, step: 0.002, f: 'mm' },
	{ k: 'waveA', l: 'Ripple height', d: 0, min: 0, max: 0.03, step: 0.0002, f: 'mm' },
	{ k: 'waveL', l: 'Ripple length', d: 0.06, min: 0.01, max: 0.25, step: 0.001, f: 'mm' },
	{ k: 'warp', l: 'Organic warp', d: 0, min: 0, max: 0.06, step: 0.0005, f: 'mm' },
	{ k: 'warpL', l: 'Warp size', d: 0.08, min: 0.015, max: 0.3, step: 0.001, f: 'mm' },
	{ k: 'jitter', l: 'Jitter', d: 0, min: 0, max: 0.01, step: 0.0001, f: 'mm' },
];
const FRAME_DEFAULTS = { x: 0, y: 0, rotate: 0, scale: 1, flip: false };

export function PatternEditor({ g }) {
	const piece = app.engine?.clothOf(g.on?.panel)?.piece, P = patternParams(g, piece), layout = LAYOUTS[P.layout];
	const set = (patch, gesture) => run({ op: 'stones.set', id: g.id, ...patch, ...(gesture ? { gesture } : {}) });
	const param = (k, v, gesture) => set({ params: { [k]: v } }, gesture);
	const pickLayout = (key) => {
		const it = GALLERY_ITEMS.get(key), renamed = g.name && GALLERY_ITEMS.get(P.preset)?.label !== g.name;
		set({ params: { layout: it.layout, preset: key, ...it.params }, ...(renamed ? {} : { name: it.label }) });
	};
	const x0 = piece?.x0 ?? -0.2, x1 = piece?.x1 ?? 0.2, y0 = piece?.y0 ?? -0.3, y1 = piece?.y1 ?? 0.3;
	const gradient = P.gradient ?? 'none';
	const pickGradient = (v) => {
		const patch = { gradient: v };
		// the first gradient of a pattern shows at once: it fades out, unless it already drives something
		if (v !== 'none' && P.densityFrom === undefined && P.densityTo === undefined && !P.sizeTo && !(g.colourRamp?.length > 1)) { patch.densityFrom = 1; patch.densityTo = 0; }
		param2(patch);
	};
	const param2 = (patch) => set({ params: patch });
	const mm1 = FORMAT.mm;
	return (
		<>
			<Section title="Arrangement" aside={<Count id={g.id} />}>
				<PatternGallery value={P.preset} onPick={pickLayout} />
				{layout.params.map((spec) => <ParamControl key={spec.k} spec={spec} value={P[spec.k]} set={param} />)}
				<div class="btn-row"><Button icon={<I.shuffle size={18} />} title="A new variation of what is random in this pattern" onClick={() => set({ seed: Math.floor(Math.random() * 1e6) })}>Reshuffle</Button></div>
			</Section>
			{layout.flat ? null : (
				<Section title="Place on the piece" note="Drag the handles on the body: the middle one moves it, the arrow on the ring turns it, the corner one scales it. Hold Shift to turn in 15° steps.">
					<Field label="Across"><Slider value={P.x} min={x0 - 0.05} max={x1 + 0.05} step={0.0005} format={mm1} onChange={(v, gs) => param('x', v, gs)} /></Field>
					<Field label="Up"><Slider value={P.y} min={y0 - 0.05} max={y1 + 0.05} step={0.0005} format={mm1} onChange={(v, gs) => param('y', v, gs)} /></Field>
					<Field label="Turn"><Slider value={P.rotate} min={-180} max={180} step={0.5} format={FORMAT.deg} onChange={(v, gs) => param('rotate', v, gs)} /></Field>
					<Field label="Scale"><Slider value={P.scale} min={0.1} max={6} step={0.01} format={FORMAT.x} onChange={(v, gs) => param('scale', v, gs)} /></Field>
					<Switch label="Flip it over" value={!!P.flip} onChange={(v) => param('flip', v)} />
					<Switch label="Mirror across the centre of the body" hint="Keeps the wearer's left half of the pattern and mirrors it to the right" value={!!P.symmetric} onChange={(v) => param('symmetric', v)} />
					<div class="btn-row"><Button title="Back to the middle of the piece, upright, at its first size" onClick={() => param2(FRAME_DEFAULTS)}>Reset</Button></div>
				</Section>
			)}
			<Section title="Gradient" note={gradient !== 'none' ? 'Drag its two handles on the body to set its direction and size.' : 'A gradient can thin the crystals out, change their size and blend their colours.'}>
				<Segmented wrap value={gradient} options={Object.entries(GRADIENTS).map(([k, v]) => [k, v.label, null, v.hint])} onPick={pickGradient} />
				{gradient !== 'none' ? <>
					<Field label="Density at the start"><Slider value={P.densityFrom ?? 1} min={0} max={1} step={0.01} format={FORMAT.pct} onChange={(v, gs) => param('densityFrom', v, gs)} /></Field>
					<Field label="Density at the end"><Slider value={P.densityTo ?? 1} min={0} max={1} step={0.01} format={FORMAT.pct} onChange={(v, gs) => param('densityTo', v, gs)} /></Field>
					<Field label="Fall-off"><Slider value={P.gpower ?? 1} min={0.2} max={5} step={0.05} format={FORMAT.x} onChange={(v, gs) => param('gpower', v, gs)} /></Field>
					<Switch label="Swap its ends" value={!!P.greverse} onChange={(v) => param('greverse', v)} />
					{gradient === 'clouds' ? <div class="btn-row"><Button icon={<I.shuffle size={18} />} onClick={() => param('gseed', Math.floor(Math.random() * 1e6))}>New clouds</Button></div> : null}
				</> : null}
			</Section>
			<Section title="Crystal">
				<ColourStops g={g} P={P} set={set} param={param} />
				<Field label="Size" aside={<span class="field-value">{P.size ?? 'ss12'} · {SS[+String(P.size ?? 'ss12').slice(2)]} mm</span>}><SizeLadder value={P.size ?? 'ss12'} onPick={(v) => param('size', v)} /></Field>
				<Switch label={gradient !== 'none' ? 'Size changes along the gradient' : 'Size changes along the pattern'} value={!!P.sizeTo} onChange={(v) => param2(v ? { sizeTo: 'ss6', ...(gradient === 'none' ? { sizeBy: 'along' } : {}) } : { sizeTo: undefined })} />
				{P.sizeTo ? <>
					<Field label="Size at the end" aside={<span class="field-value">{P.sizeTo}</span>}><SizeLadder value={P.sizeTo} onPick={(v) => param('sizeTo', v)} /></Field>
					{gradient !== 'none' ? <Field label="Size follows"><Segmented value={P.sizeBy ?? 'gradient'} options={[['gradient', 'The gradient'], ['along', 'The pattern']]} onPick={(v) => param('sizeBy', v)} /></Field> : null}
				</> : null}
				{layout.mixed ? <>
					<Switch label="Mix in a second size" value={!!P.sizeB} onChange={(v) => param2(v ? { sizeB: 'ss20', mix: P.mix ?? 0.3 } : { sizeB: undefined })} />
					{P.sizeB ? <>
						<Field label="Second size" aside={<span class="field-value">{P.sizeB}</span>}><SizeLadder value={P.sizeB} onPick={(v) => param('sizeB', v)} /></Field>
						<Field label="How many"><Slider value={P.mix ?? 0.3} min={0.02} max={1} step={0.01} format={FORMAT.pct} onChange={(v, gs) => param('mix', v, gs)} /></Field>
					</> : null}
				</> : null}
				<Field label="Cut" aside={<span class="field-value">{cutLabel(g.shape ?? 'round')}</span>}><CutPicker value={g.shape ?? 'round'} onPick={(v) => set({ shape: v })} /></Field>
				{layout.points ? null : <Field label="Spacing between crystals"><Slider value={P.gap ?? 1.2} min={1} max={4} step={0.01} format={FORMAT.x} onChange={(v, gs) => param('gap', v, gs)} /></Field>}
				<Field label="Clear of the piece's edges"><Slider value={P.margin ?? 0} min={0} max={0.05} step={0.0005} format={mm1} onChange={(v, gs) => param('margin', v, gs)} /></Field>
			</Section>
			<Section>
				<Disclosure label="Distort: bend the whole arrangement">
					{DISTORT.map((spec) => <ParamControl key={spec.k} spec={spec} value={P[spec.k] ?? spec.d} set={param} />)}
				</Disclosure>
			</Section>
			{(g.shape ?? 'round') !== 'round' ? <Section><Disclosure label="Which way the crystals point">
				<Field label="Point"><Segmented value={P.turn ?? 'follow'} options={[['follow', 'With the pattern'], ['fixed', 'All one way']]} onPick={(v) => param('turn', v)} /></Field>
				<Field label="Turn each"><Slider value={P.stoneTurn ?? 0} min={-180} max={180} step={1} format={FORMAT.deg} onChange={(v, gs) => param('stoneTurn', v, gs)} /></Field>
			</Disclosure></Section> : null}
			{piece ? null : <Hint>The piece is still being laid flat; the crystals follow in a moment.</Hint>}
		</>
	);
}

// One colour, or several: then they blend along the gradient, along the pattern, or by its families.
function ColourStops({ g, P, set, param }) {
	const ramp = g.colourRamp?.length > 1 ? g.colourRamp : null, stops = ramp ?? [g.stone ?? 'Crystal AB'], [at, setAt] = useState(0), i = Math.min(at, stops.length - 1);
	const pick = (v) => (ramp ? set({ colourRamp: stops.map((s, k) => (k === i ? v : s)) }) : set({ stone: v, palette: null }));
	const add = () => { set({ colourRamp: [...stops, stops[stops.length - 1]] }); setAt(stops.length); };
	const remove = () => {
		if (stops.length > 2) set({ colourRamp: stops.filter((_, k) => k !== i) });
		else set({ colourRamp: null, stone: stops[i === 0 ? 1 : 0] });
		setAt(0);
	};
	return (
		<>
			<Field label={ramp ? 'Colours' : 'Colour'}>
				<div class="stops">
					{stops.map((n, k) => <button key={k} class={`gem ${k === i ? 'on' : ''} ${parseStoneName(n).ab ? 'ab' : ''}`} style={{ '--c': COLOURS[parseStoneName(n).base] ?? '#ffffff' }} title={n} aria-label={n} onClick={() => setAt(k)} />)}
					<button class="stop-btn" title="Add a colour to blend to" aria-label="Add a colour" onClick={add}><I.plus size={15} /></button>
					{ramp ? <button class="stop-btn" title="Remove this colour" aria-label="Remove this colour" onClick={remove}><I.close size={13} /></button> : null}
				</div>
			</Field>
			<StonePicker stone={stops[i]} onPick={pick} />
			{ramp ? <Field label="Colours follow"><Segmented value={P.colourBy ?? 'gradient'} options={[['gradient', 'The gradient'], ['along', 'The pattern'], ['family', 'Its families']]} onPick={(v) => param('colourBy', v)} /></Field> : null}
		</>
	);
}
