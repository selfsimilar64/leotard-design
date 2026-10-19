// Garment commands: blocks, curves (the lines on the body) and panels (what fills them).
// Points are given as point specs (curves/points.js) and stored as surface points.
import { defineCommand } from './store.js';
import { resolvePoint } from '../curves/points.js';
import { toSP } from '../body/surface.js';
import { makeBlock, BLOCK_OPTIONS } from '../garment/blocks.js';
import { FABRICS, SECOND } from '../materials/fabric.js';
import { panelAt } from '../garment/build.js';
import { projectNear } from '../curves/evaluate.js';

const ROLES = ['seam', 'edge', 'print', 'guide', 'strap-path', 'trim-path'];
const MIRRORS = ['none', 'both'];
const SHAPES = ['none', 'scallop', 'zigzag', 'wave'];

function ctxOf(tx) {
	if (!tx.ctx) throw new Error('The body is still loading');
	return tx.ctx;
}
function oneOf(name, v, list) { if (!list.includes(v)) throw new Error(`${name} must be one of: ${list.join(', ')} (got ${JSON.stringify(v)})`); }

// A control point from { at: spec, kind, on? } or a bare spec. on: { curve, t, mirror? } attaches
// the point to another line (it then follows that line); the position is still stored as a fallback.
function controlPoint(tx, pt) {
	const bare = !pt.at && !pt.sp && !pt.p && !pt.front && !pt.back && !pt.lm && !pt.curve && !pt.mirror;
	const spec = pt.at ?? (pt.on && bare ? { curve: pt.on.curve, t: pt.on.t } : pt);
	const kind = pt.kind ?? 'smooth';
	oneOf('point kind', kind, ['smooth', 'corner']);
	const out = { sp: toSP(resolvePoint(spec, ctxOf(tx))), kind };
	if (pt.on) {
		if (!tx.doc.curves.some((c) => c.id === pt.on.curve)) throw new Error('Cannot attach to ' + pt.on.curve + ': no such line');
		out.on = { curve: pt.on.curve, t: Math.min(Math.max(+pt.on.t || 0, 0), 1), ...(pt.on.mirror ? { mirror: true } : {}) };
	}
	return out;
}

function findCurve(tx, id) {
	const c = tx.doc.curves.find((x) => x.id === id);
	if (!c) throw new Error(`No curve ${id}. Curves: ${tx.doc.curves.map((x) => x.id).join(', ') || 'none'}`);
	return c;
}

// Panel by id, or the panel under a point spec.
function findPanel(tx, a) {
	if (a.id) {
		const p = tx.doc.panels.find((x) => x.id === a.id);
		if (!p) throw new Error(`No panel ${a.id}`);
		return p;
	}
	if (a.at) {
		const ctx = ctxOf(tx), g = ctx.garment();
		const sp = resolvePoint(a.at, ctx), id = g && panelAt(g, tx.doc, ctx.surf, sp);
		const p = id && tx.doc.panels.find((x) => x.id === id);
		if (!p) throw new Error('No panel at that point');
		return p;
	}
	throw new Error('Name the panel by id or by a point: { id } or { at: { front: [x, y] } }');
}

defineCommand('block.apply', {
	label: 'Start from block', args: `{ neck?: ${BLOCK_OPTIONS.neck.join('|')}, back?: ${BLOCK_OPTIONS.back.join('|')}, sleeves?: ${BLOCK_OPTIONS.sleeves.join('|')}, leg?: ${BLOCK_OPTIONS.leg.join('|')}, armhole?: ${BLOCK_OPTIONS.armhole.join('|')}, fabric?, colour?, second? }`,
	run(tx, a) {
		const ctx = ctxOf(tx);
		const stack = [{ fabric: a.fabric ?? 'mystique', colour: a.colour ?? '#2b1d6e', second: a.second ?? 'Tone-on-tone' }];
		const blk = makeBlock(ctx.man, ctx.surf, { neck: a.neck, back: a.back, sleeves: a.sleeves, leg: a.leg, armhole: a.armhole }, stack);
		tx.set('legacy', null);
		for (const c of tx.doc.curves.filter((c) => (c.layer ?? 'L0') === 'L0').map((c) => c.id)) tx.remove('curves', c);
		for (const p of tx.doc.panels.filter((p) => (p.layer ?? 'L0') === 'L0').map((p) => p.id)) tx.remove('panels', p);
		const ids = new Map();
		for (const c of blk.curves) ids.set(c.key, tx.newId('c'));
		for (const { key, ...c } of blk.curves) {
			c.points = c.points.map((p) => (p.on ? { ...p, on: { ...p.on, curve: ids.get(p.on.curve) } } : p));
			tx.insert('curves', { id: ids.get(key), layer: 'L0', ...c });
		}
		for (const p of blk.panels) tx.insert('panels', { id: tx.newId('p'), layer: 'L0', mirror: 'none', ...p });
		tx.set('meta/block', { neck: a.neck, back: a.back, sleeves: a.sleeves, leg: a.leg, armhole: a.armhole });
	},
});

