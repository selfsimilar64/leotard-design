// Draws printed patterns: a WebGL 2 context of its own, a program a design (prints/designs.js, compiled at the start:
// render/warmup.js), and three things asked of it:
//   render(job)   a piece's layers of print, one over the other, as pixels for the fabric's print texture
//                 (render/prints.js hands them to either renderer: the fabric shader is not touched)
//   raster(...)   a design's sections over a box, read back, for the crystals that follow it (prints/field-stones.js)
//   picture(...)  the same as a small picture (the gallery's tiles, the pattern view)
// A context of its own because the app draws on WebGL or WebGPU (render/webgpu.js RENDERER) and a design is written once.
// Spec: knowledge/engineering/architecture/printed-patterns.md.
import { DESIGNS, definesOf } from './designs.js';
import { VERT, fieldFragment, STROKE_FRAGMENT, CAPSULE_VERT, CAPSULE_FRAG, RESOLVE_FRAG, MAX_MODS } from './glsl.js';

const IDENT = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
// the inverse of an affine 3 x 3 (columns first), and two of them one after the other (b after a)
export function invert3(m) {
	const a = m[0], c = m[1], b = m[3], d = m[4], e = m[6], f = m[7], det = a * d - b * c || 1e-20, ia = d / det, ib = -b / det, ic = -c / det, id = a / det;
	return new Float32Array([ia, ic, 0, ib, id, 0, -(ia * e + ib * f), -(ic * e + id * f), 1]);
}
export function mul3(b, a) {
	const o = new Float32Array(9);
	for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = b[r] * a[c * 3] + b[3 + r] * a[c * 3 + 1] + b[6 + r] * a[c * 3 + 2];
	return o;
}

export class PrintEngine {
	constructor() {
		this.programs = new Map(); // key -> { prog, u: name -> location, ok }
		this.targets = {};         // name -> { tex, fbo, w, h, depth? }
		this.edges = new WeakMap(); // a piece's room raster -> its texture
		this.strokeBufs = new WeakMap(); // a strokes' array -> its buffer
		this.failed = [];
		this.init();
	}

	init() {
		const cv = this.canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(4, 4) : document.createElement('canvas');
		const gl = this.gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
		if (!gl) throw new Error('Printed patterns need WebGL 2');
		cv.addEventListener?.('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
		cv.addEventListener?.('webglcontextrestored', () => { this.programs.clear(); this.targets = {}; this.edges = new WeakMap(); this.strokeBufs = new WeakMap(); this.lost = false; this.setup(); this.onRestored?.(); });
		this.setup();
	}
	setup() {
		const gl = this.gl;
		this.float = !!gl.getExtension('EXT_color_buffer_float');
		gl.getExtension('OES_texture_float_linear');
		this.parallel = gl.getExtension('KHR_parallel_shader_compile');
		// one triangle over the whole target
		this.quad = gl.createVertexArray();
		gl.bindVertexArray(this.quad);
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		// a capsule's quad, drawn once a stretch of line
		this.capsule = gl.createVertexArray();
		gl.bindVertexArray(this.capsule);
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(null);
		// (a 1 x 1 stand-in where a design reads no edge and no drawing)
		this.blank = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.blank);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
		gl.pixelStorei(gl.PACK_ALIGNMENT, 1); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	}

