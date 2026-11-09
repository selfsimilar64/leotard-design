// The Shape card: the leotard's cut. Silhouette: its elements (neckline, back, sleeves or straps, armhole, leg cut,
// front yoke, waist seam) as a strip of small pictures, the chosen one's options below as close-up tiles (pre-rendered
// by src/dev/thumbnails.js blocks); the same elements are named beside the body itself (ui/Callouts.jsx), and picking
// one either way turns the view to it (ui/camera.js). Draw: the seam, strap and overlay tools and what the designer
// drew with them. Garment: the drawn pieces or a fitted one. A chosen line or strap has a card of its own (LineCard,
// StrapCard). Picking an option changes that element only (block.set); when the change would take away something the
// designer added (stones on a line that goes, a piece in an opening) the card asks first and keeps everything else
// either way.
import { useEffect, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection, tool, prefs, notify, slow, shapeElement } from './state.js';
import { toolOptions } from './tools.js';
import { run, Card, Field, Tiles, Segmented, Slider, CommitSlider, Switch, Stepper, Button, IconButton, PartRow, Hint, thumb, showFacet } from './kit.jsx';
import { I, EDGE_ICONS, FINISH_ICONS } from './icons.jsx';
import { LookWells, MaterialChoice, ColourFields, FabricBook } from './PieceCard.jsx';
import { TRIMS } from '../garment/trim.js';
import { overlayLines, panelAt } from '../garment/build.js';
import { focusOn } from './camera.js';
import { BLOCK_OPTIONS, blockOf, blockAllows, blockKeyOf } from '../garment/blocks.js';
import { FITTED, fittedOf, fitSizeOf, FIT_SIZE_RANGE } from '../garment/fitted.js';

// (an option kept only for older designs has no picture)
export const hideBroken = (e) => { e.currentTarget.style.visibility = 'hidden'; };
const DRAWING = ['pen', 'strap', 'overlay'];
export function ShapeCard() {
	rev.value;
	const doc = app.doc, t = tool.value, started = doc.curves.length > 0;
	// a drawing tool started by its key shows its face
	useEffect(() => { if (DRAWING.includes(t)) showFacet('shape', 'draw'); }, [t]);
	return (
		<Card kind="shape" title="Shape" faces={[['cut', 'Silhouette'], ['draw', 'Draw'], ...(started ? [['garment', 'Garment']] : [])]}>
			{(face) => face === 'cut' ? <Silhouette doc={doc} /> : face === 'draw' ? <Drawn doc={doc} /> : <Garment doc={doc} />}
		</Card>
	);
}

// --- the silhouette, element by element ---------------------------------------------------------

export const ELEMENTS = [['neck', 'Neckline', 'Neck'], ['back', 'Back', 'Back'], ['sleeves', 'Sleeves', 'Sleeves'], ['strap', 'Straps', 'Straps'], ['armhole', 'Armhole', 'Armhole'], ['leg', 'Leg cut', 'Leg'], ['yoke', 'Front yoke', 'Yoke'], ['waist', 'Waist seam', 'Waist']];
const OPTION_LABELS = { v: 'V', 'set-in': 'Set-in', 'three-quarter': '¾ length', none: 'None', peak: 'Peak', straight: 'Straight', sweetheart: 'Sweetheart', high: 'High', competition: 'Competition', standard: 'Standard' };
export const optionLabel = (o) => OPTION_LABELS[o] ?? o.charAt(0).toUpperCase() + o.slice(1);
const OPTION_HINTS = {
	strap: { tank: 'A 5-6 cm tank strap', narrow: 'A 3 cm strap set out towards the shoulder', thin: 'A 1 cm camisole strap', racer: 'Cut in towards the neck, with a crew or high neck' },
	yoke: { none: 'No yoke seam', sweetheart: 'A mesh yoke to a sweetheart edge', v: 'A mesh yoke to a V', straight: 'A mesh yoke to a straight edge', round: 'A mesh yoke to a shallow curve' },
	waist: { none: 'No waist seam', straight: 'A straight seam at the waist', v: 'A chevron pointing down at the centre', peak: 'A seam rising to a peak at the centre' },
	leg: { standard: 'A moderate leg line', high: 'A high leg line, the usual competition cut', competition: 'The highest cut, peaking just under the hip bone' },
};
// elements shown for this block: straps only on a sleeveless leotard, the armhole only with sleeves
export const elementsOf = (cur) => ELEMENTS.filter(([k]) => (k === 'strap' ? cur.sleeves === 'tank' : k === 'armhole' ? cur.sleeves !== 'tank' : true));
// Open an element of the cut: its options show in the card and the view turns to it. (Also the callouts' click.)
export function openElement(k) {
	showFacet('shape', 'cut');
	shapeElement.value = k;
	if (prefs.value.followCamera) focusOn(k);
}
const nameOf = (k) => (ELEMENTS.find(([e]) => e === k)?.[1] ?? k).toLowerCase();