defineCommand('curve.add', {
	label: 'Draw line', args: '{ points: [spec | { at: spec, kind: smooth|corner }], role?: seam|edge|print|guide|strap-path|trim-path, closed?, mirror?: none|both, shape?: { mod, amp, period }, name?, layer? }',
	run(tx, a) {
		if (!Array.isArray(a.points) || a.points.length < 2) throw new Error('A line needs at least two points');
		const role = a.role ?? 'seam';
		oneOf('role', role, ROLES);
		if (a.layer && !tx.doc.layers.some((l) => l.id === a.layer)) throw new Error('No layer ' + a.layer);
		const mirror = a.mirror ?? 'both';
		oneOf('mirror', mirror, MIRRORS);
		if (a.shape) oneOf('shape.mod', a.shape.mod, SHAPES);
		const id = tx.newId('c');
		tx.insert('curves', {
			id, layer: a.layer ?? 'L0', role, name: a.name ?? '', closed: !!a.closed, mirror,
			shape: a.shape ?? { mod: 'none', amp: 0, period: 0 },
			points: a.points.map((p) => controlPoint(tx, p)),
		});
		return id;
	},
});

defineCommand('curve.set', {
	label: 'Change line', args: '{ id, role?, closed?, mirror?, shape?, name? }',
	run(tx, a) {
		findCurve(tx, a.id);
		if (a.role !== undefined) { oneOf('role', a.role, ROLES); tx.set(['curves', a.id, 'role'], a.role); }
		if (a.mirror !== undefined) { oneOf('mirror', a.mirror, MIRRORS); tx.set(['curves', a.id, 'mirror'], a.mirror); }
		if (a.closed !== undefined) tx.set(['curves', a.id, 'closed'], !!a.closed);
		if (a.name !== undefined) tx.set(['curves', a.id, 'name'], a.name);
		if (a.shape !== undefined) { oneOf('shape.mod', a.shape.mod, SHAPES); tx.set(['curves', a.id, 'shape'], { mod: a.shape.mod, amp: a.shape.amp ?? 0, period: a.shape.period ?? 0.01 }); }
	},
});

defineCommand('curve.points', {
	label: 'Redraw line', args: '{ id, points: [spec | { at, kind }] }',
	run(tx, a) {
		findCurve(tx, a.id);
		if (!Array.isArray(a.points) || a.points.length < 2) throw new Error('A line needs at least two points');
		tx.set(['curves', a.id, 'points'], a.points.map((p) => controlPoint(tx, p)));
	},
});

defineCommand('curve.movePoint', {
	label: 'Move point', args: '{ id, i, to: spec, gesture? }',
	run(tx, a) {
		const c = findCurve(tx, a.id);
		if (!(a.i >= 0 && a.i < c.points.length)) throw new Error(`Point index ${a.i} out of range (0-${c.points.length - 1})`);
		tx.set(['curves', a.id, 'points', String(a.i), 'sp'], toSP(resolvePoint(a.to, ctxOf(tx))));
	},
});

defineCommand('curve.insertPoint', {
	label: 'Add point', args: '{ id, i (insert before this index), at: spec, kind? }',
	run(tx, a) {
		const c = findCurve(tx, a.id);
		const i = Math.max(0, Math.min(a.i ?? c.points.length, c.points.length));
		tx.insert(['curves', a.id, 'points'], controlPoint(tx, { at: a.at, kind: a.kind }), i);
	},
});

defineCommand('curve.removePoint', {
	label: 'Delete point', args: '{ id, i }',
	run(tx, a) {
		const c = findCurve(tx, a.id);
		if (c.points.length <= 2) throw new Error('A line keeps at least two points (delete the line instead)');
		tx.remove(['curves', a.id, 'points'], String(a.i));
	},
});

defineCommand('curve.setKind', {
	label: 'Corner / smooth', args: '{ id, i, kind: smooth|corner }',
	run(tx, a) { findCurve(tx, a.id); oneOf('kind', a.kind, ['smooth', 'corner']); tx.set(['curves', a.id, 'points', String(a.i), 'kind'], a.kind); },
});

