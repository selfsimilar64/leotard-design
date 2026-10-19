// B9 (moodboard/Screenshot 2026-06-05 113858.png + 113907.png): navy, a mesh yoke that runs over
// the sleeve caps and round the back, crystal rain hanging from the yoke line (AB near the yoke,
// sapphire further down; on the body and the sleeves), AB clustered along the yoke edge, a stone
// neckband, a stone monogram, hands on hips.
import { tools } from './helpers.js';

export async function build(app, o = {}) {
	const { X, id, on, at, settle, log } = tools(app);
	const navy = o.navy ?? '#1b2152', meshF = { fabric: 'mesh', colour: '#151a3a', sheer: o.sheer ?? 0.22 };
	app.new('B9 crystal rain');
	X({ op: 'body.set', finish: 'Athlete skin, light', pose: 'hands-on-hips' });
	X({ op: 'scene.set', rig: 'White seamless (photo studio)' });
	X({ op: 'block.apply', neck: 'crew', back: 'crew', sleeves: 'three-quarter', leg: 'standard', armhole: 'raglan', fabric: 'matte', colour: navy });
	await settle();
	const y0 = o.y0 ?? 1.24;
	// the yoke line: round the body and over both sleeve caps (one closed loop)
	const half = (s) => [{ front: [0.07 * s, y0 - 0.004] }, { p: [0.17 * s, y0 - 0.035, 0.045] }, { p: [0.215 * s, y0 - 0.075, 0.0] }, { p: [0.17 * s, y0 - 0.035, -0.05] }, { back: [0.07 * s, y0 - 0.006] }];
	const Y = X({ op: 'curve.add', role: 'seam', mirror: 'none', closed: true, name: 'Yoke', points: [{ front: [0, y0] }, ...half(1), { back: [0, y0 - 0.006] }, ...half(-1).reverse()] });
	await settle();
	const P = { front: await at({ front: [0, 1.31] }), back: await at({ back: [0, 1.31] }), capL: await at({ p: [0.2, y0 + 0.02, 0.0] }), capR: await at({ p: [-0.2, y0 + 0.02, 0.0] }) };
	for (const pid of new Set(Object.values(P).filter(Boolean))) X({ op: 'panel.set', id: pid, ...meshF, name: 'Mesh yoke' });
	const neck = id('Neckline');
	X({ op: 'trim.set', on: neck, kind: 'binding', fabric: { fabric: 'matte', colour: navy } });
	X({ op: 'trim.set', on: id('Cuff'), kind: 'elastic', fabric: { fabric: 'matte', colour: navy } });
	X({ op: 'trim.set', on: id('Leg line'), kind: 'elastic', fabric: { fabric: 'matte', colour: navy } });
	// crystal rain: strands of random length, AB at the yoke turning sapphire further down
	X({ op: 'stones.add', kind: 'fringe', on: { curve: Y }, name: 'Crystal rain', colourRamp: ['Crystal AB', 'Crystal AB', 'Light Sapphire', 'Sapphire', 'Sapphire', 'Sapphire'],
		params: { random: true, min: o.min ?? 0.08, max: o.max ?? 0.3, spacing: o.spacing ?? 0.009, sizeFrom: 'ss12', sizeTo: 'ss8', offset: -0.008, gap: 1.35, jitter: 0.0018 } });
	X({ op: 'stones.add', kind: 'scatter', on: { panel: await at({ front: [0, 1.1] }) }, stone: 'Crystal AB', name: 'Yoke edge cluster', params: { from: { curve: Y }, near: 1, far: 0, distance: 0.055, sizes: [{ size: 'ss10', weight: 1 }, { size: 'ss8', weight: 2 }], gap: 1.15 } });
	X({ op: 'stones.add', kind: 'row', on: { curve: neck }, stone: 'Crystal AB', params: { size: 'ss8', rows: 3, offset: 0.004, gap: 1.12, rowGap: 0.0032, side: 'right' } });
	X({ op: 'stones.add', kind: 'lettering', at: { front: [0.075, 0.93] }, stone: 'Crystal AB', params: { text: 'S', font: 'Arial Black', height: 0.03, stoneSize: 'ss5', mode: 'fill' } });
	await settle();
	return { P, stones: app.stoneStats().total, errors: app.stoneStats().errors, warn: app.engine.g?.arr?.warn?.length, log };
}

export const photo = { src: '/moodboard/Screenshot 2026-06-05 113858.png', crop: [0, 0, 600, 618], view: { position: [0, 1.06, 1.75], target: [0, 1.06, 0], fov: 30 } };
