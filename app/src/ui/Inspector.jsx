// Right-hand panel: properties of the selection (a garment piece, a line, stones...), or of the
// whole design when nothing is selected: where to start from (simple starting points, finished
// designs), the shape of the leotard element by element (neckline, back, sleeves, leg, front
// top, waist seam), who wears it and the scene. Choices with a picture are tiles (ui/Gallery.jsx);
// their pictures are pre-rendered into public/thumbs by src/dev/thumbnails.js (run in the app's
// console), a design's by app.save.
import { useEffect, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection, tool, notify, designsRev, display } from './state.js';
import { saveDisplay } from '../render/display.js';
import { Slider, Toggle, Colour, Select, run } from './controls.jsx';
import { Strip, Pane, Line, Chips, More, Swatches } from './Gallery.jsx';
import { GLARE_SIZE, GLARE_STRENGTH } from '../render/glare.js';
import { BACKDROP_COLOUR, ROOM_SIZE } from '../render/viewport.js';
import { RIGS, appearanceOf } from '../render/presets.js';
import { inspectors } from './inspectors.js';
import { ToolOptions } from './inspect-garment.jsx';
import { StoneCounts } from './inspect-stones.jsx';
import { BLOCK_OPTIONS, blockOf, blockAllows } from '../garment/blocks.js';
import { STARTS } from '../garment/starts.js';
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
			<StartFrom doc={doc} />
			<Shape doc={doc} />
			<Character b={doc.body} />
			<Environment s={doc.scene} />
			<StoneCounts />
		</>
	);
}

// --- starting points and designs -----------------------------------------------------------------

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

// Only the leotard changes: the model (appearance, body, pose, expression) and the scene stay.
function StartFrom({ doc }) {
	const files = useDesigns(), [busy, setBusy] = useState(null);
	const open = async (f) => {
		setBusy(f);
		try { await app.open(f, app.doc.body, app.doc.scene); selection.value = null; } catch (e) { notify(e.message, 'error'); }
		setBusy(null);
	};
	return (
		<Pane title="Start from">
			<Line label="A simple leotard, yours to change">
				<Strip size="m" value={app.file ? null : doc.meta.start ?? null} onPick={(k) => { run({ op: 'start.apply', key: k }); app.file = null; selection.value = null; }}
					items={STARTS.map((s) => ({ key: s.key, label: s.label, hint: s.hint, img: thumb('starts', s.key) }))} />
			</Line>
			<Line label="A finished design">
				<Strip size="m" value={busy ?? app.file} onPick={open}
					items={files.map((f) => ({ key: f, label: designLabel(f), img: `/__fs/designs/thumbs/${encodeURIComponent(f)}.jpg` }))} />
			</Line>
		</Pane>
	);
}

// --- the shape, element by element -----------------------------------------------------------------

const ELEMENTS = [['neck', 'Neckline'], ['back', 'Back'], ['sleeves', 'Sleeves'], ['strap', 'Straps'], ['leg', 'Leg'], ['yoke', 'Front top'], ['waist', 'Waist seam']];
const OPTION_LABELS = { v: 'V', 'set-in': 'Set-in', 'three-quarter': '3/4', none: 'None', peak: 'Peak', straight: 'Straight', sweetheart: 'Sweetheart' };
const optionLabel = (o) => OPTION_LABELS[o] ?? o.charAt(0).toUpperCase() + o.slice(1);
const OPTION_HINTS = { strap: { tank: 'A 5-6 cm tank strap', narrow: 'A 3 cm strap set out towards the shoulder', thin: 'A 1 cm camisole strap', racer: 'Cut in towards the neck, with a crew or high neck' }, yoke: { none: 'No yoke seam', sweetheart: 'A mesh yoke to a sweetheart edge', v: 'A mesh yoke to a V', straight: 'A mesh yoke to a straight edge', round: 'A mesh yoke to a shallow curve' }, waist: { none: 'No waist seam', straight: 'A straight seam at the waist', v: 'A chevron pointing down at the centre', peak: 'A seam rising to a peak at the centre' } };

