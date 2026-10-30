// The Shape tab: the leotard's silhouette element by element (neckline, back, sleeves or straps,
// armhole, leg cut, front yoke, waist seam), each folding open to its options as close-up tiles
// (pre-rendered by src/dev/thumbnails.js blocks); the lines and straps the designer drew; and the
// editors of a selected line or strap. Opening an element turns the view to it (ui/camera.js).
// Picking an option changes that element only (block.set); when the change would take away
// something the designer added (stones on a line that goes, a piece in an opening) the tab asks
// first and keeps everything else either way.
import { useEffect, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection, tool, prefs, setPref, notify, slow } from './state.js';
import { toolOptions } from './tools.js';
import { run, Section, Field, Tiles, Segmented, Slider, Switch, Stepper, Button, IconButton, PartHeader, PartRow, Hint, thumb } from './kit.jsx';
import { I, EDGE_ICONS, FINISH_ICONS } from './icons.jsx';
import { LookControls, fabricLabel } from './FabricTab.jsx';
import { focusOn } from './camera.js';
import { BLOCK_OPTIONS, blockOf, blockAllows, blockKeyOf } from '../garment/blocks.js';

export function ShapeTab() {
	rev.value;
	const sel = selection.value, doc = app.doc;
	if (sel?.kind === 'curves') return <LineEditor key={sel.id} id={sel.id} doc={doc} />;
	if (sel?.kind === 'straps') return <StrapEditor key={sel.id} id={sel.id} doc={doc} />;
	return <><Silhouette doc={doc} /><Drawn doc={doc} /></>;
}

// --- the silhouette, element by element ---------------------------------------------------------

export const ELEMENTS = [['neck', 'Neckline'], ['back', 'Back'], ['sleeves', 'Sleeves'], ['strap', 'Straps'], ['armhole', 'Armhole'], ['leg', 'Leg cut'], ['yoke', 'Front yoke'], ['waist', 'Waist seam']];
const OPTION_LABELS = { v: 'V', 'set-in': 'Set-in', 'three-quarter': '¾ length', none: 'None', peak: 'Peak', straight: 'Straight', sweetheart: 'Sweetheart', high: 'High', competition: 'Competition', standard: 'Standard' };
export const optionLabel = (o) => OPTION_LABELS[o] ?? o.charAt(0).toUpperCase() + o.slice(1);
const OPTION_HINTS = {
	strap: { tank: 'A 5-6 cm tank strap', narrow: 'A 3 cm strap set out towards the shoulder', thin: 'A 1 cm camisole strap', racer: 'Cut in towards the neck, with a crew or high neck' },
	yoke: { none: 'No yoke seam', sweetheart: 'A mesh yoke to a sweetheart edge', v: 'A mesh yoke to a V', straight: 'A mesh yoke to a straight edge', round: 'A mesh yoke to a shallow curve' },
	waist: { none: 'No waist seam', straight: 'A straight seam at the waist', v: 'A chevron pointing down at the centre', peak: 'A seam rising to a peak at the centre' },
	leg: { standard: 'A moderate leg line', high: 'A high leg line, the usual competition cut', competition: 'The highest cut, peaking just under the hip bone' },
};
// elements shown for this block: straps only on a sleeveless leotard, the armhole only with sleeves
const shown = (k, cur) => (k === 'strap' ? cur.sleeves === 'tank' : k === 'armhole' ? cur.sleeves !== 'tank' : true);

