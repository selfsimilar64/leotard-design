// Straps as surface data: a strap is a path line plus a width; its ribbon is a grid of surface
// points (across x along) found by walking the reference surface sideways from each path sample,
// so the strap follows the body's curvature across its width and evaluates on any body.
// Spec: knowledge/engineering/architecture/editor-architecture.md, item 6.
import * as THREE from 'three';
import { projectNear } from '../curves/evaluate.js';

export const ACROSS = [-0.5, -0.42, -0.25, 0, 0.25, 0.42, 0.5]; // fractions of the width
// strap profile: height above its base (metres) at each across sample (rolled edges, flat top)
export const STRAP_PROFILE = [0.0002, 0.0013, 0.0018, 0.0019, 0.0018, 0.0013, 0.0002];

const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _n = new THREE.Vector3(), _b = new THREE.Vector3();

// e: an evaluated path curve ({ sps, pts, s }); width in metres.
// -> { rows: [[sp per across sample]], along: [metres], width }
export function strapGrid(e, surf, width, step = 0.002) {
	const n = e.pts.length;
	if (n < 2) return null;
	// resample the path at `step`
	const total = e.s[n - 1];
	const m = Math.max(2, Math.round(total / step) + 1), rows = [], along = [];
	let seg = 0;
	for (let k = 0; k < m; k++) {
		const d = (k / (m - 1)) * total;
		while (seg < n - 2 && e.s[seg + 1] < d) seg++;
		const a = e.pts[seg], b = e.pts[seg + 1], w = (d - e.s[seg]) / Math.max(e.s[seg + 1] - e.s[seg], 1e-9);
		const c = _p.copy(a).lerp(b, w).clone();
		const f0 = (w < 0.5 ? e.sps[seg] : e.sps[seg + 1]).f;
		const center = projectNear(surf, c, f0, {});
		const cp = surf.pos(center);
		_t.copy(b).sub(a).normalize();
		surf.faceNormal(center.f, _n);
		_b.crossVectors(_n, _t).normalize();
		const row = ACROSS.map((u) => {
			if (u === 0) return { f: center.f, b0: center.b0, b1: center.b1, b2: center.b2 };
			const q = projectNear(surf, _p.copy(cp).addScaledVector(_b, u * width), center.f, {});
			return { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 };
		});
		rows.push(row);
		along.push(d);
	}
	return { rows, along, width };
}

// Canonical vertices under a strap (for the fabric lift solve: a strap bridges hollows like fabric).
export function markGrid(grid, idx, cover) {
	for (const row of grid.rows) for (const sp of row) for (let k = 0; k < 3; k++) cover[idx[sp.f * 3 + k]] = 1;
}
