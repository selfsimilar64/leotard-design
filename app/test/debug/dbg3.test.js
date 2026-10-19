import { it } from 'vitest';
import { loadBody } from '../helpers.js';
import { makeBlock } from '../../src/garment/blocks.js';
import { evaluateCurve } from '../../src/curves/evaluate.js';
import { fromSP } from '../../src/body/surface.js';
it('dbg', async () => {
	const B = await loadBody();
	const blk = makeBlock(B.man, B.surf, { neck: 'high' });
	const c = blk.curves[0];
	const e = evaluateCurve(c, B.surf);
	for (let i = 1; i < e.pts.length; i++) {
		const d = e.pts[i].distanceTo(e.pts[i - 1]);
		if (d > 0.004) console.log('gap', i, d.toFixed(4), e.pts[i - 1].toArray().map((x) => x.toFixed(3)), e.pts[i].toArray().map((x) => x.toFixed(3)), 'ctrl', e.ctrlIndex.indexOf(i), e.ctrlIndex.indexOf(i - 1));
	}
	console.log('ctrl pts', c.points.map((p) => B.surf.pos(fromSP(p.sp)).toArray().map((x) => +x.toFixed(3)).join(',')).join(' | '));
	console.log('head weight at ctrl', c.points.map((p) => { const s = fromSP(p.sp); const i = B.man.idx[s.f * 3]; return B.man.wHead[i].toFixed(2); }).join(' '));
});
