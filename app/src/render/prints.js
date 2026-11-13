// The printed patterns on the leotard: per piece, every pattern on it that is made as print (prints/designs.js
// printsInk), one over the other in the list's order, drawn by the print engine (prints/engine.js) into a picture of the
// piece's flat cloth and shown through the fabric's own print slot (materials/fabric.js tPrint: straight colour and how
// much of it covers the cloth, read in the fabric's pattern space). The fabric shader is not touched, so nothing compiles
// when a print appears and both renderers show it. A picture is drawn again only when something it shows changes.
// Spec: knowledge/engineering/architecture/printed-patterns.md.
import * as THREE from 'three';
import { printEngine } from '../prints/engine.js';
import { designLayer, strokeLayer, inkOf, hexToLinear, isDesign, printsInk } from '../prints/ink.js';
import { patternParams, patternStrokes, pieceMiddle, roomRaster } from '../stones/pattern.js';

const TEXEL = 0.00025, MOST = 2048, MOST_LIVE = 1024; // the finest a picture is drawn (metres a texel), and its longest side

export class PrintView {
	constructor(engine) {
		this.engine = engine;
		this.pieces = new Map(); // panel id -> { key, tex, data, W, H, size: [w, h], offset: [x, y], fine }
		this.pending = false;    // a piece was not flat yet: asked again when it is
		this.ms = 0;
		this.timing = null;
	}

	// The patterns printed on each piece, in the list's order.
	static byPiece(doc) {
		const out = new Map();
		for (const g of doc.stones) {
			if (g.kind !== 'pattern' || g.hidden || !g.on?.panel || !printsInk(g.params)) continue;
			let l = out.get(g.on.panel);
			if (!l) out.set(g.on.panel, l = []);
			l.push(g);
		}
		return out;
	}

	// What a piece's material shows as its print, or null: render/garment.js applyMaterials asks.
	of(panelId) { return this.pieces.get(panelId) ?? null; }

	// live: mid-drag (a coarser picture, refined when the drag ends).
	sync(doc, live = false) {
		const e = this.engine, by = PrintView.byPiece(doc), eng = by.size || this.pieces.size ? printEngine() : null, t0 = performance.now();
		this.pending = false;
		let drew = false, gone = false;
		for (const [id, rec] of this.pieces) if (!by.has(id) || doc.panels.find((p) => p.id === id)?.removed) { rec.tex.dispose(); this.pieces.delete(id); this.show(id, null); gone = true; }
		if (!eng) return;
		for (const [id, gens] of by) {
			const panel = doc.panels.find((p) => p.id === id), s = panel?.stack?.[0];
			if (!panel || panel.removed || !s) continue;
			const cloth = e.clothOf(id), piece = cloth?.piece;
			if (!piece) { this.pending = true; continue; }
			let rec = this.pieces.get(id);
			const key = JSON.stringify([gens, s.colour, s.grain ?? 0, piece.x0, piece.x1, piece.y0, piece.y1, e.stoneGeoRev]);
			if (rec && rec.key === key && rec.piece === piece && (live || rec.fine)) continue;
			rec = this.draw(eng, rec, gens, piece, s, live);
			if (!rec) continue;
			rec.key = key; rec.piece = piece;
			this.pieces.set(id, rec);
			this.show(id, rec);
			drew = true;
		}
		if (drew) { this.ms = performance.now() - t0; e.viewport.dirty?.(); }
		if (drew || gone) this.onDrawn?.(); // (the pattern view shows them too: ui/FlatView.jsx)
	}

