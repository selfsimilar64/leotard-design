// Looks, lighting rigs and scene constants.

export const SCENE = {
	camera: { fov: 30, position: [0.25, 1.1, 2.5], target: [0, 0.99, 0] },
	lightSpin: 0.35, // rad/s the light rig turns when "Rotate lights" is on
	envFollow: 0.5,  // the environment turns at this fraction of the rig's angle
};

// Mannequin surfaces. Retail mannequins are matte white fibreglass by default (gloss, skin tones
// and black are the common options); professional dress forms are linen over padding, marked
// with black style tapes (see research_notes/mannequins_and_leotard_fit.md).
// The body's realistic skin: Genesis 9's own skin textures (render/figure.js), under any head.
export const REALISTIC_SKIN = 'Realistic skin (Daz)';

export const MANNEQUIN_FINISHES = {
	'Matte white fibreglass': { colour: 0xe9e7e2, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.45 },
	'Gloss white': { colour: 0xf2f1ee, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 },
	'Skin tone': { colour: 0xc9a48f, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 },
	'Matte black': { colour: 0x1e1e22, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 },
	'Linen dress form': { colour: 0xd8ccb4, roughness: 0.92, sheen: 0.35, knit: 1, tape: true },
	'Linen, no tapes': { colour: 0xd8ccb4, roughness: 0.92, sheen: 0.35, knit: 1 },
	// Athlete skin (realism upgrade R5): wrap lighting that reaches further past the terminator in
	// red (light scattered under the skin), slight roughness variation, a little clearcoat for oil.
	'Athlete skin, fair': { colour: 0xe9c2a8, roughness: 0.5, skin: 1, clearcoat: 0.08, clearcoatRoughness: 0.35 },
	'Athlete skin, light': { colour: 0xd9a98a, roughness: 0.5, skin: 1, clearcoat: 0.08, clearcoatRoughness: 0.35 },
	'Athlete skin, medium': { colour: 0xbb8562, roughness: 0.48, skin: 1, clearcoat: 0.1, clearcoatRoughness: 0.35 },
	'Athlete skin, tan': { colour: 0x9a6646, roughness: 0.46, skin: 1, clearcoat: 0.12, clearcoatRoughness: 0.32 },
	'Athlete skin, deep': { colour: 0x5f3b28, roughness: 0.42, skin: 1, clearcoat: 0.16, clearcoatRoughness: 0.3 },
};

// Eight point lights, re-aimed per preset. Small bright lights are what make foil, glitter and
// crystals sparkle; the environment only supplies the soft fill.
const ring = (n, r, y, cd) => Array.from({ length: 8 }, (_, i) => i < n
	? { p: [r * Math.sin(i / n * Math.PI * 2 + 0.4), y, r * Math.cos(i / n * Math.PI * 2 + 0.4)], cd, c: i % 2 ? 0xfff1dc : 0xe6f0ff }
	: { p: [0, 5, 0], cd: 0, c: 0xffffff });
export const RIGS = {
	'Arena (ring of small lights)': { env: 0.4, bg: 0.1, lights: ring(6, 4.2, 4.4, 38) },
	'Studio (soft)': { env: 0.75, bg: 0.25, lights: [{ p: [2.4, 3, 3.4], cd: 30, c: 0xfff4e6 }, { p: [-3, 2.4, 1.8], cd: 12, c: 0xe8f0ff }, { p: [0.5, 3, -3.5], cd: 16, c: 0xffffff }, ...ring(0).slice(3)] },
	'Single spotlight': { env: 0.07, bg: 0.02, lights: [{ p: [1.3, 3.8, 3.4], cd: 230, c: 0xffffff }, ...ring(0).slice(1)] },
	// Photo-studio rigs (render/studio.js): fixed softboxes as area lights, a seamless backdrop, a
	// matching reflection room, and two small glint lights at the softbox centres (crystals need
	// a small bright source to sparkle). area: { p, s: [w, h] m, at, L: luminance, c }
	'White seamless (photo studio)': studioRig(0xf4f4f2, { back: 1.1, sides: 0.75, top: 0.5, floor: 0.9, front: 0.5 }, 1.0, 0.35),
	'Grey seamless (photo studio)': studioRig(0x7d7f84, { back: 1, sides: 0.6, top: 0.45, floor: 0.8, front: 0.4 }, 0.85, 0.1),
	'Gym (overhead lights)': {
		fixed: true, env: 0.5, bg: 1, backdrop: 0xb9ab95, room: { back: 0.55, sides: 0.5, top: 0.35, floor: 0.4, front: 0.45 },
		areas: [-1.6, 0, 1.6].map((x) => ({ p: [x, 4.2, 0.9], s: [0.6, 2.4], at: [x, 0, 0.9], L: 9, c: 0xfff6ea })),
		envLights: [-4.8, -3.2, 3.2, 4.8].map((x) => ({ p: [x, 4.2, 0.9], s: [0.6, 2.4], at: [x, 0, 0.9], L: 9, c: 0xfff6ea })),
		lights: [{ p: [0, 4.1, 1.6], cd: 10, c: 0xfff6ea }, { p: [1.6, 4.1, -0.6], cd: 6, c: 0xfff6ea }, ...ring(0).slice(2)],
	},
};

