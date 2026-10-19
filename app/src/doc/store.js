// The design document, its history and the command bus.
//
// Every change goes through exec(): a command { op, ...args } names a registered handler, the
// handler edits the document through a transaction (tx.set / tx.insert / tx.remove), and the
// transaction's primitive edits and their inverses become one history entry. Undo applies the
// inverses backwards; redo re-applies the primitives. A list of commands runs as one undo step.
// Commands that carry the same `gesture` id (a drag) coalesce into a single entry.
import { applyPrim, clone, getAt, parsePath, sectionOf } from './paths.js';
import { migrate } from './schema.js';

const COMMANDS = new Map();

// def = { label, run(tx, args) -> result }. Throw from run() to refuse; nothing is applied.
export function defineCommand(op, def) {
	if (COMMANDS.has(op)) throw new Error(`Command ${op} defined twice`);
	COMMANDS.set(op, def);
}
export const commandList = () => [...COMMANDS.entries()].map(([op, d]) => ({ op, label: d.label, args: d.args ?? '' }));

class Transaction {
	constructor(store) { this.store = store; this.doc = store.doc; this.prims = []; this.inv = []; this.touched = new Set(); this.after = []; }
	_apply(prim) {
		const inv = applyPrim(this.doc, prim);
		this.prims.push(clone(prim)); this.inv.push(inv);
		this.touched.add(sectionOf(prim.path));
		return inv;
	}
	get(path) { return getAt(this.doc, path); }
	set(path, value) { const old = getAt(this.doc, path); if (JSON.stringify(old) === JSON.stringify(value)) return; this._apply({ op: 'set', path: parsePath(path), value }); }
	insert(path, item, index) { this._apply({ op: 'insert', path: parsePath(path), item, index }); return item; }
	remove(path, key) { this._apply({ op: 'remove', path: parsePath(path), key: String(key) }); }
	// Fresh id with a prefix ('c' -> 'c7'). The counter lives in the document, so redo and a
	// reloaded file hand out the same ids.
	newId(prefix) {
		let n = this.doc.ids?.[prefix] ?? 1;
		const taken = (id) => JSON.stringify(this.doc).includes(`"id":"${id}"`);
		while (taken(prefix + n)) n++;
		this.set(['ids', prefix], n + 1);
		return prefix + n;
	}
	exec(cmd) { return this.store._run(this, cmd); }
	// Work to run after the transaction commits (derived-data hooks that emit more commands).
	defer(fn) { this.after.push(fn); }
	rollback() { for (let i = this.inv.length - 1; i >= 0; i--) applyPrim(this.doc, this.inv[i]); }
}

export class DocumentStore {
	constructor(doc) {
		this.doc = migrate(doc);
		this.undoStack = []; this.redoStack = [];
		this.listeners = new Set();
		this.revision = 0;
		this.hooks = []; // (tx, touched) => void, run inside every transaction before commit
	}
	onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
	_emit(touched, why) {
		this.revision++;
		for (const fn of this.listeners) fn(touched, why);
	}

	_run(tx, cmd) {
		if (!cmd || typeof cmd !== 'object') throw new Error('A command is an object { op, ... }');
		if (Array.isArray(cmd)) return cmd.map((c) => this._run(tx, c));
		const def = COMMANDS.get(cmd.op);
		if (!def) throw new Error(`Unknown command "${cmd.op}". app.commands() lists them.`);
		return def.run(tx, cmd);
	}

	exec(cmd, opts = {}) {
		const tx = new Transaction(this);
		let result;
		try {
			result = this._run(tx, cmd);
			for (const h of this.hooks) h(tx, tx.touched);
		} catch (e) {
			tx.rollback();
			throw e;
		}
		if (!tx.prims.length) return result;
		const first = Array.isArray(cmd) ? cmd[0] : cmd;
		const label = opts.label ?? (Array.isArray(cmd) && cmd.length > 1 ? `${COMMANDS.get(first.op)?.label ?? first.op} (+${cmd.length - 1})` : COMMANDS.get(first.op)?.label ?? first.op);
		const gesture = first.gesture;
		const top = this.undoStack[this.undoStack.length - 1];
		if (gesture && top && top.gesture === gesture) mergeInto(top, tx);
		else this.undoStack.push({ label, cmd: clone(cmd), prims: tx.prims, inv: tx.inv, touched: [...tx.touched], gesture, time: Date.now() });
		if (this.undoStack.length > 500) this.undoStack.shift();
		this.redoStack.length = 0;
		this._emit(tx.touched, 'exec');
		for (const fn of tx.after) fn();
		return result;
	}

	undo() {
		const e = this.undoStack.pop();
		if (!e) return false;
		for (let i = e.inv.length - 1; i >= 0; i--) applyPrim(this.doc, e.inv[i]);
		this.redoStack.push(e);
		this._emit(new Set(e.touched), 'undo');
		return e.label;
	}
	redo() {
		const e = this.redoStack.pop();
		if (!e) return false;
		for (const p of e.prims) applyPrim(this.doc, p);
		this.undoStack.push(e);
		this._emit(new Set(e.touched), 'redo');
		return e.label;
	}
	// End a gesture: the next command with the same gesture id starts a new entry.
	endGesture() { const top = this.undoStack[this.undoStack.length - 1]; if (top) top.gesture = undefined; }

	load(doc) {
		this.doc = migrate(clone(doc));
		this.undoStack.length = 0; this.redoStack.length = 0;
		this._emit(new Set(Object.keys(this.doc)), 'load');
	}
	snapshot() { return clone(this.doc); }
}

// Merge a transaction into the history entry of the same gesture: one inverse per path (the
// oldest), one primitive per path (the newest).
function mergeInto(entry, tx) {
	const key = (p) => p.op + ':' + p.path.join('/');
	tx.prims.forEach((p, i) => {
		if (p.op === 'set') {
			const k = key(p), j = entry.prims.findIndex((q) => key(q) === k);
			if (j >= 0) { entry.prims[j] = p; return; }
		}
		entry.prims.push(p); entry.inv.push(tx.inv[i]);
	});
	for (const t of tx.touched) if (!entry.touched.includes(t)) entry.touched.push(t);
	entry.time = Date.now();
}
