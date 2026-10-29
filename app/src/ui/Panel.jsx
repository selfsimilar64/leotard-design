// The right-hand panel: four tabs, one per kind of work on the leotard. Shape (its silhouette and
// lines), Fabric (each piece's colour and material), Sparkle (crystals and lettering), Stage (the
// mannequin, pose and studio it is shown in). Selecting a part on the model opens the tab it
// belongs to (ui/state.js); a tool that belongs to another tab stops when the tab changes.
import { useEffect, useRef } from 'preact/hooks';
import { app } from '../instance.js';
import { tab, tool, selection, rev } from './state.js';
import { I } from './icons.jsx';
import { toolById } from './toolbar.js';
import { ShapeTab } from './ShapeTab.jsx';
import { FabricTab } from './FabricTab.jsx';
import { SparkleTab } from './SparkleTab.jsx';
import { StageTab } from './StageTab.jsx';

const TABS = [
	['shape', 'Shape', I.shape, ShapeTab],
	['fabric', 'Fabric', I.fabric, FabricTab],
	['sparkle', 'Sparkle', I.sparkle, SparkleTab],
	['stage', 'Stage', I.stage, StageTab],
];

export function pickTab(k) {
	if (tab.value === k) return;
	tab.value = k;
	const t = toolById[tool.value];
	if (t?.tab && t.tab !== k) tool.value = 'move';
	// the Fabric tab opens on a piece (the first) unless one is chosen
	if (k === 'fabric' && selection.value?.kind !== 'panels') {
		const p = app.doc.panels.find((x) => !x.removed) ?? app.doc.panels[0];
		selection.value = p ? { kind: 'panels', id: p.id } : null;
	} else if (k !== 'fabric' && selection.value?.kind === 'panels') selection.value = null;
}

export function Panel() {
	rev.value;
	const t = tab.value, i = TABS.findIndex(([k]) => k === t), Body = TABS[i][3];
	const body = useRef(null);
	// a new tab or part starts at the top
	const sel = selection.value, page = t + '|' + (sel?.kind === 'panels' ? 'p' : sel?.id ?? '');
	useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [page]);
	return (
		<aside class="panel">
			<nav class="tabs" role="tablist" style={{ '--i': i, '--n': TABS.length }}>
				<span class="tab-ink" />
				{TABS.map(([k, label, Icon]) => (
					<button key={k} class={`tab ${k === t ? 'on' : ''}`} role="tab" aria-selected={k === t} onClick={() => pickTab(k)}>
						<Icon size={22} /><span>{label}</span>
					</button>
				))}
			</nav>
			<div class="panel-body" ref={body}>
				<div class="panel-page" key={page}><Body /></div>
			</div>
		</aside>
	);
}
