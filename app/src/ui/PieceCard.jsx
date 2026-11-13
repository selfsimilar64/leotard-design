// A piece's card: its colour (and the material it is cut from), its fabric, its fade and its details, a face each. A
// piece is chosen by tapping it on the model, or from Fabric's own card (FabricHome: every piece by name). The fabrics
// are a swatch book in the order the moodboard uses them, then the owner's scanned fabrics; each swatch is a close-up
// pre-rendered by src/dev/thumbnails.js (materials). The same colour and fabric pickers serve straps and edge
// finishes (ui/ShapeCard.jsx), there as two wells that open beside the card (LookWells).
import { useEffect, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection, tool, tab, notify } from './state.js';
import { toolOptions } from './tools.js';
import { run, Card, Field, Tiles, Segmented, Swatches, ColourWell, HexField, Slider, Well, Button, IconButton, PartRow, Hint, thumbName } from './kit.jsx';
import { I } from './icons.jsx';
import { FABRICS, SECOND, SATIN_DEFAULTS, RETIRED_SCANS, texScaleOf, hasSecondColour } from '../materials/fabric.js';
import { baseFabricFor } from '../materials/textures.js';
import { usage } from '../doc/materials.js';
import { PatternGallery, patternLabel } from './PatternCard.jsx';
import { printsInk, madeAs } from '../prints/designs.js';

// The materials in the order the moodboard uses them (knowledge/domain/moodboard/common-patterns.md:
// mesh in 83% of garments, matte 45%, wet look and foil 33%, shiny 28%, mystique 28%, then the
// rarer finishes), the plainest first. The sublimated-ombre fabrics stay out: a gradient is a
// setting of any piece; the debug checker too.
const ORDER = ['matte', 'shiny', 'mystique', 'opalmystique', 'wet', 'satin', 'satinduo', 'mesh', 'foil', 'hologram', 'glitter', 'velvet', 'illusion', 'liquidholo', 'hologlitter', 'oilslick', 'duochrome', 'glitterfoil', 'pearl', 'chrome', 'crushed', 'glittermesh'];
const HIDDEN = new Set(['checker', 'ombre', 'ombremystique']);
export const FABRIC_KEYS = [...ORDER.filter((k) => FABRICS[k]), ...Object.keys(FABRICS).filter((k) => !ORDER.includes(k) && !HIDDEN.has(k))];
export const fabricLabel = (k) => FABRICS[k]?.label.replace(/ \(.*\)$/, '') ?? k;

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

export const pieceName = (p, doc) => p.name || 'Piece ' + (doc.panels.filter((x) => x.layer === p.layer).indexOf(p) + 1);
const lookOf = (s) => ({ fabric: s.fabric, colour: s.colour ?? '#888888', second: s.second ?? 'Tone-on-tone', colour2: s.colour2 ?? null, texture: s.texture ?? null, texMode: s.texMode });

// --- Fabric's own card: every piece, to pick one ----------------------------------------------------------

export function FabricHome() {
	rev.value;
	const doc = app.doc;
	return (
		<Card kind="fabric" title="Fabric">
			{() => doc.panels.length ? <>
				<Hint>Tap a piece of the leotard, or pick one here.</Hint>
				<div class="part-list tall">
					{doc.panels.map((x) => {
						const s = x.stack?.[0] ?? {};
						return <PartRow key={x.id} swatch={x.removed ? 'transparent' : s.colour ?? '#888'} label={pieceName(x, doc)} meta={x.removed ? 'Cut out' : s.texture ? 'Scanned fabric' : fabricLabel(s.fabric)} onClick={() => { selection.value = { kind: 'panels', id: x.id }; }} />;
					})}
				</div>
			</> : <Hint>This design has no pieces yet: pick a starting point in Designs.</Hint>}
		</Card>
	);
}

// --- a piece ---------------------------------------------------------------------------------------------