	draw(eng, rec, gens, piece, s, live) {
		const e = this.engine, g = s.grain ?? 0, cg = Math.cos(g), sg = Math.sin(g), [sx, sy] = piece.shift ?? [0, 0];
		// the piece in the fabric's pattern space: its flat metres as the mesh carries them (a fitted piece's are its file's own,
		// stones/fitted-cloth.js shift), turned by the grain (materials/fabric.js: q)
		let qx0 = Infinity, qx1 = -Infinity, qy0 = Infinity, qy1 = -Infinity;
		for (const [u, v] of [[piece.x0, piece.y0], [piece.x1, piece.y0], [piece.x0, piece.y1], [piece.x1, piece.y1]]) {
			const x = cg * (u + sx) - sg * (v + sy), y = sg * (u + sx) + cg * (v + sy);
			qx0 = Math.min(qx0, x); qx1 = Math.max(qx1, x); qy0 = Math.min(qy0, y); qy1 = Math.max(qy1, y);
		}
		const most = live ? MOST_LIVE : MOST, texel = Math.max(TEXEL, Math.max(qx1 - qx0, qy1 - qy0) / (most - 4));
		qx0 -= 2 * texel; qy0 -= 2 * texel;
		const W = Math.ceil((qx1 - qx0) / texel) + 2, H = Math.ceil((qy1 - qy0) / texel) + 2;
		// a texel's middle -> the piece's flat cloth: back through the grain, less the shift
		const pixToCloth = new Float32Array([cg * texel, -sg * texel, 0, sg * texel, cg * texel, 0, cg * qx0 + sg * qy0 - sx, -sg * qx0 + cg * qy0 - sy, 1]);
		const base = hexToLinear(s.colour ?? '#888888'), edge = e.fitted?.active ? e.fitted.edgeKeepOut() : e.stoneEdge, layers = [], t0 = performance.now();
		for (const gen of gens) {
			const P = patternParams(gen, piece), sym = P.symmetric ? this.symOf(piece) : null;
			try {
				if (isDesign(P.layout)) layers.push(designLayer(gen, P, { base, sym }));
				else { const ink = inkOf(P); layers.push(strokeLayer(gen, P, patternStrokes(gen, piece, { cache: e.patternCache, edge, dot: ink.dot, width: ink.width }), { base, sym })); }
			} catch (err) { console.warn('print', gen.id, err); }
		}
		if (!rec || rec.W !== W || rec.H !== H) {
			rec?.tex.dispose();
			const data = new Uint8Array(W * H * 4), tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
			tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
			tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8; tex.flipY = false;
			rec = { tex, data, W, H };
		}
		const t1 = performance.now();
		if (!eng.render({ W, H, pixToCloth, base, layers, room: layers.some((L) => L.edge || L.mods?.edge) ? roomRaster(piece) : null }, rec.data)) return null;
		this.timing = { layers: t1 - t0, draw: performance.now() - t1, W, H }; // (ms: what the patterns cost to describe, and to draw and read back)
		rec.tex.needsUpdate = true;
		rec.size = [W * texel, H * texel]; rec.offset = [qx0, qy0]; rec.fine = !live || texel <= TEXEL;
		rec.toCloth = (qx, qy) => [cg * qx + sg * qy - sx, -sg * qx + cg * qy - sy]; rec.rev = (rec.rev ?? 0) + 1;
		return rec;
	}

	// A pattern mirrored about the centre of the body (params.symmetric): on the flat piece, about its middle line, keeping
	// the side that is the wearer's left (+x on the body), as the crystals do (stones/generators.js stonesOfGroup).
	symOf(piece) {
		const [cx, cy] = pieceMiddle(piece), p = { x: 0, y: 0, z: 0 }, d = Math.min(0.03, (piece.x1 - piece.x0) / 4);
		let side = 1;
		const q = piece.find(cx + d, cy);
		if (q >= 0) { piece.posOf(q, p, piece.w1, piece.w2); side = p.x >= 0 ? 1 : -1; }
		return [1, cx, side];
	}

	// The picture on the piece's material (every view that has one of that piece).
	show(id, rec) {
		const e = this.engine, panel = e.app?.doc.panels.find((p) => p.id === id), view = e.layers.get(panel?.layer ?? 'L0')?.view, m = view?.materials.get(id);
		if (!m) return;
		if (rec) applyPrint(m.userData.u, rec);
		else view.applyMaterials(e.app.doc); // (back to its print image, or none)
	}

	// A piece's picture for the pattern view: a canvas of it (top row first, no more than `most` on its longer side) and the
	// three corners of the picture on the piece's flat cloth (metres): top left, top right, bottom left. Null: nothing printed.
	picture(id, most = 1024) {
		const rec = this.pieces.get(id);
		if (!rec) return null;
		if (rec.canvasRev !== rec.rev) {
			const { W, H, data } = rec, full = new ImageData(W, H), row = W * 4;
			for (let y = 0; y < H; y++) full.data.set(data.subarray((H - 1 - y) * row, (H - y) * row), y * row);
			const k = Math.min(1, most / Math.max(W, H)), cv = rec.canvas ?? document.createElement('canvas');
			cv.width = Math.max(1, Math.round(W * k)); cv.height = Math.max(1, Math.round(H * k));
			if (k === 1) cv.getContext('2d').putImageData(full, 0, 0);
			else { const big = document.createElement('canvas'); big.width = W; big.height = H; big.getContext('2d').putImageData(full, 0, 0); const x = cv.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(big, 0, 0, cv.width, cv.height); }
			rec.canvas = cv; rec.canvasRev = rec.rev;
		}
		const [x, y] = rec.offset, [w, h] = rec.size;
		return { canvas: rec.canvas, rev: rec.rev, piece: rec.piece, corners: [rec.toCloth(x, y + h), rec.toCloth(x + w, y + h), rec.toCloth(x, y)] };
	}

	dispose() { for (const r of this.pieces.values()) r.tex.dispose(); this.pieces.clear(); }
}

// A piece's picture on a fabric material's print slot.
export function applyPrint(u, rec) {
	u.uPrint.value = 1; u.tPrint.value = rec.tex;
	u.uPrintSize.value.set(rec.size[0], rec.size[1]); u.uPrintOffset.value.set(rec.offset[0], rec.offset[1]);
}