defineCommand('curve.remove', {
	label: 'Delete line', args: '{ id }',
	run(tx, a) { findCurve(tx, a.id); tx.remove('curves', a.id); },
});

// --- panels ------------------------------------------------------------------------------------

function setStackFields(tx, p, a, layer = 0) {
	if (a.fabric !== undefined) oneOf('fabric', a.fabric, Object.keys(FABRICS));
	if (a.second !== undefined) oneOf('second', a.second, SECOND);
	const base = ['panels', p.id, 'stack', String(layer)];
	if (!p.stack[layer]) tx.insert(['panels', p.id, 'stack'], { fabric: 'matte', colour: '#888888', second: 'Tone-on-tone' }, layer);
	if (a.texMode !== undefined) oneOf('texMode', a.texMode, ['original', 'recolour']);
	if (a.ombre && !a.ombre.colour) throw new Error('ombre needs a colour: { colour, curve | axis: [x, y, z], start, end } (metres)');
	if (a.ombre?.curve && !tx.doc.curves.some((c) => c.id === a.ombre.curve)) throw new Error('ombre: no line ' + a.ombre.curve);
	if (a.print && !a.print.src) throw new Error('print needs src (an image URL) and size [w, h] in metres');
	for (const k of ['fabric', 'colour', 'second', 'colour2', 'effect', 'sheer', 'grain', 'print', 'ombre', 'texture', 'texMode', 'texScale', 'texNormal', 'masks']) if (a[k] !== undefined) tx.set([...base, k], a[k] === null ? undefined : a[k]);
}

defineCommand('panel.set', {
	label: 'Change panel', args: '{ id | at: spec, fabric?, colour?, second?, colour2? (hex: foil, ombre end, duochrome shift), effect? (0..2: hologram / film / duochrome strength), sheer? (0..0.95: share seen through a mesh or lace net), grain?, ombre?: { colour, curve | axis, start, end } | null, print?: { src, size: [w, h] m, offset } | null, texture? (scan id or null), texMode?: original|recolour, texScale?, texNormal?, masks?: [colours], name?, layer? (0 = outer) }',
	run(tx, a) {
		const p = findPanel(tx, a);
		setStackFields(tx, p, a, a.layer ?? 0);
		if (a.name !== undefined) tx.set(['panels', p.id, 'name'], a.name);
		return p.id;
	},
});

defineCommand('panel.cut', {
	label: 'Cut out', args: '{ id | at: spec }',
	run(tx, a) { const p = findPanel(tx, a); tx.set(['panels', p.id, 'removed'], true); return p.id; },
});

defineCommand('panel.restore', {
	label: 'Fill opening', args: '{ id }',
	run(tx, a) { const p = findPanel(tx, a); tx.set(['panels', p.id, 'removed'], false); return p.id; },
});

defineCommand('panel.add', {
	label: 'Fill area', args: '{ at: spec, fabric?, colour?, second?, mirror?: none|both, name? }',
	run(tx, a) {
		const sp = toSP(resolvePoint(a.at, ctxOf(tx)));
		const layer = a.layer ?? 'L0';
		if (!tx.doc.layers.some((l) => l.id === layer)) throw new Error('No layer ' + layer);
		const id = tx.newId('p');
		tx.insert('panels', { id, layer, name: a.name ?? '', seed: sp, mirror: a.mirror ?? 'none', stack: [{ fabric: a.fabric ?? 'matte', colour: a.colour ?? '#888888', second: a.second ?? 'Tone-on-tone' }] });
		return id;
	},
});

// --- edge finishes -------------------------------------------------------------------------------

defineCommand('trim.set', {
	label: 'Edge finish', args: '{ on: curveId | [curveIds], kind: elastic|binding (edges)|piping|tape (seams)|none, fabric?: { fabric, colour, second } }',
	run(tx, a) {
		const on = Array.isArray(a.on) ? a.on : [a.on];
		for (const id of on) findCurve(tx, id);
		oneOf('kind', a.kind, ['elastic', 'binding', 'piping', 'tape', 'none']);
		if (a.fabric?.fabric) oneOf('fabric', a.fabric.fabric, Object.keys(FABRICS));
		// one finish per curve: drop the curves from other trims first
		for (const t of tx.doc.trims) {
			const keep = t.on.filter((c) => !on.includes(c));
			if (keep.length !== t.on.length) { if (keep.length) tx.set(['trims', t.id, 'on'], keep); else tx.remove('trims', t.id); }
		}
		const id = tx.newId('t');
		tx.insert('trims', { id, on, kind: a.kind, ...(a.fabric ? { fabric: { fabric: a.fabric.fabric ?? 'matte', colour: a.fabric.colour ?? '#ffffff', second: a.fabric.second ?? 'Tone-on-tone' } } : {}) });
		return id;
	},
});

