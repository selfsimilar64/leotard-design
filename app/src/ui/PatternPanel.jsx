// The stone patterns in the Sparkle tab: the gallery of presets (every picture drawn by the pattern's own
// code) and the page of a chosen pattern. Top to bottom, what matters most first: its arrangement, its
// crystal, where it lies on the piece, its modifiers, its distortions, and last how the crystals lie under
// all that. Everything here is live: a slider sends a gesture per drag and the stones follow in the same
// frame (stones/pattern.js, Engine.syncStones); the handles on the body do the same (stones/handles.js,
// render/gizmo.js, ui/tools.js).
import { useState } from 'preact/hooks';
import { app } from '../instance.js';
import { patternFocus, stonesRun } from './state.js';
import { toolOptions } from './tools.js';
import { run, Section, Field, Segmented, Slider, Switch, Tiles, Disclosure, Button, IconButton, Hint } from './kit.jsx';
import { I } from './icons.jsx';
import { StonePicker, SizeLadder, CutPicker, cutLabel, parseStoneName } from './SparkleTab.jsx';
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

const groupOf = (key) => GALLERY.find((g) => g.items.some((it) => it.key === key))?.title;
const ROWS = 2, COLS = 4;
export function PatternGallery({ value, onPick }) {
	const [cat, setCat] = useState(groupOf(value) ?? GALLERY[0].title), [all, setAll] = useState(false), group = GALLERY.find((g) => g.title === cat), most = ROWS * COLS;
	let shown = group.items;
	if (!all && shown.length > most) {
		// two rows, with what is chosen always among them
		shown = shown.slice(0, most);
		const on = group.items.find((it) => it.key === value);
		if (on && !shown.includes(on)) shown = [...shown.slice(0, most - 1), on];
	}
	return (
		<div class="pattern-gallery">
			<Segmented wrap value={cat} options={GALLERY.map((g) => [g.title, g.title])} onPick={(c) => { setCat(c); setAll(false); }} />
			<div class="gallery-head">
				<span class="field-label"><span>Presets</span></span>
				{group.items.length > most ? <button class="link" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `See all ${group.items.length}`}</button> : null}
			</div>
			<Tiles compact cols={COLS} value={value} items={shown.map((it) => ({ key: it.key, label: it.label, img: thumbOf(it), hint: it.hint ?? it.label }))} onPick={onPick} />
		</div>
	);
}
export const patternLabel = (g) => GALLERY_ITEMS.get(g.params?.preset)?.label ?? LAYOUTS[g.params?.layout]?.label ?? 'Pattern';

// --- a chosen pattern -------------------------------------------------------------------------------

