// The application's layout: the stage is the whole window (the 3D view, with the pattern pieces beside it when
// asked), and everything else is frosted glass floating over it. Top left, the design (the library, its name, whether
// it is saved); top right, what is done to the whole design (undo, redo, mirror, the pattern, export, save, settings);
// at the left edge the spine, the four kinds of work (Shape, Fabric, Sparkle, Stage); at the right the one card for
// what is in hand (ui/Inspector.jsx: a chosen part, a tool, or the kind of work), there only while it is needed;
// bottom centre, the view. With the cut open its elements are named beside the body (ui/Callouts.jsx). The \ key puts
// all of it away (Tab stays the keyboard's way through the controls). The glass takes a dark tone when the backdrop behind the mannequin is dark. The library
// (ui/Library.jsx) opens over everything.
import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { app } from '../instance.js';
import { drawnLines, rev, stonesRun, selection, tab, tool, layout, stats, toast, notify, display, fitStatus, designsRev, showStats, hideOverlay, showHandles, hideMannequin, libraryOpen, busy, compiling, savedRev, prefs, setPref, zen } from './state.js';
import { Inspector, hasCard, pickWork, openWork } from './Inspector.jsx';
import { Callouts } from './Callouts.jsx';
import { Library } from './Library.jsx';
import { FlatView } from './FlatView.jsx';
import { tools } from './toolbar.js';
import { Card, Field, Segmented, Switch, CommitSlider, Button, IconButton } from './kit.jsx';
import { I } from './icons.jsx';
import { viewTo, cancel as cancelFlight } from './camera.js';
import { DISPLAY_OPTIONS, saveDisplay, fitOptions } from '../render/display.js';
import { BACKDROP_COLOUR } from '../render/viewport.js';
import { symmetryOn } from '../doc/symmetry.js';

// The stage's layouts: the model alone, the model and its flat pattern side by side (a divider between them), the pattern alone.
// The 3D view stays alive in every layout (its canvas is only narrowed away), so switching back is instant.
const LAYOUTS = [['3d', '3D', 'The model only'], ['split', 'Both', 'The model and its pattern pieces side by side'], ['flat', 'Pattern', 'The pattern pieces only']];
const setLayout = (k) => { layout.value = k; setPref('layout', k); };

// Dragging the divider between the 3D view and the pattern: its place is remembered (prefs.split, a share of the stage).
function SplitHandle() {
	const drag = (e) => {
		const stage = e.currentTarget.parentElement, r = stage.getBoundingClientRect();
		e.currentTarget.setPointerCapture(e.pointerId);
		const move = (m) => setPref('split', Math.min(0.8, Math.max(0.2, (m.clientX - r.left) / r.width)));
		const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
		addEventListener('pointermove', move); addEventListener('pointerup', up);
	};
	const key = (e) => {
		const s = prefs.value.split ?? 0.5;
		if (e.key === 'ArrowLeft') setPref('split', Math.max(0.2, s - 0.05));
		if (e.key === 'ArrowRight') setPref('split', Math.min(0.8, s + 0.05));
	};
	return <div class="split-handle" role="separator" aria-orientation="vertical" aria-label="Divider between the model and the pattern (drag, or the arrow keys)" tabIndex={0} onPointerDown={drag} onKeyDown={key} onDblClick={() => setPref('split', 0.5)} title="Drag to resize; double-click to centre" />;
}

