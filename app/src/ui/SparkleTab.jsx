// The Sparkle tab: crystals and lettering. Four ways to place crystals (a pattern laid on a piece,
// rows along a line or a fill of a piece, single crystals, the eraser) are modes of a click on the
// model; the crystal they place is picked here by colour (gem dots), coating, size (drawn to scale)
// and cut. Below: the crystal groups on the design and their counts, and logos and lettering. A
// selected group or logo gets its own page; a pattern's is ui/PatternPanel.jsx.
import { app } from '../instance.js';
import { rev, selection, tool } from './state.js';
import { toolOptions } from './tools.js';
import { run, Section, Field, Segmented, Swatches, Slider, Switch, Stepper, Disclosure, Button, IconButton, PartHeader, PartRow, Hint } from './kit.jsx';
import { I } from './icons.jsx';
import { PALETTE } from './FabricTab.jsx';
import { COLOURS, SHAPES, SS } from '../stones/library.js';
import { PatternGallery, PatternEditor, patternLabel } from './PatternPanel.jsx';

const METALS = new Set(['Gold', 'Silver', 'Rose Gold', 'Hematite']);
const SIZES = Object.keys(SS).map(Number);
const parse = (name = 'Crystal') => { const ab = / AB$/.test(name); return { base: ab ? name.slice(0, -3) : name, ab }; };
export const parseStoneName = parse;
const join = (base, ab) => (ab && !METALS.has(base) ? base + ' AB' : base);
const mm1 = (v) => (v * 1000).toFixed(1) + ' mm';

export function SparkleTab() {
	rev.value;
	const sel = selection.value, doc = app.doc;
	if (sel?.kind === 'stones') return <GroupEditor key={sel.id} id={sel.id} doc={doc} />;
	if (sel?.kind === 'decals') return <DecalEditor key={sel.id} id={sel.id} doc={doc} />;
	return <><Crystals /><OnDesign doc={doc} /><Lettering doc={doc} /></>;
}

// --- placing crystals -------------------------------------------------------------------------------

const MODES = [
	['pattern', 'Patterns', <I.fill size={22} />, 'Pick a pattern, then click a piece to lay it on; its handles and settings stay live (F)'],
	['stones', 'Rows & fills', <I.rows size={22} />, 'Click a line for rows of crystals along it, or a piece to fill it (G)'],
	['single', 'Single', <I.gem size={22} />, 'Click to place one crystal at a time (1)'],
	['erase', 'Eraser', <I.eraser size={22} />, 'Click to erase the crystals there; the groups stay live (D)'],
];
function Crystals() {
	const t = tool.value, o = toolOptions.value, st = o.stone, set = (patch) => { toolOptions.value = { ...o, stone: { ...st, ...patch } }; };
	const placing = t === 'stones' || t === 'single';
	return (
		<Section title="Crystals">
			<div class="modes">
				{MODES.map(([id, label, icon, hint]) => (
					<button key={id} class={`mode ${t === id ? 'on' : ''}`} title={hint} aria-pressed={t === id} onClick={() => { tool.value = t === id ? 'move' : id; }}>
						{icon}<span>{label}</span>
					</button>
				))}
			</div>
			{t === 'pattern' ? <PatternGallery value={o.pattern} onPick={(v) => { toolOptions.value = { ...toolOptions.value, pattern: v }; }} /> : null}
			{t === 'erase' ? (
				<Field label="Eraser size"><Slider value={st.eraseR} min={0.002} max={0.03} step={0.001} format={mm1} onChange={(v) => set({ eraseR: v })} /></Field>
			) : <>
				<StonePicker stone={st.stone} onPick={(v) => set({ stone: v })} />
				<Field label="Size" aside={<span class="field-value">{st.size} · {SS[+st.size.slice(2)]} mm</span>}><SizeLadder value={st.size} onPick={(v) => set({ size: v })} /></Field>
				<Field label="Cut" aside={<span class="field-value">{cutLabel(st.shape)}</span>}><CutPicker value={st.shape} onPick={(v) => set({ shape: v })} /></Field>
				{t === 'stones' || !placing ? <Disclosure label="Rows and fills" open={t === 'stones'}>
					<Field label="Rows" inline><Stepper value={st.rows} min={1} max={6} onChange={(v) => set({ rows: v })} /></Field>
					<Field label="Distance from the line"><Slider value={st.offset} min={-0.03} max={0.03} step={0.0005} format={mm1} onChange={(v) => set({ offset: v })} /></Field>
					<Field label="Spacing"><Slider value={st.gap} min={1} max={3} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v) => set({ gap: v })} /></Field>
					<Field label="A piece fills with"><Segmented value={st.fill} options={[['random', 'Random pavé'], ['contour', 'Rings along the edge']]} onPick={(v) => set({ fill: v })} /></Field>
				</Disclosure> : null}
			</>}
		</Section>
	);
}

