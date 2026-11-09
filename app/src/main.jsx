import { render } from 'preact';
import { app } from './instance.js';
import { withKnownPose } from './app.js';
import { Shell, useShortcuts } from './ui/Shell.jsx';
import { rev, stats, display, hideMannequin, libraryOpen, savedRev, fitStatus, compiling, settle } from './ui/state.js';
import { warmEarly, warmUp } from './render/warmup.js';
import { curtainStep, curtainNote, liftCurtain } from './ui/curtain.js';
import { loadDisplay, fitOptions } from './render/display.js';
import { Viewport } from './render/viewport.js';
import { Engine } from './render/engine.js';
import { loadMannequins } from './body/mannequin.js';
import { buildReference } from './body/reference.js';
import { ToolController } from './ui/tools.js';
import './ui/styles.css';

app.onChange(() => { rev.value++; });

const quick = new URLSearchParams(location.search).has('quick'); // (reveal)
let started = false;
async function start(el) {
	if (started) return;
	started = true;
	const viewport = new Viewport(el);
	// Nothing is drawn until the first finished frame (reveal; the curtain stays over the page till then). Drawing as the parts
	// arrived compiled the fabric for the stand-in lighting, then again for the studio's once its photograph was in (2026-11-08).
	viewport.holds.add('startup');
	viewport.applyDisplay(display.value = loadDisplay());
	viewport.applyScene(app.doc.scene); // the studio's photograph loads beside the bodies (the engine applies the scene again)
	// every fabric's shaders compiled from when the studio is lit, beside the bodies and the design (render/warmup.js)
	if (!quick) warmEarly(viewport);
	// a cold shader cache (the first start after a shader or the browser changed) takes ~20 s, a warm one ~8.5 s (2026-11-09,
	// dev server, GTX 1650); most of it is now spent before the last step, so the note counts from the start (reveal clears it)
	const long = setTimeout(() => curtainNote('Setting up every fabric once after an update. Afterwards it starts quickly.'), 12000);
	curtainStep('Dressing the mannequin', 0.25);
	const t0 = performance.now();
	const body = await loadMannequins();
	performance.mark?.('start: bodies loaded');
	const d = display.value;
	body.liftOpt = { taut: d.liftTaut, max: d.liftMax, reach: d.liftReach, method: d.liftMethod, ball: d.liftBall, seat: d.liftSeat, seatAlong: 1 / d.liftSeatAcross };
	const engine = new Engine(viewport, body, buildReference(body));
	engine.fitted.options = { ...engine.fitted.options, ...fitOptions(d) };
	engine.fitted.listeners.add((st) => { fitStatus.value = st; });
	viewport.onCompiling.add((on) => { compiling.value = on; });
	settle.wait = () => engine.settled(); // a slow change says it is working until its result is on show (ui/state.js slow)
	engine.timing.load = performance.now() - t0;
	performance.mark?.('start: engine made');
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
	performance.mark?.('start: design applied');
	await reveal(engine);
	clearTimeout(long);
}

// The first frame, and the curtain lifted off it: the studio lit, a fitted garment fitted, then every shader the app can draw
// with compiled off the page (render/warmup.js, its fabrics' part started in start; owner, 2026-11-09: nothing compiles once
// working), so the first frame is the finished design, the curtain's animation never stops, and no later change waits for a shader. ?quick in the address
// compiles only what the design shows (render/viewport.js prepare), for look-dev reloads after a shader change; anything
// else then compiles when first shown, the stage's busy note saying so.
async function reveal(engine) {
	const v = engine.viewport, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	curtainStep('Lighting the studio', 0.5);
	await v.envReady;
	curtainStep('Fitting the leotard', 0.62);
	const t = performance.now();
	while ((engine.pendingBody || engine.fitted.loading || [...v.holds].some((h) => h !== 'startup')) && performance.now() - t < 30000) await sleep(50);
	curtainStep('Preparing every fabric', 0.7);
	if (quick) await v.prepare();
	else await warmUp(engine, ({ done, total }) => curtainStep('Preparing every fabric', 0.7 + 0.28 * (done / total)));
	v.shaderKey = null; // (the frames look again for themselves from here)
	v.holds.delete('startup');
	curtainStep('Ready', 1);
	// lifted once the first frame is on screen (or soon anyway: a hidden page draws no frames)
	await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 500); });
	liftCurtain();
}

function Root() {
	useShortcuts();
	return <Shell onViewport={start} />;
}

render(<Root />, document.getElementById('root'));
