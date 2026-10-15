---
type: Component
title: PoC stones module (crystals and spangles)
description: "poc-threejs/src/stones.js: one InstancedMesh of 32-triangle crystals or 14-triangle spangles, a MeshPhysicalMaterial with an injected per-channel inner-reflection shader for fire and AB, nine hard-coded placement patterns (pen-stroke walk and dart-throwing scatter on the body surface), nine finishes; known shortcuts and what production needs."
tags: [poc, threejs, crystal, spangle, instancing, shader, placement]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: code
    resource: poc-threejs/src/stones.js (project code, read 2026-10-15)
    title: PoC stones module
    author: claude-code/claude-opus-5-5
  - id: main
    resource: poc-threejs/src/main.js and poc-threejs/src/presets.js (project code, read 2026-10-15)
    title: PoC renderer set-up and presets
    author: claude-code/claude-opus-5-5
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
---

# Takeaway

`poc-threejs/src/stones.js` proves that thousands of crystals or spangles can be laid onto the
mannequin and made to read as sparkle in three.js with **one instanced draw and a look-alike shader**:
no ray tracing, three environment lookups per stone fragment, 32 triangles per crystal.[^code] It is
deliberately a demonstrator: patterns are hard-coded functions, not editable strokes; the instance
mesh is rebuilt from scratch on every change; there is one LOD, no culling, no picking, no undo.
Production needs are listed at the end. Design context:
[crystal optics look-alike](/engineering/rendering/sparkle/crystal-optics-look-alike.md),
[crystal LOD chain](/engineering/rendering/sparkle/crystal-lod-chain.md),
[stone instancing at scale](/engineering/rendering/sparkle/stone-instancing-at-scale.md).
"Appears correct" is the target ([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)).

# Exports

| Export | What |
|---|---|
| `SS` | Stone size → diameter in metres: 6 → 2.0 mm, 10 → 2.8, 12 → 3.1, 16 → 3.9, 20 → 4.7, 30 → 6.4 (matches [stone sizes](/domain/embellishments/stone-sizes.md) nominal values) |
| `crystalGeometry()` | Unit radius, axis +z: octagonal table at height `H = 0.74`, table radius `TR = 0.52`, 8 upper facets, 16 lower facets to a 16-gon girdle; flat-shaded (per-face normals, `facetedGeometry`) → **32 triangles**, no bottom face |
| `spangleGeometry()` | 14-gon flat disc at z = 0.04 (14 triangles), no hole |
| `FINISHES` | Nine finishes (below) |
| `PATTERNS` | Nine placement patterns (below), each `(body, style) → [{ p, n, d }]` (surface point, normal, diameter) |
| `Stones` class | `new Stones(scene)`; `set(list, finishName, bodyColour)` builds the `InstancedMesh`; exposes `count`, `triangles` |

Constant `LIFT = 0.00145` m raises stones above the garment surface, just over the outermost fabric
layer (`uOffset` in `fabric.js`).[^code]

# Crystal material (`crystalMaterial()`)

`MeshPhysicalMaterial` (black base colour, roughness 0.12, ior 1.6) plus `onBeforeCompile` injection
after `#include <lights_fragment_end>`; uniforms `uAB` (0), `uInner` (1.5), `uGlint` (7),
`uGlintPow` (260); cache key `leotard-crystal`.[^code]

Per fragment:
1. Vertex shader passes the stone axis `vAxis` (instance +z in view space) and a per-instance random
   `vRnd` hashed from `gl_InstanceID`.
2. `Nw` = facet normal with its lean away from the axis **exaggerated ×2.1** (`normal + (normal −
   A·(n·A))·1.1`) so neighbouring facets see very different parts of the room — the bright/dark facet
   contrast that reads as "crystal". `Nx` = mix(axis, normal, 0.4): light mostly leaves through the table.
3. For each colour channel c with IOR 1.57 / 1.60 / 1.645 (the "fire"): `dout = refract(reflect(
   refract(−V, Nw, 1/ior), A), −Nx, ior)` — refract in, mirror off the flat back (plane ⟂ axis),
   refract out; on total internal reflection fall back to `reflect(−V, A)`.
