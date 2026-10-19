// The tool rail. Each entry is one interaction mode of the viewport (ui/tools.js implements them).
// Tools not built yet are listed disabled so the layout is stable while phases land.
export const tools = [
	{ id: 'orbit', label: 'Orbit', icon: '◎', key: 'O' },
	{ id: 'select', label: 'Select', icon: '➤', key: 'V' },
	{ sep: 1 },
	{ id: 'pen', label: 'Pen', icon: '✎', key: 'P' },
	{ id: 'fabric', label: 'Fabric', icon: '▦', key: 'F' },
	{ id: 'cut', label: 'Cut out', icon: '✂', key: 'X' },
	{ id: 'strap', label: 'Strap', icon: '⌇', key: 'S', disabled: true },
	{ id: 'trim', label: 'Edges', icon: '▭', key: 'T', disabled: true },
	{ sep: 2 },
	{ id: 'stones', label: 'Stones', icon: '✦', key: 'G', disabled: true },
	{ id: 'single', label: 'Single stone', icon: '•', key: '1', disabled: true },
	{ id: 'erase', label: 'Eraser', icon: '⌫', key: 'D', disabled: true },
	{ sep: 3 },
	{ id: 'trace', label: 'Trace photo', icon: '◫', key: 'R', disabled: true },
];
