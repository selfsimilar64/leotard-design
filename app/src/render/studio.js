// The product-photo reflection room the fabric picker's thumbnails are rendered in (dev/thumbnails.js, materials and
// scans): dim walls round very bright softboxes, so glossy fabric shows bright streaks against dark ones, as in a shop's
// photo. It was the Softbox studio's (presets.js RIGS, 2026-10-27, owner: analytic lights to test satin;
// knowledge/decisions/2026-10-27-softbox-studio-for-satin.md); the studio itself, its rect area lights and its seamless
// paper, was taken out of the app on 2026-11-09 (owner: one kind of lighting, so every shader variant is compiled once).
// Only the room is kept, so the thumbnails can be rendered again as they were.
import * as THREE from 'three';

// The Softbox studio's backdrop, walls, boxes and bounce card, as they were in presets.js. area: { p, s: [w, h] m, at,
// L: luminance, c }
export const PRODUCT_ROOM = {
	backdrop: 0xf2f2f0,
	// in its reflections a softbox is about ten times its surroundings (at walls near paper white, glossy fabric showed
	// no highlights at all)
	room: { back: 0.3, sides: 0.18, top: 0.1, floor: 0.25, front: 0.08 },
	areas: [
		{ p: [-1.6, 2.1, 2.1], s: [1.5, 1.5], at: [0, 1.1, 0], L: 2.6, c: 0xfffaf2 },     // key: octabox front left, above
		{ p: [2.0, 1.4, 2.2], s: [1.2, 1.8], at: [0, 1.0, 0], L: 1.2, c: 0xf6f8ff },      // fill: tall softbox front right
		{ p: [-1.6, 1.4, -1.1], s: [0.4, 1.8], at: [0, 1.1, 0], L: 3.5 },               // rim: strip box behind left
		{ p: [1.6, 1.4, -1.1], s: [0.4, 1.8], at: [0, 1.1, 0], L: 3.5 },                // rim: strip box behind right
		{ p: [0, 3.0, 0.5], s: [1.8, 1.2], at: [0, 1.0, 0.3], L: 1.6 },                   // overhead scrim
		{ p: [0, 0.45, 2.2], s: [1.6, 0.8], at: [0, 0.9, 0], L: 0.8 },                  // low front bounce
	],
	// a large white bounce card beside the camera (what glossy fabric and foil mirror when they face the lens)
	envLights: [{ p: [0.4, 1.3, 3.4], s: [3.0, 2.2], at: [0, 1.1, 0], L: 2 }],
};

// The room the reflections come from, for PMREMGenerator.fromScene: a box whose walls carry the paper's brightness on
// the subject's far side and a darker photographer's side, plus one emissive quad per softbox and per bounce card.
// rig.room: { back, sides, front, top, floor } brightness of each wall (linear, x backdrop colour)
export function studioEnvironment(rig) {
	const env = new THREE.Scene(), room = rig.room ?? {}, tone = new THREE.Color(rig.backdrop ?? 0xffffff);
	// PMREM renders the room from the origin: put the origin at chest height (not on the floor,
	// where half the view would be clipped away and every downward reflection would be black)
	env.position.y = -1.1;
	const wall = (k) => new THREE.MeshBasicMaterial({ color: tone.clone().multiplyScalar(k), side: THREE.BackSide });
	// BoxGeometry material order: +x, -x, +y, -y, +z, -z
	const box = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 14), [
		wall(room.sides ?? 0.5), wall(room.sides ?? 0.5), wall(room.top ?? 0.3), wall(room.floor ?? 0.6), wall(room.front ?? 0.15), wall(room.back ?? 0.9),
	]);
	box.position.y = 4.5;
	env.add(box);
	for (const a of [...(rig.areas ?? []), ...(rig.envLights ?? [])]) {
		const q = new THREE.Mesh(new THREE.PlaneGeometry(a.s[0], a.s[1]), new THREE.MeshBasicMaterial({ color: new THREE.Color(a.c ?? 0xffffff).multiplyScalar(a.L * (a.envK ?? 1)), side: THREE.DoubleSide }));
		q.position.fromArray(a.p);
		q.lookAt(new THREE.Vector3().fromArray(a.at ?? [0, 1, 0]));
		env.add(q);
	}
	return env;
}