export function PieceCard({ id }) {
	rev.value;
	const doc = app.doc, p = doc.panels.find((x) => x.id === id), back = () => { selection.value = null; tab.value = 'fabric'; };
	if (!p) return <Card kind="gone" title="This piece no longer exists" onBack={back} backLabel="Fabric">{() => null}</Card>;
	const s = p.stack?.[0] ?? {}, f = FABRICS[s.fabric];
	const set = (patch, gesture) => run({ op: 'panel.set', id: p.id, ...patch, ...(gesture ? { gesture } : {}) });
	const head = { title: p.name ?? '', placeholder: pieceName(p, doc), onRename: (v) => run({ op: 'panel.set', id: p.id, name: v }), onBack: back, backLabel: 'Fabric' };
	if (p.removed) return (
		<Card kind="opening" {...head}>
			{() => <>
				<Hint icon={<I.scissors size={16} />}>This piece is cut out: an opening, such as a keyhole.</Hint>
				<div class="btn-row"><Button icon={<I.fill size={18} />} onClick={() => run({ op: 'panel.restore', id: p.id })}>Fill it with fabric</Button></div>
			</>}
		</Card>
	);
	const look = lookOf(s);
	return (
		<Card kind="piece" {...head}
			actions={<>
				{app.looking ? <IconButton icon={<I.eyedrop size={18} />} label="Match the colour to the reference photo: click the piece on the photo" onClick={() => { toolOptions.value = { ...toolOptions.value, eyedrop: { panel: p.id, layer: 0 } }; tool.value = 'eyedrop'; }} /> : null}
				{p.outline
					? <IconButton icon={<I.trash size={18} />} kind="danger" label="Delete this overlay piece" onClick={() => { run({ op: 'overlay.remove', id: p.id }); selection.value = null; }} />
					: <IconButton icon={<I.scissors size={18} />} label="Cut it out: make this piece an opening (a keyhole, a cut-out)" onClick={() => run({ op: 'panel.cut', id: p.id })} />}
			</>}
			faces={[['colour', 'Colour'], ['fabric', 'Fabric'], ['print', 'Print'], ['fade', 'Fade'], ['details', 'Details']]}>
			{(face) => face === 'colour' ? <>
				<MaterialChoice value={s.material} doc={doc} kind="piece" onPick={(m) => run({ op: 'panel.material', id: p.id, material: m })} onSeparate={() => run({ op: 'panel.separate', id: p.id })} />
				<Field label="Colour"><ColourFields look={look} set={set} /></Field>
			</> : face === 'fabric' ? <FabricFace look={look} s={s} f={f} set={set} />
				: face === 'print' ? <Prints p={p} doc={doc} />
				: face === 'fade' ? <Fade p={p} s={s} doc={doc} />
					: <Details s={s} f={f} set={set} />}
		</Card>
	);
}

// The design's materials as chips: pick one to cut this part from it. Its colour and fabric reach everything else cut
// from it, which the label says ("Shared by 3 parts"); Separate gives this part its own copy first. The last chip
// holds the rest: its name, a new material, tidying away the unused ones.
export function MaterialChoice({ value, doc, onPick, onSeparate, kind = 'part' }) {
	rev.value; // (the record it shows is edited in place: without this it would redraw only for a changed prop, ui/state.js rev)
	const m = doc.materials.find((x) => x.id === value), u = usage(doc), mine = u.get(value), n = mine ? mine.piece + mine.strap + mine.finish : 0, shared = (mine?.all ?? 0) > 1;
	const unused = doc.materials.filter((x) => !u.get(x.id)?.all && x.id !== value);
	return (
		<Field label="Cut from" aside={!mine ? null : n <= 1 ? `Only this ${kind}` : <>Shared by {n} parts{shared && onSeparate ? <> · <button class="link" title="Give this part its own copy of the material, so a change here stays here" onClick={onSeparate}>Separate</button></> : null}</>}>
			<div class="chips">
				{doc.materials.filter((x) => u.get(x.id)?.all || x.id === value).map((x) => (
					<button key={x.id} class={`chip-pick ${x.id === value ? 'on' : ''}`} title={`${fabricLabel(x.fabric)} ${x.colour}`} onClick={() => x.id !== value && onPick(x.id)}>
						<span class="chip-dot" style={{ '--c': x.colour }} /><span>{x.name}</span>
					</button>
				))}
				{unused.map((x) => (
					<button key={x.id} class="chip-pick" title={`${fabricLabel(x.fabric)} ${x.colour}: nothing is cut from it yet`} onClick={() => onPick(x.id)}><span class="chip-dot" style={{ '--c': x.colour }} /><span>{x.name}</span></button>
				))}
				<button class="chip-pick plain" title="A new material, starting as a copy of this one; this part is cut from it" onClick={() => { const id = run({ op: 'material.add', from: value }); if (id) onPick(id); }}><I.plus size={14} /><span>New</span></button>
			</div>
			{m ? <div class="seg-row">
				<input class="text-in" value={m.name} aria-label="The material's name" title="Rename this material" onChange={(e) => run({ op: 'material.set', id: m.id, name: e.currentTarget.value })} />
				{unused.length ? <Button kind="quiet" size="small" title="Delete the materials nothing is cut from" onClick={() => run(unused.map((x) => ({ op: 'material.remove', id: x.id })))}>Tidy unused</Button> : null}
			</div> : null}
		</Field>
	);
}

