// A stone pattern's card, and the gallery of presets it is picked from (every picture drawn by the pattern's own
// code). Its faces, what matters most first: Preset (the gallery), Arrange (how dense, how spaced, and the
// arrangement's own settings), Crystal, Place (the whole pattern on the piece, or the crystals under it), Modify (its
// modifiers: one opened is a card of its own, back to the pattern), Distort. Everything here is live: a slider sends
// a gesture per drag and the stones follow in the same frame (stones/pattern.js, Engine.syncStones); the handles on
// the body do the same (stones/handles.js, render/gizmo.js, ui/tools.js), and they work on what the card is on: the
// pattern's frame, the crystals' plane (Place, crystals under it) or the open modifier (ui/state.js patternFocus).
import { useEffect, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { patternFocus, rev, stonesRun, selection, tool, tab, facets } from './state.js';
import { toolOptions } from './tools.js';
import { run, Card, Field, Segmented, Slider, Switch, Tiles, Paged, Button, IconButton, Hint } from './kit.jsx';
import { I } from './icons.jsx';
import { StonePicker, CrystalPicker, parseStoneName } from './SparkleCard.jsx';
import { GALLERY, GALLERY_ITEMS, LAYOUTS, layoutDefaults } from '../stones/layouts.js';
import { MOD_SHAPES, MOD_TARGETS, modGeometry, newModifier, nextModId, isSpatial } from '../stones/modifiers.js';
import { patternParams, patternStones, presetPatch, minScale, PLANE_DEFAULTS, pieceMiddle } from '../stones/pattern.js';
import { FORMAT } from '../stones/handles.js';
import { realSize } from '../stones/candidates.js';
import { COLOURS, SS, sizeOf } from '../stones/library.js';

// --- the gallery ------------------------------------------------------------------------------------

// A picture is the pattern's own code on a square of cloth: what runPattern does, without the body.
const THUMB_PX = 132, WINDOW = 0.15, THUMB_STONE = 'ss12';
const thumbs = new Map();
const flatSquare = (h) => {
	const zero = { x: 0, y: 0, z: 0 };
	return {
		x0: -h, x1: h, y0: -h, y1: h, w1: 0, w2: 0,
		edgeAt: (u, v) => Math.min(h - Math.abs(u), h - Math.abs(v)),
		find: () => 0, posOf: (q, out) => { out.x = 0; out.y = 0; out.z = 0; return zero; }, spOf: () => null, angleOf: (q, a) => a,
	};
};
function thumbOf(item) {
	let url = thumbs.get(item.key);
	if (url) return url;
	const cv = document.createElement('canvas'), x = cv.getContext('2d'), h = WINDOW / 2, k = THUMB_PX / WINDOW;
	cv.width = cv.height = THUMB_PX;
	x.fillStyle = '#1f1c18';
	try {
		const piece = flatSquare(h), mods = (item.mods ?? []).map((m, i) => newModifier(m.on, m.shape, m, 'm' + i)), P0 = { ...layoutDefaults(item.layout), ...item.params };
		// a design of its own size is drawn to fit the picture
		const grip = LAYOUTS[item.layout].grips?.find((g) => g.type === 'radius' || g.title === 'Size'), reach = grip?.key ? P0[grip.key] * (grip.half ? 0.5 : 1) * (grip.unit?.(P0) ?? 1) : P0.extent ? P0.extent / 2 : 0, fit = reach > h * 0.95 ? (h * 0.95) / reach : 1;
		// (the stones' places: the pipeline's u, v are read back through the hook it leaves for pictures)
		const list = [];
		piece.find = (u, v) => { piece.u = u; piece.v = v; return 0; };
		piece.spOf = () => ({ u: piece.u, v: piece.v });
		for (const s of patternStones({ id: 'thumb', seed: 7, stone: 'Crystal', params: { layout: item.layout, x: 0, y: 0, size: THUMB_STONE, gap: 1.15, scale: fit, ...P0, mods } }, piece)) list.push(s);
		x.beginPath();
		for (const s of list) {
			const r = Math.max(0.7, (s.size / 2) * k * 0.95), px = (s.sp.u + h) * k, py = (h - s.sp.v) * k;
			x.moveTo(px + r, py);
			x.arc(px, py, r, 0, Math.PI * 2);
		}
		x.fill();
	} catch (err) { console.warn('pattern picture', item.key, err); }
	url = cv.toDataURL('image/png');
	thumbs.set(item.key, url);
	return url;
}

// The presets by family: the families as a block of words, the family's presets as pictures, twelve to a page.
const groupOf = (key) => GALLERY.find((g) => g.items.some((it) => it.key === key))?.title;
export function PatternGallery({ value, onPick }) {
	const [cat, setCat] = useState(groupOf(value) ?? GALLERY[0].title), group = GALLERY.find((g) => g.title === cat);
	return (
		<>
			<Segmented cols={5} value={cat} options={GALLERY.map((g) => [g.title, g.title])} onPick={setCat} />
			<Paged key={cat} items={group.items} per={12} value={value}>
				{(items) => <Tiles cols={4} value={value} items={items.map((it) => ({ key: it.key, label: it.label, img: thumbOf(it), hint: it.hint ?? it.label }))} onPick={onPick} />}
			</Paged>
		</>
	);
}
export const patternLabel = (g) => GALLERY_ITEMS.get(g.params?.preset)?.label ?? LAYOUTS[g.params?.layout]?.label ?? 'Pattern';

// --- a chosen pattern -------------------------------------------------------------------------------

function ParamControl({ spec, P, set, piece }) {
	if (spec.hidden || (spec.when && !spec.when(P))) return null;
	// (its default is what the preset gives it; its end, where it stops doing anything)
	const value = P[spec.k] ?? spec.d, max = spec.maxOf ? Math.max(spec.min + (spec.step ?? 0), Math.min(spec.max, spec.maxOf(P, piece))) : spec.max, def = GALLERY_ITEMS.get(P.preset)?.params?.[spec.k] ?? spec.d;
	if (spec.options) return <Field label={spec.l}><Segmented wrap value={value} options={spec.options} onPick={(v) => set(spec.k, v)} /></Field>;
	return <Slider label={spec.l} value={Math.min(value, max)} min={spec.min} max={max} step={spec.step} log={spec.log} def={def} format={FORMAT[spec.f]} onChange={(v, g) => set(spec.k, v, g)} />;
}

const DISTORT = [
	{ k: 'twist', l: 'Twist', d: 0, min: -6, max: 6, step: 0.02, f: 'x' },
	{ k: 'bulge', l: 'Bulge', d: 0, min: -0.8, max: 3, step: 0.02, f: 'x' },
	{ k: 'bulgeR', l: 'Bulge width', d: 0.08, min: 0.02, max: 0.3, step: 0.001, f: 'mm', log: true, when: (P) => !!P.bulge },
	{ k: 'waveA', l: 'Ripple height', d: 0, min: 0, max: 0.03, step: 0.0002, f: 'mm' },
	{ k: 'waveL', l: 'Ripple length', d: 0.06, min: 0.01, max: 0.25, step: 0.001, f: 'mm', log: true, when: (P) => !!P.waveA },
	{ k: 'warp', l: 'Organic warp', d: 0, min: 0, max: 0.06, step: 0.0005, f: 'mm' },
	{ k: 'warpL', l: 'Warp size', d: 0.08, min: 0.015, max: 0.3, step: 0.001, f: 'mm', log: true, when: (P) => !!P.warp },
	{ k: 'jitter', l: 'Jitter', d: 0, min: 0, max: 0.01, step: 0.0001, f: 'mm' },
];

const toSparkle = () => { tool.value = 'move'; selection.value = null; tab.value = 'sparkle'; };

export function PatternCard({ id }) {
	rev.value; // (g is edited in place, and a component that reads a signal redraws only for a new prop or its signals: see state.js)
	const g = app.doc.stones.find((x) => x.id === id), focus = patternFocus.value, face = facets.value.pattern;
	// the handles work on the crystals' plane only while that is what the card is on
	useEffect(() => { if (face !== 'place' && patternFocus.value === 'plane') patternFocus.value = 'frame'; }, [face]);
	if (!g) return <Card kind="gone" title="This pattern no longer exists" onBack={toSparkle} backLabel="Sparkle">{() => null}</Card>;
	const piece = app.engine?.clothOf(g.on?.panel)?.piece, P = patternParams(g, piece), layout = LAYOUTS[P.layout];
	if (!piece) stonesRun.value; // (shown again when its flat shape arrives)
	const set = (patch, gesture) => run({ op: 'stones.set', id: g.id, ...patch, ...(gesture ? { gesture } : {}) });
	const param = (k, v, gesture) => set({ params: { [k]: v } }, gesture);
	const params = (patch, gesture) => set({ params: patch }, gesture);
	const mods = P.mods ?? [], setMods = (list, gesture) => params({ mods: list }, gesture), open = mods.find((m) => m.id === focus);
	if (open) return <ModifierCard m={open} mods={mods} setMods={setMods} P={P} piece={piece} name={g.name || patternLabel(g)} />;
	const pickPreset = (key) => {
		const it = GALLERY_ITEMS.get(key), renamed = g.name && GALLERY_ITEMS.get(P.preset)?.label !== g.name;
		set({ params: presetPatch({ ...g.params, mods: P.mods }, key, toolOptions.value.stone.size), ...(renamed ? {} : { name: it.label }) });
		patternFocus.value = 'frame';
	};
	const random = typeof layout.random === 'function' ? layout.random(P) : layout.random, points = typeof layout.points === 'function' ? layout.points(P) : layout.points;
	const margin = <Slider label="Clear of the piece's edges" value={P.margin ?? 0} min={0} max={0.05} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => param('margin', v, gs)} />;
	return (
		<Card kind="pattern" title={g.name ?? ''} placeholder={patternLabel(g)} onRename={(v) => set({ name: v })} onBack={toSparkle} backLabel="Sparkle"
			actions={<>
				<IconButton icon={<I.release size={18} />} label="Release: freeze into single crystals" onClick={() => { run({ op: 'stones.release', id: g.id }); selection.value = null; }} />
				<IconButton icon={<I.trash size={18} />} label="Delete this pattern" kind="danger" onClick={() => { run({ op: 'stones.remove', id: g.id }); selection.value = null; }} />
			</>}
			faces={[['preset', 'Preset'], ['arrange', 'Arrange'], ['crystal', 'Crystal'], ...(layout.flat ? [] : [['place', 'Place']]), ['mods', 'Modify'], ...(layout.flat ? [] : [['distort', 'Distort']])]}>
			{(f) => <>{f === 'preset' ? <PatternGallery value={P.preset} onPick={pickPreset} />
				: f === 'arrange' ? <>
					<Slider label="Density" value={P.density ?? 1} min={0} max={1} step={0.01} def={1} format={FORMAT.pct} onChange={(v, gs) => param('density', v, gs)} />
					{points ? null : <Slider label="Spacing between crystals" value={P.gap ?? 1.2} min={1} max={4} step={0.01} def={1.15} format={FORMAT.x} onChange={(v, gs) => param('gap', v, gs)} />}
					{layout.params.map((spec) => <ParamControl key={spec.k} spec={spec} P={P} set={param} piece={piece} />)}
					{layout.flat ? margin : null}
					<div class="btn-row">
						{random ? <Button icon={<I.shuffle size={18} />} title="A new variation of what is random in this pattern" onClick={() => set({ seed: Math.floor(Math.random() * 1e6) })}>Reshuffle</Button> : null}
						<Button kind="quiet" title="Every setting of the arrangement back to this preset's" onClick={() => pickPreset(P.preset ?? 'scatter')}>Reset to the preset</Button>
					</div>
				</> : f === 'crystal' ? <CrystalPicker stone={g.stone ?? 'Crystal AB'} size={P.size ?? 'ss12'} shape={g.shape ?? 'round'} onStone={(v) => set({ stone: v, palette: null })} onSize={(v) => param('size', v)} onShape={(v) => set({ shape: v })} />
					: f === 'place' ? <Place g={g} P={P} piece={piece} param={param} params={params} margin={margin} focus={focus} />
						: f === 'mods' ? <Modifiers mods={mods} setMods={setMods} P={P} piece={piece} />
							: DISTORT.map((spec) => <ParamControl key={spec.k} spec={spec} P={P} set={param} />)}
				{piece ? null : <Hint>The piece is still being laid flat; the crystals follow in a moment.</Hint>}</>}
		</Card>
	);
}

