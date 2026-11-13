// The Sparkle card: crystals and lettering. Across its top, the five things a click on the leotard can do here (lay a
// pattern on a piece, rows along a line or a fill of a piece, single crystals, the eraser, lettering); each is a mode
// of the click, and the one that is on brings its own face (the pattern gallery, the rows' settings, the eraser's
// size). The crystal they place is picked on the Crystal face by colour (gem dots), coating, size (drawn to scale)
// and cut. On design lists the crystal groups and lettering already there; Counts, the crystals by size and colour.
// A chosen group or logo has a card of its own (GroupCard, LetteringCard); a pattern's is ui/PatternCard.jsx.
import { useEffect } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection, tool, tab } from './state.js';
import { toolOptions } from './tools.js';
import { run, Card, Field, Segmented, Swatches, Slider, Switch, Stepper, Button, IconButton, PartRow, Hint, showFacet } from './kit.jsx';
import { I } from './icons.jsx';
import { PALETTE } from './PieceCard.jsx';
import { COLOURS, SHAPES, SS } from '../stones/library.js';
import { PatternGallery, patternLabel } from './PatternCard.jsx';
import { madeAs } from '../prints/designs.js';

const METALS = new Set(['Gold', 'Silver', 'Rose Gold', 'Hematite']);
const SIZES = Object.keys(SS).map(Number);
const parse = (name = 'Crystal') => { const ab = / AB$/.test(name); return { base: ab ? name.slice(0, -3) : name, ab }; };
export const parseStoneName = parse;
const join = (base, ab) => (ab && !METALS.has(base) ? base + ' AB' : base);
const mm1 = (v) => (v * 1000).toFixed(1) + ' mm';
const toSparkle = () => { tool.value = 'move'; selection.value = null; tab.value = 'sparkle'; };

// --- placing crystals -------------------------------------------------------------------------------

const MODES = [
	['pattern', 'Pattern', <I.fill size={21} />, 'Pick a pattern, then click a piece to lay it on; its handles and settings stay live (F)'],
	['stones', 'Rows / fill', <I.rows size={21} />, 'Click a line for rows of crystals along it, or a piece to fill it (G)'],
	['single', 'Single', <I.gem size={21} />, 'Click to place one crystal at a time (1)'],
	['erase', 'Eraser', <I.eraser size={21} />, 'Click to erase the crystals there; the groups stay live (D)'],
	['decal', 'Lettering', <I.text size={21} />, 'Lettering or a logo: set it up, then click the leotard to place it (L)'],
];
// the face a tool brings with it
const TOOL_FACE = { pattern: ['tool', 'Pattern'], stones: ['tool', 'Rows & fills'], erase: ['tool', 'Eraser'] };

export function SparkleCard() {
	rev.value;
	const doc = app.doc, t = tool.value, o = toolOptions.value, st = o.stone, set = (patch) => { toolOptions.value = { ...toolOptions.value, stone: { ...st, ...patch } }; };
	const any = doc.stones.length || doc.placed.length || doc.decals.length;
	// a tool that is put on shows its own face (or, with none of its own, the crystal it places)
	useEffect(() => { if (TOOL_FACE[t]) showFacet('sparkle', 'tool'); else if (t === 'single') showFacet('sparkle', 'crystal'); }, [t]);
	const faces = [...(TOOL_FACE[t] ? [TOOL_FACE[t]] : []), ...(t === 'erase' ? [] : [['crystal', 'Crystal']]), ...(any ? [['on', 'On design'], ['counts', 'Counts']] : [])];
	return (
		<Card kind="sparkle" title="Sparkle" faces={faces}
			lead={<div class="modes card-lead">
				{MODES.map(([id, label, icon, hint]) => <button key={id} class={`mode ${t === id ? 'on' : ''}`} title={hint} aria-pressed={t === id} onClick={() => { tool.value = t === id ? 'move' : id; }}>{icon}<span>{label}</span></button>)}
			</div>}>
			{(face) => face === 'tool' && t === 'pattern' ? <PatternGallery value={o.pattern} onPick={(v) => { toolOptions.value = { ...toolOptions.value, pattern: v }; }} />
				: face === 'tool' && t === 'stones' ? <>
					<Stepper label="Rows" value={st.rows} min={1} max={6} onChange={(v) => set({ rows: v })} />
					<Slider label="Distance from the line" value={st.offset} min={-0.03} max={0.03} step={0.0005} format={mm1} onChange={(v) => set({ offset: v })} />
					<Slider label="Spacing" value={st.gap} min={1} max={3} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v) => set({ gap: v })} />
					<Field label="A piece fills with"><Segmented value={st.fill} options={[['random', 'Random pavé'], ['contour', 'Rings along the edge']]} onPick={(v) => set({ fill: v })} /></Field>
				</> : face === 'tool' ? <>
					<Slider label="Eraser size" value={st.eraseR} min={0.002} max={0.03} step={0.001} format={mm1} onChange={(v) => set({ eraseR: v })} />
					<Hint>Click or drag over crystals to take them away. The groups stay live, so their settings still work.</Hint>
				</> : face === 'on' ? <OnDesign doc={doc} /> : face === 'counts' ? <Counts />
					: <CrystalPicker stone={st.stone} size={st.size} shape={st.shape} onStone={(v) => set({ stone: v })} onSize={(v) => set({ size: v })} onShape={(v) => set({ shape: v })} />}
		</Card>
	);
}