4. Radiance along `dout`: environment (`textureCubeUV`) sharp sample at roughness 0.04 shaped by
   `e·e·1.6/(e + 0.35)` plus a blurred sample at roughness 0.6 × 0.45 ("light that has bounced around
   inside the stone, which keeps real crystals from having black facets"), times `envMapIntensity`;
   plus each point light as `pow(saturate(dot(dout, L)), uGlintPow) · uGlint` (a Phong-like glint lobe;
   the exponent stands in for lamp angular size).
5. **AB** when `uAB > 0`: multiply by a cosine pastel palette of phase `dot(n,V)·1.9 + dot(n,A)·1.3 +
   vRnd`, so each facet takes a hue that drifts with view angle and differs per stone. Additionally the
   stock `iridescence` (IOR 1.9, thickness 200–480 nm) is switched on for AB finishes.
6. Add `inner · tint · (1 − fresnel) · uInner` to `indirectSpecular`, with Schlick fresnel 0.05 base;
   tint from instance colour.

This is a look-alike, not the analytic tracer proposed in research: no facet-to-facet path, no true
dispersion integral, no thin-film physics in the custom AB term.[^code][^srr]

# Spangle material

Stock `MeshPhysicalMaterial`, metalness 1, roughness 0.14; holographic finish turns on `iridescence`
with IOR 2.1 and thickness 300–760 nm (an iridescent stand-in, not diffraction). Each spangle's normal
gets a random jitter of ±0.08 per component before normalising: "the small random tilt is what makes
them flash in turn".[^code] See [spangle rendering](/engineering/rendering/sparkle/spangle-and-sequin-rendering.md).

# Finishes

| Finish | Type | Tint | AB / holo |
|---|---|---|---|
| Crystal | crystal | white | – |
| Crystal AB | crystal | white | ab 0.85 |
| Colour-matched | crystal | body colour lerped 20% to white | – |
| Colour-matched AB | crystal | body colour | ab 0.6 |
| Gold | crystal | `0xffc04a` | – |
| Jet | crystal | `0x2c2e36` | – |
| Spangles, silver / gold / holographic | spangle | `0xe9ebf2` / `0xf2c060` / `0xf2f2f2` | holo 1 on holographic |

Every instance colour is multiplied by 0.88–1.0 random so stones are not identical.[^code]

# Placement

Patterns are laid out in **reference-body coordinates** (`REF` in `body.js`) and resolved to surface
points, then evaluated on whichever body is shown: a motif stays in the same place on child and adult
bodies, scaled with the body, while **stones keep their real millimetre sizes** (`scaleOf(body)` =
stature ratio divides reference-space spacings).[^code] Surface helpers from `body.js`: `point()`
returns `{ p, n, cover, keep }`; `projectFront(x, y, back)` maps a front/back orthographic position
(4 mm raster of the reference torso) to a surface point; `sample(rand, out)` gives an area-weighted
random surface point; `armRing(side, t)` a sleeve ring. `onFabric` accepts a point only if garment
`cover > 0.004` and, on the dress form, the `keep` field ≥ 0.002.

Two primitives:
- **`stroke()` — the pen stroke**: walk a polyline of surface points and drop a stone every
  `gapK × diameter` of true 3D distance on the current body (default `gapK = 1.13`, i.e. a 13% gap);
  diameter may be a function of position (graded size).
- **`scatter()` — dart throwing**: `candidates` area-weighted random samples (seeded mulberry32),
  each given a diameter by `diameterAt` (0 rejects); rejected if within `(dᵢ + dⱼ)/2 · gapK` of an
  earlier stone, tested in a hashed 3D grid with cell `maxD · gapK` over the 27 neighbouring cells.
  Collision is 3D Euclidean distance between centres, not geodesic, and on the worn body (no stretch
  model; see [stretch spacing trap](/domain/embellishments/stretch-spacing-trap.md)).

| Pattern | Construction | Vocabulary move |
|---|---|---|
| None | – | – |
| Neckline and cuffs | Two offset arcs round `NECK_FRONT` (ss16 at +6 mm, ss10 at +11.2 mm) and, with long sleeves, two cuff rings (ss16, ss10) | Outline |
| Swoosh line (pen stroke) | Offset curves of `swooshPoint`: three graded rows on one edge (ss20, ss12, ss6) and one row (ss12) on the other | Path / flourish |
| Cascade scatter | `scatter` with 60,000 candidates, density `0.75·smoothstep(refY, 1.022, 1.362)^2.2` (dense at shoulders, nothing at the waist), sizes 12% ss20 / 38% ss16 / 50% ss10, `gapK 1.25` | Gradient scatter |
| Starburst | ss30 centre at (0, 1.222); 36 rays of lengths cycling 170/85/125/60 mm; size steps ss20 → ss16 → ss10 → ss6 at 30/65/110 mm, `gapK 1.3` | Radial burst |
| Spirals and rosette | Three Archimedean spirals (ss12/ss10) with an ss20 centre; a 150-stone phyllotaxis (golden-angle) rosette, radius 3.4 mm·√(i + 0.5), ss20 centre, ss12 then ss10 | Flourish, region fill |
| Showpiece | Neckline/cuffs + swoosh + cascade | Combination |
| Stress: pavé ss16 / ss6 all over | `scatter` with `area · 0.62 / d² · 9` candidates, `gapK 1.1` | Stress test |

Vocabulary reference: [placement vocabulary](/domain/embellishments/placement-vocabulary.md).

# Instancing

`Stones.set()` disposes the previous mesh and builds a new `THREE.InstancedMesh` sized to the list:
orientation = rotation from +z to the (jittered) normal times a random spin about the normal (so
neighbouring stones do not flash in unison), position = surface point + `LIFT` along the normal,
scale = diameter/2, colour via `setColorAt`. `frustumCulled = false`; `renderOrder = −4` (drawn first
so depth rejects what is behind). `count` and `triangles` feed the HUD; `main.js` times the rebuild as
`stoneMs`.[^code][^main]

# Scene context

`main.js` renders to a half-float 4× MSAA target with bloom (default strength 0.18) and
`THREE.NeutralToneMapping` ([tone mapping](/engineering/rendering/sparkle/tone-mapping-pbr-neutral.md));
environment = PMREM of three.js `RoomEnvironment`; eight point lights re-aimed per rig preset
("Arena (ring of small lights)", "Studio (soft)", "Single spotlight") — "Small bright lights are what
make foil, glitter and crystals sparkle; the environment only supplies the soft fill".[^main]
See [lighting for sparkle](/engineering/rendering/sparkle/sparkle-lighting.md).

# Known shortcuts

- Look-alike optics: exaggerated facet lean, one mirror bounce, hand-tuned constants (`uInner`,
  `uGlint`, `uGlintPow`, blur mix), point lights treated as Phong lobes; AB is a cosine palette, not
  thin-film physics.
- One crystal cut (8-facet table + 16 lower facets, no crown/pavilion distinction by grade), one
  spangle shape; no shaped stones, pearls or nailheads.
- One finish per scene (the whole list shares one material and tint rule); no per-stone colour
  choice beyond random brightness.
- Single LOD (32 tris always); `frustumCulled = false`; no back-face or cluster culling.
- Full rebuild of the InstancedMesh on every pattern/finish/body change; no partial buffer updates.
- Stones are anchored by baked positions on the current body, not by triangle + barycentric anchors,
  so they do not follow drape or animation.
- Spacing ignores fabric stretch, seams and elastic; no keep-out zones, no hand-set vs machine split.
- No picking, selection, editing, undo, counts by size/colour or price read-out.

# What production needs

**[INFERRED]** (from the research recommendations):[^srr]
1. **Editable strokes and fills** as data (brush type, path, parameters, seed) regenerated
   deterministically, with per-stone release/move/delete ([layout software baseline](/domain/embellishments/rhinestone-layout-software.md);
   UX design in [procedural stone strokes](/engineering/ux/procedural-stone-strokes.md)).
2. **Undo/redo** as a log of record edits; append/swap-remove instance records with dirty-range uploads.
3. **Surface anchors** (pattern piece + barycentric/UV) so stones follow drape and map to flat pieces
   for export; spacing checked on body and flat piece; [placement rules](/domain/embellishments/stone-placement-rules.md)
   as live warnings. Placement algorithms: [/engineering/geometry/](/engineering/geometry/about.md).
4. **LOD chain and per-cut lobe tables** with shared per-stone seeds; culling; ID-buffer picking.
5. **Stone library**: cuts per grade, sizes, shapes, colours as body + backing + coating, per-stone
   finish ([colour libraries](/domain/embellishments/stone-colour-libraries.md)).
6. Separate sparkle HDR layer, minimum lobe width filtering, observer presets
   ([temporal stability](/engineering/rendering/sparkle/sparkle-temporal-stability-and-hdr.md),
   [observer model](/engineering/rendering/sparkle/observer-and-glare-model.md)).
7. Live stone count by size/colour with a price band ([counts and tiers](/domain/embellishments/crystal-counts-and-tiers.md)).

[^code]: `poc-threejs/src/stones.js`, read 2026-10-15
[^main]: `poc-threejs/src/main.js` and `poc-threejs/src/presets.js`, read 2026-10-15
[^srr]: Research notes: real-time sparkle rendering, sections 4-6 (in-bundle mirror)
