// B11 (moodboard/Screenshot_20260711_115458_Instagram.jpg): royal mystique, a navy mock neck and a
// navy yoke dipping to a V at the front, a fan of stone rows converging down to a point at the
// waist, a stone band arching across the waist, sparse rows on the sleeves, indoor light, left hand
// on the hip.
import { tools } from './helpers.js';

export async function build(app, o = {}) {
	const { X, id, on, at, settle, log } = tools(app);
	const royal = o.royal ?? '#1d48b4', navy = '#141a52';
	app.new('B11 converging fan');
	X({ op: 'body.set', finish: 'Athlete skin, light', pose: 'left-hand-on-hip' });
	X({ op: 'scene.set', rig: o.rig ?? 'Studio (soft)', rotateLights: false });
	X({ op: 'block.apply', neck: 'high', back: 'crew', sleeves: 'three-quarter', leg: 'standard', armhole: 'raglan', fabric: 'shiny', colour: royal });
	await settle();
	const neck = id('Neckline'), ragF = id('Raglan seam (front)'), ty = o.ty ?? 0.985;
	// the navy V: from each raglan seam down to a point at the waist
	const Vl = X({ op: 'curve.add', role: 'seam', mirror: 'none', name: 'Navy V', points: [on(ragF, { p: [0.12, 1.2, 0.06] }), { front: [0.08, 1.12] }, { front: [0.035, 1.04] }, { at: { front: [0, ty] }, kind: 'corner' }, { front: [-0.035, 1.04] }, { front: [-0.08, 1.12] }, on(ragF, { p: [-0.12, 1.2, 0.06] })] });
	await settle();
	const P = { v: await at({ front: [0, 1.15] }), side: await at({ front: [0.11, 1.02] }), sleeve: app.doc.panels.find((p) => p.name === 'Sleeve')?.id };
	if (P.v) X({ op: 'panel.set', id: P.v, fabric: 'shiny', colour: navy, name: 'Navy V' });
	if (P.sleeve) X({ op: 'panel.set', id: P.sleeve, fabric: 'shiny', colour: navy });
	X({ op: 'band.add', on: neck, height: 0.035, fabric: 'shiny', colour: navy, name: 'Mock neck' });
	X({ op: 'trim.set', on: id('Leg line'), kind: 'elastic', fabric: { fabric: 'shiny', colour: royal } });
	X({ op: 'trim.set', on: id('Cuff'), kind: 'elastic', fabric: { fabric: 'shiny', colour: navy } });
	// stones: the mock neck, the V's edges, then the fan converging into the V's point
	X({ op: 'stones.add', kind: 'row', on: { curve: id('Mock neck') ?? neck }, stone: 'Crystal', params: { size: 'ss8', rows: 2, offset: 0.006, gap: 1.2, rowGap: 0.004 } });
	X({ op: 'stones.add', kind: 'row', on: { curve: Vl }, stone: 'Crystal', params: { size: 'ss8', rows: 2, offset: 0.004, gap: 1.25, rowGap: 0.0045, side: 'right' } });
	X({ op: 'stones.add', kind: 'rays', at: { front: [0, ty + 0.01] }, stone: 'Crystal', name: 'Converging fan', params: { count: o.count ?? 21, spread: o.spread ?? 1.5, angle: Math.PI / 2, lengths: [0.34], sizeFrom: 'ss6', sizeTo: 'ss10', start: 0.025, gap: 1.6, centre: false } });
	// the waist band: rows along a guide arching across the front (guides do not cut the cloth)
	const band = X({ op: 'curve.add', role: 'guide', mirror: 'none', name: 'Waist band', points: [{ p: [0.14, 1.0, 0.04] }, { front: [0.08, 0.975] }, { front: [0, 0.965] }, { front: [-0.08, 0.975] }, { p: [-0.14, 1.0, 0.04] }] });
	await settle();
	X({ op: 'stones.add', kind: 'row', on: { curve: band }, stone: 'Crystal', params: { size: 'ss8', rows: 3, offset: -0.004, gap: 1.25, rowGap: 0.0042, side: 'both' } });
	X({ op: 'stones.add', kind: 'scatter', on: { panel: await at({ front: [0, 0.9] }) }, stone: 'Crystal', params: { from: { curve: band }, near: 0.6, far: 0, distance: 0.06, sizes: ['ss8', 'ss6'], gap: 1.6 } });
	if (P.sleeve) X({ op: 'stones.add', kind: 'fill', on: { panel: P.sleeve }, stone: 'Crystal', params: { size: 'ss8', pattern: 'random', gap: 6 } });
	await settle();
	return { P, stones: app.stoneStats().total, errors: app.stoneStats().errors, warn: app.engine.g?.arr?.warn?.length, log };
}

export const photo = { src: '/moodboard/Screenshot_20260711_115458_Instagram.jpg', crop: [0, 0, 1180, 1144], view: { position: [0, 1.06, 1.75], target: [0, 1.06, 0], fov: 30 } };
