// Inspector for logos and lettering (decals) and the placing tool's options.
import { registerInspector } from './inspectors.js';
import { Section, Row, Select, Colour, Slider, run } from './controls.jsx';
import { selection } from './state.js';
import { toolOptions } from './tools.js';

export const LOOKS = [['print', 'Print'], ['foil', 'Foil'], ['holo', 'Holographic foil'], ['glitter', 'Glitter'], ['flock', 'Flock / embroidery'], ['gather', 'Stamp: gathers to a knot'], ['ruche', 'Stamp: ruching'], ['twist', 'Stamp: twist knot']];
// Script and display faces installed on Windows; any CSS font name works (falls back to cursive).
export const FONTS = ['Segoe Script', 'Brush Script MT', 'Lucida Handwriting', 'Ink Free', 'Gabriola', 'Monotype Corsiva', 'Georgia', 'Arial Black', 'Impact', 'Segoe UI'];
const mm = (v) => (v * 1000).toFixed(0) + ' mm';

// Fields shared by the inspector (a placed decal) and the tool (the next one placed).
function DecalFields({ d, set }) {
	return (
		<>
			<Row label="Text"><textarea rows={2} value={d.text ?? ''} placeholder="Lettering (or use an image)" onChange={(e) => set({ text: e.currentTarget.value })} /></Row>
			<Row label="Image"><input type="text" value={d.src ?? ''} placeholder="/references/logo.png" onChange={(e) => set({ src: e.currentTarget.value || null })} /></Row>
			<Row label="Font"><Select value={d.font ?? 'Segoe Script'} options={FONTS} onChange={(v) => set({ font: v })} /></Row>
			<Row label="Bold"><Select value={d.weight ?? 'normal'} options={[['normal', 'No'], ['bold', 'Yes']]} onChange={(v) => set({ weight: v })} /></Row>
			<Row label="Look"><Select value={d.look ?? 'print'} options={LOOKS} onChange={(v) => set({ look: v })} /></Row>
			<Row label="Colour"><Colour value={d.colour ?? '#ffffff'} onChange={(v, g) => set({ colour: v }, g)} /></Row>
			<Row label="Width"><Slider value={d.size ?? 0.08} min={0.01} max={0.4} step={0.001} format={mm} onChange={(v, g) => set({ size: v }, g)} /></Row>
			<Row label="Turn"><Slider value={d.rotate ?? 0} min={-180} max={180} step={1} format={(v) => v.toFixed(0) + '°'} onChange={(v, g) => set({ rotate: v }, g)} /></Row>
		</>
	);
}

function DecalInspector({ sel, doc }) {
	const d = doc.decals.find((x) => x.id === sel.id);
	if (!d) return <div class="section-body dim">Logo {sel.id} no longer exists.</div>;
	const set = (patch, gesture) => run({ op: 'decal.set', id: d.id, ...patch, ...(gesture ? { gesture } : {}) });
	return (
		<Section title={`Logo / lettering ${d.name || d.id}`} actions={<button class="btn" onClick={() => { run({ op: 'decal.remove', id: d.id }); selection.value = null; }}>Delete</button>}>
			<DecalFields d={d} set={set} />
			<div class="dim">To move it, use the Logo tool's next click, or script decal.set with at.</div>
		</Section>
	);
}
registerInspector('decals', DecalInspector);

export function DecalToolOptions() {
	const o = toolOptions.value, d = o.decal, set = (patch) => { toolOptions.value = { ...o, decal: { ...d, ...patch } }; };
	return (
		<Section title="Logo / lettering">
			<div class="dim">Click on the garment where the centre of the logo goes.</div>
			<DecalFields d={d} set={set} />
		</Section>
	);
}
