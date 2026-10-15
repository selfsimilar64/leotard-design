---
type: Component
title: Proof-of-concept fabric shader (fabric.js)
description: "poc-threejs/src/fabric.js extends three.js MeshPhysicalMaterial with an injected procedural layer (foil dots, hologram rainbow, glitter, bump, knit, mesh holes, ombré) and draws each garment zone as a masked pass over the shared body geometry; 15 fabric presets, with known shortcuts."
tags: [poc, rendering, fabric, threejs, component]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: code
    resource: "poc-threejs/src/fabric.js, body.js and main.js at the project root (read 2026-10-15)"
    title: Proof-of-concept source code
    author: claude-code/claude-opus-5-5
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**`poc-threejs/src/fabric.js` is the proof of concept's whole fabric system: a stock three.js
`MeshPhysicalMaterial` (sheen, clearcoat, anisotropy, iridescence) with GLSL injected through
`onBeforeCompile` for what the stock material lacks, and 15 named fabric presets.**[^code] It is a
look-development prototype aimed at "appears correct"
([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)), and several of its
techniques are deliberate shortcuts relative to the research recipes in
[/engineering/rendering/fabric-shading/](/engineering/rendering/fabric-shading/about.md). Runs on
three.js 0.186 `WebGLRenderer` with a 4x MSAA half-float render target and Neutral tone mapping
(`main.js`).[^code]

# How the garment is drawn

- **No separate garment mesh.** The leotard is the body surface pushed out in the vertex shader by
  `uOffset` (fabric thickness: 1.2 mm + 0.15 mm per zone, to avoid z-fighting) plus `aLift`
  (per-vertex bridge height where stretch fabric spans hollows, computed in `body.js`), scaled by
  `uGarment`. Normals blend to the bridged-surface normal `aGNormal`.[^code]
- **Zones.** `createFabricMaterial(zone)` makes one material per zone: 0 body, 1 sleeves, 2 accent,
  3 = no mask (the mannequin itself, optionally with dress-form tapes). `main.js` draws each zone as its
  own mesh over the shared geometry, front-most first (accent, sleeves, body, then skin).[^code]
- **Region fields and discard.** `body.js` evaluates region fields on the reference body (`aRef`) and
  stores them per vertex: `aCover` (where fabric exists) and `aZone` (x = sleeve field, y = accent
  field). The fragment shader thresholds them per pixel: body uses `aCover` (minus sleeves when
  `uSleeveSplit`), sleeves `min(aCover, aZone.x)`, accent `min(aCover, aZone.y, −aZone.x)`; an
  `fwidth`-based smoothstep gives an anti-aliased edge, pixels below 0.004 are discarded, the rest scale
  alpha. Dress-form cut: `aKeep < 0` is discarded when `uClip` is on. Because fields live on the
  reference body, the design lands at the same anatomical place on every body size.[^code]
- **AO.** A per-vertex `aAO` from bridge depth scales indirect diffuse, indirect specular, direct
  diffuse, sheen and clearcoat (fabric spans crevices, so it is barely shaded).[^code]
- **Opaque vs sheer.** Opaque fabrics use `alphaToCoverage` and are drawn before the skin, so the skin
  beneath fails the depth test and is never shaded; only mesh presets take the blended `transparent`
  path.[^code]

# Pattern space

Procedural patterns use object position projected onto the dominant axis plane of the surface normal
(a hard tri-planar switch, invisible because patterns are random at millimetre scale). `fp =
length(fwidth(vObjPos))` is the pixel footprint in metres and drives all level-of-detail fades. The
tangent (for anisotropy) runs horizontally around the body ("the direction of greatest stretch").[^code]

# Procedural layers