	// --- programs -------------------------------------------------------------------------------------------
	sourceOf(key) {
		if (key === '#strokes') return [VERT, STROKE_FRAGMENT];
		if (key === '#capsule') return [CAPSULE_VERT, CAPSULE_FRAG];
		if (key === '#resolve') return [VERT, RESOLVE_FRAG];
		const D = DESIGNS[key];
		return D ? [VERT, fieldFragment(D.glsl, definesOf(D))] : null;
	}
	// Starts a program compiling (the driver does it on its own threads where it can); program() waits for it.
	start(key) {
		let p = this.programs.get(key);
		if (p) return p;
		const gl = this.gl, src = this.sourceOf(key);
		if (!src) return null;
		const sh = (type, text) => { const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s); return s; };
		const vs = sh(gl.VERTEX_SHADER, src[0]), fs = sh(gl.FRAGMENT_SHADER, src[1]), prog = gl.createProgram();
		gl.attachShader(prog, vs); gl.attachShader(prog, fs);
		if (key === '#capsule') { gl.bindAttribLocation(prog, 0, 'aCorner'); gl.bindAttribLocation(prog, 1, 'aSeg'); gl.bindAttribLocation(prog, 2, 'aInset'); } else gl.bindAttribLocation(prog, 0, 'aPos');
		gl.linkProgram(prog);
		p = { key, prog, vs, fs, u: null, ok: null };
		this.programs.set(key, p);
		return p;
	}
	program(key) {
		const gl = this.gl, p = this.start(key);
		if (!p) return null;
		if (p.ok === null) {
			p.ok = gl.getProgramParameter(p.prog, gl.LINK_STATUS);
			if (!p.ok) {
				const log = gl.getShaderInfoLog(p.fs) || gl.getShaderInfoLog(p.vs) || gl.getProgramInfoLog(p.prog);
				this.failed.push({ key, log });
				console.error('Print shader ' + key + ' failed:\n' + log);
			} else {
				p.u = new Map();
				const n = gl.getProgramParameter(p.prog, gl.ACTIVE_UNIFORMS);
				for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p.prog, i), name = info.name.replace(/\[0\]$/, ''); p.u.set(name, gl.getUniformLocation(p.prog, name)); }
			}
			gl.deleteShader(p.vs); gl.deleteShader(p.fs);
		}
		return p.ok ? p : null;
	}
	// Every program compiled: resolves when the last one is ready (a frame's wait at a time, never blocking). -> how many failed
	async prepare(keys = [...Object.keys(DESIGNS), '#strokes', '#capsule', '#resolve']) {
		const gl = this.gl, list = keys.map((k) => this.start(k)).filter(Boolean);
		if (this.parallel) {
			for (let waited = 0; waited < 3000; waited++) {
				if (list.every((p) => p.ok !== null || gl.getProgramParameter(p.prog, this.parallel.COMPLETION_STATUS_KHR))) break;
				await new Promise((r) => setTimeout(r, 8));
			}
		}
		for (const p of list) this.program(p.key);
		return this.failed.length;
	}

	// --- targets --------------------------------------------------------------------------------------------
	target(name, w, h, format, depth = false) {
		const gl = this.gl;
		let t = this.targets[name];
		if (t && t.w >= w && t.h >= h && t.format === format) return t;
		if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); if (t.depth) gl.deleteRenderbuffer(t.depth); }
		// (a little room to grow: a piece's picture changes size as it is refined)
		const W = Math.max(w, t?.w ?? 0), H = Math.max(h, t?.h ?? 0);
		t = this.targets[name] = { w: W, h: H, format, tex: gl.createTexture(), fbo: gl.createFramebuffer(), depth: null };
		gl.bindTexture(gl.TEXTURE_2D, t.tex);
		gl.texStorage2D(gl.TEXTURE_2D, 1, format, W, H);
		const linear = format !== gl.RGBA32F;
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
		if (depth) {
			t.depth = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, t.depth);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, t.depth);
		}
		return t;
	}
	// A piece's distance to its edge as a texture (stones/pattern.js roomRaster: { S, ex, ey, er, dx0, dy0 }).
	edgeOf(room) {
		const gl = this.gl;
		if (!room) return { tex: this.blank, box: [0, 0, 1, 1] };
		let e = this.edges.get(room);
		if (!e) {
			const tex = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, room.ex, room.ey, 0, gl.RED, gl.FLOAT, room.S);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			// (a node's value belongs to its middle: the raster's node (i, j) is at dx0 + i er)
			e = { tex, box: [room.dx0 - room.er / 2, room.dy0 - room.er / 2, 1 / (room.ex * room.er), 1 / (room.ey * room.er)] };
			this.edges.set(room, e);
		}
		return e;
	}

	// --- drawing --------------------------------------------------------------------------------------------
	uniforms(p, L, pixToCloth, room, out = 0) {
		const gl = this.gl, u = p.u, f = (n, ...v) => { const l = u.get(n); if (l) gl['uniform' + v.length + 'f'](l, ...v); }, fv = (n, k, a) => { const l = u.get(n); if (l) gl['uniform' + k + 'fv'](l, a); }, m3 = (n, m) => { const l = u.get(n); if (l) gl.uniformMatrix3fv(l, false, m); };
		const i = (n, v) => { const l = u.get(n); if (l) gl.uniform1i(l, v); };
		m3('uPixToCloth', pixToCloth); m3('uClothToDesign', L.clothToDesign ?? IDENT); m3('uClothToFrame', L.clothToFrame ?? IDENT);
		// metres of the design's space a texel spans: the cloth's a texel, over the pattern's own scale
		f('uPx', Math.hypot(pixToCloth[0], pixToCloth[1]) / (L.sc || 1));
		fv('uWob', 2, L.wob ?? [0, 1]); f('uWidth', L.width ?? 0);
		fv('uBend0', 4, L.bend0 ?? [0, 0, 1, 0]); fv('uBend1', 4, L.bend1 ?? [1, 0, 1, 0]); fv('uSym', 3, L.sym ?? [0, 0, 1]);
		if (L.D) fv('uD', 1, L.D);
		if (L.V) fv('uV', 4, L.V);
		fv('uSeed', 2, L.seed ?? [0, 0]);
		fv('uCols', 4, L.cols);
		i('uOut', out);
		const M = L.mods;
		i('uModN', out ? 0 : M?.n ?? 0);
		if (M?.n) { fv('uModA', 4, M.A); fv('uModB', 4, M.B); fv('uModC', 4, M.C); fv('uModD', 4, M.D); }
		const e = this.edgeOf(L.edge || M?.edge ? room : null);
		gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, e.tex); i('uEdge', 0); fv('uEdgeBox', 4, e.box);
	}
	drawQuad() { const gl = this.gl; gl.bindVertexArray(this.quad); gl.drawArrays(gl.TRIANGLES, 0, 3); }

	// One layer over what is in the bound target. clothToPix: the inverse of pixToCloth.
	layer(L, W, H, pixToCloth, clothToPix, room, acc) {
		const gl = this.gl;
		if (L.kind === 'strokes') {
			const dist = this.distance(L, W, H, clothToPix);
			if (!dist) return;
			gl.bindFramebuffer(gl.FRAMEBUFFER, acc.fbo); gl.viewport(0, 0, W, H);
			gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			const p = this.program('#strokes');
			if (!p) return;
			gl.useProgram(p.prog);
			this.uniforms(p, L, pixToCloth, room);
			gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dist.tex); gl.uniform1i(p.u.get('uDist'), 1);
			// the cloth -> that picture: its texels, over the size it was made at
			const s = new Float32Array([1 / dist.w, 0, 0, 0, 1 / dist.h, 0, 0, 0, 1]);
			gl.uniformMatrix3fv(p.u.get('uClothToTex'), false, mul3(s, clothToPix));
			this.drawQuad();
			return;
		}
		const p = this.program(L.design);
		if (!p) return;
		gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.useProgram(p.prog);
		this.uniforms(p, L, pixToCloth, room);
		this.drawQuad();
	}

	// A drawn arrangement's lines and dots as the distance to the nearest, as far as the print's colours reach.
	distance(L, W, H, clothToPix) {
		const gl = this.gl, p = this.program('#capsule');
		if (!p || !this.float) return null;
		const t = this.target('dist', W, H, gl.R16F, true), reach = L.reach + 1.5 / Math.hypot(clothToPix[0], clothToPix[1]);
		gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); gl.viewport(0, 0, W, H);
		gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
		gl.clearColor(reach * 4, 0, 0, 1); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(p.prog);
		gl.uniform1f(p.u.get('uReach'), reach);
		// pixels -> clip space
		const clip = new Float32Array([2 / W, 0, 0, 0, 2 / H, 0, -1, -1, 1]), toClip = mul3(clip, clothToPix);
		gl.bindVertexArray(this.capsule);
		const S = L.strokes;
		for (const [data, n, toCloth] of [[S.segs, S.nSegs, S.toCloth], [S.dots, S.nDots, null]]) {
			if (!n) continue;
			let b = this.strokeBufs.get(data);
			if (!b) { b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n * 5), gl.DYNAMIC_DRAW); this.strokeBufs.set(data, b); this.liveBufs = (this.liveBufs ?? []).concat([[new WeakRef(data), b]]); } else gl.bindBuffer(gl.ARRAY_BUFFER, b);
			gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 20, 0); gl.vertexAttribDivisor(1, 1);
			gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16); gl.vertexAttribDivisor(2, 1);
			gl.uniformMatrix3fv(p.u.get('uToClip'), false, toCloth ? mul3(toClip, toCloth) : toClip);
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
		}
		gl.bindVertexArray(null);
		gl.disable(gl.DEPTH_TEST);
		this.sweepBufs();
		return t;
	}
	// buffers of drawings no longer held by anything
	sweepBufs() {
		if (!this.liveBufs || this.liveBufs.length < 24) return;
		this.liveBufs = this.liveBufs.filter(([ref, b]) => { if (ref.deref()) return true; this.gl.deleteBuffer(b); return false; });
	}

	// A piece's print. job: { W, H, pixToCloth (a texel's middle -> the flat cloth), base: the cloth's colour (linear),
	// layers (prints/ink.js designLayer, strokeLayer), room (the piece's edge raster, for what follows its edge) }.
	// out: Uint8Array(W * H * 4) filled bottom row first, straight colour (sRGB) and how much it covers. -> out, or null
	render(job, out) {
		const gl = this.gl;
		if (this.lost) return null;
		const { W, H, pixToCloth, layers, room } = job, clothToPix = invert3(pixToCloth);
		const acc = this.target('acc', W, H, this.float ? gl.RGBA16F : gl.RGBA8);
		gl.bindFramebuffer(gl.FRAMEBUFFER, acc.fbo); gl.viewport(0, 0, W, H);
		gl.disable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
		for (const L of layers) {
			if (!L.any) continue;
			gl.bindFramebuffer(gl.FRAMEBUFFER, acc.fbo); gl.viewport(0, 0, W, H);
			this.layer(L, W, H, pixToCloth, clothToPix, room, acc);
		}
		gl.disable(gl.BLEND);
		const res = this.target('res', W, H, gl.RGBA8), p = this.program('#resolve');
		if (!p) return null;
		gl.bindFramebuffer(gl.FRAMEBUFFER, res.fbo); gl.viewport(0, 0, W, H);
		gl.useProgram(p.prog);
		gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, acc.tex); gl.uniform1i(p.u.get('uAcc'), 0);
		gl.uniform3fv(p.u.get('uBase'), job.base ?? [0.5, 0.5, 0.5]);
		this.drawQuad();
		out ??= new Uint8Array(W * H * 4);
		gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, out);
		return out;
	}

	// A design's sections over a box of the frame's own space, for what follows them: Float32Array(W * H * 4), a node
	// (i, j) at 4 (j W + i): metres to the edge of what is printed in an accent (negative inside), metres to the edge of the
	// second accent, and 1 where the design is (0 past the end of a design of its own size). L: a designLayer made local.
	raster(L, W, H, pixToLocal, room = null) {
		const gl = this.gl;
		if (this.lost || !this.float) return null;
		const p = this.program(L.design);
		if (!p) return null;
		const t = this.target('ras', W, H, gl.RGBA32F);
		gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); gl.viewport(0, 0, W, H);
		gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
		gl.useProgram(p.prog);
		this.uniforms(p, L, pixToLocal, room, 1);
		this.drawQuad();
		const out = new Float32Array(W * H * 4);
		gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, out);
		return out;
	}

	// The same as render, as a picture: ImageData, top row first.
	picture(job) {
		const px = this.render(job);
		if (!px) return null;
		const { W, H } = job, img = new ImageData(W, H), row = W * 4;
		for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * row, (H - y) * row), y * row);
		return img;
	}
}

// The app's one engine, made when first asked for; null where there is no WebGL 2 (the tests' Node).
let shared;
export function printEngine() {
	if (shared !== undefined) return shared;
	try { shared = typeof document === 'undefined' && typeof OffscreenCanvas === 'undefined' ? null : new PrintEngine(); } catch (e) { console.warn(e.message); shared = null; }
	return shared;
}
export { MAX_MODS };
