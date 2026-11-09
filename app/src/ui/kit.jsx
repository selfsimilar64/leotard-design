// The interface's building blocks. Every edit goes through run() as a command; sliders and colour
// wells send a gesture id while dragging, so one drag is one undo step. Everything the designer
// changes lives on a Card (a pane of frosted glass over the stage, ui/Inspector.jsx) and a card never
// scrolls: what can be changed about a part is split into a few faces (the bar under the card's
// title), each small enough to fit. Choices are shown, not listed: picture tiles (Tiles, paged with
// Paged when there are many), word segments (Segmented), colour dots (Swatches), switches, and bar
// sliders (Slider: the whole row is the track, its name inside it). While a slider is dragged the
// rest of its card clears away, so the leotard under the glass can be watched (styles.css .xray).
import { useEffect, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact';
import { app } from '../instance.js';
import { edit, notify, prefs, setPref, facets, selection, tab, tool } from './state.js';
import { I } from './icons.jsx';
import { parseHex } from '../doc/materials.js';

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

// --- the card ---------------------------------------------------------------------------------------

// Everything put away: no part chosen, no tool on, no card. The leotard alone.
export function closeCard() { tool.value = 'move'; selection.value = null; tab.value = null; }

// The face a kind of card is on: the one last used for that kind this session, else its first.
export function useFacet(kind, keys) {
	const cur = facets.value[kind], on = keys.includes(cur) ? cur : keys[0];
	return [on, (k) => { facets.value = { ...facets.value, [kind]: k }; }];
}
export const showFacet = (kind, k) => { if (facets.value[kind] !== k) facets.value = { ...facets.value, [kind]: k }; };

// A pane of glass for one part of the design (or one tool, or the stage). kind: what its faces are remembered
// by; faces: [[key, label]]; children: (face) => its content. onBack: a step up (a line back to Shape);
// lead: what stays above the faces whichever is on (the Sparkle card's tools).
export function Card({ kind, title, placeholder, onRename, onBack, backLabel, actions, lead, faces = [], note, children, onClose = closeCard }) {
	const [face, setFace] = useFacet(kind, faces.map(([k]) => k));
	return (
		<section class="card glass" data-kind={kind} aria-label={title || placeholder}>
			<header class="card-head">
				{onBack ? <button class="card-back" onClick={onBack} title={'Back to ' + backLabel} aria-label={'Back to ' + backLabel}><I.chevronLeft size={18} /></button> : null}
				{onRename
					? <input class="card-title" value={title} placeholder={placeholder} size={Math.max((title || placeholder || '').length, 4)} title="Rename" onChange={(e) => onRename(e.currentTarget.value)} />
					: <h2 class="card-title">{title || placeholder}</h2>}
				<div class="card-actions">
					{actions}
					<IconButton icon={<I.close size={18} />} label="Put this away (Esc)" onClick={onClose} />
				</div>
			</header>
			{note ? <p class="card-note">{note}</p> : null}
			{lead}
			{faces.length > 1 ? (
				<nav class={`faces n${faces.length}`} role="tablist">
					{faces.map(([k, label]) => <button key={k} class={`face ${k === face ? 'on' : ''}`} role="tab" aria-selected={k === face} onClick={() => setFace(k)}>{label}</button>)}
				</nav>
			) : null}
			<div class="card-body" key={face} role="tabpanel">{children(face)}</div>
		</section>
	);
}

// A labelled control, the label above it. aside: a read-out or small control at the label's right.
export function Field({ label, children, aside }) {
	return (
		<div class="field">
			{label || aside ? <div class="field-label"><span>{label}</span>{aside ? <span class="field-aside">{aside}</span> : null}</div> : null}
			<div class="field-ctl">{children}</div>
		</div>
	);
}

// Picture tiles in a wrapping grid. items: [{ key, label, img?, colour?, icon?, hint?, disabled? }]
// cols: tiles per row; shape: 'square' | 'round'; names: false leaves the names to the hint (a swatch book).
export function Tiles({ items, value, onPick, cols = 3, shape = 'square', names = true, busyKey = null }) {
	return (
		<div class={`tiles ${shape} ${names ? '' : 'bare'}`} style={{ '--cols': cols }} role="listbox">
			{items.map((it) => <Tile key={it.key} it={it} on={it.key === value} busy={it.key === busyKey} names={names} onPick={onPick} />)}
		</div>
	);
}

function Tile({ it, on, busy, names, onPick }) {
	const [loaded, setLoaded] = useState(false);
	return (
		<button class={`tile ${on ? 'on' : ''} ${busy ? 'busy' : ''}`} role="option" aria-selected={on} aria-label={it.label ?? it.hint} title={it.hint ?? it.label} disabled={it.disabled}
			onClick={() => !on && onPick(it.key)}>
			<span class={`tile-pic ${loaded || !it.img ? 'loaded' : ''}`} style={it.colour ? { background: it.colour } : null}>
				{it.img ? <img src={it.img} alt="" loading="lazy" draggable={false} onLoad={() => setLoaded(true)} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; setLoaded(true); }} /> : null}
				{it.icon ? <span class="tile-icon">{it.icon}</span> : null}
				{!it.img && !it.colour && !it.icon ? <span class="tile-initials">{initials(it.label)}</span> : null}
				{it.disabled ? <span class="tile-lock"><I.lock size={13} /></span> : null}
				{busy ? <span class="tile-spin" /> : null}
			</span>
			{names && it.label ? <span class="tile-name">{it.label}</span> : null}
		</button>
	);
}
const initials = (s = '') => s.split(/[\s,()-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// More choices than fit: pages of them, turned with the arrows. It opens on the page that holds `value`.
// children: (the items of the page on show) => what to draw.
export function Paged({ items, per, value, children }) {
	const pages = Math.max(1, Math.ceil(items.length / per)), at = items.findIndex((it) => it.key === value);
	const [page, setPage] = useState(at < 0 ? 0 : Math.floor(at / per)), p = Math.min(page, pages - 1);
	if (pages === 1) return children(items);
	return (
		<div class="paged">
			{children(items.slice(p * per, p * per + per))}
			<div class="pager">
				<button class="pager-btn" disabled={p === 0} aria-label="The page before" onClick={() => setPage(p - 1)}><I.chevronLeft size={16} /></button>
				<span class="pager-dots" aria-label={`Page ${p + 1} of ${pages}`}>{Array.from({ length: pages }, (_, i) => <button key={i} class={`pager-dot ${i === p ? 'on' : ''}`} aria-label={`Page ${i + 1}`} onClick={() => setPage(i)} />)}</span>
				<button class="pager-btn" disabled={p === pages - 1} aria-label="The next page" onClick={() => setPage(p + 1)}><I.chevronRight size={16} /></button>
			</div>
		</div>
	);
}

// A row of segments, one on. options: [[value, label, icon?, hint?]]; wrap: as many rows as they need;
// cols: an even grid of that many columns (many short words).
export function Segmented({ value, options, onPick, iconOnly = false, wrap = false, cols = 0 }) {
	return (
		<div class={`seg ${iconOnly ? 'icons' : ''} ${wrap ? 'wrap' : ''} ${cols ? 'grid' : ''}`} style={cols ? { '--cols': cols } : null} role="radiogroup">
			{options.map(([v, l, icon, hint]) => (
				<button key={String(v)} class={`seg-opt ${v === value ? 'on' : ''}`} role="radio" aria-checked={v === value} title={hint ?? (iconOnly ? l : undefined)} onClick={() => v !== value && onPick(v)}>
					{icon ?? null}{iconOnly ? null : <span>{l}</span>}
				</button>
			))}
		</div>
	);
}

// The custom colours most recently used on this computer, newest first (prefs, not the design).
const RECENT_COLOURS = 9;
function rememberColour(c) { setPref('recentColours', [c.toLowerCase(), ...(prefs.value.recentColours ?? []).filter((x) => x !== c.toLowerCase())].slice(0, RECENT_COLOURS)); }

// Type a colour by its code. Applies on Enter or on leaving the field; a code that makes no colour goes back.
export function HexField({ value, onPick }) {
	const [draft, setDraft] = useState(null);
	const commit = () => {
		if (draft === null) return;
		const c = parseHex(draft);
		setDraft(null);
		if (c && c !== (value ?? '').toLowerCase()) { onPick(c); rememberColour(c); }
	};
	return <input class="text-in mono hex-in" type="text" spellcheck={false} maxLength={7} aria-label="Colour code" title="Colour code, such as #c58fa6" placeholder="#hex" value={draft ?? value ?? ''}
		onInput={(e) => setDraft(e.currentTarget.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(null); } }} />;
}

// Colour dots, a well for any other colour with its code, then the recent custom colours in the same run.
// value: '#rrggbb' (or null: none on); onPick(hex, gesture?) like a colour well's onChange.
export function Swatches({ value, colours, onPick, custom = true, extra = null }) {
	const v = (value ?? '').toLowerCase(), known = colours.some((c) => c.toLowerCase() === v);
	const recent = custom ? (prefs.value.recentColours ?? []).filter((c) => !colours.some((x) => x.toLowerCase() === c)) : [];
	return (
		<div class="swatches">
			{colours.map((c) => <button key={c} class={`dot ${c.toLowerCase() === v ? 'on' : ''}`} style={{ '--c': c }} title={c} aria-label={c} onClick={() => onPick(c)} />)}
			{recent.map((c) => <button key={c} class={`dot recent ${c === v ? 'on' : ''}`} style={{ '--c': c }} title={c + ' (used lately)'} aria-label={c} onClick={() => onPick(c)} />)}
			{custom ? <ColourWell value={value ?? '#888888'} on={!!value && !known && !recent.includes(v)} onChange={onPick} /> : null}
			{custom ? <HexField value={value} onPick={onPick} /> : null}
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
			<input type="color" value={value} onInput={(e) => onChange(e.currentTarget.value, g.id())} onChange={(e) => { g.end(); rememberColour(e.currentTarget.value); }} />
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

// A bar slider: the whole row is the track, with its name at the left and its value at the right. The value applies
// while dragging (one undo step per drag). The value is a button: click to type one. def: its value to go back to, by
// the small arrow that shows once it has changed, or a double click on the bar. log: a track that gives small values
// as much room as big ones.
export function Slider({ label, value, min, max, step = 0.01, onChange, format = (v) => v.toFixed(2), def, log = false, parse, hint }) {
	const g = useGesture();
	const once = (v) => { onChange(v, g.id()); g.end(); };
	return <SliderView label={label} hint={hint} value={value} min={min} max={max} step={step} format={format} log={log} def={def} parse={parse}
		onInput={(v) => onChange(v, g.id())} onCommit={() => g.end()} onOnce={once} />;
}
// A slider that applies when it is let go (changes that take a while, such as a re-fit).
export function CommitSlider({ label, value, min, max, step, format, onCommit, hint }) {
	const [v, setV] = useState(value);
	useEffect(() => setV(value), [value]);
	return <SliderView label={label} hint={hint} value={v} min={min} max={max} step={step} format={format} onInput={setV} onCommit={(x) => onCommit(x)} />;
}
function SliderView({ label, hint, value, min, max, step, format, onInput, onCommit, onOnce, def, log = false, parse }) {
	const [typing, setTyping] = useState(null), bar = useRef(null), held = useRef(false);
	// a logarithmic track: the input runs 0..1 and stands for a value by ratio
	const lg = log && min > 0;
	const toTrack = (v) => (lg ? Math.log(Math.max(v, min) / min) / Math.log(max / min) : v);
	const fromTrack = (t) => { if (!lg) return t; const v = min * (max / min) ** t; return step ? +(Math.round(v / step) * step).toFixed(6) : v; };
	const p = lg ? Math.max(0, Math.min(1, toTrack(value))) : Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
	const near = Math.abs(value - def) <= (step ?? 0) / 2 + 1e-9, changed = def !== undefined && !near;
	const shown = format(value);
	// typing goes by what the read-out shows: "12 mm" of a value in metres means typed numbers are millimetres
	const shownNumber = (v) => parseFloat(String(format(v)).replace(/[^\d.+-]/g, ' ').trim());
	const unit = () => { for (const v of [value, max, min]) { const s = shownNumber(v); if (v && s && Number.isFinite(s)) return s / v; } return 1; };
	const commitTyped = (text) => {
		setTyping(null);
		const n = parseFloat(String(text).replace(',', '.'));
		if (!Number.isFinite(n)) return;
		const v = parse ? parse(n) : n / unit();
		if (onOnce) onOnce(Math.max(min, Math.min(max, step ? +(Math.round(v / step) * step).toFixed(6) : v)));
		else { onInput(Math.max(min, Math.min(max, v))); onCommit(Math.max(min, Math.min(max, v))); }
	};
	// while the bar is dragged, the rest of its card clears away (styles.css .xray): the eye is on the leotard, not the glass
	const xray = (on) => { bar.current?.classList.toggle('scrubbing', on); bar.current?.closest('.card, .flyout')?.classList.toggle('xray', on); };
	const down = () => {
		held.current = true;
		const up = () => { held.current = false; xray(false); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
		addEventListener('pointerup', up); addEventListener('pointercancel', up);
	};
	return (
		<div class={`bar ${changed ? 'changed' : ''}`} ref={bar} style={{ '--p': p }} title={hint}>
			<span class="bar-fill" />
			<input type="range" aria-label={label} min={lg ? 0 : min} max={lg ? 1 : max} step={lg ? 0.001 : step} value={toTrack(value)}
				onPointerDown={down} onDblClick={changed && onOnce ? () => onOnce(def) : undefined}
				onInput={(e) => { if (held.current) xray(true); onInput(fromTrack(Number(e.currentTarget.value))); }} onChange={(e) => onCommit(fromTrack(Number(e.currentTarget.value)))} />
			<span class="bar-label">{label}</span>
			{def !== undefined && changed ? <button class="bar-reset" title={'Back to ' + format(def)} aria-label="Back to its default" onClick={() => onOnce(def)}><I.undo size={13} /></button> : null}
			{typing !== null ? (
				<input class="bar-type" type="text" inputMode="decimal" value={typing} ref={(el) => { if (el && document.activeElement !== el) { el.focus(); el.select(); } }}
					onInput={(e) => setTyping(e.currentTarget.value)} onBlur={(e) => commitTyped(e.currentTarget.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setTyping(null); e.stopPropagation(); }} />
			) : (
				<button class="bar-val" title="Type a value" onClick={() => setTyping(String(shownNumber(value) || 0))}>{shown}</button>
			)}
		</div>
	);
}

export function Stepper({ label, value, min, max, onChange, format = String }) {
	return (
		<div class="stepper-row">
			{label ? <span class="switch-label">{label}</span> : null}
			<span class="stepper">
				<button class="step-btn" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Fewer">−</button>
				<span class="step-val">{format(value)}</span>
				<button class="step-btn" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="More">+</button>
			</span>
		</div>
	);
}

export function Button({ children, onClick, title, kind = '', icon = null, disabled, active, size = '' }) {
	return (
		<button class={`btn ${kind} ${size} ${active ? 'active' : ''}`} title={title} onClick={onClick} disabled={disabled} aria-pressed={active === undefined ? undefined : !!active}>
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

// A small pane that opens beside a card from a Well (a colour, a fabric): room for a whole palette or swatch book
// without the card growing. It closes on a click outside it or Esc. Drawn in the page's #flyouts layer (the card's
// glass would otherwise clip and re-anchor it).
export function Flyout({ anchor, onClose, children, width = 300 }) {
	const ref = useRef(null);
	// placed when it is in the page (a portal's content arrives after this component's own effects)
	const place = (el) => {
		ref.current = el;
		const a = anchor.current;
		if (!a || !el) return;
		const r = a.getBoundingClientRect(), card = a.closest('.card')?.getBoundingClientRect() ?? r, h = el.offsetHeight, W = innerWidth, H = innerHeight;
		// beside the card when there is room at its left, else over the well
		const beside = card.left - width - 10 >= 8;
		el.style.left = (beside ? card.left - width - 10 : Math.max(8, Math.min(W - width - 8, r.left))) + 'px';
		el.style.top = (beside ? Math.max(8, Math.min(H - h - 8, r.top - 16)) : Math.max(8, r.top - h - 8)) + 'px';
	};
	useEffect(() => {
		const off = (e) => { if (!ref.current?.contains(e.target) && !anchor.current?.contains(e.target)) onClose(); };
		const esc = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); } };
		addEventListener('pointerdown', off, true); addEventListener('keydown', esc, true);
		return () => { removeEventListener('pointerdown', off, true); removeEventListener('keydown', esc, true); };
	}, []);
	const host = document.getElementById('flyouts');
	if (!host) return null;
	return createPortal(<div class="flyout glass" ref={place} role="dialog" style={{ width: width + 'px' }}>{children}</div>, host);
}

// A value shown small that opens to its whole choice in a Flyout: a colour dot, a fabric's picture.
export function Well({ label, value, swatch, img, children, width }) {
	const [open, setOpen] = useState(false), ref = useRef(null);
	return (
		<>
			<button class={`well-btn ${open ? 'open' : ''}`} ref={ref} aria-expanded={open} onClick={() => setOpen(!open)}>
				<span class="well-pic" style={swatch ? { background: swatch } : null}>{img ? <img src={img} alt="" draggable={false} /> : null}</span>
				<span class="well-text"><span class="well-label">{label}</span><span class="well-value">{value}</span></span>
				<I.chevronRight size={15} class="well-chev" />
			</button>
			{open ? <Flyout anchor={ref} width={width} onClose={() => setOpen(false)}>{typeof children === 'function' ? children(() => setOpen(false)) : children}</Flyout> : null}
		</>
	);
}

// A clickable row in a list of the design's parts.
export function PartRow({ swatch, icon, label, meta, on, onClick }) {
	return (
		<button class={`part-row ${on ? 'on' : ''} ${onClick ? '' : 'static'}`} onClick={onClick} disabled={!onClick}>
			{swatch ? <span class="part-swatch" style={{ '--c': swatch }} /> : icon ? <span class="part-icon">{icon}</span> : null}
			<span class="part-label">{label}</span>
			{meta ? <span class="part-meta">{meta}</span> : null}
			{onClick ? <I.chevronRight size={15} class="part-chev" /> : null}
		</button>
	);
}

export function Hint({ children, icon = null }) {
	return <p class="hint">{icon}<span>{children}</span></p>;
}
