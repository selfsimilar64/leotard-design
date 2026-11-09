// Mannequin finishes, lighting rigs and environments, scene constants.

export const SCENE = {
	camera: { fov: 30, position: [0.25, 1.1, 2.5], target: [0, 0.99, 0] },
};

// Mannequin surfaces. Retail mannequins are matte white fibreglass by default (gloss, skin tones
// and black are the common options); professional dress forms are linen over padding, marked
// with black style tapes (see research_notes/mannequins_and_leotard_fit.md).
// The body's realistic skin: Genesis 9's own skin textures (render/figure.js). No design uses it
// since 2026-10-29 (owner: always the headless mannequin; doc/migrate-g9.js migrateBody).
export const REALISTIC_SKIN = 'Realistic skin (Daz)';

// The body is always the headless mannequin, matte white plastic unless another finish is picked.
// Every tile picture shows designs on this body (src/dev/thumbnails.js).
export const MANNEQUIN = { form: 'full', head: 'none', finish: 'Matte white fibreglass', headFinish: 'Matte white fibreglass' };

// The mannequin's finish choice (ui/StageTab.jsx): a finish each, in the finish's own colour until
// the body's colour (body.colour, '#rrggbb') is set; that colour then stays across finishes.
export const MANNEQUIN_MATERIALS = [
	['Matte white fibreglass', 'Matte plastic'],
	['Gloss white', 'Gloss plastic'],
	['Polished metal', 'Polished metal'],
	['Brushed metal', 'Brushed metal'],
	['Flocked velvet', 'Flocked velvet'],
	['Linen, no tapes', 'Linen'],
];

export const MANNEQUIN_FINISHES = {
	'Matte white fibreglass': { colour: 0xe9e7e2, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.45 },
	'Gloss white': { colour: 0xf2f1ee, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 },
	'Skin tone': { colour: 0xc9a48f, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 },
	'Matte black': { colour: 0x1e1e22, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 },
	'Linen dress form': { colour: 0xd8ccb4, roughness: 0.92, sheen: 0.35, knit: 1, tape: true },
	'Linen, no tapes': { colour: 0xd8ccb4, roughness: 0.92, sheen: 0.35, knit: 1 },
	// Display-mannequin metals (chrome and satin-brushed steel; the colour makes gold, bronze...)
	// and flocked velvet (matte, a soft rim of sheen in its own colour).
	'Polished metal': { colour: 0xd4d6da, roughness: 0.12, metalness: 1 },
	'Brushed metal': { colour: 0xc4c6ca, roughness: 0.36, metalness: 1 },
	'Flocked velvet': { colour: 0x26262b, roughness: 1, sheen: 1, sheenRoughness: 0.45, sheenSelf: true },
	// Athlete skin (realism upgrade R5): wrap lighting that reaches further past the terminator in
	// red (light scattered under the skin), slight roughness variation, a little clearcoat for oil.
	'Athlete skin, fair': { colour: 0xe9c2a8, roughness: 0.5, skin: 1, clearcoat: 0.08, clearcoatRoughness: 0.35 },
	'Athlete skin, light': { colour: 0xd9a98a, roughness: 0.5, skin: 1, clearcoat: 0.08, clearcoatRoughness: 0.35 },
	'Athlete skin, medium': { colour: 0xbb8562, roughness: 0.48, skin: 1, clearcoat: 0.1, clearcoatRoughness: 0.35 },
	'Athlete skin, tan': { colour: 0x9a6646, roughness: 0.46, skin: 1, clearcoat: 0.12, clearcoatRoughness: 0.32 },
	'Athlete skin, deep': { colour: 0x5f3b28, roughness: 0.42, skin: 1, clearcoat: 0.16, clearcoatRoughness: 0.3 },
};

// Photographed studios (render/viewport.js hdri): the HDRI lights the figure and is the room around
// it, its floor projected onto the ground the figure stands on. The earlier light-only and softbox
// rigs were removed on 2026-10-27 (designs naming one open in DEFAULT_RIG); the Softbox studios added back the same day
// for testing satin were removed on 2026-11-09 (owner): every lighting kind needs every shader variant again, and the
// photographed studios share one set (their recipe lives on in render/studio.js for the picker's thumbnails).
export const DEFAULT_RIG = 'White loft studio';
export const RIGS = {
	'White loft studio': hdriRig('brown_photostudio_02_4k.hdr'),
	'Window loft studio': hdriRig('brown_photostudio_01_4k.hdr'),
	'Parquet studio, sunlit': hdriRig('brown_photostudio_06_4k.hdr'),
	'Green loft hall': hdriRig('photo_studio_loft_hall_4k.hdr'),
	'Neon studio': hdriRig('ferndale_studio_12_4k.hdr'),
	'Small photo studio': hdriRig('studio_small_09_4k.hdr'), // owner's addition, 2026-10-27 (Poly Haven, CC0)
};

// An HDRI studio (assets/hdri, served at /hdri). height: the camera height it was shot from
// (metres; sets where its floor lands), turn: the room's default turn (radians, so a pleasing
// wall is behind the figure), sun: strength of the shadow-casting key along the HDRI's brightest
// direction (found when it loads), glint: candela of the small lights there and at the camera
// that crystals need to sparkle.
function hdriRig(file, o = {}) {
	return { hdri: file, env: 1, bg: 1, bloomK: 0.4, height: 1.6, turn: 0, sun: 0.8, glint: 5, ...o };
}
