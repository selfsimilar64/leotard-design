// Test helpers: load the Genesis 9 bodies from disk (no fetch in node; built locally by
// pipeline/daz/bodies.py, not in git: the tests need them).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMannequins } from '../src/body/mannequin.js';
import { buildReference } from '../src/body/reference.js';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/g9');

let cached = null;
export async function loadBody() {
	if (cached) return cached;
	const man = await loadMannequins(null, async (f, kind) => {
		const b = fs.readFileSync(path.join(DIR, f));
		return kind === 'json' ? JSON.parse(b.toString('utf8')) : b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
	});
	const ref = buildReference(man);
	cached = { man, ref, surf: ref.surface };
	return cached;
}
