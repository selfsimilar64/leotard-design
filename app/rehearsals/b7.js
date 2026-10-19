// B7 (moodboard/Screenshot 2026-06-07 104228.png): full asymmetry. One mesh and one opaque
// three-quarter sleeve, a diagonal mesh wedge from the neck to the right armhole and another at
// the waist, double stone rows on every wedge edge, a dense stone band at the opaque cuff, a stone
// monogram, star-filter glare, right hand on the hip.
import { tools } from './helpers.js';

export async function build(app, o = {}) {
	const { X, id, on, at, settle, log } = tools(app);
	const black = '#0a0a0d', meshF = { fabric: 'mesh', colour: '#101014', sheer: o.sheer ?? 0.1 };
	app.new('B7 asymmetric wedges');
	X({ op: 'body.set', finish: 'Athlete skin, light', pose: { left: 'down', right: 'hip' } });
	X({ op: 'scene.set', rig: 'White seamless (photo studio)', glare: 'star' });
	X({ op: 'block.apply', neck: 'high', back: 'crew', sleeves: 'three-quarter', leg: 'standard', armhole: 'set-in', fabric: 'matte', colour: black });
	await settle();
	const side = id('Side seam'), neck = id('Neckline');
	// one sleeve mesh, the other opaque: un-mirror the sleeve panel, fill the right sleeve again
	const sl = app.doc.panels.find((p) => p.name === 'Sleeve');
	X({ op: 'doc.set', path: ['panels', sl.id, 'mirror'], value: 'none' });
	X({ op: 'panel.set', id: sl.id, ...meshF, name: 'Mesh sleeve (left)' });
	const right = X({ op: 'panel.add', at: { mirror: { sp: sl.seed } }, fabric: 'matte', colour: black, name: 'Opaque sleeve (right)' });
	const D1 = X({ op: 'curve.add', role: 'seam', mirror: 'none', name: 'Upper diagonal', points: [on(neck, { front: [0.035, 1.34] }), { front: [-0.03, 1.285] }, { front: [-0.09, 1.225] }, on(side, { p: [-0.14, 1.19, 0.0] })] });
	await settle();
	const H1 = X({ op: 'curve.add', role: 'seam', mirror: 'none', name: 'Upper wedge base', points: [on(D1, { front: [-0.1, 1.21] }), { front: [-0.02, 1.175] }, { front: [0.07, 1.145] }, on(side, { p: [0.14, 1.12, 0.0] })] });
	await settle();
	const H2 = X({ op: 'curve.add', role: 'seam', mirror: 'none', name: 'Lower wedge top', points: [on(side, { p: [-0.14, 1.09, 0.0] }), { front: [0, 1.08] }, on(side, { p: [0.14, 1.055, 0.0] })] });
	await settle();
	const D2 = X({ op: 'curve.add', role: 'seam', mirror: 'none', name: 'Lower diagonal', points: [on(side, { p: [-0.14, 0.98, 0.0] }), { front: [-0.04, 1.02] }, { front: [0.05, 1.045] }, on(H2, { front: [0.1, 1.06] })] });
	await settle();
	const P = { wedge1: await at({ front: [0.03, 1.2] }), wedge2: await at({ front: [-0.06, 1.05] }), bodice: await at({ front: [0, 1.13] }), lower: await at({ front: [0, 0.9] }), right };
	for (const k of ['wedge1', 'wedge2']) if (P[k]) X({ op: 'panel.set', id: P[k], ...meshF, name: k });
	X({ op: 'band.add', on: neck, height: 0.028, fabric: 'matte', colour: black, name: 'Mock neck' });
	X({ op: 'trim.set', on: id('Cuff'), kind: 'binding', fabric: { fabric: 'matte', colour: black } });
	X({ op: 'trim.set', on: id('Leg line'), kind: 'elastic', fabric: { fabric: 'matte', colour: black } });
	const AB = 'Crystal AB', row = (curve, side) => X({ op: 'stones.add', kind: 'row', on: { curve }, stone: AB, params: { size: 'ss10', rows: 2, offset: 0.004, gap: 1.12, rowGap: 0.0036, side } });
	row(D1, 'left'); row(D1, 'right'); row(H1, 'right'); row(H2, 'left'); row(H2, 'right'); row(D2, 'right');
	X({ op: 'stones.add', kind: 'row', on: { curve: id('Mock neck') ?? neck }, stone: AB, params: { size: 'ss8', rows: 2, offset: 0.006, gap: 1.15, rowGap: 0.0034 } });
	if (P.wedge1) X({ op: 'stones.add', kind: 'scatter', on: { panel: P.wedge1 }, stone: AB, params: { from: { curve: D1 }, near: 0.9, far: 0.05, distance: 0.08, sizes: [{ size: 'ss8', weight: 1 }, { size: 'ss6', weight: 2 }], gap: 1.6 } });
	for (const k of ['bodice', 'lower']) if (P[k]) X({ op: 'stones.add', kind: 'fill', on: { panel: P[k] }, stone: AB, params: { size: 'ss6', pattern: 'random', gap: 9 } });
	X({ op: 'stones.add', kind: 'fill', on: { panel: sl.id }, stone: AB, params: { size: 'ss6', pattern: 'random', gap: 8 } });
	if (right) X({ op: 'stones.add', kind: 'scatter', on: { panel: right }, stone: AB, params: { from: { curve: id('Cuff') }, near: 1, far: 0.03, distance: 0.12, sizes: [{ size: 'ss8', weight: 1 }, { size: 'ss6', weight: 2 }], gap: 1.3 } });
	X({ op: 'stones.add', kind: 'lettering', at: { front: [0.075, 0.92] }, stone: 'Crystal', params: { text: '6', font: 'Brush Script MT', height: 0.04, stoneSize: 'ss5', mode: 'outline' } });
	await settle();
	return { P, stones: app.stoneStats().total, errors: app.stoneStats().errors, warn: app.engine.g?.arr?.warn?.length, log };
}

export const photo = { src: '/moodboard/Screenshot 2026-06-07 104228.png', crop: [0, 0, 1094, 1061], view: { position: [0, 1.08, 1.75], target: [0, 1.08, 0], fov: 30 } };
