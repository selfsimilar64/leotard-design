---
type: Technique
title: "Photo match: the tricot gloss ladder (matte, shiny, satin, wet look)"
description: "Matte, shiny, stretch satin and wet look now share the scuba scan (its roughness map scaled to each fabric's own roughness, its relief weaker on glossier rungs) and differ by roughness, anisotropy, ior, clear coat and a new yarn-glint layer that shows up close and fades at body distance; satin is new; the drape test cloth gained the tangent anisotropic fabrics need."
tags: [rendering, fabric, tricot, satin, wet-look, glint, photo-match]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-27 (Claude Code session)
    title: "Owner's go-ahead: scuba scan under every gloss rung, sparkle grain, satin; wet look already good"
    author: human:mattj
  - id: refs
    resource: /domain/fabrics/stretch-tricot-family-names.md
    title: "Lycra, spandex, tricot: owner's reference photos and the proposed gloss ladder"
    author: claude-code/claude-opus-5-5
  - id: clo-shine
    resource: https://support.clo3d.com/hc/es/community/posts/900002159966-Shine-in-rendering
    title: "CLO3D support: Shine in rendering (Silk/Satin type, reflection intensity)"
    author: org:clo-virtual-fashion
  - id: vray
    resource: https://novedge.com/blogs/design-news/v-ray-tip-layered-reflections-for-realistic-v-ray-fabrics
    title: "V-Ray tip: layered reflections for realistic fabrics"
    author: org:novedge
  - id: hdrp
    resource: https://plastichub.unity.cn/unity-tech-cn/ScriptableRenderPipeline/src/commit/654f18cb-413f-4e79-92bf-227477626df1...com.unity.render-pipelines.high-definition/HDRP/Material/Fabric/Fabric.cs
    title: Unity HDRP Fabric shader source (Silk enables anisotropy)
    author: org:unity
  - id: sadeghi
    resource: https://history.siggraph.org/?p=109073
    title: "Sadeghi, Bisker, De Deken, Jensen 2013: A Practical Microcylinder Appearance Model for Cloth Rendering"
    author: org:acm-siggraph
  - id: dw
    resource: https://web.archive.org/web/20240222035656/https://research.dreamworks.com/wp-content/uploads/2018/07/clothIS.pdf
    title: "Wang, Xie, Krishnamachari (DreamWorks), SIGGRAPH 2014 talk: Importance Sampling for a Microcylinder Based Cloth BSDF"
    author: org:dreamworks
---

# Takeaway