// Where the pattern lies. The whole pattern: it and everything on it move together (as its handles do: the middle
// moves it, the top turns it, Shift for 15° steps, the corner scales it). The crystals under it: they shift, turn
// and scale alone, the modifiers staying where they are; the handles then work on them.
function Place({ g, P, piece, param, params, margin, focus }) {
	rev.value;
	const plane = focus === 'plane';
	const [cx, cy] = pieceMiddle(piece), x0 = piece?.x0 ?? -0.2, x1 = piece?.x1 ?? 0.2, y0 = piece?.y0 ?? -0.3, y1 = piece?.y1 ?? 0.3, least = Math.max(0.05, minScale(P) / Math.max(P.pscale ?? 1, 1e-3));
	return (
		<>
			<Segmented value={plane ? 'plane' : 'frame'} options={[['frame', 'The whole pattern', null, 'Moves the pattern and everything on it'], ['plane', 'The crystals under it', null, 'Shifts, turns and scales the crystals only: the modifiers stay where they are']]} onPick={(v) => { patternFocus.value = v; }} />
			{plane ? <>
				<Slider label="Shift across" value={P.px} min={-0.2} max={0.2} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => param('px', v, gs)} />
				<Slider label="Shift up" value={P.py} min={-0.2} max={0.2} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => param('py', v, gs)} />
				<Slider label="Turn" value={P.pturn} min={-180} max={180} step={0.5} def={0} format={FORMAT.deg} onChange={(v, gs) => param('pturn', v, gs)} />
				<Slider label="Scale" value={P.pscale} min={0.1} max={6} step={0.01} def={1} log format={FORMAT.x} onChange={(v, gs) => param('pscale', v, gs)} />
				<Slider label="Stretch across" value={P.sx} min={0.25} max={4} step={0.01} def={1} log format={FORMAT.x} onChange={(v, gs) => param('sx', v, gs)} />
				<Slider label="Stretch up" value={P.sy} min={0.25} max={4} step={0.01} def={1} log format={FORMAT.x} onChange={(v, gs) => param('sy', v, gs)} />
				{(g.shape ?? 'round') !== 'round' ? <Field label="Which way the crystals point">
					<Segmented value={P.turn ?? 'follow'} options={[['follow', 'With the pattern'], ['fixed', 'All one way']]} onPick={(v) => param('turn', v)} />
					<Slider label="Turn each" value={P.stoneTurn ?? 0} min={-180} max={180} step={1} def={0} format={FORMAT.deg} onChange={(v, gs) => param('stoneTurn', v, gs)} />
				</Field> : null}
				<div class="btn-row"><Button kind="quiet" onClick={() => params(PLANE_DEFAULTS)}>Reset</Button></div>
			</> : <>
				<Slider label="Across" value={P.x} min={x0 - 0.05} max={x1 + 0.05} step={0.0005} def={cx} format={(v) => FORMAT.mm(v - cx)} parse={(n) => n / 1000 + cx} onChange={(v, gs) => param('x', v, gs)} />
				<Slider label="Up" value={P.y} min={y0 - 0.05} max={y1 + 0.05} step={0.0005} def={cy} format={(v) => FORMAT.mm(v - cy)} parse={(n) => n / 1000 + cy} onChange={(v, gs) => param('y', v, gs)} />
				<Slider label="Turn" value={P.rotate} min={-180} max={180} step={0.5} def={0} format={FORMAT.deg} onChange={(v, gs) => param('rotate', v, gs)} />
				<Slider label="Scale" value={Math.max(P.scale, least)} min={least} max={6} step={0.01} def={1} log format={FORMAT.x} onChange={(v, gs) => param('scale', v, gs)} />
				<Switch label="Flip it over" value={!!P.flip} onChange={(v) => param('flip', v)} />
				<Switch label="Mirror across the centre of the body" hint="Keeps the wearer's left half of the pattern and mirrors it to the right" value={!!P.symmetric} onChange={(v) => param('symmetric', v)} />
				{margin}
			</>}
		</>
	);
}

