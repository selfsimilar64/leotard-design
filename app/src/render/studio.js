// A softbox studio (presets.js RIGS 'Softbox studio'): large rectangular area lights for the broad,
// soft highlights fabric shows in catalogue photos, the same boxes drawn into the reflection
// environment so glossy fabric, foil and crystals mirror them, and a seamless paper backdrop
// (cyclorama) sweeping from the floor up into the wall. Restored from the rigs removed on
// 2026-10-27 (owner: analytic lights again, to test satin; knowledge/decisions/
// 2026-10-27-softbox-studio-for-satin.md).
import * as THREE from 'three';

// The room the studio's reflections come from, for PMREMGenerator.fromScene: a box whose walls
// carry the paper's brightness on the subject's far side and a darker photographer's side, plus
// one emissive quad per softbox and per bounce card.
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

// Seamless paper all round (an infinity cove): a floor disc that curves up (radius r) into a round
// wall, so the figure sits in white paper from every camera angle. A one-sided sweep showed its
// edge as a hard horizon once the camera went round the figure.
export function cyclorama() {
	const prof = [], r = 1.4, R = 4.6;
	prof.push(new THREE.Vector2(0, 0), new THREE.Vector2(R - r, 0));
	for (let i = 1; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; prof.push(new THREE.Vector2(R - r + Math.sin(a) * r, r - Math.cos(a) * r)); }
	prof.push(new THREE.Vector2(R, 9));
	const geo = new THREE.LatheGeometry(prof, 96);
	const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, side: THREE.DoubleSide }));
	mesh.position.y = -0.0086;
	mesh.renderOrder = 5; // drawn after the figure: most of it is hidden behind
	return mesh;
}