// A crystal's colour (gem dots, in the library's order) and its AB coating.
export function StonePicker({ stone, onPick }) {
	const { base, ab } = parse(stone);
	return (
		<>
			<Field label="Colour" aside={<span class="field-value">{stone}</span>}>
				<div class="gems">
					{Object.entries(COLOURS).map(([name, hex]) => (
						<button key={name} class={`gem ${name === base ? 'on' : ''} ${METALS.has(name) ? 'metal' : ''} ${ab && !METALS.has(name) ? 'ab' : ''}`} style={{ '--c': hex }} title={join(name, ab)} aria-label={name} onClick={() => onPick(join(name, ab))} />
					))}
				</div>
			</Field>
			<Switch label="AB coating (rainbow facets)" value={ab && !METALS.has(base)} onChange={(v) => onPick(join(base, v))} />
		</>
	);
}

// Sizes as discs drawn to scale (ss3 1.4 mm ... ss48 11.1 mm).
export function SizeLadder({ value, onPick }) {
	return (
		<div class="sizes">
			{SIZES.map((k) => {
				const d = Math.max(4, SS[k] * 2.9);
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
					<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">{CUT_PATHS[k] ?? <circle cx="12" cy="12" r="7" />}</svg>
				</button>
			))}
		</div>
	);
}

// --- what is on the design --------------------------------------------------------------------------

const groupLabel = (g) => g.name || (g.kind === 'pattern' ? patternLabel(g) : KINDS[g.kind] || g.kind);
const KINDS = { pattern: 'Pattern', row: 'Rows along a line', fill: 'Fill', scatter: 'Scatter', rays: 'Rays', motif: 'Motif', lattice: 'Lattice', cluster: 'Cluster', fringe: 'Fringe', lettering: 'Crystal lettering' };
function OnDesign({ doc }) {
	rev.value;
	if (!app.engine || doc.legacy) return null;
	const s = app.stoneStats(), sel = selection.value;
	const count = (g) => app.engine.stoneRun.countOf?.(g.id) ?? app.engine.stoneRun.stones.filter((x) => x.gen === g.id).length;
	if (!doc.stones.length && !doc.placed.length) return null;
	return (
		<Section title="On this design" aside={<span class="sec-value">{s.total.toLocaleString()} crystals</span>} id="sparkle-on">
			<div class="part-list">
				{doc.stones.map((g) => <PartRow key={g.id} icon={<I.rows size={18} />} label={groupLabel(g)} meta={count(g).toLocaleString()} on={sel?.id === g.id} onClick={() => { selection.value = { kind: 'stones', id: g.id }; }} />)}
				{doc.placed.length ? <div class="part-row static"><span class="part-icon"><I.gem size={18} /></span><span class="part-label">Single crystals</span><span class="part-meta">{doc.placed.length.toLocaleString()}</span></div> : null}
			</div>
			<Disclosure label="Counts by size and colour">
				<div class="counts">
					{Object.entries(s.bySize).sort((a, b) => a[0] - b[0]).map(([d, n]) => <div key={d} class="count-row"><span>{d} mm</span><span>{n.toLocaleString()}</span></div>)}
					<div class="count-gap" />
					{Object.entries(s.byStone).map(([c, n]) => <div key={c} class="count-row"><span>{c}</span><span>{n.toLocaleString()}</span></div>)}
				</div>
				{s.errors.length ? <Hint>Problems: {s.errors.join('; ')}</Hint> : null}
			</Disclosure>
		</Section>
	);
}

// --- a selected crystal group ----------------------------------------------------------------------