// --- modifiers -------------------------------------------------------------------------------------

const TARGET_ICON = { density: <I.density size={18} />, size: <I.sizes size={18} />, colour: <I.colours size={18} /> };
const shapesFor = (on) => Object.entries(MOD_SHAPES).filter(([k]) => on === 'colour' || k !== 'bysize' || on === 'density').map(([k, v]) => [k, v.label, null, v.hint]);
// The size a factor comes to, as it can be bought.
const ssOf = (d) => { const mm = Math.round(realSize(d) * 10000) / 10; for (const [k, v] of Object.entries(SS)) if (v === mm) return 'ss' + k; return ''; };
const titleOf = (m) => `${MOD_TARGETS[m.on]?.label ?? m.on}: ${(MOD_SHAPES[m.shape]?.label ?? m.shape).toLowerCase()}`;

// The pattern's modifiers, to open, switch off or remove; and the three kinds to add.
function Modifiers({ mods, setMods, P, piece }) {
	rev.value;
	const add = (on) => {
		// (as big as the piece, at whatever scale the pattern is now)
		const m = newModifier(on, 'linear', modGeometry('linear', piece, P.scale ?? 1), nextModId(mods));
		setMods([...mods, m]);
		patternFocus.value = m.id;
	};
	return (
		<>
			{mods.length ? mods.map((m) => (
				<div key={m.id} class={`mod-row tone-${m.on} ${m.off ? 'off' : ''}`}>
					<button class="mod-open" title="Work on this one: its handles show on the body" onClick={() => { patternFocus.value = m.id; }}>
						<span class="mod-icon">{TARGET_ICON[m.on]}</span><span>{titleOf(m)}</span><I.chevronRight size={15} class="part-chev" />
					</button>
					<IconButton icon={m.off ? <I.eyeOff size={17} /> : <I.eye size={17} />} label={m.off ? 'Switch it on' : 'Switch it off for now'} onClick={() => setMods(mods.map((x) => (x.id === m.id ? { ...x, off: !m.off } : x)))} />
					<IconButton icon={<I.trash size={17} />} label="Remove this modifier" kind="danger" onClick={() => setMods(mods.filter((x) => x.id !== m.id))} />
				</div>
			)) : <Hint>A modifier changes the density, size or colour of the crystals from place to place. They stack: a linear fade and a radial one on the same thing act together.</Hint>}
			<Field label="Add a modifier of">
				<div class="mod-add">
					{Object.entries(MOD_TARGETS).map(([k, t]) => <button key={k} class={`mod-add-btn tone-${k}`} title={t.hint} onClick={() => add(k)}>{TARGET_ICON[k]}<span>{t.label}</span></button>)}
				</div>
			</Field>
		</>
	);
}

