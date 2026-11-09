// The interface's icons: one line-drawn set on a 24-unit grid (1.6 stroke, round ends), drawn in
// the text colour (currentColor). Use as <I.undo /> ; pass class or size for a different size.
const svg = (body, fill = false) => function Icon({ size = 20, class: cls = '', title }) {
	return (
		<svg class={`ic ${cls}`} width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'}
			stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}>
			{title ? <title>{title}</title> : null}
			{body}
		</svg>
	);
};

export const I = {
	// --- the spine: the four kinds of work
	shape: svg(<path d="M9 3.2q3 3.2 6 0h1.6q.1 4.6 2.6 6l-1 6.1q-2.7 1.3-4.3 5.5h-3.8Q8.5 16.6 5.8 15.3l-1-6.1q2.5-1.4 2.6-6z" />),
	fabric: svg(<><path d="M4 6.5c2.7-2 5.3 2 8 0s5.3-2 8 0v11c-2.7-2-5.3 2-8 0s-5.3-2-8 0z" /><path d="M8 5.6v11.1" opacity=".45" /></>),
	sparkle: svg(<><path d="M6 9.2 9 4.8h6l3 4.4-6 10z" /><path d="M6 9.2h12M10.4 9.2 12 19.2l1.6-10M9 4.8l1.4 4.4M15 4.8l-1.4 4.4" opacity=".6" /></>),
	stage: svg(<><path d="M9.6 3.4h4.8l-.9 3.8h-3z" /><path d="M10.4 7.2 6.4 16.6M13.6 7.2l4 9.4" opacity=".55" /><ellipse cx="12" cy="18.4" rx="7" ry="2.2" /></>),
	// --- the top row's chips
	designs: svg(<><rect x="4" y="4" width="7" height="7" rx="1.8" /><rect x="13" y="4" width="7" height="7" rx="1.8" /><rect x="4" y="13" width="7" height="7" rx="1.8" /><rect x="13" y="13" width="7" height="7" rx="1.8" /></>),
	undo: svg(<><path d="M9 7.5 5 11.5l4 4" /><path d="M5.2 11.5H14a5 5 0 0 1 0 10h-2.5" /></>),
	redo: svg(<><path d="m15 7.5 4 4-4 4" /><path d="M18.8 11.5H10a5 5 0 0 0 0 10h2.5" /></>),
	pattern: svg(<><path d="M6 3.5h8.5l3.5 3.5v13.5H6z" /><path d="M14.5 3.5V7H18" /><path d="M9 10.5c2 1.2 4 1.2 6 0v6.5H9z" stroke-dasharray="1.6 1.9" /></>),
	export: svg(<><path d="M12 4v10.5M7.8 10.5 12 14.7l4.2-4.2" /><path d="M5 17.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-1.5" /></>),
	settings: svg(<><path d="M4 7.5h9M17.5 7.5H20M4 16.5h2.5M11 16.5h9" /><circle cx="15.2" cy="7.5" r="2.2" /><circle cx="8.8" cy="16.5" r="2.2" /></>),
	// --- the view chip
	handles: svg(<><rect x="5" y="5" width="14" height="14" rx="1" stroke-dasharray="2.2 2.4" /><circle cx="5" cy="5" r="1.9" /><circle cx="19" cy="5" r="1.9" /><circle cx="19" cy="19" r="1.9" /><circle cx="5" cy="19" r="1.9" /></>),
	lines: svg(<><path d="M4.5 18.5C9 6 15 18 19.5 5.5" /><rect x="3" y="17" width="3" height="3" rx=".8" /><rect x="18" y="4" width="3" height="3" rx=".8" /></>),
	mannequin: svg(<><path d="M10.6 3.5h2.8v1.4c2 .3 3.7 1 4.1 2.6.4 1.6-.7 2.8-1.5 4-.4.7-.4 1.4 0 2.1.6 1.1 1 2.3.9 3.6H7.1c-.1-1.3.3-2.5.9-3.6.4-.7.4-1.4 0-2.1-.8-1.2-1.9-2.4-1.5-4 .4-1.6 2.1-2.3 4.1-2.6z" /><path d="M12 17.2v3.3M9 20.5h6" /></>),
	fit: svg(<><path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" /></>),
	// --- tools and actions
	pointer: svg(<path d="m6 4 12.5 7.2-5.6 1.5-2.9 5.3z" />),
	pen: svg(<><path d="m14.5 5 4.5 4.5L9 19.5H4.5V15z" /><path d="m12.5 7 4.5 4.5" /></>),
	strap: svg(<><path d="M5 4c1.5 6 6 11 14 16" /><path d="M9 4c1.2 4.6 4.6 8.4 11 12.2" /></>),
	rows: svg(<><circle cx="4.5" cy="16.5" r="1.6" /><circle cx="8.5" cy="12.5" r="1.6" /><circle cx="13" cy="10" r="1.6" /><circle cx="18" cy="9.5" r="1.6" /><path d="M3 20c4-6 9-9 18-7" opacity=".35" /></>),
	gem: svg(<><path d="M7 9.5 9.5 6h5L17 9.5 12 18z" /><path d="M7 9.5h10M12 18l-2-8.5M12 18l2-8.5" opacity=".6" /><path d="M19 3.5v3M17.5 5h3" /></>),
	eraser: svg(<><path d="m15.5 4.5 4 4-9.5 9.5H6l-2-2z" /><path d="m12 8 4 4M10 20.5h10" /></>),
	text: svg(<><path d="M5.5 7V5h13v2M12 5v14M9.2 19h5.6" /></>),
	scissors: svg(<><circle cx="6.5" cy="7" r="2.5" /><circle cx="6.5" cy="17" r="2.5" /><path d="M8.6 8.4 19 16.5M8.6 15.6 19 7.5" /></>),
	fill: svg(<><path d="M5 11.5 11.5 5l7 7-6.5 6.5a2 2 0 0 1-2.8 0L5 14.3a2 2 0 0 1 0-2.8z" /><path d="M5 12h13.5M20 16.5c0 1.2-.7 2-1.5 2s-1.5-.8-1.5-2 1.5-3 1.5-3 1.5 1.8 1.5 3z" /></>),
	trash: svg(<><path d="M4.5 7h15M10 11v6M14 11v6" /><path d="m6.5 7 .9 12.1A1.5 1.5 0 0 0 8.9 20.5h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7M9.5 7V4.5h5V7" /></>),
	release: svg(<><circle cx="7" cy="8" r="1.7" /><circle cx="12" cy="6" r="1.7" /><circle cx="17" cy="8" r="1.7" /><path d="M12 11v9M8.5 16.5 12 20l3.5-3.5" /></>),
	shuffle: svg(<><path d="M4 7h3.5c4.5 0 4.5 10 9 10H20M4 17h3.5c1.6 0 2.6-1.2 3.4-2.8M14 9.8c.8-1.6 1.8-2.8 3.5-2.8H20" /><path d="m17.5 4.5 2.5 2.5-2.5 2.5M17.5 14.5l2.5 2.5-2.5 2.5" /></>),
	mirror: svg(<><path d="M12 3.5v17" stroke-dasharray="1.5 2" /><path d="M9 7 4 12l5 5zM15 7l5 5-5 5z" /></>),
	band: svg(<><path d="M4 9c5-3 11-3 16 0M4 13.5c5-3 11-3 16 0" /><path d="M4 9v4.5M20 9v4.5" /></>),
	more: svg(<><circle cx="6" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="18" cy="12" r="1.3" fill="currentColor" /></>),
	plus: svg(<path d="M12 5v14M5 12h14" />),
	eye: svg(<><path d="M3 12s3.4-6 9-6 9 6 9 6-3.4 6-9 6-9-6-9-6z" /><circle cx="12" cy="12" r="2.5" /></>),
	eyeOff: svg(<><path d="M3 12s3.4-6 9-6 9 6 9 6-3.4 6-9 6-9-6-9-6z" opacity=".45" /><path d="M5 19 19 5" /></>),
	density: svg(<><circle cx="5.5" cy="6" r="1.5" /><circle cx="11" cy="6" r="1.5" /><circle cx="16.5" cy="6" r="1.5" /><circle cx="8" cy="11.5" r="1.5" /><circle cx="14.5" cy="11.5" r="1.5" /><circle cx="6" cy="17.5" r="1.5" /><circle cx="18.5" cy="18" r="1.5" /></>),
	sizes: svg(<><circle cx="6" cy="14" r="1.4" /><circle cx="11.2" cy="12.5" r="2.6" /><circle cx="18" cy="10.5" r="4" /></>),
	colours: svg(<><path d="M12 3.5c3.5 4.4 6 7.3 6 10.5a6 6 0 0 1-12 0c0-3.2 2.5-6.1 6-10.5z" /><path d="M12 8.5v11" opacity=".55" /></>),
	close: svg(<path d="M6 6l12 12M18 6 6 18" />),
	check: svg(<path d="m5 12.5 4.5 4.5L19 7.5" />),
	chevronDown: svg(<path d="m6.5 9.5 5.5 5.5 5.5-5.5" />),
	chevronRight: svg(<path d="m9.5 6.5 5.5 5.5-5.5 5.5" />),
	chevronLeft: svg(<path d="M14.5 6.5 9 12l5.5 5.5" />),
	lock: svg(<><rect x="5.5" y="10.5" width="13" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>),
	info: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.6v.2" /></>),
	eyedrop: svg(<><path d="m14 6 4 4M16.5 3.5a2.1 2.1 0 0 1 3 3l-2 2-3-3z" /><path d="M15 8.5 6.5 17 5 20.5 8.5 19l8.5-8.5" /></>),
};

// The crystal glare presets (render/glare.js GLARE): none, and the star filters by their rays.
const rays = (n, r1 = 9, r0 = 2.2) => Array.from({ length: n }, (_, i) => {
	const a = (i / n) * Math.PI * 2 - Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
	return `M${(12 + c * r0).toFixed(2)} ${(12 + s * r0).toFixed(2)}L${(12 + c * r1).toFixed(2)} ${(12 + s * r1).toFixed(2)}`;
}).join('');
export const GLARE_ICONS = {
	plain: svg(<><circle cx="12" cy="12" r="3" /><path d="M5.5 18.5l13-13" opacity=".5" /></>),
	star: svg(<><path d={rays(4)} /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /></>),
	star6: svg(<><path d={rays(6)} /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /></>),
	arena: svg(<><path d={rays(8)} /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /></>),
};

// The shape of a line's edge (curve.shape.mod): a sample of each.
export const EDGE_ICONS = {
	none: svg(<path d="M3 12h18" />),
	scallop: svg(<path d="M3 10c1.5 4 4.5 4 6 0 1.5 4 4.5 4 6 0 1.5 4 4.5 4 6 0" />),
	zigzag: svg(<path d="m3 10 3 4 3-4 3 4 3-4 3 4 3-4" />),
	wave: svg(<path d="M3 12c1.5-3 3-3 4.5 0s3 3 4.5 0 3-3 4.5 0 3 3 4.5 0" />),
};

// Edge finishes (garment/trim.js) and seam finishes, drawn as a cross-section of the edge.
export const FINISH_ICONS = {
	elastic: svg(<><path d="M4 15h16" /><path d="M4 15c0-3.5 2-5 5-5h11" /><path d="M7 12.4h11" stroke-dasharray="1.4 1.6" opacity=".6" /></>),
	zigzag: svg(<><path d="M3 15h18" opacity=".45" /><path d="M3 12l3 5 3-5 3 5 3-5 3 5 3-5" /></>),
	binding: svg(<><path d="M4 16h16" /><path d="M5 16V9.5a2 2 0 0 1 2-2h13" /><path d="M5 12h15" opacity=".45" /></>),
	none: svg(<><path d="M4 14h16" /><path d="M20 14v-3.5" opacity=".5" /></>),
	piping: svg(<><path d="M3 15h7.5M13.5 15H21" /><circle cx="12" cy="13.5" r="2.4" /></>),
	tape: svg(<><path d="M3 15h18" /><rect x="8" y="11.5" width="8" height="3.5" rx=".8" /></>),
	seam: svg(<><path d="M3 15h18" /><path d="M12 15v-4" stroke-dasharray="1.2 1.4" /></>),
};