// The glass's tone: dark when what is behind the mannequin is dark (a dark plain backdrop, the neon studio's room), so
// the panes sit in the picture instead of on it. The pattern sheet is paper, so beside it the glass stays light.
const luminance = (hex) => { const n = parseInt(String(hex).slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
function toneOf(scene) {
	if (layout.value !== '3d') return 'light';
	if (scene.backdrop === 'room') return /neon/i.test(scene.rig ?? '') ? 'dark' : 'light';
	return luminance(scene.backdropColour ?? BACKDROP_COLOUR) < 0.32 ? 'dark' : 'light';
}

export function Studio({ onViewport }) {
	rev.value;
	const card = hasCard();
	return (
		<div class={`studio layout-${layout.value} tone-${toneOf(app.doc.scene)} ${card ? 'has-card' : ''} ${zen.value ? 'zen' : ''}`} style={{ '--split': `${Math.round((prefs.value.split ?? 0.5) * 1000) / 10}%` }}>
			<main class="stage">
				<div class="view3d-cell"><div class="view3d" ref={(el) => el && onViewport?.(el)} /><Callouts /></div>
				{layout.value !== '3d' ? <div class="viewflat"><FlatView /></div> : null}
				{layout.value === 'split' ? <SplitHandle /> : null}
			</main>
			<div class="chrome">
				<TitleChip />
				<ActionChip />
				<Spine />
				<Inspector />
				<Settings />
				<div class="notices"><Prompter /><Busy /></div>
				<div class="notices foot"><Toast /><StageHint /></div>
				<CrystalCount />
				<ViewChip />
				<Hud />
				{zen.value ? <button class="zen-out glass" onClick={() => { zen.value = false; }}>Show the tools</button> : null}
			</div>
			<div id="flyouts" />
			<Library />
		</div>
	);
}

async function save() {
	try { notify('Saved to ' + await app.save()); designsRev.value++; savedRev.value = app.revision; } catch (e) { notify(e.message, 'error'); }
}
async function exportPattern() {
	try { notify('Pattern saved: ' + await app.exportPattern()); } catch (e) { notify(e.message, 'error'); }
}
const toggleMirror = () => app.setSymmetry(!symmetryOn(app.doc));
const run1 = (cmd) => { try { app.exec(cmd); } catch (e) { notify(e.message, 'error'); } };

// --- the top row ------------------------------------------------------------------------------------

function TitleChip() {
	rev.value;
	const name = app.doc.meta.name;
	const status = !app.file ? 'Not saved yet' : app.revision === savedRev.value ? 'Saved' : 'Unsaved changes';
	return (
		<header class="chip chip-title glass">
			<button class="chip-btn lead" title="All designs: start fresh or open one" aria-label="Designs" onClick={() => { libraryOpen.value = true; }}><I.designs size={19} /></button>
			<input class="doc-name" value={name} aria-label="The design's name" title="Rename this design" size={Math.max(name.length, 6)} onChange={(e) => run1({ op: 'meta.set', name: e.currentTarget.value })} />
			<span class={`doc-status ${status === 'Saved' ? 'ok' : status === 'Unsaved changes' ? 'dirty' : ''}`} title={status}><span>{status}</span></span>
		</header>
	);
}

function ActionChip() {
	rev.value;
	const h = app.history(), menu = settingsOpen.value, mirror = symmetryOn(app.doc);
	return (
		<div class="chip chip-actions glass" role="toolbar" aria-label="The design">
			<IconButton icon={<I.undo size={20} />} label={h.undo.length ? 'Undo ' + h.undo[h.undo.length - 1] + ' (Ctrl+Z)' : 'Nothing to undo'} disabled={!h.undo.length} onClick={() => app.undo()} />
			<IconButton icon={<I.redo size={20} />} label={h.redo.length ? 'Redo ' + h.redo[0] + ' (Ctrl+Y)' : 'Nothing to redo'} disabled={!h.redo.length} onClick={() => app.redo()} />
			<span class="chip-div" />
			<button class={`chip-btn txt ${mirror ? 'active' : ''}`} title={mirror ? 'Mirror is on: changes reach both sides. Turn off to change one side only (X)' : 'Mirror is off: changes reach one side only. A mirrored part you change splits from its pair (X)'} aria-pressed={mirror} onClick={toggleMirror}><I.mirror size={19} /><span>Mirror</span></button>
			<span class="vb-seg" role="radiogroup" aria-label="What the stage shows">
				{LAYOUTS.map(([k, l, hint]) => <button key={k} role="radio" aria-checked={layout.value === k} class={`vb-btn ${layout.value === k ? 'on' : ''}`} title={hint} onClick={() => setLayout(k)}>{l}</button>)}
			</span>
			<button class="chip-btn txt" title="Save the printable full-size pattern (PDF)" onClick={exportPattern}><I.export size={19} /><span>Export</span></button>
			<button class="chip-btn primary" title="Save to your designs (Ctrl+S)" onClick={save}>Save</button>
			<span class="menu-anchor"><IconButton icon={<I.settings size={20} />} label="Settings" active={menu} onClick={() => { settingsOpen.value = !menu; }} /></span>
		</div>
	);
}

// --- the spine: the four kinds of work ---------------------------------------------------------------

const WORK = [
	['shape', 'Shape', I.shape, 'The cut: neckline, back, sleeves, leg; seams, straps and overlay pieces'],
	['fabric', 'Fabric', I.fabric, 'Each piece\'s colour and fabric (or tap a piece on the leotard)'],
	['sparkle', 'Sparkle', I.sparkle, 'Crystals and lettering'],
	['stage', 'Stage', I.stage, 'The mannequin, its pose and the studio'],
];
function Spine() {
	const t = tab.value;
	return (
		<nav class="spine glass" aria-label="Kinds of work">
			{WORK.map(([k, label, Icon, hint]) => (
				<button key={k} class={`spine-btn ${k === t ? 'on' : ''}`} title={hint} aria-pressed={k === t} onClick={() => pickWork(k)}>
					<Icon size={23} /><span>{label}</span>
				</button>
			))}
		</nav>
	);
}

// --- settings: this computer's (render/display.js, ui/state.js prefs), not part of the design, no undo ----------

// (A card of its own in the chrome, over the inspector's place: a pane inside the action chip could not blur the stage,
// the chip's own glass being all it would have behind it.)
const settingsOpen = signal(false);
function Settings() {
	const d = display.value, st = stats.value, ref = useRef(null), open = settingsOpen.value, onClose = () => { settingsOpen.value = false; };
	useEffect(() => {
		if (!open) return;
		const off = (e) => { if (!ref.current?.contains(e.target) && !e.target.closest?.('.menu-anchor')) onClose(); };
		const esc = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); } };
		window.addEventListener('pointerdown', off); window.addEventListener('keydown', esc, true);
		return () => { window.removeEventListener('pointerdown', off); window.removeEventListener('keydown', esc, true); };
	}, [open]);
	if (!d || !open) return null;
	const set = (k, v) => { const n = { ...d, [k]: v }; display.value = n; saveDisplay(n); app.engine?.viewport.applyDisplay(n); };
	return (
		<div class="inspector settings" ref={ref} role="dialog" aria-label="Settings">
			<Card kind="settings" title="Settings" onClose={onClose} faces={[['display', 'Display'], ['working', 'Working'], ['fit', 'Fabric fit']]}>
				{(face) => face === 'display' ? <>
					<Field label="Resolution"><Segmented value={d.resolution} options={DISPLAY_OPTIONS.resolution.map(([v]) => [v, Math.round(v * 100) + '%'])} onPick={(v) => set('resolution', v)} /></Field>
					<Field label="Smooth edges"><Segmented value={d.msaa} options={DISPLAY_OPTIONS.msaa} onPick={(v) => set('msaa', v)} /></Field>
					<Field label="Shadows"><Segmented value={d.shadows} options={[['off', 'Off'], ['soft', 'Soft'], ['sharp', 'Detailed']]} onPick={(v) => set('shadows', v)} /></Field>
					<Switch label="Lower resolution while turning" value={d.dynamicRes} onChange={(v) => set('dynamicRes', v)} />
					<Switch label="Glow" value={d.bloom} onChange={(v) => set('bloom', v)} />
					<Switch label="Contact shadows" value={d.ao} onChange={(v) => set('ao', v)} />
				</> : face === 'working' ? <>
					<Switch label="Turn the view to the part being changed" value={prefs.value.followCamera} onChange={(v) => setPref('followCamera', v)} />
					<Switch label="Show the frame rate" value={showStats.value} onChange={(v) => { showStats.value = v; }} />
					<div class="pop-row"><Button size="small" title="Measure the true GPU cost of a frame" onClick={async () => notify(`Frame cost ${await app.benchmark()} ms`)}>Measure frame cost</Button>
						{st.fps ? <span class="pop-meta">{st.width}×{st.height} px · {st.fps.toFixed(0)} fps</span> : null}</div>
				</> : <><FittedFit /><FabricFit /></>}
			</Card>
		</div>
	);
}