function GroupEditor({ id, doc }) {
	const g = doc.stones.find((x) => x.id === id), back = () => { selection.value = null; };
	if (!g) return <PartHeader back="Sparkle" onBack={back} title="These crystals no longer exist" />;
	const run = app.engine?.stoneRun, count = run ? run.countOf?.(g.id) ?? run.stones.filter((s) => s.gen === g.id).length : 0, p = g.params ?? {};
	const set = (patch, gesture) => run({ op: 'stones.set', id: g.id, ...patch, ...(gesture ? { gesture } : {}) });
	const param = (k, v, gesture) => set({ params: { [k]: v } }, gesture);
	const known = new Set(['size', 'rows', 'offset', 'gap', 'pattern']);
	return (
		<>
			<PartHeader back="Sparkle" onBack={back} title={g.name ?? ''} placeholder={groupLabel(g)} onRename={(v) => set({ name: v })}
				actions={<>
					<IconButton icon={<I.release size={18} />} label="Release: freeze into single crystals" onClick={() => { run({ op: 'stones.release', id: g.id }); selection.value = null; }} />
					<IconButton icon={<I.trash size={18} />} label="Delete these crystals" kind="danger" onClick={() => { run({ op: 'stones.remove', id: g.id }); selection.value = null; }} />
				</>} />
			{g.kind === 'pattern' ? <PatternEditor key={g.id} g={g} /> : <>
			<Section aside={<span class="sec-value">{count.toLocaleString()} crystals · {KINDS[g.kind] ?? g.kind}</span>} title="Crystal">
				<StonePicker stone={g.stone ?? 'Crystal AB'} onPick={(v) => set({ stone: v, palette: null })} />
				{typeof p.size === 'string' ? <Field label="Size" aside={<span class="field-value">{p.size}</span>}><SizeLadder value={p.size} onPick={(v) => param('size', v)} /></Field> : null}
				<Field label="Cut" aside={<span class="field-value">{cutLabel(g.shape ?? 'round')}</span>}><CutPicker value={g.shape ?? 'round'} onPick={(v) => set({ shape: v })} /></Field>
			</Section>
			<Section title="Layout">
				{typeof p.rows === 'number' ? <Field label="Rows" inline><Stepper value={p.rows} min={1} max={6} onChange={(v) => param('rows', v)} /></Field> : null}
				{typeof p.offset === 'number' ? <Field label="Distance from the line"><Slider value={p.offset} min={-0.03} max={0.03} step={0.0005} format={mm1} onChange={(v, gs) => param('offset', v, gs)} /></Field> : null}
				{typeof p.gap === 'number' ? <Field label="Spacing"><Slider value={p.gap} min={1} max={3} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v, gs) => param('gap', v, gs)} /></Field> : null}
				{p.pattern === 'random' || p.pattern === 'contour' ? <Field label="Fill"><Segmented value={p.pattern} options={[['random', 'Random pavé'], ['contour', 'Rings along the edge']]} onPick={(v) => param('pattern', v)} /></Field> : null}
				<div class="btn-row"><Button icon={<I.shuffle size={18} />} title="A new random layout" onClick={() => set({ seed: Math.floor(Math.random() * 1e6) })}>Reshuffle</Button></div>
				{Object.keys(p).some((k) => !known.has(k)) ? <Disclosure label="Advanced">
					{Object.entries(p).filter(([k]) => !known.has(k)).map(([k, v]) => <ParamField key={k} k={k} v={v} onSet={(x) => param(k, x)} />)}
				</Disclosure> : null}
			</Section>
			</>}
		</>
	);
}

// A generator's other parameters as text: numbers, words, or JSON for lists and objects.
function ParamField({ k, v, onSet }) {
	const label = k.replace(/([A-Z])/g, ' $1').toLowerCase();
	if (typeof v === 'number') return <Field label={label} inline><input class="text-in num" type="number" step="any" value={v} onChange={(e) => onSet(Number(e.currentTarget.value))} /></Field>;
	if (typeof v === 'string' || typeof v === 'boolean') return <Field label={label} inline><input class="text-in" type="text" value={String(v)} onChange={(e) => onSet(e.currentTarget.value)} /></Field>;
	return <Field label={label}><input class="text-in mono" type="text" value={JSON.stringify(v)} onChange={(e) => { try { onSet(JSON.parse(e.currentTarget.value)); } catch { /* keep typing */ } }} /></Field>;
}

// --- logos and lettering --------------------------------------------------------------------------

export const LOOKS = [['print', 'Print'], ['foil', 'Foil'], ['holo', 'Holo foil'], ['glitter', 'Glitter'], ['flock', 'Flock'], ['gather', 'Gathers'], ['ruche', 'Ruching'], ['twist', 'Twist knot']];
// Script and display faces installed on Windows; any CSS font name works (falls back to cursive).
export const FONTS = ['Segoe Script', 'Brush Script MT', 'Lucida Handwriting', 'Ink Free', 'Gabriola', 'Monotype Corsiva', 'Georgia', 'Arial Black', 'Impact', 'Segoe UI'];
const mm = (v) => (v * 1000).toFixed(0) + ' mm';