// glow: the backdrop's own light (paper lit by background lights), as a share of its colour
function studioRig(backdrop, room, k, glow) {
	return {
		fixed: true, env: 0.5 * k, bg: 1, backdrop, room, glow, bloomK: 0.4, // catalogue photos show little glow
		areas: [
			{ p: [-1.7, 2.2, 2.3], s: [1.2, 1.6], at: [0, 1.15, 0], L: 5.5 * k, c: 0xffffff }, // key: front left, above (part of it, see shadow)
			{ p: [2.0, 1.5, 2.1], s: [1.0, 1.4], at: [0, 1.0, 0], L: 5 * k, c: 0xffffff },    // fill: front right
			{ p: [0, 2.6, -1.3], s: [1.4, 0.5], at: [0, 1.2, 0], L: 7 * k, c: 0xffffff },     // hair light behind, for the rim
		],
		// a white card beside the camera: small in the diffuse fill, but what foil, spangles and
		// the crystals' mirror backs reflect when they face the lens (as in catalogue photos)
		envLights: [{ p: [0.3, 1.3, 3.4], s: [3.0, 2.2], at: [0, 1.1, 0], L: 2.5 * k, c: 0xffffff }],
		lights: [{ p: [-1.7, 2.2, 2.3], cd: 7 * k, c: 0xffffff }, { p: [2.0, 1.5, 2.1], cd: 3 * k, c: 0xffffff }, ...ring(0).slice(2)],
		// the rest of the key, from the same direction, as a directional light that casts soft shadows
		shadow: { from: [-1.7, 2.2, 2.3], E: 0.75 * k },
	};
}

// Each zone is [fabric key, colour, foil / second colour].
export const LOOKS = {
	'Ruby mystique': { sleeves: 'long', back: 'scoop', body: ['mystique', '#b3122e', 'Tone-on-tone'], accent: ['hologram', '#d8dbe6', 'Silver'], sleeve: ['mesh', '#b3122e', 'Tone-on-tone'], pattern: 'Showpiece (edges + swoosh + cascade)', finish: 'Crystal AB' },
	'Midnight velvet': { sleeves: 'long', back: 'keyhole', body: ['velvet', '#16205c', 'Silver'], accent: ['hologlitter', '#cfd4e6', 'Silver'], sleeve: ['glittermesh', '#10142e', 'Silver'], pattern: 'Starburst', finish: 'Crystal AB' },
	'Royal hologram': { sleeves: 'long', back: 'scoop', body: ['hologram', '#1b3fb5', 'Silver'], accent: ['foil', '#e6bf58', 'Gold'], sleeve: ['hologram', '#1b3fb5', 'Silver'], pattern: 'Swoosh line (pen stroke)', finish: 'Crystal' },
	'Sunset ombré': { sleeves: 'long', back: 'scoop', body: ['ombremystique', '#ff4f8b', 'Tone-on-tone'], accent: ['glitter', '#f2c14e', 'Gold'], sleeve: ['mesh', '#d2a48a', 'Tone-on-tone'], pattern: 'Cascade scatter', finish: 'Gold' },
	'Emerald glitter tank': { sleeves: 'tank', back: 'strappy', body: ['glitter', '#0b7d55', 'Tone-on-tone'], accent: ['pearl', '#f4f1ea', 'Silver'], sleeve: ['mesh', '#0b7d55', 'Tone-on-tone'], pattern: 'Spirals and rosette', finish: 'Colour-matched AB' },
	'Black wet look': { sleeves: 'tank', back: 'scoop', body: ['wet', '#0c0c10', 'Silver'], accent: ['shattered', '#c8ccd8', 'Silver'], sleeve: ['mesh', '#0c0c10', 'Silver'], pattern: 'Neckline and cuffs', finish: 'Spangles, holographic' },
};