// How the fabric bridges hollows in every pose (Man.computeLift, the seat sheet): this computer's
// setting, kept with the display settings. A fitted garment's re-fit stands on this surface. A change
// re-solves it (a second or two), so sliders apply on release. (The pose slide and its tension and
// grip were removed on 2026-11-08: knowledge/engineering/app/garment-sliding.md.) Bridging (lift
// tautness) is steep near 1 (measured 2026-10-25: taut 0.5 kept 3% of the bridged volume, 0.9 20%,
// 0.98 53%), so its slider is logarithmic in the slack 1 - taut: 0 -> 0 (hugs), 50 -> 0.97 (about
// half), 100 -> 1.
const tautOf = (x) => 1 - (10 ** (-3 * x / 100) - 0.001) / 0.999;
const tautPos = (t) => Math.round((-100 * Math.log10(0.999 * (1 - t) + 0.001)) / 3);
function FabricFit() {
	const d = display.value, [fitting, setFitting] = useState(false), [ms, setMs] = useState(null);
	if (!d) return null;
	const apply = (patch) => {
		const n = { ...d, ...patch };
		display.value = n; saveDisplay(n);
		setFitting(true);
		// let the card show "Fitting…" before the solve holds the page
		setTimeout(() => {
			const t0 = performance.now();
			app.engine?.setLift({ taut: n.liftTaut, max: n.liftMax, reach: n.liftReach, method: n.liftMethod, ball: n.liftBall, seat: n.liftSeat, seatAlong: 1 / n.liftSeatAcross });
			setMs(performance.now() - t0); setFitting(false);
		}, 30);
	};
	return (
		<Field label="Drawn pieces: how fabric spans hollows" aside={fitting ? 'Fitting…' : ms ? `${(ms / 1000).toFixed(1)} s` : null}>
			<Switch label="Taut across the seat" value={d.liftSeat} onChange={(v) => apply({ liftSeat: v })} />
			{d.liftSeat ? <CommitSlider label="Stretch across the seat" hint="More pulls the cleft flatter" value={d.liftSeatAcross} min={1} max={30} step={0.5} format={(v) => `${v}×`} onCommit={(v) => apply({ liftSeatAcross: v })} /> : null}
			<Segmented value={d.liftMethod} options={[['membrane', 'Membrane'], ['ball', 'Rolling ball']]} onPick={(v) => apply({ liftMethod: v })} />
			{d.liftMethod === 'ball' ? (
				<CommitSlider label="Ball size" hint="Bigger spans folds flatter" value={Math.round(d.liftBall * 1000)} min={0} max={150} step={5} format={(v) => `${v} mm`} onCommit={(v) => apply({ liftBall: v / 1000 })} />
			) : <>
				<CommitSlider label="Bridging" hint="How taut fabric spans hollows" value={tautPos(d.liftTaut)} min={0} max={100} step={1} format={(v) => `${v}%`} onCommit={(v) => apply({ liftTaut: tautOf(v) })} />
				<CommitSlider label="Deepest bridge" value={Math.round(d.liftMax * 1000)} min={0} max={50} step={1} format={(v) => `${v} mm`} onCommit={(v) => apply({ liftMax: v / 1000 })} />
				<CommitSlider label="Bridge reach" hint="How wide a hollow it spans" value={Math.round(d.liftReach * 100)} min={25} max={150} step={5} format={(v) => `${v}%`} onCommit={(v) => apply({ liftReach: v / 100 })} />
			</>}
		</Field>
	);
}

