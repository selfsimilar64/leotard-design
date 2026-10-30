// The Fabric tab: the design's pieces, and for the chosen piece its colour, gradient and material.
// A piece is chosen here or by tapping it on the model. The material grid lists the app's fabrics
// in the order the moodboard uses them, then the owner's scanned fabrics; each tile is a close-up of
// the fabric pre-rendered by src/dev/thumbnails.js (materials). LookControls also serves straps and
// edge finishes (ui/ShapeTab.jsx), compact.
import { useEffect, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection, tool } from './state.js';
import { toolOptions } from './tools.js';
import { run, Section, Field, Tiles, Segmented, Swatches, ColourWell, Slider, Disclosure, Button, IconButton, Hint, thumbName } from './kit.jsx';
import { I } from './icons.jsx';
import { FABRICS, SECOND, SATIN_DEFAULTS, RETIRED_SCANS, texScaleOf, hasSecondColour } from '../materials/fabric.js';
import { baseFabricFor } from '../materials/textures.js';

// The materials in the order the moodboard uses them (knowledge/domain/moodboard/common-patterns.md:
// mesh in 83% of garments, matte 45%, wet look and foil 33%, shiny 28%, mystique 28%, then the
// rarer finishes), the plainest first. The sublimated-ombre fabrics stay out: a gradient is a
// setting of any piece; the debug checker too.
const ORDER = ['matte', 'shiny', 'mystique', 'opalmystique', 'wet', 'satin', 'satinduo', 'mesh', 'foil', 'hologram', 'glitter', 'velvet', 'illusion', 'liquidholo', 'hologlitter', 'oilslick', 'duochrome', 'glitterfoil', 'pearl', 'chrome', 'crushed', 'glittermesh'];
const HIDDEN = new Set(['checker', 'ombre', 'ombremystique']);
export const FABRIC_KEYS = [...ORDER.filter((k) => FABRICS[k]), ...Object.keys(FABRICS).filter((k) => !ORDER.includes(k) && !HIDDEN.has(k))];
export const fabricLabel = (k) => FABRICS[k]?.label.replace(/ \(.*\)$/, '') ?? k;
// the names under the tiles, short enough for one line (the full name shows beside the heading)
const SHORT = { foil: 'Metallic foil', hologram: 'Hologram', hologlitter: 'Holo glitter', glitterfoil: 'Glitter foil', liquidholo: 'Liquid holo', duochrome: 'Duochrome', chrome: 'Chrome', velvet: 'Velvet', mesh: 'Mesh', pearl: 'Iridescent' };
const tileLabel = (k) => SHORT[k] ?? fabricLabel(k);

// Colours most leotards are made in.
export const PALETTE = ['#0c0c10', '#f4f4f2', '#c8ccd8', '#e6bf58', '#b3122e', '#6b0f22', '#ff4f8b', '#f6b6c8', '#5b2a86', '#b9a3e3',
	'#16205c', '#1b3fb5', '#8cc6ec', '#0b7d7a', '#0b7d55', '#f07a2a', '#d2a48a'];