// A crystal: its colour and coating, its size and its cut.
export function CrystalPicker({ stone, size, shape, onStone, onSize, onShape }) {
	return (
		<>
			<StonePicker stone={stone} onPick={onStone} />
			{size ? <Field label="Size" aside={`${size} · ${SS[+String(size).slice(2)]} mm`}><SizeLadder value={size} onPick={onSize} /></Field> : null}
			<Field label="Cut" aside={cutLabel(shape)}><CutPicker value={shape} onPick={onShape} /></Field>
		</>
	);
}

// A crystal's colour (gem dots, in the library's order) and its AB coating.
export function StonePicker({ stone, onPick }) {
	const { base, ab } = parse(stone), metal = METALS.has(base);
	return (
		<Field label="Colour" aside={<span class="seg-row"><span>{base}</span>
			<label class="switch-row bare" title="AB coating: rainbow facets"><span class="switch-label">AB</span><span class={`switch ${ab && !metal ? 'on' : ''}`}><input type="checkbox" checked={ab && !metal} disabled={metal} onChange={(e) => onPick(join(base, e.currentTarget.checked))} /><span class="switch-knob" /></span></label></span>}>
			<div class="gems">
				{Object.entries(COLOURS).map(([name, hex]) => (
					<button key={name} class={`gem ${name === base ? 'on' : ''} ${METALS.has(name) ? 'metal' : ''} ${ab && !METALS.has(name) ? 'ab' : ''}`} style={{ '--c': hex }} title={join(name, ab)} aria-label={name} onClick={() => onPick(join(name, ab))} />
				))}
			</div>
		</Field>
	);
}

// Sizes as discs drawn to scale (ss3 1.4 mm ... ss48 11.1 mm).
export function SizeLadder({ value, onPick }) {
	return (
		<div class="sizes">
			{SIZES.map((k) => {
				const d = Math.max(3.5, SS[k] * 2.4);
				return (
					<button key={k} class={`size ${'ss' + k === value ? 'on' : ''}`} title={`ss${k}: ${SS[k]} mm`} onClick={() => onPick('ss' + k)}>
						<span class="size-disc" style={{ width: d + 'px', height: d + 'px' }} /><span class="size-name">{k}</span>
					</button>
				);
			})}
		</div>
	);
}

