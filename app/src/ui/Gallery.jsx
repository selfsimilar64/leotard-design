// Visual pickers for the side panel: a horizontally scrolling row of rounded picture tiles with the
// name underneath (Strip), round colour swatches (Swatches), a row of word choices for what has no
// picture (Chips), and a titled block of the panel (Pane).
import { useEffect, useRef } from 'preact/hooks';

// items: [{ key, label, img?: url, colour?: css colour (a swatch instead of a picture), hint? }]
// size: 'm' (default) | 's' | 'l'; a tile without a picture shows its initials until it has one.
export function Strip({ items, value, onPick, size = 'm', round = false }) {
	const ref = useRef(null);
	// keep the chosen tile in view when the strip first shows or the choice changes elsewhere
	useEffect(() => {
		const el = ref.current?.querySelector('.tile.on');
		if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}, [value]);
	return (
		<div class={`strip strip-${size}`} ref={ref} onWheel={(e) => {
			// a mouse wheel scrolls the row sideways (trackpads already do)
			if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) { e.currentTarget.scrollLeft += e.deltaY; e.preventDefault(); }
		}}>
			{items.map((it) => <Tile key={it.key} it={it} on={it.key === value} round={round} onPick={onPick} />)}
		</div>
	);
}

function Tile({ it, on, round, onPick }) {
	return (
		<button class={`tile ${on ? 'on' : ''} ${round ? 'round' : ''}`} title={it.hint ?? it.label} onClick={() => onPick(it.key)}>
			<span class="tile-pic" style={it.colour ? { background: it.colour } : null}>
				{it.img ? <img src={it.img} alt="" loading="lazy" draggable={false} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : null}
				{!it.img && !it.colour ? <span class="tile-initials">{initials(it.label)}</span> : null}
			</span>
			<span class="tile-name">{it.label}</span>
		</button>
	);
}

const initials = (s) => s.split(/[\s,()-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// A titled block of the panel. `aside`: small controls at the right of the title.
export function Pane({ title, children, aside }) {
	return (
		<section class="pane">
			{title ? <h3 class="pane-title"><span>{title}</span>{aside}</h3> : null}
			{children}
		</section>
	);
}

// A labelled line inside a pane.
export function Line({ label, children }) {
	return <div class="line"><span class="line-label">{label}</span>{children}</div>;
}

// options: [[value, label]]
export function Chips({ value, options, onPick }) {
	return (
		<div class="chips">
			{options.map(([v, l]) => <button key={v} class={`chip ${v === value ? 'on' : ''}`} onClick={() => onPick(v)}>{l}</button>)}
		</div>
	);
}

// Colour swatches plus a custom colour well. value: hex; onPick(hex, gestureId?) like Colour.
export function Swatches({ value, colours, onPick, custom }) {
	const v = (value ?? '').toLowerCase();
	return (
		<div class="swatches">
			{colours.map((c) => <button key={c} class={`dot ${c.toLowerCase() === v ? 'on' : ''}`} style={{ background: c }} title={c} onClick={() => onPick(c)} />)}
			{custom}
		</div>
	);
}

// A disclosure for the less used settings of a pane.
export function More({ label = 'More settings', children, open = false }) {
	return (
		<details class="more" open={open}>
			<summary>{label}</summary>
			<div class="more-body">{children}</div>
		</details>
	);
}
