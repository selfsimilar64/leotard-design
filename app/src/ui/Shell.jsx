// Application layout: top bar, tool rail, viewport (3D and/or 2D flat), the side panel
// (ui/Inspector.jsx) and the design's parts list.
import { useEffect, useRef, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection, tool, layout, stats, toast, notify, display, designsRev, showStats } from './state.js';
import { Inspector } from './Inspector.jsx';
import { FlatView } from './FlatView.jsx';
import { tools } from './toolbar.js';
import { run, Select, Toggle } from './controls.jsx';
import { Line } from './Gallery.jsx';
import { DISPLAY_OPTIONS, saveDisplay } from '../render/display.js';

export function Shell({ onViewport }) {
	return (
		<div class={`shell layout-${layout.value}`}>
			<TopBar />
			<ToolRail />
			<div class="views">
				<div class="view3d" ref={(el) => el && onViewport?.(el)} />
				<div class="viewflat"><FlatView /></div>
				<Hud />
			</div>
			<aside class="side">
				<Inspector />
				<Parts />
			</aside>
			<Toast />
		</div>
	);
}

async function save() {
	try { notify('Saved ' + await app.save()); designsRev.value++; } catch (e) { notify(e.message, 'error'); }
}

function TopBar() {
	rev.value;
	const h = app.history(), [menu, setMenu] = useState(false);
	return (
		<header class="topbar">
			<input class="doc-name" value={app.doc.meta.name} title="Design name" onChange={(e) => run({ op: 'meta.set', name: e.currentTarget.value })} />
			<span class="group">
				<button class="btn" title="Start a new design" onClick={() => { app.new(); selection.value = null; }}>New</button>
				<button class="btn" title="Save to your designs (Ctrl+S)" onClick={save}>Save</button>
			</span>
			<span class="group">
				<button class="btn icon" title={h.undo.length ? 'Undo ' + h.undo[h.undo.length - 1] + ' (Ctrl+Z)' : 'Nothing to undo'} disabled={!h.undo.length} onClick={() => app.undo()}>↶</button>
				<button class="btn icon" title={h.redo.length ? 'Redo ' + h.redo[0] + ' (Ctrl+Y)' : 'Nothing to redo'} disabled={!h.redo.length} onClick={() => app.redo()}>↷</button>
			</span>
			<span class="group seg">
				{[['3d', '3D'], ['split', '3D + pattern'], ['flat', 'Pattern']].map(([k, l]) => <button key={k} class={`btn ${layout.value === k ? 'active' : ''}`} onClick={() => { layout.value = k; }}>{l}</button>)}
			</span>
			<span class="spacer" />
			<button class="btn" title="Printable full-scale pattern (PDF)" onClick={async () => notify('Pattern saved: ' + await app.exportPattern())}>Pattern PDF</button>
			<span class="menu-anchor">
				<button class={`btn icon ${menu ? 'active' : ''}`} title="Settings" onClick={() => setMenu(!menu)}>⚙</button>
				{menu ? <Settings onClose={() => setMenu(false)} /> : null}
			</span>
		</header>
	);
}

// This computer's display settings (render/display.js): not part of the design, no undo.
function Settings({ onClose }) {
	const d = display.value, st = stats.value, ref = useRef(null);
	useEffect(() => {
		const off = (e) => { if (!ref.current?.contains(e.target) && !e.target.closest?.('.menu-anchor')) onClose(); };
		window.addEventListener('pointerdown', off);
		return () => window.removeEventListener('pointerdown', off);
	}, []);
	if (!d) return null;
	const set = (k, v) => { const n = { ...d, [k]: v }; display.value = n; saveDisplay(n); app.engine?.viewport.applyDisplay(n); };
	const num = (k) => (v) => set(k, Number(v));
	return (
		<div class="popover" ref={ref}>
			<h3 class="pane-title"><span>Display quality</span></h3>
			<Line label="Resolution"><Select value={d.resolution} options={DISPLAY_OPTIONS.resolution} onChange={num('resolution')} /></Line>
			<Line label="Lower while turning"><Toggle value={d.dynamicRes} onChange={(v) => set('dynamicRes', v)} /></Line>
			<Line label="Smooth edges"><Select value={d.msaa} options={DISPLAY_OPTIONS.msaa} onChange={num('msaa')} /></Line>
			<Line label="Shadows"><Select value={d.shadows} options={DISPLAY_OPTIONS.shadows} onChange={(v) => set('shadows', v)} /></Line>
			<Line label="Glow"><Toggle value={d.bloom} onChange={(v) => set('bloom', v)} /></Line>
			<Line label="Soft skin"><Toggle value={d.skin} onChange={(v) => set('skin', v)} /></Line>
			<Line label="Contact shadows"><Toggle value={d.ao} onChange={(v) => set('ao', v)} /></Line>
			<h3 class="pane-title"><span>Performance</span></h3>
			<Line label="Show frame rate"><Toggle value={showStats.value} onChange={(v) => { showStats.value = v; }} /></Line>
			<Line label="Frame cost"><button class="btn" title="Measure the true GPU cost of a frame" onClick={() => notify(`Frame cost ${app.benchmark()} ms`)}>Measure</button></Line>
			{st.fps ? <div class="dim note">{st.width}×{st.height} px · {st.fps.toFixed(0)} fps</div> : null}
		</div>
	);
}