// the scanned fabrics (once the texture manifest has loaded), less the retired ones
function useScans() {
	const [list, setList] = useState([]);
	useEffect(() => { app.engine?.textures?.list().then((l) => setList(l.filter((f) => !RETIRED_SCANS.has(f.id))), () => setList([])); }, []);
	return list;
}
const scanLabel = (f) => { const s = (f.look ?? f.name).split(/[,(]/)[0].trim(); return s.charAt(0).toUpperCase() + s.slice(1); };

export function FabricTab() {
	rev.value;
	const doc = app.doc, sel = selection.value;
	const p = sel?.kind === 'panels' ? doc.panels.find((x) => x.id === sel.id) : null;
	return (
		<>
			<Section title="Pieces" note={doc.panels.length ? null : 'This design has no pieces yet: pick a starting point in Designs.'}>
				<div class="chips">
					{doc.panels.map((x) => {
						const s = x.stack?.[0] ?? {};
						return (
							<button key={x.id} class={`chip piece ${x.id === p?.id ? 'on' : ''} ${x.removed ? 'opening' : ''}`} onClick={() => { selection.value = { kind: 'panels', id: x.id }; }}
								title={x.removed ? 'An opening (cut out)' : fabricLabel(s.fabric)}>
								<span class="chip-dot" style={{ '--c': x.removed ? 'transparent' : s.colour ?? '#888' }} />{pieceName(x, doc)}
							</button>
						);
					})}
				</div>
			</Section>
			{p ? <PieceEditor key={p.id} p={p} doc={doc} /> : doc.panels.length ? <Hint>Pick a piece above, or tap one on the model.</Hint> : null}
		</>
	);
}

export const pieceName = (p, doc) => p.name || 'Piece ' + (doc.panels.filter((x) => x.layer === p.layer).indexOf(p) + 1);

function PieceEditor({ p, doc }) {
	const s = p.stack?.[0] ?? {}, f = FABRICS[s.fabric];
	const set = (patch, gesture) => run({ op: 'panel.set', id: p.id, ...patch, ...(gesture ? { gesture } : {}) });
	if (p.removed) return (
		<Section title={pieceName(p, doc)}>
			<Hint icon={<I.scissors size={16} />}>This piece is cut out: an opening, such as a keyhole.</Hint>
			<div class="btn-row"><Button icon={<I.fill size={18} />} onClick={() => run({ op: 'panel.restore', id: p.id })}>Fill it with fabric</Button></div>
		</Section>
	);
	const look = { fabric: s.fabric, colour: s.colour ?? '#888888', second: s.second ?? 'Tone-on-tone', colour2: s.colour2 ?? null, texture: s.texture ?? null, texMode: s.texMode };
	return (
		<>
			<Section title={<PieceTitle p={p} doc={doc} />} aside={<>
				{app.looking ? <IconButton icon={<I.eyedrop size={18} />} label="Match the colour to the reference photo: click the piece on the photo" onClick={() => { toolOptions.value = { ...toolOptions.value, eyedrop: { panel: p.id, layer: 0 } }; tool.value = 'eyedrop'; }} /> : null}
				<IconButton icon={<I.scissors size={18} />} label="Cut it out: make this piece an opening (a keyhole, a cut-out)" onClick={() => run({ op: 'panel.cut', id: p.id })} />
			</>}>
				<ColourFields look={look} set={set} />
			</Section>
			<Gradient p={p} s={s} doc={doc} />
			<Section title="Material" aside={<span class="sec-value">{look.texture ? 'Scanned fabric' : fabricLabel(s.fabric)}</span>}>
				{f?.mesh ? <Field label="Sheerness"><Slider value={s.sheer ?? (3.6276 * f.mesh.holeR ** 2) ** 2} min={0} max={0.95} step={0.01} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => set({ sheer: v }, g)} /></Field> : null}
				{f?.micro ? <SatinControls s={s} set={set} /> : null}
				<MaterialGrid look={look} set={set} />
			</Section>
			<Section>
				<Disclosure label="Fine-tune">
					<FineTune p={p} s={s} f={f} doc={doc} set={set} />
				</Disclosure>
			</Section>
		</>
	);
}

function PieceTitle({ p, doc }) {
	return <input class="inline-title" value={p.name ?? ''} placeholder={pieceName(p, doc)} title="Rename this piece" size={Math.max((p.name || pieceName(p, doc)).length, 4)}
		onChange={(e) => run({ op: 'panel.set', id: p.id, name: e.currentTarget.value })} />;
}

// Colour (and, for a fabric of two colours, the second; for foil, glitter or a duochrome, what the
// second colour is) of a look. look: { fabric, colour, second, colour2, texture, texMode }.
export function ColourFields({ look, set, compact = false }) {
	const scanned = !!look.texture, recolour = !scanned || look.texMode === 'recolour', f = FABRICS[look.fabric];
	const pick = (c, g) => set(scanned ? { colour: c, texMode: 'recolour' } : { colour: c }, g);
	return (
		<>
			<Swatches value={recolour ? look.colour : null} colours={PALETTE} onPick={pick} size={compact ? 's' : 'm'}
				extra={scanned ? <button class={`chip ${!recolour ? 'on' : ''}`} title="The fabric's own colours, as scanned" onClick={() => set({ texMode: 'original' })}>As scanned</button> : null} />
			{/* a fabric whose look is two colours (twoTone) shows its second beside the first (owner, 2026-10-28) */}
			{!scanned && f?.twoTone ? <Field label="Second colour">
				<Swatches value={look.colour2 ?? look.colour} colours={PALETTE} onPick={(c, g) => set({ colour2: c }, g)} size={compact ? 's' : 'm'} />
			</Field> : null}
			{!scanned && hasSecondColour(f) && !f.twoTone && !f.ombre ? <SecondColour look={look} f={f} set={set} /> : null}
		</>
	);
}

// What the foil dots, the glitter or a duochrome's shift are: one of SECOND or any colour.
function SecondColour({ look, f, set }) {
	const label = f.duo ? 'Shifts to' : /glitter/i.test(f.label) ? 'Glitter' : 'Foil';
	const custom = !!look.colour2;
	return (
		<Field label={label}>
			<div class="seg-row">
				<Segmented value={custom ? null : look.second ?? 'Tone-on-tone'} wrap onPick={(v) => set({ second: v, colour2: null })}
					options={SECOND.map((v) => [v, v === 'Tone-on-tone' ? 'Tone on tone' : v])} />
				<ColourWell value={look.colour2 ?? '#c0c0c8'} on={custom} title="Any colour" onChange={(c, g) => set({ colour2: c }, g)} />
			</div>
		</Field>
	);
}