// Picking an option changes that element only (block.set). When the change would take away
// something the designer added (stones on a line that goes, a piece in an opening), the panel
// asks first and keeps everything else either way.
function Shape({ doc }) {
	const cur = blockOf(doc), started = doc.curves.length > 0;
	const [ask, setAsk] = useState(null); // { patch, impact }
	const r = rev.value; // any real change to the design (not a dry run) withdraws the question
	useEffect(() => setAsk(null), [r]);
	const change = (patch) => {
		setAsk(null);
		try {
			const impact = app.exec({ op: 'block.set', ...patch }, { dryRun: true });
			if (impact && (impact.stones.length || impact.pieces.length || impact.straps.length || impact.lines.length)) { setAsk({ patch, impact }); return; }
		} catch (e) { notify(e.message, 'error'); return; }
		run({ op: 'block.set', ...patch });
	};
	const strip = (k) => (
		<Strip size="s" value={started ? cur[k] : null} onPick={(v) => change({ [k]: v })}
			items={BLOCK_OPTIONS[k].filter((o) => o !== 'wide').map((o) => {
				// a neckline or back the straps cannot hold is greyed out
				const off = started && !blockAllows(cur, k, o);
				return { key: o, label: optionLabel(o), hint: off ? `Not with ${cur.strap} straps` : OPTION_HINTS[k]?.[o], img: thumb('blocks', k + '-' + o), disabled: off };
			})} />
	);
	return (
		<Pane title="Shape">
			{!started ? <div class="dim note">Pick any element to start a leotard.</div> : null}
			{ELEMENTS.filter(([k]) => k !== 'strap' || cur.sleeves === 'tank').map(([k, label]) => (
				<Line key={k} label={label}>
					{strip(k)}
					{ask && k in ask.patch ? <Ask ask={ask} onYes={() => { setAsk(null); run({ op: 'block.set', ...ask.patch }); }} onNo={() => setAsk(null)} /> : null}
				</Line>
			))}
			<More>
				<Line label="Armhole">{strip('armhole')}</Line>
				{ask && 'armhole' in ask.patch ? <Ask ask={ask} onYes={() => { setAsk(null); run({ op: 'block.set', ...ask.patch }); }} onNo={() => setAsk(null)} /> : null}
			</More>
		</Pane>
	);
}

function Ask({ ask, onYes, onNo }) {
	const { impact, patch } = ask, [k, v] = Object.entries(patch)[0];
	const list = (items, one, many) => (items.length ? `${items.length === 1 ? one : many} (${items.join(', ')})` : null);
	const parts = [list(impact.stones, 'the stones', 'the stones'), list(impact.pieces, 'the piece', 'the pieces'), impact.straps.length ? `${impact.straps.length} strap${impact.straps.length > 1 ? 's' : ''}` : null].filter(Boolean);
	const loose = impact.lines.length ? `${impact.lines.length === 1 ? 'A drawn line comes' : impact.lines.length + ' drawn lines come'} loose from it (${impact.lines.join(', ')}).` : '';
	return (
		<div class="ask">
			<div>{parts.length ? `Changing the ${ELEMENTS.find(([e]) => e === k)?.[1].toLowerCase() ?? k} to ${optionLabel(v)} takes away ${parts.join(' and ')}. ` : `Changing the ${k} to ${optionLabel(v)}: `}{loose} Everything else stays.</div>
			<div class="actions"><button class="btn primary" onClick={onYes}>Change it</button><button class="btn" onClick={onNo}>Keep as is</button></div>
		</div>
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
				<More>
					<Line label="Expression"><Strip size="s" value={b.expression ?? 'neutral'} onPick={(v) => run({ op: 'body.set', expression: v })}
						items={catalogue.expressions.map((e) => ({ key: e.key, label: e.label, img: thumb('expressions', e.key) }))} /></Line>
					{catalogue.hairs.length > 1 ? <Line label="Hair"><Strip size="s" value={b.hair ?? catalogue.hairs[0].key} onPick={(v) => run({ op: 'body.set', hair: v })}
						items={catalogue.hairs.map((h) => ({ key: h.key, label: h.label, img: thumb('hairs', h.key) }))} /></Line> : null}
				</More>
			) : null}
		</Pane>
	);
}

// How the leotard sits in a pose (body/slide.js, experiment) and how it bridges hollows in every
// pose (Man.computeLift): this computer's setting, kept with
// the display settings (shown in the top bar's settings). A change re-solves the fit (a few
// seconds), so sliders apply on release. Grip runs on a log scale: slider 0..100 -> 0.001..1.
const gripOf = (x) => (x <= 0 ? 0 : 0.001 * 1000 ** (x / 100));
const gripPos = (g) => (g <= 0 ? 0 : Math.max(0, Math.min(100, (100 * Math.log10(g / 0.001)) / 3)));
// Bridging (lift tautness) is steep near 1 (measured 2026-10-25: taut 0.5 kept 3% of the bridged
// volume, 0.9 20%, 0.98 53%), so the slider is logarithmic in the slack 1 - taut: 0 -> 0 (hugs),
// 50 -> 0.97 (about half), 100 -> 1.
const tautOf = (x) => 1 - (10 ** (-3 * x / 100) - 0.001) / 0.999;
const LIFT_METHODS = [['membrane', 'Membrane (fills open dips)'], ['ball', 'Rolling ball (spans folds)']];
const tautPos = (t) => Math.round((-100 * Math.log10(0.999 * (1 - t) + 0.001)) / 3);