// The cuts (stones/library.js SHAPES), each drawn as its outline.
const CUT_PATHS = {
	round: <><circle cx="12" cy="12" r="7.5" /><path d="M12 6.5 15.9 8.1 17.5 12l-1.6 3.9L12 17.5l-3.9-1.6L6.5 12l1.6-3.9z" opacity=".55" /></>,
	rivoli: <><circle cx="12" cy="12" r="7.5" /><path d="m12 4.5 1.8 5.7L19.5 12l-5.7 1.8L12 19.5l-1.8-5.7L4.5 12l5.7-1.8z" opacity=".55" /></>,
	oval: <><ellipse cx="12" cy="12" rx="5.4" ry="7.8" /><ellipse cx="12" cy="12" rx="2.6" ry="4.2" opacity=".55" /></>,
	navette: <><path d="M12 3.5c4.2 3.6 4.2 13.4 0 17-4.2-3.6-4.2-13.4 0-17z" /><path d="M12 7.5v9" opacity=".55" /></>,
	pear: <><path d="M12 3.8c2.4 3 5.6 7 5.6 10.2a5.6 5.6 0 0 1-11.2 0c0-3.2 3.2-7.2 5.6-10.2z" /><path d="M12 9v6" opacity=".55" /></>,
	drop: <><path d="M12 3c2 3.6 4.6 8.4 4.6 11.6a4.6 4.6 0 0 1-9.2 0C7.4 11.4 10 6.6 12 3z" /><path d="M12 8.5v6.5" opacity=".55" /></>,
	heart: <path d="M12 19.2S4.6 14.7 4.6 9.6A3.7 3.7 0 0 1 12 8.1a3.7 3.7 0 0 1 7.4 1.5c0 5.1-7.4 9.6-7.4 9.6z" />,
	square: <><rect x="5" y="5" width="14" height="14" rx="1.6" /><rect x="9" y="9" width="6" height="6" opacity=".55" /></>,
	baguette: <><rect x="8" y="3.5" width="8" height="17" rx="1" /><rect x="10.5" y="7" width="3" height="10" opacity=".55" /></>,
	triangle: <><path d="M12 4.5 19.5 18h-15z" /><path d="m12 9.5 3 5.5H9z" opacity=".55" /></>,
	star: <path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />,
	pearl: <><circle cx="12" cy="12" r="7" /><circle cx="9.6" cy="9.4" r="1.6" opacity=".55" /></>,
	spangle: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="1.5" /></>,
	'holo-dot': <><circle cx="12" cy="12" r="6.5" /><path d="M7.5 12h9M12 7.5v9" opacity=".45" /></>,
	nailhead: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="4" opacity=".55" /></>,
};
const CUT_LABELS = { 'holo-dot': 'Holo dot', nailhead: 'Nailhead' };
export const cutLabel = (k) => CUT_LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1);
export function CutPicker({ value, onPick }) {
	return (
		<div class="cuts">
			{Object.keys(SHAPES).map((k) => (
				<button key={k} class={`cut ${k === value ? 'on' : ''}`} title={cutLabel(k)} aria-label={cutLabel(k)} onClick={() => onPick(k)}>
					<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">{CUT_PATHS[k] ?? <circle cx="12" cy="12" r="7" />}</svg>
				</button>
			))}
		</div>
	);
}

// --- what is on the design --------------------------------------------------------------------------

const groupLabel = (g) => g.name || (g.kind === 'pattern' ? patternLabel(g) : KINDS[g.kind] || g.kind);
const KINDS = { pattern: 'Pattern', row: 'Rows along a line', fill: 'Fill', scatter: 'Scatter', rays: 'Rays', motif: 'Motif', lattice: 'Lattice', cluster: 'Cluster', fringe: 'Fringe', lettering: 'Crystal lettering' };
function OnDesign({ doc }) {
	rev.value; // (the record it shows is edited in place: without this it would redraw only for a changed prop, ui/state.js rev)
	if (!app.engine || doc.legacy) return null;
	const sel = selection.value, laid = app.engine.stoneRun;
	const count = (g) => laid.countOf?.(g.id) ?? laid.stones.filter((x) => x.gen === g.id).length;
	return (
		<div class="part-list tall">
			{doc.stones.map((g) => <PartRow key={g.id} icon={g.kind === 'pattern' && madeAs(g.params) !== 'stones' ? <I.fill size={18} /> : <I.rows size={18} />} label={groupLabel(g)} meta={g.kind === 'pattern' && madeAs(g.params) === 'print' ? 'Print' : count(g).toLocaleString() + (g.kind === 'pattern' && madeAs(g.params) === 'both' ? ' · print' : '')} on={sel?.id === g.id} onClick={() => { selection.value = { kind: 'stones', id: g.id }; }} />)}
			{doc.placed.length ? <PartRow icon={<I.gem size={18} />} label="Single crystals" meta={doc.placed.length.toLocaleString()} /> : null}
			{doc.decals.map((x) => <PartRow key={x.id} icon={<I.text size={18} />} label={x.name || x.text?.split('\n')[0] || 'Logo'} meta={LOOKS.find(([k]) => k === (x.look ?? 'print'))?.[1]} on={sel?.id === x.id} onClick={() => { selection.value = { kind: 'decals', id: x.id }; }} />)}
		</div>
	);
}

