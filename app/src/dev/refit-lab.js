// Re-fit tuning page (/refit.html, dev server only): runs the GPU re-fit (src/fit/refit.js) on the solver race's cases and shows how
// long it takes, where it stopped, and how far it is from the settled fit (the race's 120-second reference, pipeline/race/race.py).
// Cases: app/captures/refit/, written by pipeline/race/export_app.py (git-ignored: licensed body data).
//   window.lab: { refit, run(), check() } for driving it from the console.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Refit, DEFAULTS, loadCase } from '../fit/refit.js';

const $ = (id) => document.getElementById(id);
const BODY = 'young';
const MM = { tol: true, stick: true };  // fields shown in mm, stored in m
const FIELDS = ['window', 'tol', 'stat', 'maxSteps', 'cgIters', 'damp', 'mu', 'stick', 'grip'];
const lab = window.lab = {};
let device, refit, data, log = [], last = null;

// ---- view -------------------------------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
$('view').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9e7e1');
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
camera.position.set(0, 1.0, 3.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.95, 0);
scene.add(new THREE.HemisphereLight('#ffffff', '#b9b4aa', 1.6));
const sun = new THREE.DirectionalLight('#ffffff', 1.6);
sun.position.set(1.5, 3, 2.5);
scene.add(sun);
const bodyMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: '#c9b9a8', roughness: 0.8 }));
const garment = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }));
scene.add(bodyMesh, garment);
function resize() {
	const r = $('view').getBoundingClientRect();
	renderer.setSize(r.width, r.height, false);
	camera.aspect = r.width / r.height;
	camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

function showBody() {
	const A = data.arrays, seen = new Set(), idx = [];
	for (const t of [A.torso_tris, A.arm_tris]) {
		for (let f = 0; f < t.length; f += 3) {
			const key = [t[f], t[f + 1], t[f + 2]].sort((a, b) => a - b).join(',');
			if (!seen.has(key)) { seen.add(key); idx.push(t[f], t[f + 1], t[f + 2]); }
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(A.body, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	bodyMesh.geometry.dispose();
	bodyMesh.geometry = g;
	g.computeBoundingSphere();  // frame the posed body
	const { center, radius } = g.boundingSphere;
	controls.target.copy(center);
	camera.position.copy(center).add(new THREE.Vector3(0, 0.1, 1).multiplyScalar(radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05));
	const gg = new THREE.BufferGeometry();
	gg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(A.start), 3));
	gg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(A.start.length).fill(0.9), 3));
	gg.setIndex(Array.from(A.tris));
	garment.geometry.dispose();
	garment.geometry = gg;
}

const RAMP = ['#3b6fd8', '#4cc38a', '#f2d14b', '#e2533b'].map((c) => new THREE.Color(c));
function ramp(t) {
	t = Math.min(Math.max(t, 0), 1) * (RAMP.length - 1);
	const i = Math.min(Math.floor(t), RAMP.length - 2);
	return RAMP[i].clone().lerp(RAMP[i + 1], t - i);
}

async function paint() {
	if (!refit) return;
	const how = $('show').value;
	const x = how === 'start' ? data.arrays.start : await refit.positions(how === 'avg' && refit.steps > 0);
	const g = garment.geometry;
	g.attributes.position.array.set(x);
	g.attributes.position.needsUpdate = true;
	g.computeVertexNormals();
	const col = g.attributes.color.array, mode = $('colour').value;
	let values = null, top = 5;
	if (mode === 'error') values = distances(x, data.arrays.reference);
	if (mode === 'drift') { values = await refit.drift(); top = Math.max(0.05, Number($('tol').value) * 4); }
	$('legend').style.display = values ? '' : 'none';
	$('legendTitle').textContent = mode === 'drift' ? 'how far each point\'s average moved in the last window' : 'distance from the settled fit';
	$('legendMax').textContent = `${top} mm`;
	for (let i = 0; i < refit.n; i++) {
		const c = values ? ramp(values[i] / top) : new THREE.Color('#f1efe9');
		col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b;
	}
	g.attributes.color.needsUpdate = true;
}

