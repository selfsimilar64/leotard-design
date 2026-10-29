// What a click on the model does (ui/tools.js implements each). 'move' is the default: drag turns
// the model, a click picks a piece or a line, a selected line's points drag. The others are modes
// started from the panel's tab they belong to (and by their key); the view shows a bar with the
// mode's instructions and a way out while one is on (ui/Shell.jsx ModeBar).
export const tools = [
	{ id: 'move', label: 'Select', key: 'V', tab: null },
	{ id: 'pen', label: 'Draw a seam', key: 'P', tab: 'shape' },
	{ id: 'strap', label: 'Draw a strap', key: 'S', tab: 'shape' },
	{ id: 'stones', label: 'Rows and fills', key: 'G', tab: 'sparkle' },
	{ id: 'single', label: 'Single crystals', key: '1', tab: 'sparkle' },
	{ id: 'erase', label: 'Eraser', key: 'D', tab: 'sparkle' },
	{ id: 'decal', label: 'Lettering', key: 'L', tab: 'sparkle' },
	{ id: 'eyedrop', label: 'Match a colour', key: null, tab: 'fabric' },
];
export const toolById = Object.fromEntries(tools.map((t) => [t.id, t]));