// A fitted garment (the Shape card's Garment face): whether it is re-fitted on the GPU after a pose or body change (fit/refit.js),
// for how many steps and with how much friction, and how far its fabric is drawn off the body. This computer's setting, like the rest.
function FittedFit() {
	const d = display.value, f = app.engine?.fitted, st = fitStatus.value;
	if (!d) return null;
	const apply = (patch) => { const n = { ...d, ...patch }; display.value = n; saveDisplay(n); f?.setOptions(fitOptions(n)); };
	const said = {
		off: 'These apply to a fitted garment (Shape, Garment).',
		carried: st.note ?? 'Carried onto the body by surface position, not re-fitted.',
		fitting: 'Re-fitting…',
		fitted: `Re-fitted: ${st.steps} steps in ${(st.seconds ?? 0).toFixed(2)} s (setting up ${(st.setup ?? 0).toFixed(2)} s)`,
		error: `The re-fit could not run here: ${st.note}`,
	}[st.state];
	return (
		<Field label="A fitted garment (experimental)">
			<Switch label="Re-fit it on the body shown" value={d.fitRefit} onChange={(v) => apply({ fitRefit: v })} />
			{d.fitRefit ? <>
				<CommitSlider label="Re-fit steps" hint="More settles closer, takes longer" value={d.fitSteps} min={20} max={750} step={10} format={(v) => `${v}`} onCommit={(v) => apply({ fitSteps: v })} />
				<CommitSlider label="Friction against the skin" value={Math.round(d.fitMu * 100)} min={0} max={100} step={5} format={(v) => (v / 100).toFixed(2)} onCommit={(v) => apply({ fitMu: v / 100 })} />
			</> : null}
			<CommitSlider label="Fabric drawn off the body" value={Math.round(d.fitLift * 10000) / 10} min={0} max={5} step={0.1} format={(v) => `${(+v).toFixed(1)} mm`} onCommit={(v) => apply({ fitLift: v / 1000 })} />
			<p class="pop-meta">{said}</p>
		</Field>
	);
}