// One modifier, opened from the pattern's card: what it does (Effect) and where (Shape). Its handles show on the body.
function ModifierCard({ m, mods, setMods, P, piece, name }) {
	rev.value;
	const shape = MOD_SHAPES[m.shape] ?? {}, spatial = isSpatial(m.shape), S = P.scale ?? 1, geo = spatial ? modGeometry(m.shape, piece, S) : {};
	const first = mods.find((x) => x.on === m.on) === m, back = () => { patternFocus.value = 'frame'; };
	const update = (patch, gesture) => setMods(mods.map((x) => (x.id === m.id ? { ...x, ...patch } : x)), gesture);
	const d0 = sizeOf(P.size ?? 'ss12');
	const sizeFormat = (v) => `×${v.toFixed(2)} · ${ssOf(d0 * v)}`;
	const setShape = (s) => {
		// a change of class: it starts at that shape's own size, where it was
		const g = modGeometry(s, piece, S), same = MOD_SHAPES[s]?.cls === shape.cls, patch = { shape: s };
		if (!same) Object.assign(patch, { w: g.w, h: g.h });
		if (!MOD_SHAPES[s]?.bounds) patch.clip = false;
		else if (m.on === 'density') patch.clip = true;
		update(patch);
	};
	const sizeWords = shape.cls === 'box' ? ['Length', 'Width'] : shape.cls === 'round' ? ['Length', 'Width'] : shape.cls === 'ring' || shape.cls === 'dial' ? ['Radius'] : shape.cls === 'edge' ? ['How far in'] : ['Each repeat'];
	const flat = ['family', 'random', 'stripes', 'checks'].includes(m.shape);
	return (
		<Card kind="modifier" title={titleOf(m)} onBack={back} backLabel={name}
			actions={<>
				<IconButton icon={m.off ? <I.eyeOff size={18} /> : <I.eye size={18} />} label={m.off ? 'Switch it on' : 'Switch it off for now'} onClick={() => update({ off: !m.off })} />
				<IconButton icon={<I.trash size={18} />} label="Remove this modifier" kind="danger" onClick={() => { setMods(mods.filter((x) => x.id !== m.id)); back(); }} />
			</>}
			faces={[['effect', 'Effect'], ['shape', 'Shape']]}>
			{(f) => f === 'effect' ? <>
				{m.on === 'density' ? <>
					<Slider label="At the start" value={m.from ?? 1} min={0} max={1} step={0.01} def={1} format={FORMAT.pct} onChange={(v, gs) => update({ from: v }, gs)} />
					<Slider label="At the end" value={m.to ?? 0} min={0} max={1} step={0.01} def={0} format={FORMAT.pct} onChange={(v, gs) => update({ to: v }, gs)} />
				</> : null}
				{m.on === 'size' ? <>
					<Slider label="At the start" value={m.from ?? 1} min={0.2} max={5} step={0.01} def={1} log format={sizeFormat} parse={(n) => n} onChange={(v, gs) => update({ from: v }, gs)} />
					<Slider label="At the end" value={m.to ?? 0.5} min={0.2} max={5} step={0.01} def={0.5} log format={sizeFormat} parse={(n) => n} onChange={(v, gs) => update({ to: v }, gs)} />
				</> : null}
				{m.on === 'colour' ? <ColourStops m={m} base={P} update={update} /> : null}
				{flat ? null : <Slider label="Fall-off" value={m.power ?? 1} min={0.2} max={5} step={0.05} def={1} log format={FORMAT.x} onChange={(v, gs) => update({ power: v }, gs)} />}
				{m.on === 'colour' && !flat ? <Slider label="Mingling" value={m.mix ?? 1} min={0} max={1} step={0.01} def={1} format={FORMAT.pct} onChange={(v, gs) => update({ mix: v }, gs)} /> : null}
				{m.shape !== 'family' && m.shape !== 'random' ? <Switch label="Swap its ends" value={!!m.reverse} onChange={(v) => update({ reverse: v })} /> : null}
				{!first && m.on !== 'colour' ? <Field label="With the ones before it"><Segmented value={m.blend ?? 'mul'} options={[['mul', 'Multiply'], ['add', 'Add']]} onPick={(v) => update({ blend: v })} /></Field> : null}
			</> : <>
				<Segmented cols={3} value={m.shape} options={shapesFor(m.on)} onPick={setShape} />
				{m.shape === 'clouds' ? <div class="btn-row"><Button icon={<I.shuffle size={18} />} onClick={() => update({ seed: Math.floor(Math.random() * 1e6) })}>New clouds</Button></div> : null}
				{shape.bounds ? <Switch label="Nothing outside its bounds" hint={m.on === 'density' ? 'No crystals outside it' : 'Crystals outside it are left as they are'} value={!!m.clip} onChange={(v) => update({ clip: v })} /> : null}
				{shape.bounds && m.clip && m.on === 'density' ? <Slider label="Soft edge" value={m.feather ?? 0} min={0} max={0.08} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => update({ feather: v }, gs)} /> : null}
				{spatial ? <>
					{shape.cls === 'edge' ? null : <ModPlace m={m} shape={shape} geo={geo} update={update} />}
					{m.shape === 'sweep' && !m.clip ? null : <Slider label={sizeWords[0]} value={m.w ?? geo.w} min={0.005} max={1.2} step={0.0005} def={geo.w} log format={FORMAT.mm} onChange={(v, gs) => update(shape.cls === 'box' || shape.cls === 'round' ? { w: v } : { w: v, h: v }, gs)} />}
					{sizeWords[1] && (shape.cls !== 'box' || m.clip) ? <Slider label={sizeWords[1]} value={m.h ?? geo.h} min={0.005} max={1.2} step={0.0005} def={geo.h} log format={FORMAT.mm} onChange={(v, gs) => update({ h: v }, gs)} /> : null}
				</> : null}
			</>}
		</Card>
	);
}

