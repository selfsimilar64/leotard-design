// Designs saved on the MakeHuman mannequin (no `mesh`) convert to Genesis 9 on load
// (doc/migrate-g9.js): every surface point lands where its MakeHuman point sits on the reference
// body, and the body section takes the new choices.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBody } from './helpers.js';
import { migrate, setSurfaceConverter } from '../src/doc/schema.js';
import { surfaceConverter, MESH, migrateBody } from '../src/doc/migrate-g9.js';
import { bodyKeys } from '../src/body/mannequin.js';
import { buildGarment } from '../src/garment/build.js';

// B2 as saved on the MakeHuman mannequin (app/designs/ holds the converted designs)
const FIXTURE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/b2-makehuman.json');
let B;
beforeAll(async () => { B = await loadBody(); setSurfaceConverter(surfaceConverter(B.man), bodyKeys); }, 120000);

const sps = (doc) => {
	const out = [];
	const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (typeof o.f === 'number' && Array.isArray(o.b)) out.push(o); else Object.values(o).forEach(walk); } };
	walk(doc.curves); walk(doc.panels); walk(doc.placed); walk(doc.straps);
	return out;
};

describe('migrating MakeHuman designs', () => {
	it('moves every surface point to the same place on the reference body', () => {
		const raw = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
		expect(raw.mesh).toBeUndefined();
		const before = sps(raw).map((o) => ({ f: o.f, b: [...o.b] })), { positions: X, index: I } = B.man.migrate;
		const doc = migrate(structuredClone(raw)), after = sps(doc);
		expect(doc.mesh).toBe(MESH);
		expect(after.length).toBe(before.length);
		let worst = 0;
		const dists = [];
		before.forEach((o, k) => {
			const w = [1 - o.b[0] - o.b[1], o.b[0], o.b[1]], p = [0, 0, 0];
			for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) p[d] += w[c] * X[I[o.f * 3 + c] * 3 + d];
			// on the reference body's own surface (the converter's), not the fabric's
			const a = after[k], v = [1 - a.b[0] - a.b[1], a.b[0], a.b[1]], R = B.man.ref, idx = B.man.idx, q = [0, 0, 0];
			for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) q[d] += v[c] * R[idx[a.f * 3 + c] * 3 + d];
			const dd = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
			dists.push(dd); worst = Math.max(worst, dd);
		});
		// the MakeHuman points lie on the Genesis 9 surface to within the wrap's fit (torso 0.4 mm at
		// p99) plus the arms' stance (the wrap's arms were posed in Python, the new ones by Daz)
		dists.sort((a, b) => a - b);
		expect(dists[Math.floor(dists.length * 0.95)]).toBeLessThan(0.003);
		expect(worst).toBeLessThan(0.01);
		// and the converted design still cuts cleanly
		const g = buildGarment(doc, B.surf);
		expect(g.arr.warn).toEqual([]);
		expect(g.seeds.every((s) => s.cell >= 0)).toBe(true);
	});
	it('maps the old body choices', () => {
		expect(migrateBody({ size: 'daz-broad', form: 'headless' }, bodyKeys)).toMatchObject({ size: 'broad', form: 'full', head: 'none' });
		expect(migrateBody({ size: 'fig-kid9-salute', form: 'full' }, bodyKeys)).toMatchObject({ size: 'young', head: 'person' });
		expect(migrateBody({ size: 'teen', form: 'torso' }, bodyKeys)).toMatchObject({ size: 'teen', form: 'torso', head: 'mannequin', expression: 'neutral' });
	});
});