// --- over the stage ---------------------------------------------------------------------------------

const VIEWS = [['front', 'Front'], ['threeq', '¾'], ['side', 'Side'], ['back', 'Back']];
function ViewChip() {
	if (layout.value === 'flat') return null;
	return (
		<div class="chip chip-view glass" role="toolbar" aria-label="View">
			{VIEWS.map(([k, l]) => <button key={k} class={`vb-btn ${k === 'threeq' || k === 'side' ? 'side' : ''}`} title={`View from the ${k === 'threeq' ? 'front, three-quarter' : k}`} onClick={() => viewTo(k)}>{l}</button>)}
			<span class="chip-div" />
			<IconButton icon={<I.lines size={20} />} label={hideOverlay.value ? 'Show the lines and points (H)' : 'Hide the lines and points to see the look (H)'} active={!hideOverlay.value} kind="vb" onClick={() => { hideOverlay.value = !hideOverlay.value; }} />
			<IconButton icon={<I.mannequin size={20} />} label={hideMannequin.value ? 'Show the mannequin (M)' : 'Hide the mannequin: the leotard floats on its own (M)'} active={!hideMannequin.value} kind="vb" onClick={() => { hideMannequin.value = !hideMannequin.value; }} />
			{chosenPattern() ? <IconButton icon={<I.handles size={20} />} label={showHandles.value ? 'Hide the pattern\'s handles to see it clean' : 'Show the pattern\'s handles'} active={showHandles.value} kind="vb" onClick={() => { showHandles.value = !showHandles.value; }} /> : null}
			<span class="chip-div" />
			<IconButton icon={<I.fit size={20} />} label="Fit the leotard in view (double-click the stage)" onClick={() => viewTo('fit')} />
			<IconButton icon={<I.eye size={20} />} label="Put the tools away: the leotard alone (\)" onClick={() => { zen.value = true; }} />
		</div>
	);
}

// The pattern on show in the card, if one is.
const chosenPattern = () => { const s = selection.value; return s?.kind === 'stones' ? app.doc.stones.find((g) => g.id === s.id && g.kind === 'pattern') ?? null : null; };

// The crystals on the design, always in view; with a stone group chosen, how many of them are its.
function CrystalCount() {
	rev.value; stonesRun.value;
	const run = app.engine?.stoneRun, total = run?.count ?? run?.stones.length ?? 0;
	if (!total || layout.value === 'flat') return null;
	const s = selection.value, id = s?.kind === 'stones' ? s.id : null;
	// (a run's own count: a pattern the GPU places has no record per stone until one is asked for)
	const mine = id ? run.countOf?.(id) ?? run.stones.filter((x) => x.gen === id).length : 0;
	return (
		<div class="chip chip-count glass" role="status" title="Crystals on the whole design, and in the group being edited">
			{id ? <span class="cc-part cc-mine"><span class="cc-label">{chosenPattern() ? 'This pattern' : 'This group'}</span><span class="cc-num">{mine.toLocaleString()}</span></span> : null}
			<span class="cc-part"><span class="cc-label">Crystals</span><span class="cc-num">{total.toLocaleString()}</span></span>
		</div>
	);
}

