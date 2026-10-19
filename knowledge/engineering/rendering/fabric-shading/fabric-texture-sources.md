---
type: Catalog
title: Fabric texture sources compared
description: "Where scanned or procedural fabric textures can come from (CC0 sites, general paid libraries, Adobe Substance 3D Assets, fashion-CAD libraries such as VMOD, individual sellers), what each offers for leotard fabrics (lace, mesh, sequin, glitter, velvet) and what its licence implies for shipping inside the app; recommends CC0 first, Substance for parametric variety, VMOD only with written permission."
tags: [rendering, fabric, textures, sources, licence, catalog]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T21:40:00Z }
stale_after: 2027-04-18T00:00:00Z
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-18 (Claude Code session)
    title: "Owner: which sites are equivalent to VMOD or Quixel and carry the fabric textures we want?"
    author: human:mattj
  - id: 3dtex-about
    resource: https://3dtextures.me/about/
    title: "3dtextures.me: all textures licensed CC0"
  - id: 3dtex-lace
    resource: https://3dtextures.me/tag/lace/
    title: "3dtextures.me lace tag (Fabric Lace 049-053, 2026; colour, normal, height, roughness, AO, opacity at 1K free)"
  - id: 3dtex-glitter
    resource: https://3dtextures.me/2025/07/02/fabric-glitter-001/
    title: "3dtextures.me Fabric Glitter 001 (includes metallic map)"
  - id: sharetex
    resource: https://sharetextures.com/textures/fabric/fabric_143
    title: "ShareTextures Fabric 143 (CC0, tagged lace)"
  - id: ambientcg
    resource: https://godotforums.org/d/28285-shoutout-to-an-awesome-free-texture-site
    title: "ambientCG: about 1,500 CC0 assets, scanned and procedural"
  - id: adobe-faq
    resource: https://www.adobe.com/products/substance3d/3d-assets
    title: Adobe Substance 3D Assets (library and FAQ)
    author: org:adobe
  - id: adobe-terms
    resource: https://wwwimages2.adobe.com/content/dam/cc/en/legal/servicetou/Adobe-Substance-3D-Assets-Addl-Terms-en_US-20220322.pdf
    title: Adobe Substance 3D Assets Additional Terms (2022-03-22)
    author: org:adobe
  - id: adobe-fashion
    resource: https://www.adobe.com/products/substance3d/magazine/ready-to-texture-2020-fashion-and-apparel-parametric-collection
    title: "Adobe: fashion and apparel parametric collection (100+ assets added to ~400 digital fabrics)"
    author: org:adobe
  - id: poliigon
    resource: https://www.poliigon.com/texture/fabric-cotton-001/235
    title: "Poliigon fabric listings (royalty-free commercial use; individual and organisation tiers)"
    author: org:poliigon
  - id: twinbru
    resource: https://ja.rebusfarm.net/news/chaostv-download-twinbru-s-free-fabric-library-on-chaos-cosmos
    title: Twinbru free fabric library (450+ assets) on Chaos Cosmos
  - id: style3d
    resource: https://www.style3d.com/blog/wp-json/wp/v2/posts/3476
    title: Style3D cloud fabric libraries (vendor blog)
  - id: itaa
    resource: https://www.iastatedigitalpress.com/itaa/article/id/12188/
    title: "Jung and Istook, Digital Fabric Libraries (ITAA 2020): platforms incl. Swatchbook and fabric scanners"
  - id: lace-sbsar
    resource: https://www.artstation.com/a/21988586
    title: "ArtStation seller: 124 lace fabric SBSAR materials"
  - id: sequin-pack
    resource: https://www.artstation.com/marketplace/p/LOX15/seamless-glitter-pbr-material-textures-sequins-substance
    title: "ArtStation seller: seamless glitter/sequin PBR set with Substance files"
  - id: fab-pack
    resource: https://fab.com/s/d2f78104eb81
    title: "Fab: 56-material fabric pack incl. lace and velvet (SBS/SBSAR)"
  - id: ue-forum
    resource: https://forums.unrealengine.com/t/can-i-sell-this/126395
    title: "Unreal Engine forum: Quixel textures refused in Marketplace products because end users could export them"
  - id: pipeline
    resource: /engineering/rendering/fabric-shading/texture-import-pipeline.md
    title: Texture import pipeline (VMOD terms and mitigations)
---

# Takeaway

