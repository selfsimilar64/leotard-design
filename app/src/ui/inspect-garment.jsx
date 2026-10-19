// Inspector panels for lines (curves) and panels, and the options of the drawing tools.
import { app } from '../instance.js';
import { registerInspector } from './inspectors.js';
import { Section, Row, Select, Colour, Slider, Toggle, run } from './controls.jsx';
import { selection, tool } from './state.js';
import { toolOptions } from './tools.js';
import { StoneToolOptions } from './inspect-stones.jsx';
import { FABRICS, SECOND } from '../materials/fabric.js';
import { FabricPicker } from './FabricPicker.jsx';
import { DecalToolOptions } from './inspect-decals.jsx';

const fabricOptions = Object.entries(FABRICS).map(([k, f]) => [k, f.label]);
const ROLES = [['seam', 'Seam'], ['edge', 'Edge (opening)'], ['print', 'Print line'], ['guide', 'Guide'], ['strap-path', 'Strap path'], ['trim-path', 'Trim path']];
const mm = (v) => (v * 1000).toFixed(0) + ' mm';

function CurveInspector({ sel, doc }) {
	const c = doc.curves.find((x) => x.id === sel.id);
	if (!c) return <div class="section-body dim">Line {sel.id} no longer exists.</div>;
	const sh = c.shape ?? { mod: 'none', amp: 0, period: 0.01 };
	return (
		<>
			<Section title={`Line ${c.name || c.id}`} actions={<button class="btn" onClick={() => { run({ op: 'curve.remove', id: c.id }); selection.value = null; }}>Delete</button>}>
				<Row label="Name"><input type="text" value={c.name ?? ''} onChange={(e) => run({ op: 'curve.set', id: c.id, name: e.currentTarget.value })} /></Row>
				<Row label="Kind"><Select value={c.role} options={ROLES} onChange={(v) => run({ op: 'curve.set', id: c.id, role: v })} /></Row>
				<Row label="Mirror"><Select value={c.mirror ?? 'none'} options={[['both', 'Both sides'], ['none', 'This side only']]} onChange={(v) => run({ op: 'curve.set', id: c.id, mirror: v })} /></Row>
				<Row label="Closed loop"><Toggle value={!!c.closed} onChange={(v) => run({ op: 'curve.set', id: c.id, closed: v })} /></Row>
				<Row label="Points"><span class="dim">{c.points.length} (Alt-click to add, C corner, Del delete)</span></Row>
			</Section>
			<FinishSection c={c} doc={doc} />
			<Section title="Shape">
				<Row label="Edge shape"><Select value={sh.mod} options={[['none', 'Plain'], ['scallop', 'Scallop'], ['zigzag', 'Zigzag'], ['wave', 'Wave']]} onChange={(v) => run({ op: 'curve.set', id: c.id, shape: { ...sh, mod: v, amp: sh.amp || 0.004, period: sh.period || 0.015 } })} /></Row>
				{sh.mod !== 'none' ? (
					<>
						<Row label="Depth"><Slider value={sh.amp} min={-0.015} max={0.015} step={0.0005} format={mm} onChange={(v, g) => run({ op: 'curve.set', id: c.id, shape: { ...sh, amp: v }, gesture: g })} /></Row>
						<Row label="Repeat"><Slider value={sh.period} min={0.004} max={0.06} step={0.001} format={mm} onChange={(v, g) => run({ op: 'curve.set', id: c.id, shape: { ...sh, period: v }, gesture: g })} /></Row>
					</>
				) : null}
			</Section>
		</>
	);
}

