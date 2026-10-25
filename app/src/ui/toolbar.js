// The tool rail. Each entry is one interaction mode of the viewport (ui/tools.js implements them).
// Move does what a designer does most: turn the model, click a piece or a line, drag a point.
export const tools = [
	{ id: 'move', label: 'Move', icon: '⬤', key: 'V' },
	{ id: 'pen', label: 'Draw line', icon: '✎', key: 'P' },
	{ id: 'strap', label: 'Strap', icon: '⌇', key: 'S' },
	{ sep: 1 },
	{ id: 'stones', label: 'Stones', icon: '✦', key: 'G' },
	{ id: 'single', label: 'One stone', icon: '•', key: '1' },
	{ id: 'erase', label: 'Eraser', icon: '⌫', key: 'D' },
	{ sep: 2 },
	{ id: 'decal', label: 'Logo / text', icon: 'A', key: 'L' },
];
