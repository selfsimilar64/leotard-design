// Right-hand panel: properties of the selection (a garment piece, a line, stones...), or of the
// whole design when nothing is selected: the design gallery, who wears it (appearance, body type,
// pose, expression), the environment, and the starting shape. Choices with a picture
// are tiles (ui/Gallery.jsx); their pictures are pre-rendered into public/thumbs by
// src/dev/thumbnails.js (run in the app's console), a design's by app.save.
import { useEffect, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection, tool, notify, designsRev } from './state.js';
import { Slider, Toggle, Colour, run } from './controls.jsx';
import { Strip, Pane, Line, Chips, More, Swatches } from './Gallery.jsx';
import { GLARE_SIZE, GLARE_STRENGTH } from '../render/glare.js';
import { BACKDROP_COLOUR, ROOM_SIZE } from '../render/viewport.js';
import { RIGS, appearanceOf } from '../render/presets.js';
import { inspectors } from './inspectors.js';
import { ToolOptions } from './inspect-garment.jsx';
import { StoneCounts } from './inspect-stones.jsx';
import { BLOCK_OPTIONS, DEFAULT_BLOCK } from '../garment/blocks.js';
import { catalogue } from '../body/mannequin.js';
import { POSE_LABELS } from '../body/pose.js';

export function Inspector() {
	rev.value; // re-render on document change
	const sel = selection.value, doc = app.doc;
	const Custom = sel && inspectors[sel.kind];
	tool.value;
	return (
		<div class="inspector">
			<ToolOptions />
			{Custom ? <Custom sel={sel} doc={doc} /> : <DesignPanel doc={doc} />}
		</div>
	);
}

// file name of a thumbnail for a key
export const thumbName = (k) => String(k).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const thumb = (group, k) => `/thumbs/${group}/${thumbName(k)}.jpg`;

function DesignPanel({ doc }) {
	return (
		<>
			<Designs />
			<Character b={doc.body} />
			<Environment s={doc.scene} />
			<StartingShape doc={doc} />
			<StoneCounts />
		</>
	);
}

// --- designs ---------------------------------------------------------------------------------

// The designs in designs/: the moodboard collection (b<n>-name, in order) first, then the
// designer's own saves. Listed when the panel shows and again after a save (designsRev).
function useDesigns() {
	const [list, setList] = useState([]);
	const n = designsRev.value;
	useEffect(() => { app.designs().then(setList, () => setList([])); }, [n]);
	const order = (f) => { const m = f.match(/^b(\d+)-/); return m ? +m[1] : 1000; };
	return [...list].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
}
const designLabel = (f) => { const s = f.replace(/^b\d+-/, '').replace(/[-_]+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };

function Designs() {
	const files = useDesigns(), [busy, setBusy] = useState(null);
	// only the leotard changes: the model (appearance, body, pose, expression, skin) and the
	// environment stay as they are
	const open = async (f) => {
		setBusy(f);
		try { await app.open(f, app.doc.body, app.doc.scene); selection.value = null; } catch (e) { notify(e.message, 'error'); }
		setBusy(null);
	};
	return (
		<Pane title="Designs">
			<Strip size="l" value={busy ?? app.file} onPick={open}
				items={files.map((f) => ({ key: f, label: designLabel(f), img: `/__fs/designs/thumbs/${encodeURIComponent(f)}.jpg` }))} />
		</Pane>
	);
}

// --- who wears it --------------------------------------------------------------------------------

function Character({ b }) {
	const bodies = app.engine?.body;
	const look = appearanceOf(b), real = look === 'realistic';
	const sizes = (catalogue.bodies.length ? catalogue.bodies : []).map((x) => ({
		key: x.key, label: shortBody(x.label), hint: `${x.label}${bodies?.bodies[x.key] ? ` · ${Math.round(bodies.bodies[x.key].stature * 100)} cm` : ''}`, img: thumb('bodies', x.key),
	}));
	const poseKey = typeof b.pose === 'string' ? b.pose : null;
	// the mannequin stance, then the Daz poses (the arm-only presets, 'arms-down', 'hands-on-hips'...,
	// left the picker on 2026-10-21; designs and scripts still use them)
	const poses = [
		{ key: 'a-pose', label: shortPose(POSE_LABELS['a-pose']), hint: POSE_LABELS['a-pose'], img: thumb('poses', 'a-pose') },
		...catalogue.poses.filter((p) => p.key !== 'a-pose').map((p) => ({ key: p.key, label: p.label, img: thumb('poses', p.key) })),
	];
	return (
		<Pane title="Model">
			<Strip size="m" value={look} onPick={(v) => run({ op: 'body.set', appearance: v })} items={[
				{ key: 'realistic', label: 'Realistic', hint: 'A real person: face, hair and skin', img: thumb('appearance', 'realistic') },
				{ key: 'mannequin', label: 'Mannequin', hint: 'Headless plastic mannequin, same body', img: thumb('appearance', 'mannequin') },
			]} />
			<Line label="Age and build"><Strip value={b.size} onPick={(v) => run({ op: 'body.set', size: v })} items={sizes} /></Line>
			<Line label="Pose"><Strip value={poseKey} onPick={(v) => run({ op: 'body.set', pose: v })} items={poses} /></Line>
			{real && catalogue.expressions.length ? (
				<Line label="Expression"><Strip size="s" value={b.expression ?? 'neutral'} onPick={(v) => run({ op: 'body.set', expression: v })}
					items={catalogue.expressions.map((e) => ({ key: e.key, label: e.label, img: thumb('expressions', e.key) }))} /></Line>
			) : null}
		</Pane>
	);
}

// 'Young adult, athletic' -> 'Young adult'; 'Child, about 9' -> 'Child, 9'
const shortBody = (l) => l.replace(/, athletic$/, '').replace(/, about /, ', ').replace(/^Adult, broader build$/, 'Broader build');
const shortPose = (l) => l.replace(/ \(A-pose\)$/, '');

// --- environment ---------------------------------------------------------------------------------

const GLARES = [['plain', 'None'], ['star', '4-point star'], ['star6', '6-point star'], ['arena', 'Arena (8)']];

function Environment({ s }) {
	const r = RIGS[s.rig] ?? {};
	return (
		<Pane title="Environment">
			<Strip value={s.rig} onPick={(v) => run({ op: 'scene.set', rig: v })}
				items={Object.keys(RIGS).map((k) => ({ key: k, label: k.replace(/ \((?:photo studio|ring of small lights|overhead lights|soft)\)$/, ''), hint: k, img: thumb('environments', k) }))} />
			<Line label="Brightness"><Slider value={s.exposure} min={0.3} max={2.5} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => run({ op: 'scene.set', exposure: v, gesture: g })} /></Line>
			<Line label="Turn the room"><Slider value={s.envRotation} min={0} max={6.283} format={(v) => Math.round(v * 180 / Math.PI) + '°'} onChange={(v, g) => run({ op: 'scene.set', envRotation: v, gesture: g })} /></Line>
			{r.hdri ? <Backdrop s={s} r={r} /> : null}
			<More>
				<Line label="Sparkle glow"><Slider value={s.bloom} min={0} max={1.2} onChange={(v, g) => run({ op: 'scene.set', bloom: v, gesture: g })} /></Line>
				<Line label="Crystal glare"><Chips value={s.glare ?? 'plain'} options={GLARES} onPick={(v) => run({ op: 'scene.set', glare: v })} /></Line>
				{(s.glare ?? 'plain') !== 'plain' ? (
					<>
						<Line label="Glare size"><Slider value={s.glareSize ?? GLARE_SIZE} min={0.2} max={2.5} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => run({ op: 'scene.set', glareSize: v, gesture: g })} /></Line>
						<Line label="Glare strength"><Slider value={s.glareStrength ?? GLARE_STRENGTH} min={0} max={2} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => run({ op: 'scene.set', glareStrength: v, gesture: g })} /></Line>
					</>
				) : null}
				{!r.fixed ? <Line label="Circling lights"><Toggle value={s.rotateLights} onChange={(v) => run({ op: 'scene.set', rotateLights: v })} /></Line> : null}
			</More>
		</Pane>
	);
}

