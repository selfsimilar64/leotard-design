// The cut, named on the body: while the Shape card is on its Silhouette face, each element of the cut (neckline,
// back, sleeves or straps, armhole, leg cut, front yoke, waist seam) stands beside the mannequin as a small pane with
// its picture and its present choice, a leader running to where it is on the leotard, as on a garment's spec sheet.
// Tapping one opens that element's options in the card and turns the view to it (ui/ShapeCard.jsx openElement). The
// panes keep a tidy column at the figure's left, top to bottom in the order their places are on screen; the leaders
// follow the body as the view turns (each frame: render/viewport.js onFrame), dashed to a place on the far side. An
// element whose place is out of view is not named, and close in the panes fold to their pictures alone.
import { useEffect, useRef } from 'preact/hooks';
import * as THREE from 'three';
import { app } from '../instance.js';
import { rev, tab, tool, selection, shapeElement, facets, hideOverlay, layout } from './state.js';
import { thumb } from './kit.jsx';
import { blockOf } from '../garment/blocks.js';
import { elementsOf, openElement, optionLabel, hideBroken } from './ShapeCard.jsx';

// Where each element is: a blend of body landmarks (body/landmarks.js; S stands for the side, l or r, the one nearer
// the panes) plus an offset in metres (x away from the centre on that side), and the way it faces (z: 1 front, -1 back).
const PLACE = {
	neck: { at: [['cf-neck', 1]], off: [0, -0.012, 0], face: 1 },
	back: { at: [['cb-neck', 1]], off: [0, -0.17, 0], face: -1 },
	sleeves: { at: [['shoulder-S', 0.5], ['elbow-S', 0.5]], off: [0, 0, 0] },
	strap: { at: [['shoulder-S', 0.6], ['cf-neck', 0.2], ['cb-neck', 0.2]], off: [0, 0.025, 0] },
	armhole: { at: [['shoulder-S', 0.5], ['underarm-S', 0.5]], off: [0, 0, 0] },
	leg: { at: [['hip-S', 1]], off: [-0.045, -0.03, 0.03] },
	yoke: { at: [['bust-l', 0.5], ['bust-r', 0.5]], off: [0, 0.05, 0], face: 1 },
	waist: { at: [['navel', 1]], off: [0, 0.03, 0], face: 1 },
};
const ROW = 50, PANE = 44, TOP = 78, FOOT = 74, LEFT = 92;

export function Callouts() {
	rev.value;
	const doc = app.doc, on = tab.value === 'shape' && !selection.value && tool.value === 'move' && (facets.value.shape ?? 'cut') === 'cut'
		&& doc.curves.length > 0 && !hideOverlay.value && layout.value !== 'flat' && !!app.engine;
	const cur = on ? blockOf(doc) : null, list = on ? elementsOf(cur) : [], keys = list.map(([k]) => k).join(' ');
	const box = useRef(null), open = shapeElement.value;
	useEffect(() => {
		const vp = app.engine?.viewport, ctx = app.store?.ctx, el = box.current;
		if (!on || !vp || !ctx?.landmarkPos || !el) return;
		const v = new THREE.Vector3(), w = new THREE.Vector3(), items = keys.split(' ').map((k) => ({ k, pane: el.querySelector(`[data-k="${k}"]`), line: el.querySelector(`[data-line="${k}"]`), dot: el.querySelector(`[data-dot="${k}"]`) }));
		const world = (place, side) => {
			v.set(0, 0, 0);
			for (const [lm, wt] of place.at) v.addScaledVector(w.fromArray(ctx.landmarkPos(lm.replace('-S', '-' + side))), wt);
			return v.add(w.set(place.off[0] * (side === 'l' ? 1 : -1), place.off[1], place.off[2]));
		};
		const update = () => {
			const W = el.clientWidth, H = el.clientHeight, cam = vp.camera;
			if (!W || !H) return;
			const front = cam.position.z - vp.controls.target.z; // > 0: the view is from the front
			try {
				for (const it of items) {
					const place = PLACE[it.k];
					// a place there is one of on each side: the one in view, and of two in view the one nearer the panes
					let best = null;
					for (const side of place.at.some(([lm]) => lm.endsWith('-S')) ? ['l', 'r'] : ['l']) {
						world(place, side).project(cam);
						const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H, seen = v.z <= 1 && x > 0 && x < W && y > TOP - 30 && y < H - 30;
						if (!best || (seen && !best.seen) || (seen === best.seen && x < best.x)) best = { x, y, seen };
					}
					Object.assign(it, best, { far: place.face ? place.face * front < -0.05 : false });
				}
			} catch { return; } // (a body without one of the landmarks: no callouts)
			// only the elements in view (seen) are named: in a close-up the others would crowd the part being worked on (the
			// card's own strip still reaches them, and they come back as the view draws away)
			// the panes: a column at the figure's left, in the order of their places down the screen, never overlapping
			// (close in, where a column of names would lie over the leotard, the panes fold to their pictures alone; one with
			// no room left of its place for even that is not shown)
			const lead = Math.min(...items.filter((it) => it.seen).map((it) => it.x)), compact = lead - 64 < LEFT + 150;
			const right = compact ? LEFT + 46 : Math.min(W * 0.46, lead - 64);
			el.classList.toggle('compact', compact);
			for (const it of items) if (it.x < right + 30) it.seen = false;
			const order = items.filter((it) => it.seen).sort((a, b) => a.y - b.y), n = order.length;
			let y = -Infinity;
			for (const it of order) { it.py = y = Math.max(it.y - PANE / 2, y + ROW, TOP); }
			y = H - FOOT;
			for (let i = n - 1; i >= 0; i--) { const it = order[i]; it.py = y = Math.min(it.py, y); y -= ROW; }
			for (const it of items) {
				it.pane.style.display = it.line.style.display = it.dot.style.display = it.seen ? '' : 'none';
				if (!it.seen) continue;
				it.pane.style.right = W - right + 'px';
				it.pane.style.transform = `translateY(${it.py.toFixed(1)}px)`;
				it.line.setAttribute('d', `M${right + 5} ${(it.py + PANE / 2).toFixed(1)}h14L${it.x.toFixed(1)} ${it.y.toFixed(1)}`);
				it.line.classList.toggle('far', it.far);
				it.dot.setAttribute('cx', it.x.toFixed(1)); it.dot.setAttribute('cy', it.y.toFixed(1));
				it.dot.classList.toggle('far', it.far);
			}
		};
		vp.onFrame.add(update);
		update();
		return () => vp.onFrame.delete(update);
	}, [on, keys]);
	if (!on) return null;
	return (
		<div class="callouts" ref={box}>
			<svg aria-hidden="true">
				{list.map(([k]) => <path key={k} data-line={k} class={`co-line ${k === open ? 'on' : ''}`} />)}
				{list.map(([k]) => <circle key={k} data-dot={k} class="co-dot" r="3.5" />)}
			</svg>
			{list.map(([k, name]) => (
				<button key={k} data-k={k} class={`callout glass ${k === open ? 'on' : ''}`} title={`${name}: ${optionLabel(cur[k])}`} onClick={() => openElement(k)}>
					<span class="el-thumb"><img key={cur[k]} src={thumb('blocks', k + '-' + cur[k])} alt="" draggable={false} onError={hideBroken} /></span>
					<span><small>{name}</small><b>{optionLabel(cur[k])}</b></span>
				</button>
			))}
		</div>
	);
}
