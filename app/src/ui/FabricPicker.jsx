// Fabric picker with swatch thumbnails (materials/swatches.js) in the panel's colour: the current
// fabric on a button; clicking opens a grid of every fabric. Thumbnails are drawn one per frame
// so the grid opens at once; resting the pointer on one rocks the cloth so sparkle and colour
// shift show.
import { useState, useEffect, useRef } from 'preact/hooks';
import { app } from '../instance.js';
import { FABRICS } from '../materials/fabric.js';
import { swatch } from '../materials/swatches.js';

const KEYS = Object.keys(FABRICS).filter((k) => k !== 'checker');

function useSwatches(look, keys, open) {
	const [urls, setUrls] = useState({});
	useEffect(() => {
		if (!open || !app.engine) return;
		let live = true;
		(async () => {
			const out = {};
			for (const k of keys) {
				out[k] = swatch(app.engine.viewport, { ...look, fabric: k })[0];
				setUrls({ ...out });
				await new Promise((r) => requestAnimationFrame(r));
				if (!live) return;
			}
		})();
		return () => { live = false; };
	}, [open, look.colour, look.second, look.colour2, keys.join()]);
	return urls;
}

function Tile({ k, url, look, active, onPick }) {
	const [frame, setFrame] = useState(null), timer = useRef(null);
	const enter = () => {
		const frames = swatch(app.engine.viewport, { ...look, fabric: k }, 8);
		let i = 0;
		timer.current = setInterval(() => setFrame(frames[i++ % frames.length]), 110);
	};
	const leave = () => { clearInterval(timer.current); setFrame(null); };
	useEffect(() => () => clearInterval(timer.current), []);
	return (
		<button class={'swatch' + (active ? ' active' : '')} title={FABRICS[k].label} onClick={() => onPick(k)} onMouseEnter={enter} onMouseLeave={leave}>
			{url ? <img src={frame ?? url} alt="" /> : <span class="swatch-wait" />}
			<span class="swatch-label">{FABRICS[k].label}</span>
		</button>
	);
}

// look: { fabric, colour, second, colour2 }; onPick(fabricKey)
export function FabricPicker({ look, onPick }) {
	const [open, setOpen] = useState(false);
	const urls = useSwatches(look, open ? KEYS : [look.fabric], true);
	return (
		<div class="fabric-picker">
			<button class="swatch current" onClick={() => setOpen(!open)} title="Choose fabric">
				{urls[look.fabric] ? <img src={urls[look.fabric]} alt="" /> : <span class="swatch-wait" />}
				<span class="swatch-label">{FABRICS[look.fabric]?.label ?? look.fabric} {open ? '▴' : '▾'}</span>
			</button>
			{open ? (
				<div class="swatch-grid">
					{KEYS.map((k) => <Tile key={k} k={k} url={urls[k]} look={look} active={k === look.fabric} onPick={(v) => { onPick(v); setOpen(false); }} />)}
				</div>
			) : null}
		</div>
	);
}
