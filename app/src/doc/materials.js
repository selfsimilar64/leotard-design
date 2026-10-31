// Materials: the fabrics a design is made from, one record per fabric bought (doc.materials). A
// piece, a strap or a coloured edge finish names one, so changing a material changes everything cut
// from it, and the design's bill of fabrics is this list.
//
// Each user also keeps a copy of the look (a panel's stack entry, a strap's or trim's fabric), which
// is what the renderer and the pattern read. The material is the source of truth and every write
// goes through setLook below, which updates the material and all its users in one transaction; a
// test (test/materials.test.js) holds them equal. A piece's own grain, gradient and print stay on the
// piece: they depend on where it sits, not on what was bought.
// Decision: knowledge/decisions/2026-10-31-construction-mirrors-real-sewing.md.
import { FABRICS } from '../materials/fabric.js';

// What makes two pieces of cloth the same fabric. Also the fields commands-garment.js setStackFields
// routes to the material, and that render/rims.js carries onto a finished edge.
export const LOOK = ['fabric', 'colour', 'second', 'colour2', 'effect', 'rainbow', 'satin', 'sheer', 'texture', 'texMode', 'texScale', 'texNormal', 'masks'];

export const lookOf = (o) => { const out = {}; for (const k of LOOK) if (o?.[k] !== undefined) out[k] = structuredClone(o[k]); return out; };
const keyOf = (o) => JSON.stringify(LOOK.map((k) => (k === 'colour' || k === 'colour2' ? o?.[k]?.toLowerCase?.() : k === 'second' ? o?.[k] ?? 'Tone-on-tone' : o?.[k]) ?? null));

// Every look in the document that can name a material: [path to it, the look]. Openings are no fabric.
export function lookHolders(doc) {
	const out = [];
	for (const p of doc.panels) if (!p.removed && p.stack?.[0]) out.push([['panels', p.id, 'stack', '0'], p.stack[0], 'piece']);
	for (const s of doc.straps) if (s.fabric) out.push([['straps', s.id, 'fabric'], s.fabric, 'strap']);
	for (const t of doc.trims) if (t.fabric) out.push([['trims', t.id, 'fabric'], t.fabric, 'finish']);
	return out;
}

const fabricName = (f) => (FABRICS[f]?.label ?? f ?? 'Fabric').replace(/ \(.*\)$/, '');
export function freshName(doc, base) {
	const taken = new Set(doc.materials.map((m) => m.name));
	if (!taken.has(base)) return base;
	for (let i = 2; ; i++) if (!taken.has(`${base} ${i}`)) return `${base} ${i}`;
}

// How many pieces, straps and finishes use each material: Map(id -> { piece, strap, finish, all }).
export function usage(doc) {
	const out = new Map(doc.materials.map((m) => [m.id, { piece: 0, strap: 0, finish: 0, all: 0 }]));
	for (const [, look, kind] of lookHolders(doc)) { const u = out.get(look.material); if (u) { u[kind]++; u.all++; } }
	return out;
}

// Opening a design from before materials: identical looks become one material; a look naming a
// material takes that material's values.
export function migrateMaterials(doc) {
	doc.materials ??= [];
	const byId = new Map(doc.materials.map((m) => [m.id, m])), byKey = new Map(doc.materials.map((m) => [keyOf(m), m]));
	let n = doc.ids.m ?? 1;
	for (const [, look] of lookHolders(doc)) {
		const m = byId.get(look.material);
		if (m) { for (const k of LOOK) { if (m[k] === undefined) delete look[k]; else look[k] = structuredClone(m[k]); } continue; }
		delete look.material;
		let found = byKey.get(keyOf(look));
		if (!found) {
			while (byId.has('m' + n)) n++;
			found = { id: 'm' + n++, name: freshName(doc, fabricName(look.fabric)), ...lookOf(look) };
			doc.materials.push(found); byId.set(found.id, found); byKey.set(keyOf(found), found);
		}
		look.material = found.id;
	}
	doc.ids.m = n;
}

// Inside a transaction: anything new that has a look but no material gets one (the same material as
// an identical look, else a new one). Run by the store after every command (doc/store.js).
export function adoptLooks(tx) {
	for (const [path, look] of lookHolders(tx.doc)) {
		if (look.material && tx.doc.materials.some((m) => m.id === look.material)) continue;
		const key = keyOf(look);
		let m = tx.doc.materials.find((x) => keyOf(x) === key);
		if (!m) { m = { id: tx.newId('m'), name: freshName(tx.doc, fabricName(look.fabric)), ...lookOf(look) }; tx.insert('materials', m); }
		tx.set([...path, 'material'], m.id);
	}
}

// Change a material and every look cut from it. patch: LOOK fields; null clears one.
export function setLook(tx, id, patch) {
	for (const k of LOOK) {
		if (patch[k] === undefined) continue;
		const v = patch[k] === null ? undefined : patch[k];
		tx.set(['materials', id, k], v);
		for (const [path, look] of lookHolders(tx.doc)) if (look.material === id) tx.set([...path, k], v);
	}
}

// Point a look at a material: it takes all the material's values.
export function assign(tx, path, id) {
	const m = tx.doc.materials.find((x) => x.id === id);
	if (!m) throw new Error('No material ' + id);
	for (const k of LOOK) tx.set([...path, k], m[k]);
	tx.set([...path, 'material'], id);
}

// '#abc', 'abc', '#aabbcc' or 'aabbcc' -> '#aabbcc'; anything else -> null.
export function parseHex(s) {
	const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim());
	if (!m) return null;
	const h = m[1].toLowerCase();
	return '#' + (h.length === 3 ? [...h].map((x) => x + x).join('') : h);
}