There is **no single go-to library for gymnastics fabrics**. The big general libraries (Quixel
Megascans on Fab, Poliigon, Textures.com, Adobe Substance 3D Assets) are strongest on furniture and
everyday apparel cloth; lace, sequins, stretch mesh and foil knits are thin or come from individual
sellers. Fashion-CAD libraries (VMOD, CLO Connect, Style3D, Swatchbook/Vizoo U3M) have the right
fabrics but tie them to their own apps and accounts. **[INFERRED]** Because the app's sparkle, foil
and hologram come from its own shader layers, textures mainly need to supply **lace, mesh, weave,
velvet and sequin layouts**, and those are well covered by CC0 sources with no licence risk.

# Sources

| Source | Kind | Leotard-relevant content | Licence for shipping in the app |
|---|---|---|---|
| **3dtextures.me** | Free | Many lace patterns (2026 releases) with opacity, normal, height maps; glitter fabric with a metallic map; 1K free[^3dtex-lace][^3dtex-glitter] | **CC0**, no restrictions[^3dtex-about] |
| **ShareTextures** | Free | Fabric set incl. lace[^sharetex] | **CC0**[^sharetex] |
| **ambientCG** | Free | ~1,500 assets, some fabric; scanned and procedural[^ambientcg] | **CC0**[^ambientcg] |
| **Adobe Substance 3D Assets** | Subscription | Parametric digital fabrics (~400 + a 100-asset fashion collection); `.sbsar` lets colour, scale and pattern be changed before baking[^adobe-fashion] | Larger Work allowed, games named as an example; no stand-alone sharing[^adobe-faq][^adobe-terms] |
| **Poliigon** | Subscription | Mostly cotton, wool, linen, suede, fleece upholstery and apparel cloth[^poliigon] | Royalty-free commercial; tiers by user/revenue; app embedding not stated[^poliigon] |
| **Quixel Megascans (Fab)** | Marketplace | Few apparel fabrics | Precedent of products refused because end users could export textures[^ue-forum] **[UNVERIFIED]** for today's Fab terms |
| **VMOD (SwatchOn)** | Subscription, credits | Scans of real fashion fabrics incl. lace, glitter, sequin, foil, velvet | Larger Work on paid plan; no stand-alone access; see [pipeline](/engineering/rendering/fabric-shading/texture-import-pipeline.md)[^pipeline] |
| **CLO Connect, Style3D, Swatchbook / Vizoo (U3M)** | Fashion-CAD libraries | Real fashion fabrics, often maker-scanned[^style3d][^itaa] | Generally scoped to their own software; not checked |
| **Twinbru on Chaos Cosmos** | Free with Chaos | 450+ fabrics, upholstery-oriented[^twinbru] | Scoped to Chaos products; not checked |
| **ArtStation / Fab individual sellers** | One-off purchases | Lace SBSAR packs (124 laces), sequin SBSAR, mixed fabric packs incl. lace and velvet[^lace-sbsar][^sequin-pack][^fab-pack] | Per-seller or marketplace standard licence; check each |

# Recommendation **[INFERRED]**

1. **Start CC0** (3dtextures.me, ShareTextures, ambientCG): lace, mesh, weave and glitter-placement
   maps that can ship with no conditions. Enough to build and test the import pipeline in P1.
2. **Add Adobe Substance 3D Assets** if more variety is wanted: parametric lace and sequin fabrics
   baked to images at the exact scale and colour needed; its terms name games as a permitted larger
   work, the closest fit to an app.
3. **Use VMOD for real-fabric accuracy** (its scans are of real fashion fabrics) once VMOD confirms in
   writing that in-app use is covered.
4. Treat every library's "stand-alone" clause the same way: ship GPU-compressed copies only, never
   expose a texture export. The design-tool caveat (users apply the fabric itself) applies to all paid
   libraries, not only VMOD.

[^owner]: Product owner, 2026-10-18
[^3dtex-about]: 3dtextures.me about page
[^3dtex-lace]: 3dtextures.me lace
[^3dtex-glitter]: 3dtextures.me glitter
[^sharetex]: ShareTextures
[^ambientcg]: ambientCG
[^adobe-faq]: Adobe Substance 3D Assets FAQ
[^adobe-terms]: Adobe Substance 3D Assets additional terms
[^adobe-fashion]: Adobe fashion collection
[^poliigon]: Poliigon
[^twinbru]: Twinbru on Chaos Cosmos
[^style3d]: Style3D
[^itaa]: Jung and Istook 2020
[^lace-sbsar]: ArtStation lace SBSAR
[^sequin-pack]: ArtStation sequin set
[^fab-pack]: Fab fabric pack
[^ue-forum]: Unreal Engine forum
[^pipeline]: Texture import pipeline
