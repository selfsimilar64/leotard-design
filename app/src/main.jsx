import { render } from 'preact';
import { app } from './instance.js';
import { withKnownPose } from './app.js';
import { Shell, useShortcuts } from './ui/Shell.jsx';
import { rev, stats, display, hideMannequin, libraryOpen, savedRev } from './ui/state.js';
import { loadDisplay, fitOptions } from './render/display.js';
import { Viewport } from './render/viewport.js';
import { Engine } from './render/engine.js';
import { loadMannequins } from './body/mannequin.js';
import { buildReference } from './body/reference.js';
import { ToolController } from './ui/tools.js';
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
	const d = display.value;
	body.slide = d.slide; body.slideOpt = { ...body.slideOpt, shrink: d.slideTension, grip: d.slideGrip };
	body.liftOpt = { taut: d.liftTaut, max: d.liftMax, reach: d.liftReach, method: d.liftMethod, ball: d.liftBall, seat: d.liftSeat, seatAlong: 1 / d.liftSeatAcross };
	const engine = new Engine(viewport, body, buildReference(body));
	engine.fitted.options = { ...engine.fitted.options, ...fitOptions(d) };
	engine.timing.load = performance.now() - t0;
	// a resumed autosave may name a dropped pose: fix it before the engine shows the design
	if (!app.fresh && withKnownPose(app.doc) !== app.doc) app.load(app.doc);
	app.attach(engine);
	app.tools = new ToolController(app, engine);
	hideMannequin.subscribe((v) => engine.setBodyHidden(v));
	// a first start shows the plain tank under the designs library, to start from
	if (app.fresh) { app.new(); libraryOpen.value = true; }
	else if (app.file) savedRev.value = app.revision;
	rev.value++;
	setInterval(() => { stats.value = { ...viewport.stats, stones: engine.stoneCount?.() ?? 0 }; }, 500);
}

function Root() {
	useShortcuts();
	return <Shell onViewport={start} />;
}

render(<Root />, document.getElementById('root'));