// ---- numbers ----------------------------------------------------------------------------------------------------------
function distances(x, ref) {
	const d = new Float32Array(x.length / 3);
	for (let i = 0; i < d.length; i++) d[i] = 1000 * Math.hypot(x[3 * i] - ref[3 * i], x[3 * i + 1] - ref[3 * i + 1], x[3 * i + 2] - ref[3 * i + 2]);
	return d;
}
function stats(d) {
	const s = Float32Array.from(d).sort();
	let sum = 0;
	for (const v of d) sum += v;
	return { mean: sum / d.length, p95: s[Math.floor(0.95 * s.length)], max: s[s.length - 1] };
}
const f = (v, k = 2) => (v == null ? '-' : v.toFixed(k));

function settings() {
	const s = {};
	for (const k of FIELDS) {
		const el = $(k);
		s[k] = k === 'stat' ? el.value : Number(el.value) / (MM[k] ? 1000 : 1);
	}
	return s;
}
function fill(s) {
	for (const k of FIELDS) $(k).value = k === 'stat' ? s[k] : +(s[k] * (MM[k] ? 1000 : 1)).toPrecision(4);
}
function physicsNote() {
	const s = settings(), h = data.head;
	const off = Math.abs(s.mu - h.mu) > 1e-9 || Math.abs(s.stick - h.stick) > 1e-9;
	$('note').textContent = off ? `The settled fit was found with strength ${h.mu} and ${h.stick * 1000} mm of give, so with other friction settings the distance from it is partly a different answer, not error.` : '';
}

function chart() {
	const cv = $('chart'), r = cv.getBoundingClientRect();
	cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio;
	const x = cv.getContext('2d');
	x.scale(devicePixelRatio, devicePixelRatio);
	const W = r.width, H = r.height, pad = 26;
	x.clearRect(0, 0, W, H);
	x.font = '10px system-ui'; x.fillStyle = '#6b6a66'; x.strokeStyle = '#dcdad3';
	if (!log.length) { x.fillText('drift per window appears here after a run', 8, H / 2); return; }
	const tol = settings().tol * 1000;
	const ys = log.map((e) => Math.max(e.drift * 1000, 1e-4));
	const lo = Math.log10(Math.min(tol / 3, ...ys)), hi = Math.log10(Math.max(tol * 3, ...ys));
	const maxS = log[log.length - 1].steps;
	const px = (s) => pad + (W - pad - 6) * (s / maxS), py = (v) => H - 14 - (H - 22) * ((Math.log10(v) - lo) / (hi - lo || 1));
	x.beginPath(); x.moveTo(pad, py(tol)); x.lineTo(W - 6, py(tol)); x.setLineDash([3, 3]); x.stroke(); x.setLineDash([]);
	x.fillText(`${tol} mm`, 2, py(tol) + 3);
	x.strokeStyle = '#2f5d8a'; x.lineWidth = 1.5; x.beginPath();
	log.forEach((e, i) => (i ? x.lineTo(px(e.steps), py(ys[i])) : x.moveTo(px(e.steps), py(ys[i]))));
	x.stroke();
	x.fillStyle = '#6b6a66'; x.fillText('steps', W - 34, H - 2); x.fillText(String(maxS), px(maxS) - 16, H - 2);
	x.fillText('drift (mm, log)', pad, 10);
}

async function report(extra = '') {
	const s = settings();
	const xs = await refit.positions(false), xa = await refit.positions(true);
	const er = stats(distances(xs, data.arrays.reference)), ea = stats(distances(xa, data.arrays.reference));
	const e0 = stats(distances(data.arrays.start, data.arrays.reference));
	const end = log[log.length - 1];
	const stopped = end && end.steps < s.maxSteps && end.drift < s.tol;
	const py = data.head.python_ms_per_iteration;
	$('out').innerHTML = `<table>
		<tr><td>Steps</td><td>${refit.steps}${end ? (stopped ? ' (settled)' : ' (step limit)') : ''}</td></tr>
		<tr><td>Time</td><td>${last ? f(last.seconds, 3) + ' s' : '-'}</td></tr>
		<tr><td>Per step</td><td>${last ? f(1000 * last.seconds / Math.max(last.steps, 1), 2) + ' ms' : '-'}${py ? ` <small>(Python ${f(py, 1)})</small>` : ''}</td></tr>
		<tr><td>Drift at the end (${s.stat === 'max' ? 'every point' : s.stat + '%'})</td><td>${end ? f(end.drift * 1000, 3) + ' mm' : '-'}</td></tr>
		<tr><td>Points still drifting</td><td>${end ? end.over : '-'}</td></tr>
		<tr><td colspan="2" style="padding-top:8px;color:#6b6a66">Distance from the settled fit, mm (mean / 95% / worst)</td></tr>
		<tr><td>The start</td><td>${f(e0.mean)} / ${f(e0.p95)} / ${f(e0.max, 1)}</td></tr>
		<tr><td>Last step</td><td>${f(er.mean)} / ${f(er.p95)} / ${f(er.max, 1)}</td></tr>
		<tr><td>Last window's average</td><td>${f(ea.mean)} / ${f(ea.p95)} / ${f(ea.max, 1)}</td></tr>
	</table>${extra}`;
	chart();
	physicsNote();
}

