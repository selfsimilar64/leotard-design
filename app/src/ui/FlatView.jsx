// The flat view: every pattern piece as cut (solid line), its stitch line (dashed), grain line and
// name, laid out like the printable pattern. Updates when the garment is re-cut and flattened.
import { useEffect, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection, layout } from './state.js';
import { patternPieces, layoutPieces } from '../garment/pattern.js';

export function FlatView() {
	rev.value;
	const [data, setData] = useState(null);
	const show = layout.value !== '3d';
	useEffect(() => {
		if (!show || !app.engine) return;
		let live = true;
		app.engine.garment.whenFlat().then(() => { if (live) setData(layoutPieces(patternPieces(app.engine.garment, app.doc).pieces)); });
		return () => { live = false; };
	}, [rev.value, show]);
	if (!show) return null;
	if (!data) return <div class="flat-empty">Flattening…</div>;
	if (!data.placed.length) return <div class="flat-empty">No pattern pieces yet: start from a block.</div>;
	const pad = 20, [W, H] = data.size, sel = selection.value;
	return (
		<svg class="flat-svg" viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}`} preserveAspectRatio="xMidYMid meet">
			{data.placed.map((p) => {
				const [ox, oy] = p.at, pt = ([x, y]) => `${ox + x},${oy + p.size[1] - y}`;
				const [gx, gy] = p.grain.at, L = Math.min(p.size[1] * 0.6, 160) / 2, dx = Math.sin(p.grain.angle) * L, dy = Math.cos(p.grain.angle) * L;
				const active = sel?.kind === 'panels' && sel.id === p.panelId;
				return (
					<g key={p.key} class={`piece ${active ? 'sel' : ''}`} onClick={() => { selection.value = { kind: 'panels', id: p.panelId }; }}>
						<polygon points={p.cutLine.map(pt).join(' ')} fill={p.colour} fill-opacity="0.22" stroke="#222" stroke-width="0.8" />
						<polygon points={p.stitch.map(pt).join(' ')} fill="none" stroke="#444" stroke-width="0.6" stroke-dasharray="4 3" />
						<line x1={ox + gx - dx} y1={oy + p.size[1] - (gy - dy)} x2={ox + gx + dx} y2={oy + p.size[1] - (gy + dy)} stroke="#222" stroke-width="0.8" marker-start="url(#arr)" marker-end="url(#arr)" />
						<text x={ox + gx + 6} y={oy + p.size[1] - gy - 6} font-size="9" fill="#111">{p.name}</text>
						<text x={ox + gx + 6} y={oy + p.size[1] - gy + 6} font-size="7" fill="#444">{p.cut}{p.stretch ? ` · stretch ${(p.stretch.mean * 100).toFixed(0)}%` : ''}</text>
					</g>
				);
			})}
			<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#222" /></marker></defs>
			<text x={-pad + 4} y={-pad + 12} font-size="9" fill="#555">Pattern pieces · millimetres · seam allowance included</text>
		</svg>
	);
}
