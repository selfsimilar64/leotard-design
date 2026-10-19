// B13 (moodboard/IMG_4141.PNG): a child's leotard. Tank with navy bindings, a diagonal lavender to
// navy ombre bodice, a vesica (pointed oval) mesh insert piped in navy, side cut-outs above a navy
// stone band, a midriff arch cut-out below it (bodice joined to the brief only at the sides),
// a periwinkle brief darkening downwards, gym lighting.
// The lines are drawn on the reference body; the child body follows by surface address.
import { tools } from './helpers.js';

export async function build(app, o = {}) {
	const { X, id, on, at, settle, log } = tools(app);
	const navy = '#1f2a66', lav = o.lav ?? '#a79cf2', peri = o.peri ?? '#5a6bd8';
	app.new('B13 midriff arch');
	X({ op: 'body.set', size: 'child', finish: 'Athlete skin, light', pose: 'hands-in-front' });
	X({ op: 'scene.set', rig: 'Gym (overhead lights)' });
	X({ op: 'block.apply', neck: 'crew', back: 'crew', sleeves: 'tank', leg: 'standard', fabric: 'shiny', colour: lav });
	await settle();
	// the vesica insert, pointed top and bottom
	const Vs = X({ op: 'curve.add', role: 'seam', mirror: 'none', closed: true, name: 'Vesica', points: [{ at: { front: [0, 1.25] }, kind: 'corner' }, { front: [0.05, 1.165] }, { at: { front: [0, 1.065] }, kind: 'corner' }, { front: [-0.05, 1.165] }] });
	// the midriff arch: straight under the band, curving down at the centre
	const aw = o.aw ?? 0.085, side = id('Side seam');
	const Arch = X({ op: 'curve.add', role: 'edge', mirror: 'none', closed: true, name: 'Midriff arch', points: [{ at: { front: [aw, 0.99] }, kind: 'corner' }, { front: [0, 0.99] }, { at: { front: [-aw, 0.99] }, kind: 'corner' }, { front: [-aw * 0.75, 0.95] }, { front: [0, 0.93] }, { front: [aw * 0.75, 0.95] }] });
	// side cut-outs above the band (mirrored)
	const Side = X({ op: 'curve.add', role: 'edge', mirror: 'both', closed: true, name: 'Side cut-out', points: [{ at: { front: [0.09, 1.04] }, kind: 'corner' }, { p: [0.128, 1.04, -0.025] }, { at: { p: [0.125, 1.1, -0.01] }, kind: 'corner' }] });
	// print line under the band: the bodice and the brief take different gradients
	const yb = 1.013;
	X({ op: 'curve.add', role: 'print', mirror: 'none', closed: true, name: 'Band line', points: [{ front: [0, yb] }, on(side, { p: [0.13, yb + 0.004, 0.0] }), { back: [0, yb + 0.006] }, on(side, { p: [-0.13, yb + 0.004, 0.0] })] });
	await settle();
	// openings that inherited a panel when they were cut from the front: cut them out
	for (const spec of [{ front: [0, 0.965] }, { p: [0.122, 1.06, -0.015] }, { p: [-0.122, 1.06, -0.015] }]) { const p = await at(spec); if (p && !app.doc.panels.find((q) => q.id === p).removed) X({ op: 'panel.cut', id: p }); }
	await settle();
	const P = { bodice: await at({ front: [0.06, 1.2] }), vesica: await at({ front: [0, 1.16] }), lower: await at({ front: [0, 0.88] }), back: await at({ back: [0, 1.1] }) };
	if (!P.lower) P.lower = X({ op: 'panel.add', at: { front: [0, 0.88] }, fabric: 'shiny', colour: peri, name: 'Brief' });
	X({ op: 'panel.set', id: P.vesica, fabric: 'mesh', colour: '#141a3e', sheer: 0.08, name: 'Vesica mesh' });
	// diagonal ombre: lavender high on the wearer's right, navy low on the left
	X({ op: 'panel.set', id: P.bodice, fabric: 'shiny', colour: lav, ombre: { colour: navy, axis: [0.85, -0.53, 0], start: o.o0 ?? -0.74, end: o.o1 ?? -0.5 }, name: 'Bodice' });
	// the brief (and the strips beside the arch, their own cells) darken towards the arch
	// any front piece still in the block's colour is part of the brief (the strips beside the arch)
	const rest = app.doc.panels.filter((p) => !p.removed && p.name === 'Front').map((p) => p.id);
	for (const pid of new Set([P.lower, ...rest])) X({ op: 'panel.set', id: pid, fabric: 'shiny', colour: peri, ombre: { colour: '#2b3577', axis: [0, 1, 0], start: 0.9, end: 0.99 }, name: 'Brief' });
	for (const p of app.doc.panels.filter((q) => !q.removed && q.name === 'Back')) X({ op: 'panel.set', id: p.id, fabric: 'shiny', colour: navy });
	const bind = { fabric: 'shiny', colour: navy };
	X({ op: 'trim.set', on: [id('Neckline'), id('Armhole'), Arch, Side], kind: 'binding', fabric: bind });
	X({ op: 'trim.set', on: id('Leg line'), kind: 'elastic', fabric: { fabric: 'shiny', colour: peri } });
	X({ op: 'trim.set', on: Vs, kind: 'tape', fabric: bind });
	// the band: a navy ribbon over the print line, three rows of stones on it
	const band = X({ op: 'curve.add', role: 'strap-path', mirror: 'none', name: 'Band', points: [on(side, { p: [0.13, yb + 0.004, 0.0] }), { front: [0.08, yb] }, { front: [0, yb] }, { front: [-0.08, yb] }, on(side, { p: [-0.13, yb + 0.004, 0.0] })] });
	await settle();
	const strap = X({ op: 'strap.add', path: band, width: 0.045, fabric: 'shiny', colour: navy, edge: 'binding' });
	await settle();
	X({ op: 'stones.add', kind: 'row', on: { strap }, stone: 'Crystal', params: { size: 'ss8', rows: 3, offset: -0.009, gap: 1.3, rowGap: 0.009 } });
	X({ op: 'stones.add', kind: 'row', on: { curve: Vs }, stone: 'Crystal', params: { size: 'ss8', rows: 1, offset: -0.006, gap: 1.4 } });
	X({ op: 'stones.add', kind: 'scatter', on: { panel: P.bodice }, stone: 'Crystal', params: { from: { curve: Vs }, near: 1, far: 0.15, distance: 0.09, sizes: [{ size: 'ss8', weight: 2 }, { size: 'ss6', weight: 1 }], gap: 2.4 } });
	X({ op: 'stones.add', kind: 'fill', on: { panel: P.vesica }, stone: 'Crystal', params: { size: 'ss6', pattern: 'random', gap: 3.5 } });
	await settle();
	return { P, strap, stones: app.stoneStats().total, errors: app.stoneStats().errors, warn: app.engine.g?.arr?.warn?.length, log };
}

export const photo = { src: '/moodboard/IMG_4141.PNG', crop: [0, 0, 636, 922], view: { position: [0, 0.84, 1.45], target: [0, 0.84, 0], fov: 30 } };