function Silhouette({ doc }) {
	const cur = blockOf(doc), started = doc.curves.length > 0, shown = elementsOf(cur);
	const open = shown.some(([k]) => k === shapeElement.value) ? shapeElement.value : shown[0][0], [, name] = ELEMENTS.find(([k]) => k === open);
	const [ask, setAsk] = useState(null); // { patch, impact }
	const [applying, setApplying] = useState(null); // 'neck:v' while a change is being made
	const r = rev.value; // any real change to the design (not a dry run) withdraws the question
	useEffect(() => setAsk(null), [r, open]);
	const apply = async (patch) => {
		const [k, v] = Object.entries(patch)[0];
		setAsk(null); setApplying(k + ':' + v);
		await slow(`Changing the ${nameOf(k)}…`, () => run({ op: 'block.set', ...patch }));
		setApplying(null);
	};
	const change = (patch) => {
		setAsk(null);
		try {
			const impact = app.exec({ op: 'block.set', ...patch }, { dryRun: true });
			if (impact && (impact.stones.length || impact.pieces.length || impact.straps.length || impact.lines.length)) { setAsk({ patch, impact }); return; }
		} catch (e) { notify(e.message, 'error'); return; }
		apply(patch);
	};
	const value = started ? cur[open] : null;
	return (
		<>
			<div class="el-strip" role="tablist" aria-label="The parts of the cut">
				{shown.map(([k, full, short]) => (
					<button key={k} class={`el-chip ${k === open ? 'on' : ''}`} role="tab" aria-selected={k === open} title={full} onClick={() => openElement(k)}>
						<span class="el-thumb">{started ? <img key={cur[k]} src={thumb('blocks', k + '-' + cur[k])} alt="" draggable={false} onError={hideBroken} /> : null}</span><span>{short}</span>
					</button>
				))}
			</div>
			{ask ? <Ask ask={ask} onYes={() => apply(ask.patch)} onNo={() => setAsk(null)} /> : (
				<Field label={name} aside={value ? optionLabel(value) : 'Pick one to start a leotard'}>
					<Tiles cols={3} value={value} busyKey={applying?.startsWith(open + ':') ? applying.slice(open.length + 1) : null} onPick={(v) => change({ [open]: v })}
						items={BLOCK_OPTIONS[open].filter((o) => o !== 'wide').map((o) => {
							// a neckline or back the straps cannot hold is greyed out
							const off = started && !blockAllows(cur, open, o);
							return { key: o, label: optionLabel(o), hint: off ? `Not with ${cur.strap} straps` : OPTION_HINTS[open]?.[o] ?? optionLabel(o), img: thumb('blocks', open + '-' + o), disabled: off };
						})} />
				</Field>
			)}
		</>
	);
}

function Ask({ ask, onYes, onNo }) {
	const { impact, patch } = ask, [k, v] = Object.entries(patch)[0];
	const list = (items, one, many) => (items.length ? `${items.length === 1 ? one : many} (${items.join(', ')})` : null);
	const parts = [list(impact.stones, 'the stones', 'the stones'), list(impact.pieces, 'the piece', 'the pieces'), impact.straps.length ? `${impact.straps.length} strap${impact.straps.length > 1 ? 's' : ''}` : null].filter(Boolean);
	const loose = impact.lines.length ? `${impact.lines.length === 1 ? 'A drawn line comes' : impact.lines.length + ' drawn lines come'} loose from it (${impact.lines.join(', ')}).` : '';
	return (
		<div class="ask" role="alert">
			<p>{parts.length ? `Changing the ${nameOf(k)} to ${optionLabel(v)} takes away ${parts.join(' and ')}. ` : `Changing the ${nameOf(k)} to ${optionLabel(v)}: `}{loose} Everything else stays.</p>
			<div class="btn-row"><Button kind="primary" onClick={onYes}>Change it</Button><Button kind="quiet" onClick={onNo}>Keep as is</Button></div>
		</div>
	);
}