function Lettering({ doc }) {
	rev.value;
	const t = tool.value, sel = selection.value, o = toolOptions.value, d = o.decal;
	const set = (patch) => { toolOptions.value = { ...o, decal: { ...d, ...patch } }; };
	return (
		<Section title="Lettering and logos" id="sparkle-text">
			<div class="btn-row"><Button icon={<I.text size={18} />} active={t === 'decal'} onClick={() => { tool.value = t === 'decal' ? 'move' : 'decal'; }}>{t === 'decal' ? 'Click the leotard to place it' : 'Place lettering'}</Button></div>
			{t === 'decal' ? <div class="tool-opts"><DecalFields d={d} set={set} /></div> : null}
			{doc.decals.length ? (
				<div class="part-list">
					{doc.decals.map((x) => <PartRow key={x.id} icon={<I.text size={18} />} label={x.name || x.text?.split('\n')[0] || 'Logo'} meta={LOOKS.find(([k]) => k === (x.look ?? 'print'))?.[1]} on={sel?.id === x.id} onClick={() => { selection.value = { kind: 'decals', id: x.id }; }} />)}
				</div>
			) : null}
		</Section>
	);
}

// Fields shared by a placed decal and the next one placed.
function DecalFields({ d, set }) {
	return (
		<>
			<Field label="Text"><textarea class="text-in" rows={2} value={d.text ?? ''} placeholder="Lettering (or use an image)" onChange={(e) => set({ text: e.currentTarget.value })} /></Field>
			<Field label="Font">
				<div class="fonts">
					{FONTS.map((f) => <button key={f} class={`font ${(d.font ?? 'Segoe Script') === f ? 'on' : ''}`} style={{ fontFamily: `'${f}', cursive` }} title={f} onClick={() => set({ font: f })}>{(d.text || 'Aa').split('\n')[0].slice(0, 12) || 'Aa'}</button>)}
				</div>
			</Field>
			<Switch label="Bold" value={(d.weight ?? 'normal') === 'bold'} onChange={(v) => set({ weight: v ? 'bold' : 'normal' })} />
			<Field label="Look"><Segmented wrap value={d.look ?? 'print'} options={LOOKS} onPick={(v) => set({ look: v })} /></Field>
			<Field label="Colour"><Swatches value={d.colour ?? '#ffffff'} colours={PALETTE} size="s" onPick={(c, g) => set({ colour: c }, g)} /></Field>
			<Field label="Width"><Slider value={d.size ?? 0.08} min={0.01} max={0.4} step={0.001} format={mm} onChange={(v, g) => set({ size: v }, g)} /></Field>
			<Field label="Turn"><Slider value={d.rotate ?? 0} min={-180} max={180} step={1} format={(v) => v.toFixed(0) + '°'} onChange={(v, g) => set({ rotate: v }, g)} /></Field>
			<Field label="Image instead"><input class="text-in" type="text" value={d.src ?? ''} placeholder="/references/logo.png" onChange={(e) => set({ src: e.currentTarget.value || null })} /></Field>
		</>
	);
}

function DecalEditor({ id, doc }) {
	rev.value;
	const d = doc.decals.find((x) => x.id === id), back = () => { selection.value = null; };
	if (!d) return <PartHeader back="Sparkle" onBack={back} title="This logo no longer exists" />;
	const set = (patch, gesture) => run({ op: 'decal.set', id: d.id, ...patch, ...(gesture ? { gesture } : {}) });
	return (
		<>
			<PartHeader back="Sparkle" onBack={back} title={d.name ?? ''} placeholder={d.text?.split('\n')[0] || 'Logo'} onRename={(v) => set({ name: v })}
				actions={<IconButton icon={<I.trash size={18} />} label="Delete this logo" kind="danger" onClick={() => { run({ op: 'decal.remove', id: d.id }); selection.value = null; }} />} />
			<Section>
				<div class="btn-row"><Button icon={<I.pointer size={18} />} active={tool.value === 'decal' && toolOptions.value.moveDecal === d.id} title="Then click the leotard where its centre goes"
					onClick={() => { toolOptions.value = { ...toolOptions.value, moveDecal: d.id }; tool.value = 'decal'; }}>Move it</Button></div>
				<DecalFields d={d} set={set} />
			</Section>
		</>
	);
}
