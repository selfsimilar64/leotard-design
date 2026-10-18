---
type: Technique
title: Importing scanned fabric textures (VMOD and PBR map sets)
description: "How downloaded fabric materials (the owner's proposed source is VMOD by SwatchOn) enter the app: PNG/TIFF PBR map sets with a stated real-world size, converted to compressed GPU textures and applied in per-panel cloth-space UVs, with textures supplying structure and the existing shader layers supplying sparkle, foil flash, hologram and mesh-over-skin; plus the licence caveat."
tags: [rendering, fabric, textures, pbr, import, licence]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T21:00:00Z }
stale_after: 2027-04-18T00:00:00Z
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-18 (Claude Code session)
    title: "Owner: the best I can provide is pre-made textures from a site like vmod.xyz (lace, reflective, glitter)"
    author: human:mattj
  - id: vmod-home
    resource: https://vmod.xyz
    title: "VMOD Fabric (SwatchOn): 'Generate, Source, and Digitize 3D Fabrics', made from real fabrics"
    author: org:swatchon
  - id: vmod-terms
    resource: https://vmod.xyz/terms
    title: VMOD Library Service terms (read 2026-10-18)
    author: org:swatchon
  - id: vmod-news
    resource: https://persportaal.anp.nl/artikel/CSN-170822090/swatchon-launches-a-digital-twin-3d-fabric-library-to-forge-fashions-future
    title: SwatchOn launches a digital-twin 3D fabric library (materials for Adobe Substance 3D, CLO3D, Marvelous Designer)
  - id: map-sets
    resource: https://cgaxis.com/?p=3311023
    title: "Typical commercial fabric PBR set: base colour, roughness, normal (DirectX and OpenGL), height, metallic; 4K/8K"
    author: org:cgaxis
  - id: fabric-poc
    resource: /engineering/poc/fabric-shader.md
    title: POC fabric shader (tri-planar object space, no texture slots)
  - id: arch
    resource: /engineering/architecture/editor-architecture.md
    title: Editor architecture (per-panel flattened UVs in metres)
---

# Takeaway

**The POC cannot take image textures today** (it has no UVs and no texture slots; every pattern is
procedural in tri-planar object space).[^fabric-poc] **The planned architecture is already the right
route for them:** every panel gets flattened cloth-space UVs measured in metres,[^arch] which is exactly
what a tileable fabric scan with a known real-world size needs. No change of direction is required;
texture support moves from "nice to have in P3" to the main source of fabric *structure*.
**[INFERRED]**

# What textures can and cannot do **[INFERRED]**

| Fabric | From the texture | Still from the shader |
|---|---|---|
| Lace, printed lace, flocked mesh | Pattern, holes (opacity), cord relief (normal/height) | Compositing over skin or lining, view-angle darkening |
| Mesh / net | Hole pattern and weave normal (close-up) | Openness vs stretch, mesh over skin |
| Matte, satin, wet look, velvet | Knit/weave normal, roughness variation, colour variation | Anisotropic sheen along the stretch direction, velvet nap direction |
| Glitter, mystique, hologram, foils | Where flakes or foil sit (a mask), flake scale, base colour | **The sparkle itself**: glints that flash as the body turns, rainbow shift, foil flash. A static glitter map alone looks like flat glitter paint once the model rotates |
| Sequin/spangle fabric | Sequin layout and size | Per-sequin tilt flashing |

So glitter, reflective and hologram textures are used as **inputs to the existing sparkle layers**
(mask, scale, colour), not as a replacement for them.

# Format to request from the owner

1. **Plain map set, not the tool-specific package.** VMOD's library is built for Adobe Substance 3D,
   CLO3D and Marvelous Designer;[^vmod-news] the owner reports a material page listing Cinema 4D,
   Blender, Maya, Unreal Engine 5, Substance 3D and NVIDIA Omniverse.[^owner] None of those packages
   loads in three.js as-is (`.sbsar` needs the Substance engine, Omniverse uses USD/MDL, `.zfab` is
   CLO's), but the per-DCC downloads are normally wrappers around the same image maps, and three.js
   reads standard PBR maps natively (`MeshPhysicalMaterial` map, normal, roughness, metalness, alpha,
   AO, displacement). **Preferred: the Blender download**, because Blender is already in
   `tools/` and the pipeline can open the file, read the maps it references and, where the material
   is a node graph rather than images, bake it to images. Fallback: the Unreal download (its
   textures are plain images). **[INFERRED]** until one sample has been inspected.
2. **Maps (metal/rough workflow):** base colour (sRGB), normal (**OpenGL** convention, or say which),
   roughness, metallic if any, opacity/alpha for lace and mesh, height/displacement if offered, AO
   optional. Typical commercial sets offer exactly these at 4K/8K.[^map-sets]
3. **Files:** PNG (16-bit for normal and height where offered) or TIFF; 2K is enough for most fabrics,
   4K for lace close-ups.
4. **Real-world tile size** (e.g. "10 x 10 cm") for every material: without it the dots, lace and weave
   come out at the wrong scale.
5. **One plain photo or the site's preview** of the material, to compare the render against.
6. **Folder per material**, dropped into `assets/textures/<source>/<material-name>/` in the project.
7. **First step:** one sample each of lace, glitter and a reflective/foil fabric, downloaded in the
   Blender format, so the actual contents can be checked before the import code is written.

# Import pipeline

0. If the download is a `.blend`: a headless Blender script in `pipeline/` lists the material's
   image nodes, copies the maps out and bakes any procedural part to images at the stated tile size.
1. Read the folder; detect map types from file names; ask for the tile size if missing.
2. Check tiling (seam visible?), flip DirectX normals, pack roughness/metallic/AO into one texture.
3. Convert to KTX2 (Basis Universal) with mip-maps: about 4-8x less GPU memory, which matters on a
   4 GB GTX 1650 and on iPad. Budget **~20-30 MB of GPU memory per material** after compression.
4. Fold normal-map detail into roughness at distance (Toksvig-style) so fine weave does not shimmer.
5. Register as a fabric preset: maps + tile size + which shader layers it drives (lace → opacity +
   mesh-over-skin; glitter → flake mask; foil → foil mask) + recolour rule (most scans should be
   recolourable to the team colour: keep the luminance, replace the hue).
6. Apply per panel in cloth-space UVs with the panel's grain angle and an optional scale/offset.

# Licence caveat

VMOD's terms grant a non-transferable, non-sublicensable licence to use assets inside a "Larger
Work", forbid letting a third party "use, download, extract, or access" the assets on a standalone
basis, require a paid plan for commercial distribution, and forbid using them to train machine
learning.[^vmod-terms] Using them for the owner's own renders and look development fits; **shipping
them inside an app that other people install (designers, clubs) is not clearly allowed**, because
installed texture files can be extracted. Ask VMOD (support@vmod.xyz) before relying on them for the
shipped fabric library, and keep the decision to prefer free, open assets in mind
([decision](/decisions/2026-10-13-prefer-free-open-assets.md)). The app's import pipeline does not
depend on the source, so licensed, CC0 or the maker's own scans all go through the same steps.

[^owner]: Product owner, 2026-10-18
[^vmod-home]: VMOD home page
[^vmod-terms]: VMOD terms, read 2026-10-18
[^vmod-news]: SwatchOn VMOD launch article
[^map-sets]: CGAxis fabric map set listing
[^fabric-poc]: POC fabric shader
[^arch]: Editor architecture