// --- which garment: the drawn pieces, or a fitted one (garment/fitted.js) ---------------------------------
// The drawn pieces stay in the design either way; their Front, Back and Sleeve panels dress the fitted pieces.
function Garment({ doc }) {
	rev.value; // (the record it shows is edited in place: without this it would redraw only for a changed prop, ui/state.js rev)
	const f = fittedOf(doc);
	// a fitted garment loads its file and is fitted on the body shown (a second or two): the pick shows at once, the stage says so until it is on show
	const [pending, setPending] = useState(undefined);
	const pick = async (key) => {
		setPending(key);
		try { await slow(key ? 'Fitting the garment…' : 'Changing the garment…', () => run({ op: 'fitted.set', key })); } finally { setPending((p) => (p === key ? undefined : p)); }
	};
	const on = pending !== undefined ? pending : f?.key ?? null;
	const options = [{ key: null, label: 'Drawn', leg: 'Shaped by Silhouette', hint: 'The pieces drawn on the body, shaped by the Silhouette options' },
		...FITTED.map((x) => ({ key: x.key, label: x.label.replace(/ \(local\)$/, '').replace(/, high cut$/, ''), leg: x.leg, hint: x.hint ?? `${x.leg}; drafted from a textbook block and fitted by simulation on the ${x.fittedOn} body` }))];
	return (
		<>
			<div class="garments" role="radiogroup" aria-label="Garment">
				{options.map((x) => <button key={String(x.key)} class={`garment ${x.key === on ? 'on' : ''}`} role="radio" aria-checked={x.key === on} title={x.hint} onClick={() => x.key !== on && pick(x.key)}><b>{x.label}</b><small>{x.leg}</small></button>)}
			</div>
			{f ? <>
				<FitSize doc={doc} />
				<Hint>Fitted on the {f.fittedOn} body. Silhouette shapes the drawn pieces, not this one; its fabric comes from the Front, Back and Sleeve pieces.</Hint>
			</> : null}
		</>
	);
}

// The fitted garment's pattern size: smaller sits tauter on the body, larger looser. Applied when let go (each change re-fits it).
function FitSize({ doc }) {
	const size = fitSizeOf(doc), pct = (v) => Math.round(v * 100) + '%';
	const set = (k) => (v) => run({ op: 'fitted.size', [k]: v });
	const hint = "The pattern's size against the block as drafted (100%). Smaller pulls the fabric tauter.";
	return <>
		<CommitSlider label="Width" hint={hint} value={size.width} min={FIT_SIZE_RANGE[0]} max={FIT_SIZE_RANGE[1]} step={0.01} format={pct} onCommit={set('width')} />
		<CommitSlider label="Length" hint={hint} value={size.length} min={FIT_SIZE_RANGE[0]} max={FIT_SIZE_RANGE[1]} step={0.01} format={pct} onCommit={set('length')} />
	</>;
}

// --- what the designer drew: lines (not the block's own) and straps -------------------------------

