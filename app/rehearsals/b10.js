// B10 (moodboard/14a709479b4f93e8e2ebad6a451f4f7a.jpg): ultra-matte black, a mesh yoke plunging
// to a deep V under the bust, long mesh sleeves, about 4,000 stones: rings following the bodice
// edge coloured by depth (amethyst at the edge, jet inside), concentric diamond motifs down the
// centre and either side, a stone neckband, hands on hips.
import { tools } from './helpers.js';

export async function build(app, o = {}) {
	const { X, id, on, at, settle, log } = tools(app);
	const black = '#08080a', meshF = { fabric: 'mesh', colour: '#0c0c10', sheer: o.sheer ?? 0.1 };
	app.new('B10 jet and amethyst diamonds');
	X({ op: 'body.set', finish: 'Athlete skin, light', pose: 'hands-on-hips' });
	X({ op: 'scene.set', rig: o.rig ?? 'Grey seamless (photo studio)' });
	X({ op: 'block.apply', neck: 'crew', back: 'crew', sleeves: 'long', leg: 'high', armhole: 'set-in', fabric: 'matte', colour: black });
	await settle();
	const arm = id('Sleeve seam'), neck = id('Neckline'), vy = o.vy ?? 1.12;
	const V = X({ op: 'curve.add', role: 'seam', mirror: 'none', name: 'Yoke V', points: [
		on(arm, { p: [0.13, 1.2, 0.03] }), { front: [0.09, 1.22] }, { front: [0.045, 1.175] }, { at: { front: [0, vy] }, kind: 'corner' },
		{ front: [-0.045, 1.175] }, { front: [-0.09, 1.22] }, on(arm, { p: [-0.13, 1.2, 0.03] })] });
	await settle();
	// where the stonework stops at the hip: a print line (no seam), so the rings have their own region
	X({ op: 'curve.add', role: 'print', mirror: 'none', closed: true, name: 'Stone edge', points: [{ front: [0, o.hy ?? 0.9] }, { p: [0.15, (o.hy ?? 0.9) + 0.03, 0.0] }, { back: [0, (o.hy ?? 0.9) + 0.06] }, { p: [-0.15, (o.hy ?? 0.9) + 0.03, 0.0] }] });
	await settle();
	const P = { yoke: await at({ front: [0, 1.25] }), bodice: await at({ front: [0, 1.0] }), brief: await at({ front: [0, 0.82] }), sleeve: app.doc.panels.find((p) => p.name === 'Sleeve')?.id };
	for (const k of ['yoke', 'sleeve']) if (P[k]) X({ op: 'panel.set', id: P[k], ...meshF });
	for (const k of ['bodice', 'brief']) if (P[k]) X({ op: 'panel.set', id: P[k], fabric: 'matte', colour: black });
	X({ op: 'trim.set', on: neck, kind: 'binding', fabric: { fabric: 'matte', colour: black } });
	X({ op: 'trim.set', on: id('Cuff'), kind: 'elastic', fabric: { fabric: 'matte', colour: black } });
	X({ op: 'trim.set', on: id('Leg line'), kind: 'elastic', fabric: { fabric: 'matte', colour: black } });
	const am = o.amethyst ?? 'Amethyst';
	// generators run in order and a later stone gives way to an earlier one: edges and motifs first
	X({ op: 'stones.add', kind: 'row', on: { curve: neck }, stone: am, params: { size: 'ss8', rows: 1, offset: 0.004, gap: 1.12, side: 'right' } });
	X({ op: 'stones.add', kind: 'row', on: { curve: V }, stone: 'Jet', params: { size: 'ss8', rows: 4, offset: 0.004, gap: 1.2, rowGap: 0.006, side: 'right' } });
	const diamond = (x, y, sizes, stone) => sizes.forEach((sz, k) => X({ op: 'stones.add', kind: 'motif', at: { front: [x, y] }, stone: k === 0 ? 'Jet' : stone, params: { shape: 'diamond', size: sz, stoneSize: 'ss8', mode: k === 0 ? 'fill' : 'outline', fillSize: 'ss8', gap: 1.2 } }));
	diamond(0, 1.04, [0.03, 0.06, 0.09], am);
	diamond(0, 0.955, [0.03, 0.06], am);
	diamond(0.085, 1.1, [0.03, 0.058], 'Jet');
	diamond(-0.085, 1.1, [0.03, 0.058], 'Jet');
	diamond(0.03, 1.27, [0.022, 0.042], 'Jet');
	diamond(-0.03, 1.27, [0.022, 0.042], 'Jet');
	// rings along the bodice's edges, amethyst at the edge, jet inside, the fabric showing between rows
	X({ op: 'stones.add', kind: 'fill', on: { panel: P.bodice }, name: 'Contour rings', colourRamp: [am, am, 'Jet', 'Jet', 'Jet', 'Jet', 'Jet', 'Jet'],
		params: { pattern: 'contour', size: 'ss8', rowGap: o.rowGap ?? 0.0065, gap: 1.3, inset: 0.004 } });
	X({ op: 'stones.add', kind: 'fill', on: { panel: P.sleeve }, stone: 'Crystal AB', params: { size: 'ss6', pattern: 'random', gap: 10 } });
	await settle();
	return { P, stones: app.stoneStats().total, errors: app.stoneStats().errors, warn: app.engine.g?.arr?.warn?.length, log };
}

export const photo = { src: '/moodboard/14a709479b4f93e8e2ebad6a451f4f7a.jpg', crop: [0, 0, 1080, 1346], view: { position: [0, 1.05, 1.45], target: [0, 1.05, 0], fov: 30 } };