// What a click on the model does while a tool other than Select is on, and the way out of it.
const MODE_TEXT = {
	pen: ['Drawing a seam', 'Click the body to place points · Shift for a corner · click the first point to close, or end on another line'],
	strap: ['Drawing a strap', 'Click points from edge to edge · Shift for a corner · end on an edge'],
	overlay: ['Drawing an overlay piece', 'Draw each new edge from one seam or edge to another. Or click round a shape, back to its first point · Shift for a corner'],
	stones: ['Adding crystals', 'Click a line for rows along it, or a piece to fill it'],
	pattern: ['Laying a pattern', 'Click the piece to lay it on; its handles and settings come next'],
	single: ['Placing crystals', 'Click to place one crystal'],
	erase: ['Erasing crystals', 'Click to erase the crystals there'],
	decal: ['Placing lettering', 'Click the leotard where its centre goes'],
	eyedrop: ['Matching a colour', 'Click the piece on the reference photo'],
};
function Prompter() {
	const t = tool.value, lines = t === 'overlay' ? drawnLines.value : null;
	const m = !lines ? MODE_TEXT[t] : lines.areas ? ['Click the area', 'Click the area that becomes the overlay piece, or draw another edge from one seam or edge to another'] : ['Draw another edge', 'This line does not enclose an area with fabric yet: end a line on a seam or edge'];
	if (!m || layout.value === 'flat') return null;
	const drawing = t === 'pen' || t === 'strap' || t === 'overlay';
	return (
		<div class="prompter" role="status">
			<span class="pr-text"><strong>{m[0]}</strong><span>{m[1]}</span></span>
			{drawing && !lines ? <button class="pr-btn" onClick={() => { app.tools?.finishPen(); }}>Finish <kbd>Enter</kbd></button> : null}
			{lines ? <button class="pr-btn" onClick={() => { app.tools?.undoLine(); }}>Undo line <kbd>⌫</kbd></button> : null}
			<button class={`pr-btn ${drawing ? 'quiet' : ''}`} onClick={() => { app.tools?.cancelPen(); tool.value = 'move'; }}>{drawing ? 'Cancel' : 'Done'} <kbd>Esc</kbd></button>
		</div>
	);
}

// How to work the stage, until the first part is chosen (or it is closed).
function StageHint() {
	const sel = selection.value;
	useEffect(() => { if (sel && !prefs.value.hintDone) setPref('hintDone', true); }, [sel]);
	if (prefs.value.hintDone || tool.value !== 'move' || layout.value === 'flat' || toast.value) return null;
	return (
		<div class="stage-hint glass" role="note">
			<span><b>Tap any part</b> of the leotard to change it · <b>drag</b> to turn · <b>pinch or scroll</b> to zoom</span>
			<IconButton icon={<I.close size={14} />} label="Got it" onClick={() => setPref('hintDone', true)} />
		</div>
	);
}

function Busy() {
	// a slow change the UI asked for, a fitted garment being re-fitted (render/fitted.js), or new shaders compiling
	// (render/viewport.js prepare): the view holds its last frame meanwhile
	const b = busy.value ?? (fitStatus.value.state === 'fitting' ? { text: 'Fitting the leotard…' } : compiling.value ? { text: 'Preparing the materials…' } : null);
	return b ? <div class="stage-busy glass" role="status"><span class="spinner" /><span>{b.text}</span><span class="busy-sheen" /></div> : null;
}

function Hud() {
	const s = stats.value;
	if (!showStats.value) return null;
	return <div class="hud">{s.fps ? `${s.fps.toFixed(0)} fps · ${s.cpuMs.toFixed(1)} ms CPU · ${(s.triangles / 1e6).toFixed(2)}M tris · ${s.stones ?? 0} stones · ${s.width}×${s.height}` : 'loading…'}</div>;
}

function Toast() {
	const t = toast.value;
	return t ? <div key={t.at} class={`toast ${t.kind}`} role="status">{t.kind === 'error' ? <I.info size={18} /> : <I.check size={18} />}<span>{t.text}</span></div> : null;
}

// --- keyboard ---------------------------------------------------------------------------------------

// Undo, redo, save; the tool keys (each opens its kind of work); H lines, M mannequin, X mirror, \ the tools away, Esc.
export function useShortcuts() {
	useEffect(() => {
		const onKey = (e) => {
			if (e.target.closest?.('input, select, textarea') || libraryOpen.value) return;
			const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
			if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); app.undo(); }
			else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); app.redo(); }
			else if (mod && k === 's') { e.preventDefault(); save(); }
			else if (!mod && !e.altKey) {
				const t = tools.find((x) => x.key && x.key.toLowerCase() === k);
				if (k === '\\') { e.preventDefault(); zen.value = !zen.value; }
				else if (zen.value && k === 'escape') zen.value = false;
				else if (t) { if (t.tab) openWork(t.tab); tool.value = t.id; }
				// Esc steps out: a tool, then the part chosen, then the card
				else if (k === 'escape') { if (tool.value !== 'move') tool.value = 'move'; else if (selection.value) selection.value = null; else tab.value = null; cancelFlight(); }
				else if (k === 'h') hideOverlay.value = !hideOverlay.value;
				else if (k === 'm') hideMannequin.value = !hideMannequin.value;
				else if (k === 'x') toggleMirror();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);
}
