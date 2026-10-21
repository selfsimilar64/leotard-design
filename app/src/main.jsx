import { render } from 'preact';
import { app } from './instance.js';
import { Shell, useShortcuts } from './ui/Shell.jsx';
import { rev, stats, display } from './ui/state.js';
import { loadDisplay } from './render/display.js';
import { Viewport } from './render/viewport.js';
import { Engine } from './render/engine.js';
import { loadMannequins } from './body/mannequin.js';
import { buildReference } from './body/reference.js';
import { ToolController } from './ui/tools.js';
import './ui/inspect-garment.jsx';
import './ui/inspect-decals.jsx';
import './ui/styles.css';

app.onChange(() => { rev.value++; });

let started = false;
async function start(el) {
	if (started) return;
	started = true;
	const viewport = new Viewport(el);
	viewport.applyDisplay(display.value = loadDisplay());
	const t0 = performance.now();
	const body = await loadMannequins();
	const engine = new Engine(viewport, body, buildReference(body));
	engine.timing.load = performance.now() - t0;
	app.attach(engine);
	app.tools = new ToolController(app, engine);
	rev.value++;
	setInterval(() => { stats.value = { ...viewport.stats, stones: engine.stoneCount?.() ?? 0 }; }, 500);
}

function Root() {
	useShortcuts();
	return <Shell onViewport={start} />;
}

render(<Root />, document.getElementById('root'));
