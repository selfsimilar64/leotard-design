// Right-hand inspector: properties of the selection, or of the whole design when nothing is
// selected (body, lighting and, for POC looks, the POC garment's zones).
import { app } from '../instance.js';
import { rev, selection } from './state.js';
import { Section, Row, Select, Colour, Slider, Toggle, run } from './controls.jsx';
import { RIGS, MANNEQUIN_FINISHES, LOOKS } from '../render/presets.js';
import { FABRICS, SECOND } from '../materials/fabric.js';
import { PATTERNS, FINISHES } from '../stones/stones.js';
import { TRIMS } from '../garment/trim.js';
import { inspectors } from './inspectors.js';
import { ToolOptions } from './inspect-garment.jsx';
import { StoneCounts } from './inspect-stones.jsx';
import { BLOCK_OPTIONS } from '../garment/blocks.js';
import { tool } from './state.js';
import { catalogue } from '../body/mannequin.js';
import { display, stats } from './state.js';
import { DISPLAY_OPTIONS, saveDisplay } from '../render/display.js';
import { POSES, POSE_LABELS } from '../body/pose.js';

const fabricOptions = Object.entries(FABRICS).map(([k, f]) => [k, f.label]);

export function Inspector() {
	rev.value; // re-render on document change
	const sel = selection.value, doc = app.doc;
	const Custom = sel && inspectors[sel.kind];
	tool.value;
	return (
		<div class="inspector">
			<ToolOptions />
			{Custom ? <Custom sel={sel} doc={doc} /> : <DesignProps doc={doc} />}
		</div>
	);
}

function DesignProps({ doc }) {
	const b = doc.body, s = doc.scene, L = doc.legacy;
	const bodies = app.engine?.body;
	const sizes = bodies ? bodies.keys.map((k) => [k, `${bodies.bodies[k].label} · ${Math.round(bodies.bodies[k].stature * 100)} cm`]) : [b.size];
	// arm poses (the photo-matching set) and Daz's whole-body poses; a custom left/right mix shows as such
	const poseKey = typeof b.pose === 'string' ? b.pose : 'custom';
	const poses = [...Object.keys(POSES).map((k) => [k, POSE_LABELS[k] ?? k]), ...catalogue.poses.filter((p) => p.key !== 'a-pose').map((p) => [p.key, p.label])];
	if (poseKey === 'custom') poses.push(['custom', `Arms: left ${b.pose.left ?? 'rest'}, right ${b.pose.right ?? 'rest'}`]);
	const torso = b.form === 'torso', head = b.head ?? 'mannequin';
	return (
		<>
			<Section title="Body">
				<Row label="Body type"><Select value={b.size} options={sizes} onChange={(v) => run({ op: 'body.set', size: v })} /></Row>
				<Row label="Pose"><Select value={poseKey} options={poses} onChange={(v) => v !== 'custom' && run({ op: 'body.set', pose: v })} /></Row>
				<Row label="Presentation"><Select value={b.form} options={[['full', 'Full body'], ['torso', 'Dress form (torso)']]}
					onChange={(v) => run({ op: 'body.set', form: v, finish: v === 'torso' ? 'Linen dress form' : 'Matte white fibreglass' })} /></Row>
				{!torso ? <Row label="Head"><Select value={head} options={[['none', 'Hidden'], ['mannequin', 'Mannequin head'], ['person', 'Person (face and hair)']]}
					onChange={(v) => run({ op: 'body.set', head: v })} /></Row> : null}
				{!torso && head === 'person' ? <Row label="Expression"><Select value={b.expression ?? 'neutral'} options={catalogue.expressions.map((e) => [e.key, e.label])}
					onChange={(v) => run({ op: 'body.set', expression: v })} /></Row> : null}
				{torso || head !== 'person' ? <Row label="Finish"><Select value={b.finish} options={Object.keys(MANNEQUIN_FINISHES)} onChange={(v) => run({ op: 'body.set', finish: v })} /></Row> : null}
			</Section>
			<Section title="Lighting">
				<Row label="Preset"><Select value={s.rig} options={Object.keys(RIGS)} onChange={(v) => run({ op: 'scene.set', rig: v })} /></Row>
				<Row label="Rotate lights"><Toggle value={s.rotateLights} onChange={(v) => run({ op: 'scene.set', rotateLights: v })} /></Row>
				<Row label="Turn environment"><Slider value={s.envRotation} min={0} max={6.283} onChange={(v, g) => run({ op: 'scene.set', envRotation: v, gesture: g })} /></Row>
				<Row label="Exposure"><Slider value={s.exposure} min={0.3} max={2.5} onChange={(v, g) => run({ op: 'scene.set', exposure: v, gesture: g })} /></Row>
				<Row label="Sparkle glow"><Slider value={s.bloom} min={0} max={1.2} onChange={(v, g) => run({ op: 'scene.set', bloom: v, gesture: g })} /></Row>
				<Row label="Glare"><Select value={s.glare ?? 'plain'} options={[['plain', 'Plain photo'], ['star', 'Star filter (4 points)'], ['star6', 'Star filter (6 points)'], ['arena', 'Arena eye (8 points)']]} onChange={(v) => run({ op: 'scene.set', glare: v })} /></Row>
			</Section>
			<StoneCounts />
			<BlockPicker doc={doc} />
			{L ? <LegacyProps L={L} /> : null}
			<DisplayProps />
		</>
	);
}

