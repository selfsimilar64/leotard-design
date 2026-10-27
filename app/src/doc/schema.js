// The design file: authored objects only (everything drawn is rebuilt from these).
// Spec: knowledge/engineering/architecture/design-document-model.md.

import { MESH, migrateBody } from './migrate-g9.js';
import { RETIRED_FABRICS, RETIRED_SCANS } from '../materials/fabric.js';
import { RIGS, DEFAULT_RIG } from '../render/presets.js';

export const FORMAT = 'leotard-design';
export const VERSION = 1;

// Sections that hold lists of objects with ids.
export const LISTS = ['layers', 'curves', 'panels', 'straps', 'trims', 'bands', 'decals', 'details', 'hardware', 'stones', 'placed', 'reference'];

export function newDocument(name = 'Untitled') {
	return {
		format: FORMAT, version: VERSION, mesh: MESH,
		meta: { name, author: '', created: new Date().toISOString(), notes: '' },
		ids: {},
		// the mannequin appearance (render/presets.js APPEARANCES): the default since 2026-10-26 (owner),
		// the realistic person being the final check of how it looks on a gymnast
		body: { size: 'young', form: 'full', head: 'none', expression: 'neutral', finish: 'Matte white fibreglass', headFinish: 'Matte white fibreglass', pose: 'a-pose' },
		scene: { rig: DEFAULT_RIG, exposure: 1, bloom: 0.18, envRotation: 0, glare: 'plain' },
		// first-generation garment (analytic regions, garment/legacy.js), kept so old files open;
		// null for every design made with the cut-and-sew tools
		legacy: null,
		layers: [{ id: 'L0', kind: 'shell', z: 0 }],
		curves: [], panels: [], straps: [], trims: [], bands: [], decals: [], details: [], hardware: [],
		stones: [], placed: [], reference: [],
		locks: {},
	};
}

// Surface points of designs saved on the MakeHuman mannequin are converted once the bodies are
// loaded (doc/migrate-g9.js; set by App.attach). Until then such a design keeps no `mesh` field.
let convertSurface = null, knownBodies = [];
export function setSurfaceConverter(fn, bodyKeys) { convertSurface = fn; knownBodies = bodyKeys; }

export function migrate(doc) {
	if (!doc || doc.format !== FORMAT) throw new Error('Not a leotard design file');
	if (doc.version > VERSION) throw new Error(`Design file version ${doc.version} is newer than this app (${VERSION})`);
	const old = doc.mesh !== MESH, hadBody = !!doc.body;
	const base = newDocument();
	for (const k of Object.keys(base)) if (k !== 'mesh' && doc[k] === undefined) doc[k] = base[k];
	for (const k of LISTS) if (!Array.isArray(doc[k])) doc[k] = [];
	doc.body = migrateBody(hadBody ? doc.body : base.body, knownBodies);
	if (old && convertSurface) { convertSurface(doc); doc.mesh = MESH; }
	retireFabrics(doc);
	// lighting rigs taken out of the app (render/presets.js RIGS): the design opens in the default studio
	if (!RIGS[doc.scene.rig]) doc.scene.rig = DEFAULT_RIG;
	delete doc.scene.rotateLights; // only the removed light rigs could circle
	return doc;
}

// Fabrics taken out of the app (materials/fabric.js RETIRED_FABRICS, RETIRED_SCANS): wherever a look
// names one (panel stacks, straps, finished edges, the legacy zones), it shows its stand-in fabric, or
// for a retired scan its base fabric.
function retireFabrics(o) {
	if (Array.isArray(o)) { o.forEach(retireFabrics); return; }
	if (!o || typeof o !== 'object') return;
	if (typeof o.fabric === 'string' && RETIRED_FABRICS[o.fabric]) o.fabric = RETIRED_FABRICS[o.fabric];
	if (RETIRED_SCANS.has(o.texture)) { delete o.texture; delete o.texMode; delete o.masks; delete o.texScale; }
	for (const k in o) retireFabrics(o[k]);
}