// A colour gradient across the panel: along a line (distance from it) or a direction (positions on
// the reference body). start/end in metres; the panel colour at start, the gradient colour at end.
const AXES = { height: { axis: [0, 1, 0], min: 0.5, max: 1.6, label: 'Height' }, across: { axis: [1, 0, 0], min: -0.4, max: 0.4, label: 'Left to right' }, diagonal: { axis: [0.7071, 0.7071, 0], min: 0.2, max: 1.3, label: 'Diagonal' } };
function GradientRows({ p, s, doc }) {
	const o = s.ombre, set = (patch) => run({ op: 'panel.set', id: p.id, ombre: patch === null ? null : { ...o, ...patch } });
	if (!o) return <Row label="Gradient"><button class="btn" onClick={() => run({ op: 'panel.set', id: p.id, ombre: { colour: '#101018', axis: AXES.height.axis, start: 1.25, end: 0.85 } })}>Add gradient</button></Row>;
	const mode = o.curve ? 'line:' + o.curve : Object.keys(AXES).find((k) => JSON.stringify(AXES[k].axis) === JSON.stringify(o.axis)) ?? 'height';
	const lines = doc.curves.filter((c) => c.role !== 'guide').map((c) => ['line:' + c.id, 'From line ' + (c.name || c.id)]);
	const range = o.curve ? { min: 0, max: 0.6 } : AXES[mode] ?? AXES.height;
	const pick = (v) => v.startsWith('line:') ? set({ curve: v.slice(5), axis: undefined, start: 0, end: 0.25 }) : set({ curve: undefined, axis: AXES[v].axis, start: (AXES[v].min + AXES[v].max) / 2 + 0.2, end: (AXES[v].min + AXES[v].max) / 2 - 0.2 });
	return (
		<>
			<Row label="Gradient"><Colour value={o.colour} onChange={(v, g) => run({ op: 'panel.set', id: p.id, ombre: { ...o, colour: v }, gesture: g })} /><button class="btn" onClick={() => set(null)}>Remove</button></Row>
			<Row label="Along"><Select value={mode} options={[...Object.entries(AXES).map(([k, a]) => [k, a.label]), ...lines]} onChange={pick} /></Row>
			<Row label="Starts"><Slider value={o.start} min={range.min} max={range.max} step={0.005} format={mm} onChange={(v, g) => run({ op: 'panel.set', id: p.id, ombre: { ...o, start: v }, gesture: g })} /></Row>
			<Row label="Full colour"><Slider value={o.end} min={range.min} max={range.max} step={0.005} format={mm} onChange={(v, g) => run({ op: 'panel.set', id: p.id, ombre: { ...o, end: v }, gesture: g })} /></Row>
		</>
	);
}

function PanelInspector({ sel, doc }) {
	const p = doc.panels.find((x) => x.id === sel.id);
	if (!p) return <div class="section-body dim">Panel {sel.id} no longer exists.</div>;
	const s = p.stack?.[0] ?? {};
	return (
		<Section title={`Panel ${p.name || p.id}`} actions={<button class="btn" onClick={() => run({ op: p.removed ? 'panel.restore' : 'panel.cut', id: p.id })}>{p.removed ? 'Fill' : 'Cut out'}</button>}>
			<Row label="Name"><input type="text" value={p.name ?? ''} onChange={(e) => run({ op: 'panel.set', id: p.id, name: e.currentTarget.value })} /></Row>
			<FabricPicker look={{ fabric: s.fabric, colour: s.colour ?? '#888888', second: s.second ?? 'Tone-on-tone', colour2: s.colour2 ?? null }} onPick={(v) => run({ op: 'panel.set', id: p.id, fabric: v })} />
			<Row label="Colour"><Colour value={s.colour ?? '#888888'} onChange={(v, g) => run({ op: 'panel.set', id: p.id, colour: v, gesture: g })} />
				<button class="btn" title="Pick the colour from a reference photo (look through it, then click the panel)" onClick={() => { toolOptions.value = { ...toolOptions.value, eyedrop: { panel: p.id, layer: 0 } }; tool.value = 'eyedrop'; }}>Pick</button></Row>
			<Row label="Foil / second"><Select value={s.colour2 ? 'custom' : s.second ?? 'Tone-on-tone'} options={[...SECOND, ['custom', 'Custom colour']]} onChange={(v) => run(v === 'custom' ? { op: 'panel.set', id: p.id, colour2: s.colour2 ?? '#c0c0c8' } : { op: 'panel.set', id: p.id, second: v, colour2: null })} /></Row>
			{s.colour2 ? <Row label="Second colour"><Colour value={s.colour2} onChange={(v, g) => run({ op: 'panel.set', id: p.id, colour2: v, gesture: g })} /></Row> : null}
			{FABRICS[s.fabric]?.film || FABRICS[s.fabric]?.duo || FABRICS[s.fabric]?.flake?.holo || FABRICS[s.fabric]?.iridescence ? <Row label="Effect"><Slider value={s.effect ?? 1} min={0} max={2} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v, g) => run({ op: 'panel.set', id: p.id, effect: v, gesture: g })} /></Row> : null}
			{FABRICS[s.fabric]?.mesh ? <Row label="Sheerness"><Slider value={s.sheer ?? (3.6276 * FABRICS[s.fabric].mesh.holeR ** 2) ** 2} min={0} max={0.95} step={0.01} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => run({ op: 'panel.set', id: p.id, sheer: v, gesture: g })} /></Row> : null}
			<GradientRows p={p} s={s} doc={doc} />
			<Row label="Print image"><input type="text" placeholder="/moodboard/... or URL" value={s.print?.src ?? ''} onChange={(e) => run({ op: 'panel.set', id: p.id, print: e.currentTarget.value ? { src: e.currentTarget.value, size: s.print?.size ?? [0.2, 0.2] } : null })} /></Row>
			{s.print ? <Row label="Print repeat"><Slider value={s.print.size?.[0] ?? 0.2} min={0.02} max={0.8} step={0.005} format={mm} onChange={(v, g) => run({ op: 'panel.set', id: p.id, print: { ...s.print, size: [v, v * (s.print.size?.[1] ?? 0.2) / (s.print.size?.[0] ?? 0.2)] }, gesture: g })} /></Row> : null}
			<Row label="Scanned fabric"><Select value={s.texture ?? ''} options={[['', 'None (procedural)'], ...scans().map((f) => [f.id, f.name + ' (' + f.id.slice(-4) + ')'])]} onChange={(v) => run({ op: 'panel.set', id: p.id, texture: v || null })} /></Row>
			{s.texture ? (
				<>
					<Row label="Scan colour"><Select value={s.texMode ?? 'original'} options={[['original', 'As scanned'], ['recolour', 'Recolour with colour']]} onChange={(v) => run({ op: 'panel.set', id: p.id, texMode: v })} /></Row>
					<Row label="Scan scale"><Slider value={s.texScale ?? 1} min={0.25} max={4} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v, g) => run({ op: 'panel.set', id: p.id, texScale: v, gesture: g })} /></Row>
				</>
			) : null}
			<Row label="Grain"><Slider value={s.grain ?? 0} min={-Math.PI / 2} max={Math.PI / 2} step={0.01} format={(v) => (v * 180 / Math.PI).toFixed(0) + '°'} onChange={(v, g) => run({ op: 'panel.set', id: p.id, grain: v, gesture: g })} /></Row>
			<Row label="Mirrored"><span class="dim">{p.mirror === 'both' ? 'yes (both sides)' : 'no'}</span></Row>
		</Section>
	);
}