// Colour (and, for a fabric of two colours, the second; for foil, glitter or a duochrome, what the
// second colour is) of a look. look: { fabric, colour, second, colour2, texture, texMode }.
export function ColourFields({ look, set }) {
	const scanned = !!look.texture, recolour = !scanned || look.texMode === 'recolour', f = FABRICS[look.fabric];
	const pick = (c, g) => set(scanned ? { colour: c, texMode: 'recolour' } : { colour: c }, g);
	return (
		<>
			<Swatches value={recolour ? look.colour : null} colours={PALETTE} onPick={pick}
				extra={scanned ? <button class={`chip-pick plain ${!recolour ? 'on' : ''}`} title="The fabric's own colours, as scanned" onClick={() => set({ texMode: 'original' })}>As scanned</button> : null} />
			{/* a fabric whose look is two colours (twoTone) shows its second beside the first (owner, 2026-10-28) */}
			{!scanned && f?.twoTone ? <Field label="Second colour">
				<Swatches value={look.colour2 ?? look.colour} colours={PALETTE} onPick={(c, g) => set({ colour2: c }, g)} />
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
			<Segmented value={custom ? null : look.second ?? 'Tone-on-tone'} cols={5} onPick={(v) => set({ second: v, colour2: null })}
				options={SECOND.map((v) => [v, v === 'Tone-on-tone' ? 'Tonal' : v, null, v === 'Tone-on-tone' ? 'Tone on tone: a shade of the colour itself' : v])} />
			<div class="swatches">
				<ColourWell value={look.colour2 ?? '#c0c0c8'} on={custom} title="Any colour" onChange={(c, g) => set({ colour2: c }, g)} />
				<HexField value={look.colour2} onPick={(c) => set({ colour2: c })} />
			</div>
		</Field>
	);
}

// Every fabric as a swatch: the app's fabrics, then the scans. Picking a scan sets its base fabric. The swatches carry
// no names (each shows on hover, and the chosen one's stands above the book).
export function FabricBook({ look, set, cols = 6 }) {
	const scans = useScans(), scanned = !!look.texture, scan = (k) => scans.find((x) => x.id === k);
	const pick = (k) => set(scan(k) ? { texture: k, fabric: baseFabricFor(scan(k)) } : { fabric: k, texture: null });
	const value = scanned ? look.texture : look.fabric;
	return (
		<>
			<div class="fabric-name"><span>{scanned ? scanLabel(scan(look.texture) ?? { name: 'Scanned fabric' }) : fabricLabel(look.fabric)}</span>{scanned ? <small>Scanned fabric</small> : null}</div>
			<Tiles cols={cols} names={false} value={value} onPick={pick}
				items={[...FABRIC_KEYS.map((k) => ({ key: k, label: fabricLabel(k), hint: FABRICS[k].label, img: `/thumbs/materials/${thumbName(k)}.jpg` })),
					...scans.map((x) => ({ key: x.id, label: scanLabel(x), hint: `${x.look} (scanned fabric)`, img: `/textures/vmod/thumbs/cloth/${x.id}.jpg` }))]} />
		</>
	);
}

// The Fabric face: the swatch book, then the chosen fabric's own defining settings (sheerness for mesh, the satin's four).
function FabricFace({ look, s, f, set }) {
	rev.value;
	return (
		<>
			<FabricBook look={look} set={set} />
			{f?.mesh ? <Slider label="Sheerness" value={s.sheer ?? (3.6276 * f.mesh.holeR ** 2) ** 2} min={0} max={0.95} step={0.01} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => set({ sheer: v }, g)} /> : null}
			{f?.micro ? <SatinControls s={s} set={set} /> : null}
		</>
	);
}

