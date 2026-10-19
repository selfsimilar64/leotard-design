// A procedural floral lace (Chantilly / re-embroidered style), drawn once on a tileable canvas:
// flowers and leaves filled with a dense toile, outlined with a raised cord (gimp), joined by
// trailing vines, with picot dots scattered over the net. The fabric shader reads it as
// 0 = net, ~0.7 = toile, 1 = cord (materials/fabric.js, uLace), so any fabric colour and net
// density can carry it. No scanned lace is in the owner's samples; a scan can replace this
// through the texture slots.
import * as THREE from 'three';

const N = 1024; // pixels per repeat (the fabric preset says how many metres that is)
let tex = null;

function rng(seed) {
	let s = seed >>> 0;
	return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const CORD = 'rgb(255,255,255)';
let TOILE = 'rgb(178,178,178)'; // replaced by a woven pattern when drawing (toile: a close net)

// Draw `fn` at the 9 wrapped offsets so motifs crossing the tile edge continue on the other side.
function wrapped(ctx, fn) {
	for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { ctx.save(); ctx.translate(dx, dy); fn(); ctx.restore(); }
}

function petalPath(ctx, len, wid) {
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.bezierCurveTo(wid, len * 0.25, wid * 0.9, len * 0.85, 0, len);
	ctx.bezierCurveTo(-wid * 0.9, len * 0.85, -wid, len * 0.25, 0, 0);
	ctx.closePath();
}

function flower(ctx, r, x, y, R) {
	const n = 5 + Math.floor(r() * 3), rot = r() * Math.PI * 2;
	ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
	for (let i = 0; i < n; i++) {
		ctx.save(); ctx.rotate((i / n) * Math.PI * 2);
		petalPath(ctx, R, R * (0.42 + r() * 0.12));
		ctx.fillStyle = TOILE; ctx.fill();
		ctx.lineWidth = Math.max(2.5, R * 0.07); ctx.strokeStyle = CORD; ctx.stroke();
		// a vein down the petal
		ctx.beginPath(); ctx.moveTo(0, R * 0.2); ctx.quadraticCurveTo(R * 0.05, R * 0.55, 0, R * 0.8);
		ctx.lineWidth = 1.6; ctx.stroke();
		ctx.restore();
	}
	ctx.beginPath(); ctx.arc(0, 0, R * 0.22, 0, Math.PI * 2); ctx.fillStyle = CORD; ctx.fill();
	ctx.restore();
}

function leaf(ctx, x, y, ang, L) {
	ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
	petalPath(ctx, L, L * 0.32);
	ctx.fillStyle = TOILE; ctx.fill();
	ctx.lineWidth = 2.5; ctx.strokeStyle = CORD; ctx.stroke();
	ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, L * 0.85); ctx.lineWidth = 1.5; ctx.stroke();
	ctx.restore();
}

export function drawLace(ctx, seed = 7) {
	const r = rng(seed);
	ctx.fillStyle = 'black'; ctx.fillRect(0, 0, N, N);
	// the toile inside motifs is itself a close weave: light threads on a denser ground
	const t = document.createElement('canvas'); t.width = t.height = 6;
	const tx = t.getContext('2d');
	tx.fillStyle = 'rgb(150,150,150)'; tx.fillRect(0, 0, 6, 6);
	tx.fillStyle = 'rgb(215,215,215)'; tx.fillRect(0, 0, 6, 2); tx.fillRect(0, 0, 2, 6);
	TOILE = ctx.createPattern(t, 'repeat');
	ctx.lineCap = 'round'; ctx.lineJoin = 'round';
	const blooms = [];
	for (let i = 0; i < 12; i++) blooms.push({ x: r() * N, y: r() * N, R: 50 + r() * 45 });
	for (let i = 0; i < 30; i++) blooms.push({ x: r() * N, y: r() * N, R: 18 + r() * 18 });
	// vines from each bloom towards a neighbour, leaves along them
	const vines = blooms.map((b, i) => {
		const o = blooms[(i * 5 + 3) % blooms.length];
		let dx = o.x - b.x, dy = o.y - b.y;
		if (dx > N / 2) dx -= N; if (dx < -N / 2) dx += N; if (dy > N / 2) dy -= N; if (dy < -N / 2) dy += N;
		const bend = (r() - 0.5) * 0.8;
		return { x0: b.x, y0: b.y, x1: b.x + dx, y1: b.y + dy, cx: b.x + dx / 2 - dy * bend, cy: b.y + dy / 2 + dx * bend, leaves: Array.from({ length: 5 + Math.floor(r() * 6) }, () => ({ t: 0.1 + r() * 0.8, side: r() < 0.5 ? -1 : 1, L: 22 + r() * 30 })) };
	});
	wrapped(ctx, () => {
		ctx.strokeStyle = CORD;
		for (const v of vines) {
			ctx.beginPath(); ctx.moveTo(v.x0, v.y0); ctx.quadraticCurveTo(v.cx, v.cy, v.x1, v.y1); ctx.lineWidth = 3; ctx.stroke();
			for (const l of v.leaves) {
				const t = l.t, x = (1 - t) * (1 - t) * v.x0 + 2 * t * (1 - t) * v.cx + t * t * v.x1, y = (1 - t) * (1 - t) * v.y0 + 2 * t * (1 - t) * v.cy + t * t * v.y1;
				const tx = 2 * (1 - t) * (v.cx - v.x0) + 2 * t * (v.x1 - v.cx), ty = 2 * (1 - t) * (v.cy - v.y0) + 2 * t * (v.y1 - v.cy);
				leaf(ctx, x, y, Math.atan2(ty, tx) - Math.PI / 2 + l.side * 0.9, l.L);
			}
		}
	});
	const r2 = rng(seed + 1);
	const picots = Array.from({ length: 420 }, () => ({ x: r2() * N, y: r2() * N, s: 1.2 + r2() * 1.6 }));
	wrapped(ctx, () => {
		const rf = rng(seed + 2);
		for (const b of blooms) flower(ctx, rf, b.x, b.y, b.R);
		ctx.fillStyle = CORD;
		for (const p of picots) { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); }
	});
}

export function laceTexture() {
	if (tex) return tex;
	const c = document.createElement('canvas'); c.width = c.height = N;
	drawLace(c.getContext('2d'));
	tex = new THREE.CanvasTexture(c);
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	tex.colorSpace = THREE.NoColorSpace; // a mask, not a colour
	tex.anisotropy = 8;
	return tex;
}