// Behind the figure in a photographed (HDRI) studio: a plain colour, the HDRI lighting the figure
// only; or the room itself, its floor projected onto the ground (render/viewport.js showHdri).
const BACKDROPS = ['#d9d8d4', '#f4f4f2', '#9a9b9f', '#4a4b50', '#1d1d21', '#d8cfc2', '#c9d3dc'];
function Backdrop({ s, r }) {
	const room = s.backdrop === 'room', colour = s.backdropColour ?? BACKDROP_COLOUR;
	const set = (patch, g) => run({ op: 'scene.set', ...patch, gesture: g });
	return (
		<>
			<Line label="Background"><Chips value={room ? 'room' : 'plain'} options={[['plain', 'Plain colour'], ['room', 'The photographed room']]} onPick={(v) => set({ backdrop: v })} /></Line>
			{room ? (
				<>
					<Line label="Floor seam height"><Slider value={s.roomHeight ?? r.height} min={0.3} max={6} format={(v) => v.toFixed(1) + ' m'} onChange={(v, g) => set({ roomHeight: v }, g)} /></Line>
					<Line label="Room size"><Slider value={s.roomSize ?? ROOM_SIZE} min={3} max={35} step={0.5} format={(v) => Math.round(v) + ' m'} onChange={(v, g) => set({ roomSize: v }, g)} /></Line>
				</>
			) : (
				<Line label="Colour">
					<Swatches value={colour} colours={BACKDROPS} onPick={(c) => set({ backdropColour: c })}
						custom={<Colour value={colour} onChange={(v, g) => set({ backdropColour: v }, g)} />} />
				</Line>
			)}
		</>
	);
}

// --- starting shape --------------------------------------------------------------------------------

const BLOCK_LABELS = { neck: 'Neckline', back: 'Back', sleeves: 'Sleeves', leg: 'Leg', armhole: 'Armhole' };
const optionLabel = (o) => ({ v: 'V', 'set-in': 'Set-in', 'three-quarter': '3/4' }[o] ?? o.charAt(0).toUpperCase() + o.slice(1));

// A new garment from a block: each choice re-applies the block (one undo step) and replaces the
// garment's lines and panels.
function StartingShape({ doc }) {
	const cur = { ...DEFAULT_BLOCK, ...(doc.meta.block ?? {}) };
	const apply = (patch) => run({ op: 'block.apply', ...cur, ...patch });
	return (
		<Pane>
			<More label="Start from a basic shape" open={!doc.curves.length}>
				<div class="dim note">Choosing a shape replaces the current garment (Undo brings it back).</div>
				{Object.entries(BLOCK_OPTIONS).map(([k, opts]) => (
					<Line key={k} label={BLOCK_LABELS[k] ?? k}>
						<Strip size="s" value={doc.meta.block ? cur[k] : null} onPick={(v) => apply({ [k]: v })}
							items={opts.map((o) => ({ key: o, label: optionLabel(o), img: thumb('blocks', k + '-' + o) }))} />
					</Line>
				))}
			</More>
		</Pane>
	);
}
