// Logos and lettering (document `decals`): text in any installed font, or an image, printed,
// foiled, holo-foiled, glittered or flocked onto the garment. Each layer's decals (up to 4) share
// one atlas texture; the fabric shader projects each onto the reference body through a box
// (materials/fabric.js, uDecalM): x across the art, y up it, z through the cloth, so a decal
// crosses seams and panels like a heat-transfer print does.
import * as THREE from 'three';
import { fromSP } from '../body/surface.js';

export const DECAL_LOOKS = { print: 0, foil: 1, holo: 2, glitter: 3, flock: 4 };
const ROUGH = { print: 0.55, foil: 0.2, holo: 0.2, glitter: 0.3, flock: 0.9 };
const AT = 2048, SLOT = 512, MAX = 4, DEPTH = 0.03;

export class DecalSet {
	constructor() {
		this.layers = new Map(); // layer id -> { canvas, texture, count, M, rect, look, colour, sig }
		this.images = new Map(); // src -> HTMLImageElement (loaded)
		this.onChange = null;    // called when an image finishes loading (the views re-apply)
	}

	// Rebuild every layer's decal uniforms from the document. surf: the reference garment surface.
	build(doc, surf) {
		const byLayer = new Map();
		for (const d of doc.decals ?? []) if (!d.hidden) { const l = d.layer ?? 'L0'; if (!byLayer.has(l)) byLayer.set(l, []); byLayer.get(l).push(d); }
		for (const id of this.layers.keys()) if (!byLayer.has(id)) this.layers.get(id).count = 0;
		for (const [id, list] of byLayer) this.buildLayer(id, list.slice(0, MAX), surf);
	}

	forLayer(id) { return this.layers.get(id) ?? null; }

	buildLayer(id, list, surf) {
		let L = this.layers.get(id);
		if (!L) {
			const canvas = document.createElement('canvas'); canvas.width = canvas.height = AT;
			const texture = new THREE.CanvasTexture(canvas);
			texture.flipY = false; texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
			L = { canvas, texture, count: 0, M: [0, 1, 2, 3].map(() => new THREE.Matrix4()), rect: [0, 1, 2, 3].map(() => new THREE.Vector4()), look: [0, 1, 2, 3].map(() => new THREE.Vector4()), colour: [0, 1, 2, 3].map(() => new THREE.Color()), sig: '' };
			this.layers.set(id, L);
		}
		L.count = list.length;
		const ctx = L.canvas.getContext('2d');
		const artSig = JSON.stringify(list.map((d) => [d.text, d.font, d.weight, d.src, this.images.has(d.src)]));
		const redraw = artSig !== L.sig;
		if (redraw) ctx.clearRect(0, 0, AT, AT);
		list.forEach((d, i) => {
			const y0 = i * SLOT;
			const art = redraw ? this.drawArt(ctx, d, y0) : L.art?.[i];
			if (redraw) (L.art ??= [])[i] = art;
			// rect with v flipped: the shader's +y (up the art) reads towards the slot's top row
			L.rect[i].set(art.x / AT, (y0 + art.y + art.h) / AT, art.w / AT, -art.h / AT);
			const W = d.size ?? 0.08, H = W * art.h / Math.max(art.w, 1);
			this.frame(L.M[i], d, surf, W, H);
			L.look[i].set(DECAL_LOOKS[d.look ?? 'print'] ?? 0, d.rough ?? ROUGH[d.look ?? 'print'] ?? 0.5, d.src && !d.colour ? 1 : 0, 0);
			L.colour[i].set(d.colour ?? '#ffffff');
		});
		if (redraw) { L.sig = artSig; L.texture.needsUpdate = true; }
	}

	// Draw a decal's art into its slot (white on transparent for text; an image as it is),
	// returning the tight rectangle it covers in the atlas.
	drawArt(ctx, d, y0) {
		const pad = 12;
		if (d.src) {
			const img = this.images.get(d.src);
			if (!img) { this.load(d.src); return { x: 0, y: 0, w: 1, h: 1 }; }
			const k = Math.min((AT - pad * 2) / img.width, (SLOT - pad * 2) / img.height);
			const w = img.width * k, h = img.height * k;
			ctx.drawImage(img, pad, y0 + pad, w, h);
			return { x: pad, y: pad, w, h };
		}
		const text = d.text ?? 'Logo', lines = text.split('\n');
		let px = 380 / lines.length;
		const font = (s) => `${d.weight ?? 'normal'} ${s}px ${d.font ? JSON.stringify(d.font) + ', ' : ''}cursive`;
		ctx.font = font(px);
		const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
		if (widest > AT - pad * 2) { px *= (AT - pad * 2) / widest; ctx.font = font(px); }
		const mets = lines.map((l) => ctx.measureText(l));
		const asc = Math.max(...mets.map((m) => m.actualBoundingBoxAscent)), desc = Math.max(...mets.map((m) => m.actualBoundingBoxDescent));
		const lineH = asc + desc + px * 0.1, w = Math.max(...mets.map((m) => m.actualBoundingBoxLeft + m.actualBoundingBoxRight));
		ctx.fillStyle = 'white'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
		lines.forEach((l, k) => ctx.fillText(l, pad + w / 2, y0 + pad + asc + k * lineH));
		return { x: pad, y: pad, w: Math.ceil(w), h: Math.ceil(lineH * lines.length) };
	}

	load(src) {
		if (this.images.has(src) || this.loading?.has(src)) return;
		(this.loading ??= new Set()).add(src);
		const img = new Image();
		img.onload = () => { this.images.set(src, img); this.loading.delete(src); this.onChange?.(); };
		img.onerror = () => { this.loading.delete(src); console.warn('decal image failed to load', src); };
		img.src = src;
	}

	// The box from reference space to the decal: right/W, up/H, normal/DEPTH about the centre.
	frame(M, d, surf, W, H) {
		const sp = fromSP(d.at.sp), P = surf.pos(sp), N = surf.faceNormal(sp.f).clone().normalize();
		const up = new THREE.Vector3(0, 1, 0).addScaledVector(N, -N.y);
		if (up.lengthSq() < 1e-6) up.set(0, 0, -1);
		up.normalize().applyAxisAngle(N, -THREE.MathUtils.degToRad(d.rotate ?? 0));
		const R = new THREE.Vector3().crossVectors(up, N).normalize();
		M.set(
			R.x / W, R.y / W, R.z / W, -R.dot(P) / W,
			up.x / H, up.y / H, up.z / H, -up.dot(P) / H,
			N.x / DEPTH, N.y / DEPTH, N.z / DEPTH, -N.dot(P) / DEPTH,
			0, 0, 0, 1,
		);
	}
}
