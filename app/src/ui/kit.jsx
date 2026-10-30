// The interface's building blocks. Every edit goes through run() as a command; sliders and colour
// wells send a gesture id while dragging, so one drag is one undo step. Choices are shown, not
// listed: picture tiles in a wrapping grid (Tiles), word or icon segments (Segmented), colour dots
// (Swatches), switches and sliders. Nothing scrolls sideways: the panel is the only scroller.
import { useEffect, useRef, useState } from 'preact/hooks';
import { app } from '../instance.js';
import { edit, notify, prefs, setPref } from './state.js';
import { I } from './icons.jsx';

export function run(cmd) {
	try { return edit(app, cmd); } catch (e) { notify(e.message, 'error'); return undefined; }
}

let gestureN = 0;
export function useGesture() {
	const g = useRef(null);
	return {
		id() { if (!g.current) g.current = 'g' + (++gestureN); return g.current; },
		end() { if (g.current) { app.endGesture(); g.current = null; } },
	};
}

// file name of a tile picture for a key ('Parquet studio, sunlit' -> 'parquet-studio-sunlit')
export const thumbName = (k) => String(k).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const thumb = (group, k) => `/thumbs/${group}/${thumbName(k)}.jpg`;

// A titled part of a tab. `id`: remembers whether it is folded (prefs.sections); `aside`: small
// controls or a read-out at the right of the title.
export function Section({ title, aside, children, id, foldable = !!id, note }) {
	const folded = id ? !!prefs.value.sections[id] : false;
	const toggle = () => setPref('sections', { ...prefs.value.sections, [id]: !folded });
	return (
		<section class={`sec ${folded ? 'folded' : ''}`}>
			{title ? (
				<header class="sec-head">
					{foldable ? (
						<button class="sec-title fold" aria-expanded={!folded} onClick={toggle}>
							<span>{title}</span><I.chevronDown size={16} class="sec-chev" />
						</button>
					) : <h3 class="sec-title">{title}</h3>}
					{aside ? <div class="sec-aside">{aside}</div> : null}
				</header>
			) : null}
			{note ? <p class="sec-note">{note}</p> : null}
			<div class="sec-body"><div class="sec-inner">{children}</div></div>
		</section>
	);
}

// A labelled control. inline: label and control on one line.
export function Field({ label, children, aside, inline = false }) {
	return (
		<div class={`field ${inline ? 'inline' : ''}`}>
			{label ? <div class="field-label"><span>{label}</span>{aside ? <span class="field-aside">{aside}</span> : null}</div> : null}
			<div class="field-ctl">{children}</div>
		</div>
	);
}

// Picture tiles in a wrapping grid. items: [{ key, label, img?, colour?, icon?, hint?, disabled?, badge? }]
// cols: tiles per row; shape: 'square' | 'round' (a round picture, smaller).
export function Tiles({ items, value, onPick, cols = 3, shape = 'square', compact = false, busyKey = null }) {
	return (
		<div class={`tiles ${shape} ${compact ? 'compact' : ''}`} style={{ '--cols': cols }} role="listbox">
			{items.map((it) => <Tile key={it.key} it={it} on={it.key === value} busy={it.key === busyKey} onPick={onPick} />)}
		</div>
	);
}