| Layer | How | Research counterpart |
|---|---|---|
| Knit | sine-product height at 0.35 mm pitch via screen-space bump (`bumpN`), faded out as pixel footprint exceeds 0.2-0.5 pitches | knit normal at 0.2-0.4 mm, fading to roughness[^notes-shade] |
| Bump | two-octave value noise (crinkle foil, crushed pile) at `uBumpScale`, faded with footprint | crinkle normal map |
| Flakes (foil dots, glitter) | Near: one disc per hex cell (radius `uDotR`, jittered off-centre to avoid moiré, `uPresence` fraction), random tilt per flake. Far (flakes sub-pixel): pixel-sized tilted cells over two blended octaves keep sparkle; mask becomes coverage `3.6276·dotR²·presence`. Mix sets colour, `metalness → 1`, `roughness → uFoilRough`, tilted normal | [foil-dot mixing](/engineering/rendering/fabric-shading/foil-dot-mixing.md) |
| Hologram | Foil colour mixed with an HSV-style `spectrum()` whose phase is the reflection vector dotted with a fixed world direction `uHoloDirW` (the key light), plus per-flake jitter and tilt | [diffraction](/engineering/rendering/fabric-shading/holographic-diffraction.md) (grating model not used) |
| Mesh | hex holes at `uMeshPitch` (0.7 mm); far field becomes alpha `1 − 3.6276·holeR²·ndv^0.6`, so mesh reads more opaque towards the silhouette; flakes stay opaque | [mesh over skin](/engineering/rendering/fabric-shading/mesh-over-skin-blend.md) |
| Ombré | smoothstep on reference-body height with a sine wobble; foil on an ombré follows the same gradient | [sublimation](/domain/fabrics/sublimation-printing.md) |
| Tapes | dress-form tapes (centre lines, side/princess seams, waist, bust, hip) on zone 3 | — |

# Fabric presets (`FABRICS`)

matte, shiny, wet (cire), mystique, hologram (dots), shattered (glass hologram), foil (liquid metallic),
glitter, hologlitter, velvet, crushed, pearl (iridescent film), mesh, glittermesh, ombre, ombremystique.
Values are compared with the research proposals in
[starting parameter values](/engineering/rendering/fabric-shading/starting-parameter-values.md). The
second colour (`SECOND`: Tone-on-tone, Silver, Gold, White, Black) sets foil or ombré colour;
tone-on-tone is a brighter same-hue foil, or a darker neighbouring hue for an ombré. Velvet darkens the
base to 42% and uses sheen 1. Sheen is left off foil and glitter on purpose ("roughly doubles the cost
of every light and is invisible next to the foil").[^code]

# Known shortcuts (vs the research recipes)

1. **Foil far field is one lobe with averaged parameters** (metalness and roughness lerped by coverage),
   not the two-lobe weighted sum the research recommends; sparkle is kept by pixel-sized tilted cells.
2. **Hologram is a hue ramp** anchored to one world direction, not a grating model; it ignores the
   actual light set and environment, the cheap look-alike the research ranked as a low-end
   fallback.[^notes-shade]
3. **Mesh uses blended transparency**, not the in-shader composite over skin; the view-angle term is an
   ad hoc `ndv^0.6`, not the Beer-Lambert form; no lining layer under mesh.
4. **Pattern space is object-space tri-planar**, not pattern-piece UVs, so there is no grain line: the
   anisotropy tangent is fixed horizontal and cannot follow a panel rotated on the bolt.
5. **No velvet nap direction**, flow map or shells; crushed velvet is bump noise plus sheen.
6. **No stretch response**, no fluorescence gain, no wear, no per-zone lining stack.
7. Iridescence IOR 1.8 and thickness 200-520 nm are outside the research starting range.
8. All scales (dot pitch 0.75-0.9 mm, glitter 0.3 mm, mesh pitch 0.7 mm) are unmeasured guesses.

# What a production version would need

Pattern-space UVs with a per-panel grain and nap direction; per-panel layer stacks (outer + lining)
from the data model; mesh composited over skin or lining in one shader; two-lobe foil mixing at
distance; a decision (by eye against swatches) on whether the hologram ramp is good enough or a grating
lobe is needed; a strain input for [stretch-dependent appearance](/engineering/rendering/fabric-shading/stretch-dependent-appearance.md);
presets calibrated against physical swatches
([calibration](/engineering/rendering/fabric-shading/calibration-against-swatches.md)); and profiling
on integrated graphics, since every cost figure is an estimate.[^notes-shade] **[INFERRED]** (our
synthesis of the research against the code).

[^code]: poc-threejs/src/fabric.js (createFabricMaterial, FABRICS, applyFabric, secondColour), body.js (region fields, lift, tangents, AO), main.js (zones, renderer)
[^notes-shade]: Research notes: real-time fabric shading