// The thread-model satin's controls (materials/fabric.js SATIN_DEFAULTS: the owner's settings since
// 2026-10-28; unset fields take them), the widths shown against the paper's measured value (P): sharpness as 2.5 degrees over the highlight's width, glow width as a
// multiple of 5 degrees, milkiness as a share, sheen as the face-on surface reflection the
// refractive index gives. Only Duotone satin has a second colour (its cross threads), shown under the
// colour (twoTone, ColourFields); Satin is one colour.
function SatinControls({ s, set }) {
	rev.value;
	const v = { ...SATIN_DEFAULTS, ...s.satin }, put = (k, x, g) => set({ satin: { ...s.satin, [k]: x } }, g);
	const P = { gs: 2.5, gv: 5 }, refl = (eta) => ((eta - 1) / (eta + 1)) ** 2;
	return (
		<Field label="Satin" aside={s.satin ? <button class="link" title="Back to the default satin settings" onClick={() => set({ satin: null })}>Reset</button> : null}>
			<Slider label="Highlight sharpness" value={P.gs / v.gs} min={0.25} max={4} step={0.05} format={(x) => x.toFixed(2) + '×'} onChange={(x, g) => put('gs', P.gs / x, g)} />
			<Slider label="Colour glow width" value={v.gv / P.gv} min={0.25} max={6} step={0.05} format={(x) => x.toFixed(2) + '×'} onChange={(x, g) => put('gv', P.gv * x, g)} />
			<Slider label="Milkiness" value={v.kd} min={0} max={1} step={0.01} format={(x) => Math.round(x * 100) + '%'} onChange={(x, g) => put('kd', x, g)} />
			<Slider label="Sheen strength" value={v.eta} min={1.2} max={2.2} step={0.005} format={(x) => (refl(x) * 100).toFixed(1) + '%'} onChange={(x, g) => put('eta', x, g)} />
		</Field>
	);
}

// The piece's printed patterns: designs of colour drawn on its flat cloth (and crystal layouts made as print), each a
// live pattern with a card of its own (ui/PatternCard.jsx): the same thing as a crystal pattern, made as print. With none
// yet, the gallery itself; a pick lays it on this piece and opens it.
function Prints({ p, doc }) {
	rev.value;
	const on = doc.stones.filter((g) => g.kind === 'pattern' && g.on?.panel === p.id && printsInk(g.params)), [adding, setAdding] = useState(false);
	const lay = (key) => {
		const piece = app.engine?.clothOf(p.id)?.piece, sp = piece?.spOnPiece((piece.x0 + piece.x1) / 2, (piece.y0 + piece.y1) / 2);
		if (!sp) { notify('This piece is still being laid flat: try again in a moment'); return; }
		toolOptions.value = { ...toolOptions.value, pattern: key };
		app.tools.placePattern({ panel: p.id, sp, layer: p.layer }, 'print');
	};
	if (!on.length || adding) return (
		<>
			{on.length ? null : <Hint>Pick a design to print on this piece. It stays live, and crystals can follow it.</Hint>}
			<PatternGallery value={null} kind="print" onPick={lay} />
		</>
	);
	return (
		<>
			<div class="part-list tall">
				{on.map((g) => <PartRow key={g.id} icon={<I.fill size={18} />} label={g.name || patternLabel(g)} meta={madeAs(g.params) === 'both' ? 'Print and crystals' : 'Print'} onClick={() => { selection.value = { kind: 'stones', id: g.id }; }} />)}
			</div>
			<div class="btn-row"><Button icon={<I.plus size={18} />} title="Another printed pattern on this piece, over these" onClick={() => setAdding(true)}>Add a printed pattern</Button></div>
		</>
	);
}