// Edge finish of a line: elastic, binding or none on an edge; piping on a seam; bands on edges.
function FinishSection({ c, doc }) {
	if (c.role !== 'edge' && c.role !== 'seam') return null;
	const t = doc.trims.find((x) => x.on.includes(c.id));
	const kind = t?.kind ?? (c.role === 'edge' ? 'elastic' : 'none');
	const kinds = c.role === 'edge' ? [['elastic', 'Turned elastic'], ['binding', 'Contrast binding'], ['none', 'Raw / laser cut']] : [['none', 'Plain seam'], ['piping', 'Piping'], ['tape', 'Flat tape']];
	const f = t?.fabric ?? { fabric: 'satin', colour: '#ffffff', second: 'Tone-on-tone' };
	const set = (patch) => run({ op: 'trim.set', on: c.id, kind, fabric: f, ...patch });
	return (
		<Section title="Finish">
			<Row label="Finish"><Select value={kind} options={kinds} onChange={(v) => run({ op: 'trim.set', on: c.id, kind: v, ...(v === 'binding' || v === 'piping' || v === 'tape' ? { fabric: f } : {}) })} /></Row>
			{kind === 'binding' || kind === 'piping' || kind === 'tape' ? (
				<>
					<Row label="Fabric"><Select value={f.fabric} options={fabricOptions} onChange={(v) => set({ fabric: { ...f, fabric: v } })} /></Row>
					<Row label="Colour"><Colour value={f.colour} onChange={(v) => set({ fabric: { ...f, colour: v } })} /></Row>
				</>
			) : null}
			{c.role === 'edge' ? <Row label="Band"><button class="btn" onClick={() => run({ op: 'band.add', on: c.id, ...toolOptions.value.swatch })}>Add band on this edge</button></Row> : null}
		</Section>
	);
}

