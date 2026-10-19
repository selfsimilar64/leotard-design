// The design file: authored objects only (everything drawn is rebuilt from these).
// Spec: knowledge/engineering/architecture/design-document-model.md.

export const FORMAT = 'leotard-design';
export const VERSION = 1;

// Sections that hold lists of objects with ids.
export const LISTS = ['layers', 'curves', 'panels', 'straps', 'trims', 'bands', 'decals', 'details', 'hardware', 'stones', 'placed', 'reference'];

export function newDocument(name = 'Untitled') {
	return {
		format: FORMAT, version: VERSION,
		meta: { name, author: '', created: new Date().toISOString(), notes: '' },
		ids: {},
		body: { size: 'young', form: 'full', finish: 'Matte white fibreglass', pose: 'a-pose' },
		scene: { rig: 'Arena (ring of small lights)', rotateLights: true, exposure: 1, bloom: 0.18, envRotation: 0, glare: 'plain' },
		// POC-style garment (analytic regions). Set only for the POC's looks; null for app designs.
		legacy: null,
		layers: [{ id: 'L0', kind: 'shell', z: 0 }],
		curves: [], panels: [], straps: [], trims: [], bands: [], decals: [], details: [], hardware: [],
		stones: [], placed: [], reference: [],
		locks: {},
	};
}

export function migrate(doc) {
	if (!doc || doc.format !== FORMAT) throw new Error('Not a leotard design file');
	if (doc.version > VERSION) throw new Error(`Design file version ${doc.version} is newer than this app (${VERSION})`);
	const base = newDocument();
	for (const k of Object.keys(base)) if (doc[k] === undefined) doc[k] = base[k];
	for (const k of LISTS) if (!Array.isArray(doc[k])) doc[k] = [];
	return doc;
}
