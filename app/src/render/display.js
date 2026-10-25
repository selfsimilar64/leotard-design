// Display settings: how this machine renders the view (resolution, anti-aliasing, shadows, glow,
// skin scattering, ambient occlusion, lower resolution while moving). They belong to the computer, not the design, so they are kept in
// the browser (not in the document or its undo history) and applied to the viewport at start-up.
const KEY = 'leotard.display.v1';

// msaa off by default (owner, 2026-10-24); with the stencil no longer resolved (render/postfx.js
// ScenePass) 4x cost ~1.6 ms a frame at 1792x1344 (13.6 against 12.0 ms)
export const DISPLAY_DEFAULTS = { resolution: 1, dynamicRes: true, msaa: 0, shadows: 'soft', bloom: true, skin: true, ao: true,
	// the garment sliding over a posed body (body/slide.js, experiment): on/off, tension (the
	// fabric's rest size, 1 = none) and grip (friction against the skin); tuned from the Model pane
	slide: true, slideTension: 0.75, slideGrip: 0.002 }; // owner-tuned 2026-10-21 (low lunge)

// Choices the UI offers (value, label).
export const DISPLAY_OPTIONS = {
	resolution: [[1, 'Full (sharpest)'], [0.85, '85%'], [0.75, '75%'], [0.6, '60%'], [0.5, '50% (fastest)']],
	msaa: [[0, 'Off'], [2, '2×'], [4, '4×'], [8, '8×']],
	shadows: [['off', 'Off'], ['soft', 'Soft (1024 px map)'], ['sharp', 'Detailed (2048 px map)']],
};

export function loadDisplay() {
	try { return { ...DISPLAY_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...DISPLAY_DEFAULTS }; }
}
export function saveDisplay(d) {
	try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* storage blocked: the settings still apply for this session */ }
}
