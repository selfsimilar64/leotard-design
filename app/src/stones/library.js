// Stone library: sizes (ss to millimetres), shapes, colours and coatings, as the trade names them.
// Sources: knowledge/domain/embellishments/stone-sizes.md, stone-shapes.md, stone-colour-libraries.md.

// Nominal diameters for the app (mm), the "app" row of the ss table.
export const SS = { 3: 1.4, 4: 1.6, 5: 1.8, 6: 2.0, 8: 2.4, 10: 2.8, 12: 3.1, 14: 3.5, 16: 3.9, 20: 4.7, 24: 5.3, 30: 6.4, 34: 7.2, 40: 8.5, 48: 11.1 };

// Size from 'ss16' / 16 / { mm: 5 } / a number in metres (< 0.05) -> metres
export function sizeOf(s) {
	if (typeof s === 'number') return s < 0.05 ? s : (SS[s] ?? s) / 1000;
	if (typeof s === 'string') {
		const m = s.match(/^ss(\d+)$/i);
		if (m) { const d = SS[+m[1]]; if (!d) throw new Error('Unknown size ' + s + '. Sizes: ' + Object.keys(SS).map((k) => 'ss' + k).join(', ')); return d / 1000; }
		const mm = s.match(/^([\d.]+)\s*mm$/i);
		if (mm) return +mm[1] / 1000;
	}
	if (s && s.mm) return s.mm / 1000;
	throw new Error('A stone size is ss3..ss48, "5mm" or metres');
}

// Shapes: outline aspect (length / width) and the render family.
export const SHAPES = {
	round: { aspect: 1, family: 'crystal' }, rivoli: { aspect: 1, family: 'crystal', deep: true },
	oval: { aspect: 1.4, family: 'crystal' }, navette: { aspect: 2, family: 'crystal' }, pear: { aspect: 1.5, family: 'crystal' },
	drop: { aspect: 1.65, family: 'crystal' }, heart: { aspect: 1, family: 'crystal' }, square: { aspect: 1, family: 'crystal' },
	baguette: { aspect: 3, family: 'crystal' }, triangle: { aspect: 1, family: 'crystal' }, star: { aspect: 1, family: 'crystal' },
	pearl: { aspect: 1, family: 'pearl' }, spangle: { aspect: 1, family: 'spangle' }, 'holo-dot': { aspect: 1, family: 'holo-dot' },
	nailhead: { aspect: 1, family: 'nailhead' },
};

// Glass colours (linear-ish sRGB hex tints).
export const COLOURS = {
	Crystal: '#ffffff', Jet: '#16161d', 'Black Diamond': '#5d6069', Graphite: '#4a4e57',
	Sapphire: '#1d3aa3', 'Light Sapphire': '#6e9fe3', 'Capri Blue': '#14649e', 'Montana': '#2c3f78', Aquamarine: '#8ad6ea', 'Blue Zircon': '#2b9ed0', 'Light Turquoise': '#5fd1c9',
	Emerald: '#0c8c4c', Peridot: '#93d24f', 'Erinite': '#1bb08c', Chrysolite: '#a4c95e', 'Fern Green': '#3c8a2a',
	Ruby: '#a9102c', Siam: '#a00d22', 'Light Siam': '#cc2541', Scarlet: '#c4172d', Fuchsia: '#d6217c', Rose: '#f08aa8', 'Light Rose': '#f8b8c9', 'Indian Pink': '#e25a8e',
	Amethyst: '#8a4fbf', 'Light Amethyst': '#b994d9', Tanzanite: '#6c5ad1', 'Purple Velvet': '#5b2268', 'Provence Lavender': '#b6a3e0',
	Topaz: '#d78b22', 'Light Topaz': '#e9b04d', 'Light Colorado Topaz': '#c79c63', Citrine: '#f2c41c', Jonquil: '#f6dc6a', Sunflower: '#f3b21c', Tangerine: '#f0682a', Hyacinth: '#e2552a',
	'Light Peach': '#f2c6a4', Silk: '#efd6c4', 'White Opal': '#f4f3f0', 'Pacific Opal': '#9fd2e6', 'Rose Water Opal': '#f4cbd0',
	Gold: '#ffc552', Silver: '#e8eaee', 'Rose Gold': '#f1b29a', Hematite: '#7a7e88',
};

// Coatings: ab (rainbow facets), shimmer (soft rainbow), metallic (mirror coat, opaque),
// opal (milky, glowing), none.
export const COATINGS = ['none', 'ab', 'shimmer', 'metallic', 'opal'];

// 'Crystal AB', 'Sapphire Shimmer', 'Jet Hematite', 'Gold' (metal), 'Pacific Opal' ->
// { colour: '#hex', coating, name }
export function parseStone(name = 'Crystal') {
	let n = String(name).trim(), coating = 'none';
	const suffix = [[/\s+AB$/i, 'ab'], [/\s+Shimmer$/i, 'shimmer'], [/\s+Hematite$/i, 'metallic'], [/\s+Metallic$/i, 'metallic']];
	for (const [re, c] of suffix) if (re.test(n)) { coating = c; n = n.replace(re, ''); break; }
	if (/Opal$/.test(n)) coating = 'opal';
	if (['Gold', 'Silver', 'Rose Gold', 'Hematite'].includes(n)) coating = 'metallic';
	if (/^#[0-9a-f]{6}$/i.test(n)) return { colour: n, coating, name };
	const colour = COLOURS[n];
	if (!colour) throw new Error('Unknown stone colour "' + n + '". Colours: ' + Object.keys(COLOURS).join(', ') + ' (add AB, Shimmer or Hematite)');
	return { colour, coating, name };
}