// Every material as a tile: the app's fabrics, then the scans. Picking a scan sets its base fabric.
export function MaterialGrid({ look, set, cols = 4 }) {
	const scans = useScans(), scanned = !!look.texture, scan = (k) => scans.find((x) => x.id === k);
	const pick = (k) => set(scan(k) ? { texture: k, fabric: baseFabricFor(scan(k)) } : { fabric: k, texture: null });
	const fabrics = FABRIC_KEYS.map((k) => ({ key: k, label: tileLabel(k), hint: FABRICS[k].label, img: `/thumbs/materials/${thumbName(k)}.jpg` }));
	const value = scanned ? look.texture : look.fabric;
	return (
		<>
			<Tiles cols={cols} compact items={fabrics} value={value} onPick={pick} />
			{scans.length ? <>
				<div class="sub-label">Scanned fabrics</div>
				<Tiles cols={cols} compact value={value} onPick={pick}
					items={scans.map((x) => ({ key: x.id, label: scanLabel(x), hint: `${x.look} (scanned fabric)`, img: `/textures/vmod/thumbs/cloth/${x.id}.jpg` }))} />
			</> : null}
		</>
	);
}

// The thread-model satin's controls (materials/fabric.js SATIN_DEFAULTS: the owner's settings since
// 2026-10-28; unset fields take them), the widths shown against the paper's measured value (P): sharpness as 2.5 degrees over the highlight's width, glow width as a
// multiple of 5 degrees, milkiness as a share, sheen as the face-on surface reflection the
// refractive index gives. Only Duotone satin has a second colour (its cross threads), shown under the
// colour (twoTone, ColourFields); Satin is one colour.
function SatinControls({ s, set }) {
	const v = { ...SATIN_DEFAULTS, ...s.satin }, put = (k, x, g) => set({ satin: { ...s.satin, [k]: x } }, g);
	const P = { gs: 2.5, gv: 5 }, refl = (eta) => ((eta - 1) / (eta + 1)) ** 2;
	return <>
		<Field label="Highlight sharpness"><Slider value={P.gs / v.gs} min={0.25} max={4} step={0.05} format={(x) => x.toFixed(2) + '×'} onChange={(x, g) => put('gs', P.gs / x, g)} /></Field>
		<Field label="Colour glow width"><Slider value={v.gv / P.gv} min={0.25} max={6} step={0.05} format={(x) => x.toFixed(2) + '×'} onChange={(x, g) => put('gv', P.gv * x, g)} /></Field>
		<Field label="Milkiness"><Slider value={v.kd} min={0} max={1} step={0.01} format={(x) => Math.round(x * 100) + '%'} onChange={(x, g) => put('kd', x, g)} /></Field>
		<Field label="Sheen strength" aside={s.satin ? <button class="link" title="Back to the default satin settings" onClick={() => set({ satin: null })}>Reset</button> : null}>
			<Slider value={v.eta} min={1.2} max={2.2} step={0.005} format={(x) => (refl(x) * 100).toFixed(1) + '%'} onChange={(x, g) => put('eta', x, g)} />
		</Field>
	</>;
}

// The piece's colour gradient as a designer picks it: a second colour and a direction. The
// positions it runs between are under Fine-tune (FineTune).
const AXES = { height: { axis: [0, 1, 0], min: 0.5, max: 1.6, label: 'Height' }, across: { axis: [1, 0, 0], min: -0.4, max: 0.4, label: 'Left to right' }, diagonal: { axis: [0.7071, 0.7071, 0], min: 0.2, max: 1.3, label: 'Diagonal' } };
const axisKey = (o) => Object.keys(AXES).find((k) => JSON.stringify(AXES[k].axis) === JSON.stringify(o?.axis)) ?? 'height';
const DIRECTIONS = [['height', 'Down', <I.chevronDown size={16} />], ['across', 'Across', <I.chevronRight size={16} />], ['diagonal', 'Diagonal', <span class="diag"><I.chevronRight size={16} /></span>]];
function Gradient({ p, s, doc }) {
	const o = s.ombre, set = (patch) => run({ op: 'panel.set', id: p.id, ombre: patch === null ? null : { ...o, ...patch } });
	const add = () => run({ op: 'panel.set', id: p.id, ombre: { colour: darker(s.colour ?? '#888888'), axis: AXES.height.axis, start: 1.3, end: 0.85 } });
	const along = (v) => set({ curve: undefined, axis: AXES[v].axis, start: (AXES[v].min + AXES[v].max) / 2 + 0.2, end: (AXES[v].min + AXES[v].max) / 2 - 0.2 });
	return (
		<Section title="Gradient" aside={<Segmented value={o ? 'on' : 'off'} options={[['off', 'None'], ['on', 'Fade']]} onPick={(v) => (v === 'on' ? add() : set(null))} />}>
			{o ? (
				<div class="gradient">
					<span class="grad-bar" style={{ '--a': s.colour ?? '#888', '--b': o.colour }} />
					<Field label="Fades to"><Swatches value={o.colour} colours={PALETTE} size="s" onPick={(c, g) => run({ op: 'panel.set', id: p.id, ombre: { ...o, colour: c }, gesture: g })} /></Field>
					{o.curve ? <Field label="Direction"><span class="value-text">From the line {doc.curves.find((c) => c.id === o.curve)?.name || o.curve}</span></Field>
						: <Field label="Direction"><Segmented value={axisKey(o)} options={DIRECTIONS} onPick={along} /></Field>}
				</div>
			) : null}
		</Section>
	);
}
// a darker shade of a hex colour (the default far end of a fade)
const darker = (hex) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.3).toString(16).padStart(2, '0')).join('');