// --- layers ----------------------------------------------------------------------------------------
// The shell (L0) is the garment itself; overlays are pieces drawn over it (lace wrap pieces, sashes,
// appliqué), linings are shapes seen through sheer panels (a bandeau under mesh). Each layer is cut
// by its own lines (curve.add with layer) and filled by its own panels (panel.add with layer).

defineCommand('layer.add', {
	label: 'Add layer', args: '{ kind: overlay|lining, name? }',
	run(tx, a) {
		oneOf('kind', a.kind, ['overlay', 'lining']);
		const zs = tx.doc.layers.map((l) => l.z ?? 0);
		const z = a.kind === 'overlay' ? Math.max(0, ...zs) + 1 : Math.min(0, ...zs) - 1;
		const id = tx.newId('L');
		tx.insert('layers', { id, kind: a.kind, z, name: a.name ?? (a.kind === 'overlay' ? 'Overlay' : 'Lining') });
		return id;
	},
});

defineCommand('layer.remove', {
	label: 'Remove layer', args: '{ id } (its lines and panels go with it)',
	run(tx, a) {
		if (a.id === 'L0') throw new Error('The shell layer cannot be removed');
		if (!tx.doc.layers.some((l) => l.id === a.id)) throw new Error('No layer ' + a.id);
		for (const c of tx.doc.curves.filter((c) => c.layer === a.id).map((c) => c.id)) tx.remove('curves', c);
		for (const p of tx.doc.panels.filter((p) => p.layer === a.id).map((p) => p.id)) tx.remove('panels', p);
		tx.remove('layers', a.id);
	},
});

// --- straps ------------------------------------------------------------------------------------------
// A strap is a path line (role strap-path; mirrored by default) plus a width and a fabric. Draw it
// from edge to edge (or across an opening); where it leaves the garment it lies on the skin.

defineCommand('strap.add', {
	label: 'Add strap', args: '{ path: curveId | points: [spec | { at, kind, on }], width? (m, default 0.01), fabric?, colour?, second?, texture?, edge?: elastic|binding|none, mirror?: both|none, layer? (stacking order) }',
	run(tx, a) {
		let path = a.path;
		if (!path) {
			if (!Array.isArray(a.points) || a.points.length < 2) throw new Error('A strap needs a path line or at least two points');
			path = tx.exec({ op: 'curve.add', role: 'strap-path', points: a.points, mirror: a.mirror ?? 'both', name: a.name ?? 'Strap' });
		} else findCurve(tx, path);
		const width = a.width ?? 0.01;
		if (!(width > 0.002 && width < 0.08)) throw new Error('Strap width is in metres, between 0.002 and 0.08');
		if (a.fabric !== undefined) oneOf('fabric', a.fabric, Object.keys(FABRICS));
		const id = tx.newId('s');
		tx.insert('straps', {
			id, path, width, edge: a.edge ?? 'elastic', layer: a.layer ?? tx.doc.straps.length,
			fabric: { fabric: a.fabric ?? 'matte', colour: a.colour ?? '#222222', second: a.second ?? 'Tone-on-tone', ...(a.texture ? { texture: a.texture } : {}) },
		});
		return id;
	},
});

defineCommand('strap.set', {
	label: 'Change strap', args: '{ id, width?, fabric?, colour?, second?, texture?, edge?, layer? }',
	run(tx, a) {
		const s = tx.doc.straps.find((x) => x.id === a.id);
		if (!s) throw new Error('No strap ' + a.id);
		if (a.width !== undefined) tx.set(['straps', a.id, 'width'], a.width);
		if (a.edge !== undefined) { oneOf('edge', a.edge, ['elastic', 'binding', 'none']); tx.set(['straps', a.id, 'edge'], a.edge); }
		if (a.layer !== undefined) tx.set(['straps', a.id, 'layer'], a.layer);
		if (a.fabric !== undefined) oneOf('fabric', a.fabric, Object.keys(FABRICS));
		for (const k of ['fabric', 'colour', 'second', 'texture', 'texMode']) if (a[k] !== undefined) tx.set(['straps', a.id, 'fabric', k], a[k] === null ? undefined : a[k]);
	},
});