function ParamControl({ spec, P, set, piece }) {
	if (spec.hidden || (spec.when && !spec.when(P))) return null;
	// (its default is what the preset gives it; its end, where it stops doing anything)
	const value = P[spec.k] ?? spec.d, max = spec.maxOf ? Math.max(spec.min + (spec.step ?? 0), Math.min(spec.max, spec.maxOf(P, piece))) : spec.max, def = GALLERY_ITEMS.get(P.preset)?.params?.[spec.k] ?? spec.d;
	if (spec.options) return <Field label={spec.l}><Segmented wrap value={value} options={spec.options} onPick={(v) => set(spec.k, v)} /></Field>;
	return <Field label={spec.l}><Slider value={value} min={spec.min} max={max} step={spec.step} log={spec.log} def={def} format={FORMAT[spec.f]} onChange={(v, g) => set(spec.k, v, g)} /></Field>;
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

export function PatternEditor({ g }) {
	const piece = app.engine?.clothOf(g.on?.panel)?.piece, P = patternParams(g, piece), layout = LAYOUTS[P.layout], focus = patternFocus.value;
	if (!piece) stonesRun.value; // (shown again when its flat shape arrives)
	const set = (patch, gesture) => run({ op: 'stones.set', id: g.id, ...patch, ...(gesture ? { gesture } : {}) });
	const param = (k, v, gesture) => set({ params: { [k]: v } }, gesture);
	const params = (patch, gesture) => set({ params: patch }, gesture);
	const pickPreset = (key) => {
		const it = GALLERY_ITEMS.get(key), renamed = g.name && GALLERY_ITEMS.get(P.preset)?.label !== g.name;
		set({ params: presetPatch({ ...g.params, mods: P.mods }, key, toolOptions.value.stone.size), ...(renamed ? {} : { name: it.label }) });
		patternFocus.value = 'frame';
	};
	const resetArrangement = () => pickPreset(P.preset ?? 'scatter');
	const [cx, cy] = pieceMiddle(piece), x0 = piece?.x0 ?? -0.2, x1 = piece?.x1 ?? 0.2, y0 = piece?.y0 ?? -0.3, y1 = piece?.y1 ?? 0.3, least = Math.max(0.05, minScale(P) / Math.max(P.pscale ?? 1, 1e-3));
	const random = typeof layout.random === 'function' ? layout.random(P) : layout.random;
	return (
		<>
			<Section title="Arrangement" id="pat-arrangement">
				<PatternGallery value={P.preset} onPick={pickPreset} />
				{layout.params.map((spec) => <ParamControl key={spec.k} spec={spec} P={P} set={param} piece={piece} />)}
				<div class="btn-row">
					{random ? <Button icon={<I.shuffle size={18} />} title="A new variation of what is random in this pattern" onClick={() => set({ seed: Math.floor(Math.random() * 1e6) })}>Reshuffle</Button> : null}
					<Button kind="quiet" title="Every setting of the arrangement back to this preset's" onClick={resetArrangement}>Reset to the preset</Button>
				</div>
			</Section>
			<Section title="Crystal" id="pat-crystal">
				<StonePicker stone={g.stone ?? 'Crystal AB'} onPick={(v) => set({ stone: v, palette: null })} />
				<Field label="Size" aside={<span class="field-value">{P.size ?? 'ss12'} · {SS[+String(P.size ?? 'ss12').slice(2)]} mm</span>}><SizeLadder value={P.size ?? 'ss12'} onPick={(v) => param('size', v)} /></Field>
				<Field label="Cut" aside={<span class="field-value">{cutLabel(g.shape ?? 'round')}</span>}><CutPicker value={g.shape ?? 'round'} onPick={(v) => set({ shape: v })} /></Field>
				{(typeof layout.points === 'function' ? layout.points(P) : layout.points) ? null : <Field label="Spacing between crystals"><Slider value={P.gap ?? 1.2} min={1} max={4} step={0.01} def={1.15} format={FORMAT.x} onChange={(v, gs) => param('gap', v, gs)} /></Field>}
				<Field label="Density"><Slider value={P.density ?? 1} min={0} max={1} step={0.01} def={1} format={FORMAT.pct} onChange={(v, gs) => param('density', v, gs)} /></Field>
				{(g.shape ?? 'round') !== 'round' ? <Disclosure label="Which way the crystals point">
					<Field label="Point"><Segmented value={P.turn ?? 'follow'} options={[['follow', 'With the pattern'], ['fixed', 'All one way']]} onPick={(v) => param('turn', v)} /></Field>
					<Field label="Turn each"><Slider value={P.stoneTurn ?? 0} min={-180} max={180} step={1} def={0} format={FORMAT.deg} onChange={(v, gs) => param('stoneTurn', v, gs)} /></Field>
				</Disclosure> : null}
			</Section>
			{layout.flat ? null : (
				<Section title="Place on the piece" id="pat-place" note="Moves the whole pattern and everything on it. Or drag its handles on the body: the middle moves it, the top turns it (Shift for 15° steps), the corner scales it.">
					<div onPointerDown={() => { patternFocus.value = 'frame'; }} class="sec-group">
						<Field label="Across"><Slider value={P.x} min={x0 - 0.05} max={x1 + 0.05} step={0.0005} def={cx} format={(v) => FORMAT.mm(v - cx)} parse={(n) => n / 1000 + cx} onChange={(v, gs) => param('x', v, gs)} /></Field>
						<Field label="Up"><Slider value={P.y} min={y0 - 0.05} max={y1 + 0.05} step={0.0005} def={cy} format={(v) => FORMAT.mm(v - cy)} parse={(n) => n / 1000 + cy} onChange={(v, gs) => param('y', v, gs)} /></Field>
						<Field label="Turn"><Slider value={P.rotate} min={-180} max={180} step={0.5} def={0} format={FORMAT.deg} onChange={(v, gs) => param('rotate', v, gs)} /></Field>
						<Field label="Scale"><Slider value={Math.max(P.scale, least)} min={least} max={6} step={0.01} def={1} log format={FORMAT.x} onChange={(v, gs) => param('scale', v, gs)} /></Field>
					</div>
					<Switch label="Flip it over" value={!!P.flip} onChange={(v) => param('flip', v)} />
					<Switch label="Mirror across the centre of the body" hint="Keeps the wearer's left half of the pattern and mirrors it to the right" value={!!P.symmetric} onChange={(v) => param('symmetric', v)} />
					<Field label="Clear of the piece's edges"><Slider value={P.margin ?? 0} min={0} max={0.05} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => param('margin', v, gs)} /></Field>
				</Section>
			)}
			{layout.flat ? <Section><Field label="Clear of the piece's edges"><Slider value={P.margin ?? 0} min={0} max={0.05} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => param('margin', v, gs)} /></Field></Section> : null}
			<Modifiers g={g} P={P} piece={piece} params={params} focus={focus} />
			{layout.flat ? null : <Section>
				<Disclosure label="Distort: bend the whole arrangement">
					{DISTORT.map((spec) => <ParamControl key={spec.k} spec={spec} P={P} set={param} />)}
				</Disclosure>
			</Section>}
			{layout.flat ? null : <Section>
				<details class="disclosure" onToggle={(e) => { patternFocus.value = e.currentTarget.open ? 'plane' : patternFocus.value === 'plane' ? 'frame' : patternFocus.value; }}>
					<summary><I.chevronRight size={16} class="disc-chev" /><span>Pattern positioning: how the crystals lie under it</span></summary>
					<div class="disc-body">
						<p class="sec-note">Shifts, turns and scales the crystals only: the modifiers stay where they are.</p>
						<Field label="Shift across"><Slider value={P.px} min={-0.2} max={0.2} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => param('px', v, gs)} /></Field>
						<Field label="Shift up"><Slider value={P.py} min={-0.2} max={0.2} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => param('py', v, gs)} /></Field>
						<Field label="Turn"><Slider value={P.pturn} min={-180} max={180} step={0.5} def={0} format={FORMAT.deg} onChange={(v, gs) => param('pturn', v, gs)} /></Field>
						<Field label="Scale"><Slider value={P.pscale} min={0.1} max={6} step={0.01} def={1} log format={FORMAT.x} onChange={(v, gs) => param('pscale', v, gs)} /></Field>
						<Field label="Stretch across"><Slider value={P.sx} min={0.25} max={4} step={0.01} def={1} log format={FORMAT.x} onChange={(v, gs) => param('sx', v, gs)} /></Field>
						<Field label="Stretch up"><Slider value={P.sy} min={0.25} max={4} step={0.01} def={1} log format={FORMAT.x} onChange={(v, gs) => param('sy', v, gs)} /></Field>
						<div class="btn-row"><Button kind="quiet" onClick={() => params(PLANE_DEFAULTS)}>Reset</Button></div>
					</div>
				</details>
			</Section>}
			{piece ? null : <Hint>The piece is still being laid flat; the crystals follow in a moment.</Hint>}
		</>
	);
}

