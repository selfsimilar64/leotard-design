// Fabric defaults and retired fabrics (materials/fabric.js): a piece starts at its fabric's texture
// size, and a design that used a fabric taken out of the app opens with a stand-in (doc/schema.js).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FABRICS, RETIRED_FABRICS, RETIRED_SCANS, texScaleOf } from '../src/materials/fabric.js';
import { migrate, newDocument } from '../src/doc/schema.js';

const DESIGNS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../designs');

describe('fabrics', () => {
	it('starts each fabric at its own texture size, and keeps a piece\'s own', () => {
		expect(texScaleOf({ fabric: 'matte' })).toBe(1.85);
		expect(texScaleOf({ fabric: 'liquidholo' })).toBe(3.25);
		expect(texScaleOf({ fabric: 'shiny' })).toBe(1);
		expect(texScaleOf({ fabric: 'matte', texture: 'TX-00004730' })).toBe(4);
		expect(texScaleOf({ fabric: 'mystique', texScale: 1.5 })).toBe(1.5);
	});

	it('maps every retired fabric to one that exists', () => {
		for (const [k, v] of Object.entries(RETIRED_FABRICS)) { expect(FABRICS[k]).toBeUndefined(); expect(FABRICS[v]).toBeDefined(); }
	});

	it('opens a design that used a retired fabric or scan with a stand-in', () => {
		const d = newDocument();
		d.panels = [{ id: 'P1', stack: [{ fabric: 'lace', colour: '#000000' }, { fabric: 'matte', texture: 'TX-00005344', texMode: 'original' }] }];
		d.straps = [{ id: 'S1', fabric: { fabric: 'shattered', colour: '#ffffff' } }];
		migrate(d);
		expect(d.panels[0].stack[0].fabric).toBe('mesh');
		expect(d.panels[0].stack[1]).toEqual({ fabric: 'matte' });
		expect(d.straps[0].fabric.fabric).toBe('hologram');
	});

	it('leaves no saved design on a retired fabric or scan', () => {
		for (const f of fs.readdirSync(DESIGNS).filter((n) => n.endsWith('.json'))) {
			const text = fs.readFileSync(path.join(DESIGNS, f), 'utf8');
			for (const k of Object.keys(RETIRED_FABRICS)) expect(text, f).not.toMatch(new RegExp(`"fabric": ?"${k}"`));
			for (const id of RETIRED_SCANS) expect(text, f).not.toContain(`"texture": "${id}"`);
		}
	});
});