export function FabricFit() {
	rev.value;
	const d = display.value, [busy, setBusy] = useState(false), [ms, setMs] = useState(null);
	if (!d) return null;
	const posed = app.doc.body.pose !== 'a-pose';
	const apply = (patch) => {
		const n = { ...d, ...patch };
		display.value = n; saveDisplay(n);
		setBusy(true);
		// let the panel show "Fitting…" before the solve holds the page
		setTimeout(() => {
			const e = app.engine;
			e?.setSlide(n.slide, { shrink: n.slideTension, grip: n.slideGrip }, { taut: n.liftTaut, max: n.liftMax, reach: n.liftReach, method: n.liftMethod, ball: n.liftBall, seat: n.liftSeat, seatAlong: 1 / n.liftSeatAcross });
			setMs(e?.body.slideMs || null); setBusy(false);
		}, 30);
	};
	return (
		<div class="fit">
			<Line label="Fabric slides over the body"><Toggle value={d.slide} onChange={(v) => apply({ slide: v })} /></Line>
			{d.slide ? <>
				<Line label="Tension (fabric size against the body)">
					<CommitSlider value={Math.round(d.slideTension * 100)} min={60} max={100} step={1} format={(v) => `${v}%`} onCommit={(v) => apply({ slideTension: v / 100 })} />
				</Line>
				<Line label="Grip (how much it sticks to the skin)">
					<CommitSlider value={gripPos(d.slideGrip)} min={0} max={100} step={1} format={(v) => gripOf(v).toFixed(3)} onCommit={(v) => apply({ slideGrip: gripOf(v) })} />
				</Line>
			</> : null}
			<Line label="Taut across the seat"><Toggle value={d.liftSeat} onChange={(v) => apply({ liftSeat: v })} /></Line>
			{d.liftSeat ? (
				<Line label="Stretch across the seat (against up it; more pulls the cleft flatter)">
					<CommitSlider value={d.liftSeatAcross} min={1} max={10} step={0.5} format={(v) => `${v}x`} onCommit={(v) => apply({ liftSeatAcross: v })} />
				</Line>
			) : null}
			<Line label="How fabric spans hollows">
				<Select value={d.liftMethod} options={LIFT_METHODS} onChange={(v) => apply({ liftMethod: v })} />
			</Line>
			{d.liftMethod === 'ball' ? (
				<Line label="Ball size (bigger spans folds flatter)">
					<CommitSlider value={Math.round(d.liftBall * 1000)} min={0} max={150} step={5} format={(v) => `${v} mm`} onCommit={(v) => apply({ liftBall: v / 1000 })} />
				</Line>
			) : <>
				<Line label="Bridging (how taut fabric spans hollows)">
					<CommitSlider value={tautPos(d.liftTaut)} min={0} max={100} step={1} format={(v) => `${v}%`} onCommit={(v) => apply({ liftTaut: tautOf(v) })} />
				</Line>
				<Line label="Deepest bridge">
					<CommitSlider value={Math.round(d.liftMax * 1000)} min={0} max={50} step={1} format={(v) => `${v} mm`} onCommit={(v) => apply({ liftMax: v / 1000 })} />
				</Line>
				<Line label="Bridge reach (how wide a hollow it spans)">
					<CommitSlider value={Math.round(d.liftReach * 100)} min={25} max={150} step={5} format={(v) => `${v}%`} onCommit={(v) => apply({ liftReach: v / 100 })} />
				</Line>
			</>}
			<div class="dim note">{busy ? 'Fitting…' : !posed ? 'Sliding shows in poses; the mannequin stance is the design as drawn.' : ms ? `Fitted in ${(ms / 1000).toFixed(1)} s` : ''}</div>
		</div>
	);
}

function CommitSlider({ value, min, max, step, format, onCommit }) {
	const [v, setV] = useState(value);
	useEffect(() => setV(value), [value]);
	return (
		<span class="slider">
			<input type="range" min={min} max={max} step={step} value={v}
				onInput={(e) => setV(Number(e.currentTarget.value))} onChange={(e) => onCommit(Number(e.currentTarget.value))} />
			<span class="slider-val">{format(v)}</span>
		</span>
	);
}

// 'Young adult, athletic' -> 'Young adult'; 'Child, about 9' -> 'Child, 9'
const shortBody = (l) => l.replace(/, athletic$/, '').replace(/, about /, ', ').replace(/^Adult, broader build$/, 'Broader build');
const shortPose = (l) => l.replace(/ \(A-pose\)$/, '');

// --- the scene -----------------------------------------------------------------------------------

const GLARES = [['plain', 'None'], ['star', '4-point star'], ['star6', '6-point star'], ['arena', 'Arena (8)']];

function Environment({ s }) {
	const r = RIGS[s.rig] ?? {};
	return (
		<Pane title="Scene">
			<Strip value={s.rig} onPick={(v) => run({ op: 'scene.set', rig: v })}
				items={Object.keys(RIGS).map((k) => ({ key: k, label: k.replace(/ \((?:photo studio|ring of small lights|overhead lights|soft)\)$/, ''), hint: k, img: thumb('environments', k) }))} />
			<Line label="Brightness"><Slider value={s.exposure} min={0.3} max={2.5} format={(v) => Math.round(v * 100) + '%'} onChange={(v, g) => run({ op: 'scene.set', exposure: v, gesture: g })} /></Line>
			<More>
				<Line label="Turn the room"><Slider value={s.envRotation} min={0} max={6.283} format={(v) => Math.round(v * 180 / Math.PI) + '°'} onChange={(v, g) => run({ op: 'scene.set', envRotation: v, gesture: g })} /></Line>
				{r.hdri ? <Backdrop s={s} r={r} /> : null}
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