defineCommand('strap.remove', {
	label: 'Delete strap', args: '{ id } (its path line goes too when nothing else uses it)',
	run(tx, a) {
		const s = tx.doc.straps.find((x) => x.id === a.id);
		if (!s) throw new Error('No strap ' + a.id);
		tx.remove('straps', a.id);
		const c = tx.doc.curves.find((x) => x.id === s.path);
		if (c && c.role === 'strap-path' && !tx.doc.straps.some((x) => x.path === s.path)) tx.remove('curves', s.path);
	},
});

// --- bands ---------------------------------------------------------------------------------------------
// A band is a panel along an edge: a mock neck or stand collar above a neckline, a cuff below a
// sleeve end. The edge becomes the band's seam and a new edge is drawn `height` further into the
// opening; the strip between them is the band panel (its own fabric).

defineCommand('band.add', {
	label: 'Add band', args: '{ on: edgeCurveId, height? (m; 0.035 neck, 0.02 cuff), fabric?, colour?, second?, name? }',
	run(tx, a) {
		const c = findCurve(tx, a.on);
		if (c.role !== 'edge') throw new Error('A band goes on an edge line (an opening), not a ' + c.role);
		const ctx = ctxOf(tx), surf = ctx.surf, ev = ctx.evaluated?.get(c.id), g = ctx.garment(c.layer ?? 'L0');
		if (!ev || !g) throw new Error('The garment is not built yet');
		const h = a.height ?? (c.name === 'Cuff' ? 0.02 : 0.035);
		const isFabric = (sp) => { const id = panelAt(g, tx.doc, surf, sp); const p = id && tx.doc.panels.find((x) => x.id === id); return !!p && !p.removed; };
		const offset = (si, dist) => {
			const n = ev.pts.length, p = ev.pts[si], t = ev.pts[Math.min(si + 1, n - 1)].clone().sub(ev.pts[Math.max(si - 1, 0)]).normalize();
			const nn = surf.faceNormal(ev.sps[si].f), m = nn.clone().cross(t).normalize();
			const probe = surf.closest(p.clone().addScaledVector(m, 0.004));
			const sign = probe && isFabric(probe) ? -1 : 1; // go into the opening
			return projectNear(surf, p.clone().addScaledVector(m, sign * dist), ev.sps[si].f, {});
		};
		const pts = ev.ctrlIndex.map((si) => ({ sp: toSP(offset(si, h)), kind: 'smooth' }));
		const id = tx.newId('c');
		tx.insert('curves', { id, layer: c.layer ?? 'L0', role: 'edge', name: (c.name || 'Edge') + ' band', closed: c.closed, mirror: c.mirror ?? 'none', shape: { mod: 'none', amp: 0, period: 0 }, points: pts });
		tx.set(['curves', c.id, 'role'], 'seam');
		const seed = toSP(offset(ev.ctrlIndex[0], h / 2));
		const pid = tx.newId('p');
		tx.insert('panels', { id: pid, layer: c.layer ?? 'L0', name: a.name ?? 'Band', seed, mirror: c.mirror === 'both' ? 'both' : 'none', stack: [{ fabric: a.fabric ?? 'matte', colour: a.colour ?? '#222222', second: a.second ?? 'Tone-on-tone' }] });
		// the old edge's finish moves to the band's new edge
		for (const t of tx.doc.trims) if (t.on.includes(c.id)) tx.set(['trims', t.id, 'on'], t.on.map((x) => (x === c.id ? id : x)));
		return { curve: id, panel: pid };
	},
});

// --- hardware ------------------------------------------------------------------------------------------

defineCommand('hardware.add', {
	label: 'Add hardware', args: '{ kind: clear-hook|hook-and-bar|zip-pull, at: spec, angle? (radians from the body horizontal), mirror?: none|both }',
	run(tx, a) {
		oneOf('kind', a.kind, ['clear-hook', 'hook-and-bar', 'zip-pull']);
		const id = tx.newId('h');
		tx.insert('hardware', { id, kind: a.kind, at: toSP(resolvePoint(a.at, ctxOf(tx))), angle: a.angle ?? 0, mirror: a.mirror ?? 'none' });
		return id;
	},
});

defineCommand('hardware.remove', {
	label: 'Delete hardware', args: '{ id }',
	run(tx, a) { if (!tx.doc.hardware.some((h) => h.id === a.id)) throw new Error('No hardware ' + a.id); tx.remove('hardware', a.id); },
});
