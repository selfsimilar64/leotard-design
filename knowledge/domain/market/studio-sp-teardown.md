---
type: Domain Concept
title: "Studio SP teardown: how Sylvia P's configurator is built"
description: "Hands-on teardown (2026-10-24) of Sylvia P's Studio SP: a Sketchfab embed driven by the Sketchfab Viewer API from a Shopify theme section built by Glasshouse Digital; one bodiless ~293k-triangle model per style, five named sections, nine stock PBR recipes behind 350 colourways, tiny tiled textures, crystals as pre-placed density meshes, a skin-tinted lining faking skin under mesh, and a share link that stores the whole design in the URL."
tags: [market, competitors, configurator, sylvia-p, sketchfab, teardown, rendering, ux]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-24T12:00:00Z }
stale_after: 2027-10-24T00:00:00Z
sources:
  - id: kamira-page
    resource: https://teamwear.sylviap.net/collections/studio-sp/products/kamira-leotard-3q-sleeve
    title: "Kamira Leotard - 3Q Sleeve product page with the Studio SP configurator, operated 2026-10-24"
    author: org:sylvia-p
  - id: configurator-js
    resource: https://teamwear.sylviap.net/cdn/shop/t/31/assets/section-ghd-configurator.js
    title: "Theme script section-ghd-configurator.js (read in the browser, not copied)"
    author: org:glasshouse-digital
  - id: materials-js
    resource: https://teamwear.sylviap.net/cdn/shop/t/31/assets/section-ghd-configurator-materials.js
    title: "Theme script section-ghd-configurator-materials.js (read in the browser, not copied)"
    author: org:glasshouse-digital
  - id: sketchfab-model
    resource: https://api.sketchfab.com/v3/models/5d5ccbf08a8e4560b486086c02272faf
    title: "Sketchfab public model record: Kamira - Short Sleeve"
    author: org:sketchfab
  - id: live-api
    resource: "Sketchfab Viewer API 1.12.1 read-only calls (getSceneGraph, getMaterialList, getTextureList, getAnnotationList) on the live Kamira configurator, 2026-10-24"
    title: Live scene, material and texture lists
  - id: owner-2026-10-24
    resource: conversation with the product owner, 2026-10-24 (Claude Code session)
    title: Owner asked for a study of Studio SP's techniques, not a copy of its assets
    author: human:mattj
---

# Takeaway

