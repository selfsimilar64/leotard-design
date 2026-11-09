// The Stage card: how the design is presented. Body (the mannequin's age and build, its finish and colour, shown or
// hidden), Pose, Studio (the photo studio that lights it, its brightness and turn, what is behind the figure) and
// Effects (sparkle glow and crystal glare). None of it changes the leotard.
import { useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, hideMannequin, slow } from './state.js';
import { run, Card, Field, Tiles, Segmented, Swatches, Slider, thumb } from './kit.jsx';
import { GLARE_ICONS } from './icons.jsx';
import { GLARE_SIZE, GLARE_STRENGTH } from '../render/glare.js';
import { BACKDROP_COLOUR, ROOM_SIZE } from '../render/viewport.js';
import { RIGS, MANNEQUIN_FINISHES, MANNEQUIN_MATERIALS } from '../render/presets.js';
import { catalogue } from '../body/mannequin.js';
import { POSE_LABELS } from '../body/pose.js';

export function StageCard() {
	rev.value;
	const b = app.doc.body, s = app.doc.scene;
	// the tile picked shows as chosen, with a spinner, from the click until the body is on show (the re-solve holds the page ~1 s)
	const [pending, setPending] = useState(null); // { k: 'size' | 'pose', v }
	const setBody = async (patch, what) => {
		const [k, v] = Object.entries(patch)[0];
		setPending({ k, v });
		try { await slow(what, () => run({ op: 'body.set', ...patch })); } finally { setPending((p) => (p?.k === k && p.v === v ? null : p)); }
	};
	const shown = (k, cur) => (pending?.k === k ? pending.v : cur), spin = (k) => (pending?.k === k ? pending.v : null);
	return (
		<Card kind="stage" title="Stage" faces={[['body', 'Body'], ['pose', 'Pose'], ['studio', 'Studio'], ['effects', 'Effects']]}>
			{(face) => face === 'body' ? <Body b={b} value={shown('size', b.size)} busyKey={spin('size')} onPick={(v) => setBody({ size: v }, 'Changing the body…')} />
				: face === 'pose' ? <Pose value={shown('pose', typeof b.pose === 'string' ? b.pose : null)} busyKey={spin('pose')} onPick={(v) => setBody({ pose: v }, 'Posing…')} />
					: face === 'studio' ? <Studio s={s} /> : <Effects s={s} />}
		</Card>
	);
}

// The first swatch is the finish's own colour (body.colour unset); any other colour stays when the
// finish changes.
const MANNEQUIN_COLOURS = ['#f2f1ee', '#c9a48f', '#8a6a55', '#9a9b9f', '#1e1e22', '#d9b46a', '#c99a86', '#9fb3c8'];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
// 'Young adult, athletic' -> 'Young adult'; 'Child, about 9' -> 'Child, 9'
const shortBody = (l) => l.replace(/, athletic$/, '').replace(/, about /, ', ').replace(/^Adult, broader build$/, 'Broader build');
function Body({ b, value, busyKey, onPick }) {
	rev.value; // (the record it shows is edited in place: without this it would redraw only for a changed prop, ui/state.js rev)
	const bodies = app.engine?.body;
	const sizes = catalogue.bodies.map((x) => ({
		key: x.key, label: shortBody(x.label), hint: `${x.label}${bodies?.bodies[x.key] ? ` · ${Math.round(bodies.bodies[x.key].stature * 100)} cm` : ''}`, img: thumb('bodies', x.key),
	}));
	const own = hex((MANNEQUIN_FINISHES[b.finish] ?? MANNEQUIN_FINISHES['Matte white fibreglass']).colour), colour = b.colour ?? own;
	const finishName = MANNEQUIN_MATERIALS.find(([k]) => k === b.finish)?.[1] ?? b.finish;
	const set = (patch, g) => run({ op: 'body.set', ...patch, gesture: g });
	return (
		<>
			<Field label="Age and build"><Tiles cols={4} value={value} busyKey={busyKey} items={sizes} onPick={onPick} /></Field>
			<Field label="Mannequin" aside={<span class="seg-row"><span>{finishName}</span>
				<label class="switch-row bare" title="Hide the mannequin: the leotard floats on its own (M)"><span class="switch-label">Show</span><span class={`switch ${hideMannequin.value ? '' : 'on'}`}><input type="checkbox" checked={!hideMannequin.value} onChange={(e) => { hideMannequin.value = !e.currentTarget.checked; }} /><span class="switch-knob" /></span></label></span>}>
				<Tiles cols={6} shape="round" names={false} value={b.finish} onPick={(v) => set({ finish: v })}
					items={MANNEQUIN_MATERIALS.map(([k, label]) => ({ key: k, label, hint: label, img: thumb('mannequin', k) }))} />
				<Swatches value={colour} colours={[own, ...MANNEQUIN_COLOURS.filter((c) => c !== own)]} onPick={(c, g) => set({ colour: c === own ? null : c }, g)} />
			</Field>
		</>
	);
}

