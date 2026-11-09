// The inspector: the one card of glass at the right of the stage, there only while something is in hand. It always
// answers the same question, "what am I changing?": the part chosen on the leotard (a piece, a line, a strap, a
// crystal pattern or group, lettering); else the tool that is on, when it has things to set; else the kind of work
// picked on the spine (Shape, Fabric, Sparkle, Stage). With none of those there is no card and the leotard has the
// whole window. Choosing a part on the model opens its kind of work (ui/state.js TAB_OF); a tool that belongs to
// another kind stops when the kind changes.
import { app } from '../instance.js';
import { tab, tool, selection, rev, layout } from './state.js';
import { closeCard } from './kit.jsx';
import { toolById } from './toolbar.js';
import { ShapeCard, LineCard, StrapCard } from './ShapeCard.jsx';
import { PieceCard, FabricHome } from './PieceCard.jsx';
import { SparkleCard, GroupCard, LetteringCard } from './SparkleCard.jsx';
import { PatternCard } from './PatternCard.jsx';
import { StageCard } from './StageCard.jsx';

// Open a kind of work. Fabric opens on a piece (the first) unless one is chosen.
export function openWork(k) {
	if (tab.value === k) return;
	tab.value = k;
	const t = toolById[tool.value];
	if (t?.tab && t.tab !== k) tool.value = 'move';
	if (k === 'fabric' && selection.value?.kind !== 'panels') {
		const p = app.doc.panels.find((x) => !x.removed) ?? app.doc.panels[0];
		selection.value = p ? { kind: 'panels', id: p.id } : null;
	} else if (k !== 'fabric' && selection.value?.kind === 'panels') selection.value = null;
}

// The spine's buttons: the kind that is open steps back to its own card from a chosen part, then is put away.
export function pickWork(k) {
	if (tab.value !== k) { openWork(k); return; }
	if (selection.value && k !== 'fabric') { selection.value = null; tool.value = 'move'; } else closeCard();
}

// [what it is (the card animates in when this changes), the card]
function which() {
	const sel = selection.value, t = tool.value, w = tab.value, doc = app.doc;
	if (sel?.kind === 'curves') return ['line', <LineCard key={sel.id} id={sel.id} />];
	if (sel?.kind === 'straps') return ['strap', <StrapCard key={sel.id} id={sel.id} />];
	if (sel?.kind === 'panels') return ['piece', <PieceCard key={sel.id} id={sel.id} />];
	if (sel?.kind === 'stones') return doc.stones.find((g) => g.id === sel.id)?.kind === 'pattern' ? ['pattern', <PatternCard key={sel.id} id={sel.id} />] : ['group', <GroupCard key={sel.id} id={sel.id} />];
	if (sel?.kind === 'decals') return ['lettering', <LetteringCard key={sel.id} id={sel.id} />];
	if (t === 'decal') return ['lettering', <LetteringCard key="new" />];
	if (w === 'shape') return ['shape', <ShapeCard />];
	if (w === 'fabric') return ['fabric', <FabricHome />];
	if (w === 'sparkle') return ['sparkle', <SparkleCard />];
	if (w === 'stage') return ['stage', <StageCard />];
	return null;
}
export const hasCard = () => !!which();

export function Inspector() {
	rev.value; layout.value;
	const c = which();
	return c ? <aside class="inspector" key={c[0]} aria-label="What is being changed">{c[1]}</aside> : null;
}