// The piece's colour fade: the far colour, the way it runs (down, across, diagonally, or out from one of the design's
// lines) and the two places it runs between.
const AXES = { height: { axis: [0, 1, 0], min: 0.5, max: 1.6 }, across: { axis: [1, 0, 0], min: -0.4, max: 0.4 }, diagonal: { axis: [0.7071, 0.7071, 0], min: 0.2, max: 1.3 } };
const axisKey = (o) => Object.keys(AXES).find((k) => JSON.stringify(AXES[k].axis) === JSON.stringify(o?.axis)) ?? 'height';
const DIRECTIONS = [['height', 'Down', <I.chevronDown size={16} />], ['across', 'Across', <I.chevronRight size={16} />], ['diagonal', 'Diagonal', <span class="diag"><I.chevronRight size={16} /></span>]];
const mm = (v) => (v * 1000).toFixed(0) + ' mm';
function Fade({ p, s, doc }) {
	rev.value;
	const o = s.ombre, set = (patch, g) => run({ op: 'panel.set', id: p.id, ombre: patch === null ? null : { ...o, ...patch }, ...(g ? { gesture: g } : {}) });
	const add = () => run({ op: 'panel.set', id: p.id, ombre: { colour: darker(s.colour ?? '#888888'), axis: AXES.height.axis, start: 1.3, end: 0.85 } });
	const along = (v) => set({ curve: undefined, axis: AXES[v].axis, start: (AXES[v].min + AXES[v].max) / 2 + 0.2, end: (AXES[v].min + AXES[v].max) / 2 - 0.2 });
	const lines = doc.curves.filter((c) => c.role !== 'guide'), line = o?.curve ? doc.curves.find((c) => c.id === o.curve) : null;
	const range = o?.curve ? { min: 0, max: 0.6 } : AXES[axisKey(o)];
	return (
		<>
			<Segmented value={o ? 'on' : 'off'} options={[['off', 'One colour'], ['on', 'Fade to another']]} onPick={(v) => (v === 'on' ? add() : set(null))} />
			{o ? <>
				<span class="grad-bar" style={{ '--a': s.colour ?? '#888', '--b': o.colour }} />
				<Field label="Fades to"><Swatches value={o.colour} colours={PALETTE} onPick={(c, g) => set({ colour: c }, g)} /></Field>
				<Field label="Runs">
					<Segmented value={o.curve ? null : axisKey(o)} options={DIRECTIONS} onPick={along} />
					<Well label="Or out from a line" value={line ? line.name || line.id : 'None'} width={260}>
						{(close) => <div class="part-list tall">
							{lines.map((c) => <PartRow key={c.id} icon={<I.lines size={18} />} label={c.name || c.id} on={c.id === o.curve} onClick={() => { set({ curve: c.id, axis: undefined, start: 0, end: 0.25 }); close(); }} />)}
						</div>}
					</Well>
				</Field>
				<Slider label="Starts at" value={o.start} min={range.min} max={range.max} step={0.005} format={mm} onChange={(v, g) => set({ start: v }, g)} />
				<Slider label="Full colour at" value={o.end} min={range.min} max={range.max} step={0.005} format={mm} onChange={(v, g) => set({ end: v }, g)} />
			</> : <Hint>A fade runs from this piece's colour to a second one: down the body, across it, or out from a line.</Hint>}
		</>
	);
}
// a darker shade of a hex colour (the default far end of a fade)
const darker = (hex) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.3).toString(16).padStart(2, '0')).join('');

// The finer settings of a piece's fabric: only the ones this fabric has.
function Details({ s, f, set }) {
	rev.value;
	return (
		<>
			{/* the size of a scan's weave or print, or of a fabric's glitter, dots, holes, lace, swirls */}
			<Slider label="Texture size" value={texScaleOf(s)} min={0.25} max={4} step={0.05} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => set({ texScale: v }, g)} />
			<Slider label="Grain" value={s.grain ?? 0} min={-Math.PI / 2} max={Math.PI / 2} step={0.01} format={(v) => (v * 180 / Math.PI).toFixed(0) + '°'} onChange={(v, g) => set({ grain: v }, g)} />
			{f?.film || f?.duo || f?.flake?.holo || f?.iridescence ? <Slider label="Effect strength" value={s.effect ?? 1} min={0} max={2} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v, g) => set({ effect: v }, g)} /> : null}
			{f?.flake?.holo || f?.film?.tint ? <Slider label="Rainbow speed" value={s.rainbow ?? 1} min={0.2} max={3} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v, g) => set({ rainbow: v }, g)} /> : null}
			<Field label="Print image"><input class="text-in" type="text" placeholder="/moodboard/… or a web address" value={s.print?.src ?? ''} onChange={(e) => set({ print: e.currentTarget.value ? { src: e.currentTarget.value, size: s.print?.size ?? [0.2, 0.2] } : null })} /></Field>
			{s.print ? <Slider label="Print repeat" value={s.print.size?.[0] ?? 0.2} min={0.02} max={0.8} step={0.005} format={mm} onChange={(v, g) => set({ print: { ...s.print, size: [v, v * (s.print.size?.[1] ?? 0.2) / (s.print.size?.[0] ?? 0.2)] } }, g)} /> : null}
		</>
	);
}

// A look's colour and fabric as two wells that open beside the card: for a strap about to be drawn and an edge's
// binding, piping or tape, where the look is one setting among others.
export function LookWells({ look, set }) {
	const scanned = !!look.texture;
	return (
		<div class="wells">
			<Well label="Colour" value={scanned && look.texMode !== 'recolour' ? 'As scanned' : look.colour} swatch={look.colour} width={300}>
				<Field label="Colour"><ColourFields look={look} set={set} /></Field>
			</Well>
			<Well label="Fabric" value={scanned ? 'Scanned' : fabricLabel(look.fabric)} img={scanned ? `/textures/vmod/thumbs/cloth/${look.texture}.jpg` : `/thumbs/materials/${thumbName(look.fabric)}.jpg`} width={324}>
				<FabricBook look={look} set={set} />
			</Well>
		</div>
	);
}
