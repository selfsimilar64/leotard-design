// Photo-studio rigs (realism upgrade R1): softboxes as rectangular area lights for the broad, soft
// highlights fabric shows in catalogue photos; the same boxes drawn into the reflection
// environment so foil and crystals mirror them; a seamless paper backdrop (cyclorama) that sweeps
// from the floor up into the wall. Rigs are data (render/presets.js RIGS), so a reference photo's
// setup can be matched by picking or editing one.
import * as THREE from 'three';

// The room a studio rig's reflections come from, for PMREMGenerator.fromScene: a box whose walls
// carry the backdrop's brightness on the subject's far side and a darker photographer's side,
// plus one emissive quad per softbox (and per room light).
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

// Seamless paper: a floor that curves up into the back wall (radius r), wide enough to fill any
// framing of a standing figure.
export function cyclorama() {
	const prof = [], r = 1.4, zBack = -1.6;
	prof.push([8, 0], [zBack + 0.001, 0]);
	for (let i = 1; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; prof.push([zBack - Math.sin(a) * r, r - Math.cos(a) * r]); }
	prof.push([zBack - r, 9]);
	const W = 9, n = prof.length, pos = [], idx = [];
	for (const [z, y] of prof) pos.push(-W, y, z, W, y, z);
	for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	geo.setIndex(idx);
	geo.computeVertexNormals();
	const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 }));
	mesh.position.y = -0.0086;
	mesh.renderOrder = 5; // drawn after the figure: most of it is hidden behind
	return mesh;
}