const mm = (v) => (v * 1000).toFixed(0) + ' mm';
function FineTune({ p, s, f, doc, set }) {
	const o = s.ombre;
	const lines = doc.curves.filter((c) => c.role !== 'guide');
	const range = o?.curve ? { min: 0, max: 0.6 } : AXES[axisKey(o)];
	return (
		<>
			{/* the size of a scan's weave or print, or of a fabric's glitter, dots, holes, lace, swirls */}
			<Field label="Texture size"><Slider value={texScaleOf(s)} min={0.25} max={4} step={0.05} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => set({ texScale: v }, g)} /></Field>
			<Field label="Grain"><Slider value={s.grain ?? 0} min={-Math.PI / 2} max={Math.PI / 2} step={0.01} format={(v) => (v * 180 / Math.PI).toFixed(0) + '°'} onChange={(v, g) => set({ grain: v }, g)} /></Field>
			{f?.film || f?.duo || f?.flake?.holo || f?.iridescence ? <Field label="Effect strength"><Slider value={s.effect ?? 1} min={0} max={2} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v, g) => set({ effect: v }, g)} /></Field> : null}
			{f?.flake?.holo || f?.film?.tint ? <Field label="Rainbow speed"><Slider value={s.rainbow ?? 1} min={0.2} max={3} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v, g) => set({ rainbow: v }, g)} /></Field> : null}
			{o ? <>
				<Field label="Gradient along">
					<Segmented wrap value={o.curve ? 'line:' + o.curve : axisKey(o)} onPick={(v) => v.startsWith('line:') ? set({ ombre: { ...o, curve: v.slice(5), axis: undefined, start: 0, end: 0.25 } }) : set({ ombre: { ...o, curve: undefined, axis: AXES[v].axis, start: (AXES[v].min + AXES[v].max) / 2 + 0.2, end: (AXES[v].min + AXES[v].max) / 2 - 0.2 } })}
						options={[...Object.entries(AXES).map(([k, a]) => [k, a.label]), ...lines.map((c) => ['line:' + c.id, 'From ' + (c.name || c.id)])]} />
				</Field>
				<Field label="Gradient starts"><Slider value={o.start} min={range.min} max={range.max} step={0.005} format={mm} onChange={(v, g) => set({ ombre: { ...o, start: v } }, g)} /></Field>
				<Field label="Full colour at"><Slider value={o.end} min={range.min} max={range.max} step={0.005} format={mm} onChange={(v, g) => set({ ombre: { ...o, end: v } }, g)} /></Field>
			</> : null}
			<Field label="Print image"><input class="text-in" type="text" placeholder="/moodboard/… or a web address" value={s.print?.src ?? ''} onChange={(e) => set({ print: e.currentTarget.value ? { src: e.currentTarget.value, size: s.print?.size ?? [0.2, 0.2] } : null })} /></Field>
			{s.print ? <Field label="Print repeat"><Slider value={s.print.size?.[0] ?? 0.2} min={0.02} max={0.8} step={0.005} format={mm} onChange={(v, g) => set({ print: { ...s.print, size: [v, v * (s.print.size?.[1] ?? 0.2) / (s.print.size?.[0] ?? 0.2)] } }, g)} /></Field> : null}
		</>
	);
}

// A compact look editor (straps, bindings, piping): colour, its second colour, and the material.
export function LookControls({ look, set }) {
	return (
		<>
			<Field label="Colour"><ColourFields look={look} set={set} compact /></Field>
			<Field label="Material" aside={<span class="field-value">{look.texture ? 'Scanned fabric' : fabricLabel(look.fabric)}</span>}><MaterialGrid look={look} set={set} cols={5} /></Field>
		</>
	);
}