// This computer's display settings (render/display.js): not part of the design, no undo.
function DisplayProps() {
	const d = display.value, st = stats.value;
	if (!d) return null;
	const set = (k, v) => { const n = { ...d, [k]: v }; display.value = n; saveDisplay(n); app.engine?.viewport.applyDisplay(n); };
	const num = (k) => (v) => set(k, Number(v));
	return (
		<Section title="Display" open={false}>
			<Row label="Resolution" hint="Share of the screen's pixels the view is drawn at; lower is faster"><Select value={d.resolution} options={DISPLAY_OPTIONS.resolution} onChange={num('resolution')} /></Row>
			<Row label="Lower while moving" hint="Draw at a lower resolution while the view turns, when frames run late"><Toggle value={d.dynamicRes} onChange={(v) => set('dynamicRes', v)} /></Row>
			<Row label="Anti-aliasing"><Select value={d.msaa} options={DISPLAY_OPTIONS.msaa} onChange={num('msaa')} /></Row>
			<Row label="Shadows"><Select value={d.shadows} options={DISPLAY_OPTIONS.shadows} onChange={(v) => set('shadows', v)} /></Row>
			<Row label="Glow"><Toggle value={d.bloom} onChange={(v) => set('bloom', v)} /></Row>
			{st.fps ? <Row label="Now"><span>{st.width}×{st.height} px · {st.fps.toFixed(0)} fps</span></Row> : null}
		</Section>
	);
}

function ZoneProps({ zone, z }) {
	return (
		<>
			<Row label="Material"><Select value={z.fabric} options={fabricOptions} onChange={(v) => run({ op: 'legacy.set', zone, fabric: v })} /></Row>
			<Row label="Colour"><Colour value={z.colour} onChange={(v, g) => run({ op: 'legacy.set', zone, colour: v, gesture: g })} /></Row>
			<Row label="Foil / second"><Select value={z.second} options={SECOND} onChange={(v) => run({ op: 'legacy.set', zone, second: v })} /></Row>
		</>
	);
}

function LegacyProps({ L }) {
	return (
		<>
			<Section title="POC garment">
				<Row label="Quick look"><Select value={L.look ?? ''} options={['', ...Object.keys(LOOKS)]} onChange={(v) => v && run({ op: 'legacy.look', name: v })} /></Row>
				<Row label="Sleeves"><Select value={L.sleeves} options={[['long', 'Long sleeve'], ['tank', 'Tank']]} onChange={(v) => run({ op: 'legacy.set', sleeves: v })} /></Row>
				<Row label="Back"><Select value={L.back} options={[['scoop', 'Scoop'], ['keyhole', 'Keyhole'], ['strappy', 'Open with crossed straps']]} onChange={(v) => run({ op: 'legacy.set', back: v })} /></Row>
				<Row label="Edge finish"><Select value={L.trim.finish} options={Object.entries(TRIMS).map(([k, t]) => [k, t.label])} onChange={(v) => run({ op: 'legacy.set', trim: { finish: v } })} /></Row>
			</Section>
			<Section title="Body fabric"><ZoneProps zone="body" z={L.zones.body} /></Section>
			<Section title="Accent panel"><ZoneProps zone="accent" z={L.zones.accent} /></Section>
			<Section title="Sleeves" open={L.sleeves === 'long'}><ZoneProps zone="sleeve" z={L.zones.sleeve} /></Section>
			<Section title="Binding (when edge finish is binding)" open={false}>
				<Row label="Material"><Select value={L.trim.fabric} options={fabricOptions} onChange={(v) => run({ op: 'legacy.set', trim: { fabric: v } })} /></Row>
				<Row label="Colour"><Colour value={L.trim.colour} onChange={(v, g) => run({ op: 'legacy.set', trim: { colour: v }, gesture: g })} /></Row>
				<Row label="Foil / second"><Select value={L.trim.second} options={SECOND} onChange={(v) => run({ op: 'legacy.set', trim: { second: v } })} /></Row>
			</Section>
			<Section title="Crystals and sequins">
				<Row label="Pattern"><Select value={L.pattern} options={Object.keys(PATTERNS)} onChange={(v) => run({ op: 'legacy.set', pattern: v })} /></Row>
				<Row label="Type"><Select value={L.finish} options={Object.keys(FINISHES)} onChange={(v) => run({ op: 'legacy.set', finish: v })} /></Row>
			</Section>
		</>
	);
}

// Start a new garment from a block: each choice re-applies the block (one undo step).
function BlockPicker({ doc }) {
	const cur = { neck: 'scoop', back: 'scoop', sleeves: 'long', leg: 'high', ...(doc.meta.block ?? {}) };
	const apply = (patch) => run({ op: 'block.apply', ...cur, ...patch });
	const label = { neck: 'Neckline', back: 'Back', sleeves: 'Sleeves', leg: 'Leg' };
	return (
		<Section title="Block (starting shape)" open={!doc.curves.length}>
			{Object.entries(BLOCK_OPTIONS).map(([k, opts]) => (
				<Row key={k} label={label[k]}><Select value={cur[k]} options={opts} onChange={(v) => apply({ [k]: v })} /></Row>
			))}
			<div class="dim">Changing a block replaces the garment's lines and panels.</div>
		</Section>
	);
}