const ROLE_LABELS = { seam: 'Seam', edge: 'Edge', print: 'Print line', guide: 'Guide', 'strap-path': 'Strap path', 'trim-path': 'Trim path' };
const DRAW = [
	['pen', 'Seam', <I.pen size={21} />, 'Draw a seam: it joins two pieces edge to edge (P)'],
	['strap', 'Strap', <I.strap size={21} />, 'Draw a strap from edge to edge (S)'],
	['overlay', 'Overlay piece', <I.fill size={21} />, 'A piece cut to shape and stitched on top of the fabric, which stays whole under it (appliqué). Draw its new edges from seam to seam, then click the area (O)'],
];
function Drawn({ doc }) {
	rev.value; // (the record it shows is edited in place: without this it would redraw only for a changed prop, ui/state.js rev)
	// the block's own lines (keyed, or named so in designs saved before keys) are the silhouette's
	const t = tool.value, lines = doc.curves.filter((c) => !blockKeyOf(c) && c.role !== 'strap-path'), straps = doc.straps;
	const sel = selection.value;
	return (
		<>
			<div class="modes">
				{DRAW.map(([id, label, icon, hint]) => <button key={id} class={`mode ${t === id ? 'on' : ''}`} title={hint} aria-pressed={t === id} onClick={() => { tool.value = t === id ? 'move' : id; }}>{icon}<span>{label}</span></button>)}
			</div>
			{t === 'pen' ? <PenOptions /> : t === 'strap' ? <StrapToolOptions /> : null}
			{lines.length || straps.length ? (
				<Field label="On this design">
					<div class="part-list">
						{lines.map((c) => <PartRow key={c.id} icon={<I.lines size={18} />} label={c.name || 'Line ' + c.id} meta={ROLE_LABELS[c.role] ?? c.role} on={sel?.id === c.id} onClick={() => { selection.value = { kind: 'curves', id: c.id }; }} />)}
						{straps.map((s, i) => <PartRow key={s.id} swatch={s.fabric?.colour ?? '#222'} label={s.name || 'Strap ' + (i + 1)} meta={`${(s.width * 1000).toFixed(0)} mm`} on={sel?.id === s.id} onClick={() => { selection.value = { kind: 'straps', id: s.id }; }} />)}
					</div>
				</Field>
			) : <Hint>A seam joins two pieces edge to edge. An overlay piece is sewn on top of the fabric, which stays whole under it. Tap any line on the leotard to change it.</Hint>}
		</>
	);
}

const PEN_ROLES = [['seam', 'Seam'], ['edge', 'Edge'], ['print', 'Print line'], ['guide', 'Guide']];
function PenOptions() {
	const o = toolOptions.value, set = (patch) => { toolOptions.value = { ...o, ...patch }; };
	return <Field label="It draws"><Segmented value={o.penRole} options={PEN_ROLES} onPick={(v) => set({ penRole: v })} /></Field>;
}

function StrapToolOptions() {
	const o = toolOptions.value, sw = o.swatch, set = (patch) => { toolOptions.value = { ...o, ...patch }; };
	return (
		<Field label="The next strap">
			<Slider label="Width" value={o.strapWidth} min={0.003} max={0.04} step={0.0005} format={mm} onChange={(v) => set({ strapWidth: v })} />
			<LookWells look={{ fabric: sw.fabric, colour: sw.colour, second: sw.second }} set={(patch) => set({ swatch: { ...sw, ...patch } })} />
		</Field>
	);
}

const mm = (v) => (v * 1000).toFixed(0) + ' mm';
const toShape = () => { selection.value = null; };

// --- a selected line ------------------------------------------------------------------------------

const SHAPES = [['none', 'Plain'], ['scallop', 'Scallop'], ['zigzag', 'Zigzag'], ['wave', 'Wave']];
export function LineCard({ id }) {
	rev.value;
	const doc = app.doc, c = doc.curves.find((x) => x.id === id);
	if (!c) return <Card kind="gone" title="This line no longer exists" onBack={toShape} backLabel="Shape">{() => null}</Card>;
	const sh = c.shape ?? { mod: 'none', amp: 0, period: 0.01 }, own = !blockKeyOf(c), sewn = c.role === 'edge' || c.role === 'seam';
	const set = (patch, g) => run({ op: 'curve.set', id: c.id, ...patch, ...(g ? { gesture: g } : {}) });
	return (
		<Card kind="line" title={c.name ?? ''} placeholder={'Line ' + c.id} onRename={(v) => set({ name: v })} onBack={toShape} backLabel="Shape"
			actions={<IconButton icon={<I.trash size={18} />} label="Delete this line (Delete)" kind="danger" onClick={() => { run({ op: 'curve.remove', id: c.id }); selection.value = null; }} />}
			faces={[...(sewn ? [['finish', isOpening(c) ? 'Edge finish' : 'Seam finish']] : []), ['edge', 'Edge shape'], ['line', 'Line']]}>
			{(face) => face === 'finish' ? <Finish c={c} doc={doc} /> : face === 'edge' ? <>
				<Tiles cols={4} value={sh.mod} onPick={(v) => set({ shape: { ...sh, mod: v, amp: sh.amp || 0.004, period: sh.period || 0.015 } })}
					items={SHAPES.map(([k, l]) => ({ key: k, label: l, icon: (() => { const Ic = EDGE_ICONS[k]; return <Ic size={30} />; })() }))} />
				{sh.mod !== 'none' ? <>
					<Slider label="Depth" value={sh.amp} min={-0.015} max={0.015} step={0.0005} format={mm} onChange={(v, g) => set({ shape: { ...sh, amp: v } }, g)} />
					<Slider label="Repeat" value={sh.period} min={0.004} max={0.06} step={0.001} format={mm} onChange={(v, g) => set({ shape: { ...sh, period: v } }, g)} />
				</> : null}
			</> : <>
				{own || !sewn ? <Field label="Kind">
					<Segmented value={c.role} cols={PEN_ROLES.some(([v]) => v === c.role) ? 4 : 5} options={[...PEN_ROLES, ...(PEN_ROLES.some(([v]) => v === c.role) ? [] : [[c.role, ROLE_LABELS[c.role] ?? c.role]])]} onPick={(v) => set({ role: v })} />
				</Field> : null}
				{own ? <Switch label="Closed loop" value={!!c.closed} onChange={(v) => set({ closed: v })} /> : null}
				<Hint>Drag its points on the leotard. Alt-click the line to add a point; C turns the last point into a corner; Delete removes it.</Hint>
			</>}
		</Card>
	);
}