function Tile({ it, on, busy, onPick }) {
	const [loaded, setLoaded] = useState(false);
	return (
		<button class={`tile ${on ? 'on' : ''} ${busy ? 'busy' : ''}`} role="option" aria-selected={on} title={it.hint ?? it.label} disabled={it.disabled}
			onClick={() => !on && onPick(it.key)}>
			<span class={`tile-pic ${loaded || !it.img ? 'loaded' : ''}`} style={it.colour ? { background: it.colour } : null}>
				{it.img ? <img src={it.img} alt="" loading="lazy" draggable={false} onLoad={() => setLoaded(true)} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; setLoaded(true); }} /> : null}
				{it.icon ? <span class="tile-icon">{it.icon}</span> : null}
				{!it.img && !it.colour && !it.icon ? <span class="tile-initials">{initials(it.label)}</span> : null}
				{it.disabled ? <span class="tile-lock"><I.lock size={14} /></span> : null}
				{busy ? <span class="tile-spin" /> : null}
			</span>
			{it.label ? <span class="tile-name">{it.label}</span> : null}
		</button>
	);
}
const initials = (s = '') => s.split(/[\s,()-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// A row of segments, one on. options: [[value, label, icon?, hint?]]; iconOnly shows the icons alone.
export function Segmented({ value, options, onPick, iconOnly = false, wrap = false }) {
	return (
		<div class={`seg ${iconOnly ? 'icons' : ''} ${wrap ? 'wrap' : ''}`} role="radiogroup">
			{options.map(([v, l, icon, hint]) => (
				<button key={String(v)} class={`seg-opt ${v === value ? 'on' : ''}`} role="radio" aria-checked={v === value} title={hint ?? (iconOnly ? l : undefined)} onClick={() => v !== value && onPick(v)}>
					{icon ?? null}{iconOnly ? null : <span>{l}</span>}
				</button>
			))}
		</div>
	);
}

// Colour dots and a well for any other colour. value: '#rrggbb' (or null: none on); onPick(hex,
// gesture?) like a colour well's onChange.
export function Swatches({ value, colours, onPick, custom = true, extra = null, size = 'm' }) {
	const v = (value ?? '').toLowerCase(), known = colours.some((c) => c.toLowerCase() === v);
	return (
		<div class={`swatches ${size}`}>
			{colours.map((c) => <button key={c} class={`dot ${c.toLowerCase() === v ? 'on' : ''}`} style={{ '--c': c }} title={c} aria-label={c} onClick={() => onPick(c)} />)}
			{custom ? <ColourWell value={value ?? '#888888'} on={!!value && !known} onChange={onPick} /> : null}
			{extra}
		</div>
	);
}

// A colour well: a rainbow dot (the current colour inside when it is not a swatch) that opens the
// system colour picker.
export function ColourWell({ value, onChange, on = true, title = 'Any colour' }) {
	const g = useGesture();
	return (
		<label class={`dot well ${on ? 'on' : ''}`} title={title} style={on ? { '--c': value } : null}>
			<input type="color" value={value} onInput={(e) => onChange(e.currentTarget.value, g.id())} onChange={() => g.end()} />
			{on ? null : <I.plus size={14} />}
		</label>
	);
}

export function Switch({ value, onChange, label, hint }) {
	return (
		<label class="switch-row" title={hint}>
			{label ? <span class="switch-label">{label}</span> : null}
			<span class={`switch ${value ? 'on' : ''}`}>
				<input type="checkbox" checked={value} onChange={(e) => onChange(e.currentTarget.checked)} />
				<span class="switch-knob" />
			</span>
		</label>
	);
}

// A slider whose value applies while dragging (one undo step per drag).
export function Slider({ value, min, max, step = 0.01, onChange, format = (v) => v.toFixed(2) }) {
	const g = useGesture();
	return <SliderView value={value} min={min} max={max} step={step} format={format}
		onInput={(v) => onChange(v, g.id())} onCommit={() => g.end()} />;
}
// A slider that applies when it is let go (changes that take a while, such as a re-fit).
export function CommitSlider({ value, min, max, step, format, onCommit }) {
	const [v, setV] = useState(value);
	useEffect(() => setV(value), [value]);
	return <SliderView value={v} min={min} max={max} step={step} format={format} onInput={setV} onCommit={(x) => onCommit(x)} />;
}
function SliderView({ value, min, max, step, format, onInput, onCommit }) {
	const p = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
	return (
		<span class="slider">
			<input type="range" min={min} max={max} step={step} value={value} style={{ '--p': p }}
				onInput={(e) => onInput(Number(e.currentTarget.value))} onChange={(e) => onCommit(Number(e.currentTarget.value))} />
			<span class="slider-val">{format(value)}</span>
		</span>
	);
}

export function Stepper({ value, min, max, onChange, format = String }) {
	return (
		<span class="stepper">
			<button class="step-btn" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Fewer">−</button>
			<span class="step-val">{format(value)}</span>
			<button class="step-btn" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="More">+</button>
		</span>
	);
}

// The less used settings of a section, folded away.
export function Disclosure({ label = 'Fine-tune', children, open = false }) {
	return (
		<details class="disclosure" open={open}>
			<summary><I.chevronRight size={16} class="disc-chev" /><span>{label}</span></summary>
			<div class="disc-body">{children}</div>
		</details>
	);
}

export function Button({ children, onClick, title, kind = '', icon = null, disabled, active, size = '' }) {
	return (
		<button class={`btn ${kind} ${size} ${active ? 'active' : ''}`} title={title} onClick={onClick} disabled={disabled}>
			{icon}{children ? <span>{children}</span> : null}
		</button>
	);
}

export function IconButton({ icon, label, onClick, active = false, disabled = false, kind = '' }) {
	return (
		<button class={`icon-btn ${kind} ${active ? 'active' : ''}`} title={label} aria-label={label} aria-pressed={active} onClick={onClick} disabled={disabled}>
			{icon}
		</button>
	);
}

// A page of a tab for one selected part: back to the tab, its title (editable when onRename),
// and its actions.
export function PartHeader({ back, onBack, title, placeholder, onRename, actions }) {
	return (
		<div class="part-head">
			<button class="back" onClick={onBack}><I.chevronLeft size={18} /><span>{back}</span></button>
			<div class="part-title-row">
				{onRename ? <input class="part-title" value={title} placeholder={placeholder} size={Math.max((title || placeholder || '').length, 4)} onChange={(e) => onRename(e.currentTarget.value)} />
					: <h2 class="part-title">{title || placeholder}</h2>}
				{actions ? <div class="part-actions">{actions}</div> : null}
			</div>
		</div>
	);
}

// A clickable row in a list of the design's parts.
export function PartRow({ swatch, icon, label, meta, on, onClick }) {
	return (
		<button class={`part-row ${on ? 'on' : ''}`} onClick={onClick}>
			{swatch ? <span class="part-swatch" style={{ '--c': swatch }} /> : icon ? <span class="part-icon">{icon}</span> : null}
			<span class="part-label">{label}</span>
			{meta ? <span class="part-meta">{meta}</span> : null}
			<I.chevronRight size={16} class="part-chev" />
		</button>
	);
}

export function Hint({ children, icon = <I.info size={16} /> }) {
	return <p class="hint">{icon}<span>{children}</span></p>;
}