function ToolRail() {
	return (
		<nav class="toolrail">
			{tools.map((t) => t.sep ? <hr key={t.sep} /> : (
				<button key={t.id} class={`tool ${tool.value === t.id ? 'active' : ''}`} title={`${t.label}${t.key ? ` (${t.key})` : ''}`}
					disabled={t.disabled} onClick={() => { tool.value = t.id; }}>
					<span class="tool-icon">{t.icon}</span><span class="tool-label">{t.label}</span>
				</button>
			))}
		</nav>
	);
}

// Everything the design is made of, by kind (only the kinds it has); a click selects the part.
function Parts() {
	rev.value;
	const d = app.doc, sel = selection.value;
	const groups = [['panels', 'Pieces', 'Piece'], ['curves', 'Lines', 'Line'], ['straps', 'Straps', 'Strap'], ['trims', 'Edge finishes', 'Edge finish'], ['stones', 'Stones', 'Stones'], ['placed', 'Single stones', 'Stone'],
		['decals', 'Logos and lettering', 'Logo'], ['hardware', 'Hardware', 'Hardware'], ['reference', 'Reference photos', 'Photo']]
		.filter(([k]) => d[k].length);
	if (!groups.length) return null;
	return (
		<details class="more parts">
			<summary>Parts of this design</summary>
			<div class="outliner">
				{groups.map(([k, label, one]) => (
					<div key={k} class="ol-group">
						<div class="ol-head">{label} <span class="count">{d[k].length}</span></div>
						{d[k].slice(0, 200).map((o, i) => (
							<div key={o.id} class={`ol-item ${sel?.id === o.id ? 'sel' : ''}`} onClick={() => { selection.value = { kind: k, id: o.id }; }}>
								{o.name || o.text?.split('\n')[0] || `${one} ${i + 1}`}
							</div>
						))}
					</div>
				))}
			</div>
		</details>
	);
}

function Hud() {
	const s = stats.value;
	if (!showStats.value) return null;
	return <div class="hud">{s.fps ? `${s.fps.toFixed(0)} fps · ${s.cpuMs.toFixed(1)} ms CPU · ${(s.triangles / 1e6).toFixed(2)}M tris · ${s.stones ?? 0} stones · ${s.width}×${s.height}` : 'loading…'}</div>;
}

function Toast() {
	const t = toast.value;
	return t ? <div class={`toast ${t.kind}`}>{t.text}</div> : null;
}

// Keyboard shortcuts: undo/redo/save, tool keys.
export function useShortcuts() {
	useEffect(() => {
		const onKey = (e) => {
			if (e.target.closest?.('input, select, textarea')) return;
			const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
			if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); app.undo(); }
			else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); app.redo(); }
			else if (mod && k === 's') { e.preventDefault(); save(); }
			else if (!mod) { const t = tools.find((x) => x.key && x.key.toLowerCase() === k); if (t && !t.disabled) tool.value = t.id; if (k === 'escape') selection.value = null; }
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);
}

export function useRev() {
	const r = useRef();
	useEffect(() => app.onChange(() => { rev.value++; }), []);
	return r;
}
