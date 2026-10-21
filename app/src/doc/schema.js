// The design file: authored objects only (everything drawn is rebuilt from these).
// Spec: knowledge/engineering/architecture/design-document-model.md.

import { MESH, migrateBody } from './migrate-g9.js';

export const FORMAT = 'leotard-design';
export const VERSION = 1;

// Sections that hold lists of objects with ids.
export const LISTS = ['layers', 'curves', 'panels', 'straps', 'trims', 'bands', 'decals', 'details', 'hardware', 'stones', 'placed', 'reference'];

export function newDocument(name = 'Untitled') {
	return {
		format: FORMAT, version: VERSION, mesh: MESH,
		meta: { name, author: '', created: new Date().toISOString(), notes: '' },
		ids: {},
		body: { size: 'young', form: 'full', head: 'mannequin', expression: 'neutral', finish: 'Matte white fibreglass', pose: 'a-pose' },
		scene: { rig: 'Arena (ring of small lights)', rotateLights: true, exposure: 1, bloom: 0.18, envRotation: 0, glare: 'plain' },
		// POC-style garment (analytic regions). Set only for the POC's looks; null for app designs.
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
	return doc;
}
