// Scanned fabric textures (the owner's licensed VMOD downloads in assets/textures/vmod, served by
// the dev file bridge at /textures and never bundled). Each fabric is a map set at a stated
// real-world tile size (assets/textures/vmod/manifest.json, from the PNGs' pHYs chunk), applied in
// a panel's cloth-space UVs (metres), so the weave or print is at its true scale.
// Pipeline notes: knowledge/engineering/rendering/fabric-shading/texture-import-pipeline.md.
import * as THREE from 'three';

const ROOT = '/textures/vmod/';
const MAX = 2048; // texels per side on the GPU (the 4096 scans are downsampled)

export class TextureLibrary {
	constructor(renderer) {
		this.renderer = renderer;
		this.sets = new Map();   // id -> Promise<set>
		this.manifest = null;
	}

	async list() {
		if (!this.manifest) {
			const r = await fetch(ROOT + 'manifest.json').catch(() => null);
			this.manifest = r && r.ok ? JSON.parse((await r.text()).replace(/^﻿/, '')) : { fabrics: [] };
		}
		return this.manifest.fabrics;
	}

	async info(id) { return (await this.list()).find((f) => f.id === id) ?? null; }

	// -> { id, tile: [w, h] metres, base, normal, rough, alpha, mtl, mask, maskCount, lum, hasAlpha, hasMetal }
	get(id) {
		let p = this.sets.get(id);
		if (!p) { p = this.load(id); this.sets.set(id, p); p.catch(() => this.sets.delete(id)); }
		return p;
	}

	async load(id) {
		const f = await this.info(id);
		if (!f) throw new Error(`No fabric texture ${id}`);
		const url = (k) => (f.maps[k] ? ROOT + f.folder + '/' + f.maps[k] : null);
		const aniso = this.renderer.capabilities.getMaxAnisotropy();
		const tex = async (k, srgb) => {
			const u = url(k);
			if (!u) return null;
			const bmp = await bitmap(u);
			const t = new THREE.Texture(bmp);
			t.wrapS = t.wrapT = THREE.RepeatWrapping;
			t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
			t.anisotropy = Math.min(aniso, 8);
			t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
			t.flipY = false; // the bitmap is already flipped (OpenGL convention, as the normal maps expect)
			t.needsUpdate = true;
			t.userData.bitmap = bmp;
			return t;
		};
		const [base, normal, rough, alpha, mtl] = await Promise.all([tex('base_map', true), tex('normal_map'), tex('rough_map'), tex('alpha_map'), tex('mtl_map')]);
		const stats = (t) => t ? averageOf(t.userData.bitmap) : null;
		const masks = Object.keys(f.maps).filter((k) => k.startsWith('colormaskmap_')).sort((a, b) => +a.split('_')[1] - +b.split('_')[1]).slice(0, 4);
		const mask = masks.length ? await packMasks(masks.map(url)) : null;
		const set = { id, name: f.name, look: f.look, tile: f.tileMetres, base, normal, rough, alpha, mtl, mask, maskCount: masks.length };
		const a = stats(alpha), m = stats(mtl), b = stats(base);
		set.hasAlpha = !!a && a.mean < 0.97; // sheer (tulle, organza, lace); opaque knits have stray dark texels only
		set.hasMetal = !!m && m.max > 0.1;
		set.lum = b ? b.lum : 1;
		return set;
	}
}

async function bitmap(url) {
	const r = await fetch(url);
	if (!r.ok) throw new Error(`${url}: ${r.status}`);
	const blob = await r.blob();
	const probe = await createImageBitmap(blob);
	const s = Math.min(1, MAX / Math.max(probe.width, probe.height));
	if (s === 1) { probe.close(); return createImageBitmap(blob, { imageOrientation: 'flipY' }); }
	const w = Math.round(probe.width * s), h = Math.round(probe.height * s);
	probe.close();
	return createImageBitmap(blob, { imageOrientation: 'flipY', resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
}

// Mean luminance, min and max of the red channel (on a 64-pixel thumbnail).
function averageOf(bmp) {
	const c = new OffscreenCanvas(64, 64), x = c.getContext('2d');
	x.drawImage(bmp, 0, 0, 64, 64);
	const d = x.getImageData(0, 0, 64, 64).data;
	let lum = 0, mn = 1, mx = 0, mean = 0;
	for (let i = 0; i < d.length; i += 4) {
		const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
		lum += 0.2126 * r + 0.7152 * g + 0.0722 * b; mn = Math.min(mn, r); mx = Math.max(mx, r); mean += r;
	}
	return { lum: lum / (d.length / 4), min: mn, max: mx, mean: mean / (d.length / 4) };
}

// Up to four grayscale colour masks packed into one RGBA texture (mask i in channel i).
async function packMasks(urls) {
	const bmps = await Promise.all(urls.map(bitmap));
	const w = bmps[0].width, h = bmps[0].height, c = new OffscreenCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true });
	const out = new ImageData(w, h);
	bmps.forEach((b, i) => {
		x.clearRect(0, 0, w, h); x.drawImage(b, 0, 0, w, h);
		const d = x.getImageData(0, 0, w, h).data;
		for (let p = 0; p < w * h; p++) out.data[p * 4 + i] = d[p * 4];
		b.close();
	});
	for (let p = bmps.length; p < 4; p++) for (let q = 0; q < w * h; q++) out.data[q * 4 + p] = p === 3 ? 0 : out.data[q * 4 + p];
	const t = new THREE.DataTexture(out.data, w, h, THREE.RGBAFormat);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
	t.needsUpdate = true;
	return t;
}