const shortPose = (l) => l.replace(/ \(A-pose\)$/, '').replace(/^Mannequin stance$/, 'Mannequin');
function Pose({ value, busyKey, onPick }) {
	const poses = catalogue.poses.map((p) => { const l = p.key === 'a-pose' ? POSE_LABELS['a-pose'] : p.label; return { key: p.key, label: shortPose(l), hint: l, img: thumb('poses', p.key) }; });
	return (
		<Field label="Pose" aside={poses.find((p) => p.key === value)?.label}>
			{/* a dozen or so, with their names; a long catalogue, as a sheet of pictures (the chosen one's name above) */}
			<Tiles cols={poses.length > 16 ? 5 : 4} names={poses.length <= 16} value={value} busyKey={busyKey} items={poses} onPick={onPick} />
		</Field>
	);
}

// Behind the figure in a photographed (HDRI) studio: a plain colour, the HDRI lighting the figure
// only; or the room itself, its floor projected onto the ground (render/viewport.js showHdri).
const BACKDROPS = ['#d9d8d4', '#f4f4f2', '#9a9b9f', '#4a4b50', '#1d1d21', '#d8cfc2', '#c9d3dc'];
function Studio({ s }) {
	rev.value; // (the record it shows is edited in place: without this it would redraw only for a changed prop, ui/state.js rev)
	const r = RIGS[s.rig] ?? {}, hdri = !!r.hdri, room = s.backdrop === 'room', colour = s.backdropColour ?? BACKDROP_COLOUR;
	const set = (patch, g) => run({ op: 'scene.set', ...patch, gesture: g });
	// a new studio loads its photograph (~25 MB) and lights the fabric anew: the tile shows the pick until it is on show
	const [pending, setPending] = useState(null);
	const pickRig = async (v) => {
		setPending(v);
		try { await slow('Changing the studio…', () => set({ rig: v })); } finally { setPending((p) => (p === v ? null : p)); }
	};
	return (
		<>
			<Tiles cols={3} value={pending ?? s.rig} busyKey={pending} onPick={pickRig}
				items={Object.keys(RIGS).map((k) => ({ key: k, label: k.replace(/ studio/, '').replace(/^./, (c) => c.toUpperCase()), hint: k, img: thumb('environments', k) }))} />
			<Slider label="Brightness" value={s.exposure} min={0.3} max={2.5} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => set({ exposure: v }, g)} />
			<Slider label="Turn the lights" value={s.envRotation} min={0} max={6.283} format={(v) => Math.round(v * 180 / Math.PI) + '°'} onChange={(v, g) => set({ envRotation: v }, g)} />
			{hdri ? <Field label="Behind the mannequin">
				<Segmented value={room ? 'room' : 'plain'} options={[['plain', 'Plain colour'], ['room', 'The studio room']]} onPick={(v) => set({ backdrop: v })} />
				{room ? <>
					<Slider label="Floor seam height" value={s.roomHeight ?? r.height} min={0.3} max={6} format={(v) => v.toFixed(1) + ' m'} onChange={(v, g) => set({ roomHeight: v }, g)} />
					<Slider label="Room size" value={s.roomSize ?? ROOM_SIZE} min={3} max={35} step={0.5} format={(v) => Math.round(v) + ' m'} onChange={(v, g) => set({ roomSize: v }, g)} />
				</> : <Swatches value={colour} colours={BACKDROPS} onPick={(c, g) => set({ backdropColour: c }, g)} />}
			</Field> : null}
		</>
	);
}

const GLARES = [['plain', 'None'], ['star', '4-point'], ['star6', '6-point'], ['arena', 'Arena']];
function Effects({ s }) {
	rev.value;
	const set = (patch, g) => run({ op: 'scene.set', ...patch, gesture: g }), glare = s.glare ?? 'plain';
	return (
		<>
			<Slider label="Glow around highlights" value={s.bloom} min={0} max={1.2} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => set({ bloom: v }, g)} />
			<Field label="Crystal glare">
				<Tiles cols={4} value={glare} onPick={(v) => set({ glare: v })}
					items={GLARES.map(([k, l]) => { const Ic = GLARE_ICONS[k]; return { key: k, label: l, icon: <Ic size={30} /> }; })} />
			</Field>
			{glare !== 'plain' ? <>
				<Slider label="Glare size" value={s.glareSize ?? GLARE_SIZE} min={0.2} max={2.5} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => set({ glareSize: v }, g)} />
				<Slider label="Glare strength" value={s.glareStrength ?? GLARE_STRENGTH} min={0} max={2} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => set({ glareStrength: v }, g)} />
			</> : null}
		</>
	);
}
