// Designs saved before the move to Genesis 9 (no `mesh` field) anchor their lines, stones and decals
// to the MakeHuman mannequin's triangles: surface points { f, b: [b1, b2] }. Each is converted once,
// on load, to the same anatomical spot on the canonical Genesis 9 mesh: the MakeHuman vertices'
// positions on the reference body (migrate.bin, pipeline/daz/convert_bodies.py, through the same
// correspondence the Daz bodies were fitted with) give the point, the closest point of the
// reference body gives the new surface point. The body section's old keys map to the new choices.
import * as THREE from 'three';
import { Surface, toSP } from '../body/surface.js';

export const MESH = 'g9-sd1';

// Old body keys -> body types (body/mannequin.js manifest).
const SIZES = { 'daz-petite': 'petite', 'daz-young': 'young', 'daz-adult': 'adult', 'daz-broad': 'broad' };

// The body section of any saved design -> { size, form, head, expression, pose, finish, headFinish }.
export function migrateBody(b, bodyKeys = []) {
	const out = { ...b };
	if (out.form === 'headless') { out.form = 'full'; out.head ??= 'none'; }
	if (typeof out.size === 'string' && out.size.startsWith('fig-')) { out.size = 'young'; out.head ??= 'person'; out.finish = 'Realistic skin (Daz)'; }
	out.size = SIZES[out.size] ?? out.size;
	if (bodyKeys.length && !bodyKeys.includes(out.size)) out.size = 'young';
	out.head ??= 'mannequin';
	out.expression ??= 'neutral';
	// before body and head finishes were separate the mannequin head wore the body's finish
	if (!out.headFinish) out.headFinish = out.finish && !/^Realistic/.test(out.finish) && !/^Linen/.test(out.finish) ? out.finish : 'Matte white fibreglass';
	return out;
}

// -> fn(doc): converts the doc's surface points in place (man: the loaded mannequin).
export function surfaceConverter(man) {
	if (!man.migrate) return null;
	const { positions: X, index: I } = man.migrate;
	let base = null; // the reference body's own surface (not the fabric's), built on first use
	const p = new THREE.Vector3();
	const convert = (o) => {
		const b1 = o.b[0], b2 = o.b[1], b0 = 1 - b1 - b2, f = o.f * 3;
		p.set(0, 0, 0);
		for (const [k, w] of [[I[f], b0], [I[f + 1], b1], [I[f + 2], b2]]) p.x += w * X[k * 3], p.y += w * X[k * 3 + 1], p.z += w * X[k * 3 + 2];
		base ??= new Surface(man.idx, man.ref);
		const r = base.closest(p);
		const s = toSP(r);
		o.f = s.f; o.b = s.b;
	};
	const walk = (o) => {
		if (Array.isArray(o)) { for (const v of o) walk(v); return; }
		if (!o || typeof o !== 'object') return;
		if (typeof o.f === 'number' && Array.isArray(o.b) && o.b.length === 2) { convert(o); return; }
		for (const v of Object.values(o)) walk(v);
	};
	return (doc) => {
		for (const [k, v] of Object.entries(doc)) if (k !== 'meta' && k !== 'body' && k !== 'scene') walk(v);
	};
}
