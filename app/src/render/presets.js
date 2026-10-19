// Looks, lighting rigs and scene constants.

export const SCENE = {
	camera: { fov: 30, position: [0.25, 1.1, 2.5], target: [0, 0.99, 0] },
	lightSpin: 0.35, // rad/s the light rig turns when "Rotate lights" is on
	envFollow: 0.5,  // the environment turns at this fraction of the rig's angle
};

// Mannequin surfaces. Retail mannequins are matte white fibreglass by default (gloss, skin tones
// and black are the common options); professional dress forms are linen over padding, marked
// with black style tapes (see research_notes/mannequins_and_leotard_fit.md).
export const MANNEQUIN_FINISHES = {
	'Matte white fibreglass': { colour: 0xe9e7e2, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.45 },
	'Gloss white': { colour: 0xf2f1ee, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 },
	'Skin tone': { colour: 0xc9a48f, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 },
	'Matte black': { colour: 0x1e1e22, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 },
	'Linen dress form': { colour: 0xd8ccb4, roughness: 0.92, sheen: 0.35, knit: 1, tape: true },
	'Linen, no tapes': { colour: 0xd8ccb4, roughness: 0.92, sheen: 0.35, knit: 1 },
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
};

// Each zone is [fabric key, colour, foil / second colour].
export const LOOKS = {
	'Ruby mystique': { sleeves: 'long', back: 'scoop', body: ['mystique', '#b3122e', 'Tone-on-tone'], accent: ['hologram', '#d8dbe6', 'Silver'], sleeve: ['mesh', '#b3122e', 'Tone-on-tone'], pattern: 'Showpiece (edges + swoosh + cascade)', finish: 'Crystal AB' },
	'Midnight velvet': { sleeves: 'long', back: 'keyhole', body: ['velvet', '#16205c', 'Silver'], accent: ['hologlitter', '#cfd4e6', 'Silver'], sleeve: ['glittermesh', '#10142e', 'Silver'], pattern: 'Starburst', finish: 'Crystal AB' },
	'Royal hologram': { sleeves: 'long', back: 'scoop', body: ['hologram', '#1b3fb5', 'Silver'], accent: ['foil', '#e6bf58', 'Gold'], sleeve: ['hologram', '#1b3fb5', 'Silver'], pattern: 'Swoosh line (pen stroke)', finish: 'Crystal' },
	'Sunset ombré': { sleeves: 'long', back: 'scoop', body: ['ombremystique', '#ff4f8b', 'Tone-on-tone'], accent: ['glitter', '#f2c14e', 'Gold'], sleeve: ['mesh', '#d2a48a', 'Tone-on-tone'], pattern: 'Cascade scatter', finish: 'Gold' },
	'Emerald glitter tank': { sleeves: 'tank', back: 'strappy', body: ['glitter', '#0b7d55', 'Tone-on-tone'], accent: ['pearl', '#f4f1ea', 'Silver'], sleeve: ['mesh', '#0b7d55', 'Tone-on-tone'], pattern: 'Spirals and rosette', finish: 'Colour-matched AB' },
	'Black wet look': { sleeves: 'tank', back: 'scoop', body: ['wet', '#0c0c10', 'Silver'], accent: ['shattered', '#c8ccd8', 'Silver'], sleeve: ['mesh', '#0c0c10', 'Silver'], pattern: 'Neckline and cuffs', finish: 'Spangles, holographic' },
};
