// Application layout: the top bar (designs library, the design's name, undo and redo, pattern,
// export, save, settings), the stage (the 3D view, with the pattern pieces beside it when asked,
// the view bar, the bar of the mode a click is in, read-outs) and the panel (ui/Panel.jsx). The
// library (ui/Library.jsx) opens over everything.
import { useEffect, useRef, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { drawnLines, rev, stonesRun, selection, tool, layout, stats, toast, notify, display, fitStatus, designsRev, showStats, hideOverlay, showHandles, hideMannequin, libraryOpen, busy, compiling, savedRev, prefs, setPref } from './state.js';
import { Panel, pickTab } from './Panel.jsx';
import { Library } from './Library.jsx';
import { FlatView } from './FlatView.jsx';
import { tools } from './toolbar.js';
import { Field, Segmented, Switch, CommitSlider, Button, IconButton } from './kit.jsx';
import { I } from './icons.jsx';
import { viewTo, cancel as cancelFlight } from './camera.js';
import { DISPLAY_OPTIONS, saveDisplay, fitOptions } from '../render/display.js';
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

export function Shell({ onViewport }) {
	return (
		<div class={`shell layout-${layout.value}`}>
			<TopBar />
			<main class="stage" style={{ '--split': `${Math.round((prefs.value.split ?? 0.5) * 1000) / 10}%` }}>
				<div class="view3d" ref={(el) => el && onViewport?.(el)} />
				{layout.value !== '3d' ? <div class="viewflat"><FlatView /></div> : null}
				{layout.value === 'split' ? <SplitHandle /> : null}
				<ModeBar />
				<StageHint />
				<Busy />
				<ViewBar />
				<Hud />
				<Toast />
			</main>
			<Panel />
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

function TopBar() {
	rev.value;
	const h = app.history(), [menu, setMenu] = useState(false), name = app.doc.meta.name;
	const status = !app.file ? 'Not saved yet' : app.revision === savedRev.value ? 'Saved' : 'Unsaved changes';
	return (
		<header class="topbar">
			<div class="tb-left">
				<button class="tb-btn strong" title="All designs: start fresh or open one" onClick={() => { libraryOpen.value = true; }}><I.designs size={19} /><span>Designs</span></button>
				<span class="tb-div" />
				<div class="doc">
					<input class="doc-name" value={name} title="Rename this design" size={Math.max(name.length, 6)} onChange={(e) => run1({ op: 'meta.set', name: e.currentTarget.value })} />
					<span class={`doc-status ${status === 'Saved' ? 'ok' : ''}`}>{status}</span>
				</div>
			</div>
			<div class="tb-right">
				<span class="tb-group">
					<IconButton icon={<I.undo size={20} />} label={h.undo.length ? 'Undo ' + h.undo[h.undo.length - 1] + ' (Ctrl+Z)' : 'Nothing to undo'} disabled={!h.undo.length} onClick={() => app.undo()} />
					<IconButton icon={<I.redo size={20} />} label={h.redo.length ? 'Redo ' + h.redo[0] + ' (Ctrl+Y)' : 'Nothing to redo'} disabled={!h.redo.length} onClick={() => app.redo()} />
				</span>
				<span class="tb-div" />
				<button class={`tb-btn ${symmetryOn(app.doc) ? 'active' : ''}`} title={symmetryOn(app.doc) ? 'Mirror is on: changes reach both sides. Turn off to change one side only (X)' : 'Mirror is off: changes reach one side only. A mirrored part you change splits from its pair (X)'} aria-pressed={symmetryOn(app.doc)} onClick={toggleMirror}><I.mirror size={19} /><span>Mirror</span></button>
				<span class="tb-seg" role="radiogroup" aria-label="View">
					{LAYOUTS.map(([k, l, hint]) => <button key={k} role="radio" aria-checked={layout.value === k} class={`tb-btn ${layout.value === k ? 'active' : ''}`} title={hint} onClick={() => setLayout(k)}>{k === 'flat' ? <I.pattern size={19} /> : null}<span>{l}</span></button>)}
				</span>
				<button class="tb-btn" title="Save the printable full-size pattern (PDF)" onClick={exportPattern}><I.export size={19} /><span>Export</span></button>
				<button class="btn primary" title="Save to your designs (Ctrl+S)" onClick={save}>Save</button>
				<span class="menu-anchor">
					<IconButton icon={<I.settings size={20} />} label="Settings" active={menu} onClick={() => setMenu(!menu)} />
					{menu ? <Settings onClose={() => setMenu(false)} /> : null}
				</span>
			</div>
		</header>
	);
}
const toggleMirror = () => app.setSymmetry(!symmetryOn(app.doc));
const run1 = (cmd) => { try { app.exec(cmd); } catch (e) { notify(e.message, 'error'); } };

// This computer's settings (render/display.js, ui/state.js prefs): not part of the design, no undo.
function Settings({ onClose }) {
	const d = display.value, st = stats.value, ref = useRef(null);
	useEffect(() => {
		const off = (e) => { if (!ref.current?.contains(e.target) && !e.target.closest?.('.menu-anchor')) onClose(); };
		const esc = (e) => { if (e.key === 'Escape') onClose(); };
		window.addEventListener('pointerdown', off); window.addEventListener('keydown', esc);
		return () => { window.removeEventListener('pointerdown', off); window.removeEventListener('keydown', esc); };
	}, []);
	if (!d) return null;
	const set = (k, v) => { const n = { ...d, [k]: v }; display.value = n; saveDisplay(n); app.engine?.viewport.applyDisplay(n); };
	return (
		<div class="popover" ref={ref} role="dialog" aria-label="Settings">
			<h3 class="pop-title">Display</h3>
			<Field label="Resolution"><Segmented value={d.resolution} options={DISPLAY_OPTIONS.resolution.map(([v]) => [v, Math.round(v * 100) + '%'])} onPick={(v) => set('resolution', v)} /></Field>
			<Field label="Smooth edges"><Segmented value={d.msaa} options={DISPLAY_OPTIONS.msaa} onPick={(v) => set('msaa', v)} /></Field>
			<Field label="Shadows"><Segmented value={d.shadows} options={[['off', 'Off'], ['soft', 'Soft'], ['sharp', 'Detailed']]} onPick={(v) => set('shadows', v)} /></Field>
			<Switch label="Lower resolution while turning" value={d.dynamicRes} onChange={(v) => set('dynamicRes', v)} />
			<Switch label="Glow" value={d.bloom} onChange={(v) => set('bloom', v)} />
			<Switch label="Contact shadows" value={d.ao} onChange={(v) => set('ao', v)} />
			<h3 class="pop-title">Working</h3>
			<Switch label="Turn the view to the part being changed" value={prefs.value.followCamera} onChange={(v) => setPref('followCamera', v)} />
			<details class="disclosure">
				<summary><I.chevronRight size={16} class="disc-chev" /><span>Fabric fit (experimental)</span></summary>
				<div class="disc-body"><FittedFit /><FabricFit /></div>
			</details>
			<h3 class="pop-title">Performance</h3>
			<Switch label="Show the frame rate" value={showStats.value} onChange={(v) => { showStats.value = v; }} />
			<div class="pop-row"><Button size="small" title="Measure the true GPU cost of a frame" onClick={async () => notify(`Frame cost ${await app.benchmark()} ms`)}>Measure frame cost</Button>
				{st.fps ? <span class="pop-meta">{st.width}×{st.height} px · {st.fps.toFixed(0)} fps</span> : null}</div>
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
		// let the panel show "Fitting…" before the solve holds the page
		setTimeout(() => {
			const t0 = performance.now();
			app.engine?.setLift({ taut: n.liftTaut, max: n.liftMax, reach: n.liftReach, method: n.liftMethod, ball: n.liftBall, seat: n.liftSeat, seatAlong: 1 / n.liftSeatAcross });
			setMs(performance.now() - t0); setFitting(false);
		}, 30);
	};
	return (
		<div class="fit">
			<Switch label="Taut across the seat" value={d.liftSeat} onChange={(v) => apply({ liftSeat: v })} />
			{d.liftSeat ? <Field label="Stretch across the seat (more pulls the cleft flatter)"><CommitSlider value={d.liftSeatAcross} min={1} max={30} step={0.5} format={(v) => `${v}×`} onCommit={(v) => apply({ liftSeatAcross: v })} /></Field> : null}
			<Field label="How fabric spans hollows"><Segmented value={d.liftMethod} options={[['membrane', 'Membrane'], ['ball', 'Rolling ball']]} onPick={(v) => apply({ liftMethod: v })} /></Field>
			{d.liftMethod === 'ball' ? (
				<Field label="Ball size (bigger spans folds flatter)"><CommitSlider value={Math.round(d.liftBall * 1000)} min={0} max={150} step={5} format={(v) => `${v} mm`} onCommit={(v) => apply({ liftBall: v / 1000 })} /></Field>
			) : <>
				<Field label="Bridging (how taut fabric spans hollows)"><CommitSlider value={tautPos(d.liftTaut)} min={0} max={100} step={1} format={(v) => `${v}%`} onCommit={(v) => apply({ liftTaut: tautOf(v) })} /></Field>
				<Field label="Deepest bridge"><CommitSlider value={Math.round(d.liftMax * 1000)} min={0} max={50} step={1} format={(v) => `${v} mm`} onCommit={(v) => apply({ liftMax: v / 1000 })} /></Field>
				<Field label="Bridge reach (how wide a hollow it spans)"><CommitSlider value={Math.round(d.liftReach * 100)} min={25} max={150} step={5} format={(v) => `${v}%`} onCommit={(v) => apply({ liftReach: v / 100 })} /></Field>
			</>}
			<p class="pop-meta">{fitting ? 'Fitting…' : ms ? `Applied in ${(ms / 1000).toFixed(1)} s` : ''}</p>
		</div>
	);
}

// A fitted garment (Shape tab, Garment): whether it is re-fitted on the GPU after a pose or body change (fit/refit.js), for how
// many steps and with how much friction, and how far its fabric is drawn off the body. This computer's setting, like the rest.
function FittedFit() {
	const d = display.value, f = app.engine?.fitted, st = fitStatus.value;
	if (!d) return null;
	const apply = (patch) => { const n = { ...d, ...patch }; display.value = n; saveDisplay(n); f?.setOptions(fitOptions(n)); };
	const said = {
		off: 'These apply to a fitted garment (Shape tab, Garment).',
		carried: st.note ?? 'Carried onto the body by surface position, not re-fitted.',
		fitting: 'Re-fitting…',
		fitted: `Re-fitted: ${st.steps} steps in ${(st.seconds ?? 0).toFixed(2)} s (setting up ${(st.setup ?? 0).toFixed(2)} s)`,
		error: `The re-fit could not run here: ${st.note}`,
	}[st.state];
	return (
		<div class="fit">
			<Switch label="Re-fit a fitted garment on the body shown" value={d.fitRefit} onChange={(v) => apply({ fitRefit: v })} />
			{d.fitRefit ? <>
				<Field label="Re-fit steps (more settles closer, takes longer)"><CommitSlider value={d.fitSteps} min={20} max={750} step={10} format={(v) => `${v}`} onCommit={(v) => apply({ fitSteps: v })} /></Field>
				<Field label="Friction against the skin"><CommitSlider value={Math.round(d.fitMu * 100)} min={0} max={100} step={5} format={(v) => (v / 100).toFixed(2)} onCommit={(v) => apply({ fitMu: v / 100 })} /></Field>
			</> : null}
			<Field label="Fabric drawn off the body"><CommitSlider value={Math.round(d.fitLift * 10000) / 10} min={0} max={5} step={0.1} format={(v) => `${(+v).toFixed(1)} mm`} onCommit={(v) => apply({ fitLift: v / 1000 })} /></Field>
			<p class="pop-meta">{said}</p>
		</div>
	);
}

// --- over the stage ---------------------------------------------------------------------------------

const VIEWS = [['front', 'Front'], ['threeq', '¾'], ['side', 'Side'], ['back', 'Back']];
function ViewBar() {
	return (
		<div class="viewbar" role="toolbar" aria-label="View">
			<CrystalCount />
			{VIEWS.map(([k, l]) => <button key={k} class="vb-btn" title={`View from the ${k === 'threeq' ? 'front, three-quarter' : k}`} onClick={() => viewTo(k)}>{l}</button>)}
			<span class="vb-div" />
			<IconButton icon={<I.lines size={20} />} label={hideOverlay.value ? 'Show the lines and points (H)' : 'Hide the lines and points to see the look (H)'} active={!hideOverlay.value} kind="vb" onClick={() => { hideOverlay.value = !hideOverlay.value; }} />
			<IconButton icon={<I.mannequin size={20} />} label={hideMannequin.value ? 'Show the mannequin (M)' : 'Hide the mannequin: the leotard floats on its own (M)'} active={!hideMannequin.value} kind="vb" onClick={() => { hideMannequin.value = !hideMannequin.value; }} />
			{chosenPattern() ? <IconButton icon={<I.handles size={20} />} label={showHandles.value ? 'Hide the pattern\'s handles to see it clean' : 'Show the pattern\'s handles'} active={showHandles.value} kind="vb" onClick={() => { showHandles.value = !showHandles.value; }} /> : null}
			<span class="vb-div" />
			<IconButton icon={<I.fit size={20} />} label="Fit the leotard in view" kind="vb" onClick={() => viewTo('fit')} />
		</div>
	);
}

// The pattern on show in the panel, if one is.
const chosenPattern = () => { const s = selection.value; return s?.kind === 'stones' ? app.doc.stones.find((g) => g.id === s.id && g.kind === 'pattern') ?? null : null; };

// The crystals on the design, always in view; with a stone group chosen, how many of them are its.
function CrystalCount() {
	rev.value; stonesRun.value;
	const run = app.engine?.stoneRun, total = run?.count ?? run?.stones.length ?? 0;
	if (!total) return null;
	const s = selection.value, id = s?.kind === 'stones' ? s.id : null;
	// (a run's own count: a pattern the GPU places has no record per stone until one is asked for)
	const mine = id ? run.countOf?.(id) ?? run.stones.filter((x) => x.gen === id).length : 0;
	return (
		<div class="crystal-count" role="status" title="Crystals on the whole design, and in the group being edited">
			{id ? <span class="cc-part cc-mine"><span class="cc-label">{chosenPattern() ? 'This pattern' : 'This group'}</span><span class="cc-num">{mine.toLocaleString()}</span></span> : null}
			<span class="cc-part"><span class="cc-label">Whole design</span><span class="cc-num">{total.toLocaleString()}</span></span>
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
function ModeBar() {
	const t = tool.value, lines = t === 'overlay' ? drawnLines.value : null;
	const m = !lines ? MODE_TEXT[t] : lines.areas ? ['Click the area', 'Click the area that becomes the overlay piece, or draw another edge from one seam or edge to another'] : ['Draw another edge', 'This line does not enclose an area with fabric yet: end a line on a seam or edge'];
	if (!m) return null;
	const drawing = t === 'pen' || t === 'strap' || t === 'overlay';
	return (
		<div class="modebar" role="status">
			<span class="mb-text"><strong>{m[0]}</strong><span>{m[1]}</span></span>
			{drawing && !lines ? <button class="mb-btn" onClick={() => { app.tools?.finishPen(); }}>Finish <kbd>Enter</kbd></button> : null}
			{lines ? <button class="mb-btn" onClick={() => { app.tools?.undoLine(); }}>Undo line <kbd>⌫</kbd></button> : null}
			<button class={`mb-btn ${drawing ? 'quiet' : ''}`} onClick={() => { app.tools?.cancelPen(); tool.value = 'move'; }}>{drawing ? 'Cancel' : 'Done'} <kbd>Esc</kbd></button>
		</div>
	);
}

// How to work the stage, until the first part is chosen (or it is closed).
function StageHint() {
	const sel = selection.value;
	useEffect(() => { if (sel && !prefs.value.hintDone) setPref('hintDone', true); }, [sel]);
	if (prefs.value.hintDone || tool.value !== 'move') return null;
	return (
		<div class="stage-hint" role="note">
			<span><b>Drag</b> to turn the mannequin · <b>scroll or pinch</b> to zoom · <b>tap a piece</b> to change its fabric</span>
			<IconButton icon={<I.close size={14} />} label="Got it" onClick={() => setPref('hintDone', true)} />
		</div>
	);
}

function Busy() {
	// a slow change the UI asked for, a fitted garment being re-fitted (render/fitted.js), or new shaders compiling
	// (render/viewport.js prepare): the view holds its last frame meanwhile
	const b = busy.value ?? (fitStatus.value.state === 'fitting' ? { text: 'Fitting the leotard…' } : compiling.value ? { text: 'Preparing the materials…' } : null);
	return b ? <div class="stage-busy" role="status"><span class="spinner" /><span>{b.text}</span><span class="busy-sheen" /></div> : null;
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

// Undo, redo, save; the tool keys (each opens its tab); H lines, M mannequin, Esc.
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
				if (t) { if (t.tab) pickTab(t.tab); tool.value = t.id; }
				else if (k === 'escape') { if (tool.value !== 'move') tool.value = 'move'; else selection.value = null; cancelFlight(); }
				else if (k === 'h') hideOverlay.value = !hideOverlay.value;
				else if (k === 'm') hideMannequin.value = !hideMannequin.value;
				else if (k === 'x') toggleMirror();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);
}

