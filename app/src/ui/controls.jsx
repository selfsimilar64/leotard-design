// Small form controls. Each one turns a user edit into a command through run(); sliders and
// colour pickers send a gesture id while dragging, so one drag is one undo step.
import { useRef } from 'preact/hooks';
import { app } from '../instance.js';
import { notify } from './state.js';

export function run(cmd) {
	try { return app.exec(cmd); } catch (e) { notify(e.message, 'error'); return undefined; }
}

let gestureN = 0;
function useGesture() {
	const g = useRef(null);
	return {
		id() { if (!g.current) g.current = 'g' + (++gestureN); return g.current; },
		end() { if (g.current) { app.endGesture(); g.current = null; } },
	};
}

export function Section({ title, children, open = true, actions }) {
	return (
		<details class="section" open={open}>
			<summary><span>{title}</span>{actions}</summary>
			<div class="section-body">{children}</div>
		</details>
	);
}

export function Row({ label, children, hint }) {
	return <label class="row" title={hint}><span class="row-label">{label}</span><span class="row-ctl">{children}</span></label>;
}

// options: array of values, or of [value, label]
export function Select({ value, options, onChange }) {
	return (
		<select value={value} onChange={(e) => onChange(e.currentTarget.value)}>
			{options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option value={v} key={v}>{l}</option>; })}
		</select>
	);
}

export function Colour({ value, onChange }) {
	const g = useGesture();
	return <input type="color" value={value} onInput={(e) => onChange(e.currentTarget.value, g.id())} onChange={() => g.end()} />;
}

export function Slider({ value, min, max, step = 0.01, onChange, format = (v) => v.toFixed(2) }) {
	const g = useGesture();
	return (
		<span class="slider">
			<input type="range" min={min} max={max} step={step} value={value}
				onInput={(e) => onChange(Number(e.currentTarget.value), g.id())} onChange={() => g.end()} />
			<span class="slider-val">{format(value)}</span>
		</span>
	);
}

export function Toggle({ value, onChange }) {
	return <input type="checkbox" checked={value} onChange={(e) => onChange(e.currentTarget.checked)} />;
}

export function Button({ children, onClick, title, active, disabled, kind }) {
	return <button class={`btn ${active ? 'active' : ''} ${kind ?? ''}`} title={title} onClick={onClick} disabled={disabled}>{children}</button>;
}