**The four plain tricot fabrics are one cloth at four gloss levels.** They share the scuba knit
scan TX-00001482 (the owner's preferred knit) and differ only in how light leaves the
surface.[^owner][^refs] All values live in `FABRICS` in `app/src/materials/fabric.js`.

| Fabric | Roughness | Stretch (anisotropy) | Other | Scan relief | Glints (presence) |
|---|---|---|---|---|---|
| `matte` Matte lycra | 0.8 | 0 | sheen 0.1 | 1 | none |
| `shiny` Shiny tricot | 0.4 | 0.6 | sheen 0.2 | 0.6 | 0.25 |
| `satin` Stretch satin (new; owner's pick, try 2) | 0.22 | 0.9 | sheen 0.15 | 0.45 | 0.06 |
| `wet` Wet look (cire) | 0.32 | 0.5 | clear coat 0.55 at 0.2 | 0.15 | 0.5 |

# What changed in the shader

- **Relative scan roughness** (`uTexRoughRel`, `uTexRoughMean`). A fabric's *default* scan
  (`FABRICS[k].scan`, `scanOf`) now only varies the fabric's own roughness: roughness × map /
  map mean (TX-00001482: mean 0.766, ±9%). Before, the map replaced it, so the scan would have
  made every rung as dull as scuba. A scan the user picks from the scan library still replaces
  roughness (it defines the fabric). Matte barely moves (0.8 against the map's 0.766).
- **Per-fabric relief** (`scan.normal`): 1 on matte down to 0.15 on wet look. On a gloss every
  small tilt breaks up the highlight, and at 0.3 wet look looked mottled at body distance.
- **Yarn glints** (`glint` fields, `uGlint`): the flake machinery reused as glossy fibre facets.
  Dielectric, the diffuse stays the dye, the specular is part white (`FOIL_FRAGMENT`). Two fixes
  were needed:
  1. Glints carry no anisotropy. Stretched at their low roughness, every small light became a
     razor-thin dotted line across the cloth.
  2. Glints fade to 10% once smaller than a pixel (`gw`). At full strength a shiny red leotard
     read as glitter fabric at body distance; the Nike and GK photos show no sparkle there.
- A per-fabric `ior` (satin tries C-E) and `dyeSheen` (try F) were added, then removed with
  those tries; no fabric sets either now.

# Satin tuning

Navy on the plain tank against a frame of GK's turntable video. Anisotropy 0.85-0.9, or ior 2
and above, smeared the loft's bright ceiling over the whole chest as a grey haze. Roughness 0.2,
anisotropy 0.5 and ior 1.6 keep distinct bands over deep navy. **[INFERRED]** It is still softer
and less contrasty than GK's photo, which was lit by a frontal studio light the White loft does
not have; revisit if a frontal-key studio is added.

# Satin tries in the picker (for the owner)

The owner asked to judge the earlier tries by eye, so all six are fabrics in the picker after
Stretch satin (try E): `satin1` first try (roughness 0.3, anisotropy 0.85, glint 0.12, sheen
0.15), `satin2` (0.22, 0.9), `satinA` (0.22, 0.9, ior 2.2, sheen 0.4 at half white), `satinB`
(0.3, 0.9, ior 2.6), `satinC` (0.18, 0.7, ior 1.8), `satinD` (0.14, 0.6, ior 2.0); shared fields in
`SATIN_TRY`.

**Outcome (owner, 2026-10-27):** tries 1 and 2 were "not bad, slightly plasticky"; A and B looked
metallic and changed the colour; C and D good and brighter than E; C and E liked most. After the
side-by-side in the owner's setup and the failed try F, the owner chose **try 2** as best so far.
It is now `satin` (Stretch satin). Every other try, `SATIN_TRY` and their tiles are removed, and
designs naming a removed try open on `satin` (`RETIRED_FABRICS`).[^owner]

**Superseded (owner, 2026-10-28):** Stretch satin is removed. The key `satin` is now the
thread-model Satin ([microcylinder cloth model](microcylinder-cloth-model.md)), the app's only satin.

# Coloured shine (try F)

The owner saw tries 2, C and E as slightly plastic or greyed. A second GK photo of the navy
satin (warm gym light) shows vivid royal-blue bands and no white anywhere on the satin. Under GK's
big white softbox the peaks go pale lavender, never white.[^owner] **[INFERRED]** Satin's broad
sheen is mostly light that entered the smooth, slightly clear filaments and left dye-filtered. Only
a few percent reflects white off the surface. Every earlier try had a white specular only, which
reads as plastic (2) or as grey haze where the sheen spreads (C).

`dyeSheen { gain, sat, white }` on a fabric (`applyFabric`) sets three's `specularColor` to the
dye's hue: normalised to full value, saturation pushed by `sat`, times `gain` (so F0 = 4% x gain in
that hue). The white surface part is a faint clear coat (`white`) at the fabric's roughness.
`specularIntensity` is reset to 1 and `specularColor` to white for every other fabric. Two fabrics
use it: `satinFC` (C's shape) and `satinFE` (E's shape).

Tuned in the owner's own setup (Green loft hall, room 161°, navy #1f2338, five angles):
gain 6 / sat 1.3 / white 0.15 overshot (pale periwinkle over most of the panel, wet-looking white
streaks). 3 / 1.8 / 0.05 gives royal-blue bands over deep navy. 2 / 2.4 was deeper still and also
plausible. Captures: `app/captures/satin-compare/`.

## Why try F failed (owner, 2026-10-27)

The owner: both try F versions look far glossier and plastic, and on most lighter colours they show
no shading variation at all. Cause: `dyeSheen` normalised the dye to *full brightness* and multiplied
the plain mirror lobe's reflectance by 3, at the same narrow roughness. On a light dye that made the
mirror reflection as bright and as coloured as the diffuse, so lit and unlit sides converged.
It also left the full diffuse in place.

## How professional tools and research model satin

- **CLO3D** has a `Fabric_Silk/Satin` material type with reflection "adjusted optimal to express
  silk or satin". It automatically mixes white into the base colour for the shine, and its
  Reflection Intensity "acts as a white filter for the base color". So the reflection is the base
  colour lifted toward white, not pure white and not a saturated hue.[^clo-shine]
- **V-Ray fabric practice**: base roughness 0.25-0.4, sheen 0.25-0.45, an optional light coat,
  noticeable anisotropy.[^vray]
- **Unity HDRP Fabric**: "Silk" is anisotropic GGX; "Cotton/Wool" uses the Charlie sheen.[^hdrp]
- **Research (Sadeghi et al. 2013, microcylinder model)**, built from measured threads including
  polyester satin charmeuse. Each thread scatters in two lobes: a *surface reflection* (Fresnel,
  uncoloured) and a *volume scattering* term coloured by the thread's albedo. The volume term mixes
  a diffuse part with a Gaussian lobe near the mirror direction.[^sadeghi][^dw] The DreamWorks
  talk (read in full, 2026-10-27; owner supplied an archive link) gives the per-thread terms. Angles
  θ are measured from the plane normal to the thread, as for hair:
  - surface: fs = Fr · cos(φd/2) · g(γs, θh) / cos²θd. Fresnel only, so uncoloured; g is a
    Gaussian of width γs about the half angle θh.
  - volume: fv = Ft · ((1 − kd) · g(γv, θh) + kd) / (cosθi + cosθr) · A / cos²θd. Coloured by the
    thread albedo A; kd is the isotropic share, and the rest a broader Gaussian lobe of width γv.
    The 1/(cosθi + cosθr) factor brightens it toward grazing angles.
  The talk adds importance sampling only. It does **not** give the fabric-level part of the model
  (each thread's tangent curve along a float, warp/weft coverage, shadowing and masking) or the
  measured parameters for polyester satin charmeuse. Both are in Sadeghi 2013 itself, not yet
  read.

**[INFERRED]** What this means for us. Satin needs three parts, not one:

1. A **white surface lobe**: narrow, anisotropic, weak (a few percent).
2. A **coloured volume lobe**: broader, near the mirror direction, carrying the dye's *actual*
   colour and lightness (bright on light dyes, dim on dark ones). Most of satin's shine is here.
3. A **reduced diffuse**: satin sends most light into the directional lobes, so faces turned away go
   dark on every colour. That is where the shading on light satin comes from.

Stock three.js gives two specular lobes: the base specular (anisotropic, coloured through
`specularColor`) and the clear coat (white, isotropic). Proposed mapping: base specular as the
coloured volume lobe (broader roughness, `specularColor` from the dye's real colour), clear coat as
the white surface lobe (narrower), diffuse scaled down. A white surface lobe that is also
anisotropic needs custom shader work.

# Test cloth fix

`app/src/dev/drape-eval.js`'s cloth had no `tangent` attribute, so every anisotropic fabric
(shiny, wet, satin) rendered black on it. That was the case before this work too, so earlier
drape-eval swatches of those fabrics were invalid. It now carries a tangent along x. The
garment and finished edges always had tangents.

# Evidence

Captures in `app/captures/drape-eval/*-ladder*`, `app/captures/material-eval/*-ref-*`, `-v2-` and
`satin-[A-E]-torso`. Picker tiles re-rendered: `public/thumbs/materials/{shiny,satin,wet}.jpg`.

[^owner]: Owner's go-ahead, 2026-10-27
[^refs]: Owner's reference photos and the gloss ladder proposal
[^clo-shine]: CLO3D support thread on shine in rendering
[^vray]: V-Ray layered reflections tip
[^hdrp]: Unity HDRP Fabric.cs
[^sadeghi]: Sadeghi et al. 2013
[^dw]: DreamWorks microcylinder importance sampling paper