// Where a modifier lies, as what means something for it: a band that runs one way moves only along that way; a shape
// that fills a place moves both ways, along and across itself.
function ModPlace({ m, shape, geo, update }) {
	const a = ((m.a ?? geo.a ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), x = m.x ?? 0, y = m.y ?? 0;
	const alongIt = x * c + y * s, acrossIt = y * c - x * s, oneWay = m.shape === 'waves' || m.shape === 'stripes' || (shape.cls === 'box' && !m.clip);
	const place = (al, ac, gs) => update({ x: al * c - ac * s, y: al * s + ac * c }, gs);
	return (
		<>
			<Slider label={oneWay ? 'Along' : 'Along it'} value={alongIt} min={-0.4} max={0.4} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => place(v, acrossIt, gs)} />
			{oneWay ? null : <Slider label="Across it" value={acrossIt} min={-0.4} max={0.4} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => place(alongIt, v, gs)} />}
			{shape.turnless || shape.cls === 'ring' ? null : <Slider label="Turn" value={m.a ?? 0} min={-180} max={180} step={0.5} def={geo.a} format={FORMAT.deg} onChange={(v, gs) => update({ a: v }, gs)} />}
		</>
	);
}

// The colours along a colour modifier. A stop can be the crystal's own colour, whatever that is.
function ColourStops({ m, base, update }) {
	rev.value;
	const stops = m.stops ?? [null, 'Sapphire'], [at, setAt] = useState(stops.length - 1), i = Math.min(at, stops.length - 1), stoneOf = (s) => s ?? base.stone ?? 'Crystal AB';
	const pick = (v) => update({ stops: stops.map((s, k) => (k === i ? v : s)) });
	const add = () => { update({ stops: [...stops, stops[stops.length - 1] ?? 'Ruby'] }); setAt(stops.length); };
	const removeStop = () => { if (stops.length > 2) { update({ stops: stops.filter((_, k) => k !== i) }); setAt(0); } };
	const parse = parseStoneName;
	return (
		<>
			<Field label="Colours along it" aside={stops[i] !== null ? <button class="link" onClick={() => update({ stops: stops.map((s, k) => (k === i ? null : s)) })}>Use the crystal's own here</button> : "The crystal's own"}>
				<div class="stops">
					{stops.map((n, k) => {
						const shown = parse(stoneOf(n));
						return <button key={k} class={`gem ${k === i ? 'on' : ''} ${shown.ab ? 'ab' : ''} ${n === null ? 'own' : ''}`} style={{ '--c': COLOURS[shown.base] ?? '#ffffff' }} title={n ?? "The crystal's own colour"} aria-label={n ?? "The crystal's own colour"} onClick={() => setAt(k)} />;
					})}
					<button class="stop-btn" title="Add a colour" aria-label="Add a colour" onClick={add}><I.plus size={15} /></button>
					{stops.length > 2 ? <button class="stop-btn" title="Remove this colour" aria-label="Remove this colour" onClick={removeStop}><I.close size={13} /></button> : null}
				</div>
			</Field>
			<StonePicker stone={stoneOf(stops[i])} onPick={pick} />
		</>
	);
}
