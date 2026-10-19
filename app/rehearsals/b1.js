// B1 (moodboard/DAPHNE_FRONT.jpg + DAPHNE_BACK.jpg): tank with navy bindings; a pink shield down
// the front to a V at the waist, pink lace at the sides and over the back, a navy brief under a V
// waist seam, navy binding strips crossing over the back as straps, a bow drawn in stones
// (sapphire outline over a crystal scatter), a printed signature logo, hands in front.
import { tools } from './helpers.js';

// a bow in unit coordinates: two loops (a lemniscate) and two tails
function bowPoints() {
	const pts = [];
	for (let i = 0; i <= 64; i++) { const t = (i / 64) * Math.PI * 2; pts.push([Math.sin(t) * 0.95, Math.sin(t) * Math.cos(t) * 0.75 + 0.2]); }
	return pts;
}

export async function build(app, o = {}) {
	const { X, id, on, at, settle, log } = tools(app);
	const pink = o.pink ?? '#f2b9c3', navy = '#1f2a55', laceNet = '#eab0bc', laceCord = '#fbe3e8';
	app.new('B1 lace wrap with bow');
	X({ op: 'body.set', finish: 'Athlete skin, light', pose: 'hands-in-front' });
	X({ op: 'scene.set', rig: 'White seamless (photo studio)' });
	X({ op: 'block.apply', neck: 'crew', back: 'v', sleeves: 'tank', leg: 'standard', fabric: 'matte', colour: pink });
	await settle();
	const side = id('Side seam'), vy = o.vy ?? 0.955;
	// the waist: a V at the front, level round the back
	const W = X({ op: 'curve.add', role: 'seam', mirror: 'none', closed: true, name: 'Waist V', points: [{ at: { front: [0, vy] }, kind: 'corner' }, on(side, { p: [0.13, 1.0, 0.0] }), { back: [0, 0.99] }, on(side, { p: [-0.13, 1.0, 0.0] })] });
	await settle();
	// the shield's lower edges: from each side down into the waist V's point
	X({ op: 'curve.add', role: 'seam', mirror: 'none', name: 'Shield edge', points: [on(side, { p: [0.13, 1.07, 0.0] }), { front: [0.07, 1.02] }, { at: { front: [0, vy] }, kind: 'corner', on: { curve: W, t: 0 } }, { front: [-0.07, 1.02] }, on(side, { p: [-0.13, 1.07, 0.0] })] });
	await settle();
	const P = { shield: await at({ front: [0, 1.15] }), laceL: await at({ front: [0.1, 1.0] }), laceR: await at({ front: [-0.1, 1.0] }), back: await at({ back: [0, 1.1] }), brief: await at({ front: [0, 0.88] }), briefB: await at({ back: [0, 0.88] }) };
	const lace = { fabric: 'lace', colour: laceNet, colour2: laceCord, sheer: o.sheer ?? 0.35 };
	for (const k of ['laceL', 'laceR', 'back']) if (P[k]) X({ op: 'panel.set', id: P[k], ...lace, name: 'Lace' });
	if (P.shield) X({ op: 'panel.set', id: P.shield, fabric: 'matte', colour: pink, name: 'Shield' });
	for (const k of ['brief', 'briefB']) if (P[k]) X({ op: 'panel.set', id: P[k], fabric: 'shiny', colour: navy, name: 'Brief' });
	const bind = { fabric: 'shiny', colour: navy };
	X({ op: 'trim.set', on: [id('Neckline'), id('Armhole')].filter(Boolean), kind: 'binding', fabric: bind });
	X({ op: 'trim.set', on: id('Leg line'), kind: 'elastic', fabric: bind });
	X({ op: 'trim.set', on: [W, id('Shield edge')], kind: 'tape', fabric: bind });
	// the back V's binding carries on past its point as two strips crossing to the opposite waist
	X({ op: 'strap.add', points: [{ back: [0.03, 1.2] }, { back: [-0.03, 1.12] }, { back: [-0.08, 1.04] }, { p: [-0.13, 1.025, -0.02] }], width: 0.007, fabric: 'shiny', colour: navy, edge: 'none', mirror: 'both', name: 'Back cross' });
	// the bow: a sapphire outline, a lighter ramp of crystals round it
	X({ op: 'stones.add', kind: 'motif', at: { front: [0.0, 1.18] }, stone: 'Sapphire', name: 'Bow', params: { shape: 'custom', points: bowPoints(), size: o.bow ?? 0.2, angle: -0.35, stoneSize: 'ss8', mode: 'outline', gap: 1.3 } });
	X({ op: 'stones.add', kind: 'scatter', on: { panel: P.shield }, name: 'Bow glow', colourRamp: ['Light Sapphire', 'Crystal AB', 'Crystal'], stone: 'Crystal', params: { from: { front: [0.0, 1.17] }, near: 0.7, far: 0, distance: 0.13, sizes: [{ size: 'ss6', weight: 2 }, { size: 'ss8', weight: 1 }], gap: 2.8 } });
	X({ op: 'decal.add', at: { front: [0.075, 0.9] }, text: 'Ruby Evans\nquatro', font: 'Segoe Script', size: 0.085, colour: '#f3dfe4', look: 'print' });
	await settle();
	return { P, stones: app.stoneStats().total, errors: app.stoneStats().errors, warn: app.engine.g?.arr?.warn?.length, log };
}

export const photo = { src: '/moodboard/DAPHNE_FRONT.jpg', crop: [0, 0, 1172, 1465], view: { position: [0, 1.04, 1.6], target: [0, 1.04, 0], fov: 30 } };
export const photoBack = { src: '/moodboard/DAPHNE_BACK.jpg', crop: [0, 0, 1179, 1594], view: { position: [0, 1.04, -1.6], target: [0, 1.04, 0], fov: 30 } };