function StrapInspector({ sel, doc }) {
	const s = doc.straps.find((x) => x.id === sel.id);
	if (!s) return <div class="section-body dim">Strap {sel.id} no longer exists.</div>;
	const f = s.fabric ?? {};
	return (
		<Section title={`Strap ${s.id}`} actions={<button class="btn" onClick={() => { run({ op: 'strap.remove', id: s.id }); selection.value = null; }}>Delete</button>}>
			<Row label="Width"><Slider value={s.width} min={0.003} max={0.04} step={0.0005} format={mm} onChange={(v, g) => run({ op: 'strap.set', id: s.id, width: v, gesture: g })} /></Row>
			<Row label="Fabric"><Select value={f.fabric} options={fabricOptions} onChange={(v) => run({ op: 'strap.set', id: s.id, fabric: v })} /></Row>
			<Row label="Colour"><Colour value={f.colour ?? '#222222'} onChange={(v, g) => run({ op: 'strap.set', id: s.id, colour: v, gesture: g })} /></Row>
			<Row label="Foil / second"><Select value={f.second ?? 'Tone-on-tone'} options={SECOND} onChange={(v) => run({ op: 'strap.set', id: s.id, second: v })} /></Row>
			<Row label="Edges"><Select value={s.edge ?? 'elastic'} options={[['elastic', 'Topstitched'], ['none', 'Plain']]} onChange={(v) => run({ op: 'strap.set', id: s.id, edge: v })} /></Row>
			<Row label="Stacking"><Slider value={s.layer ?? 0} min={0} max={8} step={1} format={(v) => String(v)} onChange={(v, g) => run({ op: 'strap.set', id: s.id, layer: v, gesture: g })} /></Row>
		</Section>
	);
}
registerInspector('straps', StrapInspector);

// scanned fabrics available (filled once the texture manifest has loaded)
let scanList = [];
const scans = () => { if (!scanList.length && app.engine?.textures) app.engine.textures.list().then((l) => { scanList = l; }); return scanList; };

registerInspector('curves', CurveInspector);
registerInspector('panels', PanelInspector);

// Tool options, shown above the selection's inspector while a drawing tool is active.
export function ToolOptions() {
	const t = tool.value, o = toolOptions.value, set = (patch) => { toolOptions.value = { ...o, ...patch }; };
	if (t === 'stones' || t === 'single' || t === 'erase') return <StoneToolOptions tool={t} />;
	if (t === 'decal') return <DecalToolOptions />;
	if (t === 'eyedrop') return (
		<Section title="Pick colour">
			<div class="dim">Look through a reference photo (Outliner, Reference photos), then click the panel on the photo. The colour is matched under the current lights; Esc or another tool cancels.</div>
		</Section>
	);
	if (t === 'pen') return (
		<Section title="Pen">
			<Row label="Draws"><Select value={o.penRole} options={ROLES} onChange={(v) => set({ penRole: v })} /></Row>
			<Row label="Mirror"><Select value={o.penMirror} options={[['auto', 'Auto (off at the centre)'], ['both', 'Both sides'], ['none', 'One side']]} onChange={(v) => set({ penMirror: v })} /></Row>
			<div class="dim">Click on the body to place points (Shift: corner). Click the first point to close, or end on another line. Enter or double-click finishes; Esc cancels.</div>
		</Section>
	);
	if (t === 'strap') return (
		<Section title="Strap">
			<div class="dim">Draw the strap's path like a line: click points (Shift: corner), end on an edge; Enter finishes. Mirrored unless it crosses the centre.</div>
			<Row label="Width"><Slider value={o.strapWidth} min={0.003} max={0.04} step={0.0005} format={mm} onChange={(v) => set({ strapWidth: v })} /></Row>
			<Row label="Fabric"><Select value={o.swatch.fabric} options={fabricOptions} onChange={(v) => set({ swatch: { ...o.swatch, fabric: v } })} /></Row>
			<Row label="Colour"><Colour value={o.swatch.colour} onChange={(v) => set({ swatch: { ...o.swatch, colour: v } })} /></Row>
		</Section>
	);
	if (t === 'trim') return (
		<Section title="Edges">
			<div class="dim">Click an edge or a seam to choose its finish (elastic, binding, piping) or add a band.</div>
		</Section>
	);
	if (t === 'fabric' || t === 'cut') return (
		<Section title={t === 'fabric' ? 'Fabric swatch' : 'Cut out'}>
			{t === 'cut' ? <div class="dim">Click a panel to cut it out; click an opening to fill it with this swatch.</div> : <div class="dim">Click a panel to give it this swatch.</div>}
			<Row label="Fabric"><Select value={o.swatch.fabric} options={fabricOptions} onChange={(v) => set({ swatch: { ...o.swatch, fabric: v } })} /></Row>
			<Row label="Colour"><Colour value={o.swatch.colour} onChange={(v) => set({ swatch: { ...o.swatch, colour: v } })} /></Row>
			<Row label="Foil / second"><Select value={o.swatch.second} options={SECOND} onChange={(v) => set({ swatch: { ...o.swatch, second: v } })} /></Row>
		</Section>
	);
	return null;
}

app; // (the inspector reads the design through props)
