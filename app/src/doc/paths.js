// Paths into the design document and the three primitive edits every command is made of.
//
// A path is 'curves/c12/points/3/sp' or the same as an array. Inside an array, a segment that is
// all digits is an index; anything else is matched against the elements' `id`. Primitive edits:
//   set(path, value)          replace (or create) the value at path; value undefined deletes it
//   insert(path, item, index) insert into the array at path (index default: the end)
//   remove(path, key)         remove the element (id or index) from the array at path
// Each apply returns its exact inverse, which is how undo works for every command.

export function parsePath(path) {
	if (Array.isArray(path)) return path.map(String);
	return String(path).split('/').filter((s) => s.length);
}

const isIndex = (s) => /^\d+$/.test(s);

function childKey(container, seg) {
	if (Array.isArray(container)) {
		if (isIndex(seg)) return Number(seg);
		const i = container.findIndex((e) => e && e.id === seg);
		return i < 0 ? undefined : i;
	}
	return seg;
}

export function getAt(doc, path) {
	let o = doc;
	for (const seg of parsePath(path)) {
		if (o == null || typeof o !== 'object') return undefined;
		const k = childKey(o, seg);
		if (k === undefined) return undefined;
		o = o[k];
	}
	return o;
}

function parentOf(doc, segs, create) {
	let o = doc;
	for (let i = 0; i < segs.length - 1; i++) {
		const k = childKey(o, segs[i]);
		if (k === undefined || o[k] == null) {
			if (!create || Array.isArray(o)) throw new Error(`No ${segs.slice(0, i + 1).join('/')} in the design`);
			o[k ?? segs[i]] = {};
		}
		o = o[k ?? segs[i]];
		if (typeof o !== 'object') throw new Error(`${segs.slice(0, i + 1).join('/')} is not an object`);
	}
	return o;
}

export const clone = (v) => (v === undefined ? undefined : structuredClone(v));

export function applyPrim(doc, prim) {
	const segs = parsePath(prim.path);
	if (prim.op === 'set') {
		const parent = parentOf(doc, segs, true), last = segs[segs.length - 1];
		let k = childKey(parent, last);
		if (Array.isArray(parent) && k === undefined) throw new Error(`No ${segs.join('/')} in the design`);
		k ??= last;
		const old = parent[k];
		if (prim.value === undefined) { if (Array.isArray(parent)) throw new Error('use remove for array elements'); delete parent[k]; }
		else parent[k] = clone(prim.value);
		return { op: 'set', path: segs, value: clone(old) };
	}
	const arr = getAt(doc, segs);
	if (!Array.isArray(arr)) throw new Error(`${segs.join('/')} is not a list`);
	if (prim.op === 'insert') {
		const i = prim.index ?? arr.length;
		if (prim.item && prim.item.id !== undefined && arr.some((e) => e && e.id === prim.item.id)) throw new Error(`${prim.item.id} already exists in ${segs.join('/')}`);
		arr.splice(i, 0, clone(prim.item));
		return { op: 'remove', path: segs, key: prim.item?.id ?? String(i) };
	}
	if (prim.op === 'remove') {
		const i = childKey(arr, String(prim.key));
		if (i === undefined || i >= arr.length) throw new Error(`No ${prim.key} in ${segs.join('/')}`);
		const [old] = arr.splice(i, 1);
		return { op: 'insert', path: segs, item: old, index: i };
	}
	throw new Error(`Unknown primitive ${prim.op}`);
}

// Top-level section a path touches ('curves', 'body', ...): what the engine rebuilds from.
export const sectionOf = (path) => parsePath(path)[0];