// The crystals to order: how many of each size and of each colour.
function Counts() {
	rev.value;
	if (!app.engine || app.doc.legacy) return null;
	const s = app.stoneStats();
	return (
		<>
			<Field label="By size" aside={`${s.total.toLocaleString()} crystals`}>
				<div class="counts">{Object.entries(s.bySize).sort((a, b) => a[0] - b[0]).map(([d, n]) => <div key={d} class="count-row"><span>{d} mm</span><span>{n.toLocaleString()}</span></div>)}</div>
			</Field>
			<Field label="By colour">
				<div class="counts">{Object.entries(s.byStone).map(([c, n]) => <div key={c} class="count-row"><span>{c}</span><span>{n.toLocaleString()}</span></div>)}</div>
			</Field>
			{s.errors.length ? <Hint>Problems: {s.errors.join('; ')}</Hint> : null}
		</>
	);
}

// --- a selected crystal group (rows, a fill; a pattern's card is ui/PatternCard.jsx) ----------------------

export function GroupCard({ id }) {
	rev.value;
	const doc = app.doc, g = doc.stones.find((x) => x.id === id);
	if (!g) return <Card kind="gone" title="These crystals no longer exist" onBack={toSparkle} backLabel="Sparkle">{() => null}</Card>;
	// (the engine's laid stones: not called `run`, which would hide kit's run() that every button below edits with)
	const laid = app.engine?.stoneRun, count = laid ? laid.countOf?.(g.id) ?? laid.stones.filter((s) => s.gen === g.id).length : 0, p = g.params ?? {};
	const set = (patch, gesture) => run({ op: 'stones.set', id: g.id, ...patch, ...(gesture ? { gesture } : {}) });
	const param = (k, v, gesture) => set({ params: { [k]: v } }, gesture);
	const known = new Set(['size', 'rows', 'offset', 'gap', 'pattern']);
	return (
		<Card kind="group" title={g.name ?? ''} placeholder={groupLabel(g)} onRename={(v) => set({ name: v })} onBack={toSparkle} backLabel="Sparkle"
			note={`${count.toLocaleString()} crystals · ${KINDS[g.kind] ?? g.kind}`}
			actions={<>
				<IconButton icon={<I.release size={18} />} label="Release: freeze into single crystals" onClick={() => { run({ op: 'stones.release', id: g.id }); selection.value = null; }} />
				<IconButton icon={<I.trash size={18} />} label="Delete these crystals" kind="danger" onClick={() => { run({ op: 'stones.remove', id: g.id }); selection.value = null; }} />
			</>}
			faces={[['crystal', 'Crystal'], ['layout', 'Layout']]}>
			{(face) => face === 'crystal'
				? <CrystalPicker stone={g.stone ?? 'Crystal AB'} size={typeof p.size === 'string' ? p.size : null} shape={g.shape ?? 'round'} onStone={(v) => set({ stone: v, palette: null })} onSize={(v) => param('size', v)} onShape={(v) => set({ shape: v })} />
				: <>
					{typeof p.rows === 'number' ? <Stepper label="Rows" value={p.rows} min={1} max={6} onChange={(v) => param('rows', v)} /> : null}
					{typeof p.offset === 'number' ? <Slider label="Distance from the line" value={p.offset} min={-0.03} max={0.03} step={0.0005} format={mm1} onChange={(v, gs) => param('offset', v, gs)} /> : null}
					{typeof p.gap === 'number' ? <Slider label="Spacing" value={p.gap} min={1} max={3} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v, gs) => param('gap', v, gs)} /> : null}
					{p.pattern === 'random' || p.pattern === 'contour' ? <Field label="Fill"><Segmented value={p.pattern} options={[['random', 'Random pavé'], ['contour', 'Rings along the edge']]} onPick={(v) => param('pattern', v)} /></Field> : null}
					<div class="btn-row"><Button icon={<I.shuffle size={18} />} title="A new random layout" onClick={() => set({ seed: Math.floor(Math.random() * 1e6) })}>Reshuffle</Button></div>
					{Object.entries(p).filter(([k]) => !known.has(k)).map(([k, v]) => <ParamField key={k} k={k} v={v} onSet={(x) => param(k, x)} />)}
				</>}
		</Card>
	);
}

// A generator's other parameters as text: numbers, words, or JSON for lists and objects.
function ParamField({ k, v, onSet }) {
	const label = k.replace(/([A-Z])/g, ' $1').toLowerCase();
	if (typeof v === 'number') return <Field label={label}><input class="text-in num" type="number" step="any" value={v} onChange={(e) => onSet(Number(e.currentTarget.value))} /></Field>;
	if (typeof v === 'string' || typeof v === 'boolean') return <Field label={label}><input class="text-in" type="text" value={String(v)} onChange={(e) => onSet(e.currentTarget.value)} /></Field>;
	return <Field label={label}><input class="text-in mono" type="text" value={JSON.stringify(v)} onChange={(e) => { try { onSet(JSON.parse(e.currentTarget.value)); } catch { /* keep typing */ } }} /></Field>;
}

