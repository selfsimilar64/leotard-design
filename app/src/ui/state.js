// UI state that is not part of the design: selection, panel tab, active tool, view layout,
// what the view hides, read-outs, and this computer's interface preferences.
import { signal } from '@preact/signals';
import { targetOf } from '../doc/symmetry.js';

// Bumped on every document change; components read it to re-render. A component that reads any signal is memoized by
// @preact/signals: it redraws only for its signals or a changed prop, and records in the document are edited in place, so
// a component that shows a record and reads another signal must read rev too.
export const rev = signal(0);
export const stonesRun = signal(0);        // bumped when a drag's stones have been laid (a frame after its command)
export const selection = signal(null);     // { kind: 'curves' | 'panels' | 'straps' | 'stones' | 'decals' | ..., id }
export const tab = signal('shape');        // the panel's tab: 'shape' | 'fabric' | 'sparkle' | 'stage'
export const drawnLines = signal(null);    // the overlay tool: { lines, areas } waiting for an area to be picked (ui/tools.js)
export const tool = signal('move');        // what a click on the model does (ui/toolbar.js, ui/tools.js)
export const layout = signal('3d');        // '3d' | 'split' (the pattern pieces beside the model) | 'flat'; kept in prefs.layout (below)
export const stats = signal({});
export const display = signal(null);       // display settings of this machine (render/display.js), set at start-up
export const toast = signal(null);         // { text, kind } shown briefly
export const designsRev = signal(0);       // bumped when designs/ changes (a save), so the library lists it
export const showStats = signal(false);    // the frame-rate read-out over the view (Settings)
export const hideOverlay = signal(false);  // hide the editing lines and points to preview the look (H)
export const showHandles = signal(true);   // a chosen pattern's handles on the body (the view bar's switch)
export const patternFocus = signal('frame'); // what a chosen pattern's handles work on: 'frame' | 'plane' | a modifier's id (stones/handles.js)
export const hideMannequin = signal(false); // the leotard floats with the mannequin hidden (M)
export const libraryOpen = signal(false);  // the designs library over the whole window
export const fitStatus = signal({ state: 'off' }); // a fitted garment's re-fit (render/fitted.js status): the busy note and the settings panel
export const busy = signal(null);          // { text } while a slow change (a new shape, a design) is applied
export const savedRev = signal(-1);        // the design's revision when it was last saved or opened

// Which tab shows a selected part: a piece's fabric, a line's or strap's shape, stones and logos.
const TAB_OF = { panels: 'fabric', curves: 'shape', straps: 'shape', trims: 'shape', stones: 'sparkle', placed: 'sparkle', decals: 'sparkle' };
selection.subscribe((s) => { if (s && TAB_OF[s.kind]) tab.value = TAB_OF[s.kind]; patternFocus.value = 'frame'; });

let toastTimer;
export function notify(text, kind = 'info') {
	toast.value = { text, kind, at: Date.now() };
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => { toast.value = null; }, kind === 'error' ? 6000 : 2600);
}

// Runs an edit through the Mirror toggle (doc/symmetry.js). When it splits a pair and lands on the
// mirror image's new record, the selection moves there. Returns the command's own result.
export function edit(app, cmd, side) {
	const t = targetOf(cmd), sel = selection.value, mine = t && sel?.id === t.id;
	const r = app.edit(cmd, side ?? (mine ? sel.side : undefined));
	if (r.split) {
		notify('Split from its pair: the two sides are now separate');
		// (the same thing goes on being worked on, on its new record)
		const focus = patternFocus.value;
		if (mine && cmd.op !== 'curve.remove') selection.value = { kind: sel.kind, id: r.id };
		patternFocus.value = focus;
	}
	return r.result;
}

// Runs a change that holds the page for a while (a new neckline re-cuts and re-flattens the
// garment, ~1-5 s) after the interface has shown that it is working on it.
export async function slow(text, fn) {
	busy.value = { text };
	await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
	try { return await fn(); } finally { busy.value = null; }
}

// Interface preferences of this computer (not the design's): kept in the browser.
const PREFS = 'leotard.ui.v1';
const PREF_DEFAULTS = { followCamera: true, shapeOpen: 'neck', sections: {} };
function loadPrefs() { try { return { ...PREF_DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS) ?? '{}') }; } catch { return { ...PREF_DEFAULTS }; } }
export const prefs = signal(loadPrefs());
if (['3d', 'split', 'flat'].includes(prefs.value.layout)) layout.value = prefs.value.layout; // the layout last used
export function setPref(k, v) {
	prefs.value = { ...prefs.value, [k]: v };
	try { localStorage.setItem(PREFS, JSON.stringify(prefs.value)); } catch { /* storage blocked: kept for this session */ }
}