// ---- actions ----------------------------------------------------------------------------------------------------------
function busy(on, msg = '') {
	for (const b of ['run', 'reset', 'check', 'defaults', 'case']) $(b).disabled = on;
	$('status').textContent = msg;
}

async function open(name) {
	busy(true, `Loading ${name}...`);
	data = await loadCase(`/__fs/captures/refit/${BODY}-${name}`);
	device ||= await Refit.device();
	device.lost?.then((i) => { $('status').textContent = 'GPU device lost: ' + i.message; });
	busy(true, 'Setting up on the GPU...');
	const t = performance.now();
	refit = lab.refit = new Refit(device, data, settings());
	await device.queue.onSubmittedWorkDone();
	showBody();
	log = []; last = null;
	await paint();
	await report();
	busy(false, `${data.head.n.toLocaleString()} points; start: ${data.head.start}. Set up in ${f((performance.now() - t) / 1000)} s.`);
}

lab.run = async function run() {
	busy(true, 'Running...');
	refit.setSettings(settings());
	refit.reset();
	log = [];
	await refit.run({ steps: 1 });  // compile and warm up, outside the timing
	refit.reset();
	last = await refit.run({ onWindow: (e) => { $('status').textContent = `Running... ${e.steps} steps, drift ${f(e.drift * 1000, 3)} mm`; } });
	log = last.log;
	await paint();
	await report();
	busy(false, '');
	return last;
};

// The port against Python's own iterates (export_app.py: local/global, 10 CG, friction, from the same start), at default settings.
lab.check = async function check() {
	busy(true, 'Checking against Python...');
	const keep = settings();
	refit.setSettings({ ...DEFAULTS, cgIters: 10 });
	refit.reset();
	const rows = [];
	for (const [k, ref] of [[1, data.arrays.python_1], [20, data.arrays.python_20]]) {
		await refit.run({ steps: k });
		const d = stats(distances(await refit.positions(false), ref));
		rows.push(`<tr><td>After ${k} step${k > 1 ? 's' : ''}</td><td>${f(d.mean, 5)} / ${f(d.max, 4)}</td></tr>`);
	}
	refit.setSettings(keep);
	await paint();
	last = null; log = [];
	await report(`<table style="margin-top:8px"><tr><td colspan="2" style="color:#6b6a66">Against Python's own run, mm (mean / worst)</td></tr>${rows.join('')}</table>`);
	busy(false, '');
};

lab.open = (name) => { $('case').value = name; return open(name); };
lab.set = (s) => { fill({ ...settings(), ...s }); physicsNote(); };
$('run').onclick = () => lab.run();
$('check').onclick = () => lab.check();
$('reset').onclick = async () => { refit.reset(); log = []; last = null; await paint(); await report(); };
$('defaults').onclick = () => { fill(DEFAULTS); physicsNote(); };
$('case').onchange = () => open($('case').value);
$('show').onchange = paint;
$('colour').onchange = paint;
for (const k of FIELDS) $(k).addEventListener('change', physicsNote);

resize();
fill(DEFAULTS);
const cases = await (await fetch(`/__fs/captures/refit/${BODY}-cases.json`)).json();
$('case').innerHTML = cases.map((c) => `<option>${c}</option>`).join('');
$('case').value = cases.includes('back-arched') ? 'back-arched' : cases[0];
await open($('case').value);
