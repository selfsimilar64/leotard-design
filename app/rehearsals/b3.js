// B3 (moodboard/N3_DSC1064.jpg): plum tone-on-tone. Mesh yoke and set-in sleeves, opaque bodice
// with a curved top, a diagonal S-curve mesh band across it, two mesh stripes at the waist, triple
// stone rows on every seam, scattered stones, cuff stone stripes, an embroidered hip motif.
// Rounds: 1 waist lines too high (re-measured against the photo's neck-to-crotch scale), right
// yoke piece left opaque; 2 matte plum, purple mesh; 3 logo size.
import { tools } from './helpers.js';

export async function build(app, o = {}) {
	const { X, id, on, at, settle, log } = tools(app);
	const plum = o.plum ?? '#4c1034', meshF = { fabric: 'mesh', colour: o.mesh ?? '#7c2a6c', sheer: o.sheer ?? 0.16 };
	const w = [o.w1 ?? 0.985, o.w2 ?? 0.967, o.w3 ?? 0.957, o.w4 ?? 0.945];
	app.new('B3 tone-on-tone S-band');
	X({ op: 'body.set', finish: 'Athlete skin, light', pose: 'arms-down' });
	X({ op: 'scene.set', rig: o.rig ?? 'Grey seamless (photo studio)', rotateLights: false });
	X({ op: 'block.apply', neck: 'crew', back: 'crew', sleeves: 'long', leg: 'standard', armhole: 'set-in', fabric: 'matte', colour: plum });
	await settle();
	const side = id('Side seam'), neck = id('Neckline'), arm = id('Sleeve seam');
	const T = X({ op: 'curve.add', role: 'seam', mirror: 'none', name: 'Bodice top', points: [on(arm, { p: [-0.13, 1.17, 0.03] }), { front: [-0.07, 1.24] }, { front: [-0.01, 1.215] }, { front: [0.06, 1.225] }, on(arm, { p: [0.13, 1.15, 0.03] })] });
	await settle();
	const S1 = X({ op: 'curve.add', role: 'seam', mirror: 'none', name: 'S band upper', points: [on(neck, { front: [0.05, 1.33] }), { front: [0.068, 1.27] }, { front: [0.045, 1.2] }, { front: [-0.03, 1.13] }, { front: [-0.1, 1.075] }, on(side, { p: [-0.145, 1.06, 0.0] })] });
	await settle();
	const S2 = X({ op: 'curve.add', role: 'seam', mirror: 'none', name: 'S band lower', points: [on(neck, { front: [0.085, 1.325] }), { front: [0.092, 1.26] }, { front: [0.072, 1.185] }, { front: [0.0, 1.11] }, { front: [-0.08, 1.05] }, on(side, { p: [-0.145, 1.025, 0.0] })] });
	await settle();
	const loop = (y, name) => X({ op: 'curve.add', role: 'seam', mirror: 'none', closed: true, name, points: [{ front: [0, y] }, { p: [0.15, y + 0.012, 0.0] }, { back: [0, y + 0.008] }, { p: [-0.15, y + 0.012, 0.0] }] });
	const W = w.map((y, i) => loop(y, 'Waist ' + (i + 1)));
	await settle();
	const P = {
		yokeL: await at({ front: [-0.06, 1.27] }), yokeR: await at({ front: [0.03, 1.26] }), yokeRR: await at({ front: [0.1, 1.25] }), band: await at({ front: [0.0, 1.135] }),
		bodL: await at({ front: [-0.06, 1.15] }), bodR: await at({ front: [0.06, 1.08] }), m1: await at({ front: [0, (w[0] + w[1]) / 2] }), mid: await at({ front: [0, (w[1] + w[2]) / 2] }),
		m2: await at({ front: [0, (w[2] + w[3]) / 2] }), lower: await at({ front: [0, 0.9] }), sleeve: app.doc.panels.find((p) => p.name === 'Sleeve')?.id,
	};
	for (const k of ['yokeL', 'yokeR', 'yokeRR', 'band', 'm1', 'm2', 'sleeve']) if (P[k]) X({ op: 'panel.set', id: P[k], ...meshF });
	for (const k of ['mid', 'lower', 'bodL', 'bodR']) if (P[k]) X({ op: 'panel.set', id: P[k], fabric: 'matte', colour: plum });
	X({ op: 'trim.set', on: neck, kind: 'binding', fabric: { fabric: 'matte', colour: plum } });
	X({ op: 'trim.set', on: id('Cuff'), kind: 'binding', fabric: { fabric: 'matte', colour: plum } });
	X({ op: 'trim.set', on: id('Leg line'), kind: 'elastic', fabric: { fabric: 'matte', colour: plum } });
	const AB = 'Crystal AB', row = (curve, rows, offset, sd, size = 'ss6', extra = {}) => X({ op: 'stones.add', kind: 'row', on: { curve }, stone: AB, params: { size, rows, offset, gap: 1.2, rowGap: 0.0027, ...(sd ? { side: sd } : {}), ...extra } });
	row(T, 3, 0.003, 'right'); row(S1, 3, 0.003, 'left'); row(S2, 3, 0.003, 'right');
	row(W[0], 2, 0.003, 'left'); row(W[3], 2, 0.003, 'right'); row(neck, 3, 0.004, 'right');
	row(id('Cuff'), 4, 0.006, 'left', 'ss6', { rowGap: 0.006 });
	for (const k of ['bodL', 'bodR']) if (P[k]) X({ op: 'stones.add', kind: 'fill', on: { panel: P[k] }, stone: AB, params: { size: 'ss6', pattern: 'random', gap: 4.2 } });
	for (const k of ['yokeL', 'yokeR', 'sleeve']) if (P[k]) X({ op: 'stones.add', kind: 'fill', on: { panel: P[k] }, stone: AB, params: { size: 'ss6', pattern: 'random', gap: 7 } });
	X({ op: 'decal.add', at: { front: [0.095, 0.89] }, text: '§', font: 'Segoe Script', size: 0.014, colour: '#f0eef4', look: 'flock' });
	await settle();
	return { P, stones: app.stoneStats().total, errors: app.stoneStats().errors, warn: app.engine.g?.arr?.warn?.length, log };
}

export const photo = { src: '/moodboard/N3_DSC1064.jpg', crop: [0, 0, 1401, 1314], view: { position: [0, 1.06, 1.9], target: [0, 1.06, 0], fov: 30 } };