Studio SP is **not a custom renderer**. It is a stock [Sketchfab](https://sketchfab.com) embed,
driven through Sketchfab's public Viewer API (v1.12.1) by about 37 kB of theme JavaScript plus a
77 kB material table.[^configurator-js][^materials-js] The agency is Glasshouse Digital: the code
prefix is `ghd`, and the model was uploaded by the Sketchfab account `glasshousedigital` into a
`SylviaPGroup` organisation on 2026-03-28.[^sketchfab-model] So the shaders are Sketchfab's
general-purpose PBR, configured rather than written. The craft is in the **model prep** (one
bodiless garment per style, split into named parts) and in a **small set of material recipes**
recoloured hundreds of ways. The owner asked for this as a study of techniques, not to reuse
assets.[^owner-2026-10-24] Nothing from the site is stored in this repository.

# Architecture

| Layer | What it is |
|---|---|
| Host page | Shopify theme section. Custom elements `ghd-configurator`, `ghd-configurator-carousel`, `team-shop-form`, etc. The configurator opens in a full-screen modal.[^configurator-js] |
| 3D | `<iframe>` to `sketchfab.com/models/<uid>/embed` with every Sketchfab UI element turned off (`ui_infos=0`, `ui_controls=0`, `ui_watermark=0`, ...) and `prevent_user_light_rotation=1`.[^kamira-page] |
| Control | `new Sketchfab(iframe).init(uid, {...})`, then `getSceneGraph`, `getMaterialList`, `addTexture`, `setMaterial`, `show`/`hide`, `gotoAnnotation`, `setCameraLookAt`, `getScreenShot`, and the `click` event with `pick: "fast"`.[^configurator-js] |
| Per-style data | HTML attributes on the element: `model-id` (the Sketchfab uid), `uv-scale`, `texture-urls` (four shared fabric textures on Shopify's CDN), `gradient-urls` (masks for printed styles), `variant-data` (price and SKU per crystal tier).[^kamira-page] |

Each style (Kamira, Aurora, Nicole, ...; 3Q and full sleeve as separate products) points at its
own Sketchfab model. The Studio SP collection lists about 20 such products.[^kamira-page]

# The model

Kamira short sleeve: **292,960 triangles, 153,818 vertices, 10 materials, 1 texture**, not
downloadable.[^sketchfab-model] The scene graph under `GLTF_SceneRootNode` has ten nodes:[^live-api]

- `section_b` lower body, `section_c` upper body, `section_d` mesh overlay, `section_e` belt
  (`section_a` exists on other styles and drives the clip colour; see below).
- `lining`, plus `back_lining` and `clip` on some styles.
- `crystals_heavy_1`, `crystals_heavy_2`, `crystals_light_1`, `crystals_light_2`, `crystals_logo`.

**There is no body.** It is a "ghost mannequin" render: a hollow garment floating on a pale grey
backdrop with a soft contact shadow.[^kamira-page] The single baked texture is a style-specific
normal map (`kamira-ss_normal_1001.png`) shared by all fabric sections, which carries the wrinkles
and seam relief.[^live-api] **[INFERRED]** The `_1001` suffix is UDIM tile naming, typical of a
Marvelous Designer or CLO drape exported through Substance; the garment shape is a cloth-simulated
drape, frozen.

**[INFERRED]** Crystals are pre-placed geometry: each density tier (heavy, light, logo only) is its
own mesh, split in two so a design can have a main and an accent stone colour. That would account
for much of the 293k triangles, and it is why the menu offers coverage tiers but never placement.

# How fabrics are made

Every fabric is one of **nine base recipes** in Sketchfab's specular-workflow PBR, each a full
channel dictionary (`DiffusePBR`, `SpecularPBR`, `RoughnessPBR`, `Opacity`, `Sheen`, ...), with
colourways overriding only a few channels.[^materials-js] 350 colourways in total:

| Recipe | Colourways | Key settings |
|---|---|---|
| `dyed-matt` | 43 | Roughness 0.65 (some colours 0.5 or 1.0); per-colour tinted specular colour; black's specular is about 0.008. |
| `dyed-wetlook` | 8 | Same as matt, roughness 0.35. |
| `dyed-mystique` | 37 | Roughness 0.75 **modulated by a 256 px greyscale "mystique bump" texture tiled 25x**; Blinn-style `SpecularHardness` 12.5; bright grey specular colour (0.64-0.81 linear) for the foil. No separate foil-dot layer. |
| `dyed-mesh` | 34 | Alpha-blended `Opacity` from a **100 px mesh hole texture tiled 80x**, opacity factor 0.6-1.0 per colour, roughness 0.65. |
| `dyed-fog-mesh` | 16 | Mesh recipe, roughness 0.4, opacity factor around 0.8. |
| `dyed-diamond-mesh` | 2 | Mesh recipe with a diamond hole texture tiled 125x. |
| `printed-matt` | 85 | Diffuse from a generated gradient texture; specular colour 0.033 (sublimation is flat). |
| `printed-mesh` | 85 | Printed diffuse plus the mesh opacity texture. |
| `crystal` | 40 | Roughness 0.3, white specular, diffuse = stone colour, **`Sheen` channel textured with a 100 px "dizzy" sparkle image tiled 15x with mirror wrap**; AB stones get a coloured sheen factor (e.g. aquamarine AB: sheen tint 1.0/0.30/0.20). |

Colours are entered as sRGB hex and converted to linear with the standard sRGB curve before they
reach the shader (`_hexToRGB`, `_srgbToLinear`).[^materials-js] Every repeating texture is tiny
(100-256 px) and tiled by `uvScale` multiples, so a whole fabric library costs well under 100 kB.

## Tricks worth knowing

- **Skin under mesh without a body.** When any mesh fabric is selected, the `lining` material is
  recoloured to a skin tone (`#BA9983`) with dark specular; otherwise it is white and the back
  lining is made fully transparent.[^configurator-js] The sheer overlay therefore reads as "mesh over
  skin" on a bodiless model.
- **Printed gradients drawn in 2D.** Up to three colours per printed section are painted into a
  canvas, either a 128 px vertical linear gradient whose stops depend on `uvScale`, or by tinting
  per-style mask images, and then pushed to the GPU with `updateTexture` as a WebP data URL.[^configurator-js]
- **Clip follows the fabric.** The bra/strap clip on `section_a` turns black, white or clear
  (opacity 0.25) depending on whether the chosen colour name contains "black" or "white".[^configurator-js]
- **Parts swap by show/hide.** Choosing a crystal tier hides every crystal node not in the
  selection; nothing is generated at run time.[^configurator-js]

# Interaction design

- **Step-through sections**: a stepper ("Lower Body 1/5") over the five parts; per part, tabs for
  the fabric family (Dyed Matt / Dyed Wetlook / Dyed Mystique), then one row of colour swatches.
  Swatches are 72 px photos of the real fabric, not renders.[^kamira-page]
- **Click the garment to select a part**: `click` with `pick: "fast"` returns the material name,
  which maps straight to a section.[^configurator-js]
- **Camera flies to the part and it flashes**: one Sketchfab annotation per section holds the
  camera pose; on arrival the part's `EmitColor` ramps 0 to 0.4 and back over about 2 s, a white
  glow that says "this is the part you are editing".[^configurator-js]
- **Idle sway**: a small module (`createIdleObjectMatrixSway`) rotates the root node ±6° about the
  vertical axis at 0.22 Hz, capped at 30 fps, pauses when the user moves the camera and resumes
  after 5 s with a 2 s ramp.[^configurator-js]
- **Design summary panel** listing each part's fabric and colour; the crystal entries are merged
  into one line.[^kamira-page]
- **Share link**: the whole design is `{config: [{section, material, values[]}]}` JSON in a
  `?configurator=` URL parameter, shortened through a link shortener; opening such a link opens the
  modal and loads the design.[^configurator-js] The shortener's API credential is embedded in the
  public page code. **[INFERRED]** A pattern to avoid: keep service keys server-side.
- **Enquiry hand-off**: "Enquire" freezes the sway, sets two fixed camera poses (front, back),
  grabs a 1200x1800 screenshot of each with `getScreenShot`, and posts both images, the share link,
  a text summary with colour codes, SKU and price to Sylvia P's form endpoint.[^configurator-js]

# What this means for our app

- **[INFERRED]** Their realism ceiling is Sketchfab's stock PBR: no foil-dot mixing, no per-stone
  glints (one shared sparkle texture in the sheen channel), no body, no posing, fixed lighting. Our
  shaders for [mystique](/engineering/rendering/fabric-shading/foil-dot-mixing.md),
  [mesh over skin](/engineering/rendering/fabric-shading/mesh-over-skin-blend.md) and
  [instanced stones](/engineering/rendering/sparkle/stone-instancing-at-scale.md) already aim higher.
  A brand ships and sells custom work on this level of fidelity, which is a useful floor for
  "appears correct".
- **[INFERRED]** Their mystique is just "tiled roughness noise plus bright specular". If our
  foil-dot shader ever proves too costly on iPad, that is a known-acceptable fallback.
- **[INFERRED]** Ideas worth borrowing for the [coach view](/product/personas/coach-and-gym-owner.md)
  and our [side panel](/engineering/app/side-panel-and-presets.md): the part highlight flash on
  selection, the camera flying to a framed view of the selected part, a running design summary,
  the idle sway on an untouched view, and fixed front/back snapshots attached to a hand-off.
- **[INFERRED]** Their whole design state fits in a URL. Our design document is far richer, but a
  compact "recolour of a catalogue design" form (base design id + per-piece fabric/colour) would
  give coaches the same shareable link.
- **[INFERRED]** One drape per style, frozen at authoring time, is exactly the limit our app removes:
  every new cut means an artist re-simulates and re-uploads a model. That is why their catalogue
  is many presets and nothing structural can be edited.

# Gaps

Only Kamira was opened. Whether other styles use printed gradients (`gradient-urls` was empty here)
or more sections was not checked. The baked normal map's real resolution is unknown: Sketchfab
streams textures progressively and the API reported only a 64 px level. Sketchfab's own shader
source was not examined. It is Sketchfab's closed renderer and not specific to Sylvia P.

[^kamira-page]: Kamira product page and configurator, operated 2026-10-24
[^configurator-js]: section-ghd-configurator.js, read in the browser
[^materials-js]: section-ghd-configurator-materials.js, read in the browser
[^sketchfab-model]: Sketchfab public model record for Kamira - Short Sleeve
[^live-api]: Read-only Viewer API queries on the live configurator
[^owner-2026-10-24]: Owner conversation, 2026-10-24
