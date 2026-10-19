// The reference garment surface: the reference body (REF) wearing fabric everywhere a leotard can
// reach (torso, arms, upper legs), so the fabric bridges the body's hollows (see computeLift in
// mannequin.js). Curves are drawn and stored on this surface; it is the same mesh as every body,
// so the surface points they are made of evaluate on any body.
import { Surface } from './surface.js';
import { vertexNormals } from './mannequin.js';

export function buildReference(man) {
	const N = man.vertices, R = man.ref, idx = man.idx;
	const normals = new Float32Array(N * 3);
	vertexNormals(R, idx, normals);
	const cover = new Float32Array(N);
	for (let i = 0; i < N; i++) {
		const bare = man.wHead[i] > 0.5 || man.armT[i] > 1 || (man.wLeg[i] > 0.5 && R[i * 3 + 1] < man.crotchY - 0.03);
		cover[i] = bare ? -1 : 1;
	}
	const lift = man.computeLift(R, normals, cover);
	const G = new Float32Array(N * 3);
	for (let i = 0; i < N * 3; i++) G[i] = R[i] + normals[i] * lift[(i / 3) | 0];
	const surface = new Surface(idx, G);
	const gNormals = new Float32Array(N * 3);
	vertexNormals(G, idx, gNormals);
	surface.normals = gNormals;
	return { surface, lift, cover };
}
