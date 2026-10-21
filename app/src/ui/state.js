// UI state that is not part of the design: selection, active tool, view layout, read-outs.
import { signal } from '@preact/signals';

export const rev = signal(0);              // bumped on every document change; components read it to re-render
export const selection = signal(null);     // { kind: 'curve' | 'panel' | 'stone-gen' | ..., id }
export const tool = signal('orbit');       // active tool id (tools/registry.js)
export const layout = signal('3d');        // '3d' | 'flat' | 'split'
export const stats = signal({});
export const display = signal(null);       // display settings of this machine (render/display.js), set at start-up
export const toast = signal(null);         // { text, kind } shown briefly

let toastTimer;
export function notify(text, kind = 'info') {
	toast.value = { text, kind };
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => { toast.value = null; }, kind === 'error' ? 6000 : 2500);
}
