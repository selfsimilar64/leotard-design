// Inspector panels for lines (curves) and panels, and the options of the drawing tools.
import { app } from '../instance.js';
import { registerInspector } from './inspectors.js';
import { Section, Row, Select, Colour, Slider, Toggle, run } from './controls.jsx';
import { selection, tool } from './state.js';
import { toolOptions } from './tools.js';
import { FABRICS, SECOND } from '../materials/fabric.js';

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

function PanelInspector({ sel, doc }) {
	const p = doc.panels.find((x) => x.id === sel.id);
	if (!p) return <div class="section-body dim">Panel {sel.id} no longer exists.</div>;
	const s = p.stack?.[0] ?? {};
	return (
		<Section title={`Panel ${p.name || p.id}`} actions={<button class="btn" onClick={() => run({ op: p.removed ? 'panel.restore' : 'panel.cut', id: p.id })}>{p.removed ? 'Fill' : 'Cut out'}</button>}>
			<Row label="Name"><input type="text" value={p.name ?? ''} onChange={(e) => run({ op: 'panel.set', id: p.id, name: e.currentTarget.value })} /></Row>
			<Row label="Fabric"><Select value={s.fabric} options={fabricOptions} onChange={(v) => run({ op: 'panel.set', id: p.id, fabric: v })} /></Row>
			<Row label="Colour"><Colour value={s.colour ?? '#888888'} onChange={(v, g) => run({ op: 'panel.set', id: p.id, colour: v, gesture: g })} /></Row>
			<Row label="Foil / second"><Select value={s.second ?? 'Tone-on-tone'} options={SECOND} onChange={(v) => run({ op: 'panel.set', id: p.id, second: v })} /></Row>
			<Row label="Grain"><Slider value={s.grain ?? 0} min={-Math.PI / 2} max={Math.PI / 2} step={0.01} format={(v) => (v * 180 / Math.PI).toFixed(0) + '°'} onChange={(v, g) => run({ op: 'panel.set', id: p.id, grain: v, gesture: g })} /></Row>
			<Row label="Mirrored"><span class="dim">{p.mirror === 'both' ? 'yes (both sides)' : 'no'}</span></Row>
		</Section>
	);
}

registerInspector('curves', CurveInspector);
registerInspector('panels', PanelInspector);

// Tool options, shown above the selection's inspector while a drawing tool is active.
export function ToolOptions() {
	const t = tool.value, o = toolOptions.value, set = (patch) => { toolOptions.value = { ...o, ...patch }; };
	if (t === 'pen') return (
		<Section title="Pen">
			<Row label="Draws"><Select value={o.penRole} options={ROLES} onChange={(v) => set({ penRole: v })} /></Row>
			<Row label="Mirror"><Select value={o.penMirror} options={[['auto', 'Auto (off at the centre)'], ['both', 'Both sides'], ['none', 'One side']]} onChange={(v) => set({ penMirror: v })} /></Row>
			<div class="dim">Click on the body to place points (Shift: corner). Click the first point to close, or end on another line. Enter or double-click finishes; Esc cancels.</div>
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