// --- modifiers -------------------------------------------------------------------------------------

const TARGET_ICON = { density: <I.density size={18} />, size: <I.sizes size={18} />, colour: <I.colours size={18} /> };
const shapesFor = (on) => Object.entries(MOD_SHAPES).filter(([k]) => on === 'colour' || k !== 'bysize' || on === 'density').map(([k, v]) => [k, v.label, null, v.hint]);

function Modifiers({ g, P, piece, params, focus }) {
	const mods = P.mods ?? [], [adding, setAdding] = useState(false);
	const setMods = (list, gesture) => params({ mods: list }, gesture);
	const add = (on) => {
		// (as big as the piece, at whatever scale the pattern is now)
		const m = newModifier(on, 'linear', modGeometry('linear', piece, P.scale ?? 1), nextModId(mods));
		setMods([...mods, m]);
		setAdding(false);
		patternFocus.value = m.id;
	};
	return (
		<Section title="Modifiers" aside={mods.length ? <span class="sec-value">{mods.length}</span> : null} note={mods.length ? null : 'Change the density, size or colour of the crystals from place to place. They can be stacked: a linear fade and a radial one on the same thing act together.'}>
			{mods.map((m) => {
				const first = mods.find((x) => x.on === m.on) === m;
				return <ModCard key={m.id} m={m} first={first} active={focus === m.id} P={P} g={g} piece={piece}
					update={(patch, gesture) => setMods(mods.map((x) => (x.id === m.id ? { ...x, ...patch } : x)), gesture)}
					remove={() => { setMods(mods.filter((x) => x.id !== m.id)); if (focus === m.id) patternFocus.value = 'frame'; }}
					pick={() => { patternFocus.value = focus === m.id ? 'frame' : m.id; }} />;
			})}
			{adding ? (
				<div class="mod-add">
					{Object.entries(MOD_TARGETS).map(([k, t]) => <button key={k} class={`mod-add-btn tone-${k}`} title={t.hint} onClick={() => add(k)}>{TARGET_ICON[k]}<span>{t.label}</span></button>)}
				</div>
			) : <div class="btn-row"><Button icon={<I.plus size={18} />} onClick={() => setAdding(true)}>Add modifier</Button></div>}
		</Section>
	);
}