// Slider ranges for each finish (metres). Working assumptions, not sourced maker limits: check them
// against knowledge/domain/construction/edge-finishing-elastic-and-binding.md and a real maker.
const WIDTHS = { elastic: [0.005, 0.02], binding: [0.003, 0.016], piping: [0.0015, 0.006], tape: [0.003, 0.02], zigzag: [0.001, 0.005] };

// Is this line the edge of the fabric on its layer (an opening, or an overlay piece's outline), as
// the rims draw it? A line with fabric on both sides is a seam whatever it is called, and an opening's
// finishes (elastic, binding) cannot go on it.
function isOpening(c) {
	const loops = app.engine?.layers?.get(c.layer ?? 'L0')?.rims?.loops ?? [];
	return loops.some((l) => l.curves.some((k) => k && k.replace(/~m$/, '') === c.id));
}

// The fabric beside a line: a stitched edge is sewn in thread to match it.
function lookBeside(c) {
	const e = app.engine, ev = e?.evaluated?.get(c.id), g = e?.layers?.get(c.layer ?? 'L0')?.g;
	if (!ev?.sps.length || !g) return null;
	const id = panelAt(g, app.doc, e.surf, ev.sps[ev.sps.length >> 1]);
	return app.doc.panels.find((p) => p.id === id)?.stack?.[0] ?? null;
}