// --- logos and lettering --------------------------------------------------------------------------

export const LOOKS = [['print', 'Print'], ['foil', 'Foil'], ['holo', 'Holo foil'], ['glitter', 'Glitter'], ['flock', 'Flock'], ['gather', 'Gathers'], ['ruche', 'Ruching'], ['twist', 'Twist knot']];
// Script and display faces installed on Windows; any CSS font name works (falls back to cursive).
export const FONTS = ['Segoe Script', 'Brush Script MT', 'Lucida Handwriting', 'Ink Free', 'Gabriola', 'Monotype Corsiva', 'Georgia', 'Arial Black', 'Impact', 'Segoe UI'];
const mm = (v) => (v * 1000).toFixed(0) + ' mm';

// Lettering or a logo: one placed on the leotard (id), or the next one the lettering tool places (no id; its
// settings are the tool's, ui/tools.js toolOptions.decal).
export function LetteringCard({ id }) {
	rev.value;
	const doc = app.doc, o = toolOptions.value, placed = id ? doc.decals.find((x) => x.id === id) : null, d = id ? placed : o.decal;
	if (!d) return <Card kind="gone" title="This lettering no longer exists" onBack={toSparkle} backLabel="Sparkle">{() => null}</Card>;
	const set = id ? (patch, gesture) => run({ op: 'decal.set', id, ...patch, ...(gesture ? { gesture } : {}) }) : (patch) => { toolOptions.value = { ...toolOptions.value, decal: { ...toolOptions.value.decal, ...patch } }; };
	const moving = tool.value === 'decal' && o.moveDecal === id;
	return (
		<Card kind="lettering" title={id ? d.name ?? '' : 'New lettering'} placeholder={d.text?.split('\n')[0] || 'Logo'} onRename={id ? (v) => set({ name: v }) : null} onBack={toSparkle} backLabel="Sparkle"
			note={id ? null : 'Set it up, then tap the leotard where its centre goes.'}
			actions={id ? <IconButton icon={<I.trash size={18} />} label="Delete this lettering" kind="danger" onClick={() => { run({ op: 'decal.remove', id }); selection.value = null; }} /> : null}
			faces={[['text', 'Text'], ['look', 'Look'], ['place', 'Size']]}>
			{(face) => face === 'text' ? <>
				<textarea class="text-in" rows={2} aria-label="Text" value={d.text ?? ''} placeholder="Lettering (or use an image, under Size)" onChange={(e) => set({ text: e.currentTarget.value })} />
				<div class="fonts">
					{FONTS.map((f) => <button key={f} class={`font ${(d.font ?? 'Segoe Script') === f ? 'on' : ''}`} style={{ fontFamily: `'${f}', cursive` }} title={f} onClick={() => set({ font: f })}>{(d.text || 'Aa').split('\n')[0].slice(0, 12) || 'Aa'}</button>)}
				</div>
				<Switch label="Bold" value={(d.weight ?? 'normal') === 'bold'} onChange={(v) => set({ weight: v ? 'bold' : 'normal' })} />
			</> : face === 'look' ? <>
				<Field label="Made of"><Segmented cols={4} value={d.look ?? 'print'} options={LOOKS} onPick={(v) => set({ look: v })} /></Field>
				<Field label="Colour"><Swatches value={d.colour ?? '#ffffff'} colours={PALETTE} onPick={(c, g) => set({ colour: c }, g)} /></Field>
			</> : <>
				<Slider label="Width" value={d.size ?? 0.08} min={0.01} max={0.4} step={0.001} format={mm} onChange={(v, g) => set({ size: v }, g)} />
				<Slider label="Turn" value={d.rotate ?? 0} min={-180} max={180} step={1} format={(v) => v.toFixed(0) + '°'} onChange={(v, g) => set({ rotate: v }, g)} />
				<Field label="An image instead of text"><input class="text-in" type="text" value={d.src ?? ''} placeholder="/references/logo.png" onChange={(e) => set({ src: e.currentTarget.value || null })} /></Field>
				{id ? <div class="btn-row"><Button icon={<I.pointer size={18} />} active={moving} title="Then click the leotard where its centre goes" onClick={() => { toolOptions.value = { ...toolOptions.value, moveDecal: id }; tool.value = 'decal'; }}>Move it</Button></div> : null}
			</>}
		</Card>
	);
}