// The size a factor comes to, as it can be bought.
const ssOf = (d) => { const mm = Math.round(realSize(d) * 10000) / 10; for (const [k, v] of Object.entries(SS)) if (v === mm) return 'ss' + k; return ''; };
const titleOf = (m) => `${MOD_TARGETS[m.on]?.label ?? m.on}: ${(MOD_SHAPES[m.shape]?.label ?? m.shape).toLowerCase()}`;

function ModCard({ m, first, active, P, piece, update, remove, pick }) {
	const shape = MOD_SHAPES[m.shape] ?? {}, spatial = isSpatial(m.shape), S = P.scale ?? 1, geo = spatial ? modGeometry(m.shape, piece, S) : {};
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
	return (
		<div class={`mod-card tone-${m.on} ${active ? 'active' : ''} ${m.off ? 'off' : ''}`}>
			<div class="mod-head">
				<button class="mod-title" aria-expanded={active} onClick={pick} title={active ? 'Fold it away' : 'Work on this one: its handles show on the body'}>
					<span class="mod-icon">{TARGET_ICON[m.on]}</span><span class="mod-name">{titleOf(m)}</span>
				</button>
				<IconButton icon={m.off ? <I.eyeOff size={17} /> : <I.eye size={17} />} label={m.off ? 'Switch it on' : 'Switch it off for now'} onClick={() => update({ off: !m.off })} />
				<IconButton icon={<I.trash size={17} />} label="Remove this modifier" kind="danger" onClick={remove} />
			</div>
			{active ? (
				<div class="mod-body">
					<Field label="Shape"><Segmented wrap value={m.shape} options={shapesFor(m.on)} onPick={setShape} /></Field>
					{m.on === 'density' ? <>
						<Field label="At the start"><Slider value={m.from ?? 1} min={0} max={1} step={0.01} def={1} format={FORMAT.pct} onChange={(v, gs) => update({ from: v }, gs)} /></Field>
						<Field label="At the end"><Slider value={m.to ?? 0} min={0} max={1} step={0.01} def={0} format={FORMAT.pct} onChange={(v, gs) => update({ to: v }, gs)} /></Field>
					</> : null}
					{m.on === 'size' ? <>
						<Field label="At the start"><Slider value={m.from ?? 1} min={0.2} max={5} step={0.01} def={1} log format={sizeFormat} parse={(n) => n} onChange={(v, gs) => update({ from: v }, gs)} /></Field>
						<Field label="At the end"><Slider value={m.to ?? 0.5} min={0.2} max={5} step={0.01} def={0.5} log format={sizeFormat} parse={(n) => n} onChange={(v, gs) => update({ to: v }, gs)} /></Field>
					</> : null}
					{m.on === 'colour' ? <ColourStops m={m} base={P} update={update} /> : null}
					{m.shape !== 'family' && m.shape !== 'random' && m.shape !== 'stripes' && m.shape !== 'checks' ? <Field label="Fall-off"><Slider value={m.power ?? 1} min={0.2} max={5} step={0.05} def={1} log format={FORMAT.x} onChange={(v, gs) => update({ power: v }, gs)} /></Field> : null}
					{m.shape !== 'family' && m.shape !== 'random' ? <Switch label="Swap its ends" value={!!m.reverse} onChange={(v) => update({ reverse: v })} /> : null}
					{shape.bounds ? <Switch label="Nothing outside its bounds" hint={m.on === 'density' ? 'No crystals outside it' : 'Crystals outside it are left as they are'} value={!!m.clip} onChange={(v) => update({ clip: v })} /> : null}
					{shape.bounds && m.clip && m.on === 'density' ? <Field label="Soft edge"><Slider value={m.feather ?? 0} min={0} max={0.08} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => update({ feather: v }, gs)} /></Field> : null}
					{m.on === 'colour' && !['family', 'random', 'stripes', 'checks'].includes(m.shape) ? <Field label="Mingling"><Slider value={m.mix ?? 1} min={0} max={1} step={0.01} def={1} format={FORMAT.pct} onChange={(v, gs) => update({ mix: v }, gs)} /></Field> : null}
					{m.shape === 'clouds' ? <div class="btn-row"><Button icon={<I.shuffle size={18} />} onClick={() => update({ seed: Math.floor(Math.random() * 1e6) })}>New clouds</Button></div> : null}
					{!first && m.on !== 'colour' ? <Field label="With the ones before it"><Segmented value={m.blend ?? 'mul'} options={[['mul', 'Multiply'], ['add', 'Add']]} onPick={(v) => update({ blend: v })} /></Field> : null}
					{spatial ? <Disclosure label="Its place and size">
						{shape.cls === 'edge' ? null : <ModPlace m={m} shape={shape} geo={geo} update={update} />}
						{m.shape === 'sweep' && !m.clip ? null : <Field label={sizeWords[0]}><Slider value={m.w ?? geo.w} min={0.005} max={1.2} step={0.0005} def={geo.w} log format={FORMAT.mm} onChange={(v, gs) => update(shape.cls === 'box' || shape.cls === 'round' ? { w: v } : { w: v, h: v }, gs)} /></Field>}
						{sizeWords[1] && (shape.cls !== 'box' || m.clip) ? <Field label={sizeWords[1]}><Slider value={m.h ?? geo.h} min={0.005} max={1.2} step={0.0005} def={geo.h} log format={FORMAT.mm} onChange={(v, gs) => update({ h: v }, gs)} /></Field> : null}
					</Disclosure> : null}
				</div>
			) : null}
		</div>
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
			<Field label={oneWay ? 'Along' : 'Along it'}><Slider value={alongIt} min={-0.4} max={0.4} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => place(v, acrossIt, gs)} /></Field>
			{oneWay ? null : <Field label="Across it"><Slider value={acrossIt} min={-0.4} max={0.4} step={0.0005} def={0} format={FORMAT.mm} onChange={(v, gs) => place(alongIt, v, gs)} /></Field>}
			{shape.turnless || shape.cls === 'ring' ? null : <Field label="Turn"><Slider value={m.a ?? 0} min={-180} max={180} step={0.5} def={geo.a} format={FORMAT.deg} onChange={(v, gs) => update({ a: v }, gs)} /></Field>}
		</>
	);
}

// The colours along a colour modifier. A stop can be the crystal's own colour, whatever that is.
function ColourStops({ m, base, update }) {
	const stops = m.stops ?? [null, 'Sapphire'], [at, setAt] = useState(stops.length - 1), i = Math.min(at, stops.length - 1), stoneOf = (s) => s ?? base.stone ?? 'Crystal AB';
	const pick = (v) => update({ stops: stops.map((s, k) => (k === i ? v : s)) });
	const add = () => { update({ stops: [...stops, stops[stops.length - 1] ?? 'Ruby'] }); setAt(stops.length); };
	const removeStop = () => { if (stops.length > 2) { update({ stops: stops.filter((_, k) => k !== i) }); setAt(0); } };
	const parse = parseStoneName;
	return (
		<>
			<Field label="Colours" aside={<span class="field-value">{stops[i] ?? "The crystal's own"}</span>}>
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
			{stops[i] !== null ? <div class="btn-row"><Button kind="quiet" size="small" onClick={() => update({ stops: stops.map((s, k) => (k === i ? null : s)) })}>Use the crystal's own colour here</Button></div> : null}
		</>
	);
}
