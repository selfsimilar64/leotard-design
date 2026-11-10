// Starting points: simple whole leotards a designer begins from, each a recipe of block elements,
// materials and (at most) one stone treatment, in the vocabulary the moodboard uses most (the
// counts are in knowledge/domain/moodboard/common-patterns.md). They replace the leotard only;
// the model and the scene stay. The moodboard rebuilds (designs/b*.json) remain the showcase.
// Applied by the start.apply command (doc/commands-garment.js); pictures in public/thumbs/starts.
export const STARTS = [
	{
		key: 'plain-tank', label: 'Plain tank', hint: 'Crew neck, closed back, a gradient front and a solid back; no stones',
		block: { neck: 'crew', back: 'crew', sleeves: 'tank', leg: 'high', yoke: 'none', waist: 'none' },
		fabric: { fabric: 'matte', colour: '#16205c' },
		panels: { front: { colour: '#1b3fb5', ombre: { colour: '#16205c', axis: [0, 1, 0], start: 1.3, end: 0.85 } } },
	},
	{
		key: 'mesh-yoke-tank', label: 'Mesh yoke tank', hint: 'Sweetheart mesh yoke, a waist seam and a shinier brief in one colour',
		block: { neck: 'crew', back: 'scoop', sleeves: 'tank', leg: 'high', yoke: 'sweetheart', waist: 'straight' },
		fabric: { fabric: 'matte', colour: '#0b7d7a' },
		panels: { yoke: { fabric: 'mesh', colour: '#0b7d7a', sheer: 0.35 }, lower: { fabric: 'wet', colour: '#0b7d7a' } },
	},
	{
		key: 'long-sleeve-illusion', label: 'Long-sleeve illusion', hint: 'The most common competition leotard: mesh yoke and sleeves, keyhole back, stones fading from the yoke',
		block: { neck: 'crew', back: 'keyhole', sleeves: 'long', armhole: 'raglan', leg: 'high', yoke: 'sweetheart', waist: 'none' },
		fabric: { fabric: 'mystique', colour: '#16205c' },
		panels: { yoke: { fabric: 'mesh', colour: '#16205c', sheer: 0.35 }, sleeve: { fabric: 'mesh', colour: '#16205c', sheer: 0.35 } },
		stones: [{ kind: 'scatter', on: { panel: 'front' }, params: { from: { curve: 'yoke' }, near: 0.9, far: 0, distance: 0.14, sizes: [{ size: 'ss12', weight: 1 }, { size: 'ss8', weight: 2 }] }, name: 'Fade from the yoke' }],
	},
	{
		key: 'mock-neck-chevron', label: 'Mock neck, chevron waist', hint: 'High neck, 3/4 mesh sleeves, a chevron waist seam with a stone row, a dark brief',
		block: { neck: 'high', back: 'keyhole', sleeves: 'three-quarter', armhole: 'raglan', leg: 'high', yoke: 'none', waist: 'v' },
		fabric: { fabric: 'shiny', colour: '#5b2a86' },
		panels: { lower: { fabric: 'wet', colour: '#0c0c10' }, sleeve: { fabric: 'mesh', colour: '#5b2a86', sheer: 0.35 } },
		stones: [{ kind: 'row', on: { curve: 'waist' }, params: { size: 'ss12', rows: 2, offset: 0.005, gap: 1.25 }, name: 'Waist rows' }],
	},
	{
		key: 'ombre-long-sleeve', label: 'Ombré long sleeve', hint: 'A front fading to black at the hips, black mesh sleeves, keyhole back; no stones',
		block: { neck: 'crew', back: 'keyhole', sleeves: 'long', armhole: 'set-in', leg: 'high', yoke: 'none', waist: 'none' },
		fabric: { fabric: 'matte', colour: '#0c0c10' },
		panels: { front: { colour: '#ff4f8b', ombre: { colour: '#0c0c10', axis: [0, 1, 0], start: 1.3, end: 0.9 } }, sleeve: { fabric: 'mesh', colour: '#0c0c10', sheer: 0.35 } },
	},
	{
		key: 'open-back', label: 'Open back', hint: 'Scoop neck, open back, competition leg, one satin colour; no stones',
		block: { neck: 'scoop', back: 'open', sleeves: 'tank', leg: 'competition', yoke: 'none', waist: 'none' },
		fabric: { fabric: 'shiny', colour: '#b3122e' },
	},
	// Fitted garments (garment/fitted.js): a textbook-drafted block, sewn and fitted by the fit solver, shown in place of
	// the drawn pieces. The block below only names the panels (Front, Back, Sleeve) that dress it.
	{
		key: 'fitted-textbook-high', label: 'Fitted: textbook, high cut', hint: 'The same textbook block with its high-cut leg, fitted by simulation',
		block: { neck: 'crew', back: 'crew', sleeves: 'long', armhole: 'set-in', leg: 'high', yoke: 'none', waist: 'none' },
		fabric: { fabric: 'shiny', colour: '#b3122e' }, fitted: 'armstrong-6-high',
	},
	{
		key: 'fitted-hybrid-high', label: 'Fitted: hybrid, high cut', hint: 'The hybrid block with its high-cut leg, fitted by simulation',
		block: { neck: 'crew', back: 'crew', sleeves: 'long', armhole: 'set-in', leg: 'high', yoke: 'none', waist: 'none' },
		fabric: { fabric: 'shiny', colour: '#c4632a' }, fitted: 'hybrid-6-high',
	},
];
export const DEFAULT_START = 'plain-tank';
