// The flat view: every pattern piece as cut (solid line), its stitch line (dashed), grain line and
// name, laid out like the printable pattern. Updates when the garment is re-cut and flattened; a
// click on a piece chooses it (the Fabric tab).
import { useEffect, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { rev, selection } from './state.js';
import { patternPieces, layoutPieces } from '../garment/pattern.js';

export function FlatView() {
	rev.value;
	const [data, setData] = useState(null);
	useEffect(() => {
		if (!app.engine) return;
		let live = true;
		app.engine.whenFlat().then(() => { if (live) setData(layoutPieces(patternPieces(app.engine.views, app.doc, { surf: app.engine.surf }).pieces)); });
		return () => { live = false; };
	}, [rev.value]);
	if (!data) return <div class="flat-empty">Laying out the pieces…</div>;
	if (!data.placed.length) return <div class="flat-empty">No pattern pieces yet: pick a starting point in Designs.</div>;
	const pad = 24, [W, H] = data.size, sel = selection.value;
	return (
		<>
			<div class="flat-title">Pattern pieces</div>
			<svg class="flat-svg" viewBox={`${-pad} ${-pad - 24} ${W + 2 * pad} ${H + 2 * pad + 24}`} preserveAspectRatio="xMidYMid meet">
				{data.placed.map((p) => {
					const [ox, oy] = p.at, pt = ([x, y]) => `${ox + x},${oy + p.size[1] - y}`;
					const [gx, gy] = p.grain.at, L = Math.min(p.size[1] * 0.6, 160) / 2, dx = Math.sin(p.grain.angle) * L, dy = Math.cos(p.grain.angle) * L;
					const active = sel?.kind === 'panels' && sel.id === p.panelId;
					return (
						<g key={p.key} class={`piece ${active ? 'sel' : ''}`} onClick={() => { selection.value = { kind: 'panels', id: p.panelId }; }}>
							<polygon points={p.cutLine.map(pt).join(' ')} fill={p.colour} fill-opacity="0.22" stroke="#2a2724" stroke-width="0.8" />
							{p.construction === 'appliqué' ? null : <polygon points={p.stitch.map(pt).join(' ')} fill="none" stroke="#5a5650" stroke-width="0.6" stroke-dasharray="4 3" />}
							{p.caught.map((run, i) => <polyline key={'c' + i} points={run.map(pt).join(' ')} fill="none" stroke="#5a5650" stroke-width="0.6" stroke-dasharray="4 3" />)}
							{p.placement.map((run, i) => <polyline key={i} points={run.map(pt).join(' ')} fill="none" stroke="#2a2724" stroke-width="0.7" stroke-dasharray="1 2" />)}
							<line x1={ox + gx - dx} y1={oy + p.size[1] - (gy - dy)} x2={ox + gx + dx} y2={oy + p.size[1] - (gy + dy)} stroke="#2a2724" stroke-width="0.8" marker-start="url(#arr)" marker-end="url(#arr)" />
							<text x={ox + gx + 6} y={oy + p.size[1] - gy - 6} font-size="9" fill="#1f1d1a" font-family="system-ui, sans-serif">{p.name}</text>
							<text x={ox + gx + 6} y={oy + p.size[1] - gy + 6} font-size="7" fill="#59554f" font-family="system-ui, sans-serif">{p.cut}{p.construction === 'appliqué' ? ` · appliqué${p.sewnOn.length ? ` on ${p.sewnOn.join(', ')}` : ''}${p.caughtIn.length ? `, caught in ${p.caughtIn.join(', ')}` : ''}` : ''}{p.stretch ? ` · stretch ${(p.stretch.mean * 100).toFixed(0)}%` : ''}</text>
						</g>
					);
				})}
				<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#2a2724" /></marker></defs>
				<text x={-pad + 4} y={H + pad - 6} font-size="8" fill="#8f8a82" font-family="system-ui, sans-serif">Millimetres · seam allowance on pieced pieces · dotted: where an appliqué is sewn</text>
			</svg>
		</>
	);
}