function Silhouette({ doc }) {
	const cur = blockOf(doc), started = doc.curves.length > 0, open = prefs.value.shapeOpen;
	const [ask, setAsk] = useState(null); // { patch, impact }
	const [applying, setApplying] = useState(null); // 'neck:v' while a change is being made
	const r = rev.value; // any real change to the design (not a dry run) withdraws the question
	useEffect(() => setAsk(null), [r]);
	const toggle = (k) => {
		const next = open === k ? null : k;
		setPref('shapeOpen', next);
		if (next && prefs.value.followCamera) focusOn(next);
	};
	const apply = async (patch) => {
		const [k, v] = Object.entries(patch)[0];
		setAsk(null); setApplying(k + ':' + v);
		await slow(`Changing the ${label(k)}…`, () => run({ op: 'block.set', ...patch }));
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
	return (
		<Section title="Silhouette" note={started ? null : 'Pick any element to start a leotard.'}>
			<div class="elements">
				{ELEMENTS.filter(([k]) => shown(k, cur)).map(([k, name]) => {
					const value = started ? cur[k] : null, isOpen = open === k;
					return (
						<div key={k} class={`element ${isOpen ? 'open' : ''}`}>
							<button class="el-row" aria-expanded={isOpen} onClick={() => toggle(k)}>
								<span class="el-thumb">{value ? <img src={thumb('blocks', k + '-' + value)} alt="" draggable={false} /> : null}</span>
								<span class="el-text"><span class="el-name">{name}</span><span class="el-value">{value ? optionLabel(value) : '—'}</span></span>
								<I.chevronDown size={18} class="el-chev" />
							</button>
							<div class="el-body"><div class="el-inner">
								<Tiles cols={3} value={value} busyKey={applying?.startsWith(k + ':') ? applying.slice(k.length + 1) : null} onPick={(v) => change({ [k]: v })}
									items={BLOCK_OPTIONS[k].filter((o) => o !== 'wide').map((o) => {
										// a neckline or back the straps cannot hold is greyed out
										const off = started && !blockAllows(cur, k, o);
										return { key: o, label: optionLabel(o), hint: off ? `Not with ${cur.strap} straps` : OPTION_HINTS[k]?.[o] ?? optionLabel(o), img: thumb('blocks', k + '-' + o), disabled: off };
									})} />
								{ask && k in ask.patch ? <Ask ask={ask} onYes={() => apply(ask.patch)} onNo={() => setAsk(null)} /> : null}
							</div></div>
						</div>
					);
				})}
			</div>
		</Section>
	);
}
const label = (k) => (ELEMENTS.find(([e]) => e === k)?.[1] ?? k).toLowerCase();

function Ask({ ask, onYes, onNo }) {
	const { impact, patch } = ask, [k, v] = Object.entries(patch)[0];
	const list = (items, one, many) => (items.length ? `${items.length === 1 ? one : many} (${items.join(', ')})` : null);
	const parts = [list(impact.stones, 'the stones', 'the stones'), list(impact.pieces, 'the piece', 'the pieces'), impact.straps.length ? `${impact.straps.length} strap${impact.straps.length > 1 ? 's' : ''}` : null].filter(Boolean);
	const loose = impact.lines.length ? `${impact.lines.length === 1 ? 'A drawn line comes' : impact.lines.length + ' drawn lines come'} loose from it (${impact.lines.join(', ')}).` : '';
	return (
		<div class="ask" role="alert">
			<p>{parts.length ? `Changing the ${label(k)} to ${optionLabel(v)} takes away ${parts.join(' and ')}. ` : `Changing the ${label(k)} to ${optionLabel(v)}: `}{loose} Everything else stays.</p>
			<div class="btn-row"><Button kind="primary" onClick={onYes}>Change it</Button><Button kind="quiet" onClick={onNo}>Keep as is</Button></div>
		</div>
	);
}

// --- what the designer drew: lines (not the block's own) and straps -------------------------------

const ROLE_LABELS = { seam: 'Seam', edge: 'Edge', print: 'Print line', guide: 'Guide', 'strap-path': 'Strap path', 'trim-path': 'Trim path' };
function Drawn({ doc }) {
	rev.value;
	// the block's own lines (keyed, or named so in designs saved before keys) are the silhouette's
	const t = tool.value, lines = doc.curves.filter((c) => !blockKeyOf(c) && c.role !== 'strap-path'), straps = doc.straps;
	const sel = selection.value;
	return (
		<Section title="Lines and straps" id="shape-drawn">
			<div class="btn-row">
				<Button icon={<I.pen size={18} />} active={t === 'pen'} onClick={() => { tool.value = t === 'pen' ? 'move' : 'pen'; }}>Draw a seam</Button>
				<Button icon={<I.strap size={18} />} active={t === 'strap'} onClick={() => { tool.value = t === 'strap' ? 'move' : 'strap'; }}>Draw a strap</Button>
			</div>
			{t === 'pen' ? <PenOptions /> : t === 'strap' ? <StrapToolOptions /> : null}
			{lines.length || straps.length ? (
				<div class="part-list">
					{lines.map((c) => <PartRow key={c.id} icon={<I.lines size={18} />} label={c.name || 'Line ' + c.id} meta={ROLE_LABELS[c.role] ?? c.role} on={sel?.id === c.id} onClick={() => { selection.value = { kind: 'curves', id: c.id }; }} />)}
					{straps.map((s, i) => <PartRow key={s.id} swatch={s.fabric?.colour ?? '#222'} label={s.name || 'Strap ' + (i + 1)} meta={`${(s.width * 1000).toFixed(0)} mm`} on={sel?.id === s.id} onClick={() => { selection.value = { kind: 'straps', id: s.id }; }} />)}
				</div>
			) : <Hint>Draw your own seams to split a piece in two, or straps across an opening. Tap any line on the model to change it.</Hint>}
		</Section>
	);
}

const PEN_ROLES = [['seam', 'Seam'], ['edge', 'Edge'], ['print', 'Print line'], ['guide', 'Guide']];
function PenOptions() {
	const o = toolOptions.value, set = (patch) => { toolOptions.value = { ...o, ...patch }; };
	return (
		<div class="tool-opts">
			<Field label="Draws"><Segmented value={o.penRole} options={PEN_ROLES} onPick={(v) => set({ penRole: v })} /></Field>
		</div>
	);
}

function StrapToolOptions() {
	const o = toolOptions.value, sw = o.swatch, set = (patch) => { toolOptions.value = { ...o, ...patch }; };
	return (
		<div class="tool-opts">
			<Field label="Width"><Slider value={o.strapWidth} min={0.003} max={0.04} step={0.0005} format={mm} onChange={(v) => set({ strapWidth: v })} /></Field>
			<LookControls look={{ fabric: sw.fabric, colour: sw.colour, second: sw.second }} set={(patch) => set({ swatch: { ...sw, ...patch } })} />
		</div>
	);
}

const mm = (v) => (v * 1000).toFixed(0) + ' mm';

// --- a selected line ------------------------------------------------------------------------------

const SHAPES = [['none', 'Plain'], ['scallop', 'Scallop'], ['zigzag', 'Zigzag'], ['wave', 'Wave']];
function LineEditor({ id, doc }) {
	const c = doc.curves.find((x) => x.id === id);
	const back = () => { selection.value = null; };
	if (!c) return <><PartHeader back="Shape" onBack={back} title="This line no longer exists" /></>;
	const sh = c.shape ?? { mod: 'none', amp: 0, period: 0.01 }, own = !blockKeyOf(c);
	const set = (patch, g) => run({ op: 'curve.set', id: c.id, ...patch, ...(g ? { gesture: g } : {}) });
	return (
		<>
			<PartHeader back="Shape" onBack={back} title={c.name ?? ''} placeholder={'Line ' + c.id} onRename={(v) => set({ name: v })}
				actions={<IconButton icon={<I.trash size={18} />} label="Delete this line (Delete)" kind="danger" onClick={() => { run({ op: 'curve.remove', id: c.id }); selection.value = null; }} />} />
			<Section>
				{own || !['edge', 'seam'].includes(c.role) ? <Field label="Kind">
					<Segmented value={c.role} options={[...PEN_ROLES, ...(PEN_ROLES.some(([v]) => v === c.role) ? [] : [[c.role, ROLE_LABELS[c.role] ?? c.role]])]} onPick={(v) => set({ role: v })} />
				</Field> : null}
				{own ? <Switch label="Closed loop" value={!!c.closed} onChange={(v) => set({ closed: v })} /> : null}
				<Hint>Drag its points on the model. Alt-click the line to add a point; C turns the last point into a corner; Delete removes it.</Hint>
			</Section>
			<FinishSection c={c} doc={doc} />
			<Section title="Edge shape">
				<Tiles cols={4} compact value={sh.mod} onPick={(v) => set({ shape: { ...sh, mod: v, amp: sh.amp || 0.004, period: sh.period || 0.015 } })}
					items={SHAPES.map(([k, l]) => ({ key: k, label: l, icon: (() => { const Ic = EDGE_ICONS[k]; return <Ic size={30} />; })() }))} />
				{sh.mod !== 'none' ? <>
					<Field label="Depth"><Slider value={sh.amp} min={-0.015} max={0.015} step={0.0005} format={mm} onChange={(v, g) => set({ shape: { ...sh, amp: v } }, g)} /></Field>
					<Field label="Repeat"><Slider value={sh.period} min={0.004} max={0.06} step={0.001} format={mm} onChange={(v, g) => set({ shape: { ...sh, period: v } }, g)} /></Field>
				</> : null}
			</Section>
		</>
	);
}

// Edge finish of a line: elastic, binding or raw on an edge; piping or tape on a seam; bands on edges.
function FinishSection({ c, doc }) {
	if (c.role !== 'edge' && c.role !== 'seam') return null;
	const t = doc.trims.find((x) => x.on.includes(c.id));
	const kind = t?.kind ?? (c.role === 'edge' ? 'elastic' : 'none');
	const kinds = c.role === 'edge' ? [['elastic', 'Turned elastic'], ['binding', 'Binding'], ['none', 'Raw cut']] : [['none', 'Plain seam', 'seam'], ['piping', 'Piping'], ['tape', 'Flat tape']];
	const f = t?.fabric ?? { fabric: 'shiny', colour: '#ffffff', second: 'Tone-on-tone' };
	const coloured = kind === 'binding' || kind === 'piping' || kind === 'tape';
	const set = (patch) => run({ op: 'trim.set', on: c.id, kind, fabric: f, ...patch });
	return (
		<Section title={c.role === 'edge' ? 'Edge finish' : 'Seam finish'}>
			<Tiles cols={3} compact value={kind} onPick={(v) => run({ op: 'trim.set', on: c.id, kind: v, ...(v === 'binding' || v === 'piping' || v === 'tape' ? { fabric: f } : {}) })}
				items={kinds.map(([k, l, ic]) => { const Ic = FINISH_ICONS[ic ?? k]; return { key: k, label: l, icon: <Ic size={32} /> }; })} />
			{coloured ? <LookControls look={f} set={(patch) => set({ fabric: { ...f, ...patch } })} /> : null}
			{c.role === 'edge' ? <div class="btn-row"><Button icon={<I.band size={18} />} title="A band of fabric along this edge: a mock-neck collar, a cuff" onClick={() => run({ op: 'band.add', on: c.id, ...toolOptions.value.swatch })}>Add a band on this edge</Button></div> : null}
		</Section>
	);
}

// --- a selected strap ------------------------------------------------------------------------------

function StrapEditor({ id, doc }) {
	const s = doc.straps.find((x) => x.id === id);
	const back = () => { selection.value = null; };
	if (!s) return <PartHeader back="Shape" onBack={back} title="This strap no longer exists" />;
	const f = s.fabric ?? {}, i = doc.straps.indexOf(s);
	const set = (patch, g) => run({ op: 'strap.set', id: s.id, ...patch, ...(g ? { gesture: g } : {}) });
	return (
		<>
			<PartHeader back="Shape" onBack={back} title={'Strap ' + (i + 1)}
				actions={<IconButton icon={<I.trash size={18} />} label="Delete this strap" kind="danger" onClick={() => { run({ op: 'strap.remove', id: s.id }); selection.value = null; }} />} />
			<Section>
				<Field label="Width"><Slider value={s.width} min={0.003} max={0.04} step={0.0005} format={mm} onChange={(v, g) => set({ width: v }, g)} /></Field>
				<Field label="Edges"><Segmented value={s.edge ?? 'elastic'} options={[['elastic', 'Topstitched'], ['none', 'Plain']]} onPick={(v) => set({ edge: v })} /></Field>
				<Field label="Stacking" aside={<span class="field-value">over {s.layer ?? 0} other{(s.layer ?? 0) === 1 ? '' : 's'}</span>}>
					<Stepper value={s.layer ?? 0} min={0} max={8} onChange={(v) => set({ layer: v })} />
				</Field>
			</Section>
			<Section title="Look" aside={<span class="sec-value">{fabricLabel(f.fabric)}</span>}>
				<LookControls look={{ fabric: f.fabric ?? 'matte', colour: f.colour ?? '#222222', second: f.second ?? 'Tone-on-tone', colour2: f.colour2 ?? null, texture: f.texture ?? null, texMode: f.texMode }} set={(patch, g) => set(patch, g)} />
			</Section>
		</>
	);
}
