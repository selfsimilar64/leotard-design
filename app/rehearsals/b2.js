// B2 (moodboard/Anika-Leotard-Light-01_...jpg): raglan black mesh sleeves, mock neck, turquoise to
// black ombre bodice, a mesh strip down the centre front, turquoise crossover bands at the waist
// with mesh triangles between them at the sides, stone rays fanning from the neck, a stone
// monogram. Rounds: 1 bands too steep; 2 too flat (triangles hidden), rays onto the sleeves;
// 3-4 final values below.
import { tools } from './helpers.js';

export async function build(app, o = {}) {
	const { X, id, on, at, settle, log } = tools(app);
	const black = '#0b0b0f', tq = o.tq ?? '#5ac8d4', mesh = { fabric: 'mesh', colour: '#121216', sheer: o.sheer ?? 0.12 };
	app.new('B2 ombre with crossover bands');
	X({ op: 'body.set', finish: 'Athlete skin, light', pose: 'arms-down' });
	X({ op: 'scene.set', rig: 'White seamless (photo studio)' });
	X({ op: 'block.apply', neck: 'high', back: 'crew', sleeves: 'long', leg: o.leg ?? 'competition', armhole: 'raglan', fabric: 'matte', colour: black });
	await settle();
	// competition leg cut (2026-10-20): the bands sit 3.5 cm higher so their side ends stay on the
	// fabric above the leg opening's peak (yc 0.995 with the old standard cut)
	const side = id('Side seam'), neck = id('Neckline'), yc = o.yc ?? 1.03, dy = o.dy ?? 0.044;
	const A = X({ op: 'curve.add', role: 'seam', mirror: 'both', name: 'Cross band', points: [on(side, { p: [-0.14, yc + dy, 0.0] }), { front: [-0.065, yc + dy * 0.5] }, { front: [0, yc] }, { front: [0.065, yc - dy * 0.5] }, on(side, { p: [0.14, yc - dy, 0.0] })] });
	await settle();
	X({ op: 'curve.add', role: 'seam', mirror: 'both', name: 'Centre strip', points: [on(neck, { front: [0.025, 1.36] }), { front: [0.024, 1.2] }, on(A, { front: [0.014, yc] })] });
	await settle();
	const P = { upperL: await at({ front: [0.08, 1.15] }), upperR: await at({ front: [-0.08, 1.15] }), strip: await at({ front: [0, 1.15] }), tri: await at({ front: [0.105, yc] }), lower: await at({ front: [0, 0.88] }), sleeve: app.doc.panels.find((p) => p.name === 'Sleeve').id };
	X({ op: 'panel.set', id: P.tri, ...mesh, name: 'Side mesh triangles' });
	X({ op: 'panel.set', id: P.strip, ...mesh, name: 'Centre mesh strip' });
	X({ op: 'panel.set', id: P.sleeve, ...mesh });
	for (const pid of new Set([P.upperL, P.upperR])) X({ op: 'panel.set', id: pid, fabric: 'matte', colour: tq, ombre: { colour: black, axis: [0, 1, 0], start: 1.2, end: 1.06 }, name: 'Ombre bodice' });
	X({ op: 'panel.set', id: P.lower, name: 'Lower front' });
	X({ op: 'strap.add', path: id('Cross band'), width: 0.045, fabric: 'shiny', colour: '#3cc0cc', edge: 'none' });
	X({ op: 'band.add', on: neck, height: 0.03, fabric: 'matte', colour: black, name: 'Mock neck' });
	X({ op: 'trim.set', on: id('Leg line'), kind: 'elastic', fabric: { fabric: 'matte', colour: black } });
	X({ op: 'trim.set', on: id('Cuff'), kind: 'elastic', fabric: { fabric: 'matte', colour: black } });
	X({ op: 'stones.add', kind: 'rays', at: { front: [0, 1.325] }, stone: 'Crystal', name: 'Neck rays', params: { count: o.rays ?? 25, spread: 2.1, angle: -Math.PI / 2, lengths: [0.33, 0.29, 0.31, 0.27, 0.3], sizeFrom: 'ss20', sizeTo: 'ss5', start: 0.036, gap: 2.4, centre: false } });
	X({ op: 'stones.add', kind: 'fill', on: { panel: P.sleeve }, stone: 'Crystal', params: { size: 'ss8', pattern: 'random', gap: 9 } });
	X({ op: 'stones.add', kind: 'lettering', at: { front: [-0.08, 0.95] }, stone: 'Crystal', params: { text: 'P', font: 'Brush Script MT', height: 0.03, stoneSize: 'ss5', mode: 'outline' } });
	await settle();
	return { P, stones: app.stoneStats().total, errors: app.stoneStats().errors, log };
}

export const photo = { src: '/moodboard/Anika-Leotard-Light-01_435d7790-401a-45c3-8f75-bf723d0848c4.jpg', crop: [0, 0, 2572, 3245], view: { position: [0, 1.04, 2.0], target: [0, 1.04, 0], fov: 30 } };