// How a line is sewn. On an opening: elastic, binding, a raw cut or a narrow zigzag edge. Between two
// fabrics: a plain seam, piping, tape or a zigzag. Only the finishes this line can really take are offered.
function Finish({ c, doc }) {
	rev.value;
	const opening = isOpening(c), t = doc.trims.find((x) => x.on.includes(c.id));
	const kinds = opening ? [['elastic', 'Turned elastic'], ['binding', 'Binding'], ['zigzag', 'Narrow zigzag'], ['none', 'Raw cut']] : [['none', 'Plain seam', 'seam'], ['piping', 'Piping'], ['tape', 'Flat tape'], ['zigzag', 'Narrow zigzag']];
	const fallback = opening ? 'elastic' : 'none', kind = t && kinds.some(([k]) => k === t.kind) ? t.kind : fallback;
	const beside = lookBeside(c), f = t?.fabric ?? { fabric: 'shiny', colour: '#ffffff', second: 'Tone-on-tone' };
	const contrast = kind === 'binding' || kind === 'piping' || kind === 'tape', ownFabric = contrast || (kind === 'zigzag' && !opening);
	const fabricFor = (v) => (v === 'binding' || v === 'piping' || v === 'tape' ? { fabric: f } : v === 'zigzag' && !opening && beside ? { fabric: beside } : {});
	const range = WIDTHS[kind], width = t?.width ?? TRIMS[kind]?.width;
	const lookSet = (patch, g) => { if (f.material) run({ op: 'material.set', id: f.material, ...patch, ...(g ? { gesture: g } : {}) }); };
	return (
		<>
			<Tiles cols={4} value={kind} onPick={(v) => run({ op: 'trim.set', on: c.id, kind: v, ...fabricFor(v) })}
				items={kinds.map(([k, l, ic]) => { const Ic = FINISH_ICONS[ic ?? k]; return { key: k, label: l, icon: <Ic size={32} /> }; })} />
			{range ? <Slider label="Width" value={width} min={range[0]} max={range[1]} step={0.0005} format={(v) => (v * 1000).toFixed(1) + ' mm'} onChange={(v, g) => run({ op: 'trim.set', on: c.id, kind, width: v, ...(ownFabric ? { fabric: f } : {}), ...(g ? { gesture: g } : {}) })} /> : null}
			{kind === 'none' && !opening ? <Hint>A plain seam joins two fabrics edge to edge with the stitching inside, so it has no visible width of its own. For a visible edge choose piping, tape or a narrow zigzag; for a shape sewn on top of the fabric, use an overlay piece.</Hint> : null}
			{kind === 'zigzag' && opening ? <Hint>Sewn in thread to match this piece.</Hint> : null}
			{ownFabric ? <>
				<MaterialChoice value={f.material} doc={doc} kind="finish" onPick={(m) => run({ op: 'trim.set', on: c.id, kind, width: t?.width, material: m })} />
				<LookWells look={f} set={lookSet} />
			</> : null}
			{c.role === 'edge' && opening && !doc.panels.some((p) => overlayLines(doc, p).includes(c.id)) ? <div class="btn-row"><Button icon={<I.band size={18} />} title="A band of fabric along this edge: a mock-neck collar, a cuff" onClick={() => run({ op: 'band.add', on: c.id, ...toolOptions.value.swatch })}>Add a band on this edge</Button></div> : null}
		</>
	);
}

// --- a selected strap ------------------------------------------------------------------------------

export function StrapCard({ id }) {
	rev.value;
	const doc = app.doc, s = doc.straps.find((x) => x.id === id);
	if (!s) return <Card kind="gone" title="This strap no longer exists" onBack={toShape} backLabel="Shape">{() => null}</Card>;
	const f = s.fabric ?? {}, i = doc.straps.indexOf(s);
	const set = (patch, g) => run({ op: 'strap.set', id: s.id, ...patch, ...(g ? { gesture: g } : {}) });
	const look = { fabric: f.fabric ?? 'matte', colour: f.colour ?? '#222222', second: f.second ?? 'Tone-on-tone', colour2: f.colour2 ?? null, texture: f.texture ?? null, texMode: f.texMode };
	return (
		<Card kind="strap" title={s.name || 'Strap ' + (i + 1)} onBack={toShape} backLabel="Shape"
			actions={<IconButton icon={<I.trash size={18} />} label="Delete this strap" kind="danger" onClick={() => { run({ op: 'strap.remove', id: s.id }); selection.value = null; }} />}
			faces={[['strap', 'Strap'], ['colour', 'Colour'], ['fabric', 'Fabric']]}>
			{(face) => face === 'strap' ? <>
				<Slider label="Width" value={s.width} min={0.003} max={0.04} step={0.0005} format={mm} onChange={(v, g) => set({ width: v }, g)} />
				<Field label="Edges"><Segmented value={s.edge ?? 'elastic'} options={[['elastic', 'Topstitched'], ['none', 'Plain']]} onPick={(v) => set({ edge: v })} /></Field>
				<Stepper label={`Stacking: over ${s.layer ?? 0} other${(s.layer ?? 0) === 1 ? '' : 's'}`} value={s.layer ?? 0} min={0} max={8} onChange={(v) => set({ layer: v })} />
			</> : face === 'colour' ? <>
				<MaterialChoice value={f.material} doc={doc} kind="strap" onPick={(m) => run({ op: 'strap.material', id: s.id, material: m })} onSeparate={() => run({ op: 'strap.separate', id: s.id })} />
				<Field label="Colour"><ColourFields look={look} set={set} /></Field>
			</> : <FabricBook look={look} set={set} />}
		</Card>
	);
}
