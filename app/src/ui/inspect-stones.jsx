// Inspector for stone generators and the stone tools' options; live counts by size and colour.
import { app } from '../instance.js';
import { registerInspector } from './inspectors.js';
import { Section, Row, Select, Slider, run } from './controls.jsx';
import { selection, rev } from './state.js';
import { toolOptions } from './tools.js';
import { COLOURS, SHAPES, SS } from '../stones/library.js';

const STONES = Object.keys(COLOURS).flatMap((c) => ['Gold', 'Silver', 'Rose Gold', 'Hematite'].includes(c) ? [c] : [c, c + ' AB']);
const SIZES = Object.keys(SS).map((k) => 'ss' + k);
const mm = (v) => (v * 1000).toFixed(1) + ' mm';

// Editable params: numbers get a field, strings a text box, arrays and objects JSON.
function ParamRow({ g, k, v }) {
	const set = (val) => run({ op: 'stones.set', id: g.id, params: { [k]: val } });
	if (typeof v === 'number') return <Row label={k}><input type="number" step="any" value={v} onChange={(e) => set(Number(e.currentTarget.value))} /></Row>;
	if (typeof v === 'string' && /^ss\d+$/.test(v)) return <Row label={k}><Select value={v} options={SIZES} onChange={set} /></Row>;
	if (typeof v === 'string' || typeof v === 'boolean') return <Row label={k}><input type="text" value={String(v)} onChange={(e) => set(e.currentTarget.value)} /></Row>;
	return <Row label={k}><input type="text" value={JSON.stringify(v)} onChange={(e) => { try { set(JSON.parse(e.currentTarget.value)); } catch { /* keep typing */ } }} /></Row>;
}

function StoneGenInspector({ sel, doc }) {
	rev.value;
	const g = doc.stones.find((x) => x.id === sel.id);
	if (!g) return <div class="section-body dim">Stones {sel.id} no longer exist.</div>;
	const count = app.engine?.stoneRun.stones.filter((s) => s.gen === g.id).length ?? 0;
	return (
		<Section title={`Stones: ${g.name || g.kind} (${count})`} actions={<span>
			<button class="btn" title="Freeze into single stones" onClick={() => { run({ op: 'stones.release', id: g.id }); selection.value = null; }}>Release</button>
			<button class="btn" onClick={() => { run({ op: 'stones.remove', id: g.id }); selection.value = null; }}>Delete</button>
		</span>}>
			<Row label="Kind"><span class="dim">{g.kind} {g.on ? JSON.stringify(g.on) : ''}</span></Row>
			<Row label="Stone"><Select value={g.stone ?? 'Crystal AB'} options={STONES} onChange={(v) => run({ op: 'stones.set', id: g.id, stone: v, palette: null })} /></Row>
			<Row label="Cut"><Select value={g.shape ?? 'round'} options={Object.keys(SHAPES)} onChange={(v) => run({ op: 'stones.set', id: g.id, shape: v })} /></Row>
			<Row label="Mirror"><Select value={g.mirror ?? 'none'} options={[['none', 'No'], ['both', 'Both sides']]} onChange={(v) => run({ op: 'stones.set', id: g.id, mirror: v })} /></Row>
			{Object.entries(g.params ?? {}).map(([k, v]) => <ParamRow key={k} g={g} k={k} v={v} />)}
			<Row label="Seed"><button class="btn" onClick={() => run({ op: 'stones.set', id: g.id, seed: Math.floor(Math.random() * 1e6) })}>Reshuffle</button></Row>
		</Section>
	);
}
registerInspector('stones', StoneGenInspector);

export function StoneToolOptions({ tool }) {
	const o = toolOptions.value, st = o.stone, set = (patch) => { toolOptions.value = { ...o, stone: { ...st, ...patch } }; };
	const help = { stones: 'Click a line for rows along it, or a panel to fill it.', single: 'Click to place one stone.', erase: 'Click to erase the stones there (the generators stay live).' }[tool];
	return (
		<Section title={tool === 'erase' ? 'Eraser' : tool === 'single' ? 'Single stone' : 'Stones'}>
			<div class="dim">{help}</div>
			{tool !== 'erase' ? (
				<>
					<Row label="Stone"><Select value={st.stone} options={STONES} onChange={(v) => set({ stone: v })} /></Row>
					<Row label="Size"><Select value={st.size} options={SIZES} onChange={(v) => set({ size: v })} /></Row>
					<Row label="Cut"><Select value={st.shape} options={Object.keys(SHAPES)} onChange={(v) => set({ shape: v })} /></Row>
				</>
			) : <Row label="Radius"><Slider value={st.eraseR} min={0.002} max={0.03} step={0.001} format={mm} onChange={(v) => set({ eraseR: v })} /></Row>}
			{tool === 'stones' ? (
				<>
					<Row label="Rows"><Slider value={st.rows} min={1} max={6} step={1} format={(v) => String(v)} onChange={(v) => set({ rows: v })} /></Row>
					<Row label="From line"><Slider value={st.offset} min={-0.03} max={0.03} step={0.0005} format={mm} onChange={(v) => set({ offset: v })} /></Row>
					<Row label="Spacing"><Slider value={st.gap} min={1} max={3} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v) => set({ gap: v })} /></Row>
					<Row label="Fill"><Select value={st.fill} options={[['random', 'Random pavé'], ['contour', 'Rings along the edge']]} onChange={(v) => set({ fill: v })} /></Row>
				</>
			) : null}
		</Section>
	);
}

// Live read-out: stones by size and colour.
export function StoneCounts() {
	rev.value;
	if (!app.engine || app.doc.legacy) return null;
	const s = app.stoneStats();
	if (!s.total) return null;
	return (
		<Section title={`Stones: ${s.total}`} open={false}>
			{Object.entries(s.bySize).sort((a, b) => a[0] - b[0]).map(([d, n]) => <Row key={d} label={`${d} mm`}><span class="dim">{n}</span></Row>)}
			{Object.entries(s.byStone).map(([c, n]) => <Row key={c} label={c}><span class="dim">{n}</span></Row>)}
			{s.errors.length ? <div class="dim">Problems: {s.errors.join('; ')}</div> : null}
		</Section>
	);
}
