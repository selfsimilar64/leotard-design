// B6 (moodboard/Sparkle_DreamTurnpakjeEllaZwartLangeMouw-Mystic.png + _4203a97d-....png): black
// wet look, a mesh yoke with a sweetheart edge front and back, long mesh sleeves, an open U at the
// back crossed by six straps fanning from the neckband, a clear clasp at the neck, lotus motifs in
// pink AB stones front and back, stone motifs on the sleeves, hands on hips.
import { tools } from './helpers.js';

export async function build(app, o = {}) {
	const { X, id, on, at, settle, log } = tools(app);
	const black = '#0a0a0c', meshF = { fabric: 'mesh', colour: '#0d0d10', sheer: o.sheer ?? 0.1 };
	app.new('B6 six-strap fan');
	X({ op: 'body.set', finish: 'Athlete skin, light', pose: 'hands-on-hips' });
	X({ op: 'scene.set', rig: 'White seamless (photo studio)' });
	X({ op: 'block.apply', neck: 'crew', back: 'crew', sleeves: 'long', leg: 'standard', armhole: 'set-in', fabric: 'wet', colour: black });
	await settle();
	const side = id('Side seam'), neck = id('Neckline'), arm = id('Sleeve seam');
	// the yoke's sweetheart edge, round the body: two curves meeting in a V at centre front and back
	const sweet = (s) => [{ at: { [s]: [0, 1.19] }, kind: 'corner' }, { [s]: [0.04, 1.215] }, { [s]: [0.085, 1.235] }, { [s]: [0.115, 1.215] }];
	const Y = X({ op: 'curve.add', role: 'seam', mirror: 'none', closed: true, name: 'Yoke', points: [
		...sweet('front'), on(side, { p: [0.14, 1.19, 0.0] }), ...sweet('back').reverse(),
		...sweet('back').map((p) => (p.at ? { ...p, at: { back: [-p.at.back[0], p.at.back[1]] } } : { back: [-p.back[0], p.back[1]] })).slice(1),
		on(side, { p: [-0.14, 1.19, 0.0] }), ...sweet('front').slice(1).reverse().map((p) => ({ front: [-p.front[0], p.front[1]] }))] });
	// the open U at the back, under a narrow neckband
	const U = X({ op: 'curve.add', role: 'edge', mirror: 'none', closed: true, name: 'Back U', points: [{ at: { back: [0.06, 1.322] }, kind: 'corner' }, { back: [0.09, 1.28] }, { back: [0.065, 1.236] }, { back: [0, 1.222] }, { back: [-0.065, 1.236] }, { back: [-0.09, 1.28] }, { at: { back: [-0.06, 1.322] }, kind: 'corner' }, { back: [0, 1.326] }] });
	await settle();
	for (const spec of [{ back: [0, 1.28] }]) { const p = await at(spec); if (p && !app.doc.panels.find((q) => q.id === p).removed) X({ op: 'panel.cut', id: p }); }
	await settle();
	const P = { yokeF: await at({ front: [0, 1.28] }), yokeB: await at({ back: [0.09, 1.3] }), body: await at({ front: [0, 1.05] }), sleeve: app.doc.panels.find((p) => p.name === 'Sleeve')?.id };
	for (const k of ['yokeF', 'yokeB', 'sleeve']) if (P[k]) X({ op: 'panel.set', id: P[k], ...meshF });
	const bind = { fabric: 'wet', colour: black };
	X({ op: 'trim.set', on: [neck, U], kind: 'binding', fabric: bind });
	X({ op: 'trim.set', on: [id('Leg line'), id('Cuff')], kind: 'elastic', fabric: bind });
	X({ op: 'trim.set', on: Y, kind: 'tape', fabric: bind });
	// six straps fanning from the neckband to the yoke edge across the U (three, mirrored)
	const ends = [[0.012, 1.198], [0.05, 1.215], [0.09, 1.232]], tops = [[0.012, 1.334], [0.03, 1.333], [0.05, 1.33]];
	const strapIds = [];
	for (let k = 0; k < 3; k++) strapIds.push(X({ op: 'strap.add', points: [{ back: tops[k] }, { back: [(tops[k][0] + ends[k][0]) / 2 + 0.006 * k, 1.28] }, { back: ends[k] }], width: 0.007, fabric: 'wet', colour: black, edge: 'none', mirror: 'both', name: 'Fan strap ' + (k + 1) }));
	X({ op: 'hardware.add', kind: 'clear-hook', at: { back: [0, 1.338] } });
	await settle();
	const pinkAB = ['Light Rose AB', 'Rose AB', 'Crystal AB'];
	for (const s of strapIds.filter(Boolean)) X({ op: 'stones.add', kind: 'row', on: { strap: s }, stone: 'Light Rose AB', params: { size: 'ss6', rows: 1, gap: 1.6 } });
	// lotus motifs: a flower outline with an inner one, rays of stones between
	const lotus = (spec, size) => {
		X({ op: 'stones.add', kind: 'motif', at: spec, palette: pinkAB.map((s) => ({ stone: s, weight: 1 })), params: { shape: 'flower', size, stoneSize: 'ss6', mode: 'outline', gap: 1.4 } });
		X({ op: 'stones.add', kind: 'motif', at: spec, stone: 'Rose AB', params: { shape: 'flower', size: size * 0.55, stoneSize: 'ss6', mode: 'outline', gap: 1.4, angle: 0.63 } });
		X({ op: 'stones.add', kind: 'motif', at: spec, stone: 'Crystal AB', params: { shape: 'circle', size: size * 0.18, stoneSize: 'ss6', mode: 'fill', fillSize: 'ss6' } });
	};
	lotus({ back: [0, 1.11] }, 0.15);
	lotus({ front: [0, 1.12] }, 0.16);
	X({ op: 'stones.add', kind: 'scatter', on: { panel: P.yokeF }, stone: 'Light Rose AB', params: { from: { curve: Y }, near: 0.8, far: 0.05, distance: 0.04, sizes: ['ss6'], gap: 2 } });
	if (P.sleeve) X({ op: 'stones.add', kind: 'scatter', on: { panel: P.sleeve }, stone: 'Light Rose AB', params: { from: { curve: id('Cuff') }, near: 0.9, far: 0.04, distance: 0.2, sizes: ['ss6', 'ss8'], gap: 1.8 } });
	await settle();
	return { P, strapIds, stones: app.stoneStats().total, errors: app.stoneStats().errors, warn: app.engine.g?.arr?.warn?.length, log };
}

export const photo = { src: '/moodboard/Sparkle_DreamTurnpakjeEllaZwartLangeMouw-Mystic.png', crop: [0, 0, 635, 642], view: { position: [0, 1.05, -1.75], target: [0, 1.05, 0], fov: 30 } };
export const photoFront = { src: '/moodboard/Sparkle_DreamTurnpakjeEllaZwartLangeMouw-Mystic_4203a97d-f274-4f2c-8575-3f60d0e2e64e.png', crop: [0, 0, 1080, 1080], view: { position: [0, 1.05, 1.75], target: [0, 1.05, 0], fov: 30 } };
