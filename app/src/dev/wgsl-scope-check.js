// Finds the TSL pitfall behind the WebGPU port's two worst bugs (knowledge/engineering/rendering/webgpu-port.md): a shared value
// is written into its variable once, at its first use, and that first use sits inside a branch, so a read outside the branch sees
// whatever the variable held (zero) whenever the branch did not run. Scans generated WGSL: for every function-scope variable
// (nodeVarN and three's named private vars), the blocks that write it and the places that read it; reports reads that no write
// before them covers (a write covers a read when the read lies inside the write's block, after it).
// In the console of a WebGPU page: (await import('/src/dev/wgsl-scope-check.js')).checkObject(mesh), or checkWGSL(text).

// -> [{ fn, name, readLine, read, writes: [lines] }] (lines count from the function's 'fn', 0-based), every function checked
export function checkWGSL(wgsl) {
	const starts = [...wgsl.matchAll(/^fn (\w+)/gm)];
	return starts.flatMap((m, k) => checkFn(wgsl, wgsl.slice(m.index, starts[k + 1]?.index ?? wgsl.length)).map((r) => ({ fn: m[1], ...r })));
}

function checkFn(wgsl, body) {
	const lines = body.split('\n');
	// block of each line: the chain of block ids enclosing it
	const chain = [], id = { n: 0 }, at = [];
	for (const l of lines) {
		at.push(chain.slice());
		for (const ch of l) { if (ch === '{') chain.push(++id.n); else if (ch === '}') chain.pop(); }
	}
	// a write's block is the chain at its line; a read at line j is covered by a write at line i < j whose chain is a prefix of j's
	const writes = new Map(), out = [];
	const isPrefix = (a, b) => a.length <= b.length && a.every((x, k) => x === b[k]);
	const declared = new Set((wgsl.match(/var(?:<private>)?\s+(\w+)\s*:/g) ?? []).map((s) => s.replace(/var(?:<private>)?\s+|\s*:/g, '')));
	lines.forEach((l, j) => {
		const w = l.match(/^\s*(\w+)(?:\.\w+)?\s*=(?!=)/);
		const lhs = w ? w[1] : null;
		const rhs = w ? l.slice(l.indexOf('=') + 1) : l;
		for (const m of rhs.matchAll(/\b(nodeVar\d+|[A-Za-z]\w*)\b/g)) {
			const n = m[1];
			if (!declared.has(n) || !writes.has(n)) continue;
			const ws = writes.get(n).filter((i) => i < j);
			if (ws.some((i) => isPrefix(at[i], at[j]))) continue;
			// an if / else (TSL lowers select this way) writing it in two sibling blocks under a block that encloses the read
			const sib = new Map();
			for (const i of ws) {
				const c = at[i];
				for (let d = 0; d < c.length; d++) {
					const parent = c.slice(0, d);
					if (!isPrefix(parent, at[j])) break;
					const k = parent.join(','), set = sib.get(k) ?? new Set();
					set.add(c[d]); sib.set(k, set);
				}
			}
			if ([...sib.values()].some((s) => s.size >= 2)) continue;
			out.push({ name: n, readLine: j, read: l.trim().slice(0, 140), writes: writes.get(n).slice(0, 4) });
		}
		if (lhs && declared.has(lhs)) { if (!writes.has(lhs)) writes.set(lhs, []); writes.get(lhs).push(j); }
	});
	// one report per variable
	const seen = new Set();
	return out.filter((r) => (seen.has(r.name) ? false : seen.add(r.name)));
}

// The fragment and vertex shaders of a mesh as the WebGPU renderer builds them, checked.
export async function checkObject(mesh, viewport = window.app.engine.viewport) {
	const s = await viewport.renderer.debug.getShaderAsync(viewport.scene, viewport.camera, mesh);
	return { fragment: checkWGSL(s.fragmentShader), vertex: checkWGSL(s.vertexShader) };
}
