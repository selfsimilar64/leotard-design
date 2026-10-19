// Application layout: top bar, tool rail, viewport (3D and/or 2D flat), inspector, outliner, history.
import { useEffect, useRef } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection, tool, layout, stats, toast, notify } from './state.js';
import { Inspector } from './Inspector.jsx';
import { FlatView } from './FlatView.jsx';
import { tools } from './toolbar.js';
import { LOOKS } from '../render/presets.js';
import { run } from './controls.jsx';

export function Shell({ onViewport, onFlat }) {
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
				<Outliner />
				<History />
			</aside>
			<Toast />
		</div>
	);
}

function TopBar() {
	rev.value;
	const h = app.history();
	return (
		<header class="topbar">
			<input class="doc-name" value={app.doc.meta.name} onChange={(e) => run({ op: 'meta.set', name: e.currentTarget.value })} />
			<span class="group">
				<button class="btn" title="New design" onClick={() => { app.new(); selection.value = null; }}>New</button>
				<button class="btn" title="Open a saved design" onClick={openDialog}>Open</button>
				<button class="btn" title="Save to designs/ (Ctrl+S)" onClick={async () => notify('Saved ' + await app.save())}>Save</button>
			</span>
			<span class="group">
				<button class="btn" title={h.undo.length ? 'Undo ' + h.undo[h.undo.length - 1] + ' (Ctrl+Z)' : 'Nothing to undo'} disabled={!h.undo.length} onClick={() => app.undo()}>Undo</button>
				<button class="btn" title={h.redo.length ? 'Redo ' + h.redo[0] + ' (Ctrl+Y)' : 'Nothing to redo'} disabled={!h.redo.length} onClick={() => app.redo()}>Redo</button>
			</span>
			<span class="group">
				{[['3d', '3D'], ['split', '3D + flat'], ['flat', 'Flat']].map(([k, l]) => <button key={k} class={`btn ${layout.value === k ? 'active' : ''}`} onClick={() => { layout.value = k; }}>{l}</button>)}
			</span>
			<span class="group">
				<select title="Start from a POC look" value="" onChange={(e) => { const v = e.currentTarget.value; if (v) run({ op: 'legacy.look', name: v }); }}>
					<option value="">POC look…</option>
					{Object.keys(LOOKS).map((k) => <option key={k}>{k}</option>)}
				</select>
			</span>
			<span class="spacer" />
			<button class="btn" title="Printable full-scale pattern (PDF)" onClick={async () => notify('Pattern saved: ' + await app.exportPattern())}>Pattern PDF</button>
			<button class="btn" title="Measure the true GPU cost of a frame" onClick={() => notify(`Frame cost ${app.benchmark()} ms`)}>Measure</button>
		</header>
	);
}

async function openDialog() {
	const names = await app.designs();
	if (!names.length) { notify('No saved designs in designs/'); return; }
	const name = prompt('Open which design?\n' + names.join('\n'), names[0]);
	if (name) app.open(name).then((n) => notify('Opened ' + n), (e) => notify(e.message, 'error'));
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

function Outliner() {
	rev.value;
	const d = app.doc, sel = selection.value;
	const groups = [['curves', 'Lines'], ['panels', 'Panels'], ['straps', 'Straps'], ['trims', 'Edge finishes'], ['stones', 'Stone generators'], ['placed', 'Single stones'], ['reference', 'Reference photos']];
	return (
		<details class="section" open>
			<summary><span>Outliner</span></summary>
			<div class="outliner">
				{groups.map(([k, label]) => (
					<div key={k} class="ol-group">
						<div class="ol-head">{label} <span class="count">{d[k].length}</span></div>
						{d[k].slice(0, 200).map((o) => (
							<div key={o.id} class={`ol-item ${sel?.id === o.id ? 'sel' : ''}`} onClick={() => { selection.value = { kind: k, id: o.id }; }}>
								{o.name || o.role || o.kind || o.id} <span class="dim">{o.id}</span>
							</div>
						))}
					</div>
				))}
			</div>
		</details>
	);
}

function History() {
	rev.value;
	const h = app.history();
	return (
		<details class="section">
			<summary><span>History</span><span class="count">{h.undo.length}</span></summary>
			<div class="history">
				{h.undo.map((l, i) => <div key={'u' + i} class="h-item" onClick={() => { for (let k = h.undo.length - 1; k > i; k--) app.undo(); }}>{l}</div>)}
				{h.redo.map((l, i) => <div key={'r' + i} class="h-item redo" onClick={() => { for (let k = 0; k <= i; k++) app.redo(); }}>{l}</div>)}
			</div>
		</details>
	);
}

function Hud() {
	const s = stats.value;
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
			else if (mod && k === 's') { e.preventDefault(); app.save().then((f) => notify('Saved ' + f)); }
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
